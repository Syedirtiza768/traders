# -*- coding: utf-8 -*-
"""Pure-logic tests for the configurable sales lifecycle extension.

No Frappe site required — the engines' decision cores were written as pure
functions precisely so they could be tested here. Run standalone or on bench:

  python -m unittest trader_app.tests.test_sales_lifecycle
  bench --site <site> run-tests --app trader_app --module trader_app.tests.test_sales_lifecycle

Unlike the other stub-based suites, this one installs *real* implementations of
the ``frappe.utils`` helpers the engines use (flt / cint / getdate / nowdate /
add_days), because the logic under test does real arithmetic and date math.
"""

from __future__ import unicode_literals

import datetime
import sys
import types
import unittest
from unittest.mock import MagicMock


# ── Real frappe.utils helpers the engines rely on ──────────────────
def _flt(value, precision=None):
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    return round(number, precision) if precision is not None else number


def _cint(value):
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _getdate(value=None):
    if not value:
        return datetime.date.today()
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    return datetime.datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _nowdate():
    return datetime.date.today().isoformat()


def _add_days(value, days):
    return (_getdate(value) + datetime.timedelta(days=int(days))).isoformat()


# ── Environment setup: real frappe (bench) vs stub (standalone) ────
_frappe = sys.modules.get("frappe")
_need_stub = _frappe is None or not isinstance(_frappe, types.ModuleType)

if _need_stub:
    if _frappe is None:
        _frappe = MagicMock()
        sys.modules["frappe"] = _frappe

    def _throw(msg, exc=None):
        raise (exc if isinstance(exc, type) else Exception)(msg)

    _frappe.throw = _throw
    _frappe.PermissionError = type("PermissionError", (Exception,), {})
    _frappe.ValidationError = type("ValidationError", (Exception,), {})
    _frappe._ = lambda s, *a, **k: s
    _frappe.whitelist = lambda fn=None, **k: (fn if fn is not None else (lambda f: f))
    _frappe.get_all = lambda *a, **k: []
    if not hasattr(_frappe, "session"):
        _frappe.session = types.SimpleNamespace(user="tester@test.com")

    # MagicMock auto-provides the utils we don't care about (now_datetime, etc.,
    # imported by sibling modules), while our 5 are real so arithmetic/date logic works.
    _utils = MagicMock()
    _utils.flt = _flt
    _utils.cint = _cint
    _utils.getdate = _getdate
    _utils.nowdate = _nowdate
    _utils.add_days = _add_days
    sys.modules["frappe.utils"] = _utils
else:
    # Real frappe under bench — just make the whitelist decorator a passthrough.
    _frappe.whitelist = lambda fn=None, **k: (fn if fn is not None else (lambda f: f))


from trader_app.api.rules import evaluate_condition
from trader_app.api.tax_policy import match_tax_policies, _service_matches
from trader_app.api.grouped_invoicing import validate_group, DEFAULT_GROUPING
from trader_app.api.posting import build_posting_preview
from trader_app.api.opportunity import (
    PROFILE_TEMPLATES,
    DEFAULT_INACTIVE_PROFILE,
    build_profile_defaults,
    infer_display_stage,
)
from trader_app.api.ar import (
    PROFILE_TEMPLATES as AR_PROFILE_TEMPLATES,
    DEFAULT_INACTIVE_PROFILE as AR_DEFAULT_INACTIVE,
    build_profile_defaults as build_ar_profile_defaults,
    is_within_settle_tolerance,
    reported_outstanding,
    can_access_internal_print,
)
from trader_app.api.customer_pack import (
    PROFILE_TEMPLATES as CUSTOMER_PACK_TEMPLATES,
    DEFAULT_INACTIVE_PROFILE as CUSTOMER_PACK_INACTIVE,
    build_profile_defaults as build_customer_pack_defaults,
)
from trader_app.api.hierarchy import (
    effective_item_qty,
    remaining_package_qty,
    copy_commercial_options,
    flatten_commercial_options,
    hierarchy_amount,
    select_first_options,
)


