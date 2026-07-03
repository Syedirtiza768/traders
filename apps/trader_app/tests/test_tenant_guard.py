# -*- coding: utf-8 -*-
"""Unit tests for tenant module guards (no Frappe site required)."""

from __future__ import unicode_literals

import sys
import unittest
from unittest.mock import MagicMock, patch

# Minimal frappe stub so trader_app.api modules can import.
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
    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.utils"] = MagicMock()
else:
    import frappe as _frappe_mod

    def _whitelist(fn=None, **kwargs):
        if fn is not None:
            return fn
        return lambda f: f

    _frappe_mod.whitelist = _whitelist

from trader_app.api._tenant_guard import apply_module_guards, EXEMPT_HANDLER_NAMES
from trader_app.api import company as company_api
from trader_app.api import tenant as tenant_api


class TenantGuardTests(unittest.TestCase):
    def test_apply_module_guards_wraps_whitelisted_handlers(self):
        calls = []
        module_name = "test_module_guards_sample"

        def sample_handler():
            calls.append("ran")
            return "ok"

        sample_handler.whitelisted = True
        sample_handler.__module__ = module_name

        namespace = {"sample_handler": sample_handler, "__name__": module_name}

        with patch("trader_app.api._tenant_guard.assert_tenant_module_enabled") as guard:
            apply_module_guards(namespace, "sales")
            self.assertEqual(namespace["sample_handler"](), "ok")
            guard.assert_called_once_with("sales")
            self.assertEqual(calls, ["ran"])

    def test_apply_module_guards_skips_exempt_handlers(self):
        module_name = "test_module_guards_exempt"

        def get_settings():
            return {}

        get_settings.whitelisted = True
        get_settings.__module__ = module_name

        namespace = {"get_settings": get_settings, "__name__": module_name}
        original = namespace["get_settings"]

        with patch("trader_app.api._tenant_guard.assert_tenant_module_enabled") as guard:
            apply_module_guards(namespace, "settings")
            self.assertIs(namespace["get_settings"], original)
            guard.assert_not_called()

    def test_exempt_handler_names_include_boot_endpoints(self):
        self.assertIn("get_multitenant_status", EXEMPT_HANDLER_NAMES)
        self.assertIn("get_settings", EXEMPT_HANDLER_NAMES)
        self.assertIn("refresh_dashboard_cache", EXEMPT_HANDLER_NAMES)


class TenantModuleLogicTests(unittest.TestCase):
    def test_get_permitted_company_names_filters_by_tenant(self):
        with patch.object(company_api, "is_multitenant_enabled", return_value=True), patch.object(
            company_api, "is_super_admin", return_value=False
        ), patch.object(company_api, "get_user_tenant_name", return_value="TNT-00001"), patch.object(
            company_api, "get_tenant_companies", return_value=["Acme Co"]
        ), patch.object(
            company_api.frappe, "get_all", return_value=["Acme Co", "Other Co"]
        ):
            permitted = company_api.get_permitted_company_names("user@test.com")
            self.assertEqual(permitted, ["Acme Co"])

    def test_multitenant_disabled_skips_module_assertion(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=False):
            tenant_api.assert_tenant_module_enabled("sales")

    def test_multitenant_enabled_blocks_disabled_module(self):
        with patch.object(tenant_api, "is_multitenant_enabled", return_value=True), patch.object(
            tenant_api, "resolve_active_tenant", return_value="TNT-00001"
        ), patch.object(tenant_api, "get_enabled_module_keys", return_value=["dashboard"]):
            with self.assertRaises(Exception):
                tenant_api.assert_tenant_module_enabled("sales")

    def test_get_enabled_module_keys_fallback(self):
        with patch.object(tenant_api.frappe, "get_all", return_value=[]):
            keys = tenant_api.get_enabled_module_keys("TNT-00001")
            self.assertIn("sales", keys)
            self.assertIn("dashboard", keys)

    def test_is_super_admin_roles(self):
        with patch.object(tenant_api.frappe, "get_roles", return_value=["Trader Super Admin"]):
            self.assertTrue(tenant_api.is_super_admin("admin@test.com"))


if __name__ == "__main__":
    unittest.main()
