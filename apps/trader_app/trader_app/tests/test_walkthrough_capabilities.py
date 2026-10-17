# -*- coding: utf-8 -*-
"""Pure-logic tests for the enquiry-to-cash capability additions.

Covers the decision cores of: invoice payment tracking, settle-tolerance
write-off, order fulfilment progress and outward gate-pass quantity control.
Figures are the ones from the sahamid walkthrough
(docs/walkthrough/README.md in the sahamid repo).

  python -m unittest trader_app.tests.test_walkthrough_capabilities
"""

from __future__ import unicode_literals

import unittest

# Importing the lifecycle suite installs the shared frappe stubs / real utils.
from trader_app.tests import test_sales_lifecycle  # noqa: F401
from trader_app.api.ar_settlement import (  # noqa: E402
    MARKER,
    decode_marker,
    encode_marker,
    plan_tolerance_writeoffs,
)
from trader_app.api.ar_tracking import (  # noqa: E402
    classify_invoice_payment,
    compute_expected_payment_date,
    summarize_tracker,
)
from trader_app.api.fulfilment import summarize_fulfilment  # noqa: E402
from trader_app.api.gate_pass import validate_release_quantities  # noqa: E402
from trader_app.api.order_linking import match_order_lines  # noqa: E402
from trader_app.api.hierarchy import (  # noqa: E402
    flatten_commercial_options,
    select_options,
)


class ExpectedPaymentDateTests(unittest.TestCase):
    def test_adds_days_to_posting_date(self):
        self.assertEqual(compute_expected_payment_date("2026-09-03", 21), "2026-09-24")
        self.assertEqual(compute_expected_payment_date("2026-09-17", 21), "2026-10-08")

    def test_no_expectation_returns_none(self):
        self.assertIsNone(compute_expected_payment_date("2026-09-03", 0))
        self.assertIsNone(compute_expected_payment_date("2026-09-03", None))
        self.assertIsNone(compute_expected_payment_date(None, 21))


class PaymentTrackerTests(unittest.TestCase):
    AS_OF = "2026-10-14"

    def test_part_paid_invoice_past_expected_but_not_due(self):
        v = classify_invoice_payment(644044, 144044, "2026-10-17", "2026-10-08", self.AS_OF)
        self.assertEqual(v["status"], "Part Paid")
        self.assertEqual(v["paid_amount"], 500000.0)
        self.assertEqual(v["days_past_due"], 0)
        self.assertEqual(v["days_past_expected"], 6)
        self.assertEqual(v["bucket"], "expected_missed")

    def test_settled_invoice_reports_no_lateness(self):
        v = classify_invoice_payment(726408, 0, "2026-10-03", "2026-09-24", self.AS_OF)
        self.assertEqual(v["status"], "Paid")
        self.assertEqual(v["bucket"], "settled")
        self.assertEqual((v["days_past_due"], v["days_past_expected"]), (0, 0))

    def test_residual_inside_tolerance_counts_as_paid(self):
        v = classify_invoice_payment(726408, 3.0, "2026-10-03", None, self.AS_OF, tolerance=5.0)
        self.assertEqual(v["status"], "Paid")

    def test_residual_outside_tolerance_stays_open(self):
        v = classify_invoice_payment(726408, 6.0, "2026-10-03", None, self.AS_OF, tolerance=5.0)
        self.assertEqual(v["status"], "Part Paid")
        self.assertEqual(v["bucket"], "overdue")
        self.assertEqual(v["days_past_due"], 11)

    def test_unpaid_invoice(self):
        v = classify_invoice_payment(1000, 1000, "2026-11-01", None, self.AS_OF)
        self.assertEqual((v["status"], v["bucket"], v["paid_amount"]), ("Unpaid", "current", 0.0))

    def test_summary_totals(self):
        rows = [
            {"grand_total": 726408, **classify_invoice_payment(726408, 0, "2026-10-03", None, self.AS_OF)},
            {"grand_total": 644044, **classify_invoice_payment(644044, 144044, "2026-10-17", "2026-10-08", self.AS_OF)},
        ]
        s = summarize_tracker(rows)
        self.assertEqual(s["receivable"], 1370452.0)
        self.assertEqual(s["paid"], 1226408.0)
        self.assertEqual(s["outstanding"], 144044.0)
        self.assertEqual(s["by_status"]["Paid"], 1)
        self.assertEqual(s["by_bucket"]["expected_missed"], 1)


