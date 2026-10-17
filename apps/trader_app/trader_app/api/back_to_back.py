# -*- coding: utf-8 -*-
"""Back-to-back stock for a business that sells before it buys.

An order is taken with no stock on hand. The shortfall on each order line is bought against the
order (a purchase order linked to the sales order line). The challan can only go out once the
goods are in stock, so the stock guard stays on and nothing is issued below zero.

The pure functions here hold the decisions and have no database access, so they can be unit
tested without a site. The Frappe calls live in the same module below the pure section.
"""

from __future__ import unicode_literals


def _as_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


# ── Pure decision cores ───────────────────────────────────────────


def procurement_shortfall(lines):
    """How much to buy for each item on an order.

    ``lines`` -- dicts with ``item_code``, ``remaining`` (ordered minus delivered), ``on_hand``
    and ``on_order`` (open purchase quantity already placed against the order line).

    Open purchase quantity counts toward the need, so an item is not bought twice.
    Returns ``[{"item_code", "shortfall"}]`` for items with a shortfall only.
    """
    need = {}
    for line in lines or []:
        code = line.get("item_code")
        gap = _as_float(line.get("remaining")) - _as_float(line.get("on_hand")) - _as_float(line.get("on_order"))
        if code and gap > 0:
            need[code] = need.get(code, 0.0) + gap
    return [{"item_code": code, "shortfall": qty} for code, qty in need.items()]


def delivery_shortages(rows, on_hand):
    """Stock that a challan cannot cover from what is on hand.

    ``rows``    -- challan lines as dicts with ``item_code`` and ``qty``; quantities for the same
                   item are added together, since they leave the same stock.
    ``on_hand`` -- ``{item_code: quantity on hand}`` in the warehouse the challan issues from.

    Returns ``[{"item_code", "required", "on_hand", "short"}]`` for each item that is short.
    """
    required = {}
    for row in rows or []:
        code = row.get("item_code")
        qty = _as_float(row.get("qty"))
        if code and qty > 0:
            required[code] = required.get(code, 0.0) + qty
    out = []
    for code, qty in required.items():
        available = _as_float((on_hand or {}).get(code))
        if qty > available:
            out.append({"item_code": code, "required": qty, "on_hand": available, "short": qty - available})
    return out


def shortage_message(shortages):
    """The message shown to the user when a challan is refused for lack of stock."""
    parts = [
        "{0}: {1} needed, {2} on hand (short {3})".format(
            row["item_code"], _fmt(row["required"]), _fmt(row["on_hand"]), _fmt(row["short"])
        )
        for row in shortages
    ]
    return (
        "Not enough stock to deliver. "
        + "; ".join(parts)
        + ". Order the shortfall from a supplier against the sales order, receive it, then deliver."
    )


def _fmt(value):
    return ("%.4f" % value).rstrip("0").rstrip(".")


# ── Database-backed functions ─────────────────────────────────────

import frappe  # noqa: E402  (whitelist decorator; the pure section above needs no site)


