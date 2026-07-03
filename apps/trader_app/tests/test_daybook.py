# -*- coding: utf-8 -*-
"""Unit tests for daybook helpers (mocked Frappe DB)."""

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
    frappe_stub.ValidationError = type("ValidationError", (Exception,), {})
    frappe_stub.PermissionError = type("PermissionError", (Exception,), {})
    frappe_stub.whitelist = _whitelist
    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.utils"] = MagicMock()

from trader_app.api import daybook as daybook_api


class DaybookOpeningBalanceTests(unittest.TestCase):
    def test_reduce_opening_balance_partial(self):
        with patch.object(daybook_api, "flt", side_effect=lambda x: float(x or 0)), patch.object(
            daybook_api.frappe.db, "has_column", return_value=True,
        ), patch.object(
            daybook_api, "_get_party_opening_balance", return_value=100.0,
        ), patch.object(daybook_api.frappe.db, "set_value") as set_value:
            applied = daybook_api._reduce_opening_balance("Customer", "CUST-1", 40)
            self.assertEqual(applied, 40.0)
            set_value.assert_called_once_with(
                "Customer", "CUST-1", "trader_opening_balance", 60.0,
            )

    def test_reduce_opening_balance_caps_at_balance(self):
        with patch.object(daybook_api, "flt", side_effect=lambda x: float(x or 0)), patch.object(
            daybook_api.frappe.db, "has_column", return_value=True,
        ), patch.object(
            daybook_api, "_get_party_opening_balance", return_value=30.0,
        ), patch.object(daybook_api.frappe.db, "set_value") as set_value:
            applied = daybook_api._reduce_opening_balance("Customer", "CUST-1", 50)
            self.assertEqual(applied, 30.0)
            set_value.assert_called_once_with(
                "Customer", "CUST-1", "trader_opening_balance", 0.0,
            )

    def test_get_total_outstanding_adds_opening_balances(self):
        with patch.object(daybook_api, "flt", side_effect=lambda x: float(x or 0)), patch.object(
            daybook_api.frappe.db, "sql", return_value=[[200.0]],
        ), patch.object(
            daybook_api, "_get_total_opening_balances", return_value=50.0,
        ):
            total = daybook_api._get_total_outstanding("Acme", "Customer", "2026-01-01")
            self.assertEqual(total, 250.0)


class FindOrCreatePartyTests(unittest.TestCase):
    def test_find_or_create_party_creates_when_name_not_found(self):
        with patch.object(daybook_api, "resolve_active_company", return_value="Acme"), patch.object(
            daybook_api, "_assert_enabled",
        ), patch.object(daybook_api.frappe.db, "has_column", return_value=False), patch.object(
            daybook_api, "_resolve_party", side_effect=daybook_api.frappe.ValidationError("missing"),
        ), patch(
            "trader_app.api.customers.create_customer",
            return_value={"name": "NEW-CUST"},
        ) as create_customer:
            result = daybook_api.find_or_create_party(
                "Customer", party_name="New Shop", company="Acme",
            )
            self.assertEqual(result, {"party": "NEW-CUST", "created": True})
            create_customer.assert_called_once_with("New Shop")


if __name__ == "__main__":
    unittest.main()
