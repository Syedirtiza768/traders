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


# ────────────────────────────────────────────────────────────────
# Tenant-scoping SQL injection — regression coverage for the raw-SQL
# fix in commit 25d7cea (get_incoming / get_outgoing /
# get_component_stock_valuation / _get_total_opening_balances all
# join shared master data with no `company` column, so they must
# thread `tenant_sql_filter()`'s condition into every query they run).
# ────────────────────────────────────────────────────────────────

class _RecordingSql:
    """frappe.db.sql stand-in that records every (query, params) pair.

    Returns `[[0]]` for plain calls (so `result[0][0]` indexing works) and
    `[]` for `as_dict=True` calls (so row-iteration is a no-op).
    """

    def __init__(self):
        self.calls = []

    def __call__(self, query, params=None, as_dict=False):
        self.calls.append((query, params or {}))
        return [] if as_dict else [[0]]


class DaybookTenantScopingTests(unittest.TestCase):
    def _run_incoming_or_outgoing(self, fn, alias, tenant_return):
        recorder = _RecordingSql()
        with patch.object(daybook_api, "resolve_active_company", return_value="Acme"), patch.object(
            daybook_api, "_assert_enabled",
        ), patch.object(daybook_api.frappe.db, "sql", side_effect=recorder), patch.object(
            daybook_api, "cint", side_effect=lambda x: int(x) if x else 0,
        ), patch.object(
            daybook_api, "flt", side_effect=lambda x: float(x) if x else 0.0,
        ), patch(
            "trader_app.api.permissions.tenant_sql_filter", return_value=tenant_return,
        ) as tenant_filter:
            fn(company="Acme")
        tenant_filter.assert_called_once_with(alias)
        return recorder.calls

    def test_get_incoming_injects_tenant_filter_into_every_query(self):
        calls = self._run_incoming_or_outgoing(
            daybook_api.get_incoming, "c",
            ("c.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-A"}),
        )
        self.assertEqual(len(calls), 3, "count, rows, and grand_total queries must all run")
        for query, params in calls:
            self.assertIn("c.trader_tenant = %(trader_scope_tenant)s", query)
            self.assertEqual(params.get("trader_scope_tenant"), "TNT-A")

    def test_get_outgoing_injects_tenant_filter_into_every_query(self):
        calls = self._run_incoming_or_outgoing(
            daybook_api.get_outgoing, "s",
            ("s.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-B"}),
        )
        self.assertEqual(len(calls), 3)
        for query, params in calls:
            self.assertIn("s.trader_tenant = %(trader_scope_tenant)s", query)
            self.assertEqual(params.get("trader_scope_tenant"), "TNT-B")

    def test_get_incoming_omits_tenant_clause_for_platform_admin(self):
        calls = self._run_incoming_or_outgoing(daybook_api.get_incoming, "c", ("", {}))
        self.assertEqual(len(calls), 3)
        for query, _params in calls:
            self.assertNotIn("trader_tenant", query)

    def test_get_incoming_blocks_tenantless_user(self):
        calls = self._run_incoming_or_outgoing(daybook_api.get_incoming, "c", ("1=0", {}))
        self.assertEqual(len(calls), 3)
        for query, _params in calls:
            self.assertIn("1=0", query)

    def test_get_component_stock_valuation_injects_tenant_filter(self):
        recorder = _RecordingSql()
        with patch.object(daybook_api, "resolve_active_company", return_value="Acme"), patch.object(
            daybook_api, "_assert_enabled",
        ), patch.object(daybook_api, "_get_cash_balance", return_value=0), patch.object(
            daybook_api, "_get_total_outstanding", return_value=0,
        ), patch.object(daybook_api.frappe.db, "sql", side_effect=recorder), patch(
            "trader_app.api.permissions.tenant_sql_filter",
            return_value=("i.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-A"}),
        ) as tenant_filter:
            daybook_api.get_component_stock_valuation(company="Acme")

        tenant_filter.assert_called_once_with("i")
        self.assertEqual(len(recorder.calls), 1)
        query, params = recorder.calls[0]
        self.assertIn("i.trader_tenant = %(trader_scope_tenant)s", query)
        self.assertEqual(params.get("trader_scope_tenant"), "TNT-A")

    def test_get_total_opening_balances_injects_tenant_filter(self):
        with patch.object(daybook_api.frappe.db, "has_column", return_value=True), patch.object(
            daybook_api.frappe.db, "sql", return_value=[[42.0]],
        ) as sql_mock, patch.object(
            daybook_api, "flt", side_effect=lambda x: float(x or 0),
        ), patch(
            "trader_app.api.permissions.tenant_sql_filter",
            return_value=("`tabCustomer`.trader_tenant = %(trader_scope_tenant)s", {"trader_scope_tenant": "TNT-A"}),
        ) as tenant_filter:
            total = daybook_api._get_total_opening_balances("Customer")

        self.assertEqual(total, 42.0)
        tenant_filter.assert_called_once_with("`tabCustomer`")
        query, params = sql_mock.call_args[0][0], sql_mock.call_args[0][1]
        self.assertIn("trader_tenant = %(trader_scope_tenant)s", query)
        self.assertEqual(params.get("trader_scope_tenant"), "TNT-A")

    def test_get_total_opening_balances_skips_filter_without_tenant_column(self):
        with patch.object(daybook_api.frappe.db, "has_column", return_value=False), patch(
            "trader_app.api.permissions.tenant_sql_filter",
        ) as tenant_filter:
            total = daybook_api._get_total_opening_balances("Customer")
        self.assertEqual(total, 0.0)
        tenant_filter.assert_not_called()


