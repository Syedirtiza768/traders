# -*- coding: utf-8 -*-
"""Cross-tenant isolation tests (mock Frappe — no bench site required).

Run on bench when available:
  bench --site <site> run-tests --app trader_app --module trader_app.tests.test_tenant_isolation
"""

from __future__ import unicode_literals

import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

if "frappe" not in sys.modules:
    frappe_stub = MagicMock()

    def _throw(msg, exc=None):
        raise exc or Exception(msg)

    def _whitelist(fn=None, **kwargs):
        if fn is not None:
            return fn
        return lambda f: f

    frappe_stub.throw = _throw
    frappe_stub.ValidationError = type("ValidationError", (Exception,), {})
    frappe_stub.PermissionError = type("PermissionError", (Exception,), {})
    frappe_stub.whitelist = _whitelist
    frappe_stub.session = MagicMock(user="user-a@test.com")
    frappe_stub.get_roles.return_value = ["Trader Admin"]
    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.utils"] = MagicMock()
else:
    import frappe as _frappe_mod

    def _whitelist(fn=None, **kwargs):
        if fn is not None:
            return fn
        return lambda f: f

    _frappe_mod.whitelist = _whitelist

import importlib

import trader_app.api.admin as _admin_mod
import trader_app.api.super_admin as _super_admin_mod
import trader_app.api.tenant as _tenant_mod

importlib.reload(_admin_mod)
importlib.reload(_super_admin_mod)
importlib.reload(_tenant_mod)

from trader_app import hooks as app_hooks
from trader_app.api import admin as admin_api
from trader_app.api import bundling as bundling_api
from trader_app.api import catalog as catalog_api
from trader_app.api import commercial_totals as commercial_totals_api
from trader_app.api import company as company_api
from trader_app.api import customers as customers_api
from trader_app.api import dashboard as dashboard_api
from trader_app.api import daybook as daybook_api
from trader_app.api import decision_log as decision_log_api
from trader_app.api import finance as finance_api
from trader_app.api import gst as gst_api
from trader_app.api import inventory as inventory_api
from trader_app.api import opportunity as opportunity_api
from trader_app.api import permissions as permissions_api
from trader_app.api import pos as pos_api
from trader_app.api import posting as posting_api
from trader_app.api import printing as printing_api
from trader_app.api import purchases as purchases_api
from trader_app.api import reports as reports_api
from trader_app.api import settings as settings_api
from trader_app.api import super_admin as super_admin_api
from trader_app.api import suppliers as suppliers_api
from trader_app.api import tax_policy as tax_policy_api
from trader_app.api import templates as templates_api
from trader_app.api import tenant as tenant_api
from trader_app.api import trading_entity as trading_entity_api


class UserSettingsAuthorizationTests(unittest.TestCase):
    def test_save_settings_only_writes_the_current_users_preferences(self):
        cache = MagicMock()
        user = "sales.user@example.com"

        with patch.object(settings_api.frappe, "session", SimpleNamespace(user=user)), patch.object(
            settings_api.frappe.defaults, "set_user_default"
        ) as set_user_default, patch.object(
            settings_api.frappe.db, "set_single_value"
        ) as set_single_value, patch.object(
            settings_api.frappe.db, "commit"
        ) as commit, patch.object(
            settings_api.frappe, "cache", return_value=cache
        ), patch.object(
            settings_api, "cint", side_effect=lambda value: int(value or 0)
        ), patch.object(settings_api, "_payload", return_value={"ui": {"time_zone": "UTC"}}):
            result = settings_api.save_settings({"ui": {"time_zone": "UTC"}})

        self.assertTrue(result["ok"])
        self.assertEqual(len(set_user_default.call_args_list), 10)
        self.assertTrue(all(call.args[0].startswith("trader_ui_") for call in set_user_default.call_args_list))
        self.assertTrue(all(call.args[2] == user for call in set_user_default.call_args_list))
        set_single_value.assert_not_called()
        commit.assert_called_once_with()
        cache.set_value.assert_called_once()


class CompanyQueryAuthorizationTests(unittest.TestCase):
    def test_tenant_system_manager_list_is_limited_to_permitted_companies(self):
        with patch.object(permissions_api, "_roles", return_value=["System Manager"]), patch.object(
            permissions_api, "is_multitenant_enabled", return_value=True
        ), patch.object(
            permissions_api, "get_user_tenant_name", return_value="TNT-A"
        ), patch.object(
            permissions_api, "get_permitted_company_names", return_value=["Company A", "Company A2"]
        ), patch.object(
            permissions_api.frappe.db, "escape", side_effect=lambda company: "'{}'".format(company)
        ):
            query = permissions_api.sales_invoice_query("tenant-manager@example.com")

        self.assertIn("`tabSales Invoice`.company in ('Company A', 'Company A2')", query)
        self.assertNotIn("Company B", query)
        self.assertNotIn("owner", query)

    def test_tenant_system_manager_with_no_permitted_companies_fails_closed(self):
        with patch.object(permissions_api, "_roles", return_value=["System Manager"]), patch.object(
            permissions_api, "is_multitenant_enabled", return_value=True
        ), patch.object(
            permissions_api, "get_user_tenant_name", return_value="TNT-A"
        ), patch.object(permissions_api, "get_permitted_company_names", return_value=[]):
            query = permissions_api.sales_invoice_query("tenant-manager@example.com")

        self.assertEqual(query, "1=0")

    def test_system_manager_list_honors_explicit_company_permission_without_multitenancy(self):
        with patch.object(permissions_api, "_roles", return_value=["System Manager"]), patch.object(
            permissions_api, "is_multitenant_enabled", return_value=False
        ), patch.object(
            permissions_api, "get_permitted_company_names", return_value=["Company A"]
        ), patch.object(
            permissions_api.frappe.db, "escape", return_value="'Company A'"
        ):
            query = permissions_api.sales_invoice_query("restricted-manager@example.com")

        self.assertEqual(query, "`tabSales Invoice`.company in ('Company A')")


