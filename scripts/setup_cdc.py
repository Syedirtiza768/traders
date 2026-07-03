# -*- coding: utf-8 -*-
"""
CDC Company Setup Script
========================
Creates the CDC company with all master data, opening stock, parties,
and opening balances from the stock_valuation_cash_workbook.xlsx.

Run via:  docker exec compose-backend-1 bash -c \
            "cd /home/frappe/frappe-bench && bench --site trader.localhost execute trader_app.setup_cdc.run"
"""

from __future__ import unicode_literals
import json
import frappe
from frappe.utils import flt, cint, nowdate, getdate


# ──────────────────────────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────────────────────────

COMPANY_NAME = "CDC"
COMPANY_ABBR = "CDC"
COUNTRY = "United Arab Emirates"
CURRENCY = "AED"
TIMEZONE = "Asia/Dubai"
FISCAL_YEAR = "2026-2027"
FY_START = "2026-07-01"
FY_END = "2027-06-30"

ADMIN_EMAIL = "moeez@cdc.ae"
ADMIN_FIRST = "Moeez"
ADMIN_LAST = ""
ADMIN_PASS = "CDC@2026!"

TENANT_NAME = "CDC"

# ──────────────────────────────────────────────────────────────────────────────
# STOCK DATA  (from workbook: Stock Detail sheet)
# (category, form_factor, capacity, grade, qty, rate)
# ──────────────────────────────────────────────────────────────────────────────

STOCK_LINES = [
    # RAM - Desktop
    ("RAM", "Desktop", "4GB PC3", "", 122, 11),
    ("RAM", "Desktop", "2GB PC3", "", 67, 3),
    ("RAM", "Desktop", "8GB PC3", "", 35, 28),
    ("RAM", "Desktop", "4GB PC4", "", 39, 40),
    ("RAM", "Desktop", "8GB PC4", "", 15, 80),
    ("RAM", "Desktop", "16GB PC4", "", 7, 150),
    # RAM - Laptop
    ("RAM", "Laptop", "4GB PC3", "", 63, 9),
    ("RAM", "Laptop", "4GB PC3L", "", 153, 10),
    ("RAM", "Laptop", "8GB PC3", "", 73, 22),
    ("RAM", "Laptop", "8GB PC3L", "", 249, 27),
    ("RAM", "Laptop", "8GB PC4", "", 113, 80),
    ("RAM", "Laptop", "16GB PC4", "", 91, 145),
    ("RAM", "Laptop", "4GB PC4", "", 18, 40),
    ("RAM", "Laptop", "32GB PC4", "", 18, 290),
    # HDD - Desktop
    ("HDD", "Desktop", "250GB", "", 120, 8),
    ("HDD", "Desktop", "320GB", "", 218, 13),
    ("HDD", "Desktop", "500GB", "", 465, 23.5),
    ("HDD", "Desktop", "1TB", "", 443, 83),
    ("HDD", "Desktop", "2TB", "", 282, 125),
    ("HDD", "Desktop", "3TB", "", 54, 125),
    ("HDD", "Desktop", "4TB", "", 86, 250),
    ("HDD", "Desktop", "6TB", "", 33, 350),
    ("HDD", "Desktop", "8TB", "", 42, 720),
    ("HDD", "Desktop", "10TB", "", 6, 810),
    ("HDD", "Desktop", "12TB", "", 3, 850),
    ("HDD", "Desktop", "16TB", "", 1, 1000),
    # HDD - Laptop
    ("HDD", "Laptop", "160GB", "", 62, 5.5),
    ("HDD", "Laptop", "250GB", "", 69, 11),
    ("HDD", "Laptop", "320GB", "", 371, 5.5),
    ("HDD", "Laptop", "500GB", "Slim", 112, 29),
    ("HDD", "Laptop", "500GB", "Fat", 85, 28),
    ("HDD", "Laptop", "1TB", "Slim", 4, 78),
    ("HDD", "Laptop", "1TB", "Fat", 1, 78),
    ("HDD", "Laptop", "2TB", "", 1, 130),
    # HDD - Extra Fat
    ("HDD", "Extra Fat", "2TB", "", 6, 55),
    ("HDD", "Extra Fat", "1TB", "", 20, 38),
    ("HDD", "Extra Fat", "500GB", "", 18, 9),
    ("HDD", "Extra Fat", "4TB", "", 17, 130),
    # SSD - M.2
    ("SSD", "M.2", "128GB", "", 81, 31),
    ("SSD", "M.2", "256GB", "", 97, 77),
    ("SSD", "M.2", "256GB", "China", 52, 60),
    ("SSD", "M.2", "512GB", "", 30, 125),
    ("SSD", "M.2", "512GB", "China", 4, 100),
    ("SSD", "M.2", "960GB", "", 7, 200),
    ("SSD", "M.2", "1TB", "", 5, 350),
    ("SSD", "M.2", "1TB", "China", 6, 220),
    ("SSD", "M.2", "2TB", "", 6, 380),
    # SSD - M1
    ("SSD", "M1", "128GB", "", 140, 22),
    ("SSD", "M1", "256GB", "", 42, 65),
    ("SSD", "M1", "512GB", "", 24, 100),
    # SSD - 2.5 inch
    ("SSD", "2.5 inch", "120GB", "", 24, 35),
    ("SSD", "2.5 inch", "128GB", "", 79, 37),
    ("SSD", "2.5 inch", "240GB", "", 30, 65),
    ("SSD", "2.5 inch", "256GB", "", 146, 73),
    ("SSD", "2.5 inch", "480GB", "", 29, 100),
    ("SSD", "2.5 inch Pulled", "512GB", "", 98, 127),
    ("SSD", "2.5 inch China", "512GB", "", 15, 100),
    ("SSD", "2.5 inch", "1TB", "", 5, 220),
    ("SSD", "2.5 inch", "2TB", "", 1, 280),
    ("SSD", "2.5 inch", "4TB", "", 1, 500),
    ("SSD", "2.5 inch", "400GB", "", 2, 80),
]

