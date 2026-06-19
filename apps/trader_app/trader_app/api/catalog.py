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

def _merge_list(base, extra):
    seen = set()
    merged = []
    for value in list(base or []) + list(extra or []):
        if not value:
            continue
        key = str(value).strip()
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(key)
    return merged


def _load_company_taxonomy(company):
    """Parse company-specific taxonomy JSON."""
    if not company or not frappe.db.has_column("Company", "trader_sku_taxonomy"):
        return {}
    raw = frappe.db.get_value("Company", company, "trader_sku_taxonomy") or ""
    raw = (raw or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}
    normalised = {}
    for category, spec in data.items():
        cat = (category or "").strip()
        if not cat or not isinstance(spec, dict):
            continue
        normalised[cat] = {
            "form_factors": list(spec.get("form_factors") or []),
            "capacities": list(spec.get("capacities") or []),
            "grades": list(spec.get("grades") or []),
        }
    return normalised


def _merge_taxonomy_specs(base_spec, overlay_spec):
    """Merge two category specs."""
    return {
        "form_factors": _merge_list(
            base_spec.get("form_factors") or [],
            overlay_spec.get("form_factors") or [],
        ),
        "capacities": _merge_list(
            base_spec.get("capacities") or [],
            overlay_spec.get("capacities") or [],
        ),
        "grades": _merge_list(
            base_spec.get("grades") or [],
            overlay_spec.get("grades") or [],
        ),
    }


def _merged_taxonomy(company=None):
    """Seed + company JSON + distinct attribute values from items."""
    merged = {}
    for category, spec in TAXONOMY.items():
        merged[category] = {
            "form_factors": list(spec.get("form_factors") or []),
            "capacities": list(spec.get("capacities") or []),
            "grades": list(spec.get("grades") or []),
        }

    if company:
        company_tax = _load_company_taxonomy(company)
        for category, spec in company_tax.items():
            if category not in merged:
                merged[category] = {"form_factors": [], "capacities": [], "grades": []}
            merged[category] = _merge_taxonomy_specs(merged[category], spec)

    if not frappe.db.has_column("Item", "trader_component_item"):
        return merged

    rows = frappe.db.sql("""
        SELECT
            trader_component_category AS category,
            trader_component_form_factor AS form_factor,
            trader_component_capacity AS capacity,
            trader_component_grade AS grade
        FROM `tabItem`
        WHERE trader_component_item = 1
          AND disabled = 0
          AND trader_component_category IS NOT NULL
          AND trader_component_category != ''
    """, as_dict=True)

    for row in rows:
        category = row.category
        if category not in merged:
            merged[category] = {"form_factors": [], "capacities": [], "grades": []}
        spec = merged[category]
        if row.form_factor:
            spec["form_factors"] = _merge_list(spec["form_factors"], [row.form_factor])
        if row.capacity:
            spec["capacities"] = _merge_list(spec["capacities"], [row.capacity])
        if row.grade:
            spec["grades"] = _merge_list(spec["grades"], [row.grade])

    for spec in merged.values():
        spec["form_factors"] = sorted(spec["form_factors"])
        spec["capacities"] = sorted(spec["capacities"], key=lambda v: (len(v), v))
        spec["grades"] = sorted(spec["grades"])

    return merged


@frappe.whitelist()
def get_taxonomy(company=None):
    """Return merged SKU attribute taxonomy for the company."""
    company = resolve_active_company(company)
    taxonomy = _merged_taxonomy(company)
    return {
        "taxonomy": taxonomy,
        "categories": sorted(taxonomy.keys()),
        "template": "components",
        "dimensions": [
            {"key": "category", "label": "Category"},
            {"key": "form_factor", "label": "Form Factor"},
            {"key": "capacity", "label": "Capacity"},
            {"key": "grade", "label": "Grade / Variant"},
        ],
    }