class SettleToleranceTests(unittest.TestCase):
    def test_three_rupee_shortfall_is_written_off(self):
        plan = plan_tolerance_writeoffs([{"name": "INV-101", "outstanding": 426408, "allocated": 426405}], 5.0)
        self.assertEqual(plan, [{"name": "INV-101", "delta": 3.0}])

    def test_shortfall_beyond_tolerance_is_left_open(self):
        self.assertEqual(
            plan_tolerance_writeoffs([{"name": "I", "outstanding": 1000, "allocated": 994}], 5.0), []
        )

    def test_exact_payment_and_nothing_allocated_need_no_write_off(self):
        refs = [
            {"name": "A", "outstanding": 500, "allocated": 500},
            {"name": "B", "outstanding": 500, "allocated": 0},
        ]
        self.assertEqual(plan_tolerance_writeoffs(refs, 5.0), [])

    def test_zero_tolerance_disables(self):
        self.assertEqual(
            plan_tolerance_writeoffs([{"name": "I", "outstanding": 1000, "allocated": 999.99}], 0), []
        )

    def test_part_payment_on_another_invoice_is_untouched(self):
        refs = [
            {"name": "INV-101", "outstanding": 426408, "allocated": 426405},
            {"name": "INV-102", "outstanding": 644044, "allocated": 100000},
        ]
        self.assertEqual(plan_tolerance_writeoffs(refs, 5.0), [{"name": "INV-101", "delta": 3.0}])

    def test_marker_round_trip(self):
        text = encode_marker("ACC-SINV-2026-00001", 3)
        self.assertTrue(text.startswith(MARKER))
        self.assertEqual(decode_marker(text), ("ACC-SINV-2026-00001", 3.0))
        self.assertIsNone(decode_marker("bank charges"))
        self.assertIsNone(decode_marker(None))


class FulfilmentTests(unittest.TestCase):
    ORDERED = {
        "UPS-3K": {"qty": 3, "amount": 513000},
        "BAT-100": {"qty": 12, "amount": 410400},
        "RACK-42U": {"qty": 2, "amount": 190000},
        "PDU-16": {"qty": 4, "amount": 48000},
    }

    def test_after_first_delivery_and_invoice(self):
        delivered = {"UPS-3K": {"qty": 2, "amount": 342000}, "BAT-100": {"qty": 8, "amount": 273600}}
        invoiced = {"UPS-3K": {"qty": 2, "amount": 342000}, "BAT-100": {"qty": 8, "amount": 273600}}
        r = summarize_fulfilment(self.ORDERED, delivered, invoiced)
        by = {i["item_code"]: i for i in r["items"]}
        self.assertEqual(by["UPS-3K"]["pending_delivery_qty"], 1)
        self.assertEqual(by["UPS-3K"]["pct_delivered"], 66.67)
        self.assertEqual(by["RACK-42U"]["pending_delivery_qty"], 2)
        self.assertEqual(by["BAT-100"]["pending_invoice_qty"], 0)
        self.assertFalse(r["fully_delivered"])
        self.assertFalse(r["fully_invoiced"])

    def test_fully_delivered_and_invoiced(self):
        full = {k: dict(v) for k, v in self.ORDERED.items()}
        r = summarize_fulfilment(self.ORDERED, full, full)
        self.assertTrue(r["fully_delivered"])
        self.assertTrue(r["fully_invoiced"])
        self.assertEqual(r["totals"]["ordered_qty"], 21)
        self.assertEqual(r["totals"]["invoiced_amount"], 1161400.0)

    def test_delivered_but_not_invoiced_shows_pending_invoice(self):
        full = {k: dict(v) for k, v in self.ORDERED.items()}
        r = summarize_fulfilment(self.ORDERED, full, {})
        self.assertTrue(r["fully_delivered"])
        self.assertFalse(r["fully_invoiced"])
        self.assertEqual(sum(i["pending_invoice_qty"] for i in r["items"]), 21)

    def test_over_delivery_is_reported_not_hidden(self):
        r = summarize_fulfilment({"A": {"qty": 2}}, {"A": {"qty": 3}}, {})
        self.assertEqual(r["items"][0]["over_delivered_qty"], 1)
        self.assertEqual(r["items"][0]["pending_delivery_qty"], 0)

    def test_empty_opportunity(self):
        r = summarize_fulfilment({}, {}, {})
        self.assertFalse(r["fully_delivered"])
        self.assertEqual(r["items"], [])


class GatePassTests(unittest.TestCase):
    CHALLAN = {"UPS-3K": 2, "BAT-100": 8}

    def test_full_release_is_allowed(self):
        v = validate_release_quantities(
            self.CHALLAN, {}, [{"item_code": "UPS-3K", "qty": 2}, {"item_code": "BAT-100", "qty": 8}]
        )
        self.assertEqual(v, [])

    def test_partial_then_remainder(self):
        first = validate_release_quantities(self.CHALLAN, {}, [{"item_code": "UPS-3K", "qty": 1}])
        second = validate_release_quantities(self.CHALLAN, {"UPS-3K": 1}, [{"item_code": "UPS-3K", "qty": 1}])
        self.assertEqual((first, second), ([], []))

    def test_cannot_release_more_than_remains(self):
        v = validate_release_quantities(self.CHALLAN, {"UPS-3K": 1}, [{"item_code": "UPS-3K", "qty": 2}])
        self.assertEqual(len(v), 1)

    def test_item_not_on_challan_and_non_positive_qty(self):
        v = validate_release_quantities(
            self.CHALLAN, {}, [{"item_code": "RACK-42U", "qty": 1}, {"item_code": "UPS-3K", "qty": 0}]
        )
        self.assertEqual(len(v), 2)

    def test_split_rows_for_same_item_are_summed(self):
        v = validate_release_quantities(
            self.CHALLAN, {}, [{"item_code": "UPS-3K", "qty": 1.5}, {"item_code": "UPS-3K", "qty": 1}]
        )
        self.assertEqual(len(v), 1)


