# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import datetime
import importlib
import sys
import types
import unittest

try:
    from trader_app.api.commercial_totals import (
        compute_commercial_totals,
        resolve_gst_rate,
    )
except ModuleNotFoundError as error:
    if error.name not in ("frappe", "frappe.utils"):
        raise

    # These arithmetic tests do not require Bench. Provide only the small
    # frappe.utils surface used by the module, then remove the temporary
    # package so it cannot affect other tests in the same process.
    frappe_stub = types.ModuleType("frappe")
    frappe_stub.__path__ = []
    utils_stub = types.ModuleType("frappe.utils")
    utils_stub.cint = lambda value=0: int(float(value or 0))
    utils_stub.flt = lambda value=0: float(value or 0)
    utils_stub.nowdate = lambda: datetime.date.today().isoformat()
    frappe_stub.utils = utils_stub

    previous_frappe = sys.modules.get("frappe")
    previous_utils = sys.modules.get("frappe.utils")
    sys.modules["frappe"] = frappe_stub
    sys.modules["frappe.utils"] = utils_stub
    try:
        totals_module = importlib.import_module("trader_app.api.commercial_totals")
    finally:
        if previous_frappe is None:
            sys.modules.pop("frappe", None)
        else:
            sys.modules["frappe"] = previous_frappe
        if previous_utils is None:
            sys.modules.pop("frappe.utils", None)
        else:
            sys.modules["frappe.utils"] = previous_utils

    compute_commercial_totals = totals_module.compute_commercial_totals
    resolve_gst_rate = totals_module.resolve_gst_rate


class TestCommercialTotals(unittest.TestCase):
    def test_exclusive_gst_goods(self):
        t = compute_commercial_totals(net=1000, gst_mode="exclusive", services=0, wht_percent=0)
        self.assertEqual(t["gst_rate"], 18)
        self.assertAlmostEqual(t["gst_amount"], 180)
        self.assertAlmostEqual(t["grand_total"], 1180)

    def test_services_gst(self):
        self.assertEqual(resolve_gst_rate("exclusive", 1), 16)
        t = compute_commercial_totals(net=1000, gst_mode="exclusive", services=1)
        self.assertEqual(t["gst_rate"], 16)
        self.assertAlmostEqual(t["gst_amount"], 160)

    def test_inclusive_and_wht(self):
        t = compute_commercial_totals(net=1180, gst_mode="inclusive", services=0, wht_percent=4.5)
        self.assertAlmostEqual(t["taxable_base"], 1000, places=2)
        self.assertAlmostEqual(t["wht_amount"], 45, places=2)
        self.assertAlmostEqual(t["grand_total"], 1135, places=2)

    def test_fx_columns(self):
        t = compute_commercial_totals(
            net=280000,
            gst_mode="none",
            rate_clause="usd",
            print_exchange="1",
            clause_rates={"usd": 280},
        )
        self.assertEqual(t["fx_rate"], 280)
        self.assertAlmostEqual(t["fx_net"], 1000)
        self.assertAlmostEqual(t["fx_grand"], 1000)


if __name__ == "__main__":
    unittest.main()
