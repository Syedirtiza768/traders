# -*- coding: utf-8 -*-
"""Pure-logic tests for Sales Case delivery source and closure reasons.

Cases come from the sahamid record MT-2595-2022-02-21--030817 (Bulleh Shah Packaging): one
quotation, two customer POs (4500075386 and 4500075421) each with its own Order Confirmation,
and seven partial delivery challans spread across the two POs.

  python -m unittest trader_app.tests.test_sales_case_rules
"""

from __future__ import unicode_literals

import unittest

from trader_app.api.sales_case_rules import (
    SalesCaseRuleError,
    challan_option_rows,
    close_reason_error,
    delivered_by_item,
    delivery_plan,
    is_open_for_delivery,
    oc_line_numbers,
    pick_source_order,
)


def oc(name, po_no, docstatus=1, per_delivered=0):
    return {"name": name, "po_no": po_no, "docstatus": docstatus, "per_delivered": per_delivered}


PO_386 = oc("SAL-ORD-2022-00386", "4500075386", per_delivered=0)
PO_421 = oc("SAL-ORD-2022-00421", "4500075421", per_delivered=0)


class PickSourceOrderTests(unittest.TestCase):
    """A challan must never be built against the wrong customer PO (legacy DC 71423 vs 72390)."""

    def test_no_order_confirmation_returns_none_so_caller_keeps_its_message(self):
        self.assertIsNone(pick_source_order([]))

    def test_single_open_order_is_used_without_being_named(self):
        self.assertEqual(pick_source_order([PO_386]), PO_386["name"])

    def test_several_open_orders_refuse_a_guess_and_list_the_pos(self):
        with self.assertRaises(SalesCaseRuleError) as ctx:
            pick_source_order([PO_386, PO_421])
        message = str(ctx.exception)
        self.assertIn("4500075386", message)
        self.assertIn("4500075421", message)
        self.assertIn("Choose the one this challan delivers against", message)

    def test_named_order_wins_when_several_are_open(self):
        self.assertEqual(pick_source_order([PO_386, PO_421], requested=PO_421["name"]), PO_421["name"])

    def test_fully_delivered_order_is_skipped_for_the_next_challan(self):
        done = oc("SAL-ORD-2022-00386", "4500075386", per_delivered=100)
        self.assertEqual(pick_source_order([done, PO_421]), PO_421["name"])

    def test_all_orders_fully_delivered_is_refused(self):
        done = oc("SAL-ORD-2022-00386", "4500075386", per_delivered=100)
        with self.assertRaises(SalesCaseRuleError) as ctx:
            pick_source_order([done])
        self.assertIn("nothing left to deliver", str(ctx.exception))

    def test_draft_order_is_never_a_delivery_source(self):
        draft = oc("SAL-ORD-2022-00999", "4500075999", docstatus=0)
        with self.assertRaises(SalesCaseRuleError):
            pick_source_order([draft])
        with self.assertRaises(SalesCaseRuleError) as ctx:
            pick_source_order([PO_386, draft], requested=draft["name"])
        self.assertIn("must be submitted", str(ctx.exception))

    def test_named_order_from_another_project_is_refused(self):
        with self.assertRaises(SalesCaseRuleError) as ctx:
            pick_source_order([PO_386], requested="SAL-ORD-OTHER-PROJECT")
        self.assertIn("does not belong to this Project", str(ctx.exception))

    def test_open_check_uses_delivered_percentage(self):
        self.assertTrue(is_open_for_delivery({"docstatus": 1, "per_delivered": 99.5}))
        self.assertFalse(is_open_for_delivery({"docstatus": 1, "per_delivered": 100}))
        self.assertFalse(is_open_for_delivery({"docstatus": 2, "per_delivered": 0}))


