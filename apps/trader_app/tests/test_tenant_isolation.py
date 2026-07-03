# -*- coding: utf-8 -*-
"""Cross-tenant isolation tests (mock Frappe — no bench site required).

Run on bench when available:
  bench --site <site> run-tests --app trader_app --module trader_app.tests.test_tenant_isolation
"""

from __future__ import unicode_literals

import sys
import unittest
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
    frappe_stub.PermissionError = type("PermissionError", (Exception,), {})
    frappe_stub.whitelist = _whitelist
    frappe_stub.session = MagicMock(user="user-a@test.com")
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

from trader_app.api import admin as admin_api
from trader_app.api import company as company_api
from trader_app.api import super_admin as super_admin_api
from trader_app.api import tenant as tenant_api


class CrossTenantCompanyIsolationTests(unittest.TestCase):
    def test_business_user_only_sees_own_tenant_companies(self):
        with patch.object(company_api, "is_multitenant_enabled", return_value=True), patch.object(
            company_api, "is_super_admin", return_value=False
        ), patch.object(company_api, "get_user_tenant_name", return_value="TNT-A"), patch.object(
            company_api, "get_tenant_companies", return_value=["Acme Co"]
        ), patch.object(
            company_api.frappe, "get_all", return_value=["Acme Co", "Rival Co"]
        ):
            permitted = company_api.get_permitted_company_names("user-a@test.com")
            self.assertEqual(permitted, ["Acme Co"])
            self.assertNotIn("Rival Co", permitted)

    def test_resolve_active_company_rejects_foreign_company(self):
        with patch.object(company_api, "get_active_company_name", return_value="Rival Co"), patch.object(
            tenant_api.frappe, "db"
        ) as db, patch.object(
            company_api, "get_permitted_company_names", return_value=["Acme Co"]
        ):
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
        ), patch.object(tenant_api.frappe.db, "exists", return_value=True):
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
        ), patch(
            "trader_app.api.super_admin.frappe.get_doc", return_value=doc
        ), patch.object(super_admin_api, "sync_tenant_modules_to_company"), patch.object(
            super_admin_api, "log_tenant_action"
        ), patch("trader_app.api.super_admin.frappe.db.commit"), patch.object(
            super_admin_api, "get_enabled_module_keys", return_value=["dashboard", "settings", "sales"]
        ):
            result = super_admin_api.set_tenant_modules("TNT-A", modules=["sales"])
            enabled_keys = {row["module_key"] for row in doc.enabled_modules if row.get("enabled")}
            self.assertIn("dashboard", enabled_keys)
            self.assertIn("settings", enabled_keys)
            self.assertIn("sales", enabled_keys)
            self.assertIn("dashboard", result["enabled_modules"])


class AuditLogIsolationTests(unittest.TestCase):
    def test_business_audit_log_scoped_to_active_tenant(self):
        with patch.object(admin_api, "_require_admin"), patch.object(
            tenant_api, "is_multitenant_enabled", return_value=True
        ), patch.object(tenant_api, "resolve_active_tenant", return_value="TNT-A"), patch.object(
            tenant_api, "_audit_log_rows", return_value={"data": [{"name": "LOG-1"}], "total": 1, "page": 1, "page_size": 20}
        ) as audit_rows:
            result = tenant_api.get_business_tenant_audit_log(page=1, page_size=20)
            audit_rows.assert_called_once_with("TNT-A", page=1, page_size=20)
            self.assertEqual(result["total"], 1)

    def test_user_cannot_access_other_tenant(self):
        with patch.object(tenant_api, "is_super_admin", return_value=False):
            self.assertFalse(tenant_api.user_can_access_tenant("TNT-B", user="user-a@test.com"))


if __name__ == "__main__":
    unittest.main()
