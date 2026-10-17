# -*- coding: utf-8 -*-
"""Regression tests for destructive demo tooling safeguards."""

from __future__ import unicode_literals

import sys
import unittest
from unittest.mock import MagicMock, patch

if "frappe" not in sys.modules:
    sys.modules["frappe"] = MagicMock()
if "frappe.utils" not in sys.modules:
    sys.modules["frappe.utils"] = MagicMock()

from trader_app.demo import uninstall_demo
from trader_app.demo.installer import main as demo_installer


class DemoInstallerSafetyTests(unittest.TestCase):
    def setUp(self):
        self.installer = demo_installer.DemoInstaller(config={"company_name": "Disposable Demo Co"})

    def test_demo_seed_requires_explicit_disposable_site_opt_in(self):
        with patch.object(demo_installer.frappe, "conf", {}, create=True), patch.object(
            demo_installer.frappe, "throw", side_effect=RuntimeError("blocked")
        ), patch.object(demo_installer.frappe.db, "count") as count:
            with self.assertRaisesRegex(RuntimeError, "blocked"):
                self.installer._assert_install_target()

        count.assert_not_called()

    def test_demo_seed_rejects_any_existing_company(self):
        with patch.object(demo_installer.frappe, "conf", {"allow_demo_seed": True}, create=True), patch.object(
            demo_installer.frappe.db,
            "count",
            side_effect=lambda doctype: int(doctype == "Company"),
        ), patch.object(demo_installer.frappe, "throw", side_effect=RuntimeError("has companies")), patch.object(
            demo_installer.frappe.db, "exists"
        ) as exists:
            with self.assertRaisesRegex(RuntimeError, "has companies"):
                self.installer._assert_install_target()

        exists.assert_not_called()

    def test_demo_seed_allows_only_a_marked_empty_site(self):
        with patch.object(demo_installer.frappe, "conf", {"allow_demo_seed": True}, create=True), patch.object(
            demo_installer.frappe.db, "count", return_value=0
        ), patch.object(demo_installer.frappe.db, "exists", return_value=False):
            self.installer._assert_install_target()

    def test_demo_seed_rejects_any_existing_transactional_data(self):
        with patch.object(demo_installer.frappe, "conf", {"allow_demo_seed": True}, create=True), patch.object(
            demo_installer.frappe.db, "exists", return_value=False
        ), patch.object(
            demo_installer.frappe.db,
            "count",
            side_effect=lambda doctype: int(doctype == "Journal Entry"),
        ), patch.object(
            demo_installer.frappe, "throw", side_effect=RuntimeError("not empty")
        ):
            with self.assertRaisesRegex(RuntimeError, "not empty"):
                self.installer._assert_install_target()

    def test_demo_uninstaller_fails_without_deleting_records(self):
        with patch.object(demo_installer.frappe, "throw", side_effect=RuntimeError("disabled")), patch.object(
            demo_installer.frappe.db, "sql"
        ) as sql:
            with self.assertRaisesRegex(RuntimeError, "disabled"):
                uninstall_demo()

        sql.assert_not_called()


if __name__ == "__main__":
    unittest.main()