class OptionSelectionTests(unittest.TestCase):
    """Options under a line are alternatives: only the picked one is ordered."""

    ROWS = [
        {"line_no": 1, "option_no": 1, "package_qty": 3, "client_requirements": "UPS",
         "items": [{"item_code": "UPS-3K", "unit_qty": 1, "unit_price": 180000, "discount_percent": 5}]},
        {"line_no": 1, "option_no": 2, "package_qty": 3, "client_requirements": "UPS",
         "items": [{"item_code": "UPS-3K-B", "unit_qty": 1, "unit_price": 120000, "discount_percent": 0}]},
        {"line_no": 2, "option_no": 1, "package_qty": 2, "client_requirements": "Rack",
         "items": [{"item_code": "RACK-42U", "unit_qty": 1, "unit_price": 95000, "discount_percent": 0},
                   {"item_code": "PDU-16", "unit_qty": 2, "unit_price": 12000, "discount_percent": 0}]},
    ]

    def test_default_is_lowest_option_per_line(self):
        picked = select_options(self.ROWS, {})
        self.assertEqual([(r["line_no"], r["option_no"]) for r in picked], [(1, 1), (2, 1)])

    def test_customer_choice_wins_and_json_string_keys_work(self):
        picked = select_options(self.ROWS, {"1": "2"})
        self.assertEqual([(r["line_no"], r["option_no"]) for r in picked], [(1, 2), (2, 1)])

    def test_unknown_option_falls_back_to_lowest(self):
        picked = select_options(self.ROWS, {1: 9})
        self.assertEqual(picked[0]["option_no"], 1)

    def test_flat_items_contain_only_the_picked_option(self):
        flat = flatten_commercial_options(self.ROWS, selected_options={})
        self.assertEqual(sorted(f["item_code"] for f in flat), ["PDU-16", "RACK-42U", "UPS-3K"])
        by = {f["item_code"]: f for f in flat}
        self.assertEqual(by["UPS-3K"]["qty"], 3)
        self.assertAlmostEqual(by["UPS-3K"]["rate"], 171000.0)
        self.assertEqual(by["PDU-16"]["qty"], 4)

    def test_without_selection_behaviour_is_unchanged(self):
        flat = flatten_commercial_options(self.ROWS)
        self.assertEqual(len(flat), 4)  # every alternative, as before

    def test_picked_value_matches_walkthrough_line(self):
        flat = flatten_commercial_options(self.ROWS, selected_options={})
        total = sum(f["qty"] * f["rate"] for f in flat)
        self.assertAlmostEqual(total, 513000 + 238000)


class OrderLinkingTests(unittest.TestCase):
    ORDER = [
        {"name": "SOI-1", "parent": "SO-1", "item_code": "UPS", "remaining": 3},
        {"name": "SOI-2", "parent": "SO-1", "item_code": "BAT", "remaining": 12},
        {"name": "SOI-3", "parent": "SO-2", "item_code": "UPS", "remaining": 5},
    ]

    def test_rows_match_by_item_and_carry_the_order_line(self):
        m = match_order_lines([{"idx": 1, "item_code": "UPS", "qty": 2}, {"idx": 2, "item_code": "BAT", "qty": 8}], self.ORDER)
        self.assertEqual(m[1], {"so": "SO-1", "so_detail": "SOI-1"})
        self.assertEqual(m[2], {"so": "SO-1", "so_detail": "SOI-2"})

    def test_second_challan_continues_on_remaining_quantity(self):
        order = [dict(r) for r in self.ORDER]
        order[0]["remaining"] = 1  # 2 of 3 already delivered
        m = match_order_lines([{"idx": 1, "item_code": "UPS", "qty": 1}], order)
        self.assertEqual(m[1]["so_detail"], "SOI-1")

    def test_exhausted_line_falls_through_to_next_order(self):
        order = [dict(r) for r in self.ORDER]
        order[0]["remaining"] = 0
        m = match_order_lines([{"idx": 1, "item_code": "UPS", "qty": 1}], order)
        self.assertEqual(m[1], {"so": "SO-2", "so_detail": "SOI-3"})

    def test_unknown_item_is_left_unlinked(self):
        self.assertEqual(match_order_lines([{"idx": 1, "item_code": "RACK", "qty": 1}], self.ORDER), {})

    def test_two_rows_of_one_item_do_not_overdraw_one_line(self):
        order = [{"name": "SOI-1", "parent": "SO-1", "item_code": "UPS", "remaining": 2}]
        m = match_order_lines(
            [{"idx": 1, "item_code": "UPS", "qty": 2}, {"idx": 2, "item_code": "UPS", "qty": 1}], order
        )
        self.assertIn(1, m)
        self.assertNotIn(2, m)


if __name__ == "__main__":
    unittest.main()
