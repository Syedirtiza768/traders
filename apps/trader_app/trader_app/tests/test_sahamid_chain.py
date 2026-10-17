# -*- coding: utf-8 -*-
"""Pure-logic tests for the Sales Case → Quotation → OC → DC → Invoice chain.

Covers the accepted-option model (which option an order, challan and invoice bill),
the quotation finalisation rules, revision numbering, credit-limit and withholding
decisions, template-driven GST on the printed quotation, and the reconciliation
comparisons. The legacy findings they close are noted on each class.

  python -m unittest trader_app.tests.test_sahamid_chain
"""

from __future__ import unicode_literals

import unittest

# Importing the lifecycle suite installs the shared frappe stubs / real utils.
from trader_app.tests import test_sales_lifecycle  # noqa: F401
from trader_app.api.commercial_totals import compute_commercial_totals  # noqa: E402
from trader_app.api.hierarchy import (  # noqa: E402
    copy_commercial_options,
    derive_package_price,
    flatten_commercial_options,
    apply_selection,
    invalid_selections,
    option_row_to_dict,
    resolve_selection,
    select_options,
    selected_rows,
    selection_from_rows,
)
from trader_app.api.quotation_rules import (  # noqa: E402
    credit_limit_decision,
    finalization_errors,
    next_revision_number,
    wht_mismatch,
)
from trader_app.api.reconciliation import (  # noqa: E402
    amounts_agree,
    ledger_out_of_balance,
    over_limit_refs,
    rates_disagree,
)
from trader_app.api.sales_case_rules import challan_option_rows, delivery_plan  # noqa: E402


def _option(line, option, items, package_qty=1, is_selected=0):
    return {
        "line_no": line,
        "option_no": option,
        "package_qty": package_qty,
        "option_text": "L{0}O{1}".format(line, option),
        "is_selected": is_selected,
        "items": [
            {
                "item_code": code,
                "unit_qty": unit_qty,
                "unit_price": price,
                "discount_percent": discount,
            }
            for code, unit_qty, price, discount in items
        ],
    }


class AcceptedOptionTests(unittest.TestCase):
    """Legacy F-04 / F-05: a line's alternatives must not all be billed."""

    def setUp(self):
        self.rows = [
            _option(1, 1, [("UPS-ECO", 1, 100000, 0)], package_qty=2),
            _option(1, 2, [("UPS-BRAND", 1, 150000, 0)], package_qty=2),
            _option(2, 1, [("BATTERY", 4, 10000, 0)]),
            _option(2, 2, [("BATTERY-PLUS", 4, 12000, 0)]),
        ]

    def test_no_flags_and_no_explicit_choice_defaults_to_lowest_option(self):
        self.assertEqual(resolve_selection(self.rows), {1: 1, 2: 1})

    def test_flag_chosen_by_the_customer_is_honoured(self):
        flagged = [dict(r, is_selected=1 if (r["line_no"], r["option_no"]) == (1, 2) else 0) for r in self.rows]
        self.assertEqual(selection_from_rows(flagged), {1: 2})
        self.assertEqual(resolve_selection(flagged), {1: 2, 2: 1})

    def test_explicit_choice_overrides_flag(self):
        flagged = [dict(r, is_selected=1 if (r["line_no"], r["option_no"]) == (1, 2) else 0) for r in self.rows]
        self.assertEqual(resolve_selection(flagged, {"1": 1}), {1: 1, 2: 1})

    def test_unknown_explicit_option_falls_back_to_flag_then_lowest(self):
        flagged = [dict(r, is_selected=1 if (r["line_no"], r["option_no"]) == (1, 2) else 0) for r in self.rows]
        self.assertEqual(resolve_selection(flagged, {1: 9}), {1: 2, 2: 1})

    def test_invalid_selection_is_reported_for_user_input(self):
        self.assertEqual(invalid_selections(self.rows, {1: 9, "2": "2", 3: 1}), [(1, 9), (3, 1)])
        self.assertEqual(invalid_selections(self.rows, {"2": "2"}), [])

    def test_flat_items_bill_only_the_chosen_option(self):
        chosen = resolve_selection(self.rows, {1: 2})
        flat = flatten_commercial_options(self.rows, selected_options=chosen)
        self.assertEqual(sorted(f["item_code"] for f in flat), ["BATTERY", "UPS-BRAND"])
        total = sum(f["qty"] * f["rate"] for f in flat)
        self.assertAlmostEqual(total, 2 * 150000 + 4 * 10000)

    def test_select_options_picks_flagged_row(self):
        flagged = [dict(r, is_selected=1 if (r["line_no"], r["option_no"]) == (1, 2) else 0) for r in self.rows]
        picked = select_options(flagged)
        self.assertEqual([(r["line_no"], r["option_no"]) for r in picked], [(1, 2), (2, 1)])

    def test_apply_selection_marks_rows_and_returns_map(self):
        marked, chosen = apply_selection(self.rows, {"1": "2", 2: 2})
        self.assertEqual(chosen, {1: 2, 2: 2})
        flags = [(r["line_no"], r["option_no"], r["is_selected"]) for r in marked]
        self.assertEqual(flags, [(1, 1, 0), (1, 2, 1), (2, 1, 0), (2, 2, 1)])

    def test_selected_rows_returns_only_billed_options(self):
        billed = selected_rows(self.rows, selected={1: 2})
        self.assertEqual([(r["line_no"], r["option_no"]) for r in billed], [(1, 2), (2, 1)])

    def test_selected_rows_skips_fully_invoiced_billed_option(self):
        rows = [dict(r) for r in self.rows]
        rows[1]["qty_invoiced"] = 2  # option 2 of line 1 already invoiced in full (package_qty 2)
        billed = selected_rows(rows, remaining_only=True, selected={1: 2})
        self.assertEqual([(r["line_no"], r["option_no"]) for r in billed], [(2, 1)])