@frappe.whitelist()
def save_sku_taxonomy(taxonomy, company=None):
    """Persist company-specific taxonomy overlay (Trader Admin). Merges into Company JSON field."""
    company = resolve_active_company(company)
    frappe.only_for(("Trader Admin", "System Manager", "Administrator"))

    if isinstance(taxonomy, str):
        taxonomy = json.loads(taxonomy)
    if not isinstance(taxonomy, dict):
        frappe.throw(_("taxonomy must be a JSON object keyed by category name."))

    if not frappe.db.has_column("Company", "trader_sku_taxonomy"):
        frappe.throw(_("SKU taxonomy field is not installed. Run custom field setup."))

    frappe.db.set_value(
        "Company", company, "trader_sku_taxonomy",
        json.dumps(taxonomy, indent=0),
    )
    frappe.db.commit()
    return {"ok": True, "company": company, "categories": sorted(_merged_taxonomy(company).keys())}


@frappe.whitelist()
def resolve_item(item_code=None, barcode=None, template=None,
                 category=None, form_factor=None, capacity=None, grade=None,
                 item_name=None, item_group=None, stock_uom=None,
                 standard_rate=0, has_serial_no=0, company=None):
    """Universal item resolver — pick existing or create on the go.

    Resolution order:
    1. ``barcode`` — lookup via inventory barcode API
    2. ``template='components'`` or all four component attrs — find_or_create_sku
    3. ``item_code`` existing — return as-is
    4. ``item_code`` + ``item_name`` — create generic item
    """
    company = resolve_active_company(company)
    template = (template or "").strip().lower()

    barcode = (barcode or "").strip()
    if barcode:
        from trader_app.api.inventory import lookup_item_by_barcode
        result = lookup_item_by_barcode(barcode, company=company)
        if result.get("found") and result.get("item"):
            item = result["item"]
            return {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "created": False,
                "template": "barcode",
                "item": item,
            }
        frappe.throw(result.get("message") or _("No item found for barcode {0}.").format(barcode))

    if template == "components" or all([
        (category or "").strip(),
        (form_factor or "").strip(),
        (capacity or "").strip(),
        (grade or "").strip(),
    ]):
        _assert_enabled(company)
        sku = find_or_create_sku(
            category, form_factor, capacity, grade,
            standard_rate=standard_rate, company=company,
        )
        item_name_val = _make_item_name(category, form_factor, capacity, grade)
        return {
            "item_code": sku["item_code"],
            "item_name": item_name_val,
            "created": sku.get("created", False),
            "template": "components",
        }

    item_code = (item_code or "").strip()
    if item_code and frappe.db.exists("Item", item_code):
        name = frappe.db.get_value("Item", item_code, "item_name") or item_code
        return {
            "item_code": item_code,
            "item_name": name,
            "created": False,
            "template": "existing",
        }

    if item_code:
        from trader_app.api.inventory import create_item
        created = create_item(
            item_code=item_code,
            item_name=item_name or item_code,
            item_group=item_group,
            stock_uom=stock_uom,
            has_serial_no=has_serial_no,
        )
        return {
            "item_code": created["item_code"],
            "item_name": created.get("item_name") or item_code,
            "created": True,
            "template": "generic",
        }

    frappe.throw(_("Provide item_code, barcode, or component attributes to resolve an item."))


@frappe.whitelist()
def ensure_taxonomy_values(category, form_factor=None, capacity=None, grade=None, company=None):
    """Persist newly typed attribute values into the company taxonomy overlay."""
    company = resolve_active_company(company)
    category = (category or "").strip()
    if not category:
        frappe.throw(_("Category is required."))

    if not frappe.db.has_column("Company", "trader_sku_taxonomy"):
        return {"ok": True, "skipped": True}

    overlay = _load_company_taxonomy(company)
    if category not in overlay:
        overlay[category] = {"form_factors": [], "capacities": [], "grades": []}
    spec = overlay[category]

    if (form_factor or "").strip():
        spec["form_factors"] = _merge_list(spec["form_factors"], [form_factor.strip()])
    if (capacity or "").strip():
        spec["capacities"] = _merge_list(spec["capacities"], [capacity.strip()])
    if (grade or "").strip():
        spec["grades"] = _merge_list(spec["grades"], [grade.strip()])

    frappe.db.set_value(
        "Company", company, "trader_sku_taxonomy",
        json.dumps(overlay, indent=0),
    )
    frappe.db.commit()
    return {"ok": True, "category": category}


