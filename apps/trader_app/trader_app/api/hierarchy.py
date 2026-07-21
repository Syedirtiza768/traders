# -*- coding: utf-8 -*-
"""Commercial Line → Option → Item hierarchy helpers (OPP PRD).

Pure decision cores live here so they can be unit-tested without a site.
Document attach/copy helpers use Frappe when available.
"""

from __future__ import unicode_literals

from frappe.utils import flt


COMMERCIAL_FIELD = "trader_commercial_options"


def effective_item_qty(unit_qty, package_qty):
    """PRD quantity rule: unit_qty × package_qty."""
    return flt(unit_qty) * flt(package_qty if package_qty not in (None, "") else 1)


def remaining_package_qty(package_qty, qty_invoiced):
    rem = flt(package_qty) - flt(qty_invoiced)
    return rem if rem > 0 else 0.0


def option_row_to_dict(row, remaining_only=False):
    """Serialize a commercial option (dict or DocType row) for copy/append."""
    package_qty = flt(row.get("package_qty") if isinstance(row, dict) else row.package_qty)
    qty_invoiced = flt(row.get("qty_invoiced") if isinstance(row, dict) else getattr(row, "qty_invoiced", 0))
    if remaining_only:
        package_qty = remaining_package_qty(package_qty, qty_invoiced)
        if package_qty <= 0:
            return None
        qty_invoiced = 0.0

    items_src = row.get("items") if isinstance(row, dict) else (row.items or [])
    items = []
    for it in items_src or []:
        if isinstance(it, dict):
            unit_qty = flt(it.get("unit_qty", 1))
            unit_price = flt(it.get("unit_price", 0))
            discount = flt(it.get("discount_percent", 0))
            item_code = it.get("item_code")
            description = it.get("description")
            item_invoiced = 0.0 if remaining_only else flt(it.get("qty_invoiced", 0))
        else:
            unit_qty = flt(it.unit_qty)
            unit_price = flt(it.unit_price)
            discount = flt(it.discount_percent)
            item_code = it.item_code
            description = it.description
            item_invoiced = 0.0 if remaining_only else flt(getattr(it, "qty_invoiced", 0))
        if not item_code:
            continue
        amount = unit_qty * unit_price * (1.0 - (discount / 100.0))
        items.append({
            "item_code": item_code,
            "description": description,
            "unit_qty": unit_qty,
            "unit_price": unit_price,
            "discount_percent": discount,
            "amount": amount,
            "qty_invoiced": item_invoiced,
        })

    get = (lambda k, d=None: row.get(k, d)) if isinstance(row, dict) else (lambda k, d=None: getattr(row, k, d))
    return {
        "line_no": cint_safe(get("line_no", 1)),
        "client_requirements": get("client_requirements") or "",
        "option_no": cint_safe(get("option_no", 1)),
        "option_text": get("option_text") or "",
        "package_qty": package_qty,
        "stock_status": get("stock_status") or "",
        "package_price": flt(get("package_price")),
        "qty_invoiced": qty_invoiced,
        "items": items,
    }


def cint_safe(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def copy_commercial_options(rows, remaining_only=False):
    """Deep-copy commercial option rows as plain dicts suitable for doc.append."""
    out = []
    for row in rows or []:
        copied = option_row_to_dict(row, remaining_only=remaining_only)
        if copied:
            out.append(copied)
    return out


def flatten_commercial_options(rows, warehouse=None):
    """Expand hierarchy into ERPNext item rows: qty = unit_qty × package_qty."""
    flat = []
    for row in copy_commercial_options(rows):
        package_qty = flt(row.get("package_qty") or 1)
        for it in row.get("items") or []:
            qty = effective_item_qty(it.get("unit_qty"), package_qty)
            if qty <= 0:
                continue
            discount = flt(it.get("discount_percent"))
            rate = flt(it.get("unit_price"))
            if discount:
                rate = rate * (1.0 - (discount / 100.0))
            entry = {
                "item_code": it.get("item_code"),
                "qty": qty,
                "rate": rate,
                "description": it.get("description")
                or "{0} / {1}".format(row.get("client_requirements") or "", row.get("option_text") or "").strip(" /"),
            }
            if warehouse:
                entry["warehouse"] = warehouse
            flat.append(entry)
    return flat


def serialize_commercial_options(doc):
    """Read trader_commercial_options from a document into API-friendly dicts."""
    if not doc or not hasattr(doc, COMMERCIAL_FIELD):
        return []
    return copy_commercial_options(getattr(doc, COMMERCIAL_FIELD) or [])


def apply_commercial_options(doc, rows, clear_existing=True):
    """Write commercial option rows onto ``doc`` (must have the child table field)."""
    if not hasattr(doc, COMMERCIAL_FIELD):
        return
    if clear_existing:
        doc.set(COMMERCIAL_FIELD, [])
    for row in copy_commercial_options(rows):
        items = row.pop("items", [])
        child = doc.append(COMMERCIAL_FIELD, row)
        for it in items:
            child.append("items", it)


def sync_flat_items_from_hierarchy(doc, warehouse=None, clear_items=True):
    """Rebuild standard ``items`` from commercial hierarchy for stock/GL engines."""
    rows = serialize_commercial_options(doc)
    flat = flatten_commercial_options(rows, warehouse=warehouse)
    if clear_items:
        doc.set("items", [])
    for entry in flat:
        doc.append("items", entry)
    return flat
