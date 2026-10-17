# -*- coding: utf-8 -*-
"""Live Company User Permission probes against two real ERPNext companies."""

from __future__ import unicode_literals

import unittest
import uuid
from unittest.mock import patch

try:
    import frappe
    from frappe.tests.utils import FrappeTestCase

    FRAPPE_SITE_ACTIVE = bool(getattr(getattr(frappe, "local", None), "site", None))
except (ImportError, ModuleNotFoundError):
    frappe = None
    FrappeTestCase = unittest.TestCase
    FRAPPE_SITE_ACTIVE = False


@unittest.skipUnless(FRAPPE_SITE_ACTIVE, "requires an initialized Frappe site")
class LiveCompanyIsolationTests(FrappeTestCase):
    def test_restricted_user_cannot_list_select_or_report_foreign_company(self):
        from trader_app.api import company as company_api
        from trader_app.api import catalog as catalog_api
        from trader_app.api import dashboard, reports
        from trader_app.demo.seed_engine.config import DEMO_CONFIG

        company_a = DEMO_CONFIG["company_name"]
        token = uuid.uuid4().hex[:6].upper()
        company_b_name = "QA Foreign Company " + token
        user_email = "qa-isolation-" + token.lower() + "@example.invalid"
        old_multitenant_setting = frappe.conf.get("trader_multitenant_enabled")
        had_multitenant_setting = "trader_multitenant_enabled" in frappe.conf

        try:
            # This probe isolates Company User Permission behavior from the
            # separate tenant-membership gate, which has its own unit coverage.
            frappe.conf["trader_multitenant_enabled"] = 0
            company_b = frappe.get_doc(
                {
                    "doctype": "Company",
                    "company_name": company_b_name,
                    "abbr": "Q" + token[:3],
                    "country": "Pakistan",
                    "default_currency": "PKR",
                    "chart_of_accounts": "Standard",
                }
            ).insert(ignore_permissions=True)
            user = frappe.get_doc(
                {
                    "doctype": "User",
                    "email": user_email,
                    "first_name": "QA",
                    "last_name": "Isolation",
                    "user_type": "System User",
                    "send_welcome_email": 0,
                    "roles": [{"role": "Trader Viewer"}],
                }
            ).insert(ignore_permissions=True)
            frappe.get_doc(
                {
                    "doctype": "User Permission",
                    "user": user.name,
                    "allow": "Company",
                    "for_value": company_a,
                    "apply_to_all_doctypes": 1,
                }
            ).insert(ignore_permissions=True)
            frappe.defaults.set_user_default("Company", company_a, user.name)
            frappe.clear_cache(user=user.name)
            frappe.set_user(user.name)

            visible_companies = {row.name for row in company_api.get_companies()}
            self.assertEqual(visible_companies, {company_a})

            with self.assertRaises(Exception):
                company_api.set_active_company(company_b.name)
            with self.assertRaises(Exception):
                dashboard.get_kpis(company=company_b.name)
            with self.assertRaises(Exception):
                reports.get_sales_report(company=company_b.name)
            with self.assertRaises(Exception):
                frappe.get_doc("Company", company_b.name).check_permission("read")

            # Trader Viewer has the broad component view capability, but must
            # not be able to mutate Company taxonomy or create Items. Mock the
            # explicit persistence calls on the taxonomy path so this probe
            # cannot change the existing QA Company's configuration if the
            # authorization regression ever returns.
            with patch.object(frappe.db, "set_value") as set_value, patch.object(
                frappe.db, "commit"
            ) as commit:
                with self.assertRaises(frappe.PermissionError):
                    catalog_api.ensure_taxonomy_values(
                        category="QA Restricted " + token,
                        form_factor="Denied",
                        company=company_a,
                    )
                with self.assertRaises(frappe.PermissionError):
                    catalog_api.save_sku_taxonomy(
                        {"QA Restricted " + token: {"form_factors": ["Denied"]}},
                        company=company_a,
                    )
                set_value.assert_not_called()
                commit.assert_not_called()

            category = "QA Restricted " + token
            self.assertFalse(frappe.has_permission("Item", ptype="create"))
            with patch.object(catalog_api, "_assert_enabled"):
                with self.assertRaises(frappe.PermissionError):
                    catalog_api.find_or_create_sku(
                        category,
                        "Desktop",
                        "8-Core",
                        "New",
                        company=company_a,
                    )
            self.assertFalse(frappe.db.exists("Item Group", category))
        finally:
            frappe.set_user("Administrator")
            if had_multitenant_setting:
                frappe.conf["trader_multitenant_enabled"] = old_multitenant_setting
            else:
                frappe.conf.pop("trader_multitenant_enabled", None)


if __name__ == "__main__":
    unittest.main()
