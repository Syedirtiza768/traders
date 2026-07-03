# -*- coding: utf-8 -*-
"""Unit tests for Super Admin seed helpers (no Frappe site required)."""

from __future__ import unicode_literals

import sys
import unittest
from unittest.mock import MagicMock, mock_open, patch

if "frappe" not in sys.modules:
    frappe_stub = MagicMock()

    def _throw(msg, exc=None):
        raise exc or Exception(msg)

    frappe_stub.throw = _throw
    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.utils"] = MagicMock()

from trader_app.setup import seed_super_admin as seed


class SeedSuperAdminTests(unittest.TestCase):
    def test_defaults_from_constants(self):
        self.assertEqual(seed.DEFAULT_EMAIL, "superadmin@traders.local")
        self.assertEqual(seed.SUPER_ADMIN_ROLE, "Trader Super Admin")

    @patch.dict("os.environ", {}, clear=True)
    def test_run_uses_default_email_when_unset(self):
        with patch.object(seed, "create_roles"), patch.object(
            seed, "ensure_custom_fields"
        ), patch.object(seed, "_enable_multitenant_flag", return_value=False), patch.object(
            seed, "_ensure_super_admin_user", return_value={"created": True}
        ) as ensure_user, patch.object(seed.frappe, "db") as db:
            db.commit = MagicMock()
            result = seed.run(dry_run=True, enable_multitenant=False)
            ensure_user.assert_called_once()
            self.assertEqual(result["email"], "superadmin@traders.local")

    @patch.dict(
        "os.environ",
        {"TRADER_SUPER_ADMIN_EMAIL": "ops@example.com", "TRADER_SUPER_ADMIN_PASSWORD": "x"},
        clear=True,
    )
    def test_run_prefers_environment_variables(self):
        with patch.object(seed, "create_roles"), patch.object(
            seed, "ensure_custom_fields"
        ), patch.object(seed, "_enable_multitenant_flag", return_value=True), patch.object(
            seed, "_ensure_super_admin_user", return_value={"created": True}
        ) as ensure_user, patch.object(seed.frappe, "db") as db:
            db.commit = MagicMock()
            result = seed.run(dry_run=True)
            ensure_user.assert_called_with("ops@example.com", "x", dry_run=True, force_password=False)
            self.assertEqual(result["email"], "ops@example.com")

    def test_enable_multitenant_flag_is_idempotent(self):
        existing = '{"db_name": "test", "trader_multitenant_enabled": 1}'
        with patch.object(seed.frappe, "get_site_path", return_value="/tmp/site_config.json"), patch(
            "builtins.open", mock_open(read_data=existing)
        ) as mocked_open, patch.object(seed, "cint", side_effect=lambda v: int(v or 0)):
            changed = seed._enable_multitenant_flag()
            self.assertFalse(changed)
            mocked_open.assert_called_once()


if __name__ == "__main__":
    unittest.main()
