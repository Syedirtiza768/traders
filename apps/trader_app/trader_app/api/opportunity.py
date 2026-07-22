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

from trader_app.api.company import assert_document_company_access, resolve_active_company
from trader_app.api.decision_log import log_decision


# ── Seed templates (config packs — not company literals) ───────────

PROFILE_TEMPLATES = {
    "minimal": {
        "require_opportunity_for_quotation": 0,
        "dn_requires_oc_if_quotations_exist": 0,
        "invoice_from_dn_only": 1,
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
            _("Commercial Opportunity is not enabled for company {0}. "
              "Enable it in Settings or provision an opportunity pack.").format(company),
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
                frappe.db.set_value(
                    "Trader Tenant Module", row.name, "enabled", enabled, update_modified=False
                )
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
    if isinstance(data, str):
        return json.loads(data) if data else {}
    return dict(data)


def _has_opportunity_link(doctype):
    return frappe.db.has_column(doctype, "trader_opportunity")


def _count_linked_docs(opportunity_name, doctype):
    if not _has_opportunity_link(doctype):
        return 0
    return cint(
        frappe.db.count(doctype, {"trader_opportunity": opportunity_name, "docstatus": ["<", 2]})
    )


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
        po_count = frappe.db.count(
            "Trader Opportunity Customer PO", {"parent": row.name}
        )
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


@frappe.whitelist()
def get_opportunity(name, company=None):
    """Opportunity hub payload: details + child doc lists + attachments."""
    doc = _load_opportunity(name, company)
    summary = _opportunity_summary(doc)

    quotations = _list_linked_docs(
        doc.name,
        "Quotation",
        fields=["name", "transaction_date", "status", "docstatus", "grand_total", "currency", "modified"],
    )
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
        "order_confirmations": order_confirmations,
        "delivery_notes": delivery_notes,
        "invoices": invoices,
        "attachments": _attachments("Trader Opportunity", doc.name),
        "settings": resolve_opportunity_settings(doc.company),
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
def close_opportunity(name, close_stage, company=None):
    """Close Opportunity with a required stage reason (PRD)."""
    doc = _load_opportunity(name, company)
    if doc.status == "Closed":
        return get_opportunity(doc.name, company=doc.company)

    close_stage = (close_stage or "").strip()
    if close_stage not in CLOSE_STAGES:
        frappe.throw(
            _("Invalid close stage. Choose one of: {0}").format(", ".join(CLOSE_STAGES))
        )

    doc.status = "Closed"
    doc.close_stage = close_stage
    doc.closed_at = now_datetime()
    doc.closed_by = frappe.session.user
    doc.save()
    frappe.db.commit()
    log_decision(
        "state",
        company=doc.company,
        outcome="applied",
        message="Closed Opportunity at stage {0}".format(close_stage),
        reference_doctype="Trader Opportunity",
        reference_name=doc.name,
        output={"status": "Closed", "close_stage": close_stage},
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
        frappe.throw(
            _("Opportunity link field is not installed on {0}. Run ensure_custom_fields.").format(
                doctype
            )
        )

    child = frappe.get_doc(doctype, document_name)
    assert_document_company_access(getattr(child, "company", None) or doc.company)
    if getattr(child, "company", None) and child.company != doc.company:
        frappe.throw(_("Document company must match the Opportunity company."))

    # Customer consistency (PRD FR-OPP-04) — default lock
    child_customer = getattr(child, "customer", None) or getattr(child, "party_name", None)
    if child_customer and child_customer != doc.customer:
        frappe.throw(
            _("Document customer {0} does not match Opportunity customer {1}.").format(
                child_customer, doc.customer
            )
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
    abbr = frappe.get_cached_value("Company", company, "abbr") or "CO"
    return "Main Warehouse - {0}".format(abbr)


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
    return frappe.db.has_column(doctype, "trader_commercial_options")


def _first_stock_item():
    name = frappe.db.get_value("Item", {"is_stock_item": 1, "disabled": 0}, "name")
    if not name:
        name = frappe.db.get_value("Item", {"disabled": 0}, "name")
    if not name:
        frappe.throw(_("No Item found to seed the quotation. Create an item first."))
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
    """Create a draft Quotation linked to the Project (Opportunity) with optional hierarchy."""
    from trader_app.api.hierarchy import apply_commercial_options, sync_flat_items_from_hierarchy
    from trader_app.api.quotation_defaults import get_default_quotation_terms
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    doc = _load_opportunity(opportunity, company)
    if doc.status == "Closed":
        frappe.throw(_("Reopen the Project before creating a quotation."))

    profile = _profile_or_defaults(doc.company)
    if not cint(profile.get("enable_quotation", 1)):
        frappe.throw(_("Quotations are disabled in the Project profile."))

    payload = _parse_payload(data)
    warehouse = payload.get("warehouse") or _default_warehouse(doc.company)

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
        quotation.trader_customer_ref = (payload.get("customer_ref") or payload.get("trader_customer_ref") or "").strip() or None

    terms = payload.get("terms")
    if terms is None:
        terms = get_default_quotation_terms(doc.company)
    if terms:
        quotation.terms = terms

    from trader_app.api.currency import apply_document_currency
    apply_document_currency(
        quotation,
        posting_date=quotation.transaction_date,
        for_selling=True,
    )

    commercial = payload.get("commercial_options") or []
    if commercial and _has_commercial_field("Quotation"):
        apply_commercial_options(quotation, commercial)
        sync_flat_items_from_hierarchy(quotation, warehouse=warehouse, first_option_only=True)
    else:
        quotation.append(
            "items",
            {
                "item_code": payload.get("item_code") or _first_stock_item(),
                "qty": 1,
                "rate": 0,
            },
        )

    taxes_and_charges = payload.get("taxes_and_charges")
    if taxes_and_charges:
        quotation.taxes_and_charges = taxes_and_charges
        quotation.run_method("set_taxes")

    quotation.insert(ignore_permissions=False)
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
        "opportunity": get_opportunity(doc.name, company=doc.company),
        "customer_ref": getattr(quotation, "trader_customer_ref", None),
    }


@frappe.whitelist()
def get_quotation_defaults(company=None):
    """Default terms and helpers for the New Quotation form."""
    from trader_app.api.quotation_defaults import get_default_quotation_terms

    company = resolve_active_company(company)
    return {
        "company": company,
        "terms": get_default_quotation_terms(company),
        "require_project": bool(cint(_profile_or_defaults(company).get("require_opportunity_for_quotation"))),
    }


@frappe.whitelist()
def create_quotation_revision(name, company=None):
    """Create a draft revision (R1, R2, …) from a submitted quotation (FR-Q-07)."""
    from trader_app.api.hierarchy import apply_commercial_options, serialize_commercial_options, sync_flat_items_from_hierarchy
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
    next_n = len(existing) + 1
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

    # Re-apply hierarchy if present so flat items stay first-option synced
    commercial = serialize_commercial_options(source)
    if commercial and _has_commercial_field("Quotation"):
        apply_commercial_options(revision, commercial)
        sync_flat_items_from_hierarchy(revision, first_option_only=True)

    revision.insert(ignore_permissions=False)
    frappe.db.commit()
    return {
        "name": revision.name,
        "revision_of": root,
        "revision_label": label,
        "source": source.name,
    }


@frappe.whitelist()
def create_order_confirmation(
    opportunity,
    source_quotation=None,
    customer_po_no=None,
    company=None,
):
    """Create Sales Order (OC) from Opportunity, copying hierarchy from selected quotation."""
    from trader_app.api.hierarchy import (
        apply_commercial_options,
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
    if customer_po_no:
        registered = {
            (row.customer_po_no or "").strip()
            for row in (doc.customer_pos or [])
        }
        if customer_po_no not in registered:
            frappe.throw(
                _("Customer PO {0} is not registered on this Opportunity.").format(customer_po_no)
            )
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
                frappe.throw(
                    _("Order Confirmation {0} already exists for PO {1}.").format(
                        existing, customer_po_no
                    )
                )

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

    commercial = []
    if qdoc and _has_commercial_field("Quotation"):
        commercial = serialize_commercial_options(qdoc)
    if commercial and _has_commercial_field("Sales Order"):
        apply_commercial_options(so, commercial)
        sync_flat_items_from_hierarchy(so, warehouse=warehouse)
    elif qdoc:
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
    else:
        so.append(
            "items",
            {"item_code": _first_stock_item(), "qty": 1, "rate": 0, "warehouse": warehouse},
        )
        if _has_commercial_field("Sales Order"):
            apply_commercial_options(
                so,
                [{
                    "line_no": 1,
                    "client_requirements": "",
                    "option_no": 1,
                    "option_text": "",
                    "package_qty": 1,
                    "items": [],
                }],
            )

    so.insert(ignore_permissions=False)
    frappe.db.commit()
    log_decision(
        "other",
        company=doc.company,
        outcome="applied",
        message="Created OC {0} from Opportunity (source={1})".format(
            so.name, source_quotation or "blank"
        ),
        reference_doctype="Sales Order",
        reference_name=so.name,
        output={"source_quotation": source_quotation, "customer_po_no": customer_po_no},
        policy="opportunity_hub",
    )
    return {
        "name": so.name,
        "doctype": "Sales Order",
        "source_quotation": source_quotation,
        "opportunity": get_opportunity(doc.name, company=doc.company),
    }


@frappe.whitelist()
def create_delivery_note_for_opportunity(opportunity, source_oc=None, company=None):
    """Create Delivery Note for Opportunity; optional hierarchy copy from OC."""
    from trader_app.api.hierarchy import (
        apply_commercial_options,
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
                _("Create and submit an Order Confirmation before Delivery Note "
                  "(quotations exist on this Opportunity).")
            )

    oc_doc = None
    if source_oc:
        oc_doc = frappe.get_doc("Sales Order", source_oc)
        if _has_opportunity_link("Sales Order") and getattr(oc_doc, "trader_opportunity", None) != doc.name:
            frappe.throw(_("Sales Order does not belong to this Opportunity."))
    elif _has_opportunity_link("Sales Order"):
        rows = frappe.get_all(
            "Sales Order",
            filters={"trader_opportunity": doc.name, "docstatus": ["<", 2]},
            fields=["name"],
            order_by="modified desc",
            limit=1,
        )
        if rows:
            oc_doc = frappe.get_doc("Sales Order", rows[0].name)

    warehouse = _default_warehouse(doc.company)
    dn = frappe.new_doc("Delivery Note")
    dn.company = doc.company
    dn.customer = doc.customer
    dn.posting_date = nowdate()
    dn.set_warehouse = warehouse
    if _has_opportunity_link("Delivery Note"):
        dn.trader_opportunity = doc.name

    commercial = []
    if oc_doc and _has_commercial_field("Sales Order"):
        commercial = serialize_commercial_options(oc_doc)
    if commercial and _has_commercial_field("Delivery Note"):
        apply_commercial_options(dn, commercial)
        sync_flat_items_from_hierarchy(dn, warehouse=warehouse)
        if oc_doc:
            for row in dn.items:
                row.against_sales_order = oc_doc.name
    elif oc_doc:
        for item in oc_doc.items or []:
            dn.append(
                "items",
                {
                    "item_code": item.item_code,
                    "qty": item.qty,
                    "rate": item.rate,
                    "warehouse": warehouse,
                    "against_sales_order": oc_doc.name,
                    "description": item.description,
                },
            )
    else:
        dn.append(
            "items",
            {"item_code": _first_stock_item(), "qty": 1, "warehouse": warehouse},
        )

    dn.insert(ignore_permissions=False)
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
def save_commercial_options(doctype, name, commercial_options, company=None):
    """Persist hierarchy on a draft Quote/SO/DN/SI and sync flat items."""
    from trader_app.api.hierarchy import (
        apply_commercial_options,
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

    rows = _parse_payload(commercial_options)
    if isinstance(rows, dict):
        rows = rows.get("commercial_options") or rows.get("options") or []
    apply_commercial_options(child, rows)
    sync_flat_items_from_hierarchy(child, warehouse=_default_warehouse(child.company))
    child.save()
    frappe.db.commit()
    return {
        "name": child.name,
        "doctype": doctype,
        "commercial_options": serialize_commercial_options(child),
        "items_count": len(child.items or []),
    }