# ────────────────────────────────────────────────────────────────
class RuleEngineTests(unittest.TestCase):
    def test_leaf_numeric_comparisons(self):
        self.assertTrue(evaluate_condition({"field": "total", "op": "<=", "value": 0}, {"total": 0}))
        self.assertFalse(evaluate_condition({"field": "total", "op": "<=", "value": 0}, {"total": 5}))
        self.assertTrue(evaluate_condition({"field": "total", "op": ">", "value": 100}, {"total": 250}))

    def test_string_and_set_operators(self):
        self.assertTrue(evaluate_condition({"field": "status", "op": "==", "value": "Draft"}, {"status": "Draft"}))
        self.assertTrue(evaluate_condition({"field": "g", "op": "in", "value": ["A", "B"]}, {"g": "A"}))
        self.assertTrue(evaluate_condition({"field": "g", "op": "not in", "value": ["A", "B"]}, {"g": "C"}))

    def test_is_set_and_is_empty(self):
        self.assertTrue(evaluate_condition({"field": "ref", "op": "is_empty"}, {"ref": ""}))
        self.assertTrue(evaluate_condition({"field": "ref", "op": "is_empty"}, {}))
        self.assertTrue(evaluate_condition({"field": "ref", "op": "is_set"}, {"ref": "X"}))
        self.assertFalse(evaluate_condition({"field": "ref", "op": "is_set"}, {"ref": None}))

    def test_boolean_combinators(self):
        node = {"all": [{"field": "a", "op": "==", "value": 1}, {"field": "b", "op": "==", "value": 2}]}
        self.assertTrue(evaluate_condition(node, {"a": 1, "b": 2}))
        self.assertFalse(evaluate_condition(node, {"a": 1, "b": 9}))
        self.assertTrue(evaluate_condition({"any": [{"field": "a", "op": "==", "value": 1},
                                                    {"field": "b", "op": "==", "value": 2}]}, {"a": 1, "b": 9}))
        self.assertTrue(evaluate_condition({"not": {"field": "a", "op": "is_set"}}, {}))

    def test_existential_child_path_matching(self):
        # Fires when ANY item row has qty <= 0.
        cond = {"any": [{"field": "items.qty", "op": "<=", "value": 0}]}
        self.assertTrue(evaluate_condition(cond, {"items": [{"qty": 3}, {"qty": 0}]}))
        self.assertFalse(evaluate_condition(cond, {"items": [{"qty": 3}, {"qty": 1}]}))

    def test_invalid_conditions_raise(self):
        with self.assertRaises(ValueError):
            evaluate_condition({"field": "x", "op": "~=", "value": 1}, {"x": 1})
        with self.assertRaises(ValueError):
            evaluate_condition({"field": "x"}, {"x": 1})  # missing op
        with self.assertRaises(ValueError):
            evaluate_condition("not-a-dict", {})


class TaxPolicyMatchTests(unittest.TestCase):
    def _policies(self):
        return [
            {"name": "SERVICE", "tax_mode": "exclusive", "tax_template": None, "rate": 16,
             "effective_from": "2026-01-01", "effective_to": None, "service_flag": "service",
             "customer_category": None, "jurisdiction": None},
            {"name": "GOODS", "tax_mode": "exclusive", "tax_template": None, "rate": 18,
             "effective_from": "2026-01-01", "effective_to": None, "service_flag": "goods",
             "customer_category": None, "jurisdiction": None},
        ]

    def test_goods_vs_service_dimension(self):
        pol = self._policies()
        self.assertEqual(match_tax_policies(pol, {"date": "2026-07-07", "is_service": True})["name"], "SERVICE")
        self.assertEqual(match_tax_policies(pol, {"date": "2026-07-07", "is_service": False})["name"], "GOODS")

    def test_effective_window(self):
        expired = [{"name": "OLD", "effective_from": "2020-01-01", "effective_to": "2021-12-31",
                    "service_flag": "any", "customer_category": None, "jurisdiction": None,
                    "tax_mode": "exclusive", "tax_template": None, "rate": 17}]
        self.assertIsNone(match_tax_policies(expired, {"date": "2026-07-07", "is_service": None}))
        future = [{"name": "FUTURE", "effective_from": "2099-01-01", "effective_to": None,
                   "service_flag": "any", "customer_category": None, "jurisdiction": None,
                   "tax_mode": "exclusive", "tax_template": None, "rate": 5}]
        self.assertIsNone(match_tax_policies(future, {"date": "2026-07-07", "is_service": None}))

    def test_customer_category_and_jurisdiction(self):
        pol = [{"name": "VIP", "effective_from": "2026-01-01", "effective_to": None, "service_flag": "any",
                "customer_category": "Wholesale", "jurisdiction": "Punjab",
                "tax_mode": "exclusive", "tax_template": None, "rate": 10}]
        self.assertIsNotNone(match_tax_policies(pol, {"date": "2026-07-07", "customer_category": "Wholesale", "jurisdiction": "Punjab"}))
        self.assertIsNone(match_tax_policies(pol, {"date": "2026-07-07", "customer_category": "Retail", "jurisdiction": "Punjab"}))
        self.assertIsNone(match_tax_policies(pol, {"date": "2026-07-07", "customer_category": "Wholesale", "jurisdiction": "Sindh"}))

    def test_first_match_wins_by_order(self):
        pol = self._policies()
        # Both 'any' would match; order (priority pre-sorted by caller) decides.
        pol = [dict(p, service_flag="any") for p in pol]
        self.assertEqual(match_tax_policies(pol, {"date": "2026-07-07"})["name"], "SERVICE")

    def test_service_matches_helper(self):
        self.assertTrue(_service_matches("any", True))
        self.assertTrue(_service_matches(None, False))
        self.assertTrue(_service_matches("service", True))
        self.assertFalse(_service_matches("service", False))
        self.assertTrue(_service_matches("goods", False))


