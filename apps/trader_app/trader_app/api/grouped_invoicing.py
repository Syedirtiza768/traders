# -*- coding: utf-8 -*-
"""Trader App — grouped invoicing from multiple Delivery Challans (PRD FR-7).

Builds one Sales Invoice from several submitted Delivery Notes, enforcing a
company-scoped **Trader Grouping Policy** (same-debtor, max docs, etc.). Line
consumption is tracked two ways:

  * natively — each invoice line carries ``delivery_note`` + ``dn_detail`` back-
    references, so ERPNext updates the challan's ``per_billed`` on submit; and
  * explicitly — ``trader_qty_invoiced`` on the challan line, a convenience
    counter the SPA can read without recomputing billing.

Every grouping decision is written to the Trader Decision Log.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate

from trader_app.api.company import assert_document_company_access, resolve_active_company
from trader_app.api.decision_log import log_decision
from trader_app.api.invoice_types import set_trader_invoice_type

DEFAULT_GROUPING = {
    "same_debtor_required": 1,
    "max_docs_per_group": 0,
    "allow_partial_delivery": 1,
    "auto_submit_invoice": 0,
}


def get_grouping_policy(company):
    """Resolve the active grouping policy for a company, or safe defaults."""
    name = frappe.db.get_value(
        "Trader Grouping Policy", {"company": company, "is_active": 1}, "name"
    )
    if not name:
        return dict(DEFAULT_GROUPING)
    doc = frappe.get_cached_doc("Trader Grouping Policy", name)
    return {
        "policy": doc.name,
        "same_debtor_required": cint(doc.same_debtor_required),
        "max_docs_per_group": cint(doc.max_docs_per_group),
        "allow_partial_delivery": cint(doc.allow_partial_delivery),
        "auto_submit_invoice": cint(doc.auto_submit_invoice),
    }


def validate_group(policy, dn_rows):
    """Pure policy check. ``dn_rows`` is a list of dicts with at least
    ``name`` and ``customer``. Returns a list of violation messages (empty = ok)."""
    violations = []
    if not dn_rows:
        return [_("Select at least one delivery challan.")]

    if policy.get("same_debtor_required"):
        customers = {r.get("customer") for r in dn_rows}
        if len(customers) > 1:
            violations.append(
                _("All delivery challans must be for the same customer (found: {0}).").format(
                    ", ".join(sorted(str(c) for c in customers))
                )
            )

    max_docs = cint(policy.get("max_docs_per_group") or 0)
    if max_docs and len(dn_rows) > max_docs:
        violations.append(
            _("This group has {0} challans; the policy allows at most {1}.").format(
                len(dn_rows), max_docs
            )
        )

    return violations


@frappe.whitelist()
def get_invoiceable_delivery_notes(company=None, customer=None):
    """Submitted delivery challans not yet fully billed — candidates for grouping."""
    company = resolve_active_company(company)
    filters = {"company": company, "docstatus": 1, "per_billed": ["<", 100]}
    if customer:
        filters["customer"] = customer
    return frappe.get_all(
        "Delivery Note",
        filters=filters,
        fields=["name", "customer", "customer_name", "posting_date", "grand_total", "per_billed"],
        order_by="posting_date asc, name asc",
    )


@frappe.whitelist()
def create_grouped_invoice(delivery_notes, company=None, posting_date=None, auto_submit=None):
    """Create one Sales Invoice from several submitted Delivery Notes."""
    if isinstance(delivery_notes, str):
        delivery_notes = json.loads(delivery_notes)
    if not delivery_notes:
        frappe.throw(_("Select at least one delivery challan."))

    company = resolve_active_company(company)
    policy = get_grouping_policy(company)

    dns = []
    for dn_name in delivery_notes:
        dn = frappe.get_doc("Delivery Note", dn_name)
        assert_document_company_access(dn.company)
        if dn.company != company:
            frappe.throw(_("Delivery challan {0} belongs to another company.").format(dn_name))
        if dn.docstatus != 1:
            frappe.throw(_("Delivery challan {0} must be submitted first.").format(dn_name))
        dns.append(dn)

    violations = validate_group(
        policy, [{"name": d.name, "customer": d.customer} for d in dns]
    )
    if violations:
        log_decision(
            "grouping", company=company, outcome="block",
            message="; ".join(violations),
            inputs={"delivery_notes": delivery_notes}, policy=policy.get("policy"),
        )
        frappe.throw("<br>".join(violations))

    customer = dns[0].customer
    si = frappe.new_doc("Sales Invoice")
    si.company = company
    si.customer = customer
    si.posting_date = posting_date or nowdate()
    si.update_stock = 0
    set_trader_invoice_type(si, invoice_type="tax_invoice")

    line_plan = []  # (dn_item_name, qty_added) for the explicit counter
    for dn in dns:
        for it in dn.items:
            already = flt(getattr(it, "trader_qty_invoiced", 0) or 0)
            remaining = flt(it.qty) - already
            if remaining <= 0:
                continue
            si.append(
                "items",
                {
                    "item_code": it.item_code,
                    "qty": remaining,
                    "rate": it.rate,
                    "warehouse": it.warehouse,
                    "delivery_note": dn.name,
                    "dn_detail": it.name,
                    "description": it.description,
                },
            )
            line_plan.append((it.name, remaining))

    if not si.get("items"):
        frappe.throw(_("The selected delivery challans are already fully invoiced."))

    # Copy remaining commercial hierarchy (OPP) onto the invoice without rebuilding flat lines.
    from trader_app.api.hierarchy import (
        apply_commercial_options,
        copy_commercial_options,
        remaining_package_qty,
    )

    remaining_hierarchy = []
    opportunity = None
    for dn in dns:
        linked_opp = getattr(dn, "trader_opportunity", None)
        if linked_opp:
            opportunity = opportunity or linked_opp
        if hasattr(dn, "trader_commercial_options") and dn.trader_commercial_options:
            remaining_hierarchy.extend(
                copy_commercial_options(dn.trader_commercial_options, remaining_only=True)
            )

    if opportunity and frappe.db.has_column("Sales Invoice", "trader_opportunity"):
        si.trader_opportunity = opportunity
    if remaining_hierarchy and frappe.db.has_column("Sales Invoice", "trader_commercial_options"):
        apply_commercial_options(si, remaining_hierarchy)

    si.insert(ignore_permissions=False)

    do_submit = policy.get("auto_submit_invoice") if auto_submit is None else cint(auto_submit)
    if do_submit:
        si.submit()
        # Only advance the explicit counter once billing is real (submitted).
        for dn_item_name, qty_added in line_plan:
            current = flt(frappe.db.get_value("Delivery Note Item", dn_item_name, "trader_qty_invoiced") or 0)
            frappe.db.set_value(
                "Delivery Note Item", dn_item_name, "trader_qty_invoiced",
                current + qty_added, update_modified=False,
            )
        # Consume remaining package qty on DN commercial options.
        for dn in dns:
            if not frappe.db.has_column("Delivery Note", "trader_commercial_options"):
                continue
            opt_rows = frappe.get_all(
                "Trader Commercial Option",
                filters={"parent": dn.name, "parenttype": "Delivery Note"},
                fields=["name", "package_qty", "qty_invoiced"],
            )
            for opt in opt_rows:
                rem = remaining_package_qty(opt.package_qty, opt.qty_invoiced)
                if rem <= 0:
                    continue
                frappe.db.set_value(
                    "Trader Commercial Option",
                    opt.name,
                    "qty_invoiced",
                    flt(opt.qty_invoiced) + rem,
                    update_modified=False,
                )
                item_rows = frappe.get_all(
                    "Trader Commercial Option Item",
                    filters={"parent": opt.name, "parenttype": "Trader Commercial Option"},
                    fields=["name", "unit_qty"],
                )
                for it in item_rows:
                    frappe.db.set_value(
                        "Trader Commercial Option Item",
                        it.name,
                        "qty_invoiced",
                        flt(it.unit_qty),
                        update_modified=False,
                    )

    completed = []
    if do_submit:
        for dn in dns:
            per_billed = flt(frappe.db.get_value("Delivery Note", dn.name, "per_billed") or 0)
            if per_billed >= 100:
                completed.append(dn.name)

    log_decision(
        "grouping", company=company, outcome="applied",
        message="Grouped {0} challan(s) into invoice {1}".format(len(dns), si.name),
        inputs={"delivery_notes": delivery_notes, "customer": customer},
        output={"invoice": si.name, "submitted": bool(do_submit), "completed": completed},
        reference_doctype="Sales Invoice", reference_name=si.name,
        policy=policy.get("policy"),
    )
    frappe.db.commit()

    return {
        "ok": True,
        "invoice": si.name,
        "customer": customer,
        "delivery_notes": delivery_notes,
        "submitted": bool(do_submit),
        "completed_challans": completed,
    }
