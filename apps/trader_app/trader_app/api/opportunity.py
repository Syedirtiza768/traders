# -*- coding: utf-8 -*-
"""Trader App — Commercial Opportunity module (OPP PRD).

Opt-in per company via ``Company.trader_opportunity_enabled`` and an active
``Trader Opportunity Profile``. No tenant/company-name branching: Electrence
is a *template key* for seeding, not a runtime ``if`` in core.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime, nowdate
from trader_app.api.company import (
    assert_document_company_access,
    resolve_active_company,
)
from trader_app.api.decision_log import log_decision
from trader_app.api.quotation_rules import finalization_errors, next_revision_number
from trader_app.api.sales_case_rules import (
    SalesCaseRuleError,
    challan_option_rows,
    close_reason_error,
    delivered_by_item,
    delivery_plan,
    pick_source_order,
)

# ── Seed templates (config packs — not company literals) ───────────

PROFILE_TEMPLATES = {
    "minimal": {
        "require_opportunity_for_quotation": 0,
        "dn_requires_oc_if_quotations_exist": 0,
        "invoice_from_dn_only": 1,
        "require_po_for_oc": 0,
        "allow_quick_quotation": 0,
        "allow_quotation_revisions": 1,
        "allow_duplicate_quotation": 0,
        "partial_invoicing": 1,
        "enable_quotation": 1,
        "enable_order_confirmation": 0,
        "enable_delivery_note": 1,
        "enable_invoice": 1,
        "oc_maps_to": "Sales Order",
        "hierarchy_on_quotation": 1,
        "hierarchy_on_oc": 0,
        "hierarchy_on_dn": 0,
        "hierarchy_on_invoice": 0,
        "stock_posting_moment": "delivery_note",
        "cogs_model": "A",
    },
    # Reference pack for project/tender sales (Electrence go-live shape).
    "electrence": {
        "require_opportunity_for_quotation": 1,
        "dn_requires_oc_if_quotations_exist": 1,
        "invoice_from_dn_only": 1,
        "require_po_for_oc": 1,
        "allow_quick_quotation": 1,
        "allow_quotation_revisions": 1,
        "allow_duplicate_quotation": 1,
        "partial_invoicing": 1,
        "enable_quotation": 1,
        "enable_order_confirmation": 1,
        "enable_delivery_note": 1,
        "enable_invoice": 1,
        "oc_maps_to": "Sales Order",
        "hierarchy_on_quotation": 1,
        "hierarchy_on_oc": 1,
        "hierarchy_on_dn": 1,
        "hierarchy_on_invoice": 1,
        "stock_posting_moment": "delivery_note",
        "cogs_model": "A",
    },
}

DEFAULT_INACTIVE_PROFILE = {
    "require_opportunity_for_quotation": 0,
    "dn_requires_oc_if_quotations_exist": 0,
    "invoice_from_dn_only": 0,
    "require_po_for_oc": 0,
    "allow_quick_quotation": 0,
    "allow_quotation_revisions": 0,
    "allow_duplicate_quotation": 0,
    "partial_invoicing": 0,
    "enable_quotation": 1,
    "enable_order_confirmation": 0,
    "enable_delivery_note": 1,
    "enable_invoice": 1,
    "oc_maps_to": "Sales Order",
    "hierarchy_on_quotation": 0,
    "hierarchy_on_oc": 0,
    "hierarchy_on_dn": 0,
    "hierarchy_on_invoice": 0,
    "stock_posting_moment": "delivery_note",
    "cogs_model": "A",
}

CLOSE_STAGES = ("Enquiry", "Quotation", "Customer PO", "Delivery", "Other")
CHILD_DOC_TYPES = (
    ("quotations", "Quotation"),
    ("order_confirmations", "Sales Order"),
    ("delivery_notes", "Delivery Note"),
    ("invoices", "Sales Invoice"),
)


_TEMPLATE_ALIASES = {"electrance": "electrence"}


def build_profile_defaults(template="minimal"):
    """Return field defaults for a named seed template (pure; no DB)."""
    key = _TEMPLATE_ALIASES.get((template or "minimal").strip().lower(), (template or "minimal").strip().lower())
    if key not in PROFILE_TEMPLATES:
        raise ValueError("Unknown opportunity template: {0}".format(template))
    out = dict(PROFILE_TEMPLATES[key])
    out["template_key"] = key
    return out


def infer_display_stage(counts):
    """PRD FR-OPP-02 stage inference (pure).

    counts keys: quotations, customer_pos, delivery_notes (ints).
    """
    counts = counts or {}
    if cint(counts.get("delivery_notes")) > 0:
        return "Delivery"
    if cint(counts.get("customer_pos")) > 0:
        return "Customer PO"
    if cint(counts.get("quotations")) > 0:
        return "Quotation"
    return "Enquiry"


def is_opportunity_enabled(company=None):
    """True when the company master switch is on (profile may still be inactive)."""
    company = resolve_active_company(company)
    return bool(cint(frappe.db.get_value("Company", company, "trader_opportunity_enabled") or 0))


def assert_opportunity_enabled(company=None):
    company = resolve_active_company(company)
    if not is_opportunity_enabled(company):
        frappe.throw(
            _(
                "Commercial Opportunity is not enabled for company {0}. "
                "Enable it in Settings or provision an opportunity pack."
            ).format(company),
            frappe.PermissionError,
        )
    return company


def get_active_opportunity_profile(company=None):
    """Return the active profile dict, or None if none / module off."""
    company = resolve_active_company(company)
    if not is_opportunity_enabled(company):
        return None
    name = frappe.db.get_value(
        "Trader Opportunity Profile",
        {"company": company, "is_active": 1},
        "name",
    )
    if not name:
        return None
    doc = frappe.get_cached_doc("Trader Opportunity Profile", name)
    return doc.as_dict()


def resolve_opportunity_settings(company=None):
    """SPA/API summary: enabled flag + effective profile (or inert defaults)."""
    company = resolve_active_company(company)
    enabled = is_opportunity_enabled(company)
    profile = get_active_opportunity_profile(company) if enabled else None
    effective = dict(DEFAULT_INACTIVE_PROFILE)
    if profile:
        for key in DEFAULT_INACTIVE_PROFILE:
            if key in profile:
                effective[key] = profile.get(key)
        effective["name"] = profile.get("name")
        effective["profile_name"] = profile.get("profile_name")
        effective["template_key"] = profile.get("template_key")
        effective["is_active"] = 1
    else:
        effective["name"] = None
        effective["profile_name"] = None
        effective["template_key"] = None
        effective["is_active"] = 0

    return {
        "company": company,
        "opportunity_enabled": enabled,
        "profile": effective,
    }


@frappe.whitelist()
def get_opportunity_settings(company=None):
    return resolve_opportunity_settings(company)


@frappe.whitelist()
def set_opportunity_enabled(enabled=0, company=None):
    """Toggle the company master switch. Restricted to Trader Admin+."""
    roles = set(frappe.get_roles())
    if frappe.session.user != "Administrator":
        if not roles.intersection({"System Manager", "Trader Admin", "Trader Super Admin"}):
            frappe.throw(_("Only Trader Admin may change feature flags."))

    company = resolve_active_company(company)
    enabled = cint(enabled)
    frappe.db.set_value("Company", company, "trader_opportunity_enabled", enabled)

    tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if tenant and frappe.db.exists("Trader Tenant", tenant):
        rows = frappe.get_all(
            "Trader Tenant Module",
            filters={"parent": tenant, "parenttype": "Trader Tenant", "module_key": "opportunity"},
            fields=["name"],
        )
        if rows:
            for row in rows:
                frappe.db.set_value("Trader Tenant Module", row.name, "enabled", enabled, update_modified=False)
        elif enabled:
            tdoc = frappe.get_doc("Trader Tenant", tenant)
            tdoc.append("enabled_modules", {"module_key": "opportunity", "enabled": 1})
            tdoc.save(ignore_permissions=True)

    log_decision(
        "other",
        company=company,
        outcome="applied",
        message="Commercial Opportunity master switch set to {0}".format(enabled),
        output={"opportunity_enabled": bool(enabled)},
        policy="opportunity_flag",
    )
    frappe.db.commit()
    return {"ok": True, "company": company, "opportunity_enabled": bool(enabled)}


# ────────────────────────────────────────────────────────────────
# Hub helpers
# ────────────────────────────────────────────────────────────────


def _parse_payload(data):
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, (list, tuple)):
        return list(data)
    if isinstance(data, str):
        return json.loads(data) if data else {}
    return dict(data)


def _has_opportunity_link(doctype):
    return frappe.db.has_column(doctype, "trader_opportunity")


def _count_linked_docs(opportunity_name, doctype):
    if not _has_opportunity_link(doctype):
        return 0
    return cint(frappe.db.count(doctype, {"trader_opportunity": opportunity_name, "docstatus": ["<", 2]}))


def _list_linked_docs(opportunity_name, doctype, fields=None, limit=50):
    if not _has_opportunity_link(doctype):
        return []
    fields = fields or ["name", "status", "docstatus", "modified"]
    return frappe.get_all(
        doctype,
        filters={"trader_opportunity": opportunity_name, "docstatus": ["<", 2]},
        fields=fields,
        order_by="modified desc",
        limit_page_length=limit,
    )


def _find_open_quotation_draft(opportunity_name, company=None):
    """One open draft Quotation per Project (docstatus=0, not cancelled)."""
    if not _has_opportunity_link("Quotation"):
        return None
    filters = {
        "trader_opportunity": opportunity_name,
        "docstatus": 0,
    }
    if company:
        filters["company"] = company
    rows = frappe.get_all(
        "Quotation",
        filters=filters,
        fields=[
            "name",
            "transaction_date",
            "status",
            "docstatus",
            "grand_total",
            "currency",
            "modified",
            "trader_customer_ref",
        ],
        order_by="modified desc",
        limit_page_length=1,
    )
    return rows[0] if rows else None


def _child_counts(doc):
    name = doc.name
    return {
        "quotations": _count_linked_docs(name, "Quotation"),
        "order_confirmations": _count_linked_docs(name, "Sales Order"),
        "delivery_notes": _count_linked_docs(name, "Delivery Note"),
        "invoices": _count_linked_docs(name, "Sales Invoice"),
        "customer_pos": len(doc.customer_pos or []),
        "comments": len(doc.comments or []),
    }


def _attachments(doctype, name):
    return frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": doctype,
            "attached_to_name": name,
            "is_folder": 0,
        },
        fields=["name", "file_name", "file_url", "file_size", "creation", "owner"],
        order_by="creation desc",
    )


def _opportunity_summary(doc):
    counts = _child_counts(doc)
    stage_counts = {
        "quotations": counts["quotations"],
        "customer_pos": counts["customer_pos"],
        "delivery_notes": counts["delivery_notes"],
    }
    return {
        "name": doc.name,
        "opportunity_ref": doc.opportunity_ref,
        "title": doc.title,
        "company": doc.company,
        "customer": doc.customer,
        "customer_name": doc.customer_name,
        "branch": doc.branch,
        "owner_user": doc.owner_user,
        "enquiry_date": doc.enquiry_date,
        "enquiry_value": flt(doc.enquiry_value),
        "priority": doc.priority,
        "status": doc.status,
        "close_stage": doc.close_stage,
        "close_reason": doc.get("close_reason"),
        "closed_at": doc.closed_at,
        "closed_by": doc.closed_by,
        "watchlist": cint(doc.watchlist),
        "display_stage": infer_display_stage(stage_counts),
        "counts": counts,
        "modified": doc.modified,
    }


def _load_opportunity(name, company=None):
    assert_opportunity_enabled(company)
    doc = frappe.get_doc("Trader Opportunity", name)
    assert_document_company_access(doc.company)
    if company and doc.company != resolve_active_company(company):
        frappe.throw(_("Opportunity does not belong to company {0}.").format(company))
    return doc


# ────────────────────────────────────────────────────────────────
# Hub CRUD
# ────────────────────────────────────────────────────────────────


@frappe.whitelist()
def list_opportunities(
    company=None,
    status=None,
    customer=None,
    owner_user=None,
    priority=None,
    watchlist=None,
    search=None,
    page=1,
    page_size=20,
):
    """Paginated Opportunity list for the hub."""
    company = assert_opportunity_enabled(company)
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    filters = {"company": company}
    if status:
        filters["status"] = status
    if customer:
        filters["customer"] = customer
    if owner_user:
        filters["owner_user"] = owner_user
    if priority:
        filters["priority"] = priority
    if watchlist is not None and str(watchlist) != "":
        filters["watchlist"] = cint(watchlist)

    or_filters = None
    if search:
        like = "%{0}%".format(search)
        or_filters = [
            ["opportunity_ref", "like", like],
            ["title", "like", like],
            ["customer", "like", like],
            ["customer_name", "like", like],
        ]

    total = frappe.db.count("Trader Opportunity", filters=filters)
    # db.count does not support or_filters — fall back when searching
    rows = frappe.get_all(
        "Trader Opportunity",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name",
            "opportunity_ref",
            "title",
            "company",
            "customer",
            "customer_name",
            "branch",
            "owner_user",
            "enquiry_date",
            "enquiry_value",
            "priority",
            "status",
            "close_stage",
            "watchlist",
            "modified",
        ],
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=page_size,
    )
    if search:
        total = len(
            frappe.get_all(
                "Trader Opportunity",
                filters=filters,
                or_filters=or_filters,
                pluck="name",
            )
        )

    items = []
    for row in rows:
        po_count = frappe.db.count("Trader Opportunity Customer PO", {"parent": row.name})
        stage = infer_display_stage(
            {
                "quotations": _count_linked_docs(row.name, "Quotation"),
                "customer_pos": po_count,
                "delivery_notes": _count_linked_docs(row.name, "Delivery Note"),
            }
        )
        item = dict(row)
        item["display_stage"] = stage
        item["enquiry_value"] = flt(item.get("enquiry_value"))
        item["watchlist"] = cint(item.get("watchlist"))
        items.append(item)

    return {
        "company": company,
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": items,
    }


def _fulfilment_or_none(opportunity):
    """Ordered/delivered/invoiced progress; never blocks the hub payload."""
    try:
        from trader_app.api.fulfilment import get_fulfilment_progress

        return get_fulfilment_progress(opportunity)
    except Exception:
        return None


@frappe.whitelist()
def get_opportunity(name, company=None):
    """Opportunity hub payload: details + child doc lists + attachments."""
    doc = _load_opportunity(name, company)
    summary = _opportunity_summary(doc)

    quotation_fields = [
        "name",
        "transaction_date",
        "status",
        "docstatus",
        "grand_total",
        "currency",
        "modified",
    ]
    if frappe.db.has_column("Quotation", "trader_customer_ref"):
        quotation_fields.append("trader_customer_ref")
    quotations = _list_linked_docs(doc.name, "Quotation", fields=quotation_fields)
    open_draft = _find_open_quotation_draft(doc.name, company=doc.company)
    order_confirmations = _list_linked_docs(
        doc.name,
        "Sales Order",
        fields=[
            "name",
            "transaction_date",
            "status",
            "docstatus",
            "grand_total",
            "currency",
            "po_no",
            "per_delivered",
            "modified",
        ],
    )
    delivery_notes = _list_linked_docs(
        doc.name,
        "Delivery Note",
        fields=["name", "posting_date", "status", "docstatus", "grand_total", "per_billed", "modified"],
    )
    invoices = _list_linked_docs(
        doc.name,
        "Sales Invoice",
        fields=[
            "name",
            "posting_date",
            "status",
            "docstatus",
            "grand_total",
            "outstanding_amount",
            "currency",
            "modified",
        ],
    )

    return {
        "opportunity": {
            **summary,
            "description": doc.description,
            "customer_pos": [
                {
                    "name": r.name,
                    "customer_po_no": r.customer_po_no,
                    "po_date": r.po_date,
                    "po_amount": flt(r.po_amount),
                    "notes": r.notes,
                    "attachment": r.attachment,
                }
                for r in (doc.customer_pos or [])
            ],
            "comments": [
                {
                    "name": r.name,
                    "commented_at": r.commented_at,
                    "commented_by": r.commented_by,
                    "comment": r.comment,
                }
                for r in (doc.comments or [])
            ],
        },
        "quotations": quotations,
        "open_quotation_draft": open_draft,
        "order_confirmations": order_confirmations,
        "delivery_notes": delivery_notes,
        "invoices": invoices,
        "attachments": _attachments("Trader Opportunity", doc.name),
        "settings": resolve_opportunity_settings(doc.company),
        "fulfilment": _fulfilment_or_none(doc.name),
    }


@frappe.whitelist()
def create_opportunity(data=None, company=None):
    """Create an Opportunity. Payload: title, customer, optional fields."""
    company = assert_opportunity_enabled(company)
    payload = _parse_payload(data)
    if not payload.get("title"):
        frappe.throw(_("Title is required."))
    if not payload.get("customer"):
        frappe.throw(_("Customer is required."))

    fields = {
        "doctype": "Trader Opportunity",
        "title": payload.get("title"),
        "company": company,
        "customer": payload.get("customer"),
        "branch": payload.get("branch"),
        "owner_user": payload.get("owner_user") or frappe.session.user,
        "enquiry_date": payload.get("enquiry_date") or nowdate(),
        "enquiry_value": flt(payload.get("enquiry_value")),
        "priority": payload.get("priority") or "Normal",
        "watchlist": cint(payload.get("watchlist")),
        "description": payload.get("description"),
        "status": "Open",
    }
    ref = (payload.get("opportunity_ref") or "").strip()
    if ref:
        fields["opportunity_ref"] = ref
    # Blank opportunity_ref → controller autoname generates OPP-{abbr}-.####
    doc = frappe.get_doc(fields)
    doc.insert()
    frappe.db.commit()
    log_decision(
        "other",
        company=company,
        outcome="applied",
        message="Created Opportunity {0}".format(doc.name),
        reference_doctype="Trader Opportunity",
        reference_name=doc.name,
        policy="opportunity_hub",
    )
    return get_opportunity(doc.name, company=company)


@frappe.whitelist()
def update_opportunity(name, data=None, company=None):
    """Update mutable Opportunity header fields (not status close/reopen)."""
    doc = _load_opportunity(name, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Opportunity before editing."))

    payload = _parse_payload(data)
    allowed = (
        "title",
        "branch",
        "owner_user",
        "enquiry_date",
        "enquiry_value",
        "priority",
        "watchlist",
        "description",
        "customer",
    )
    for key in allowed:
        if key not in payload:
            continue
        if key == "watchlist":
            doc.watchlist = cint(payload[key])
        elif key == "enquiry_value":
            doc.enquiry_value = flt(payload[key])
        else:
            setattr(doc, key, payload[key])

    doc.save()
    frappe.db.commit()
    return get_opportunity(doc.name, company=doc.company)


@frappe.whitelist()
def close_opportunity(name, close_stage, company=None, close_reason=None):
    """Close Opportunity with a stage and an optional reason (legacy ``closingreason`` / ``closingremarks``)."""
    doc = _load_opportunity(name, company)
    if doc.status == "Closed":
        return get_opportunity(doc.name, company=doc.company)

    close_stage = (close_stage or "").strip()
    if close_stage not in CLOSE_STAGES:
        frappe.throw(_("Invalid close stage. Choose one of: {0}").format(", ".join(CLOSE_STAGES)))
    reason = (close_reason or "").strip()
    open_orders = 0
    if close_stage == "Delivery" and _has_opportunity_link("Sales Order"):
        submitted = frappe.get_all(
            "Sales Order",
            filters={"trader_opportunity": doc.name, "docstatus": 1},
            fields=["per_delivered"],
        )
        open_orders = sum(1 for o in submitted if flt(o.per_delivered) < 100)
    error = close_reason_error(close_stage, reason, open_order_count=open_orders)
    if error:
        frappe.throw(_(error))

    doc.status = "Closed"
    doc.close_stage = close_stage
    doc.close_reason = reason or None
    doc.closed_at = now_datetime()
    doc.closed_by = frappe.session.user
    doc.save()
    frappe.db.commit()
    log_decision(
        "state",
        company=doc.company,
        outcome="applied",
        message="Closed Opportunity at stage {0}{1}".format(close_stage, ": " + reason if reason else ""),
        reference_doctype="Trader Opportunity",
        reference_name=doc.name,
        output={"status": "Closed", "close_stage": close_stage, "close_reason": reason or None},
        policy="opportunity_hub",
    )
    return get_opportunity(doc.name, company=doc.company)


@frappe.whitelist()
def reopen_opportunity(name, company=None):
    doc = _load_opportunity(name, company)
    if doc.status == "Open":
        return get_opportunity(doc.name, company=doc.company)

    doc.status = "Open"
    doc.close_stage = None
    doc.close_reason = None
    doc.closed_at = None
    doc.closed_by = None
    doc.save()
    frappe.db.commit()
    log_decision(
        "state",
        company=doc.company,
        outcome="applied",
        message="Reopened Opportunity",
        reference_doctype="Trader Opportunity",
        reference_name=doc.name,
        output={"status": "Open"},
        policy="opportunity_hub",
    )
    return get_opportunity(doc.name, company=doc.company)


@frappe.whitelist()
def add_opportunity_comment(name, comment, company=None):
    doc = _load_opportunity(name, company)
    text = (comment or "").strip()
    if not text:
        frappe.throw(_("Comment is required."))
    doc.append(
        "comments",
        {
            "comment": text,
            "commented_at": now_datetime(),
            "commented_by": frappe.session.user,
        },
    )
    doc.save()
    frappe.db.commit()
    return get_opportunity(doc.name, company=doc.company)


@frappe.whitelist()
def add_customer_po(name, data=None, company=None):
    """Attach a customer PO row (PRD: one OC per PO uniqueness on Opportunity)."""
    doc = _load_opportunity(name, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Opportunity before adding a customer PO."))

    payload = _parse_payload(data)
    po_no = (payload.get("customer_po_no") or "").strip()
    if not po_no:
        frappe.throw(_("Customer PO No is required."))

    for row in doc.customer_pos or []:
        if (row.customer_po_no or "").strip().lower() == po_no.lower():
            frappe.throw(_("Customer PO {0} already exists on this Opportunity.").format(po_no))

    doc.append(
        "customer_pos",
        {
            "customer_po_no": po_no,
            "po_date": payload.get("po_date"),
            "po_amount": flt(payload.get("po_amount")),
            "notes": payload.get("notes"),
            "attachment": payload.get("attachment"),
        },
    )
    doc.save()
    frappe.db.commit()
    return get_opportunity(doc.name, company=doc.company)


@frappe.whitelist()
def link_document(opportunity, doctype, document_name, company=None):
    """Link an existing Quotation / Sales Order / DN / SI to an Opportunity."""
    doc = _load_opportunity(opportunity, company)
    doctype = (doctype or "").strip()
    allowed = {dt for _, dt in CHILD_DOC_TYPES}
    if doctype not in allowed:
        frappe.throw(_("Cannot link doctype {0} to an Opportunity.").format(doctype))
    if not _has_opportunity_link(doctype):
        frappe.throw(_("Opportunity link field is not installed on {0}. Run ensure_custom_fields.").format(doctype))

    child = frappe.get_doc(doctype, document_name)
    assert_document_company_access(getattr(child, "company", None) or doc.company)
    if getattr(child, "company", None) and child.company != doc.company:
        frappe.throw(_("Document company must match the Opportunity company."))

    # Customer consistency (PRD FR-OPP-04) — default lock
    child_customer = getattr(child, "customer", None) or getattr(child, "party_name", None)
    if child_customer and child_customer != doc.customer:
        frappe.throw(
            _("Document customer {0} does not match Opportunity customer {1}.").format(child_customer, doc.customer)
        )

    child.db_set("trader_opportunity", doc.name, update_modified=False)
    frappe.db.commit()
    return get_opportunity(doc.name, company=doc.company)


# ────────────────────────────────────────────────────────────────
# Create-from-hub (Opportunity → child documents)
# ────────────────────────────────────────────────────────────────


def _profile_or_defaults(company):
    settings = resolve_opportunity_settings(company)
    return settings.get("profile") or dict(DEFAULT_INACTIVE_PROFILE)


def _default_warehouse(company):
    """The company's main warehouse; otherwise its first non-group warehouse.

    The main warehouse is preferred because the first warehouse by name is not
    necessarily the one stock is kept in (legacy finding F-23).
    """
    abbr = frappe.get_cached_value("Company", company, "abbr") or "CO"
    main = "Main Warehouse - {0}".format(abbr)
    if frappe.db.exists("Warehouse", {"name": main, "company": company, "is_group": 0}):
        return main
    return frappe.db.get_value(
        "Warehouse",
        {"company": company, "is_group": 0},
        "name",
        order_by="is_group asc, name asc",
    )


def _list_final_quotations(opportunity_name):
    if not _has_opportunity_link("Quotation"):
        return []
    return frappe.get_all(
        "Quotation",
        filters={"trader_opportunity": opportunity_name, "docstatus": 1},
        fields=["name", "transaction_date", "grand_total", "currency", "modified"],
        order_by="modified desc",
    )


def _has_commercial_field(doctype):
    """Child Table fields are not SQL columns on the parent — use meta."""
    try:
        return bool(frappe.get_meta(doctype).has_field("trader_commercial_options"))
    except Exception:
        return False


def _first_stock_item(company):
    from trader_app.api.permissions import (
        check_master_document_company,
        company_master_sql_filter,
    )

    tenant_condition, tenant_params = company_master_sql_filter("i", company)

    def _find_item(stock_only):
        conditions = ["IFNULL(i.disabled, 0) = 0"]
        if stock_only:
            conditions.append("i.is_stock_item = 1")
        if tenant_condition:
            conditions.append(tenant_condition)
        rows = frappe.db.sql(
            "SELECT i.name FROM `tabItem` i WHERE {0} ORDER BY i.name LIMIT 1".format(" AND ".join(conditions)),
            tenant_params,
            as_dict=True,
        )
        return rows[0].name if rows else None

    name = _find_item(stock_only=True) or _find_item(stock_only=False)
    if not name:
        frappe.throw(_("No Item found to seed the quotation. Create an item first."))
    check_master_document_company("Item", name, company, ptype="read")
    return name


@frappe.whitelist()
def list_source_quotations(opportunity, company=None):
    """Quotations available when creating an OC (explicit selection, default = latest)."""
    doc = _load_opportunity(opportunity, company)
    rows = _list_final_quotations(doc.name)
    latest = rows[0]["name"] if rows else None
    return {"opportunity": doc.name, "quotations": rows, "default": latest}


@frappe.whitelist()
def create_quotation_for_opportunity(opportunity, data=None, company=None):
    """Create a draft Quotation linked to the Project with hierarchy + Order Details.

    Enforces one open draft per Project unless ``force_new=1`` (after discard).
    Does not seed an empty placeholder quotation — commercial options required
    when hierarchy is enabled (or a single item_code for flat fallback).
    """
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        sync_flat_items_from_hierarchy,
    )
    from trader_app.api.quotation_defaults import (
        apply_order_details_to_quotation,
        get_default_quotation_terms,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = _load_opportunity(opportunity, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Project before creating a quotation."))

    profile = _profile_or_defaults(doc.company)
    if not cint(profile.get("enable_quotation", 1)):
        frappe.throw(_("Quotations are disabled in the Project profile."))

    payload = _parse_payload(data)
    force_new = cint(payload.get("force_new"))
    existing = _find_open_quotation_draft(doc.name, company=doc.company)
    if existing and not force_new:
        return {
            "name": existing.name,
            "doctype": "Quotation",
            "existing_draft": 1,
            "opportunity": get_opportunity(doc.name, company=doc.company),
            "message": _("An open draft quotation already exists. Continue or discard it first."),
        }

    order_details = payload.get("order_details") or {}
    warehouse = payload.get("warehouse") or order_details.get("warehouse") or _default_warehouse(doc.company)

    commercial = payload.get("commercial_options") or []
    has_commercial = bool(commercial) and _has_commercial_field("Quotation")
    quick = cint(payload.get("quick_quotation"))
    if quick and not cint(profile.get("allow_quick_quotation", 0)):
        frappe.throw(_("Quick quotations are disabled in the Opportunity profile."))
    if not quick and not has_commercial and not payload.get("item_code") and not payload.get("items"):
        frappe.throw(_("Add commercial Line → Option → Item hierarchy before creating the quotation."))

    quotation = frappe.new_doc("Quotation")
    quotation.quotation_to = "Customer"
    quotation.party_name = doc.customer
    quotation.customer_name = doc.customer_name
    if hasattr(quotation, "customer"):
        quotation.customer = doc.customer
    quotation.company = doc.company
    quotation.transaction_date = payload.get("transaction_date") or nowdate()
    quotation.valid_till = payload.get("valid_till")
    if _has_opportunity_link("Quotation"):
        quotation.trader_opportunity = doc.name

    if frappe.db.has_column("Quotation", "trader_customer_ref"):
        quotation.trader_customer_ref = (
            payload.get("customer_ref") or payload.get("trader_customer_ref") or ""
        ).strip() or None

    terms = payload.get("terms")
    if terms is None:
        terms = get_default_quotation_terms(doc.company)
    if terms:
        quotation.terms = terms

    apply_order_details_to_quotation(
        quotation,
        order_details={**order_details, "warehouse": warehouse},
        company=doc.company,
    )

    from trader_app.api.currency import apply_document_currency

    apply_document_currency(
        quotation,
        posting_date=quotation.transaction_date,
        for_selling=True,
    )

    if has_commercial:
        apply_commercial_options(quotation, commercial)
        sync_flat_items_from_hierarchy(quotation, warehouse=warehouse, first_option_only=True)
    elif payload.get("items"):
        for row in payload.get("items") or []:
            quotation.append("items", row)
    elif payload.get("item_code"):
        quotation.append("items", {"item_code": payload.get("item_code"), "qty": 1, "rate": 0})
    # A quick quotation may have no priced lines at all; only the finalisation rules are skipped.

    if quick and frappe.db.has_column("Quotation", "trader_quick_quotation"):
        quotation.trader_quick_quotation = 1

    # ERPNext requires at least one item on every quotation, drafts included.
    if not quotation.get("items"):
        frappe.throw(_("Add at least one priced item to the quotation before saving it."))

    taxes_and_charges = payload.get("taxes_and_charges")
    if taxes_and_charges:
        quotation.taxes_and_charges = taxes_and_charges
        quotation.run_method("set_taxes")

    quotation.insert(ignore_permissions=False)
    from trader_app.api.hierarchy import persist_nested_commercial_items

    persist_nested_commercial_items(quotation)
    frappe.db.commit()
    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Created Quotation {0} from Project".format(quotation.name),
        reference_doctype="Quotation",
        reference_name=quotation.name,
        policy="opportunity_hub",
    )
    return {
        "name": quotation.name,
        "doctype": "Quotation",
        "existing_draft": 0,
        "opportunity": get_opportunity(doc.name, company=doc.company),
        "customer_ref": getattr(quotation, "trader_customer_ref", None),
    }


@frappe.whitelist()
def discard_quotation_draft(name, company=None):
    """Delete an open draft Quotation (Continue/Discard hub rule)."""
    doc = frappe.get_doc("Quotation", name)
    doc.check_permission("delete")
    assert_document_company_access(doc.company)
    if company and doc.company != company:
        frappe.throw(_("Company mismatch."))
    if cint(doc.docstatus) != 0:
        frappe.throw(_("Only draft quotations can be discarded."))
    opportunity = getattr(doc, "trader_opportunity", None)
    doc_name = doc.name
    frappe.delete_doc("Quotation", doc_name, ignore_permissions=False, force=1)
    frappe.db.commit()
    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Discarded draft Quotation {0}".format(doc_name),
        reference_doctype="Quotation",
        reference_name=doc_name,
        policy="opportunity_hub",
    )
    hub = None
    if opportunity:
        hub = get_opportunity(opportunity, company=doc.company)
    return {"deleted": doc_name, "opportunity": hub}


@frappe.whitelist()
def save_quotation_order_details(name, data=None, company=None):
    """Update Order Details + Customer Ref / terms on a draft Quotation."""
    from trader_app.api.quotation_defaults import apply_order_details_to_quotation
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = frappe.get_doc("Quotation", name)
    doc.check_permission("write")
    assert_document_company_access(doc.company)
    if company and doc.company != company:
        frappe.throw(_("Company mismatch."))
    if cint(doc.docstatus) != 0:
        frappe.throw(_("Only draft quotations can update Order Details."))

    payload = _parse_payload(data)
    if "customer_ref" in payload or "trader_customer_ref" in payload:
        if frappe.db.has_column("Quotation", "trader_customer_ref"):
            doc.trader_customer_ref = (
                payload.get("customer_ref") or payload.get("trader_customer_ref") or ""
            ).strip() or None
    if "terms" in payload and payload.get("terms") is not None:
        doc.terms = payload.get("terms")
    if payload.get("valid_till"):
        doc.valid_till = payload.get("valid_till")
    if payload.get("transaction_date"):
        doc.transaction_date = payload.get("transaction_date")
    if payload.get("taxes_and_charges"):
        doc.taxes_and_charges = payload.get("taxes_and_charges")
        doc.run_method("set_taxes")

    order_details = payload.get("order_details")
    if order_details is None:
        # Allow flat payload keys as order details
        order_details = {
            k: payload.get(k)
            for k in (
                "validity_days",
                "pay_advance_pct",
                "pay_delivery_pct",
                "pay_commissioning_pct",
                "pay_after_pct",
                "pay_after_days",
                "gst_mode",
                "services",
                "wht_percent",
                "freight_clause",
                "rate_clause",
                "rate_validity",
                "clause_rates",
                "print_exchange",
                "warehouse",
                "gst_clause",
                "deliver_to",
                "delivery_address",
                "contact_person",
                "contact_phone",
                "contact_email",
                "delivery_date",
                "quote_date",
                "use_quote_date",
                "confirmed_date",
                "order_comments",
            )
            if k in payload
        }
    if order_details:
        apply_order_details_to_quotation(doc, order_details=order_details, company=doc.company)

    doc.save(ignore_permissions=False)
    frappe.db.commit()
    return doc.as_dict()


@frappe.whitelist()
def get_quotation_defaults(company=None):
    """Default terms, Order Details, and warehouse helpers for New Quotation."""
    from trader_app.api.quotation_defaults import (
        get_default_order_details,
        get_default_quotation_terms,
    )

    company = resolve_active_company(company)
    warehouse = _default_warehouse(company)
    return {
        "company": company,
        "terms": get_default_quotation_terms(company),
        "order_details": get_default_order_details(company),
        "warehouse": warehouse,
        "require_project": bool(cint(_profile_or_defaults(company).get("require_opportunity_for_quotation"))),
    }


@frappe.whitelist()
def create_quotation_revision(name, company=None):
    """Create a draft revision (R1, R2, …) from a submitted quotation (FR-Q-07)."""
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        serialize_commercial_options,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    source = frappe.get_doc("Quotation", name)
    source.check_permission("read")
    assert_document_company_access(source.company)
    if company and source.company != company:
        frappe.throw(_("Company mismatch for quotation revision."))

    profile = _profile_or_defaults(source.company)
    if not cint(profile.get("allow_quotation_revisions", 0)):
        frappe.throw(_("Quotation revisions are disabled for this company."))

    if cint(source.docstatus) != 1:
        frappe.throw(_("Only submitted quotations can be revised."))

    root = getattr(source, "trader_revision_of", None) or source.name
    existing = frappe.get_all(
        "Quotation",
        filters={"trader_revision_of": root},
        fields=["name", "trader_revision_label"],
        order_by="creation asc",
    )
    next_n = next_revision_number([row.get("trader_revision_label") for row in existing])
    label = "R{0}".format(next_n)

    revision = frappe.copy_doc(source)
    revision.name = None
    revision.docstatus = 0
    revision.status = "Draft"
    revision.amended_from = None
    if frappe.db.has_column("Quotation", "trader_revision_of"):
        revision.trader_revision_of = root
    if frappe.db.has_column("Quotation", "trader_revision_label"):
        revision.trader_revision_label = label

    # Re-apply hierarchy from source and rebuild flat lines (first-option rule).
    # Use the serialized payload directly so nested option items are not lost
    # on an unsaved copy_doc.
    commercial = serialize_commercial_options(source)
    if commercial and _has_commercial_field("Quotation"):
        from trader_app.api.hierarchy import flatten_commercial_options

        apply_commercial_options(revision, commercial)
        flat = flatten_commercial_options(commercial, first_option_only=True)
        if flat:
            revision.set("items", [])
            for entry in flat:
                revision.append("items", entry)

    if not revision.get("items"):
        frappe.throw(_("Could not create revision: source quotation has no item lines."))

    revision.insert(ignore_permissions=False)
    from trader_app.api.hierarchy import persist_nested_commercial_items

    persist_nested_commercial_items(revision)
    frappe.db.commit()
    return {
        "name": revision.name,
        "revision_of": root,
        "revision_label": label,
        "source": source.name,
    }


@frappe.whitelist()
def duplicate_quotation_for_opportunity(name, company=None, force_new=0):
    """New open draft copied from an existing quotation (profile: allow_duplicate_quotation).

    The copy keeps the whole Line → Option → Item hierarchy, the commercial terms
    and the customer. It is not a revision: revision lineage and label are cleared.
    One open draft per Project still applies unless ``force_new`` is set.
    """
    source = frappe.get_doc("Quotation", name)
    source.check_permission("read")
    assert_document_company_access(source.company)
    if company and source.company != company:
        frappe.throw(_("Company mismatch for quotation duplicate."))

    profile = _profile_or_defaults(source.company)
    if not cint(profile.get("allow_duplicate_quotation", 0)):
        frappe.throw(_("Duplicating quotations is disabled in the Opportunity profile."))

    opportunity = getattr(source, "trader_opportunity", None)
    if opportunity and not cint(force_new):
        existing = _find_open_quotation_draft(opportunity, company=source.company)
        if existing:
            return {
                "name": existing.name,
                "doctype": "Quotation",
                "existing_draft": 1,
                "opportunity": get_opportunity(opportunity, company=source.company),
                "message": _("An open draft quotation already exists. Continue or discard it first."),
            }

    dup = frappe.copy_doc(source)
    dup.name = None
    dup.docstatus = 0
    dup.status = "Draft"
    dup.amended_from = None
    dup.transaction_date = nowdate()
    if dup.valid_till and str(dup.valid_till) < nowdate():
        dup.valid_till = None
    if frappe.db.has_column("Quotation", "trader_revision_of"):
        dup.trader_revision_of = None
    if frappe.db.has_column("Quotation", "trader_revision_label"):
        dup.trader_revision_label = None
    dup.insert(ignore_permissions=False)
    from trader_app.api.hierarchy import persist_nested_commercial_items

    persist_nested_commercial_items(dup)
    frappe.db.commit()
    log_decision(
        "other",
        company=source.company,
        outcome="applied",
        message="Duplicated Quotation {0} as {1}".format(source.name, dup.name),
        reference_doctype="Quotation",
        reference_name=dup.name,
        policy="opportunity_hub",
    )
    return {
        "name": dup.name,
        "doctype": "Quotation",
        "existing_draft": 0,
        "source": source.name,
        "opportunity": get_opportunity(opportunity, company=source.company) if opportunity else None,
    }


def validate_quotation_for_submit(doc, method=None):
    """Quotation ``before_validate``: the legacy finalisation rules, applied when submitting.

    Runs before ERPNext's own validation, so an unfinished quotation is refused with a
    clear message rather than failing in the totals calculation. Quick quotations skip
    the per-option rules but still need at least one priced item.
    """
    # Only the draft-to-submitted transition is gated. Later saves of a submitted quotation
    # (for example an update-after-submit field) must not start failing on old data.
    if getattr(doc, "_action", None) != "submit":
        return
    from trader_app.api.hierarchy import serialize_commercial_options

    quick = cint(getattr(doc, "trader_quick_quotation", 0))
    if quick and not cint(_profile_or_defaults(doc.company).get("allow_quick_quotation", 0)):
        frappe.throw(_("Quick quotations are disabled in the Opportunity profile."))
    rows = serialize_commercial_options(doc) if _has_commercial_field("Quotation") else []
    has_items = bool(doc.get("items")) or any(row.get("items") for row in rows)
    if not has_items:
        frappe.throw(_("A quotation needs at least one item before it can be finalised."))
    errors = finalization_errors(rows, quick=bool(quick))
    if errors:
        frappe.throw("<br>".join(errors), title=_("Quotation cannot be finalised"))


def _parse_line_numbers(lines):
    """Quote line numbers from a list or a JSON string; empty when none were given."""
    if isinstance(lines, str):
        lines = json.loads(lines) if lines.strip() else []
    return {cint(value) for value in (lines or []) if cint(value)}


def _lines_on_open_ocs(opportunity):
    """Quote line -> name of the open Order Confirmation that already orders it, for one case."""
    from trader_app.api.hierarchy import serialize_commercial_options

    taken = {}
    if not _has_commercial_field("Sales Order"):
        return taken
    for oc in frappe.get_all(
        "Sales Order",
        filters={"trader_opportunity": opportunity, "docstatus": ["<", 2]},
        fields=["name"],
    ):
        for row in serialize_commercial_options(frappe.get_doc("Sales Order", oc.name)):
            if cint(row.get("is_selected")):
                taken.setdefault(cint(row.get("line_no") or 1), oc.name)
    return taken


def _output_gst_template(qdoc, company):
    """The company's sales tax template at the GST rate a quotation charges through its Order Details.

    Only exclusive GST adds tax on top of the net; inclusive and no-GST quotations name no template here.
    """
    from trader_app.api.commercial_totals import resolve_gst_rate

    if (getattr(qdoc, "trader_gst_mode", None) or "exclusive").lower() != "exclusive":
        return None
    rate = resolve_gst_rate("exclusive", cint(getattr(qdoc, "trader_services", 0)))
    if not rate:
        return None
    rows = frappe.db.sql(
        """
        SELECT t.name
        FROM `tabSales Taxes and Charges Template` t
        INNER JOIN `tabSales Taxes and Charges` c
            ON c.parent = t.name AND c.parenttype = 'Sales Taxes and Charges Template'
        WHERE t.company = %s AND c.rate = %s
        ORDER BY t.name
        LIMIT 1
        """,
        (company, rate),
    )
    return rows[0][0] if rows else None


@frappe.whitelist()
def create_order_confirmation(
    opportunity,
    source_quotation=None,
    customer_po_no=None,
    company=None,
    selected_options=None,
    lines=None,
):
    """Create Sales Order (OC) from Opportunity, copying hierarchy from selected quotation.

    The whole hierarchy is kept on the OC for reference, but only **one option
    per line** becomes ordered stock lines: ``selected_options`` maps
    ``line_no -> option_no`` (the option the customer accepted); lines not
    mentioned default to their lowest option, matching how the quotation was
    valued. Without this, every alternative on the quotation would be ordered.

    ``lines`` -- the quote line numbers this customer PO covers. A case often splits one quotation
    across several POs, so each OC takes only its own lines. A line already ordered on another open
    OC of the same case is refused, so the same quantity is never ordered twice.
    """
    if isinstance(selected_options, str):
        selected_options = json.loads(selected_options) if selected_options.strip() else {}
    if selected_options is None:
        selected_options = {}
    po_lines = _parse_line_numbers(lines)
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        apply_selection,
        invalid_selections,
        serialize_commercial_options,
        sync_flat_items_from_hierarchy,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = _load_opportunity(opportunity, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Opportunity before creating an Order Confirmation."))

    profile = _profile_or_defaults(doc.company)
    if not cint(profile.get("enable_order_confirmation", 1)):
        frappe.throw(_("Order Confirmations are disabled in the Opportunity profile."))

    customer_po_no = (customer_po_no or "").strip() or None
    if not customer_po_no and cint(profile.get("require_po_for_oc")):
        frappe.throw(_("A customer PO number is required for an Order Confirmation."))
    if customer_po_no:
        registered = {(row.customer_po_no or "").strip() for row in (doc.customer_pos or [])}
        if customer_po_no not in registered:
            frappe.throw(_("Customer PO {0} is not registered on this Opportunity.").format(customer_po_no))
        if _has_opportunity_link("Sales Order"):
            existing = frappe.db.exists(
                "Sales Order",
                {
                    "trader_opportunity": doc.name,
                    "po_no": customer_po_no,
                    "docstatus": ["<", 2],
                },
            )
            if existing:
                frappe.throw(_("Order Confirmation {0} already exists for PO {1}.").format(existing, customer_po_no))

    finals = _list_final_quotations(doc.name)
    qdoc = None
    if source_quotation:
        if not frappe.db.exists("Quotation", source_quotation):
            frappe.throw(_("Source quotation {0} not found.").format(source_quotation))
        qdoc = frappe.get_doc("Quotation", source_quotation)
        if _has_opportunity_link("Quotation"):
            linked = getattr(qdoc, "trader_opportunity", None)
            if linked and linked != doc.name:
                frappe.throw(_("Quotation does not belong to this Opportunity."))
    elif finals:
        source_quotation = finals[0]["name"]
        qdoc = frappe.get_doc("Quotation", source_quotation)

    warehouse = _default_warehouse(doc.company)
    so = frappe.new_doc("Sales Order")
    so.company = doc.company
    so.customer = doc.customer
    so.transaction_date = nowdate()
    so.delivery_date = nowdate()
    if customer_po_no:
        so.po_no = customer_po_no
    if _has_opportunity_link("Sales Order"):
        so.trader_opportunity = doc.name
    if source_quotation and frappe.db.has_column("Sales Order", "trader_source_quotation"):
        so.trader_source_quotation = source_quotation

    if not qdoc:
        frappe.throw(_("Create and submit a quotation before an Order Confirmation."))

    # The OC is priced in the quotation's currency; without it the company base currency was used.
    from trader_app.api.currency import apply_document_currency

    apply_document_currency(so, currency=qdoc.currency, posting_date=so.transaction_date, for_selling=True)

    commercial = []
    if _has_commercial_field("Quotation"):
        commercial = serialize_commercial_options(qdoc)
    if po_lines:
        on_quote = {cint(row.get("line_no") or 1) for row in commercial}
        missing = sorted(po_lines - on_quote)
        if missing:
            frappe.throw(_("Quote line(s) {0} are not on the quotation.").format(", ".join(str(n) for n in missing)))
        commercial = [row for row in commercial if cint(row.get("line_no") or 1) in po_lines]
    if commercial and _has_commercial_field("Sales Order") and _has_opportunity_link("Sales Order"):
        taken = _lines_on_open_ocs(doc.name)
        requested = po_lines or {cint(row.get("line_no") or 1) for row in commercial}
        clash = sorted(line for line in requested if line in taken)
        if clash:
            frappe.throw(
                _("Quote line(s) {0} are already on an open Order Confirmation ({1}). Choose the lines this PO covers.").format(
                    ", ".join(str(line) for line in clash), ", ".join(sorted({taken[line] for line in clash}))
                )
            )
    if commercial and _has_commercial_field("Sales Order"):
        # Choices for lines that are not on this PO belong to another OC; they are not validated here.
        if po_lines:
            selected_options = {k: v for k, v in selected_options.items() if cint(k) in po_lines}
        invalid = invalid_selections(commercial, selected_options)
        if invalid:
            frappe.throw(
                _("Option not on the quotation: {0}.").format(
                    ", ".join(_("line {0} option {1}").format(line, option) for line, option in invalid)
                )
            )
        # The accepted option is stored on the OC so the delivery and the invoice bill
        # the same option the customer picked, not the lowest-numbered one.
        marked, chosen = apply_selection(commercial, selected_options)
        apply_commercial_options(so, marked)
        sync_flat_items_from_hierarchy(so, warehouse=warehouse, selected_options=chosen)
    else:
        for item in qdoc.items or []:
            so.append(
                "items",
                {
                    "item_code": item.item_code,
                    "qty": item.qty,
                    "rate": item.rate,
                    "warehouse": warehouse,
                    "delivery_date": so.delivery_date,
                    "description": item.description,
                },
            )

    # Carry the quotation's tax template so what was quoted is what is billed. A quotation that charges GST through
    # its Order Details and names no template is billed with the company's sales template at the same rate.
    tax_template = getattr(qdoc, "taxes_and_charges", None) or _output_gst_template(qdoc, doc.company)
    if tax_template:
        so.taxes_and_charges = tax_template
        so.run_method("set_taxes")

    so.insert(ignore_permissions=False)
    from trader_app.api.hierarchy import persist_nested_commercial_items

    persist_nested_commercial_items(so)
    frappe.db.commit()
    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Created OC {0} from Opportunity (source={1})".format(so.name, source_quotation or "blank"),
        reference_doctype="Sales Order",
        reference_name=so.name,
        output={
            "source_quotation": source_quotation,
            "customer_po_no": customer_po_no,
            "selected_options": selected_options,
        },
        policy="opportunity_hub",
    )
    return {
        "name": so.name,
        "doctype": "Sales Order",
        "source_quotation": source_quotation,
        "opportunity": get_opportunity(doc.name, company=doc.company),
    }


def _source_order_for(doc, source_oc=None):
    """The Order Confirmation a challan delivers against, or ``None`` when there is none."""
    if not _has_opportunity_link("Sales Order"):
        return frappe.get_doc("Sales Order", source_oc) if source_oc else None
    # One OC per customer PO. With several still open the challan must name its OC;
    # guessing the most recently modified one could deliver against the wrong PO.
    ocs = frappe.get_all(
        "Sales Order",
        filters={"trader_opportunity": doc.name, "docstatus": ["<", 2]},
        fields=["name", "po_no", "docstatus", "per_delivered"],
        order_by="modified desc",
    )
    try:
        chosen_oc = pick_source_order(ocs, requested=source_oc)
    except SalesCaseRuleError as exc:
        frappe.throw(str(exc))
    return frappe.get_doc("Sales Order", chosen_oc) if chosen_oc else None


def _delivered_by_item(order_name):
    """``item_code -> qty`` already delivered on an Order Confirmation (its submitted challans)."""
    rows = frappe.get_all(
        "Sales Order Item",
        filters={"parent": order_name},
        fields=["item_code", "delivered_qty"],
    )
    return delivered_by_item(rows)


def _line_numbers_arg(lines):
    """``lines`` arrives as a JSON list, or as a JSON string from some callers."""
    if lines is None:
        return None
    if isinstance(lines, str):
        lines = json.loads(lines) if lines.strip() else []
    return [cint(line) for line in lines]


@frappe.whitelist()
def get_delivery_plan_for_opportunity(opportunity, source_oc=None, company=None):
    """Lines of an Order Confirmation with what is still to deliver on each (challan line picker)."""
    from trader_app.api.hierarchy import resolve_selection, serialize_commercial_options

    doc = _load_opportunity(opportunity, company)
    oc_doc = _source_order_for(doc, source_oc)
    if not oc_doc:
        frappe.throw(_("Create and submit an Order Confirmation before planning a Delivery Note for this Project."))
    lines = []
    if _has_commercial_field("Sales Order"):
        commercial = serialize_commercial_options(oc_doc)
        if commercial:
            lines = delivery_plan(commercial, resolve_selection(commercial), _delivered_by_item(oc_doc.name))
    return {"source_oc": oc_doc.name, "po_no": oc_doc.po_no, "lines": lines}


@frappe.whitelist()
def create_delivery_note_for_opportunity(opportunity, source_oc=None, company=None, lines=None):
    """Create Delivery Note for Opportunity; hierarchy copy from OC, cut to what is left to deliver.

    ``lines`` -- the OC line numbers this challan covers (partial delivery by line). ``None``
    covers every line. Each billed item is pre-filled with ordered minus already delivered, in
    the hierarchy and in the flat items alike, so a later save keeps the remaining quantity.
    """
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        resolve_selection,
        serialize_commercial_options,
        sync_flat_items_from_hierarchy,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = _load_opportunity(opportunity, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Opportunity before creating a Delivery Note."))

    profile = _profile_or_defaults(doc.company)
    if not cint(profile.get("enable_delivery_note", 1)):
        frappe.throw(_("Delivery Notes are disabled in the Opportunity profile."))

    quote_count = _count_linked_docs(doc.name, "Quotation")
    if cint(profile.get("dn_requires_oc_if_quotations_exist")) and quote_count > 0:
        finalized_oc = 0
        if _has_opportunity_link("Sales Order"):
            finalized_oc = frappe.db.count(
                "Sales Order",
                {"trader_opportunity": doc.name, "docstatus": 1},
            )
        if finalized_oc <= 0:
            frappe.throw(
                _(
                    "Create and submit an Order Confirmation before Delivery Note "
                    "(quotations exist on this Opportunity)."
                )
            )

    oc_doc = _source_order_for(doc, source_oc)
    if not oc_doc:
        frappe.throw(
            _(
                "Create and submit an Order Confirmation before a Delivery Note for this Project. "
                "A blank challan is created from the Delivery Notes page."
            )
        )

    warehouse = _default_warehouse(doc.company)
    dn = frappe.new_doc("Delivery Note")
    dn.company = doc.company
    dn.customer = doc.customer
    dn.posting_date = nowdate()
    dn.set_warehouse = warehouse
    # A challan is priced in the currency of the OC it delivers against (ERPNext checks the match).
    if oc_doc and getattr(oc_doc, "currency", None):
        dn.currency = oc_doc.currency
        dn.conversion_rate = flt(oc_doc.conversion_rate) or 1
    if _has_opportunity_link("Delivery Note"):
        dn.trader_opportunity = doc.name
    # Keep the customer PO on the challan so each partial delivery traces to its PO.
    if oc_doc and getattr(oc_doc, "po_no", None) and dn.meta.has_field("po_no"):
        dn.po_no = oc_doc.po_no

    commercial = []
    if oc_doc and _has_commercial_field("Sales Order"):
        commercial = serialize_commercial_options(oc_doc)
    if commercial and _has_commercial_field("Delivery Note"):
        # The OC's billed option per line is what gets delivered (see hierarchy.resolve_selection),
        # cut to the quantity still undelivered and to the lines this challan covers.
        try:
            challan_rows = challan_option_rows(
                commercial,
                resolve_selection(commercial),
                _delivered_by_item(oc_doc.name),
                covered_lines=_line_numbers_arg(lines),
            )
        except SalesCaseRuleError as exc:
            frappe.throw(str(exc))
        apply_commercial_options(dn, challan_rows)
        sync_flat_items_from_hierarchy(dn, warehouse=warehouse)
        # Order-line linking (against_sales_order + so_detail) is resolved by the
        # Delivery Note validate hook: trader_app.api.order_linking.
    elif oc_doc:
        # Flat order without a hierarchy: each order line carries its own delivered_qty.
        for item in oc_doc.items or []:
            left = flt(item.qty) - flt(item.delivered_qty)
            if left <= 0:
                continue
            dn.append(
                "items",
                {
                    "item_code": item.item_code,
                    "qty": left,
                    "rate": item.rate,
                    "warehouse": warehouse,
                    "description": item.description,
                },
            )
    if not dn.items:
        frappe.throw(_("Nothing is left to deliver on {0}.").format(oc_doc.name))
    dn.insert(ignore_permissions=False)
    from trader_app.api.hierarchy import persist_nested_commercial_items

    persist_nested_commercial_items(dn)
    frappe.db.commit()
    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Created Delivery Note {0} from Opportunity".format(dn.name),
        reference_doctype="Delivery Note",
        reference_name=dn.name,
        output={"source_oc": oc_doc.name if oc_doc else None},
        policy="opportunity_hub",
    )
    return {
        "name": dn.name,
        "doctype": "Delivery Note",
        "source_oc": oc_doc.name if oc_doc else None,
        "opportunity": get_opportunity(doc.name, company=doc.company),
    }


@frappe.whitelist()
def create_return_delivery_note(delivery_note, company=None):
    """Goods return against a submitted challan (legacy GRB).

    Returns a draft return note with negative quantities, linked to the challan. Its
    submission puts the goods back into stock through the stock ledger; no invoice is
    touched, so credit for returned goods is raised as a Sales Invoice return.
    """
    from erpnext.stock.doctype.delivery_note.delivery_note import make_sales_return

    dn = frappe.get_doc("Delivery Note", delivery_note)
    dn.check_permission("read")
    assert_document_company_access(dn.company)
    if company and dn.company != company:
        frappe.throw(_("Company mismatch for goods return."))
    if dn.docstatus != 1:
        frappe.throw(_("Only a submitted delivery challan can be returned."))

    ret = make_sales_return(dn.name)
    if _has_opportunity_link("Delivery Note") and dn.get("trader_opportunity"):
        ret.trader_opportunity = dn.trader_opportunity
    ret.insert(ignore_permissions=False)
    log_decision(
        "other",
        company=dn.company,
        outcome="applied",
        message="Goods return {0} against challan {1}".format(ret.name, dn.name),
        reference_doctype="Delivery Note",
        reference_name=ret.name,
        output={"return_against": dn.name},
        policy="goods_return",
    )
    return {"name": ret.name, "doctype": "Delivery Note", "return_against": dn.name, "docstatus": ret.docstatus}


@frappe.whitelist()
def list_invoiceable_delivery_notes_for_opportunity(opportunity, company=None):
    """Submitted delivery challans linked to this Project with unbilled qty."""
    doc = _load_opportunity(opportunity, company)
    if not _has_opportunity_link("Delivery Note"):
        return {"opportunity": doc.name, "delivery_notes": []}
    rows = frappe.get_all(
        "Delivery Note",
        filters={
            "trader_opportunity": doc.name,
            "docstatus": 1,
            "per_billed": ["<", 100],
        },
        fields=["name", "customer", "customer_name", "posting_date", "grand_total", "per_billed"],
        order_by="posting_date asc, name asc",
    )
    return {"opportunity": doc.name, "delivery_notes": rows}


@frappe.whitelist()
def create_invoice_for_opportunity(
    opportunity,
    delivery_notes=None,
    posting_date=None,
    auto_submit=None,
    company=None,
):
    """Create a Sales Invoice from submitted Delivery Challans on this Project.

    Enforces the Opportunity profile gate ``invoice_from_dn_only`` (mirrors the
    sahamid DC->Invoice rule): when on, an invoice may only be raised from
    submitted Delivery Notes. Delegates grouping + GL to
    ``trader_app.api.grouped_invoicing.create_grouped_invoice``.
    """
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = _load_opportunity(opportunity, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Opportunity before creating an invoice."))

    profile = _profile_or_defaults(doc.company)
    if not cint(profile.get("enable_invoice", 1)):
        frappe.throw(_("Invoices are disabled in the Opportunity profile."))

    if delivery_notes:
        delivery_notes = json.loads(delivery_notes) if isinstance(delivery_notes, str) else delivery_notes
    else:
        inv = list_invoiceable_delivery_notes_for_opportunity(doc.name, company=doc.company)
        delivery_notes = [r["name"] for r in inv.get("delivery_notes", [])]

    if cint(profile.get("invoice_from_dn_only", 1)):
        if not delivery_notes:
            frappe.throw(
                _(
                    "No submitted delivery challans are available to invoice. "
                    "Submit a Delivery Challan first (Invoice-from-DN-only is on)."
                )
            )
        for dn_name in delivery_notes:
            if not frappe.db.exists("Delivery Note", dn_name):
                frappe.throw(_("Delivery challan {0} not found.").format(dn_name))
            dn = frappe.get_doc("Delivery Note", dn_name)
            assert_document_company_access(dn.company)
            if _has_opportunity_link("Delivery Note") and getattr(dn, "trader_opportunity", None) != doc.name:
                frappe.throw(_("Delivery challan {0} is not linked to this Project.").format(dn_name))
            if dn.docstatus != 1:
                frappe.throw(_("Delivery challan {0} must be submitted before invoicing.").format(dn_name))

    from trader_app.api.grouped_invoicing import create_grouped_invoice

    result = create_grouped_invoice(
        delivery_notes=delivery_notes,
        company=doc.company,
        posting_date=posting_date or nowdate(),
        auto_submit=auto_submit,
    )

    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Created Invoice {0} from Opportunity ({1} challan(s))".format(
            result.get("invoice"), len(delivery_notes)
        ),
        reference_doctype="Sales Invoice",
        reference_name=result.get("invoice"),
        output={"delivery_notes": delivery_notes, "invoice": result.get("invoice")},
        policy="opportunity_hub",
    )
    return {
        "name": result.get("invoice"),
        "doctype": "Sales Invoice",
        "delivery_notes": delivery_notes,
        "submitted": result.get("submitted"),
        "completed_challans": result.get("completed_challans"),
        "opportunity": get_opportunity(doc.name, company=doc.company),
    }


@frappe.whitelist()
def save_commercial_options(doctype, name, commercial_options, company=None, expected_modified=None):
    """Persist hierarchy on a draft Quote/SO/DN/SI and sync flat items.

    ``expected_modified`` is the ``modified`` stamp the editor loaded. When it no
    longer matches, another user saved the document in between and this save is
    refused instead of silently overwriting their hierarchy.
    """
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        persist_nested_commercial_items,
        serialize_commercial_options,
        sync_flat_items_from_hierarchy,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    assert_opportunity_enabled(company)
    if doctype not in ("Quotation", "Sales Order", "Delivery Note", "Sales Invoice"):
        frappe.throw(_("Unsupported doctype for commercial hierarchy."))
    if not _has_commercial_field(doctype):
        frappe.throw(_("Commercial hierarchy field not installed on {0}.").format(doctype))

    child = frappe.get_doc(doctype, name)
    assert_document_company_access(child.company)
    if child.docstatus != 0:
        frappe.throw(_("Only draft documents can edit commercial hierarchy."))
    if expected_modified and str(child.modified) != str(expected_modified):
        from frappe.exceptions import TimestampMismatchError

        frappe.throw(
            _("{0} {1} was changed by someone else after you opened it. Reload it and apply your changes again.").format(
                doctype, name
            ),
            exc=TimestampMismatchError,
        )

    rows = _parse_payload(commercial_options)
    if isinstance(rows, dict):
        rows = rows.get("commercial_options") or rows.get("options") or []
    apply_commercial_options(child, rows)
    warehouse = getattr(child, "trader_warehouse", None) or _default_warehouse(child.company)
    sync_flat_items_from_hierarchy(child, warehouse=warehouse)
    child.save()
    persist_nested_commercial_items(child)
    frappe.db.commit()
    child.reload()
    return {
        "name": child.name,
        "doctype": doctype,
        "commercial_options": serialize_commercial_options(child),
        "items_count": len(child.items or []),
    }


from trader_app.api._tenant_guard import INVOICING_ROLES, apply_module_guards

apply_module_guards(
    globals(),
    "sales",
    # The invoicing roles also read the project they invoice from: create_invoice_for_opportunity returns it, after
    # the invoice is committed, so the read must pass for the same user (G-PERM-03).
    extra_roles={
        "create_invoice_for_opportunity": INVOICING_ROLES,
        "get_opportunity": INVOICING_ROLES,
    },
)
