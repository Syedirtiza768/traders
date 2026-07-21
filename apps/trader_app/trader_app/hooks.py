# -*- coding: utf-8 -*-
"""Trader App — Frappe Hooks Configuration.

This file registers the Trader App with the Frappe framework and
configures all server-side behaviours including API whitelisting,
workflow hooks, scheduler events, permission overrides, and
DocType event handlers.
"""

from __future__ import unicode_literals

app_name = "trader_app"
app_title = "Trader App"
app_publisher = "Traders"
app_description = "Complete trader / distributor business management on ERPNext"
app_email = "admin@globaltrading.pk"
app_license = "MIT"
app_version = "1.0.0"

# ── Required Apps ──────────────────────────────────────────────────
required_apps = ["frappe", "erpnext"]

# ── Includes ───────────────────────────────────────────────────────
# app_include_css = []
# app_include_js = []

# ── Website / Portal ───────────────────────────────────────────────
# website_route_rules = []

# ── Installation ───────────────────────────────────────────────────
after_install = "trader_app.setup.install.after_install"
after_migrate = [
    "trader_app.setup.custom_fields.ensure_custom_fields",
]
# after_uninstall = ""

# ── Fixtures — export roles, custom fields, workflows, etc. ──────
fixtures = [
    {
        "dt": "Role",
        "filters": [["name", "in", [
            "Trader Admin",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Finance Manager",
            "Trader Inventory Manager",
            "Trader Super Admin",
            "Trader Staff",
            "Trader Viewer",
        ]]],
    },
    # Document approval workflows — declared here for future implementation.
    # Workflow JSON fixture files do not yet exist; the fixture entry is
    # intentionally omitted until the workflows are designed and exported.
    # {
    #     "dt": "Workflow",
    #     "filters": [["name", "in", [
    #         "Trader Sales Order Workflow",
    #         "Trader Sales Invoice Workflow",
    #         "Trader Purchase Order Workflow",
    #         "Trader Purchase Invoice Workflow",
    #     ]]],
    # },
    {
        "dt": "Custom Field",
        "filters": [["module", "=", "Trader"]],
    },
]

# ── DocType Events ─────────────────────────────────────────────────
doc_events = {
    "Sales Invoice": {
        "validate": [
            "trader_app.api.tax_policy.apply_tax_policy",
            "trader_app.api.posting.apply_posting_profile",
            "trader_app.api.sales.validate_sales_invoice",
            "trader_app.api.process.apply_initial_state",
            "trader_app.api.fx_policy.snapshot_on_create",
        ],
        "before_submit": "trader_app.api.fx_policy.snapshot_on_finalize",
        "on_submit": "trader_app.api.sales.on_sales_invoice_submit",
        "on_cancel": "trader_app.api.sales.on_sales_invoice_cancel",
    },
    "Quotation": {
        "validate": "trader_app.api.process.apply_initial_state",
    },
    "Delivery Note": {
        "validate": "trader_app.api.process.apply_initial_state",
    },
    # Tenant-stamp shared master data on creation so it is scoped to its owner.
    "Customer": {
        "before_insert": "trader_app.api.permissions.stamp_master_tenant",
    },
    "Supplier": {
        "before_insert": "trader_app.api.permissions.stamp_master_tenant",
    },
    "Item": {
        "before_insert": "trader_app.api.permissions.stamp_master_tenant",
    },
    "Purchase Invoice": {
        "validate": "trader_app.api.purchases.validate_purchase_invoice",
        "on_submit": "trader_app.api.purchases.on_purchase_invoice_submit",
        "on_cancel": "trader_app.api.purchases.on_purchase_invoice_cancel",
    },
    "Payment Entry": {
        "on_submit": "trader_app.api.finance.on_payment_entry_submit",
    },
    "Stock Entry": {
        "validate": "trader_app.api.inventory.validate_stock_entry",
    },
}

# ── Scheduler Events ──────────────────────────────────────────────
scheduler_events = {
    "daily_long": [
        "trader_app.api.inventory.update_reorder_levels",
    ],
    "cron": {
        # Recalculate dashboard KPIs cache every 15 minutes
        "*/15 * * * *": [
            "trader_app.api.dashboard.refresh_dashboard_cache",
        ],
    },
}

# ── Jinja ──────────────────────────────────────────────────────────
# jinja = { "methods": [], "filters": [] }

# ── Override Whitelisted Methods ───────────────────────────────────
# override_whitelisted_methods = {}

# ── Override DocType Class ─────────────────────────────────────────
# override_doctype_class = {}

# ── Permissions ────────────────────────────────────────────────────
permission_query_conditions = {
    "Sales Invoice": "trader_app.api.permissions.sales_invoice_query",
    "Purchase Invoice": "trader_app.api.permissions.purchase_invoice_query",
    "Sales Order": "trader_app.api.permissions.sales_order_query",
    "Purchase Order": "trader_app.api.permissions.purchase_order_query",
    "Payment Entry": "trader_app.api.permissions.payment_entry_query",
    "Delivery Note": "trader_app.api.permissions.delivery_note_query",
    "Quotation": "trader_app.api.permissions.quotation_query",
    "Customer": "trader_app.api.permissions.customer_query",
    "Supplier": "trader_app.api.permissions.supplier_query",
    "Item": "trader_app.api.permissions.item_query",
}

has_permission = {
    "Sales Invoice": "trader_app.api.permissions.has_sales_invoice_permission",
    "Purchase Invoice": "trader_app.api.permissions.has_purchase_invoice_permission",
    "Sales Order": "trader_app.api.permissions.has_sales_order_permission",
    "Purchase Order": "trader_app.api.permissions.has_purchase_order_permission",
    "Payment Entry": "trader_app.api.permissions.has_payment_entry_permission",
    "Delivery Note": "trader_app.api.permissions.has_delivery_note_permission",
    "Quotation": "trader_app.api.permissions.has_quotation_permission",
}

# ── Boot Session ───────────────────────────────────────────────────
boot_session = "trader_app.api.tenant.boot_session"

# ── Notification ───────────────────────────────────────────────────
# notification_config = ""