class SharedMasterRecordAuthorizationTests(unittest.TestCase):
    def test_shared_master_company_check_denies_foreign_company_tenant(self):
        doc = MagicMock()
        with patch.object(permissions_api.frappe, "get_doc", return_value=doc), patch.object(
            permissions_api,
            "company_master_sql_filter",
            return_value=("m.trader_tenant = %(company_scope_tenant)s", {"company_scope_tenant": "TNT-A"}),
        ), patch.object(permissions_api.frappe.db, "sql", return_value=[]) as sql:
            with self.assertRaises(Exception):
                permissions_api.check_master_document_company("Customer", "CUSTOMER-B", "Company A")

        doc.check_permission.assert_called_once_with("read")
        self.assertIn("m.trader_tenant = %(company_scope_tenant)s", sql.call_args.args[0])

    def test_customer_credit_check_enforces_customer_company_scope(self):
        with patch.object(commercial_totals_api, "_assert_sales_module_access"), patch(
            "trader_app.api.company.resolve_active_company", return_value="Company A"
        ), patch.object(permissions_api.frappe.db, "exists", return_value=True), patch.object(
            permissions_api, "check_master_document_company", side_effect=RuntimeError("denied")
        ) as check_master:
            with self.assertRaisesRegex(RuntimeError, "denied"):
                commercial_totals_api.get_customer_credit_check("CUSTOMER-B", company="Company A")

        check_master.assert_called_once_with("Customer", "CUSTOMER-B", "Company A", ptype="read")