# ──────────────────────────────────────────────────────────────────────────────
# PAYMENT DATA  (from workbook: Payments & Cash sheet)
# ──────────────────────────────────────────────────────────────────────────────

CASH_IN_HAND = 25500.0

INCOMING_PARTIES = [
    ("Anees", 5550),
    ("Ijaz Zaki", 2000),
    ("Bilal Shams", 4505),
    ("Anees Mamu", 3539),
    ("Nabeel", 1665),
    ("A7", 590),
    ("C3", 530),
    ("Sikandar", 2268),
    ("H3", 115),
]

OUTGOING_PARTIES = [
    ("Tahir", 32000),
    ("Ahmed RFJaz", 927),
    ("DL - Muzammil", 450),
]


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────

def run():
    """Entry point — call via bench execute."""
    frappe.connect()
    frappe.flags.in_setup_wizard = False

    steps = [
        ("Company", _create_company),
        ("Fiscal Year", _ensure_fiscal_year),
        ("Warehouses", _create_warehouses),
        ("Chart of Accounts extras", _ensure_accounts),
        ("Payment Modes", _ensure_payment_modes),
        ("Tenant", _create_tenant),
        ("Admin User", _create_admin_user),
        ("Components Feature", _enable_components),
        ("Walk-in Customer", _create_walkin_customer),
        ("Taxonomy Extension", _extend_taxonomy),
        ("Component Items", _create_items),
        ("Opening Stock", _import_opening_stock),
        ("Customers with Opening Balances", _create_customers),
        ("Suppliers with Opening Balances", _create_suppliers),
        ("Opening Cash Balance", _record_opening_cash),
        ("Defaults", _set_defaults),
    ]

    for label, fn in steps:
        print(f"\n{'='*60}")
        print(f"  {label}")
        print(f"{'='*60}")
        try:
            fn()
            frappe.db.commit()
            print(f"  ✓ {label} — done")
        except Exception as e:
            frappe.db.rollback()
            print(f"  ✗ {label} — FAILED: {e}")
            import traceback
            traceback.print_exc()
            raise

    print(f"\n{'='*60}")
    print("  CDC SETUP COMPLETE")
    print(f"{'='*60}")
    print(f"  Company:    {COMPANY_NAME}")
    print(f"  Currency:   {CURRENCY}")
    print(f"  Admin:      {ADMIN_EMAIL} / {ADMIN_PASS}")
    print(f"  Items:      {len(STOCK_LINES)} SKUs")
    print(f"  Customers:  {len(INCOMING_PARTIES)} + Walk-in")
    print(f"  Suppliers:  {len(OUTGOING_PARTIES)}")
    print(f"  Cash:       {CASH_IN_HAND:,.2f} {CURRENCY}")
    print(f"{'='*60}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: COMPANY
# ──────────────────────────────────────────────────────────────────────────────

def _create_company():
    if frappe.db.exists("Company", COMPANY_NAME):
        print(f"  Company '{COMPANY_NAME}' already exists — skipping creation.")
        return

    # Ensure Warehouse Type 'Transit' exists (required by ERPNext)
    if not frappe.db.exists("Warehouse Type", "Transit"):
        frappe.get_doc({"doctype": "Warehouse Type", "name": "Transit"}).insert(ignore_permissions=True)
        frappe.db.commit()

    doc = frappe.get_doc({
        "doctype": "Company",
        "company_name": COMPANY_NAME,
        "abbr": COMPANY_ABBR,
        "country": COUNTRY,
        "default_currency": CURRENCY,
        "chart_of_accounts": "Standard",
        "enable_perpetual_inventory": 1,
    })
    doc.insert(ignore_permissions=True)
    print(f"  Created company: {COMPANY_NAME} ({CURRENCY}, {COUNTRY})")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: FISCAL YEAR
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_fiscal_year():
    if frappe.db.exists("Fiscal Year", FISCAL_YEAR):
        fy = frappe.get_doc("Fiscal Year", FISCAL_YEAR)
        linked = [c.company for c in fy.companies]
        if COMPANY_NAME not in linked:
            fy.append("companies", {"company": COMPANY_NAME})
            fy.save(ignore_permissions=True)
            print(f"  Linked {COMPANY_NAME} to existing FY {FISCAL_YEAR}")
        else:
            print(f"  FY {FISCAL_YEAR} already linked to {COMPANY_NAME}")
        return

    fy = frappe.get_doc({
        "doctype": "Fiscal Year",
        "year": FISCAL_YEAR,
        "year_start_date": FY_START,
        "year_end_date": FY_END,
        "companies": [{"company": COMPANY_NAME}],
    })
    fy.insert(ignore_permissions=True)
    print(f"  Created Fiscal Year: {FISCAL_YEAR} ({FY_START} to {FY_END})")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: WAREHOUSES
# ──────────────────────────────────────────────────────────────────────────────

def _create_warehouses():
    warehouses = ["Main Warehouse", "Retail Warehouse"]
    for wh_name in warehouses:
        full_name = f"{wh_name} - {COMPANY_ABBR}"
        if frappe.db.exists("Warehouse", full_name):
            print(f"  Warehouse '{full_name}' already exists")
            continue
        doc = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": wh_name,
            "company": COMPANY_NAME,
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created warehouse: {full_name}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: CHART OF ACCOUNTS EXTRAS (Cash, Bank, Opening Balance Equity)
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_accounts():
    abbr = COMPANY_ABBR

    # Ensure Cash account exists and has account_type=Cash
    cash_acct = f"Cash - {abbr}"
    if frappe.db.exists("Account", cash_acct):
        frappe.db.set_value("Account", cash_acct, "account_type", "Cash", update_modified=False)
        print(f"  Cash account exists: {cash_acct}")
    else:
        # Find parent
        parent = frappe.db.get_value("Account",
            {"company": COMPANY_NAME, "account_name": "Cash", "is_group": 1}, "name")
        if not parent:
            parent = frappe.db.get_value("Account",
                {"company": COMPANY_NAME, "root_type": "Asset", "is_group": 1,
                 "account_name": ["like", "%Cash%"]}, "name")
        if not parent:
            parent = frappe.db.get_value("Account",
                {"company": COMPANY_NAME, "root_type": "Asset", "is_group": 1}, "name")

        doc = frappe.get_doc({
            "doctype": "Account",
            "account_name": "Cash",
            "company": COMPANY_NAME,
            "parent_account": parent,
            "account_type": "Cash",
            "root_type": "Asset",
            "is_group": 0,
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created Cash account: {cash_acct}")

    # Ensure Opening Balance Equity account
    obe = f"Opening Balance Equity - {abbr}"
    if not frappe.db.exists("Account", obe):
        # Find Equity parent
        equity_parent = frappe.db.get_value("Account",
            {"company": COMPANY_NAME, "root_type": "Equity", "is_group": 1,
             "account_name": ["like", "%Equity%"]}, "name")
        if not equity_parent:
            equity_parent = frappe.db.get_value("Account",
                {"company": COMPANY_NAME, "root_type": "Equity", "is_group": 1}, "name")

        doc = frappe.get_doc({
            "doctype": "Account",
            "account_name": "Opening Balance Equity",
            "company": COMPANY_NAME,
            "parent_account": equity_parent,
            "root_type": "Equity",
            "is_group": 0,
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created Opening Balance Equity account: {obe}")
    else:
        print(f"  Opening Balance Equity account exists: {obe}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 5: PAYMENT MODES
# ──────────────────────────────────────────────────────────────────────────────

def _ensure_payment_modes():
    modes = ["Cash", "Cheque", "Bank Draft", "Wire Transfer", "Credit Card"]
    for mode_name in modes:
        if frappe.db.exists("Mode of Payment", mode_name):
            continue
        doc = frappe.get_doc({
            "doctype": "Mode of Payment",
            "mode_of_payment": mode_name,
            "type": "Cash" if mode_name == "Cash" else "Bank",
            "enabled": 1,
        })
        doc.insert(ignore_permissions=True)
        print(f"  Created payment mode: {mode_name}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 6: TENANT
# ──────────────────────────────────────────────────────────────────────────────

def _create_tenant():
    if frappe.db.exists("Trader Tenant", {"tenant_name": TENANT_NAME}):
        print(f"  Tenant '{TENANT_NAME}' already exists — skipping")
        return

    module_rows = [
        {"module_key": "dashboard", "enabled": 1},
        {"module_key": "sales", "enabled": 1},
        {"module_key": "purchases", "enabled": 1},
        {"module_key": "inventory", "enabled": 1},
        {"module_key": "finance", "enabled": 1},
        {"module_key": "reports", "enabled": 1},
        {"module_key": "customers", "enabled": 1},
        {"module_key": "suppliers", "enabled": 1},
        {"module_key": "operations", "enabled": 1},
        {"module_key": "components", "enabled": 1},
        {"module_key": "pos", "enabled": 1},
        {"module_key": "settings", "enabled": 1},
    ]

    tenant = frappe.get_doc({
        "doctype": "Trader Tenant",
        "tenant_name": TENANT_NAME,
        "status": "Active",
        "company": COMPANY_NAME,
        "subscription_plan": "Professional",
        "billing_status": "Active",
        "max_users": 25,
        "timezone": TIMEZONE,
        "contact_email": ADMIN_EMAIL,
        "branding": {
            "primaryColor": "#1e40af",
            "accentColor": "#3b82f6",
            "appName": "CDC Trading",
            "tagline": "Computer Components & Storage Solutions",
        },
        "created_by_admin": "Administrator",
        "enabled_modules": module_rows,
    })
    tenant.insert(ignore_permissions=True)

    # Link company to tenant
    frappe.db.set_value("Company", COMPANY_NAME, "trader_tenant", tenant.name, update_modified=False)

    # Sync module flags to company custom fields
    from trader_app.api.tenant import sync_tenant_modules_to_company
    sync_tenant_modules_to_company(tenant.name)

    print(f"  Created tenant: {tenant.name} ({TENANT_NAME})")
    print(f"  All 12 modules enabled (including components)")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 7: ADMIN USER
# ──────────────────────────────────────────────────────────────────────────────

def _create_admin_user():
    if frappe.db.exists("User", ADMIN_EMAIL):
        print(f"  User '{ADMIN_EMAIL}' already exists — skipping")
        return

    tenant_name = frappe.db.get_value("Trader Tenant", {"tenant_name": TENANT_NAME}, "name")

    user = frappe.get_doc({
        "doctype": "User",
        "email": ADMIN_EMAIL,
        "first_name": ADMIN_FIRST,
        "last_name": ADMIN_LAST,
        "user_type": "System User",
        "send_welcome_email": 0,
        "new_password": ADMIN_PASS,
        "trader_tenant": tenant_name,
    })
    # Add all relevant roles
    for role in ["Trader Admin", "System Manager", "Sales User", "Purchase User",
                  "Accounts User", "Stock User"]:
        user.append("roles", {"role": role})
    user.insert(ignore_permissions=True)

    # Log the action
    from trader_app.api.tenant import log_tenant_action
    if tenant_name:
        log_tenant_action(tenant_name, "user_added", {"email": ADMIN_EMAIL, "role": "Trader Admin"})

    print(f"  Created admin user: {ADMIN_EMAIL} ({ADMIN_FIRST})")
    print(f"  Password: {ADMIN_PASS}")
    print(f"  Roles: Trader Admin, System Manager, Sales/Purchase/Accounts/Stock User")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 8: ENABLE COMPONENTS FEATURE
# ──────────────────────────────────────────────────────────────────────────────

def _enable_components():
    current = cint(frappe.db.get_value("Company", COMPANY_NAME, "trader_components_enabled") or 0)
    if current:
        print(f"  Components feature already enabled for {COMPANY_NAME}")
        return

    frappe.db.set_value("Company", COMPANY_NAME, "trader_components_enabled", 1, update_modified=False)
    print(f"  Enabled Components Trading feature for {COMPANY_NAME}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 9: WALK-IN CUSTOMER
# ──────────────────────────────────────────────────────────────────────────────

def _get_leaf_customer_group():
    """Get a non-group Customer Group."""
    # Try to find an existing leaf group
    leaf = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
    if leaf:
        return leaf
    # Find the root group dynamically
    root = frappe.db.get_value("Customer Group", {"is_group": 1, "parent_customer_group": ""}, "name")
    if not root:
        root = frappe.db.get_value("Customer Group", {"is_group": 1}, "name") or "All Customer Groups"
    # Create one if none exists
    doc = frappe.get_doc({
        "doctype": "Customer Group",
        "customer_group_name": "Default",
        "parent_customer_group": root,
        "is_group": 0,
    })
    doc.insert(ignore_permissions=True)
    return doc.name


def _get_leaf_territory():
    """Get a non-group Territory."""
    leaf = frappe.db.get_value("Territory", {"is_group": 0}, "name")
    if leaf:
        return leaf
    root = frappe.db.get_value("Territory", {"is_group": 1, "parent_territory": ""}, "name")
    if not root:
        root = frappe.db.get_value("Territory", {"is_group": 1}, "name") or "All Territories"
    doc = frappe.get_doc({
        "doctype": "Territory",
        "territory_name": "Default",
        "parent_territory": root,
        "is_group": 0,
    })
    doc.insert(ignore_permissions=True)
    return doc.name


def _create_walkin_customer():
    if frappe.db.exists("Customer", {"customer_name": "Walk-in Customer"}):
        print(f"  Walk-in Customer already exists")
        return

    doc = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": "Walk-in Customer",
        "customer_type": "Individual",
        "customer_group": _get_leaf_customer_group(),
        "territory": _get_leaf_territory(),
    })
    doc.insert(ignore_permissions=True)
    print(f"  Created Walk-in Customer for POS / cash sales")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 10: EXTEND TAXONOMY
# ──────────────────────────────────────────────────────────────────────────────

def _extend_taxonomy():
    """Add CDC-specific form factors and capacities to the company taxonomy overlay."""
    import json as _json

    existing_raw = (frappe.db.get_value("Company", COMPANY_NAME, "trader_sku_taxonomy") or "").strip()
    overlay = _json.loads(existing_raw) if existing_raw else {}

    # CDC-specific taxonomy extensions
    cdc_taxonomy = {
        "RAM": {
            "form_factors": ["Desktop", "Laptop"],
            "capacities": [
                "2GB PC3", "4GB PC3", "4GB PC3L", "4GB PC4",
                "8GB PC3", "8GB PC3L", "8GB PC4",
                "16GB PC4", "32GB PC4",
            ],
            "grades": ["New"],
        },
        "HDD": {
            "form_factors": ["Desktop", "Laptop", "Extra Fat"],
            "capacities": [
                "160GB", "250GB", "320GB", "500GB", "1TB",
                "2TB", "3TB", "4TB", "6TB", "8TB", "10TB", "12TB", "16TB",
            ],
            "grades": ["New", "Slim", "Fat"],
        },
        "SSD": {
            "form_factors": ["M.2", "M1", "2.5 inch", "2.5 inch Pulled", "2.5 inch China"],
            "capacities": [
                "120GB", "128GB", "240GB", "256GB", "400GB",
                "480GB", "512GB", "960GB", "1TB", "2TB", "4TB",
            ],
            "grades": ["New", "China", "Pulled"],
        },
    }

    # Merge with existing overlay
    for cat, spec in cdc_taxonomy.items():
        if cat not in overlay:
            overlay[cat] = {"form_factors": [], "capacities": [], "grades": []}
        for dim in ["form_factors", "capacities", "grades"]:
            existing_vals = set(overlay[cat].get(dim) or [])
            for val in spec.get(dim) or []:
                if val and val not in existing_vals:
                    overlay[cat].setdefault(dim, []).append(val)

    frappe.db.set_value("Company", COMPANY_NAME, "trader_sku_taxonomy",
                        _json.dumps(overlay, indent=2), update_modified=False)
    print(f"  Extended taxonomy with CDC-specific attributes")
    print(f"  RAM: Desktop/Laptop form factors, PC3/PC3L/PC4 capacities")
    print(f"  HDD: Desktop/Laptop/Extra Fat form factors, Slim/Fat grades")
    print(f"  SSD: M.2/M1/2.5 inch form factors, China/Pulled grades")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 11: CREATE ITEMS
# ──────────────────────────────────────────────────────────────────────────────

def _create_items():
    """Create all 65 component items from the stock data."""
    created = 0
    skipped = 0

    for (cat, ff, cap, grade, qty, rate) in STOCK_LINES:
        # Normalize grade — empty string means no grade variant
        grade_norm = grade.strip() if grade and grade.strip() else "New"

        # Build item code
        def slug(s):
            import re
            return re.sub(r"[^A-Za-z0-9]+", "-", str(s).strip()).strip("-").upper()

        item_code = f"{slug(cat)}-{slug(ff)}-{slug(cap)}-{slug(grade_norm)}"

        # Check if exists
        if frappe.db.exists("Item", item_code):
            skipped += 1
            continue

        # Also check by component metadata
        existing = frappe.db.get_value("Item", {
            "trader_component_item": 1,
            "trader_component_category": cat,
            "trader_component_form_factor": ff,
            "trader_component_capacity": cap,
            "trader_component_grade": grade_norm,
        }, "name")
        if existing:
            skipped += 1
            continue

        # Ensure item group
        item_group = _ensure_item_group(cat)

        doc = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": f"{cat} {ff} {cap} {grade_norm}".strip(),
            "item_group": item_group,
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "standard_rate": flt(rate),
            "valuation_method": "FIFO",
            "trader_component_item": 1,
            "trader_component_category": cat,
            "trader_component_form_factor": ff,
            "trader_component_capacity": cap,
            "trader_component_grade": grade_norm,
        })
        doc.insert(ignore_permissions=True)
        created += 1

    frappe.db.commit()
    print(f"  Created {created} items, {skipped} already existed")


def _ensure_item_group(category):
    """Ensure item group exists under Components parent."""
    parent = "Components"
    if not frappe.db.exists("Item Group", parent):
        pg = frappe.get_doc({
            "doctype": "Item Group",
            "item_group_name": parent,
            "parent_item_group": frappe.db.get_value("Item Group",
                {"parent_item_group": ""}, "name") or "All Item Groups",
            "is_group": 1,
        })
        pg.insert(ignore_permissions=True)

    if not frappe.db.exists("Item Group", category):
        ig = frappe.get_doc({
            "doctype": "Item Group",
            "item_group_name": category,
            "parent_item_group": parent,
            "is_group": 0,
        })
        ig.insert(ignore_permissions=True)

    return category


# ──────────────────────────────────────────────────────────────────────────────
# STEP 12: IMPORT OPENING STOCK
# ──────────────────────────────────────────────────────────────────────────────

def _import_opening_stock():
    """Create a Material Receipt Stock Entry for all opening stock."""
    warehouse = frappe.db.get_value("Warehouse",
        {"company": COMPANY_NAME, "is_group": 0}, "name")
    if not warehouse:
        print("  WARNING: No warehouse found — skipping stock import")
        return

    import re
    def slug(s):
        return re.sub(r"[^A-Za-z0-9]+", "-", str(s).strip()).strip("-").upper()

    items_for_import = []
    for (cat, ff, cap, grade, qty, rate) in STOCK_LINES:
        grade_norm = grade.strip() if grade and grade.strip() else "New"
        item_code = f"{slug(cat)}-{slug(ff)}-{slug(cap)}-{slug(grade_norm)}"

        if not frappe.db.exists("Item", item_code):
            # Try metadata lookup
            item_code = frappe.db.get_value("Item", {
                "trader_component_item": 1,
                "trader_component_category": cat,
                "trader_component_form_factor": ff,
                "trader_component_capacity": cap,
                "trader_component_grade": grade_norm,
            }, "name")
            if not item_code:
                print(f"  WARNING: Item not found for {cat} {ff} {cap} {grade_norm} — skipping")
                continue

        items_for_import.append({
            "item_code": item_code,
            "qty": flt(qty),
            "rate": flt(rate),
        })

    if not items_for_import:
        print("  No items to import — skipping")
        return

    # Create Stock Entry directly (same logic as import_opening_stock)
    doc = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "company": COMPANY_NAME,
        "posting_date": nowdate(),
        "remarks": "CDC Opening Stock Import — from stock_valuation_cash_workbook.xlsx",
    })

    for item in items_for_import:
        item_uom = frappe.db.get_value("Item", item["item_code"], "stock_uom") or "Nos"
        doc.append("items", {
            "item_code": item["item_code"],
            "qty": item["qty"],
            "basic_rate": item["rate"],
            "s_warehouse": warehouse,
            "t_warehouse": warehouse,
            "uom": item_uom,
            "stock_uom": item_uom,
            "conversion_factor": 1.0,
            "allow_zero_valuation_rate": 1,
        })

    doc.insert(ignore_permissions=True)

    # Enable allow_negative_stock in Stock Settings temporarily
    old_neg = frappe.db.get_single_value("Stock Settings", "allow_negative_stock")
    frappe.db.set_value("Stock Settings", "Stock Settings", "allow_negative_stock", 1)
    frappe.db.commit()

    doc.submit()

    # Restore
    frappe.db.set_value("Stock Settings", "Stock Settings", "allow_negative_stock", old_neg or 0)
    frappe.db.commit()

    total_qty = sum(i["qty"] for i in items_for_import)
    total_val = sum(i["qty"] * i["rate"] for i in items_for_import)
    print(f"  Created Material Receipt: {doc.name}")
    print(f"  Imported {len(items_for_import)} items: {total_qty:,.0f} units worth {total_val:,.2f} {CURRENCY}")
    print(f"  Warehouse: {warehouse}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 13: CUSTOMERS WITH OPENING BALANCES
# ──────────────────────────────────────────────────────────────────────────────

def _create_customers():
    cust_group = _get_leaf_customer_group()
    territory = _get_leaf_territory()

    created = 0
    for (name, balance) in INCOMING_PARTIES:
        if frappe.db.exists("Customer", {"customer_name": name}):
            # Update opening balance
            cust_name = frappe.db.get_value("Customer", {"customer_name": name}, "name")
            frappe.db.set_value("Customer", cust_name, "trader_opening_balance", flt(balance),
                               update_modified=False)
            print(f"  Updated {name}: opening balance = {balance:,.2f} {CURRENCY}")
            continue

        doc = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": name,
            "customer_type": "Individual",
            "customer_group": cust_group,
            "territory": territory,
            "trader_opening_balance": flt(balance),
        })
        doc.insert(ignore_permissions=True)
        created += 1
        print(f"  Created customer: {name} — opening balance = {balance:,.2f} {CURRENCY}")

    print(f"  Created {created} new customers ({len(INCOMING_PARTIES)} total)")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 14: SUPPLIERS WITH OPENING BALANCES
# ──────────────────────────────────────────────────────────────────────────────

def _create_suppliers():
    # Get or create a leaf supplier group
    supp_group = frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
    if not supp_group:
        doc = frappe.get_doc({
            "doctype": "Supplier Group",
            "supplier_group_name": "Default",
            "parent_supplier_group": "All Supplier Groups",
            "is_group": 0,
        })
        doc.insert(ignore_permissions=True)
        supp_group = doc.name

    created = 0
    for (name, balance) in OUTGOING_PARTIES:
        if frappe.db.exists("Supplier", {"supplier_name": name}):
            supp_name = frappe.db.get_value("Supplier", {"supplier_name": name}, "name")
            frappe.db.set_value("Supplier", supp_name, "trader_opening_balance", flt(balance),
                               update_modified=False)
            print(f"  Updated {name}: opening balance = {balance:,.2f} {CURRENCY}")
            continue

        doc = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": name,
            "supplier_type": "Company",
            "supplier_group": supp_group,
            "trader_opening_balance": flt(balance),
        })
        doc.insert(ignore_permissions=True)
        created += 1
        print(f"  Created supplier: {name} — opening balance = {balance:,.2f} {CURRENCY}")

    print(f"  Created {created} new suppliers ({len(OUTGOING_PARTIES)} total)")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 15: OPENING CASH BALANCE (Journal Entry)
