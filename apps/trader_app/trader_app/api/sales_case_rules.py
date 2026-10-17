# -*- coding: utf-8 -*-
"""Pure decision cores for Sales Case (Opportunity) delivery and closure.

Kept free of document access so the rules can be unit-tested without a site.
The Frappe calls live in ``opportunity.py``.

Found while mapping the sahamid case MT-2595-2022-02-21--030817 (customer Bulleh Shah
Packaging): one quotation, two customer POs (two Order Confirmations) and seven partial
delivery challans. Two gaps came out of it:

* A challan created without naming its Order Confirmation was built from the most recently
  modified OC. With two POs open, the challan could bill the other PO's order.
* The closing reason and remarks of a case (legacy ``closingreason``, e.g. "Case Closed",
  "Customer cancelled PO") had no home, so a case closed at "Other" lost its reason.
* A second or third challan against the same Order Confirmation was pre-filled with the full
  ordered quantities, so every partial delivery had to be corrected by hand (gap G-8). The
  remaining-quantity prefill and the line picker below fix that.
"""

from __future__ import unicode_literals


class SalesCaseRuleError(ValueError):
    """A rule was broken; the message is shown to the user as-is."""


def _as_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _is_submitted(order):
    return int(order.get("docstatus") or 0) == 1


def is_open_for_delivery(order):
    """A submitted Order Confirmation that still has quantity to deliver."""
    return _is_submitted(order) and _as_float(order.get("per_delivered")) < 100.0


def pick_source_order(orders, requested=None):
    """Return the name of the Order Confirmation a challan should be built from.

    ``orders``    -- dicts with ``name``, ``po_no``, ``docstatus``, ``per_delivered``; every
                     Order Confirmation linked to the Project (any status).
    ``requested`` -- the OC the user chose, if any. It must be one of ``orders`` and submitted.

    Returns ``None`` when the Project has no Order Confirmation at all (the caller keeps its
    "create an Order Confirmation first" message). Raises :class:`SalesCaseRuleError` when the
    choice cannot be made safely: the requested OC is unknown or not submitted, every OC is
    already fully delivered, or several are open and none was named.
    """
    orders = list(orders or [])
    if requested:
        match = [o for o in orders if o.get("name") == requested]
        if not match:
            raise SalesCaseRuleError("Sales Order {0} does not belong to this Project.".format(requested))
        if not _is_submitted(match[0]):
            raise SalesCaseRuleError("Order Confirmation {0} must be submitted before a challan is raised against it.".format(requested))
        return requested

    if not orders:
        return None

    open_orders = [o for o in orders if is_open_for_delivery(o)]
    if not open_orders:
        raise SalesCaseRuleError(
            "Every Order Confirmation on this Project is either not submitted or fully delivered; "
            "there is nothing left to deliver."
        )
    if len(open_orders) == 1:
        return open_orders[0]["name"]

    labels = ", ".join("{0} (PO {1})".format(o["name"], o.get("po_no") or "not set") for o in open_orders)
    raise SalesCaseRuleError(
        "This Project has {0} open Order Confirmations ({1}). Choose the one this challan delivers against.".format(
            len(open_orders), labels
        )
    )


CLOSE_REASON_REQUIRED_STAGES = ("Other",)


def close_reason_error(close_stage, close_reason, open_order_count=0):
    """Return an error message when closing needs a reason and none was given, else ``None``.

    ``Other`` always needs one. Closing at ``Delivery`` while submitted Order Confirmations still
    have undelivered quantity also needs one, so a cancelled or substituted line is explained
    rather than silently left open (the legacy case closed with one quoted line never delivered).
    """
    reason = (close_reason or "").strip()
    if reason:
        return None
    if close_stage in CLOSE_REASON_REQUIRED_STAGES:
        return "A closing reason is required when a Project is closed at stage {0}.".format(close_stage)
    if close_stage == "Delivery" and int(open_order_count or 0) > 0:
        return (
            "{0} Order Confirmation(s) still have undelivered quantity. Give a closing reason "
            "(for example a cancelled line) to close this Project at Delivery."
        ).format(int(open_order_count))
    return None


# ── Partial delivery: remaining quantity and the lines a challan covers (G-8) ──


def _as_line_no(value):
    """Line and option numbers default to 1, as the commercial hierarchy reads them."""
    try:
        return int(float(value or 1))
    except (TypeError, ValueError):
        return 1


def _normalise_chosen(chosen):
    return {_as_line_no(line): _as_line_no(option) for line, option in (chosen or {}).items()}


def _is_billed(row, chosen):
    return chosen.get(_as_line_no(row.get("line_no"))) == _as_line_no(row.get("option_no"))


def delivered_by_item(order_items):
    """Quantity already delivered per item code across an Order Confirmation's flat lines.

    ``order_items`` -- dicts with ``item_code`` and ``delivered_qty`` (``Sales Order Item``), which
    ERPNext updates when a challan is submitted against that order line.
    """
    totals = {}
    for row in order_items or []:
        code = row.get("item_code")
        if code:
            totals[code] = totals.get(code, 0.0) + _as_float(row.get("delivered_qty"))
    return totals


