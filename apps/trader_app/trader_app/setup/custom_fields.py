# -*- coding: utf-8 -*-
"""Create Trader custom fields on ERPNext doctypes."""

from __future__ import unicode_literals

import frappe


CUSTOM_FIELDS = [
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_invoice_type",
        "label": "Trader Invoice Type",
        "fieldtype": "Select",
        "options": "\n".join([
            "Tax Invoice",
            "Commercial Invoice",
            "Non-GST Invoice",
            "Bill of Supply",
            "Credit Note",
        ]),
        "insert_after": "customer",
        "in_standard_filter": 1,
        "in_list_view": 1,
    },
    {
        "dt": "Purchase Invoice",
        "fieldname": "trader_invoice_type",
        "label": "Trader Invoice Type",
        "fieldtype": "Select",
        "options": "\n".join([
            "Tax Invoice",
            "Commercial Invoice",
            "Non-GST Invoice",
            "Bill of Supply",
            "Debit Note",
        ]),
        "insert_after": "supplier",
        "in_standard_filter": 1,
        "in_list_view": 1,
    },
    {
        "dt": "Quotation",
        "fieldname": "trader_invoice_type",
        "label": "Trader Document Type",
        "fieldtype": "Select",
        "options": "\nQuotation\nProforma Invoice",
        "insert_after": "party_name",
        "in_standard_filter": 1,
    },
    {
        "dt": "Delivery Note",
        "fieldname": "trader_invoice_type",
        "label": "Trader Document Type",
        "fieldtype": "Select",
        "options": "Delivery Challan",
        "default": "Delivery Challan",
        "insert_after": "customer",
        "in_standard_filter": 1,
        "in_list_view": 1,
    },
    {
        "dt": "Company",
        "fieldname": "trader_multi_currency_enabled",
        "label": "Trader Multi-Currency",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "default_currency",
        "description": "When enabled, Trader UI allows foreign currency on sales and purchases.",
    },
    {
        "dt": "Company",
        "fieldname": "trader_enabled_currencies",
        "label": "Trader Enabled Currencies",
        "fieldtype": "Small Text",
        "insert_after": "trader_multi_currency_enabled",
        "description": "JSON array of currency codes allowed in Trader UI (base currency is always included).",
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "preferred_bank_account",
        "label": "Preferred Bank Account",
        "fieldtype": "Link",
        "options": "Account",
        "insert_after": "due_date",
        "description": "Bank account shown on the invoice for customer payments.",
    },

    # ── Components Trading feature flag ────────────────────────────
    {
        "dt": "Company",
        "fieldname": "trader_components_enabled",
        "label": "Components Trading — Day Book & Variant Catalog",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "trader_enabled_currencies",
        "description": (
            "When ON: attribute-driven component catalog, day-book entry, "
            "stock valuation report, AR/AP lists, stock-take, and day-close become active. "
            "Disabling hides the UI but preserves all data."
        ),
    },
    {
        "dt": "Company",
        "fieldname": "trader_sku_taxonomy",
        "label": "SKU Attribute Taxonomy (JSON)",
        "fieldtype": "Long Text",
        "insert_after": "trader_components_enabled",
        "description": (
            "Company-specific SKU attribute templates (category → form factors, capacities, grades). "
            "Merged with system seed and values from existing items."
        ),
    },
    {
        "dt": "Company",
        "fieldname": "trader_item_group_templates",
        "label": "Item Group → SKU Template Map (JSON)",
        "fieldtype": "Long Text",
        "insert_after": "trader_sku_taxonomy",
        "description": (
            'Maps Item Group names to template ids, e.g. {"SSD": "components", "*": "generic"}. '
            "Used by unified item line entry across vouchers."
        ),
    },
    {
        "dt": "Company",
        "fieldname": "trader_custom_sku_templates",
        "label": "Custom SKU Templates (JSON)",
        "fieldtype": "Long Text",
        "insert_after": "trader_item_group_templates",
        "description": (
            "Optional extra template definitions keyed by template id. "
            "Currently only resolver id 'components' creates stock items automatically."
        ),
    },

    # ── Component metadata on Item (all optional, default 0/blank) ──
    {
        "dt": "Item",
        "fieldname": "trader_component_item",
        "label": "Component Item",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "item_group",
        "description": "Managed by the Components Catalog feature.",
    },
    {
        "dt": "Item",
        "fieldname": "trader_component_category",
        "label": "Component Category",
        "fieldtype": "Data",
        "insert_after": "trader_component_item",
        "depends_on": "eval:doc.trader_component_item",
    },
    {
        "dt": "Item",
        "fieldname": "trader_component_form_factor",
        "label": "Form Factor",
        "fieldtype": "Data",
        "insert_after": "trader_component_category",
        "depends_on": "eval:doc.trader_component_item",
    },
    {
        "dt": "Item",
        "fieldname": "trader_component_capacity",
        "label": "Capacity",
        "fieldtype": "Data",
        "insert_after": "trader_component_form_factor",
        "depends_on": "eval:doc.trader_component_item",
    },
    {
        "dt": "Item",
        "fieldname": "trader_component_grade",
        "label": "Grade / Variant",
        "fieldtype": "Data",
        "insert_after": "trader_component_capacity",
        "depends_on": "eval:doc.trader_component_item",
    },

    # ── Short code + opening balance on Customer / Supplier ─────────
    {
        "dt": "Customer",
        "fieldname": "trader_short_code",
        "label": "Short Code",
        "fieldtype": "Data",
        "insert_after": "customer_name",
        "description": "Informal short-code used in day-book entry (e.g. A7, C3, H3).",
        "in_list_view": 1,
    },
    {
        "dt": "Customer",
        "fieldname": "trader_opening_balance",
        "label": "Opening AR Balance",
        "fieldtype": "Currency",
        "default": "0",
        "insert_after": "trader_short_code",
        "description": "Opening receivable balance imported when Components feature is first enabled.",
    },
    {
        "dt": "Supplier",
        "fieldname": "trader_short_code",
        "label": "Short Code",
        "fieldtype": "Data",
        "insert_after": "supplier_name",
        "description": "Informal short-code used in day-book entry.",
        "in_list_view": 1,
    },
    {
        "dt": "Supplier",
        "fieldname": "trader_opening_balance",
        "label": "Opening AP Balance",
        "fieldtype": "Currency",
        "default": "0",
        "insert_after": "trader_short_code",
        "description": "Opening payable balance imported when Components feature is first enabled.",
    },

    # ── Multi-tenant platform fields ─────────────────────────────────
    {
        "dt": "User",
        "fieldname": "trader_tenant",
        "label": "Trader Tenant",
        "fieldtype": "Link",
        "options": "Trader Tenant",
        "insert_after": "user_type",
        "description": "Business account this user belongs to. Platform admins leave blank.",
    },
    {
        "dt": "Company",
        "fieldname": "trader_tenant",
        "label": "Trader Tenant",
        "fieldtype": "Link",
        "options": "Trader Tenant",
        "insert_after": "company_name",
        "description": "Platform tenant that owns this company.",
    },
    {
        "dt": "Company",
        "fieldname": "trader_user_limit",
        "label": "Trader User Limit",
        "fieldtype": "Int",
        "default": "10",
        "insert_after": "trader_tenant",
        "description": "Maximum users allowed for this business (synced from tenant).",
    },
]


def ensure_custom_fields():
    """Idempotently create custom fields."""
    for spec in CUSTOM_FIELDS:
        name = f"{spec['dt']}-{spec['fieldname']}"
        if frappe.db.exists("Custom Field", name):
            continue
        doc = frappe.new_doc("Custom Field")
        doc.update(spec)
        doc.module = "Trader"
        doc.insert(ignore_permissions=True)
    frappe.db.commit()
