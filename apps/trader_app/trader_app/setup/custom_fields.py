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
    # ── Commercial Opportunity module flag (OPP PRD) ───────────────
    {
        "dt": "Company",
        "fieldname": "trader_opportunity_enabled",
        "label": "Commercial Opportunity Module",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "trader_components_enabled",
        "description": (
            "When ON: Opportunity hub (enquiry → quotation → OC → delivery → invoice) "
            "and related APIs become active for this company. Default OFF — other tenants "
            "are unaffected. Behaviour is driven by Trader Opportunity Profile, not company name."
        ),
    },
    # ── Customer AR & Document Prints (AR-DOC PRD) ────────────────
    {
        "dt": "Company",
        "fieldname": "trader_ar_enabled",
        "label": "Customer AR & Document Prints",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "trader_opportunity_enabled",
        "description": (
            "When ON: multi-invoice payment allocation, settle tolerance, print personas, "
            "and withhold reporting adjustments become active for this company. Default OFF. "
            "Behaviour is driven by Trader AR Profile, not company name."
        ),
    },
    {
        "dt": "Company",
        "fieldname": "trader_sku_taxonomy",
        "label": "SKU Attribute Taxonomy (JSON)",
        "fieldtype": "Long Text",
        "insert_after": "trader_ar_enabled",
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

    # ── Sales lifecycle state (opt-in; enforced only via Trader Process Profile) ──
    {
        "dt": "Quotation",
        "fieldname": "trader_workflow_state",
        "label": "Trader Workflow State",
        "fieldtype": "Data",
        "insert_after": "trader_invoice_type",
        "read_only": 1,
        "allow_on_submit": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Lifecycle state; managed by the Trader Process Profile when enforced.",
    },
    {
        "dt": "Delivery Note",
        "fieldname": "trader_workflow_state",
        "label": "Trader Workflow State",
        "fieldtype": "Data",
        "insert_after": "trader_invoice_type",
        "read_only": 1,
        "allow_on_submit": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Lifecycle state; managed by the Trader Process Profile when enforced.",
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_workflow_state",
        "label": "Trader Workflow State",
        "fieldtype": "Data",
        "insert_after": "trader_invoice_type",
        "read_only": 1,
        "allow_on_submit": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Lifecycle state; managed by the Trader Process Profile when enforced.",
    },

    # ── Nested quotation options (PRD FR-3) ──────────────────────────
    {
        "dt": "Quotation",
        "fieldname": "trader_options",
        "label": "Trader Options",
        "fieldtype": "Table",
        "options": "Quotation Option",
        "insert_after": "trader_workflow_state",
        "description": "Alternative option/line groupings offered to the customer (line → option → item).",
    },

    # ── Commercial Opportunity links (OPP PRD) ───────────────────────
    {
        "dt": "Quotation",
        "fieldname": "trader_opportunity",
        "label": "Commercial Opportunity",
        "fieldtype": "Link",
        "options": "Trader Opportunity",
        "insert_after": "trader_options",
        "in_standard_filter": 1,
        "description": "Parent Opportunity when Commercial Opportunity module is enabled.",
    },
    {
        "dt": "Sales Order",
        "fieldname": "trader_opportunity",
        "label": "Commercial Opportunity",
        "fieldtype": "Link",
        "options": "Trader Opportunity",
        "insert_after": "customer",
        "in_standard_filter": 1,
        "description": "Parent Opportunity (Order Confirmation stage).",
    },
    {
        "dt": "Delivery Note",
        "fieldname": "trader_opportunity",
        "label": "Commercial Opportunity",
        "fieldtype": "Link",
        "options": "Trader Opportunity",
        "insert_after": "customer",
        "in_standard_filter": 1,
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_opportunity",
        "label": "Commercial Opportunity",
        "fieldtype": "Link",
        "options": "Trader Opportunity",
        "insert_after": "customer",
        "in_standard_filter": 1,
        "allow_on_submit": 1,
    },

    # ── Commercial Line→Option→Item hierarchy (OPP PRD) ────────────
    {
        "dt": "Quotation",
        "fieldname": "trader_commercial_options",
        "label": "Commercial Hierarchy",
        "fieldtype": "Table",
        "options": "Trader Commercial Option",
        "insert_after": "trader_opportunity",
        "description": "Line → Option → Item (effective qty = unit_qty × package_qty).",
    },
    {
        "dt": "Sales Order",
        "fieldname": "trader_commercial_options",
        "label": "Commercial Hierarchy",
        "fieldtype": "Table",
        "options": "Trader Commercial Option",
        "insert_after": "trader_opportunity",
    },
    {
        "dt": "Sales Order",
        "fieldname": "trader_source_quotation",
        "label": "Source Quotation",
        "fieldtype": "Link",
        "options": "Quotation",
        "insert_after": "trader_commercial_options",
        "description": "Quotation hierarchy was copied from when creating Order Confirmation.",
    },
    {
        "dt": "Delivery Note",
        "fieldname": "trader_commercial_options",
        "label": "Commercial Hierarchy",
        "fieldtype": "Table",
        "options": "Trader Commercial Option",
        "insert_after": "trader_opportunity",
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_commercial_options",
        "label": "Commercial Hierarchy",
        "fieldtype": "Table",
        "options": "Trader Commercial Option",
        "insert_after": "trader_opportunity",
        "allow_on_submit": 1,
    },

    # ── Grouped-invoice consumption counter (PRD FR-7) ───────────────
    {
        "dt": "Delivery Note Item",
        "fieldname": "trader_qty_invoiced",
        "label": "Qty Invoiced",
        "fieldtype": "Float",
        "default": "0",
        "insert_after": "qty",
        "read_only": 1,
        "no_copy": 1,
        "description": "Quantity from this challan line already pulled into a grouped invoice.",
    },

    # ── FX rate-clause snapshot (PRD FR-6) ───────────────────────────
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_fx_rate_snapshot",
        "label": "FX Rate Snapshot",
        "fieldtype": "Float",
        "precision": "9",
        "insert_after": "conversion_rate",
        "read_only": 1,
        "no_copy": 1,
        "description": "Exchange rate captured under the FX policy's rate clause.",
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_fx_snapshot_date",
        "label": "FX Snapshot Date",
        "fieldtype": "Date",
        "insert_after": "trader_fx_rate_snapshot",
        "read_only": 1,
        "no_copy": 1,
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_fx_clause_valid_until",
        "label": "FX Clause Valid Until",
        "fieldtype": "Date",
        "insert_after": "trader_fx_snapshot_date",
        "read_only": 1,
        "no_copy": 1,
    },
    {
        "dt": "Sales Invoice",
        "fieldname": "trader_fx_print_mode",
        "label": "FX Print Mode",
        "fieldtype": "Data",
        "insert_after": "trader_fx_clause_valid_until",
        "read_only": 1,
        "no_copy": 1,
    },

    # ── Tenant scoping on shared master data (Customer/Supplier/Item are
    #    global in ERPNext; without this a tenant would see other tenants' masters) ──
    {
        "dt": "Customer",
        "fieldname": "trader_tenant",
        "label": "Trader Tenant",
        "fieldtype": "Link",
        "options": "Trader Tenant",
        "insert_after": "trader_opening_balance",
        "read_only": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Business account that owns this customer. Enforces tenant isolation.",
    },
    {
        "dt": "Supplier",
        "fieldname": "trader_tenant",
        "label": "Trader Tenant",
        "fieldtype": "Link",
        "options": "Trader Tenant",
        "insert_after": "trader_opening_balance",
        "read_only": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Business account that owns this supplier. Enforces tenant isolation.",
    },
    {
        "dt": "Item",
        "fieldname": "trader_tenant",
        "label": "Trader Tenant",
        "fieldtype": "Link",
        "options": "Trader Tenant",
        "insert_after": "item_group",
        "read_only": 1,
        "no_copy": 1,
        "in_standard_filter": 1,
        "description": "Business account that owns this item. Enforces tenant isolation.",
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

    from trader_app.setup.master_permissions import ensure_master_doc_permissions
    ensure_master_doc_permissions()


def backfill_master_tenants(tenant):
    """One-time: assign existing untenanted Customer/Supplier/Item to ``tenant``.

    Master data (Customer/Supplier/Item) is global in ERPNext; when tenant
    isolation is introduced, existing records must be attributed to the tenant
    that already owns them (a single pre-existing business)."""
    if not frappe.db.exists("Trader Tenant", tenant):
        frappe.throw("Trader Tenant {0} does not exist.".format(tenant))
    result = {}
    for dt in ("Customer", "Supplier", "Item"):
        updated = frappe.db.sql(
            "UPDATE `tab{0}` SET trader_tenant=%s WHERE COALESCE(trader_tenant, '')=''".format(dt),
            tenant,
        )
        result[dt] = frappe.db.get_value(dt, {"trader_tenant": tenant}, "count(name)")
    frappe.db.commit()
    return {"tenant": tenant, "tagged": result}