# ──────────────────────────────────────────────────────────────────────────────

def _record_opening_cash():
    """Create a Journal Entry to record opening cash in hand."""
    cash_account = frappe.db.get_value("Account",
        {"company": COMPANY_NAME, "account_type": "Cash", "is_group": 0}, "name")
    if not cash_account:
        print("  WARNING: No Cash account found — skipping cash entry")
        return

    obe_account = frappe.db.get_value("Account",
        {"company": COMPANY_NAME, "account_name": "Opening Balance Equity", "is_group": 0}, "name")
    if not obe_account:
        obe_account = frappe.db.get_value("Account",
            {"company": COMPANY_NAME, "account_name": ["like", "%Opening%"], "is_group": 0}, "name")
    if not obe_account:
        # Fallback to retained earnings
        obe_account = frappe.db.get_value("Account",
            {"company": COMPANY_NAME, "account_type": "Equity", "is_group": 0}, "name")

    if not obe_account:
        print("  WARNING: No equity account found — skipping cash entry")
        return

    # Check if we already have a journal entry for opening cash
    existing = frappe.db.get_value("Journal Entry",
        {"company": COMPANY_NAME, "remark": ["like", "%CDC Opening Cash%"], "docstatus": 1}, "name")
    if existing:
        print(f"  Opening cash journal entry already exists: {existing}")
        return

    doc = frappe.get_doc({
        "doctype": "Journal Entry",
        "company": COMPANY_NAME,
        "posting_date": nowdate(),
        "remark": "CDC Opening Cash Balance — from stock_valuation_cash_workbook.xlsx",
        "voucher_type": "Journal Entry",
    })

    # Debit Cash
    doc.append("accounts", {
        "account": cash_account,
        "debit_in_account_currency": flt(CASH_IN_HAND),
        "credit_in_account_currency": 0,
    })

    # Credit Opening Balance Equity
    doc.append("accounts", {
        "account": obe_account,
        "debit_in_account_currency": 0,
        "credit_in_account_currency": flt(CASH_IN_HAND),
    })

    doc.insert(ignore_permissions=True)
    doc.submit()

    print(f"  Created Journal Entry: {doc.name}")
    print(f"  Debit:  {cash_account} = {CASH_IN_HAND:,.2f} {CURRENCY}")
    print(f"  Credit: {obe_account} = {CASH_IN_HAND:,.2f} {CURRENCY}")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 16: SET DEFAULTS
# ──────────────────────────────────────────────────────────────────────────────

def _set_defaults():
    # Set company as default if no default exists
    current_default = frappe.db.get_value("Global Defaults", "Global Defaults", "default_company")
    if not current_default:
        frappe.db.set_value("Global Defaults", "Global Defaults", "default_company",
                           COMPANY_NAME, update_modified=False)
        frappe.db.set_value("Global Defaults", "Global Defaults", "default_currency",
                           CURRENCY, update_modified=False)
        print(f"  Set {COMPANY_NAME} as default company")
    else:
        print(f"  Default company already set to '{current_default}' — not overriding")

    # Ensure fiscal year is set
    current_fy = frappe.db.get_value("Global Defaults", "Global Defaults", "current_fiscal_year")
    if not current_fy:
        frappe.db.set_value("Global Defaults", "Global Defaults", "current_fiscal_year",
                           FISCAL_YEAR, update_modified=False)
        print(f"  Set current fiscal year to {FISCAL_YEAR}")