BUILTIN_SKU_TEMPLATES = {
    "generic": {
        "id": "generic",
        "label": "Generic inventory item",
        "resolver": "generic",
        "dimensions": [],
    },
    "components": {
        "id": "components",
        "label": "Structured components (4-axis SKU)",
        "resolver": "components",
        "dimensions": [
            {"key": "category", "label": "Category", "taxonomy_field": "categories"},
            {"key": "form_factor", "label": "Form Factor", "taxonomy_field": "form_factors"},
            {"key": "capacity", "label": "Capacity", "taxonomy_field": "capacities"},
            {"key": "grade", "label": "Grade / Variant", "taxonomy_field": "grades"},
        ],
    },
}


def _load_item_group_templates(company):
    if not company or not frappe.db.has_column("Company", "trader_item_group_templates"):
        return {}
    raw = (frappe.db.get_value("Company", company, "trader_item_group_templates") or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _load_custom_sku_templates(company):
    if not company or not frappe.db.has_column("Company", "trader_custom_sku_templates"):
        return {}
    raw = (frappe.db.get_value("Company", company, "trader_custom_sku_templates") or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _effective_templates(company):
    templates = dict(BUILTIN_SKU_TEMPLATES)
    custom = _load_custom_sku_templates(company)
    for tid, spec in custom.items():
        if not isinstance(spec, dict):
            continue
        templates[tid] = {
            "id": tid,
            "label": spec.get("label") or tid,
            "resolver": spec.get("resolver") or "generic",
            "dimensions": list(spec.get("dimensions") or []),
        }
    return templates


def _effective_item_group_map(company, taxonomy):
    """Item group name → template id."""
    explicit = _load_item_group_templates(company)
    merged = {}
    for cat in taxonomy.keys():
        merged[cat] = explicit.get(cat) or explicit.get(cat.strip()) or "components"
    merged.update(explicit)
    if "*" not in merged:
        merged["*"] = explicit.get("*", "generic")
    return merged


def _template_for_item_group(item_group, company, taxonomy=None):
    taxonomy = taxonomy if taxonomy is not None else _merged_taxonomy(company)
    group_map = _effective_item_group_map(company, taxonomy)
    if item_group and item_group in group_map:
        return group_map[item_group]
    if item_group:
        for key, tid in group_map.items():
            if key != "*" and key.lower() == item_group.lower():
                return tid
    return group_map.get("*", "generic")


@frappe.whitelist()
def get_item_line_config(company=None, item_group=None):
    """Unified config for ItemLineEntry: templates, group map, taxonomy."""
    company = resolve_active_company(company)
    taxonomy = _merged_taxonomy(company)
    templates = _effective_templates(company)
    item_group_templates = _effective_item_group_map(company, taxonomy)
    active_template = _template_for_item_group(item_group, company, taxonomy) if item_group else None
    return {
        "templates": templates,
        "item_group_templates": item_group_templates,
        "taxonomy": taxonomy,
        "categories": sorted(taxonomy.keys()),
        "active_template": active_template,
        "default_template": item_group_templates.get("*", "generic"),
    }


@frappe.whitelist()
def save_item_group_templates(mapping, company=None):
    """Persist item group → template id map (Trader Admin)."""
    company = resolve_active_company(company)
    frappe.only_for(("Trader Admin", "System Manager", "Administrator"))
    if isinstance(mapping, str):
        mapping = json.loads(mapping)
    if not isinstance(mapping, dict):
        frappe.throw(_("mapping must be a JSON object."))
    if not frappe.db.has_column("Company", "trader_item_group_templates"):
        frappe.throw(_("Item group template field is not installed."))
    frappe.db.set_value(
        "Company", company, "trader_item_group_templates",
        json.dumps(mapping, indent=0),
    )
    frappe.db.commit()
    return {"ok": True, "company": company}


@frappe.whitelist()
def save_custom_sku_templates(templates, company=None):
    """Persist custom SKU template definitions (Trader Admin)."""
    company = resolve_active_company(company)
    frappe.only_for(("Trader Admin", "System Manager", "Administrator"))
    if isinstance(templates, str):
        templates = json.loads(templates)
    if not isinstance(templates, dict):
        frappe.throw(_("templates must be a JSON object."))
    if not frappe.db.has_column("Company", "trader_custom_sku_templates"):
        frappe.throw(_("Custom SKU templates field is not installed."))
    frappe.db.set_value(
        "Company", company, "trader_custom_sku_templates",
        json.dumps(templates, indent=0),
    )
    frappe.db.commit()
    return {"ok": True, "company": company}


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