class PackagePriceTests(unittest.TestCase):
    """Legacy F-25: a stored price nobody read. It is now derived from the items."""

    def test_package_price_is_sum_of_discounted_item_amounts(self):
        items = [{"amount": 1000.0}, {"amount": 250.5}]
        self.assertEqual(derive_package_price(items), 1250.5)

    def test_option_row_derives_price_and_ignores_stale_input(self):
        row = _option(1, 1, [("UPS", 2, 500, 10)], package_qty=3)
        row["package_price"] = 999  # stale value typed by a user
        serialized = option_row_to_dict(row)
        self.assertEqual(serialized["package_price"], 900.0)
        self.assertEqual(serialized["is_selected"], 0)


class RevisionNumberTests(unittest.TestCase):
    """Legacy F-30: the label was count-based and repeated after a deletion."""

    def test_first_revision(self):
        self.assertEqual(next_revision_number([]), 1)

    def test_sequence(self):
        self.assertEqual(next_revision_number(["R1", "R2"]), 3)

    def test_deleted_revision_is_not_reused(self):
        self.assertEqual(next_revision_number(["R1", "R3"]), 4)
        self.assertEqual(next_revision_number(["R2"]), 3)

    def test_junk_labels_are_ignored(self):
        self.assertEqual(next_revision_number([None, "", "draft", "r1", " R2 "]), 3)


class FinalizationRulesTests(unittest.TestCase):
    """Legacy saveFinalQuotation rules (blueprint 4.3), enforced at submit."""

    def test_valid_hierarchy_passes(self):
        self.assertEqual(finalization_errors([_option(1, 1, [("UPS", 1, 100, 0)])]), [])

    def test_option_without_items_is_refused(self):
        errors = finalization_errors([_option(1, 1, [])])
        self.assertEqual(len(errors), 1)
        self.assertIn("add at least one item", errors[0])

    def test_zero_package_quantity_is_refused(self):
        errors = finalization_errors([_option(1, 1, [("UPS", 1, 100, 0)], package_qty=0)])
        self.assertTrue(any("package quantity" in e for e in errors))

    def test_zero_item_quantity_is_refused(self):
        errors = finalization_errors([_option(1, 1, [("UPS", 0, 100, 0)])])
        self.assertTrue(any("quantity for UPS" in e for e in errors))

    def test_quick_quotation_is_exempt(self):
        self.assertEqual(finalization_errors([_option(1, 1, [])], quick=True), [])


class CreditLimitDecisionTests(unittest.TestCase):
    """Legacy F-28: the credit warning was only colour on screen."""

    def test_no_limit_means_no_check(self):
        decision = credit_limit_decision(0, 500000, 900000)
        self.assertFalse(decision["over_limit"])
        self.assertFalse(decision["block"])

    def test_within_limit(self):
        self.assertFalse(credit_limit_decision(1000, 400, 600)["over_limit"])

    def test_exactly_at_limit_is_allowed(self):
        self.assertFalse(credit_limit_decision(1000, 400, 600)["block"])

    def test_warn_mode_flags_but_does_not_block(self):
        decision = credit_limit_decision(1000, 400, 601, action="Warn")
        self.assertTrue(decision["over_limit"])
        self.assertFalse(decision["block"])

    def test_block_mode_blocks_without_override(self):
        decision = credit_limit_decision(1000, 400, 601, action="Block", can_override=False)
        self.assertTrue(decision["block"])

    def test_block_mode_allows_override_role(self):
        decision = credit_limit_decision(1000, 400, 601, action="Block", can_override=True)
        self.assertTrue(decision["over_limit"])
        self.assertFalse(decision["block"])


class WithholdingMismatchTests(unittest.TestCase):
    """Legacy F-14: the quote's withholding and the invoice's policy were unrelated."""

    def test_same_rate_agrees(self):
        self.assertFalse(wht_mismatch(4.5, 4.5))

    def test_different_rate_disagrees(self):
        self.assertTrue(wht_mismatch(4.5, 2.0))

    def test_quote_without_withholding_against_policy_is_a_mismatch(self):
        self.assertTrue(wht_mismatch(0, 4.5))

    def test_float_noise_is_not_a_mismatch(self):
        self.assertFalse(wht_mismatch(4.5, 4.5000001))