# ────────────────────────────────────────────────────────────────
# Day-close summary orchestration — locks in that get_day_close_summary
# derives its figures from the same helpers get_day_book uses, so the
# two screens can't silently drift apart from each other.
# ────────────────────────────────────────────────────────────────

class DayCloseSummaryTests(unittest.TestCase):
    def test_summary_reuses_day_totals_and_combines_all_components(self):
        totals = {
            "total_sales": 500.0, "total_purchases": 200.0,
            "cash_in": 300.0, "cash_out": 100.0, "net_cash": 200.0,
        }
        with patch.object(daybook_api, "resolve_active_company", return_value="Acme"), patch.object(
            daybook_api, "_assert_enabled",
        ), patch.object(
            daybook_api, "_get_day_totals", return_value=totals,
        ) as get_totals, patch.object(
            daybook_api, "_get_cash_balance", return_value=1000.0,
        ) as cash_balance, patch.object(
            daybook_api, "_get_component_stock_value", return_value=5000.0,
        ) as stock_value, patch.object(
            daybook_api, "_get_total_outstanding", side_effect=[750.0, 250.0],
        ) as outstanding, patch.object(
            daybook_api, "flt", side_effect=lambda x: float(x or 0),
        ):
            summary = daybook_api.get_day_close_summary(company="Acme", date="2026-07-08")

        get_totals.assert_called_once_with("Acme", "2026-07-08")
        cash_balance.assert_called_once_with("Acme", "2026-07-08")
        stock_value.assert_called_once_with("Acme", "2026-07-08")
        self.assertEqual(
            [c.args for c in outstanding.call_args_list],
            [("Acme", "Customer", "2026-07-08"), ("Acme", "Supplier", "2026-07-08")],
        )

        self.assertEqual(summary["total_sales"], 500.0)
        self.assertEqual(summary["total_purchases"], 200.0)
        self.assertEqual(summary["cash_in"], 300.0)
        self.assertEqual(summary["cash_out"], 100.0)
        self.assertEqual(summary["net_cash"], 200.0)
        self.assertEqual(summary["closing_cash"], 1000.0)
        self.assertEqual(summary["component_stock_value"], 5000.0)
        self.assertEqual(summary["total_ar"], 750.0)
        self.assertEqual(summary["total_ap"], 250.0)


if __name__ == "__main__":
    unittest.main()