class GSTTemplateSeedingTests(unittest.TestCase):
    def test_template_seed_uses_the_legacy_cache_key_for_config_migration(self):
        cache = MagicMock()
        with patch.object(gst_api.frappe, "session", SimpleNamespace(user="finance@test.com")), patch.object(
            gst_api.frappe, "get_roles", return_value=["Trader Admin"]
        ), patch.object(gst_api, "resolve_active_company", return_value="Company A"), patch.object(
            gst_api.frappe, "get_cached_value", return_value="CMP"
        ), patch.object(
            gst_api.frappe.db, "exists", return_value=True
        ), patch.object(
            gst_api, "_ensure_tax_account", return_value="Output GST - CMP"
        ), patch.object(
            gst_api, "_read_gst_config", return_value={}
        ), patch.object(
            gst_api.frappe, "cache", return_value=cache
        ):
            result = gst_api.seed_punjab_gst_templates(company="Company A")

        self.assertEqual(result["created"], [])
        cache.set_value.assert_called_once()
        cache_key, cache_value = cache.set_value.call_args.args
        self.assertEqual(cache_key, "trader_gst_config::Company A")
        self.assertIn("GST 18% - Punjab Standard - CMP", cache_value)

    def test_template_customer_profile_lookup_enforces_company_scope(self):
        with patch.object(templates_api, "resolve_active_company", return_value="Company A"), patch.object(
            templates_api.frappe.db, "exists", return_value=True
        ), patch.object(
            permissions_api, "check_master_document_company", side_effect=RuntimeError("denied")
        ) as check_master:
            with self.assertRaisesRegex(RuntimeError, "denied"):
                templates_api.resolve_template("Sales Invoice", "Company A", "CUSTOMER-B")

        check_master.assert_called_once_with("Customer", "CUSTOMER-B", "Company A", ptype="read")

    def test_tax_preview_customer_profile_lookup_enforces_company_scope(self):
        with patch("trader_app.api.company.resolve_active_company", return_value="Company A"), patch.object(
            tax_policy_api.frappe.db, "exists", return_value=True
        ), patch.object(
            permissions_api, "check_master_document_company", side_effect=RuntimeError("denied")
        ) as check_master:
            with self.assertRaisesRegex(RuntimeError, "denied"):
                tax_policy_api.preview_tax("Company A", customer="CUSTOMER-B")

        check_master.assert_called_once_with("Customer", "CUSTOMER-B", "Company A", ptype="read")

    def test_internal_print_endpoint_enforces_secure_print_role(self):
        doc = MagicMock(company="Company A")
        with patch.object(printing_api.frappe, "get_doc", return_value=doc), patch.object(
            printing_api, "assert_document_company_access"
        ), patch.object(printing_api.frappe, "get_roles", return_value=[]), patch(
            "trader_app.api.ar.resolve_ar_settings",
            return_value={"profile": {"secure_internal_prints": 1}},
        ):
            with self.assertRaises(Exception):
                printing_api.get_print_data("Sales Invoice", "SI-1", view_mode="internal")

        doc.check_permission.assert_called_once_with("read")

    def test_decision_trace_requires_source_document_read_permission(self):
        source = MagicMock()
        source.check_permission.side_effect = RuntimeError("denied")
        with patch.object(decision_log_api.frappe.db, "exists", return_value=True), patch.object(
            decision_log_api.frappe, "get_doc", return_value=source
        ), patch.object(decision_log_api.frappe, "get_all") as get_all:
            with self.assertRaisesRegex(RuntimeError, "denied"):
                decision_log_api.get_decision_trace("Sales Invoice", "SINV-B")

        get_all.assert_not_called()

    def test_posting_preview_requires_source_document_read_permission(self):
        source = MagicMock()
        source.check_permission.side_effect = RuntimeError("denied")
        with patch.object(posting_api.frappe, "get_doc", return_value=source), patch(
            "trader_app.api.company.assert_document_company_access"
        ) as check_company:
            with self.assertRaisesRegex(RuntimeError, "denied"):
                posting_api.preview_posting("Sales Invoice", "SINV-B")

        check_company.assert_not_called()

    def test_pos_default_customer_query_is_scoped_to_company_tenant(self):
        rows = [[], [SimpleNamespace(name="CUSTOMER-A")]]
        with patch.object(pos_api, "resolve_active_company", return_value="Company A"), patch.object(
            pos_api.frappe, "get_cached_value", return_value="CA"
        ), patch.object(pos_api, "_company_base_currency", return_value="PKR"), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=("c.trader_tenant = %(company_scope_tenant)s", {"company_scope_tenant": "TNT-A"}),
        ), patch(
            "trader_app.api.permissions.check_master_document_company", return_value=MagicMock()
        ) as check_master, patch.object(
            pos_api.frappe.db, "sql", side_effect=rows
        ) as sql:
            result = pos_api.get_pos_setup("Company A")

        self.assertEqual(result["default_customer"], "CUSTOMER-A")
        self.assertEqual(sql.call_count, 2)
        for call in sql.call_args_list:
            self.assertIn("c.trader_tenant = %(company_scope_tenant)s", call.args[0])
        check_master.assert_called_once_with("Customer", "CUSTOMER-A", "Company A", ptype="read")

    def test_purchase_summary_supplier_count_is_company_tenant_scoped(self):
        db_results = [[(3,)], [(4,)], [(5,)], [(2,)]]
        date = SimpleNamespace(replace=lambda day: SimpleNamespace(isoformat=lambda: "2026-10-01"))
        with patch.object(purchases_api, "resolve_active_company", return_value="Company A"), patch.object(
            purchases_api, "nowdate", return_value="2026-10-04"
        ), patch.object(purchases_api, "getdate", return_value=date), patch.object(
            purchases_api, "cint", side_effect=lambda value: int(value or 0)
        ), patch.object(
            purchases_api, "flt", side_effect=lambda value: float(value or 0)
        ), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=("s.trader_tenant = %(company_scope_tenant)s", {"company_scope_tenant": "TNT-A"}),
        ), patch.object(
            purchases_api.frappe.db, "sql", side_effect=db_results
        ) as sql:
            result = purchases_api.get_purchase_summary("Company A")

        self.assertEqual(result["total_suppliers"], 2)
        self.assertIn("s.trader_tenant = %(company_scope_tenant)s", sql.call_args_list[3].args[0])
        self.assertEqual(sql.call_args_list[3].args[1]["company_scope_tenant"], "TNT-A")

    def test_opportunity_default_item_is_selected_from_company_tenant(self):
        rows = [[], [SimpleNamespace(name="ITEM-A")]]
        with patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=("i.trader_tenant = %(company_scope_tenant)s", {"company_scope_tenant": "TNT-A"}),
        ), patch(
            "trader_app.api.permissions.check_master_document_company", return_value=MagicMock()
        ) as check_master, patch.object(
            opportunity_api.frappe.db, "sql", side_effect=rows
        ) as sql:
            item_code = opportunity_api._first_stock_item("Company A")

        self.assertEqual(item_code, "ITEM-A")
        self.assertEqual(sql.call_count, 2)
        self.assertTrue(
            all("i.trader_tenant = %(company_scope_tenant)s" in call.args[0] for call in sql.call_args_list)
        )
        check_master.assert_called_once_with("Item", "ITEM-A", "Company A", ptype="read")

    def test_trading_entity_customer_count_is_company_tenant_scoped(self):
        with patch.object(trading_entity_api.frappe.db, "has_column", return_value=True), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=("c.trader_tenant = %(company_scope_tenant)s", {"company_scope_tenant": "TNT-A"}),
        ), patch.object(trading_entity_api, "cint", side_effect=lambda value: int(value or 0)), patch.object(
            trading_entity_api.frappe.db, "sql", return_value=[(3,)]
        ) as sql:
            count = trading_entity_api._count_customers_for_trading_entity("ENTITY-A", "Company A")

        self.assertEqual(count, 3)
        self.assertIn("c.trader_tenant = %(company_scope_tenant)s", sql.call_args.args[0])

    def test_direct_master_document_access_denies_foreign_and_unassigned_rows(self):
        foreign_doc = MagicMock(trader_tenant="TNT-B")
        unassigned_doc = MagicMock(trader_tenant=None)
        with patch.object(permissions_api, "_master_scope", return_value="TNT-A"):
            self.assertFalse(permissions_api.master_document_permission(foreign_doc, "read", "user-a"))
            self.assertFalse(permissions_api.master_document_permission(unassigned_doc, "read", "user-a"))

    def test_direct_master_document_access_preserves_normal_role_checks_in_scope(self):
        doc = MagicMock(trader_tenant="TNT-A")
        with patch.object(permissions_api, "_master_scope", return_value="TNT-A"):
            self.assertIsNone(permissions_api.master_document_permission(doc, "read", "user-a"))

    def test_master_insert_overwrites_client_supplied_tenant(self):
        doc = MagicMock(trader_tenant="TNT-B")
        doc.flags.in_import = False
        with patch.object(
            permissions_api.frappe, "flags", SimpleNamespace(in_install=False, in_migrate=False)
        ), patch.object(permissions_api.frappe, "session", SimpleNamespace(user="user-a")), patch.object(
            permissions_api, "get_user_tenant_name", return_value="TNT-A"
        ):
            permissions_api.stamp_master_tenant(doc)
        self.assertEqual(doc.trader_tenant, "TNT-A")

    def test_unassigned_user_cannot_spoof_tenant_on_master_insert(self):
        doc = MagicMock(trader_tenant="TNT-B")
        doc.flags.in_import = False
        with patch.object(
            permissions_api.frappe, "flags", SimpleNamespace(in_install=False, in_migrate=False)
        ), patch.object(permissions_api.frappe, "session", SimpleNamespace(user="user-a")), patch.object(
            permissions_api, "get_user_tenant_name", return_value=None
        ), patch.object(
            permissions_api, "is_super_admin", return_value=False
        ):
            with self.assertRaises(Exception):
                permissions_api.stamp_master_tenant(doc)

    def test_master_update_cannot_change_its_owner_tenant(self):
        doc = MagicMock()
        doc.is_new.return_value = False
        doc.doctype = "Customer"
        doc.name = "CUSTOMER-B"
        doc.trader_tenant = "TNT-A"
        with patch.object(permissions_api.frappe.db, "get_value", return_value="TNT-B"):
            with self.assertRaises(Exception):
                permissions_api.validate_master_tenant(doc)

    def test_item_bundle_list_query_is_tenant_filtered(self):
        with patch.object(bundling_api, "cint", side_effect=lambda value: int(value)), patch.object(
            bundling_api.frappe, "has_permission", return_value=True
        ), patch.object(
            bundling_api,
            "tenant_sql_filter",
            return_value=("b.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-A"}),
        ), patch.object(
            bundling_api.frappe.db, "sql", side_effect=[[(0,)], []]
        ) as sql:
            result = bundling_api.get_item_bundles()
        self.assertEqual(result["total"], 0)
        self.assertIn("b.trader_tenant = %(trader_scope_tenant)s", sql.call_args_list[0].args[0])
        self.assertEqual(sql.call_args_list[0].args[1]["trader_scope_tenant"], "TNT-A")

    def test_barcode_item_lookup_filters_to_the_active_tenant(self):
        with patch(
            "trader_app.api.permissions.tenant_sql_filter",
            return_value=("i.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-A"}),
        ), patch.object(inventory_api.frappe.db, "sql", return_value=[]) as sql:
            self.assertIsNone(inventory_api._item_lookup_row("ITEM-B"))
        self.assertIn("i.trader_tenant = %(trader_scope_tenant)s", sql.call_args.args[0])
        self.assertEqual(sql.call_args.args[1]["trader_scope_tenant"], "TNT-A")

    def test_stock_balance_count_and_rows_are_tenant_filtered(self):
        condition = "i.trader_tenant = %(trader_scope_tenant)s"
        with patch.object(inventory_api, "resolve_active_company", return_value="Company A"), patch.object(
            inventory_api, "cint", side_effect=lambda value: int(value or 0)
        ), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=(condition, {"trader_scope_tenant": "TNT-A"}),
        ), patch.object(
            inventory_api.frappe.db, "sql", side_effect=[[(1,)], []]
        ) as sql:
            inventory_api.get_stock_balance()
        self.assertEqual(sql.call_count, 2)
        for call in sql.call_args_list:
            self.assertIn(condition, call.args[0])
            self.assertEqual(call.args[1]["trader_scope_tenant"], "TNT-A")

    def test_catalog_taxonomy_query_is_tenant_filtered(self):
        condition = "i.trader_tenant = %(trader_scope_tenant)s"
        with patch.object(catalog_api.frappe.db, "has_column", return_value=True), patch(
            "trader_app.api.permissions.tenant_sql_filter",
            return_value=(condition, {"trader_scope_tenant": "TNT-A"}),
        ), patch.object(catalog_api.frappe.db, "sql", return_value=[]) as sql:
            catalog_api._merged_taxonomy()
        self.assertIn(condition, sql.call_args.args[0])
        self.assertEqual(sql.call_args.args[1]["trader_scope_tenant"], "TNT-A")

    def test_catalog_taxonomy_mutation_requires_admin_role_before_write(self):
        with patch.object(catalog_api, "resolve_active_company", return_value="Company A"), patch.object(
            catalog_api.frappe, "session", SimpleNamespace(user="viewer@example.com")
        ), patch.object(catalog_api.frappe, "get_roles", return_value=["Trader Viewer"]), patch.object(
            catalog_api.frappe.db, "set_value"
        ) as set_value:
            with self.assertRaises(catalog_api.frappe.PermissionError):
                catalog_api.ensure_taxonomy_values("CPU", form_factor="Desktop", company="Company A")

        set_value.assert_not_called()

    def test_catalog_item_create_denial_has_no_item_group_side_effect(self):
        with patch.object(catalog_api, "resolve_active_company", return_value="Company A"), patch.object(
            catalog_api, "_assert_enabled"
        ), patch.object(catalog_api.frappe.db, "exists", return_value=False), patch(
            "trader_app.api.permissions.company_master_sql_filter", return_value=("", {})
        ), patch.object(catalog_api.frappe.db, "sql", return_value=[]), patch.object(
            catalog_api.frappe, "has_permission", return_value=False
        ), patch.object(catalog_api, "_get_or_create_item_group") as create_group:
            with self.assertRaises(catalog_api.frappe.PermissionError):
                catalog_api.find_or_create_sku("CPU", "Desktop", "8-Core", "New", company="Company A")

        create_group.assert_not_called()

    def test_catalog_failed_item_insert_does_not_commit_item_groups_early(self):
        parent_group, category_group, item = MagicMock(), MagicMock(), MagicMock()
        with patch.object(catalog_api, "resolve_active_company", return_value="Company A"), patch.object(
            catalog_api, "_assert_enabled"
        ), patch.object(
            catalog_api.frappe.db, "exists", side_effect=[False, False, False]
        ), patch(
            "trader_app.api.permissions.company_master_sql_filter", return_value=("", {})
        ), patch.object(catalog_api.frappe.db, "sql", return_value=[]), patch.object(
            catalog_api.frappe, "has_permission", return_value=True
        ), patch.object(
            catalog_api.frappe.db, "get_value", return_value="All Item Groups"
        ), patch.object(
            catalog_api.frappe, "new_doc", side_effect=[parent_group, category_group, item]
        ), patch.object(
            catalog_api.frappe.db, "commit"
        ) as commit:
            item.insert.side_effect = RuntimeError("invalid item")
            with self.assertRaisesRegex(RuntimeError, "invalid item"):
                catalog_api.find_or_create_sku("CPU", "Desktop", "8-Core", "New", company="Company A")

        commit.assert_not_called()

    def test_catalog_metadata_match_checks_item_read_permission(self):
        item = MagicMock()
        item.check_permission.side_effect = catalog_api.frappe.PermissionError("denied")
        with patch.object(catalog_api, "resolve_active_company", return_value="Company A"), patch.object(
            catalog_api, "_assert_enabled"
        ), patch.object(catalog_api.frappe.db, "exists", return_value=False), patch(
            "trader_app.api.permissions.company_master_sql_filter", return_value=("", {})
        ), patch.object(catalog_api.frappe.db, "sql", return_value=[SimpleNamespace(name="CPU-DESKTOP-8-CORE-NEW")]), patch.object(
            catalog_api.frappe, "get_doc", return_value=item
        ):
            with self.assertRaises(catalog_api.frappe.PermissionError):
                catalog_api.find_or_create_sku("CPU", "Desktop", "8-Core", "New", company="Company A")

        item.check_permission.assert_called_once_with("read")

    def test_catalog_existing_item_resolution_checks_document_permission(self):
        item = MagicMock()
        item.check_permission.side_effect = Exception("denied")
        with patch.object(catalog_api, "resolve_active_company", return_value="Company A"), patch.object(
            catalog_api.frappe.db, "exists", return_value=True
        ), patch.object(catalog_api.frappe, "get_doc", return_value=item):
            with self.assertRaises(Exception):
                catalog_api.resolve_item(item_code="ITEM-B", company="Company A")
        item.check_permission.assert_called_once_with("read")

    def test_stock_qoh_query_joins_only_tenant_items(self):
        condition = "i.trader_tenant = %(trader_scope_tenant)s"
        with patch.object(inventory_api, "resolve_active_company", return_value="Company A"), patch.object(
            inventory_api.frappe.db, "exists", return_value=True
        ), patch.object(inventory_api.frappe, "get_cached_value", return_value="Company A"), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=(condition, {"trader_scope_tenant": "TNT-A"}),
        ), patch.object(
            inventory_api.frappe.db, "sql", return_value=[]
        ) as sql:
            inventory_api.get_items_qoh(["ITEM-A", "ITEM-B"], "WH-A", "Company A")
        self.assertIn("INNER JOIN `tabItem` i", sql.call_args.args[0])
        self.assertIn(condition, sql.call_args.args[0])
        self.assertEqual(sql.call_args.args[1]["trader_scope_tenant"], "TNT-A")

    def test_item_sales_report_filters_the_count_and_rows_by_company_tenant(self):
        condition = "i.trader_tenant = %(company_scope_tenant)s"
        with patch.object(reports_api, "resolve_active_company", return_value="Company A"), patch.object(
            reports_api, "nowdate", return_value="2026-10-04"
        ), patch.object(reports_api, "add_months", return_value="2025-10-04"), patch.object(
            reports_api, "cint", side_effect=lambda value: int(value or 0)
        ), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=(condition, {"company_scope_tenant": "TNT-A"}),
        ), patch.object(
            reports_api.frappe.db, "sql", side_effect=[[(0,)], []]
        ) as sql:
            reports_api.get_item_sales_report(company="Company A")
        self.assertEqual(sql.call_count, 2)
        for call in sql.call_args_list:
            self.assertIn("INNER JOIN `tabItem` i", call.args[0])
            self.assertIn(condition, call.args[0])

    def test_receivables_aging_summary_filters_customers_by_company_tenant(self):
        condition = "c.trader_tenant = %(company_scope_tenant)s"
        with patch.object(reports_api, "resolve_active_company", return_value="Company A"), patch.object(
            reports_api, "nowdate", return_value="2026-10-04"
        ), patch(
            "trader_app.api.permissions.company_master_sql_filter",
            return_value=(condition, {"company_scope_tenant": "TNT-A"}),
        ), patch.object(
            reports_api.frappe.db, "sql", return_value=[{}]
        ) as sql:
            reports_api.get_receivable_aging("Company A")
        self.assertIn("INNER JOIN `tabCustomer` c", sql.call_args.args[0])
        self.assertIn(condition, sql.call_args.args[0])
        self.assertEqual(sql.call_args.args[1]["company_scope_tenant"], "TNT-A")

    def test_company_master_scope_uses_company_tenant_for_platform_jobs(self):
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ):
            condition, params = permissions_api.company_master_sql_filter("i", "Company A", "Administrator")
        self.assertEqual(condition, "i.trader_tenant = %(company_scope_tenant)s")
        self.assertEqual(params["company_scope_tenant"], "TNT-A")

    def test_company_master_scope_fails_closed_for_unassigned_multitenant_company(self):
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value=None
        ), patch.object(permissions_api, "is_multitenant_enabled", return_value=True):
            condition, params = permissions_api.company_master_sql_filter("i", "Company A", "Administrator")
        self.assertEqual(condition, "1=0")
        self.assertEqual(params, {})

    def test_transaction_cannot_use_another_tenants_company(self):
        doc = SimpleNamespace(company="Company B", get_all_children=lambda: [])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-B"
        ), patch.object(permissions_api, "get_user_tenant_name", return_value="TNT-A"), patch.object(
            permissions_api.frappe, "get_all"
        ) as get_all:
            with self.assertRaises(Exception):
                permissions_api.validate_transaction_master_tenants(doc)
        get_all.assert_not_called()

    def test_opening_balance_reduction_requires_party_write_permission(self):
        party = MagicMock()
        party.check_permission.side_effect = Exception("denied")
        with patch.object(daybook_api.frappe.db, "has_column", return_value=True), patch.object(
            daybook_api.frappe, "get_doc", return_value=party
        ), patch.object(daybook_api.frappe.db, "set_value") as set_value:
            with self.assertRaises(Exception):
                daybook_api._reduce_opening_balance("Customer", "CUSTOMER-B", 10)
        set_value.assert_not_called()

    def test_customer_transaction_lookup_checks_customer_scope_first(self):
        customer = MagicMock()
        customer.check_permission.side_effect = Exception("denied")
        with patch.object(customers_api.frappe, "get_doc", return_value=customer), patch.object(
            customers_api, "resolve_active_company"
        ) as resolve_company, patch.object(customers_api.frappe.db, "sql") as sql:
            with self.assertRaises(Exception):
                customers_api.get_customer_transactions("CUSTOMER-B")
        resolve_company.assert_not_called()
        sql.assert_not_called()

    def test_supplier_transaction_lookup_checks_supplier_scope_first(self):
        supplier = MagicMock()
        supplier.check_permission.side_effect = Exception("denied")
        with patch.object(suppliers_api.frappe, "get_doc", return_value=supplier), patch.object(
            suppliers_api, "resolve_active_company"
        ) as resolve_company, patch.object(suppliers_api.frappe.db, "sql") as sql:
            with self.assertRaises(Exception):
                suppliers_api.get_supplier_transactions("SUPPLIER-B")
        resolve_company.assert_not_called()
        sql.assert_not_called()

    def test_finance_party_resolver_checks_permission_before_returning_party(self):
        party = MagicMock()
        party.check_permission.side_effect = Exception("denied")
        with patch.object(finance_api.frappe.db, "exists", return_value=True), patch.object(
            finance_api.frappe, "get_doc", return_value=party
        ):
            with self.assertRaises(Exception):
                finance_api._resolve_party("Customer", "CUSTOMER-B")
        party.check_permission.assert_called_once_with("read")

    def test_item_bundle_list_requires_doctype_read_permission(self):
        with patch.object(bundling_api.frappe, "has_permission", return_value=False), patch.object(
            bundling_api.frappe.db, "sql"
        ) as sql:
            with self.assertRaises(Exception):
                bundling_api.get_item_bundles()
        sql.assert_not_called()

    def test_item_bundle_detail_checks_read_permission(self):
        doc = MagicMock()
        doc.check_permission.side_effect = Exception("denied")
        with patch.object(bundling_api.frappe.db, "exists", return_value=True), patch.object(
            bundling_api.frappe, "get_doc", return_value=doc
        ):
            with self.assertRaises(Exception):
                bundling_api.get_item_bundle_detail("BDL-0001")
        doc.check_permission.assert_called_once_with("read")

    def test_bundle_cannot_reference_another_tenants_item(self):
        doc = MagicMock(trader_tenant="TNT-A")
        doc.is_new.return_value = True
        doc.get.return_value = [MagicMock(item_code="ITEM-B")]
        with patch.object(permissions_api.frappe.db, "get_value", return_value="TNT-B"):
            with self.assertRaises(Exception):
                permissions_api.validate_item_bundle_tenant(doc)

    def test_transaction_rejects_item_from_another_tenant(self):
        doc = SimpleNamespace(company="Company A", get_all_children=lambda: [SimpleNamespace(item_code="ITEM-B")])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ), patch.object(
            permissions_api.frappe,
            "get_all",
            return_value=[SimpleNamespace(name="ITEM-B", trader_tenant="TNT-B")],
        ):
            with self.assertRaises(Exception):
                permissions_api.validate_transaction_master_tenants(doc)

    def test_transaction_accepts_item_from_same_tenant(self):
        doc = SimpleNamespace(company="Company A", get_all_children=lambda: [SimpleNamespace(item_code="ITEM-A")])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ), patch.object(
            permissions_api.frappe,
            "get_all",
            return_value=[SimpleNamespace(name="ITEM-A", trader_tenant="TNT-A")],
        ):
            permissions_api.validate_transaction_master_tenants(doc)

    def test_transaction_rejects_customer_from_another_tenant(self):
        doc = SimpleNamespace(company="Company A", customer="CUSTOMER-B", get_all_children=lambda: [])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ), patch.object(
            permissions_api.frappe,
            "get_all",
            return_value=[SimpleNamespace(name="CUSTOMER-B", trader_tenant="TNT-B")],
        ):
            with self.assertRaises(Exception):
                permissions_api.validate_transaction_master_tenants(doc)

    def test_transaction_rejects_supplier_from_another_tenant(self):
        doc = SimpleNamespace(company="Company A", supplier="SUPPLIER-B", get_all_children=lambda: [])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ), patch.object(
            permissions_api.frappe,
            "get_all",
            return_value=[SimpleNamespace(name="SUPPLIER-B", trader_tenant="TNT-B")],
        ):
            with self.assertRaises(Exception):
                permissions_api.validate_transaction_master_tenants(doc)

    def test_transaction_rejects_warehouse_from_another_company(self):
        doc = SimpleNamespace(company="Company A", get_all_children=lambda: [SimpleNamespace(warehouse="WH-B")])
        with patch.object(permissions_api.frappe.db, "has_column", return_value=True), patch.object(
            permissions_api.frappe.db, "get_value", return_value="TNT-A"
        ), patch.object(
            permissions_api.frappe,
            "get_all",
            return_value=[SimpleNamespace(name="WH-B", company="Company B")],
        ):
            with self.assertRaises(Exception):
                permissions_api.validate_transaction_master_tenants(doc)

    def test_hooks_register_tenant_guards_for_shared_masters_and_bundles(self):
        for doctype in ("Customer", "Supplier", "Item", "Item Bundle"):
            self.assertEqual(
                app_hooks.has_permission[doctype],
                "trader_app.api.permissions.master_document_permission",
            )
            self.assertIn(doctype, app_hooks.permission_query_conditions)
            self.assertIn("validate", app_hooks.doc_events[doctype])

    def test_hooks_register_transaction_tenant_validation(self):
        for doctype in (
            "Sales Invoice",
            "Purchase Invoice",
            "Payment Entry",
            "Journal Entry",
            "Quotation",
            "Sales Order",
            "Delivery Note",
            "Purchase Order",
            "Purchase Receipt",
            "POS Invoice",
            "Stock Reconciliation",
            "Landed Cost Voucher",
            "Stock Entry",
        ):
            validate = app_hooks.doc_events[doctype]["validate"]
            handlers = validate if isinstance(validate, list) else [validate]
            self.assertIn(
                "trader_app.api.permissions.validate_transaction_master_tenants",
                handlers,
            )


