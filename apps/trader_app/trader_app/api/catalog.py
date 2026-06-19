# -*- coding: utf-8 -*-
"""Trader App — Components Catalog API.

Provides attribute-driven SKU catalog, find-or-create SKU resolver,
quick-entry text parser, opening-stock import, and stock-take.

All endpoints guard on the per-company `trader_components_enabled` flag.
When the flag is OFF these functions raise a 403 so they are never
invoked by the existing workflow.
"""

from __future__ import unicode_literals

import re
import json

import frappe
from frappe import _
from frappe.utils import nowdate, flt, cint, now_datetime

from trader_app.api.company import resolve_active_company


# ────────────────────────────────────────────────────────────────
# TAXONOMY SEED DATA  (PRD Appendix B — fully configurable)
# ────────────────────────────────────────────────────────────────

TAXONOMY = {
    "SSD": {
        "form_factors": ["M.2 NVMe", "M.2 SATA", "2.5 SATA", "mSATA", "M1", "e/f"],
        "capacities": [
            "120GB", "128GB", "240GB", "256GB",
            "480GB", "500GB", "512GB",
            "1TB", "2TB", "4TB",
        ],
        "grades": ["New", "Pulled", "A", "B", "C", "Refurbished"],
    },
    "HDD": {
        "form_factors": ["3.5 HDD", "2.5 HDD"],
        "capacities": [
            "250GB", "320GB", "500GB", "1TB", "2TB", "4TB", "8TB",
        ],
        "grades": ["New", "Pulled", "A", "B", "C", "Refurbished"],
    },
    "RAM": {
        "form_factors": [
            "DDR4 Desktop", "DDR3 Desktop", "DDR5 Desktop",
            "DDR4 Laptop", "DDR3 Laptop",
        ],
        "capacities": ["2GB", "4GB", "8GB", "16GB", "32GB", "64GB"],
        "grades": ["New", "Pulled", "A", "B", "C"],
    },
    "GPU": {
        "form_factors": ["PCIe x16 Gaming", "Workstation GPU"],
        "capacities": ["2GB", "4GB", "6GB", "8GB", "10GB", "12GB", "16GB", "24GB"],
        "grades": ["New", "Pulled", "A", "B"],
    },
    "CPU": {
        "form_factors": ["Intel LGA", "AMD AM4", "AMD AM5", "Intel 1151"],
        "capacities": ["Dual Core", "Quad Core", "6-Core", "8-Core", "12-Core", "16-Core"],
        "grades": ["New", "Pulled", "A", "B"],
    },
    "Motherboard": {
        "form_factors": ["ATX", "Micro ATX", "Mini ITX"],
        "capacities": ["Intel B660", "Intel H610", "Intel Z690", "AMD B550", "AMD X570"],
        "grades": ["New", "Pulled", "A", "B"],
    },
    "Power Supply": {
        "form_factors": ["ATX PSU"],
        "capacities": ["350W", "450W", "500W", "550W", "600W", "650W", "750W", "850W"],
        "grades": ["New", "Pulled", "A", "B"],
    },
    "Accessories": {
        "form_factors": ["Cables", "Adapters", "Coolers", "Cases", "Other"],
        "capacities": ["N/A"],
        "grades": ["New", "Pulled", "A"],
    },
}


# ────────────────────────────────────────────────────────────────
# GUARD
# ────────────────────────────────────────────────────────────────

def _assert_enabled(company):
    enabled = cint(frappe.db.get_value("Company", company, "trader_components_enabled") or 0)
    if not enabled:
        frappe.throw(
            _("Components Trading feature is not enabled for company {0}. "
              "Enable it in Settings → Company.").format(company),
            frappe.PermissionError,
        )


# ────────────────────────────────────────────────────────────────
# 1.  TAXONOMY
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_taxonomy(company=None):
    """Return the full attribute taxonomy (categories / form-factors / capacities / grades).
    Does NOT require the flag — used to display the catalog even before first enable.
    """
    company = resolve_active_company(company)
    return {
        "taxonomy": TAXONOMY,
        "categories": sorted(TAXONOMY.keys()),
    }