def _on_hand(item_code, warehouse):
    import frappe

    if not item_code or not warehouse:
        return 0.0
    return _as_float(frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": warehouse}, "actual_qty"))


def _on_order(sales_order_item):
    """Open purchase quantity placed against one sales order line."""
    import frappe

    if not sales_order_item:
        return 0.0
    rows = frappe.db.sql(
        """
        SELECT poi.qty, poi.received_qty
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE poi.sales_order_item = %s AND po.docstatus = 1
          AND po.status NOT IN ('Closed', 'Cancelled')
        """,
        sales_order_item,
    )
    return sum(max(_as_float(qty) - _as_float(received), 0.0) for qty, received in rows)


def _is_stock_item(item_code):
    import frappe

    return bool(frappe.db.get_value("Item", item_code, "is_stock_item"))


def order_stock_position_rows(order_doc):
    """Per order line: remaining to deliver, on hand, on order and the shortfall to buy."""
    rows = []
    for item in order_doc.items or []:
        if not _is_stock_item(item.item_code):
            continue
        warehouse = item.warehouse or order_doc.set_warehouse
        remaining = _as_float(item.qty) - _as_float(item.delivered_qty)
        on_hand = _on_hand(item.item_code, warehouse)
        on_order = _on_order(item.name)
        rows.append(
            {
                "sales_order_item": item.name,
                "item_code": item.item_code,
                "item_name": item.item_name,
                "warehouse": warehouse,
                "ordered": _as_float(item.qty),
                "delivered": _as_float(item.delivered_qty),
                "remaining": remaining,
                "on_hand": on_hand,
                "on_order": on_order,
                "shortfall": max(remaining - on_hand - on_order, 0.0),
            }
        )
    return rows


@frappe.whitelist()
def get_order_stock_position(order):
    """Stock position for a sales order, for the order page and the purchase step."""
    import frappe

    so = frappe.get_doc("Sales Order", order)
    so.check_permission("read")
    from trader_app.api.company import assert_document_company_access

    assert_document_company_access(so.company)
    return {
        "order": so.name,
        "status": so.status,
        "lines": order_stock_position_rows(so),
        "purchase_orders": [
            {"name": row[0], "supplier": row[1], "status": row[2]}
            for row in frappe.db.sql(
                """
                SELECT DISTINCT po.name, po.supplier, po.status
                FROM `tabPurchase Order` po
                INNER JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
                WHERE poi.sales_order = %s AND po.docstatus = 1
                """,
                so.name,
            )
        ],
    }


def _agreed_buying_rate(item_code):
    """The rate a purchase is made at when the buyer gives none: the last rate paid for the item, else its cost.

    The selling standard rate is never used for a purchase.
    """
    row = frappe.db.get_value("Item", item_code, ["last_purchase_rate", "valuation_rate"], as_dict=True) or {}
    return _as_float(row.get("last_purchase_rate")) or _as_float(row.get("valuation_rate"))


@frappe.whitelist()
def create_purchase_order_for_order(order, supplier, rates=None, transaction_date=None, submit=True):
    """Buy the shortfall of an order from a supplier, linked line by line to the order.

    ``rates`` -- optional ``{item_code: unit cost}``; otherwise the item's standard rate is used.
    ``transaction_date`` -- the purchase order date; defaults to today. A back-dated order (an
    imported case) passes its own date, and the delivery date is never placed before it.
    The purchase order is submitted so the goods can be received against it. With ``submit`` False it is left a
    draft, for an approval before it is submitted (G-APR-01).
    """
    import json

    import frappe
    from frappe.utils import nowdate

    from trader_app.api.company import assert_document_company_access

    so = frappe.get_doc("Sales Order", order)
    so.check_permission("read")
    assert_document_company_access(so.company)
    if so.docstatus != 1:
        frappe.throw("Submit the sales order before buying for it.")
    if not supplier or not frappe.db.exists("Supplier", supplier):
        frappe.throw("Choose a supplier to buy the shortfall from.")

    rates = json.loads(rates) if isinstance(rates, str) and rates else (rates or {})
    shortfall_by_line = {
        row["sales_order_item"]: row["shortfall"]
        for row in order_stock_position_rows(so)
        if row["shortfall"] > 0
    }
    if not shortfall_by_line:
        frappe.throw("Nothing to buy: the order is covered by stock on hand or by open purchase orders.")

    po = frappe.new_doc("Purchase Order")
    po.company = so.company
    po.supplier = supplier
    po.transaction_date = transaction_date or nowdate()
    po.schedule_date = max(str(so.delivery_date or po.transaction_date), str(po.transaction_date))
    for item in so.items:
        qty = shortfall_by_line.get(item.name)
        if not qty:
            continue
        rate = _as_float(rates.get(item.item_code)) or _agreed_buying_rate(item.item_code)
        po.append(
            "items",
            {
                "item_code": item.item_code,
                "qty": qty,
                "rate": rate,
                "warehouse": item.warehouse or so.set_warehouse,
                "schedule_date": po.schedule_date,
                "sales_order": so.name,
                "sales_order_item": item.name,
            },
        )

    # The purchase step is taken for the order, after its access was checked above. Sales users
    # hold no purchase role, so the document is written as the system and the order is the link.
    acting_user = frappe.session.user
    frappe.set_user("Administrator")
    approval_note = ""
    try:
        po.insert(ignore_permissions=True)
        if submit:
            try:
                po.submit()
            except frappe.ValidationError as exc:
                if "needs an approval" not in str(exc):
                    raise
                # The draft stays saved, so an approver can record the approval on it and submit it (G-APR-01).
                approval_note = str(exc)[:300]
    finally:
        frappe.set_user(acting_user)
    frappe.db.commit()
    submitted = bool(submit) and not approval_note
    return {"name": po.name, "supplier": supplier, "status": "Submitted" if submitted else "Draft",
            "lines": len(po.items), "approval_required": bool(approval_note), "message": approval_note}


@frappe.whitelist()
def receive_purchase_order_for_order(order, purchase_order, quantities=None, posting_date=None):
    """Post the goods receipt of a purchase order bought for this sales order.

    The sales user cannot open the purchasing module, so the receipt is written as the system,
    the same way the purchase order itself is. Only a purchase order that buys for this order's
    lines can be received here.

    ``quantities`` -- optional ``{item_code: qty received now}``. Without it the whole order is received.
    An item given a smaller quantity is partly supplied: the balance stays on the purchase order.
    An item given 0 is not received on this receipt. ``posting_date`` defaults to today.
    """
    import json

    import frappe
    from frappe.utils import nowdate

    from trader_app.api.company import assert_document_company_access

    so = frappe.get_doc("Sales Order", order)
    so.check_permission("read")
    assert_document_company_access(so.company)
    po = frappe.get_doc("Purchase Order", purchase_order)
    if po.docstatus != 1:
        frappe.throw("Submit the purchase order before receiving it.")
    if not any(item.sales_order == so.name for item in po.items):
        frappe.throw("{0} does not buy for {1}.".format(po.name, so.name))

    from erpnext.buying.doctype.purchase_order.purchase_order import make_purchase_receipt

    quantities = json.loads(quantities) if isinstance(quantities, str) and quantities else (quantities or {})
    acting_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        pr = make_purchase_receipt(po.name)
        if quantities:
            kept = []
            for row in pr.items:
                if row.item_code not in quantities:
                    continue
                qty = float(quantities[row.item_code])
                if qty <= 0:
                    continue
                if qty > float(row.qty):
                    frappe.throw("{0}: {1} received is more than {2} on the purchase order.".format(
                        row.item_code, qty, row.qty))
                row.qty = qty
                kept.append(row)
            pr.items = kept
            if not pr.items:
                frappe.throw("Nothing to receive: no quantity given for the lines on {0}.".format(po.name))
        pr.posting_date = posting_date or nowdate()
        # A goods receipt dated on the day the goods arrived must keep that date; without the flag ERPNext
        # resets it to today and the stock would appear after every earlier delivery (defect G-PUR-02).
        pr.set_posting_time = 1 if posting_date else 0
        pr.insert(ignore_permissions=True)
        pr.submit()
    finally:
        frappe.set_user(acting_user)
    frappe.db.commit()
    return {"name": pr.name, "purchase_order": po.name, "lines": len(pr.items)}


def refuse_challan_without_stock(doc, method=None):
    """Delivery Note before-submit hook: refuse a challan the stock on hand cannot cover.

    Runs before ERPNext's own check, so the user sees which items are short and what to do,
    rather than the generic negative-stock message. Returns early for returns and non-stock lines.
    """
    import frappe

    # Frappe sets docstatus to 1 before before_submit runs, so the submit state is not checked here.
    if doc.get("is_return"):
        return
    rows = []
    on_hand = {}
    for item in doc.items or []:
        if not _is_stock_item(item.item_code):
            continue
        rows.append({"item_code": item.item_code, "qty": item.qty})
        warehouse = item.warehouse or doc.set_warehouse
        on_hand[item.item_code] = _on_hand(item.item_code, warehouse)
    shortages = delivery_shortages(rows, on_hand)
    if shortages:
        frappe.throw(shortage_message(shortages), title="Insufficient stock")