class CloseReasonTests(unittest.TestCase):
    """Legacy closing reasons ("Case Closed", "Customer cancelled PO", ...) must be kept."""

    def test_other_needs_a_reason(self):
        self.assertIsNotNone(close_reason_error("Other", ""))
        self.assertIsNotNone(close_reason_error("Other", "   "))

    def test_other_with_reason_is_accepted(self):
        self.assertIsNone(close_reason_error("Other", "Customer cancelled PO"))

    def test_standard_stages_do_not_need_a_reason(self):
        for stage in ("Enquiry", "Quotation", "Customer PO", "Delivery"):
            self.assertIsNone(close_reason_error(stage, ""))

    def test_delivery_close_with_undelivered_orders_needs_a_reason(self):
        # Sahamid MT-2595-2022-02-21--030817 closed at DC with one quoted line never delivered.
        self.assertIsNotNone(close_reason_error("Delivery", "", open_order_count=1))
        self.assertIsNone(close_reason_error("Delivery", "Line KV 9106 cancelled by customer", open_order_count=1))

    def test_delivery_close_with_everything_delivered_needs_no_reason(self):
        self.assertIsNone(close_reason_error("Delivery", "", open_order_count=0))

    def test_reason_is_kept_for_any_stage(self):
        self.assertIsNone(close_reason_error("Enquiry", "Wrong DBA"))


def _line(line, option, items, package_qty=1, text=""):
    return {
        "line_no": line,
        "option_no": option,
        "package_qty": package_qty,
        "option_text": text or "L{0}O{1}".format(line, option),
        "client_requirements": "",
        "items": [{"item_code": code, "description": code, "unit_qty": unit} for code, unit in items],
    }


def _billed_qty(rows, chosen):
    """Flat quantity per item code that the rows bill (unit_qty x package_qty, as flatten does)."""
    qty = {}
    for row in rows:
        if chosen.get(row["line_no"]) != row["option_no"]:
            continue
        package = row.get("package_qty") or 1
        for item in row["items"]:
            qty[item["item_code"]] = qty.get(item["item_code"], 0) + item["unit_qty"] * package
    return {code: value for code, value in qty.items() if value > 0}


# Sahamid-shaped order: line 1 bills a UPS (3 units) and has an unbilled alternative; line 2 is
# batteries, 4 per set x 2 sets = 8.
OC_ROWS = [
    _line(1, 1, [("UPS-3K", 1)], package_qty=3, text="Premium UPS"),
    _line(1, 2, [("UPS-3K-ALT", 1)], package_qty=3, text="Economy UPS"),
    _line(2, 1, [("BAT-100", 4)], package_qty=2, text="Batteries"),
]
OC_CHOSEN = {1: 1, 2: 1}


class DeliveredByItemTests(unittest.TestCase):
    def test_sums_delivered_per_item_and_ignores_blank_codes(self):
        rows = [
            {"item_code": "UPS-3K", "delivered_qty": 2},
            {"item_code": "UPS-3K", "delivered_qty": 1},
            {"item_code": "BAT-100", "delivered_qty": None},
            {"item_code": None, "delivered_qty": 5},
        ]
        self.assertEqual(delivered_by_item(rows), {"UPS-3K": 3.0, "BAT-100": 0.0})


class DeliveryPlanTests(unittest.TestCase):
    def test_lists_only_the_billed_option_of_each_line(self):
        lines = delivery_plan(OC_ROWS, OC_CHOSEN, {})
        self.assertEqual([(l["line_no"], l["option_no"]) for l in lines], [(1, 1), (2, 1)])
        self.assertEqual(lines[0]["items"][0]["ordered_qty"], 3.0)
        self.assertEqual(lines[1]["ordered_qty"], 8.0)

    def test_reports_what_is_left_after_earlier_challans(self):
        lines = delivery_plan(OC_ROWS, OC_CHOSEN, {"UPS-3K": 1, "BAT-100": 8})
        self.assertEqual(lines[0]["remaining_qty"], 2.0)
        self.assertEqual(lines[1]["remaining_qty"], 0.0)
        self.assertEqual(lines[1]["items"][0]["delivered_qty"], 8.0)

    def test_shared_item_code_is_split_across_lines_in_order(self):
        rows = [_line(1, 1, [("BAT-100", 1)], package_qty=2), _line(2, 1, [("BAT-100", 1)], package_qty=4)]
        # Line 1 orders 2 and takes them first; line 2 orders 4 and gets the other 3 of the 5 delivered.
        lines = delivery_plan(rows, {1: 1, 2: 1}, {"BAT-100": 5})
        self.assertEqual([l["items"][0]["remaining_qty"] for l in lines], [0.0, 1.0])


