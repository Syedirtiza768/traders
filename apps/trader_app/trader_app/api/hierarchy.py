# -*- coding: utf-8 -*-
"""Commercial Line → Option → Item hierarchy helpers (OPP PRD).

Pure decision cores live here so they can be unit-tested without a site.
Document attach/copy helpers use Frappe when available.

Persistence note:
  Nested child tables under Custom Field parents often fail to save in Frappe.
  We therefore store items in ``items_json`` on each option row and also try to
  write ``Trader Commercial Option Item`` rows after the parent document saves.
"""

from __future__ import unicode_literals

import json

from frappe.utils import flt


COMMERCIAL_FIELD = "trader_commercial_options"


def effective_item_qty(unit_qty, package_qty):
    """PRD quantity rule: unit_qty × package_qty."""
    return flt(unit_qty) * flt(package_qty if package_qty not in (None, "") else 1)


def remaining_package_qty(package_qty, qty_invoiced):
    rem = flt(package_qty) - flt(qty_invoiced)
    return rem if rem > 0 else 0.0


def _normalize_item_dict(it, remaining_only=False):
    if isinstance(it, dict):
        unit_qty = flt(it.get("unit_qty", 1))
        unit_price = flt(it.get("unit_price", 0))
        discount = flt(it.get("discount_percent", 0))
        item_code = it.get("item_code")
        description = it.get("description") or ""
        item_invoiced = 0.0 if remaining_only else flt(it.get("qty_invoiced", 0))
    else:
        unit_qty = flt(getattr(it, "unit_qty", 1))
        unit_price = flt(getattr(it, "unit_price", 0))
        discount = flt(getattr(it, "discount_percent", 0))
        item_code = getattr(it, "item_code", None)
        description = getattr(it, "description", None) or ""
        item_invoiced = 0.0 if remaining_only else flt(getattr(it, "qty_invoiced", 0))
    if not item_code:
        return None
    amount = unit_qty * unit_price * (1.0 - (discount / 100.0))
    return {
        "item_code": item_code,
        "description": description,
        "unit_qty": unit_qty,
        "unit_price": unit_price,
        "discount_percent": discount,
        "amount": amount,
        "qty_invoiced": item_invoiced,
    }


def _parse_items_json(raw):
    if not raw:
        return []
    if isinstance(raw, (list, tuple)):
        return list(raw)
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except Exception:
            return []
        return data if isinstance(data, list) else []
    return []


def _items_from_row(row, remaining_only=False):
    """Resolve items from nested table, items_json, or DB (in that order)."""
    items_src = []
    if isinstance(row, dict):
        items_src = row.get("items") or []
        if not items_src:
            items_src = _parse_items_json(row.get("items_json"))
    else:
        items_src = list(getattr(row, "items", None) or [])
        if not items_src:
            items_src = _parse_items_json(getattr(row, "items_json", None))
        if not items_src and getattr(row, "name", None):
            try:
                import frappe
                items_src = frappe.get_all(
                    "Trader Commercial Option Item",
                    filters={"parent": row.name},
                    fields=[
                        "item_code",
                        "description",
                        "unit_qty",
                        "unit_price",
                        "discount_percent",
                        "qty_invoiced",
                    ],
                    order_by="idx",
                )
            except Exception:
                items_src = []

    items = []
    for it in items_src or []:
        normalized = _normalize_item_dict(it, remaining_only=remaining_only)
        if normalized:
            items.append(normalized)
    return items


def option_row_to_dict(row, remaining_only=False):
    """Serialize a commercial option (dict or DocType row) for copy/append."""
    package_qty = flt(row.get("package_qty") if isinstance(row, dict) else row.package_qty)
    qty_invoiced = flt(row.get("qty_invoiced") if isinstance(row, dict) else getattr(row, "qty_invoiced", 0))
    if remaining_only:
        package_qty = remaining_package_qty(package_qty, qty_invoiced)
        if package_qty <= 0:
            return None
        qty_invoiced = 0.0

    items = _items_from_row(row, remaining_only=remaining_only)
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
        "items_json": json.dumps(items),
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