# ────────────────────────────────────────────────────────────────
# 2.  CATALOG ITEM LIST
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_catalog_items(company=None, category=None, form_factor=None,
                      capacity=None, grade=None,
                      page=1, page_size=20, search=None):
    """Paginated list of component items (trader_component_item = 1)."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["i.trader_component_item = 1", "i.disabled = 0"]
    params = {}

    if category:
        conditions.append("i.trader_component_category = %(category)s")
        params["category"] = category
    if form_factor:
        conditions.append("i.trader_component_form_factor = %(form_factor)s")
        params["form_factor"] = form_factor
    if capacity:
        conditions.append("i.trader_component_capacity = %(capacity)s")
        params["capacity"] = capacity
    if grade:
        conditions.append("i.trader_component_grade = %(grade)s")
        params["grade"] = grade
    if search:
        conditions.append(
            "(i.item_code LIKE %(search)s OR i.item_name LIKE %(search)s "
            "OR i.trader_component_category LIKE %(search)s)"
        )
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabItem` i WHERE {where}", params
    )[0][0]

    # Join Bin for stock on hand (company-scoped via Warehouse)
    rows = frappe.db.sql(f"""
        SELECT
            i.item_code, i.item_name, i.stock_uom,
            i.trader_component_category AS category,
            i.trader_component_form_factor AS form_factor,
            i.trader_component_capacity AS capacity,
            i.trader_component_grade AS grade,
            COALESCE(SUM(b.actual_qty), 0) AS qty_on_hand,
            COALESCE(SUM(b.stock_value), 0) AS stock_value,
            CASE WHEN SUM(b.actual_qty) > 0
                 THEN SUM(b.stock_value) / SUM(b.actual_qty)
                 ELSE 0 END AS valuation_rate,
            i.standard_rate
        FROM `tabItem` i
        LEFT JOIN `tabBin` b ON b.item_code = i.item_code
        LEFT JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s
        WHERE {where}
        GROUP BY i.item_code
        ORDER BY i.trader_component_category, i.trader_component_capacity, i.trader_component_grade
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "company": company, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 3.  FIND-OR-CREATE SKU
# ────────────────────────────────────────────────────────────────

def _make_item_code(category, form_factor, capacity, grade):
    """Deterministic item code from the 4-tuple."""
    def slug(s):
        return re.sub(r"[^A-Za-z0-9]+", "-", str(s).strip()).strip("-").upper()
    return "{}-{}-{}-{}".format(
        slug(category), slug(form_factor), slug(capacity), slug(grade)
    )


def _make_item_name(category, form_factor, capacity, grade):
    return "{} {} {} {}".format(category, form_factor, capacity, grade)