class AdminApiTenantAuthorizationTests(unittest.TestCase):
    def test_user_detail_denies_unassigned_platform_user_to_tenant_admin(self):
        user = MagicMock()
        user.trader_tenant = None
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe, "get_doc", return_value=user):
            with self.assertRaises(Exception):
                admin_api.get_user_detail("platform-admin@example.com")

    def test_update_user_denies_platform_role_escalation(self):
        user = MagicMock()
        user.trader_tenant = "TNT-A"
        user.roles = []
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe, "get_doc", return_value=user):
            with self.assertRaises(Exception):
                admin_api.update_user({"name": "user-a@example.com", "roles": ["Trader Super Admin"]})
        user.save.assert_not_called()

    def test_assign_role_denies_platform_role_to_tenant_admin(self):
        user = MagicMock()
        user.trader_tenant = "TNT-A"
        user.roles = []
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe, "get_doc", return_value=user):
            with self.assertRaises(Exception):
                admin_api.assign_role_to_user("user-a@example.com", "System Manager")
        user.append.assert_not_called()
        user.save.assert_not_called()

    def test_remove_role_denies_foreign_tenant_user(self):
        user = MagicMock()
        user.trader_tenant = "TNT-B"
        user.roles = [MagicMock(role="Trader User")]
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe, "get_doc", return_value=user):
            with self.assertRaises(Exception):
                admin_api.remove_role_from_user("user-b@example.com", "Trader User")
        user.save.assert_not_called()

    def test_set_user_enabled_denies_foreign_tenant_user(self):
        user = MagicMock()
        user.trader_tenant = "TNT-B"
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe, "get_doc", return_value=user), patch.object(
            admin_api.frappe.db, "set_value"
        ) as set_value:
            with self.assertRaises(Exception):
                admin_api.set_user_enabled("user-b@example.com", 0)
        set_value.assert_not_called()

    def test_create_user_denies_system_manager_role_to_tenant_admin(self):
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api, "assert_user_limit"), patch.object(
            admin_api.frappe.db, "exists", return_value=False
        ), patch.object(
            admin_api.frappe, "new_doc"
        ) as new_doc:
            with self.assertRaises(Exception):
                admin_api.create_user({"email": "new@example.com", "first_name": "New", "roles": ["System Manager"]})
        new_doc.assert_not_called()

    def test_role_user_list_is_filtered_to_active_tenant(self):
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe.db, "sql", return_value=[]) as sql:
            admin_api.get_role_users("Trader User")
        self.assertIn("u.trader_tenant = %s", sql.call_args.args[0])
        self.assertEqual(sql.call_args.args[1], ("Trader User", "TNT-A"))

    def test_role_list_hides_platform_roles_from_tenant_admin(self):
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api.frappe.db, "sql", return_value=[]) as sql:
            admin_api.get_all_roles()
        query = sql.call_args.args[0]
        self.assertIn("System Manager", query)
        self.assertIn("Trader Super Admin", query)

    def test_accounting_settings_require_platform_admin(self):
        with patch.object(admin_api, "_require_platform_admin", side_effect=Exception("denied")), patch.object(
            admin_api.frappe, "get_doc"
        ) as get_doc:
            with self.assertRaises(Exception):
                admin_api.get_accounting_settings()
        get_doc.assert_not_called()

    def test_platform_admin_guard_denies_business_admin(self):
        with patch.object(admin_api.frappe, "session", SimpleNamespace(user="tenant-admin@example.com")), patch.object(
            admin_api.frappe, "get_roles", return_value=["Trader Admin"]
        ), patch.object(admin_api, "is_super_admin", return_value=False):
            with self.assertRaises(Exception):
                admin_api._require_platform_admin()

    def test_warehouse_update_resolves_the_document_company(self):
        warehouse = MagicMock()
        warehouse.company = "Company B"
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_parse", return_value={"name": "WH-B", "city": "Other"}
        ), patch.object(admin_api.frappe, "get_doc", return_value=warehouse), patch.object(
            admin_api, "resolve_active_company", side_effect=Exception("denied")
        ) as resolve_company:
            with self.assertRaises(Exception):
                admin_api.update_warehouse({"name": "WH-B", "city": "Other"})
        resolve_company.assert_called_once_with("Company B")
        warehouse.save.assert_not_called()

    def test_tenant_admin_cannot_update_companyless_warehouse(self):
        warehouse = MagicMock()
        warehouse.company = None
        with patch.object(admin_api, "_require_admin"), patch.object(
            admin_api, "_admin_tenant_scope", return_value="TNT-A"
        ), patch.object(admin_api, "_parse", return_value={"name": "WH-ROOT", "city": "Other"}), patch.object(
            admin_api.frappe, "get_doc", return_value=warehouse
        ), patch.object(
            admin_api, "resolve_active_company"
        ) as resolve_company:
            with self.assertRaises(Exception):
                admin_api.update_warehouse({"name": "WH-ROOT", "city": "Other"})
        resolve_company.assert_not_called()
        warehouse.save.assert_not_called()