def oc_line_numbers(rows):
    """The commercial line numbers an Order Confirmation holds (any option)."""
    return sorted({_as_line_no(row.get("line_no")) for row in rows or []})


def _split_billed_items(rows, chosen, delivered):
    """Spread each billed item's delivered quantity over the billed rows, in hierarchy order.

    Returns ``{(row_index, item_index): (ordered, delivered_here)}`` for billed items with a
    quantity. Delivered quantity is tracked per item code, so a code ordered on two lines is
    shared between them in order; which line an earlier challan delivered is not recorded
    (the same ambiguity as G-4 for order-line linking).
    """
    pool = dict(delivered or {})
    split = {}
    for r_idx, row in enumerate(rows or []):
        if not _is_billed(row, chosen):
            continue
        package = _as_float(row.get("package_qty")) or 1.0
        for i_idx, item in enumerate(row.get("items") or []):
            ordered = _as_float(item.get("unit_qty")) * package
            if ordered <= 0:
                continue
            code = item.get("item_code")
            took = min(max(pool.get(code, 0.0), 0.0), ordered)
            pool[code] = pool.get(code, 0.0) - took
            split[(r_idx, i_idx)] = (ordered, took)
    return split


def delivery_plan(rows, chosen, delivered):
    """The billed option of each commercial line, with what is still to deliver on it.

    ``rows``      -- the Order Confirmation's commercial hierarchy (plain dicts).
    ``chosen``    -- ``line_no -> option_no`` the order bills (``hierarchy.resolve_selection``).
    ``delivered`` -- ``item_code -> qty`` already delivered (:func:`delivered_by_item`).

    Feeds the challan's line picker. Alternatives that are not billed are not listed.
    """
    chosen = _normalise_chosen(chosen)
    split = _split_billed_items(rows, chosen, delivered)
    lines = []
    for r_idx, row in enumerate(rows or []):
        if not _is_billed(row, chosen):
            continue
        items = []
        for i_idx, item in enumerate(row.get("items") or []):
            if (r_idx, i_idx) not in split:
                continue
            ordered, took = split[(r_idx, i_idx)]
            items.append({
                "item_code": item.get("item_code"),
                "description": item.get("description") or "",
                "ordered_qty": ordered,
                "delivered_qty": took,
                "remaining_qty": ordered - took,
            })
        lines.append({
            "line_no": _as_line_no(row.get("line_no")),
            "option_no": _as_line_no(row.get("option_no")),
            "option_text": row.get("option_text") or "",
            "client_requirements": row.get("client_requirements") or "",
            "items": items,
            "ordered_qty": sum(i["ordered_qty"] for i in items),
            "remaining_qty": sum(i["remaining_qty"] for i in items),
        })
    return lines


def challan_option_rows(rows, chosen, delivered, covered_lines=None):
    """Hierarchy rows for a challan: the billed option of each covered line, cut to what is left.

    Each billed item becomes ``unit_qty = remaining / package_qty``, so the hierarchy and the flat
    items (which flatten as ``unit_qty x package_qty``) both come to the remaining quantity, and a
    later save that re-syncs the flat items from the hierarchy keeps it. Items with nothing left
    are dropped. A billed option keeps its row, flagged selected, even when empty, so the choice
    still resolves on save. Alternatives are copied unchanged and stay unbilled.

    ``covered_lines`` -- line numbers this challan delivers; ``None`` covers every line. A line
    left out is not on the challan at all.

    Raises :class:`SalesCaseRuleError` when a covered line is not on the order, when no line is
    covered, or when nothing is left to deliver on the covered lines.
    """
    chosen = _normalise_chosen(chosen)
    covered = None
    if covered_lines is not None:
        covered = {_as_line_no(line) for line in covered_lines}
        missing = sorted(covered - set(oc_line_numbers(rows)))
        if missing:
            raise SalesCaseRuleError(
                "Line {0} is not on this Order Confirmation.".format(", ".join(str(m) for m in missing))
            )
        if not covered:
            raise SalesCaseRuleError("Choose at least one line for this challan.")

    split = _split_billed_items(rows, chosen, delivered)
    out = []
    for r_idx, row in enumerate(rows or []):
        line = _as_line_no(row.get("line_no"))
        if covered is not None and line not in covered:
            continue
        copied = dict(row, line_no=line, option_no=_as_line_no(row.get("option_no")))
        copied.pop("items_json", None)
        billed = _is_billed(row, chosen)
        copied["is_selected"] = 1 if billed else 0
        if not billed:
            copied["items"] = [dict(item) for item in row.get("items") or []]
            out.append(copied)
            continue
        package = _as_float(row.get("package_qty")) or 1.0
        items = []
        for i_idx, item in enumerate(row.get("items") or []):
            if (r_idx, i_idx) not in split:
                continue
            ordered, took = split[(r_idx, i_idx)]
            left = ordered - took
            if left > 0:
                items.append(dict(item, unit_qty=left / package))
        copied["items"] = items
        out.append(copied)

    if not any(row["items"] for row in out if row["is_selected"]):
        raise SalesCaseRuleError("Nothing is left to deliver on the chosen lines of this Order Confirmation.")
    return out