@frappe.whitelist()
def find_or_create_sku(category, form_factor, capacity, grade,
                       standard_rate=0.0, company=None):
    """Return existing item_code matching the 4-tuple, or create one.

    This is the canonical SKU resolver used by quick-entry and opening-stock import.
    Existing flat items are untouched.
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    item_code = _make_item_code(category, form_factor, capacity, grade)

    # 1. Try exact item_code match
    if frappe.db.exists("Item", item_code):
        return {"item_code": item_code, "created": False}

    # 2. Try matching on component metadata fields (handles name collisions)
    existing = frappe.db.get_value(
        "Item",
        {
            "trader_component_item": 1,
            "trader_component_category": category,
            "trader_component_form_factor": form_factor,
            "trader_component_capacity": capacity,
            "trader_component_grade": grade,
        },
        "name",
    )
    if existing:
        return {"item_code": existing, "created": False}

    # 3. Create the item
    item_group = _get_or_create_item_group(category)

    doc = frappe.new_doc("Item")
    doc.item_code = item_code
    doc.item_name = _make_item_name(category, form_factor, capacity, grade)
    doc.item_group = item_group
    doc.stock_uom = "Nos"
    doc.is_stock_item = 1
    doc.standard_rate = flt(standard_rate)
    doc.valuation_method = "FIFO"
    # Component metadata
    doc.trader_component_item = 1
    doc.trader_component_category = category
    doc.trader_component_form_factor = form_factor
    doc.trader_component_capacity = capacity
    doc.trader_component_grade = grade
    doc.insert(ignore_permissions=False)
    frappe.db.commit()

    return {"item_code": doc.item_code, "created": True}


def _get_or_create_item_group(category):
    """Ensure an item group exists for the category under 'Components' parent."""
    parent = "Components"
    if not frappe.db.exists("Item Group", parent):
        pg = frappe.new_doc("Item Group")
        pg.item_group_name = parent
        pg.parent_item_group = frappe.db.get_value("Item Group", {"parent_item_group": ""}, "name") or "All Item Groups"
        pg.is_group = 1
        pg.insert(ignore_permissions=True)
        frappe.db.commit()

    full_name = category
    if not frappe.db.exists("Item Group", full_name):
        ig = frappe.new_doc("Item Group")
        ig.item_group_name = full_name
        ig.parent_item_group = parent
        ig.is_group = 0
        ig.insert(ignore_permissions=True)
        frappe.db.commit()

    return full_name


# ────────────────────────────────────────────────────────────────
# 4.  QUICK-ENTRY PARSER
# ────────────────────────────────────────────────────────────────

# Capacity aliases (lowercase → canonical)
_CAPACITY_ALIASES = {
    "120gb": "120GB", "128gb": "128GB", "240gb": "240GB", "256gb": "256GB",
    "480gb": "480GB", "500gb": "500GB", "512gb": "512GB",
    "1tb": "1TB", "2tb": "2TB", "4tb": "4TB", "8tb": "8TB",
    "2gb": "2GB", "4gb": "4GB", "8gb": "8GB", "16gb": "16GB",
    "32gb": "32GB", "64gb": "64GB",
    "350w": "350W", "450w": "450W", "500w": "500W", "550w": "550W",
    "600w": "600W", "650w": "650W", "750w": "750W", "850w": "850W",
}

# Grade aliases (lowercase → canonical)
_GRADE_ALIASES = {
    "new": "New", "pulled": "Pulled", "pull": "Pulled",
    "a": "A", "agrade": "A", "a-grade": "A",
    "b": "B", "bgrade": "B", "b-grade": "B",
    "c": "C", "cgrade": "C", "c-grade": "C",
    "refurb": "Refurbished", "refurbished": "Refurbished",
}

# Category aliases (lowercase token → canonical)
_CATEGORY_ALIASES = {
    "ssd": "SSD", "hdd": "HDD", "hard disk": "HDD",
    "ram": "RAM", "memory": "RAM",
    "gpu": "GPU", "vga": "GPU", "graphics": "GPU",
    "cpu": "CPU", "processor": "CPU",
    "mb": "Motherboard", "mobo": "Motherboard", "motherboard": "Motherboard",
    "psu": "Power Supply", "powersupply": "Power Supply",
}


def _tokenize(text):
    return text.lower().split()


@frappe.whitelist()
def parse_quick_entry(text, company=None):
    """Parse a free-text quick-entry line into structured fields.

    Grammar (order-tolerant):
        <capacity>  <grade>  <qty>  <rate>

    Examples:
        "1tb pulled 5 300"
        "pulled 1tb 10 250"
        "2tb new 3 500"
        "8gb ddr4 pulled 20 150"

    Returns:
        {
            "capacity": str,
            "grade": str,
            "category": str | None,
            "form_factor": str | None,
            "qty": float,
            "rate": float,
            "resolved_item": {item_code, item_name} | None,
            "warnings": [str],
        }
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    tokens = _tokenize(text.strip())
    warnings = []
    capacity = None
    grade = None
    category = None
    form_factor = None
    numbers = []

    remaining = []
    for tok in tokens:
        if tok in _CAPACITY_ALIASES:
            capacity = _CAPACITY_ALIASES[tok]
        elif tok in _GRADE_ALIASES:
            grade = _GRADE_ALIASES[tok]
        elif tok in _CATEGORY_ALIASES:
            category = _CATEGORY_ALIASES[tok]
        else:
            try:
                numbers.append(flt(tok))
            except Exception:
                remaining.append(tok)

    qty = numbers[0] if len(numbers) >= 1 else None
    rate = numbers[1] if len(numbers) >= 2 else None

    if not capacity:
        warnings.append("Capacity not detected — please select from picker.")
    if not grade:
        warnings.append("Grade not detected — defaulting to 'Pulled'. Please confirm.")
        grade = "Pulled"
    if qty is None:
        warnings.append("Quantity not detected — please enter manually.")
    if rate is None:
        warnings.append("Rate not detected — please enter manually.")

    # Try to infer category from capacity (storage items → SSD by default)
    if not category and capacity:
        cap_upper = capacity.upper()
        if "W" in cap_upper:
            category = "Power Supply"
        elif any(x in cap_upper for x in ["TB", "GB"]):
            # Storage if not otherwise tagged — default SSD
            category = "SSD"

    # Try to resolve an existing item
    resolved_item = None
    if capacity and grade and category:
        # Look for any form factor in this category that has a matching item
        match = frappe.db.get_value(
            "Item",
            {
                "trader_component_item": 1,
                "trader_component_category": category,
                "trader_component_capacity": capacity,
                "trader_component_grade": grade,
            },
            ["name", "item_name"],
            as_dict=True,
        )
        if match:
            resolved_item = {"item_code": match.name, "item_name": match.item_name}
            # Auto-fill rate from item if not provided
            if rate is None:
                rate = flt(frappe.db.get_value("Item", match.name, "standard_rate") or 0)
        else:
            warnings.append(
                f"No existing item for {category} {capacity} {grade}. "
                "Use 'Create SKU' or select form factor to create."
            )

    return {
        "capacity": capacity,
        "grade": grade,
        "category": category,
        "form_factor": form_factor,
        "qty": qty,
        "rate": rate,
        "resolved_item": resolved_item,
        "warnings": warnings,
        "remaining_tokens": remaining,
    }