class CrossTenantCompanyIsolationTests(unittest.TestCase):
    def test_company_permission_names_include_only_explicit_documents(self):
        permissions = {
            "Company": [
                {"doc": "Company A"},
                {"doc": "Company B"},
                {"doc": ""},
            ]
        }
        self.assertEqual(
            company_api._company_names_from_user_permissions(permissions),
            {"Company A", "Company B"},
        )

    def test_no_company_user_permission_preserves_erpnext_unrestricted_semantics(self):
        self.assertIsNone(company_api._company_names_from_user_permissions({"Customer": [{"doc": "C-1"}]}))

    def test_empty_company_user_permission_fails_closed(self):
        self.assertEqual(company_api._company_names_from_user_permissions({"Company": []}), set())

    def test_business_user_only_sees_own_tenant_companies(self):
        with patch.object(company_api, "is_multitenant_enabled", return_value=True), patch.object(
            company_api, "is_super_admin", return_value=False
        ), patch.object(company_api, "get_user_tenant_name", return_value="TNT-A"), patch.object(
            company_api, "get_tenant_companies", return_value=["Acme Co"]
        ), patch.object(
            company_api, "_user_permission_companies", return_value=None
        ), patch.object(
            company_api.frappe, "get_all", return_value=["Acme Co", "Rival Co"]
        ):
            permitted = company_api.get_permitted_company_names("user-a@test.com")
            self.assertEqual(permitted, ["Acme Co"])
            self.assertNotIn("Rival Co", permitted)

    def test_explicit_company_user_permission_restricts_company_switch(self):
        with patch.object(company_api, "is_multitenant_enabled", return_value=False), patch.object(
            company_api, "_user_permission_companies", return_value={"Company A"}
        ), patch.object(company_api.frappe, "get_all", return_value=["Company A", "Company B"]):
            permitted = company_api.get_permitted_company_names("restricted@test.com")
            self.assertEqual(permitted, ["Company A"])
            self.assertNotIn("Company B", permitted)

    def test_company_user_permission_rejects_direct_foreign_company_request(self):
        with patch.object(company_api, "is_multitenant_enabled", return_value=False), patch.object(
            company_api, "_user_permission_companies", return_value={"Company A"}
        ), patch.object(company_api, "get_active_company_name", return_value="Company A"), patch.object(
            company_api.frappe, "get_all", return_value=["Company A", "Company B"]
        ), patch.object(
            company_api.frappe.db, "exists", return_value=True
        ):
            with self.assertRaises(Exception):
                company_api.resolve_active_company("Company B", user="restricted@test.com")

    def test_resolve_active_company_rejects_foreign_company(self):
        with patch.object(company_api, "get_active_company_name", return_value="Rival Co"), patch.object(
            tenant_api.frappe, "db"
        ) as db, patch.object(company_api, "get_permitted_company_names", return_value=["Acme Co"]):
            db.exists.return_value = True
            with self.assertRaises(Exception):
                company_api.resolve_active_company("Rival Co", user="user-a@test.com")

    def test_assert_company_belongs_to_tenant_blocks_mismatch(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=True), patch.object(
            tenant_api, "is_super_admin", return_value=False
        ), patch.object(tenant_api, "get_user_tenant_name", return_value="TNT-A"), patch.object(
            tenant_api.frappe.db, "get_value", return_value="TNT-B"
        ):
            with self.assertRaises(Exception):
                tenant_api.assert_company_belongs_to_tenant("Acme Co", "TNT-A", user="user-a@test.com")


