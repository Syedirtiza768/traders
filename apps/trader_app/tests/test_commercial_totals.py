# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import unittest

from trader_app.api.commercial_totals import compute_commercial_totals, resolve_gst_rate


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