class GroupingPolicyTests(unittest.TestCase):
    def test_empty_selection_is_a_violation(self):
        self.assertTrue(len(validate_group({}, [])) > 0)

    def test_same_debtor_rule(self):
        pol = {"same_debtor_required": 1}
        self.assertEqual(validate_group(pol, [{"name": "A", "customer": "X"}, {"name": "B", "customer": "X"}]), [])
        self.assertTrue(len(validate_group(pol, [{"name": "A", "customer": "X"}, {"name": "B", "customer": "Y"}])) > 0)

    def test_same_debtor_off_allows_mixed(self):
        pol = {"same_debtor_required": 0}
        self.assertEqual(validate_group(pol, [{"name": "A", "customer": "X"}, {"name": "B", "customer": "Y"}]), [])

    def test_max_docs_per_group(self):
        rows = [{"name": n, "customer": "X"} for n in ("A", "B", "C")]
        self.assertTrue(len(validate_group({"same_debtor_required": 1, "max_docs_per_group": 2}, rows)) > 0)
        self.assertEqual(validate_group({"same_debtor_required": 1, "max_docs_per_group": 0}, rows), [])

    def test_default_grouping_shape(self):
        self.assertEqual(DEFAULT_GROUPING["same_debtor_required"], 1)
        self.assertEqual(DEFAULT_GROUPING["max_docs_per_group"], 0)


class PostingPreviewTests(unittest.TestCase):
    def test_balanced_simple_invoice(self):
        doc = {"grand_total": 1000, "company": "X", "debit_to": "Debtors",
               "items": [{"amount": 1000, "income_account": "Sales"}], "taxes": []}
        p = build_posting_preview(doc)
        self.assertTrue(p["balanced"])
        self.assertEqual(p["total_debit"], 1000)
        self.assertEqual(p["total_credit"], 1000)
        self.assertEqual(len(p["entries"]), 2)

    def test_balanced_with_tax(self):
        doc = {"grand_total": 1180, "company": "X", "debit_to": "Debtors",
               "items": [{"net_amount": 1000, "income_account": "Sales"}],
               "taxes": [{"account_head": "GST Payable", "tax_amount": 180}]}
        p = build_posting_preview(doc)
        self.assertTrue(p["balanced"])
        self.assertEqual(p["total_debit"], 1180)
        self.assertEqual(p["total_credit"], 1180)

    def test_multiple_income_accounts_aggregate(self):
        doc = {"grand_total": 300, "company": "X", "debit_to": "Debtors",
               "items": [{"amount": 100, "income_account": "Sales A"},
                         {"amount": 200, "income_account": "Sales A"},
                         {"amount": 0, "income_account": "Sales B"}], "taxes": []}
        p = build_posting_preview(doc)
        credits = {e["account"]: e["credit"] for e in p["entries"] if e["credit"]}
        self.assertEqual(credits["Sales A"], 300)
        self.assertTrue(p["balanced"])