class CrossTenantUserScopeTests(unittest.TestCase):
    def test_admin_tenant_scope_returns_assigned_tenant(self):
        with patch.object(admin_api, "is_multitenant_enabled", return_value=True), patch.object(
            admin_api, "is_super_admin", return_value=False
        ), patch.object(admin_api, "resolve_active_tenant", return_value="TNT-A"):
            self.assertEqual(admin_api._admin_tenant_scope(), "TNT-A")

    def test_platform_super_admin_without_tenant_has_no_scope(self):
        with patch.object(admin_api, "is_multitenant_enabled", return_value=True), patch.object(
            admin_api, "is_super_admin", return_value=True
        ), patch.object(admin_api, "get_user_tenant_name", return_value=None):
            self.assertIsNone(admin_api._admin_tenant_scope())


class CrossTenantAccessControlTests(unittest.TestCase):
    def test_business_user_cannot_resolve_foreign_tenant(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=True), patch.object(
            tenant_api, "is_super_admin", return_value=False
        ), patch.object(tenant_api, "get_user_tenant_name", return_value="TNT-A"), patch.object(
            tenant_api, "assert_tenant_active"
        ):
            with self.assertRaises(Exception):
                tenant_api.resolve_active_tenant(tenant="TNT-B", user="user-a@test.com")

    def test_super_admin_may_resolve_explicit_tenant(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=True), patch.object(
            tenant_api, "is_super_admin", return_value=True
        ), patch.object(tenant_api, "get_user_tenant_name", return_value=None), patch.object(
            tenant_api.frappe.db, "exists", return_value=True
        ):
            tenant = tenant_api.resolve_active_tenant(tenant="TNT-B", user="admin@test.com")
            self.assertEqual(tenant, "TNT-B")

    def test_blocked_tenant_status_raises(self):
        with patch.object(tenant_api.frappe.db, "get_value", return_value="Suspended"):
            with self.assertRaises(Exception):
                tenant_api.assert_tenant_active("TNT-A")