class ChallanOptionRowsTests(unittest.TestCase):
    """A challan's hierarchy holds only what is left, so its flat items pre-fill to remaining."""

    def test_first_challan_is_pre_filled_with_the_full_order(self):
        rows = challan_option_rows(OC_ROWS, OC_CHOSEN, {})
        self.assertEqual(_billed_qty(rows, OC_CHOSEN), {"UPS-3K": 3.0, "BAT-100": 8.0})

    def test_second_challan_is_pre_filled_with_what_is_left(self):
        # The first challan delivered the UPS line; batteries are part-delivered (4 of 8).
        rows = challan_option_rows(OC_ROWS, OC_CHOSEN, {"UPS-3K": 3, "BAT-100": 4})
        self.assertEqual(_billed_qty(rows, OC_CHOSEN), {"BAT-100": 4.0})

    def test_covered_lines_leave_the_other_lines_off_the_challan(self):
        rows = challan_option_rows(OC_ROWS, OC_CHOSEN, {}, covered_lines=[2])
        self.assertEqual({r["line_no"] for r in rows}, {2})
        self.assertEqual(_billed_qty(rows, OC_CHOSEN), {"BAT-100": 8.0})

    def test_alternatives_are_kept_unchanged_and_stay_unbilled(self):
        rows = challan_option_rows(OC_ROWS, OC_CHOSEN, {"UPS-3K": 1})
        by_key = {(r["line_no"], r["option_no"]): r for r in rows}
        self.assertEqual(by_key[(1, 1)]["is_selected"], 1)
        self.assertEqual(by_key[(1, 2)]["is_selected"], 0)
        self.assertEqual(by_key[(1, 2)]["items"][0]["unit_qty"], 1)
        self.assertAlmostEqual(by_key[(1, 1)]["items"][0]["unit_qty"], 2.0 / 3)

    def test_fully_delivered_billed_row_keeps_its_selection_with_no_items(self):
        # Line 1 is done; it must stay flagged so the unbilled alternative is not picked on save.
        rows = challan_option_rows(OC_ROWS, OC_CHOSEN, {"UPS-3K": 3}, covered_lines=[1, 2])
        billed = [r for r in rows if r["line_no"] == 1 and r["is_selected"]]
        self.assertEqual(len(billed), 1)
        self.assertEqual(billed[0]["items"], [])
        self.assertEqual(_billed_qty(rows, OC_CHOSEN), {"BAT-100": 8.0})

    def test_shared_item_code_pre_fill_respects_order_of_lines(self):
        rows = [_line(1, 1, [("BAT-100", 1)], package_qty=2), _line(2, 1, [("BAT-100", 1)], package_qty=4)]
        challan = challan_option_rows(rows, {1: 1, 2: 1}, {"BAT-100": 5})
        self.assertEqual(_billed_qty(challan, {1: 1, 2: 1}), {"BAT-100": 1.0})

    def test_zero_package_quantity_counts_as_one_as_flatten_does(self):
        rows = [_line(1, 1, [("CAB", 5)], package_qty=0)]
        challan = challan_option_rows(rows, {1: 1}, {"CAB": 2})
        self.assertEqual(_billed_qty(challan, {1: 1}), {"CAB": 3.0})

    def test_line_not_on_the_order_is_refused(self):
        with self.assertRaisesRegex(SalesCaseRuleError, "Line 9 is not on this Order Confirmation"):
            challan_option_rows(OC_ROWS, OC_CHOSEN, {}, covered_lines=[9])

    def test_no_line_chosen_is_refused(self):
        with self.assertRaisesRegex(SalesCaseRuleError, "Choose at least one line"):
            challan_option_rows(OC_ROWS, OC_CHOSEN, {}, covered_lines=[])

    def test_nothing_left_on_the_covered_lines_is_refused(self):
        with self.assertRaisesRegex(SalesCaseRuleError, "Nothing is left to deliver"):
            challan_option_rows(OC_ROWS, OC_CHOSEN, {"UPS-3K": 3}, covered_lines=[1])

    def test_order_line_numbers_cover_every_option(self):
        self.assertEqual(oc_line_numbers(OC_ROWS), [1, 2])


if __name__ == "__main__":
    unittest.main()