# ────────────────────────────────────────────────────────────────
# 5.  OPENING STOCK IMPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def import_opening_stock(items, warehouse=None, company=None):
    """Import opening stock as a single Material Receipt Stock Entry.

    items: JSON list of {item_code, qty, rate, warehouse?}
    All items are committed in one atomic Stock Entry (draft → submit).
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        frappe.throw(_("No items provided for opening stock import."))

    if not warehouse:
        # Fall back to first warehouse for this company
        warehouse = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0}, "name")
    if not warehouse:
        frappe.throw(_("No warehouse found for company {0}.").format(company))

    doc = frappe.new_doc("Stock Entry")
    doc.stock_entry_type = "Material Receipt"
    doc.company = company
    doc.posting_date = nowdate()
    doc.remarks = "Opening stock import — Components Trading feature"

    for item in items:
        item_code = item.get("item_code")
        qty = flt(item.get("qty") or 0)
        rate = flt(item.get("rate") or 0)
        wh = item.get("warehouse") or warehouse

        if not item_code or qty <= 0:
            continue

        if not frappe.db.exists("Item", item_code):
            frappe.throw(_("Item {0} does not exist.").format(item_code))

        doc.append("items", {
            "item_code": item_code,
            "qty": qty,
            "basic_rate": rate,
            "t_warehouse": wh,
        })

    if not doc.items:
        frappe.throw(_("No valid items to import."))

    doc.insert(ignore_permissions=False)
    doc.submit()
    frappe.db.commit()

    return {"ok": True, "stock_entry": doc.name, "items_imported": len(doc.items)}


# ────────────────────────────────────────────────────────────────
# 6.  STOCK TAKE
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_stock_take_items(company=None, warehouse=None, category=None,
                         page=1, page_size=50):
    """Return component items with current perpetual qty for stock-take entry."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    page = cint(page) or 1
    page_size = min(cint(page_size) or 50, 200)
    offset = (page - 1) * page_size

    wh_condition = ""
    params = {"company": company}

    if warehouse:
        wh_condition = "AND b.warehouse = %(warehouse)s"
        params["warehouse"] = warehouse

    cat_condition = ""
    if category:
        cat_condition = "AND i.trader_component_category = %(category)s"
        params["category"] = category

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT i.item_code)
        FROM `tabItem` i
        INNER JOIN `tabBin` b ON b.item_code = i.item_code
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s
        WHERE i.trader_component_item = 1 AND i.disabled = 0
        {wh_condition} {cat_condition}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT
            i.item_code, i.item_name,
            i.trader_component_category AS category,
            i.trader_component_capacity AS capacity,
            i.trader_component_grade AS grade,
            i.stock_uom,
            SUM(b.actual_qty) AS system_qty,
            b.warehouse,
            CASE WHEN SUM(b.actual_qty) > 0
                 THEN SUM(b.stock_value) / SUM(b.actual_qty)
                 ELSE 0 END AS valuation_rate
        FROM `tabItem` i
        INNER JOIN `tabBin` b ON b.item_code = i.item_code
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s
        WHERE i.trader_component_item = 1 AND i.disabled = 0
        {wh_condition} {cat_condition}
        GROUP BY i.item_code, b.warehouse
        ORDER BY i.trader_component_category, i.trader_component_capacity
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


@frappe.whitelist()
def create_stock_take(items, warehouse=None, company=None):
    """Post a Stock Reconciliation from counted quantities.

    items: JSON list of {item_code, counted_qty, warehouse?}
    Posts only rows where counted_qty differs from system_qty.
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        frappe.throw(_("No items provided for stock take."))

    if not warehouse:
        warehouse = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0}, "name")

    doc = frappe.new_doc("Stock Reconciliation")
    doc.company = company
    doc.posting_date = nowdate()
    doc.posting_time = now_datetime().strftime("%H:%M:%S")
    doc.purpose = "Stock Reconciliation"
    doc.remarks = "Stock-take — Components Trading"

    adjusted = 0
    for item in items:
        item_code = item.get("item_code")
        counted_qty = flt(item.get("counted_qty"))
        wh = item.get("warehouse") or warehouse

        if not item_code:
            continue

        # Get current system qty
        current_qty = flt(
            frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": wh}, "actual_qty") or 0
        )
        # Only include rows with a difference
        if abs(counted_qty - current_qty) < 0.001:
            continue

        # Get current valuation rate
        val_rate = flt(
            frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": wh}, "valuation_rate") or 0
        )

        doc.append("items", {
            "item_code": item_code,
            "warehouse": wh,
            "qty": counted_qty,
            "valuation_rate": val_rate,
        })
        adjusted += 1

    if not doc.items:
        return {"ok": True, "message": "No variance found — system quantities match counts.", "adjusted": 0}

    doc.insert(ignore_permissions=False)
    doc.submit()
    frappe.db.commit()

    return {
        "ok": True,
        "stock_reconciliation": doc.name,
        "adjusted": adjusted,
    }