class ModuleIsolationTests(unittest.TestCase):
    def test_disabled_module_blocks_api_access(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=True), patch.object(
            tenant_api, "resolve_active_tenant", return_value="TNT-A"
        ), patch.object(tenant_api, "get_enabled_module_keys", return_value=["dashboard", "settings"]):
            with self.assertRaises(Exception):
                tenant_api.assert_tenant_module_enabled("sales")

    def test_set_tenant_modules_always_includes_core_modules(self):
        class TenantDoc:
            def __init__(self):
                self.enabled_modules = []

            def append(self, field, row):
                self.enabled_modules.append(row)

            def save(self, ignore_permissions=False):
                pass

        doc = TenantDoc()

        with patch.object(super_admin_api, "_require_super_admin"), patch.object(
            super_admin_api, "_ensure_multitenant"
        ), patch("trader_app.api.super_admin.frappe.get_doc", return_value=doc), patch.object(
            super_admin_api, "sync_tenant_modules_to_company"
        ), patch.object(
            super_admin_api, "log_tenant_action"
        ), patch(
            "trader_app.api.super_admin.frappe.db.commit"
        ), patch.object(
            super_admin_api, "get_enabled_module_keys", return_value=["dashboard", "settings", "sales"]
        ):
            result = super_admin_api.set_tenant_modules("TNT-A", modules=["sales"])
            enabled_keys = {row["module_key"] for row in doc.enabled_modules if row.get("enabled")}
            self.assertIn("dashboard", enabled_keys)
            self.assertIn("settings", enabled_keys)
            self.assertIn("sales", enabled_keys)
            self.assertIn("dashboard", result["enabled_modules"])

    def test_apply_components_daybook_profile_sets_modules_and_prefs(self):
        class TenantDoc:
            def __init__(self):
                self.enabled_modules = []
                self.workflow_prefs = {}

            def append(self, field, row):
                self.enabled_modules.append(row)

            def save(self, ignore_permissions=False):
                pass

        doc = TenantDoc()

        with patch.object(tenant_api.frappe.db, "exists", return_value=True), patch(
            "trader_app.api.tenant.frappe.get_doc", return_value=doc
        ), patch.object(tenant_api, "sync_tenant_modules_to_company"), patch.object(
            tenant_api, "get_enabled_module_keys", return_value=list(tenant_api.COMPONENTS_DAYBOOK_MODULES)
        ):
            result = tenant_api.apply_components_daybook_profile("TNT-0001")
            enabled_keys = {row["module_key"] for row in doc.enabled_modules if row.get("enabled")}
            self.assertIn("components", enabled_keys)
            self.assertIn("customers", enabled_keys)
            self.assertNotIn("pos", enabled_keys)
            self.assertNotIn("operations", enabled_keys)
            self.assertEqual(doc.workflow_prefs.get("nav_profile"), "components_daybook")
            self.assertIn("quotations", doc.workflow_prefs.get("hide_nav") or [])
            self.assertTrue(result["ok"])