class OpportunityProfileTemplateTests(unittest.TestCase):
    def test_electrence_template_is_full_lifecycle(self):
        d = build_profile_defaults("electrence")
        self.assertEqual(d["template_key"], "electrence")
        self.assertEqual(d["require_opportunity_for_quotation"], 1)
        self.assertEqual(d["enable_order_confirmation"], 1)
        self.assertEqual(d["hierarchy_on_oc"], 1)
        self.assertEqual(d["hierarchy_on_dn"], 1)
        self.assertEqual(d["invoice_from_dn_only"], 1)
        self.assertEqual(d["stock_posting_moment"], "delivery_note")
        self.assertEqual(d["cogs_model"], "A")

    def test_legacy_electrance_alias_maps_to_electrence(self):
        d = build_profile_defaults("electrance")
        self.assertEqual(d["template_key"], "electrence")
        self.assertEqual(d, build_profile_defaults("electrence"))

    def test_minimal_template_skips_oc_and_full_hierarchy(self):
        d = build_profile_defaults("minimal")
        self.assertEqual(d["template_key"], "minimal")
        self.assertEqual(d["require_opportunity_for_quotation"], 0)
        self.assertEqual(d["enable_order_confirmation"], 0)
        self.assertEqual(d["hierarchy_on_dn"], 0)

    def test_unknown_template_raises(self):
        with self.assertRaises(ValueError):
            build_profile_defaults("not-a-pack")

    def test_inactive_defaults_are_safe_noops(self):
        self.assertEqual(DEFAULT_INACTIVE_PROFILE["require_opportunity_for_quotation"], 0)
        self.assertEqual(DEFAULT_INACTIVE_PROFILE["hierarchy_on_quotation"], 0)
        self.assertIn("electrence", PROFILE_TEMPLATES)
        self.assertIn("minimal", PROFILE_TEMPLATES)


class OpportunityStageInferenceTests(unittest.TestCase):
    def test_enquiry_when_empty(self):
        self.assertEqual(infer_display_stage({}), "Enquiry")
        self.assertEqual(infer_display_stage({"quotations": 0, "customer_pos": 0, "delivery_notes": 0}), "Enquiry")

    def test_quotation_stage(self):
        self.assertEqual(infer_display_stage({"quotations": 2}), "Quotation")

    def test_po_beats_quotation(self):
        self.assertEqual(
            infer_display_stage({"quotations": 2, "customer_pos": 1}),
            "Customer PO",
        )

    def test_delivery_beats_all(self):
        self.assertEqual(
            infer_display_stage({"quotations": 2, "customer_pos": 1, "delivery_notes": 1}),
            "Delivery",
        )


class CommercialHierarchyTests(unittest.TestCase):
    def _sample_options(self):
        return [
            {
                "line_no": 1,
                "client_requirements": "UPS panel",
                "option_no": 1,
                "option_text": "Option A",
                "package_qty": 2,
                "qty_invoiced": 1,
                "items": [
                    {"item_code": "ITEM-A", "unit_qty": 3, "unit_price": 100, "discount_percent": 0},
                    {"item_code": "ITEM-B", "unit_qty": 1, "unit_price": 50, "discount_percent": 10},
                ],
            }
        ]

    def test_effective_qty_rule(self):
        self.assertEqual(effective_item_qty(3, 2), 6)
        self.assertEqual(effective_item_qty(3, None), 3)

    def test_remaining_package_qty(self):
        self.assertEqual(remaining_package_qty(2, 1), 1)
        self.assertEqual(remaining_package_qty(2, 2), 0)
        self.assertEqual(remaining_package_qty(2, 5), 0)

    def test_flatten_uses_package_multiplier(self):
        flat = flatten_commercial_options(self._sample_options())
        by_code = {r["item_code"]: r for r in flat}
        self.assertEqual(by_code["ITEM-A"]["qty"], 6)
        self.assertEqual(by_code["ITEM-A"]["rate"], 100)
        self.assertEqual(by_code["ITEM-B"]["qty"], 2)
        self.assertEqual(by_code["ITEM-B"]["rate"], 45)  # 50 * 0.9

    def test_copy_remaining_only_reduces_package_qty(self):
        copied = copy_commercial_options(self._sample_options(), remaining_only=True)
        self.assertEqual(len(copied), 1)
        self.assertEqual(copied[0]["package_qty"], 1)
        self.assertEqual(copied[0]["qty_invoiced"], 0)
        self.assertEqual(len(copied[0]["items"]), 2)

    def test_copy_remaining_skips_fully_invoiced(self):
        rows = self._sample_options()
        rows[0]["qty_invoiced"] = 2
        self.assertEqual(copy_commercial_options(rows, remaining_only=True), [])

    def test_select_first_options_and_amount(self):
        rows = [
            {
                "line_no": 1,
                "option_no": 1,
                "package_qty": 2500,
                "items": [{"item_code": "OFC", "unit_qty": 1, "unit_price": 450}],
            },
            {
                "line_no": 2,
                "option_no": 1,
                "option_text": "Option A",
                "package_qty": 1000,
                "items": [{"item_code": "BEL", "unit_qty": 1, "unit_price": 1650}],
            },
            {
                "line_no": 2,
                "option_no": 2,
                "option_text": "Option B",
                "package_qty": 1000,
                "items": [{"item_code": "DRA", "unit_qty": 1, "unit_price": 450}],
            },
        ]
        first = select_first_options(rows)
        self.assertEqual(len(first), 2)
        self.assertEqual({(r["line_no"], r["option_no"]) for r in first}, {(1, 1), (2, 1)})
        self.assertEqual(hierarchy_amount(rows, first_option_only=True), 2775000)
        flat = flatten_commercial_options(rows, first_option_only=True)
        self.assertEqual({r["item_code"] for r in flat}, {"OFC", "BEL"})


