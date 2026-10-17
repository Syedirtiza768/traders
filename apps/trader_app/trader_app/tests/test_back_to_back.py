# -*- coding: utf-8 -*-
"""Pure-logic tests for the back-to-back stock rules (sell first, buy against the order).

  python -m unittest trader_app.tests.test_back_to_back
"""

from __future__ import unicode_literals

import unittest

# Importing the lifecycle suite installs the shared frappe stubs, as the other chain tests do.
from trader_app.tests import test_sales_lifecycle  # noqa: F401
from trader_app.api.back_to_back import (  # noqa: E402
    delivery_shortages,
    procurement_shortfall,
    shortage_message,
)


class ProcurementShortfallTests(unittest.TestCase):
    """What to buy against an order. Open purchase quantity counts, so nothing is bought twice."""

    def test_nothing_is_bought_when_stock_covers_the_order(self):
        lines = [{"item_code": "PDU", "remaining": 4, "on_hand": 10, "on_order": 0}]
        self.assertEqual(procurement_shortfall(lines), [])

    def test_the_gap_between_need_and_stock_is_bought(self):
        lines = [{"item_code": "PDU", "remaining": 4, "on_hand": 1, "on_order": 0}]
        self.assertEqual(procurement_shortfall(lines), [{"item_code": "PDU", "shortfall": 3}])

    def test_open_purchase_orders_reduce_the_shortfall(self):
        lines = [{"item_code": "PDU", "remaining": 4, "on_hand": 0, "on_order": 3}]
        self.assertEqual(procurement_shortfall(lines), [{"item_code": "PDU", "shortfall": 1}])

    def test_delivered_quantity_is_not_bought_again(self):
        # remaining is already ordered minus delivered, so only what is left is needed.
        lines = [{"item_code": "PDU", "remaining": 0, "on_hand": 0, "on_order": 0}]
        self.assertEqual(procurement_shortfall(lines), [])

    def test_the_same_item_on_two_lines_is_summed(self):
        lines = [
            {"item_code": "PDU", "remaining": 2, "on_hand": 0, "on_order": 0},
            {"item_code": "PDU", "remaining": 3, "on_hand": 0, "on_order": 0},
        ]
        self.assertEqual(procurement_shortfall(lines), [{"item_code": "PDU", "shortfall": 5}])


class DeliveryShortagesTests(unittest.TestCase):
    """A challan can only issue what is on hand. Shortages say what is missing."""

    def test_a_challan_within_stock_is_not_refused(self):
        rows = [{"item_code": "PDU", "qty": 4}]
        self.assertEqual(delivery_shortages(rows, {"PDU": 4}), [])

    def test_a_challan_above_stock_is_refused_with_the_gap(self):
        rows = [{"item_code": "PDU", "qty": 4}]
        self.assertEqual(
            delivery_shortages(rows, {"PDU": 2}),
            [{"item_code": "PDU", "required": 4, "on_hand": 2, "short": 2}],
        )

    def test_an_item_with_no_stock_is_short_by_its_whole_quantity(self):
        rows = [{"item_code": "RACK", "qty": 2}]
        self.assertEqual(
            delivery_shortages(rows, {}),
            [{"item_code": "RACK", "required": 2, "on_hand": 0, "short": 2}],
        )

    def test_quantities_for_the_same_item_on_several_lines_are_added(self):
        rows = [{"item_code": "PDU", "qty": 2}, {"item_code": "PDU", "qty": 3}]
        self.assertEqual(
            delivery_shortages(rows, {"PDU": 4}),
            [{"item_code": "PDU", "required": 5, "on_hand": 4, "short": 1}],
        )

    def test_zero_or_missing_quantities_are_ignored(self):
        rows = [{"item_code": "PDU", "qty": 0}, {"item_code": "", "qty": 5}]
        self.assertEqual(delivery_shortages(rows, {}), [])


class ShortageMessageTests(unittest.TestCase):
    def test_message_names_each_short_item_and_the_next_step(self):
        message = shortage_message(
            [{"item_code": "PDU", "required": 4, "on_hand": 2, "short": 2}]
        )
        self.assertIn("PDU: 4 needed, 2 on hand (short 2)", message)
        self.assertIn("Order the shortfall from a supplier", message)


if __name__ == "__main__":
    unittest.main()