class AuditLogIsolationTests(unittest.TestCase):
    def test_business_audit_log_scoped_to_active_tenant(self):
        with patch.object(admin_api, "_require_admin"), patch.object(
            tenant_api, "is_multitenant_enabled", return_value=True
        ), patch.object(tenant_api, "resolve_active_tenant", return_value="TNT-A"), patch.object(
            tenant_api,
            "_audit_log_rows",
            return_value={"data": [{"name": "LOG-1"}], "total": 1, "page": 1, "page_size": 20},
        ) as audit_rows:
            result = tenant_api.get_business_tenant_audit_log(page=1, page_size=20)
            audit_rows.assert_called_once_with("TNT-A", page=1, page_size=20)
            self.assertEqual(result["total"], 1)

    def test_user_cannot_access_other_tenant(self):
        with patch.object(tenant_api, "is_super_admin", return_value=False):
            self.assertFalse(tenant_api.user_can_access_tenant("TNT-B", user="user-a@test.com"))


class DashboardCompanyAuthorizationTests(unittest.TestCase):
    def test_dashboard_reads_propagate_company_access_denials(self):
        endpoints = (
            dashboard_api.get_kpis,
            dashboard_api.get_sales_trend,
            dashboard_api.get_top_customers,
            dashboard_api.get_recent_orders,
        )

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint.__name__), patch.object(
                dashboard_api,
                "resolve_active_company",
                side_effect=dashboard_api.frappe.PermissionError("Company access denied"),
            ):
                with self.assertRaises(dashboard_api.frappe.PermissionError):
                    endpoint(company="Company B")


if __name__ == "__main__":
    unittest.main()
