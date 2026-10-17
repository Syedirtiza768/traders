# -*- coding: utf-8 -*-
"""Trader App — link Delivery Note lines to their Order Confirmation lines.

ERPNext only accepts a Delivery Note row that points at a Sales Order when it
carries *both* ``against_sales_order`` and ``so_detail`` (the order line). Rows
built from the commercial hierarchy have neither, and the Opportunity hub used
to set only ``against_sales_order`` — which makes the challan impossible to
submit ("Against Sales Order Item is not set").

This hook runs on Delivery Note validate. For a challan that belongs to an
Opportunity it matches every unlinked row to a submitted Order Confirmation
line of the same Opportunity (same item, remaining quantity first-come) so the
order's *delivered qty* and *% delivered* update natively. A row with no
matching order line is left as a plain, unlinked delivery row — never half-linked.
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import flt


# ── Pure helper (unit-tested, no database) ────────────────────────


def match_order_lines(dn_items, order_rows):
    """Greedy item-code match of challan rows to order lines.

    ``dn_items``  — ``[{"idx", "item_code", "qty"}]``
    ``order_rows``— ``[{"name", "parent", "item_code", "remaining"}]`` in
                    preference order (oldest order first).

    Returns ``{idx: {"so": parent, "so_detail": name}}`` for matched rows. A row
    is matched while the order line still has remaining quantity; a challan row
    larger than one line's remainder is matched to the first line with any
    remainder (ERPNext's own over-delivery control then applies).
    """
    pool = [dict(r, remaining=flt(r.get("remaining"))) for r in order_rows]
    out = {}
    for item in dn_items:
        qty = flt(item.get("qty"))
        for line in pool:
            if line["item_code"] != item.get("item_code") or line["remaining"] <= 0:
                continue
            out[item["idx"]] = {"so": line["parent"], "so_detail": line["name"]}
            line["remaining"] = max(line["remaining"] - qty, 0.0)
            break
    return out


# ── Hook ──────────────────────────────────────────────────────────


def link_delivery_note_to_order(doc, method=None):
    """Delivery Note validate hook (draft challans of an Opportunity only)."""
    if doc.docstatus != 0 or doc.get("is_return"):
        return
    if not doc.meta.has_field("trader_opportunity"):
        return
    opportunity = doc.get("trader_opportunity")
    if not opportunity:
        return

    rows = doc.get("items") or []
    unlinked = [r for r in rows if not (r.get("against_sales_order") and r.get("so_detail"))]
    if not unlinked:
        return

    orders = frappe.get_all(
        "Sales Order",
        filters={"trader_opportunity": opportunity, "docstatus": 1, "status": ["not in", ["Closed", "Cancelled"]]},
        pluck="name",
        order_by="transaction_date asc, creation asc",
    )
    order_rows = []
    if orders:
        order_rows = frappe.get_all(
            "Sales Order Item",
            filters={"parent": ["in", orders]},
            fields=["name", "parent", "item_code", "qty", "delivered_qty"],
            order_by="parent asc, idx asc",
        )
        # Quantity already spoken for by *other* draft challans is not subtracted:
        # ERPNext's over-delivery check on submit is the authority.
        for r in order_rows:
            r["remaining"] = flt(r["qty"]) - flt(r["delivered_qty"])

    matches = match_order_lines(
        [{"idx": r.idx, "item_code": r.item_code, "qty": r.qty} for r in unlinked],
        order_rows,
    )
    for row in unlinked:
        hit = matches.get(row.idx)
        if hit:
            row.against_sales_order = hit["so"]
            row.so_detail = hit["so_detail"]
        else:
            row.against_sales_order = None
            row.so_detail = None