def select_first_options(rows):
    """Keep the lowest option_no per line_no (Electrence multi-option total rule)."""
    by_line = {}
    for row in copy_commercial_options(rows):
        line_no = cint_safe(row.get("line_no") or 1)
        option_no = cint_safe(row.get("option_no") or 1)
        current = by_line.get(line_no)
        if current is None or option_no < cint_safe(current.get("option_no") or 1):
            by_line[line_no] = row
    return [by_line[k] for k in sorted(by_line.keys())]


def flatten_commercial_options(rows, warehouse=None, first_option_only=False):
    """Expand hierarchy into ERPNext item rows: qty = unit_qty × package_qty."""
    source = select_first_options(rows) if first_option_only else copy_commercial_options(rows)
    flat = []
    for row in source:
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


def hierarchy_amount(rows, first_option_only=True):
    """Sum package amounts (unit_qty × package_qty × unit_price)."""
    source = select_first_options(rows) if first_option_only else copy_commercial_options(rows)
    total = 0.0
    for row in source:
        package_qty = flt(row.get("package_qty") or 1)
        for it in row.get("items") or []:
            unit_qty = flt(it.get("unit_qty") or 1)
            unit_price = flt(it.get("unit_price") or 0)
            discount = flt(it.get("discount_percent") or 0)
            total += unit_qty * package_qty * unit_price * (1.0 - (discount / 100.0))
    return total


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
        row["items_json"] = json.dumps(items)
        child = doc.append(COMMERCIAL_FIELD, row)
        for it in items:
            child.append("items", it)
        if hasattr(child, "items_json"):
            child.items_json = json.dumps(items)


def persist_nested_commercial_items(doc):
    """Persist option items to items_json + nested child table after parent save.

    Nested Table under Custom Field parents often does not cascade. Calling this
    after insert/save ensures hierarchy items survive reload.
    """
    import frappe

    if not doc or not getattr(doc, "name", None) or not hasattr(doc, COMMERCIAL_FIELD):
        return 0

    written = 0
    for row in getattr(doc, COMMERCIAL_FIELD) or []:
        if not getattr(row, "name", None):
            continue
        items = _items_from_row(row)
        payload = json.dumps(items)
        if hasattr(row, "items_json"):
            frappe.db.set_value(
                "Trader Commercial Option",
                row.name,
                "items_json",
                payload,
                update_modified=False,
            )
            row.items_json = payload

        frappe.db.delete("Trader Commercial Option Item", {"parent": row.name})
        for idx, it in enumerate(items):
            child = frappe.get_doc({
                "doctype": "Trader Commercial Option Item",
                "parent": row.name,
                "parenttype": "Trader Commercial Option",
                "parentfield": "items",
                "idx": idx + 1,
                "item_code": it.get("item_code"),
                "description": it.get("description") or "",
                "unit_qty": flt(it.get("unit_qty") or 1),
                "unit_price": flt(it.get("unit_price") or 0),
                "discount_percent": flt(it.get("discount_percent") or 0),
                "amount": flt(it.get("amount") or 0),
                "qty_invoiced": flt(it.get("qty_invoiced") or 0),
            })
            child.db_insert()
            written += 1
    return written


def sync_flat_items_from_hierarchy(doc, warehouse=None, clear_items=True, first_option_only=None):
    """Rebuild standard ``items`` from commercial hierarchy for stock/GL engines."""
    rows = serialize_commercial_options(doc)
    if first_option_only is None:
        first_option_only = getattr(doc, "doctype", None) == "Quotation"
    flat = flatten_commercial_options(rows, warehouse=warehouse, first_option_only=first_option_only)
    if clear_items:
        doc.set("items", [])
    for entry in flat:
        doc.append("items", entry)
    return flat