class TemplateGstTests(unittest.TestCase):
    """Legacy F-12: the printed quote assumed 18% (goods) or 16% (services)."""

    def test_default_rate_when_no_template(self):
        totals = compute_commercial_totals(net=1000, gst_mode="exclusive")
        self.assertEqual(totals["gst_rate"], 18.0)
        self.assertAlmostEqual(totals["grand_total"], 1180.0)

    def test_template_rate_overrides_default(self):
        totals = compute_commercial_totals(net=1000, gst_mode="exclusive", gst_rate_override=17.0)
        self.assertEqual(totals["gst_rate"], 17.0)
        self.assertAlmostEqual(totals["grand_total"], 1170.0)

    def test_none_mode_ignores_template_rate(self):
        totals = compute_commercial_totals(net=1000, gst_mode="none", gst_rate_override=17.0)
        self.assertEqual(totals["gst_amount"], 0.0)


class ReconciliationHelperTests(unittest.TestCase):
    """Comparisons behind the reconciliation view (blueprint §12, controls S13/S14)."""

    def test_amounts_agree_within_a_cent(self):
        self.assertTrue(amounts_agree(100.00, 100.009))
        self.assertFalse(amounts_agree(100.00, 100.02))

    def test_over_delivery_keys(self):
        self.assertEqual(over_limit_refs({"a": 3, "b": 2}, {"a": 3, "b": 2.5, "c": 1}), ["b", "c"])

    def test_rate_disagreement_ignores_unknown_targets(self):
        self.assertEqual(rates_disagree({"a": 100, "b": 50}, {"a": 100, "b": 49, "z": 9}), ["b"])

    def test_unbalanced_vouchers(self):
        rows = [("SI-1", 100, 0), ("SI-1", 0, 100), ("SI-2", 100, 0), ("SI-2", 0, 90)]
        self.assertEqual(ledger_out_of_balance(rows), {"SI-2": 10.0})


class PartialDeliveryHierarchyTests(unittest.TestCase):
    """Gap G-8: a challan's flat items come from its hierarchy, so a remaining-quantity prefill
    must survive the save re-sync (``save_commercial_options`` flattens the hierarchy again)."""

    def setUp(self):
        self.oc = [
            _option(1, 1, [("UPS-3K", 1, 100000, 0)], package_qty=3),
            _option(1, 2, [("UPS-3K-ALT", 1, 120000, 0)], package_qty=3),
            _option(2, 1, [("BAT-100", 4, 10000, 0)], package_qty=2),
        ]
        self.chosen = resolve_selection(self.oc)

    @staticmethod
    def _flat(rows):
        """What ``sync_flat_items_from_hierarchy`` writes: the billed option of each line, flattened."""
        return {
            entry["item_code"]: entry["qty"]
            for entry in flatten_commercial_options(rows, selected_options=resolve_selection(rows))
        }

    def test_second_challan_flattens_to_what_is_left(self):
        challan = challan_option_rows(self.oc, self.chosen, {"UPS-3K": 3})
        self.assertEqual(self._flat(challan), {"BAT-100": 8.0})

    def test_partly_delivered_item_flattens_to_the_remainder(self):
        challan = challan_option_rows(self.oc, self.chosen, {"BAT-100": 4})
        self.assertEqual(self._flat(challan), {"UPS-3K": 3.0, "BAT-100": 4.0})

    def test_save_resync_keeps_the_remaining_quantity(self):
        challan = challan_option_rows(self.oc, self.chosen, {"BAT-100": 4})
        saved = copy_commercial_options(challan)
        self.assertEqual(self._flat(saved), self._flat(challan))

    def test_fully_delivered_line_is_not_switched_to_its_alternative_on_save(self):
        challan = challan_option_rows(self.oc, self.chosen, {"UPS-3K": 3})
        saved = copy_commercial_options(challan)
        self.assertEqual(resolve_selection(saved), {1: 1, 2: 1})
        self.assertNotIn("UPS-3K-ALT", self._flat(saved))

    def test_plan_remaining_agrees_with_the_flattened_prefill(self):
        plan = delivery_plan(self.oc, self.chosen, {"UPS-3K": 1, "BAT-100": 2})
        remaining = {i["item_code"]: i["remaining_qty"] for line in plan for i in line["items"]}
        self.assertEqual(remaining, {"UPS-3K": 2.0, "BAT-100": 6.0})
        self.assertEqual(self._flat(challan_option_rows(self.oc, self.chosen, {"UPS-3K": 1, "BAT-100": 2})), {"UPS-3K": 2.0, "BAT-100": 6.0})


if __name__ == "__main__":
    unittest.main()
