# -*- coding: utf-8 -*-
"""Trader App — order fulfilment progress for a Commercial Opportunity.

Answers "of what the customer ordered, how much has been delivered and how much
invoiced?" — the walkthrough's *OC vs delivered vs invoiced* view. Read-only;
derived from submitted documents, never stored, so it cannot drift.

  ordered   — Sales Order (Order Confirmation) lines on the opportunity
  delivered — submitted Delivery Note (Challan) lines
  invoiced  — submitted Sales Invoice lines (directly linked to the opportunity
              or back-referencing one of its challans)
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt
from trader_app.api.company import assert_document_company_access


# ── Pure helper (unit-tested, no database) ────────────────────────


def summarize_fulfilment(ordered, delivered, invoiced):
    """Merge three ``{item_code: {"qty", "amount"}}`` maps into a progress report."""
    items = {}
    for key in sorted(set(ordered) | set(delivered) | set(invoiced)):
        o = ordered.get(key, {})
        d = delivered.get(key, {})
        i = invoiced.get(key, {})
        ordered_qty = flt(o.get("qty"))
        delivered_qty = flt(d.get("qty"))
        invoiced_qty = flt(i.get("qty"))
        items[key] = {
            "item_code": key,
            "ordered_qty": ordered_qty,
            "delivered_qty": delivered_qty,
            "invoiced_qty": invoiced_qty,
            "pending_delivery_qty": round(max(ordered_qty - delivered_qty, 0.0), 6),
            "pending_invoice_qty": round(max(delivered_qty - invoiced_qty, 0.0), 6),
            "over_delivered_qty": round(max(delivered_qty - ordered_qty, 0.0), 6),
            "ordered_amount": flt(o.get("amount")),
            "delivered_amount": flt(d.get("amount")),
            "invoiced_amount": flt(i.get("amount")),
            "pct_delivered": round(100.0 * delivered_qty / ordered_qty, 2) if ordered_qty else None,
            "pct_invoiced": round(100.0 * invoiced_qty / ordered_qty, 2) if ordered_qty else None,
        }

    total_ordered = sum(v["ordered_qty"] for v in items.values())
    totals = {
        "ordered_qty": round(total_ordered, 6),
        "delivered_qty": round(sum(v["delivered_qty"] for v in items.values()), 6),
        "invoiced_qty": round(sum(v["invoiced_qty"] for v in items.values()), 6),
        "ordered_amount": round(sum(v["ordered_amount"] for v in items.values()), 2),
        "delivered_amount": round(sum(v["delivered_amount"] for v in items.values()), 2),
        "invoiced_amount": round(sum(v["invoiced_amount"] for v in items.values()), 2),
    }
    fully_delivered = bool(items) and all(
        v["ordered_qty"] > 0 and v["delivered_qty"] >= v["ordered_qty"] for v in items.values() if v["ordered_qty"]
    )
    fully_invoiced = fully_delivered and all(
        v["invoiced_qty"] >= v["ordered_qty"] for v in items.values() if v["ordered_qty"]
    )
    return {
        "items": list(items.values()),
        "totals": totals,
        "fully_delivered": fully_delivered,
        "fully_invoiced": fully_invoiced,
    }


# ── Queries ───────────────────────────────────────────────────────


def _sum_by_item(rows):
    out = {}
    for r in rows:
        bucket = out.setdefault(r["item_code"], {"qty": 0.0, "amount": 0.0})
        bucket["qty"] += flt(r["qty"])
        bucket["amount"] += flt(r["amount"])
    return out


def _ordered(opportunity):
    return _sum_by_item(
        frappe.db.sql(
            """
            SELECT soi.item_code, soi.qty, soi.amount
            FROM `tabSales Order Item` soi
            JOIN `tabSales Order` so ON so.name = soi.parent
            WHERE so.trader_opportunity = %(opp)s AND so.docstatus < 2
            """,
            {"opp": opportunity},
            as_dict=True,
        )
    )


def _delivered(opportunity):
    return _sum_by_item(
        frappe.db.sql(
            """
            SELECT dni.item_code, dni.qty, dni.amount
            FROM `tabDelivery Note Item` dni
            JOIN `tabDelivery Note` dn ON dn.name = dni.parent
            WHERE dn.trader_opportunity = %(opp)s AND dn.docstatus = 1
            """,
            {"opp": opportunity},
            as_dict=True,
        )
    )


def _invoiced(opportunity):
    rows = frappe.db.sql(
        """
        SELECT sii.name AS row_name, sii.item_code, sii.qty, sii.amount
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1 AND (
            si.trader_opportunity = %(opp)s
            OR sii.delivery_note IN (
                SELECT name FROM `tabDelivery Note`
                WHERE trader_opportunity = %(opp)s AND docstatus = 1
            )
        )
        """,
        {"opp": opportunity},
        as_dict=True,
    )
    seen, unique = set(), []
    for r in rows:  # the OR can match one row twice only via the sub-select; dedupe defensively
        if r["row_name"] in seen:
            continue
        seen.add(r["row_name"])
        unique.append(r)
    return _sum_by_item(unique)


@frappe.whitelist()
def get_fulfilment_progress(opportunity):
    """Ordered / delivered / invoiced by item for one Commercial Opportunity."""
    doc = frappe.get_doc("Trader Opportunity", opportunity)
    doc.check_permission("read")
    assert_document_company_access(doc.company)

    for doctype in ("Sales Order", "Delivery Note", "Sales Invoice"):
        if not frappe.db.has_column(doctype, "trader_opportunity"):
            frappe.throw(_("Opportunity tracking is not enabled on this site."))

    report = summarize_fulfilment(_ordered(opportunity), _delivered(opportunity), _invoiced(opportunity))
    report["opportunity"] = opportunity
    return report


from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "sales")