class ARProfileTemplateTests(unittest.TestCase):
    def test_electrence_template_has_personas_and_tolerance(self):
        d = build_ar_profile_defaults("electrence")
        self.assertEqual(d["template_key"], "electrence")
        self.assertEqual(d["settle_tolerance"], 5.0)
        self.assertEqual(d["auto_allocate_on_receipt"], 0)
        self.assertEqual(d["require_explicit_allocation"], 1)
        self.assertEqual(d["print_personas_enabled"], 1)
        self.assertEqual(d["withhold_reporting_enabled"], 1)
        self.assertEqual(d["shop_sale_enabled"], 0)

    def test_minimal_template_is_conservative(self):
        d = build_ar_profile_defaults("minimal")
        self.assertEqual(d["template_key"], "minimal")
        self.assertEqual(d["print_personas_enabled"], 0)
        self.assertEqual(d["withhold_reporting_enabled"], 0)
        self.assertEqual(d["settle_tolerance"], 0.01)

    def test_unknown_template_raises(self):
        with self.assertRaises(ValueError):
            build_ar_profile_defaults("not-a-pack")

    def test_inactive_defaults_safe(self):
        self.assertEqual(AR_DEFAULT_INACTIVE["require_explicit_allocation"], 1)
        self.assertIn("electrence", AR_PROFILE_TEMPLATES)
        self.assertIn("minimal", AR_PROFILE_TEMPLATES)


class ARSettleToleranceTests(unittest.TestCase):
    def test_within_tolerance(self):
        self.assertTrue(is_within_settle_tolerance(4.99, 5.0))
        self.assertTrue(is_within_settle_tolerance(-3.0, 5.0))
        self.assertTrue(is_within_settle_tolerance(0, 5.0))

    def test_outside_tolerance(self):
        self.assertFalse(is_within_settle_tolerance(5.01, 5.0))
        self.assertFalse(is_within_settle_tolerance(-6.0, 5.0))


class ARReportedOutstandingTests(unittest.TestCase):
    def test_without_withhold(self):
        self.assertEqual(reported_outstanding(1000, 200), 800)
        self.assertEqual(reported_outstanding(1000, 200, wht_amount=45, apply_withhold=False), 800)

    def test_withhold_reduces_reported_only(self):
        self.assertEqual(
            reported_outstanding(1000, 200, wht_amount=45, gst_withhold_amount=10, apply_withhold=True),
            745,
        )

    def test_never_negative(self):
        self.assertEqual(reported_outstanding(100, 200), 0.0)


class ARInternalPrintAccessTests(unittest.TestCase):
    def test_finance_manager_allowed(self):
        self.assertTrue(can_access_internal_print(["Trader Finance Manager"]))

    def test_sales_user_denied(self):
        self.assertFalse(can_access_internal_print(["Trader Sales User"]))


class CustomerPackTemplateTests(unittest.TestCase):
    def test_electrence_template_enables_extended_master(self):
        d = build_customer_pack_defaults("electrence")
        self.assertEqual(d["template_key"], "electrence")
        self.assertEqual(d["extended_master_fields"], 1)
        self.assertEqual(d["contacts_enabled"], 1)
        self.assertEqual(d["require_billing_address"], 1)
        self.assertEqual(d["require_payment_terms"], 1)
        self.assertEqual(d["ship_to_sites_enabled"], 0)

    def test_minimal_template_is_conservative(self):
        d = build_customer_pack_defaults("minimal")
        self.assertEqual(d["extended_master_fields"], 0)
        self.assertEqual(d["contacts_enabled"], 0)

    def test_unknown_template_raises(self):
        with self.assertRaises(ValueError):
            build_customer_pack_defaults("not-a-pack")

    def test_inactive_defaults_safe(self):
        self.assertEqual(CUSTOMER_PACK_INACTIVE["extended_master_fields"], 0)
        self.assertIn("electrence", CUSTOMER_PACK_TEMPLATES)


if __name__ == "__main__":
    unittest.main()
