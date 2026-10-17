# -*- coding: utf-8 -*-
"""Regression tests for demo payment seed references."""

from __future__ import unicode_literals

import sys
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

if "frappe" not in sys.modules:
    sys.modules["frappe"] = MagicMock()
if "frappe.utils" not in sys.modules:
    sys.modules["frappe.utils"] = MagicMock()

from trader_app.demo.generators import enrichment, items, users
from trader_app.demo.generators.inventory import _items_without_warehouse_stock
from trader_app.demo.generators.payments import _payment_reference_fields


class DemoPaymentSeedTests(unittest.TestCase):
    def test_bank_payment_has_deterministic_external_reference(self):
        fields = _payment_reference_fields(True, "Receive", "ACC-SINV-0001", "2026-10-05")

        self.assertEqual(fields["reference_no"], "DEMO-REC-ACC-SINV-0001")
        self.assertEqual(fields["reference_date"], "2026-10-05")

    def test_cash_payment_has_no_bank_reference(self):
        self.assertEqual(_payment_reference_fields(False, "Pay", "ACC-PINV-0001", "2026-10-05"), {})

    def test_reference_fits_frappe_data_field_limit(self):
        fields = _payment_reference_fields(True, "Receive", "X" * 200, "2026-10-05")

        self.assertLessEqual(len(fields["reference_no"]), 140)

    def test_stock_deduction_date_stays_inside_demo_period(self):
        with patch.object(enrichment, "getdate", side_effect=date.fromisoformat), patch.object(
            enrichment, "nowdate", return_value="2026-10-05"
        ):
            posting_date = enrichment._demo_period_end_date("2025-07-01", "2026-03-16")

        self.assertEqual(posting_date, date(2026, 3, 16))

    def test_future_demo_period_is_capped_at_today(self):
        with patch.object(enrichment, "getdate", side_effect=date.fromisoformat), patch.object(
            enrichment, "nowdate", return_value="2026-03-20"
        ):
            posting_date = enrichment._demo_period_end_date("2026-03-01", "2026-04-20")

        self.assertEqual(posting_date, date(2026, 3, 20))

    def test_demo_user_password_is_not_a_shared_default(self):
        with patch.object(users.secrets, "token_urlsafe", return_value="unique-random-password") as generate:
            password = users._new_demo_password()

        self.assertEqual(password, "unique-random-password")
        generate.assert_called_once_with(32)

    def test_secondary_opening_stock_excludes_already_stocked_items(self):
        candidates = _items_without_warehouse_stock([{"name": "ITEM-A"}, {"name": "ITEM-B"}], {"ITEM-A"})

        self.assertEqual(candidates, [{"name": "ITEM-B"}])

    def test_component_taxonomy_is_seeded_only_for_electrical_supplies(self):
        metadata = items._component_metadata("Electrical Supplies", "Terminal", "5W")

        self.assertEqual(metadata["trader_component_item"], 1)
        self.assertEqual(metadata["trader_component_category"], "Electrical Supplies")
        self.assertEqual(metadata["trader_component_form_factor"], "Terminal")
        self.assertEqual(metadata["trader_component_capacity"], "5W")
        self.assertEqual(metadata["trader_component_grade"], "Standard")
        self.assertEqual(items._component_metadata("FMCG", "Beverage", "500ml"), {})


if __name__ == "__main__":
    unittest.main()
