# -*- coding: utf-8 -*-
"""Integration tests for the Day-Book / Day-Close feature — real Frappe site + DB.

These exercise ``trader_app.api.daybook`` end-to-end against real ERPNext
documents: does the day-book voucher list match what was actually posted,
does the day-close summary reconcile against it, and — since Customer/
Supplier/Item are shared master data with no `company` column — is tenant
isolation actually enforced in the raw SQL (regression coverage for
commit 25d7cea).

Because the engine endpoints call ``frappe.db.commit()`` (which defeats the
test-transaction rollback), fixtures are created in ``setUpClass`` and removed
in ``tearDownClass``; every artifact is prefixed ``_ITEST DB`` for safe cleanup.
A far-future posting date is used for all day-book/day-close fixtures so the
totals can be asserted exactly, without existing company data on that date
polluting the aggregates.

Run on bench:
  bench --site <site> set-config allow_tests true
  bench --site <site> run-tests --app trader_app \
        --module trader_app.tests.test_daybook_integration

Or standalone against a site:
  cd apps/trader_app && ../../env/bin/python \
        tests/test_daybook_integration.py --site <site>

The cross-tenant test additionally requires the site to have multi-tenant
mode enabled (``bench execute trader_app.setup.seed_super_admin.run``) —
it is skipped otherwise.
"""

from __future__ import unicode_literals

import unittest

import frappe
from frappe.utils import add_days, flt

COMPANY = "Electrance"
WAREHOUSE = "Stores - ELECT"
ITEM = "_ITEST DB Widget"
CUST = "_ITEST DB Customer"
SUPP = "_ITEST DB Supplier"

# Far-future date so day-book/day-close totals for this date are wholly
# owned by this test's fixtures — no other transaction should ever land here.
TEST_DATE = "2031-06-15"
TEST_DATE_PREV = "2031-06-14"

TENANT_A = "_ITEST DB Tenant A"
TENANT_B = "_ITEST DB Tenant B"


def _leaf(doctype):
    rows = frappe.get_all(doctype, filters={"is_group": 0}, pluck="name", limit=1)
    return rows[0] if rows else None


class DayBookIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not frappe.db.exists("Company", COMPANY):
            raise unittest.SkipTest("Company {0} not present on this site".format(COMPANY))

        cls._orig_components_enabled = frappe.db.get_value(
            "Company", COMPANY, "trader_components_enabled"
        )
        frappe.db.set_value("Company", COMPANY, "trader_components_enabled", 1, update_modified=False)

        cls._orig_neg = frappe.db.get_single_value("Stock Settings", "allow_negative_stock")
        frappe.db.set_single_value("Stock Settings", "allow_negative_stock", 1)

        if not frappe.db.exists("Item", ITEM):
            frappe.get_doc({
                "doctype": "Item", "item_code": ITEM, "item_name": ITEM,
                "item_group": _leaf("Item Group"), "stock_uom": "Nos", "is_stock_item": 1,
                "trader_component_item": 1,
            }).insert(ignore_permissions=True)
        if not frappe.db.exists("Customer", CUST):
            frappe.get_doc({
                "doctype": "Customer", "customer_name": CUST,
                "customer_group": _leaf("Customer Group"), "territory": _leaf("Territory"),
            }).insert(ignore_permissions=True)
        if not frappe.db.exists("Supplier", SUPP):
            frappe.get_doc({
                "doctype": "Supplier", "supplier_name": SUPP,
                "supplier_group": _leaf("Supplier Group"),
            }).insert(ignore_permissions=True)
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        for dt, filt in (
            ("Payment Entry", {"party": ["in", [CUST, SUPP]]}),
            ("Sales Invoice", {"customer": CUST}),
            ("Purchase Invoice", {"supplier": SUPP}),
        ):
            for name in frappe.get_all(dt, filters=filt, pluck="name"):
                doc = frappe.get_doc(dt, name)
                if doc.docstatus == 1:
                    doc.cancel()
                frappe.delete_doc(dt, name, ignore_permissions=True, force=True)
        for dt, name in (("Customer", CUST), ("Supplier", SUPP), ("Item", ITEM)):
            if frappe.db.exists(dt, name):
                frappe.delete_doc(dt, name, ignore_permissions=True, force=True)

        frappe.db.set_single_value("Stock Settings", "allow_negative_stock", cls._orig_neg or 0)
        frappe.db.set_value(
            "Company", COMPANY, "trader_components_enabled",
            cls._orig_components_enabled or 0, update_modified=False,
        )
        frappe.db.commit()

    # ── helpers ─────────────────────────────────────────────────
    def _make_submitted_si(self, qty=2, rate=100, date=TEST_DATE):
        si = frappe.new_doc("Sales Invoice")
        si.company = COMPANY
        si.customer = CUST
        si.posting_date = date
        si.update_stock = 1
        si.set_warehouse = WAREHOUSE
        si.append("items", {"item_code": ITEM, "qty": qty, "rate": rate,
                            "warehouse": WAREHOUSE, "allow_zero_valuation_rate": 1})
        si.insert(ignore_permissions=True)
        si.submit()
        return si

    def _make_submitted_pi(self, qty=3, rate=50, date=TEST_DATE):
        pi = frappe.new_doc("Purchase Invoice")
        pi.company = COMPANY
        pi.supplier = SUPP
        pi.posting_date = date
        pi.update_stock = 1
        pi.set_warehouse = WAREHOUSE
        pi.append("items", {"item_code": ITEM, "qty": qty, "rate": rate,
                            "warehouse": WAREHOUSE})
        pi.insert(ignore_permissions=True)
        pi.submit()
        return pi

    # ── day book: voucher listing & bucketing ──────────────────
    def test_day_book_lists_and_buckets_every_voucher_type(self):
        from trader_app.api.daybook import get_day_book

        si = self._make_submitted_si(qty=2, rate=100)  # grand_total 200, direction in
        pi = self._make_submitted_pi(qty=3, rate=50)   # grand_total 150, direction out

        result = get_day_book(company=COMPANY, date=TEST_DATE, page=1, page_size=200)
        rows_by_voucher = {row["voucher_no"]: row for row in result["data"]}

        self.assertIn(si.name, rows_by_voucher)
        self.assertEqual(rows_by_voucher[si.name]["voucher_type"], "Sale")
        self.assertEqual(rows_by_voucher[si.name]["direction"], "in")
        self.assertEqual(flt(rows_by_voucher[si.name]["amount"]), 200.0)

        self.assertIn(pi.name, rows_by_voucher)
        self.assertEqual(rows_by_voucher[pi.name]["voucher_type"], "Purchase")
        self.assertEqual(rows_by_voucher[pi.name]["direction"], "out")
        self.assertEqual(flt(rows_by_voucher[pi.name]["amount"]), 150.0)

        self.assertEqual(flt(result["totals"]["total_sales"]), 200.0)
        self.assertEqual(flt(result["totals"]["total_purchases"]), 150.0)

    # ── day close: reconciliation against day book ─────────────
    def test_day_close_summary_reconciles_with_day_book_totals(self):
        from trader_app.api.daybook import get_day_book, get_day_close_summary

        self._make_submitted_si(qty=4, rate=100)   # +400 sales
        self._make_submitted_pi(qty=2, rate=75)    # +150 purchases

        book = get_day_book(company=COMPANY, date=TEST_DATE, page=1, page_size=200)
        close = get_day_close_summary(company=COMPANY, date=TEST_DATE)

        # The two screens must agree exactly — they're supposed to be the
        # same underlying transactions viewed two ways.
        self.assertEqual(flt(close["total_sales"]), flt(book["totals"]["total_sales"]))
        self.assertEqual(flt(close["total_purchases"]), flt(book["totals"]["total_purchases"]))
        self.assertEqual(flt(close["cash_in"]), flt(book["totals"]["cash_in"]))
        self.assertEqual(flt(close["cash_out"]), flt(book["totals"]["cash_out"]))
        self.assertEqual(flt(close["net_cash"]), flt(book["totals"]["net_cash"]))

    def test_day_close_closing_cash_moves_by_exactly_the_payment_posted(self):
        from trader_app.api.daybook import get_day_close_summary, settle_party

        si = self._make_submitted_si(qty=1, rate=500, date=TEST_DATE)

        before = get_day_close_summary(company=COMPANY, date=TEST_DATE_PREV)
        settle_party(
            party_type="Customer", party=CUST, amount=500,
            mode_of_payment="Cash", company=COMPANY, posting_date=TEST_DATE,
        )
        after = get_day_close_summary(company=COMPANY, date=TEST_DATE)

        self.assertEqual(flt(after["closing_cash"]) - flt(before["closing_cash"]), 500.0)
        # And the invoice this payment settled should now show zero outstanding.
        si.reload()
        self.assertEqual(flt(si.outstanding_amount), 0.0)

    def test_settle_party_fifo_allocation_appears_in_day_book(self):
        from trader_app.api.daybook import get_day_book, settle_party

        si = self._make_submitted_si(qty=1, rate=300, date=TEST_DATE)
        result = settle_party(
            party_type="Customer", party=CUST, amount=300,
            mode_of_payment="Cash", company=COMPANY, posting_date=TEST_DATE,
        )
        self.assertEqual(flt(result["allocated_amount"]), 300.0)
        self.assertEqual(flt(result["unallocated_amount"]), 0.0)

        book = get_day_book(company=COMPANY, date=TEST_DATE, page=1, page_size=200)
        pe_rows = [r for r in book["data"] if r["voucher_no"] == result["payment_entry"]]
        self.assertEqual(len(pe_rows), 1)
        self.assertEqual(pe_rows[0]["direction"], "in")
        self.assertEqual(flt(pe_rows[0]["amount"]), 300.0)

        si.reload()
        self.assertEqual(flt(si.outstanding_amount), 0.0)


class DayBookTenantIsolationIntegrationTests(unittest.TestCase):
    """Two real tenants, two real companies — confirms get_incoming/get_outgoing
    never leak a party across tenant boundaries (regression for 25d7cea)."""

    @classmethod
    def setUpClass(cls):
        from trader_app.api.tenant import is_multitenant_enabled

        if not is_multitenant_enabled():
            raise unittest.SkipTest(
                "Multi-tenant mode not enabled on this site "
                "(bench execute trader_app.setup.seed_super_admin.run)"
            )

        from trader_app.api.super_admin import create_tenant

        cls._tenant_info = {}
        for label, tenant_name in (("A", TENANT_A), ("B", TENANT_B)):
            if frappe.db.exists("Trader Tenant", {"tenant_name": tenant_name}):
                raise unittest.SkipTest(
                    "Leftover fixture {0} from a previous run — clean up manually".format(tenant_name)
                )
            result = create_tenant({
                "tenant_name": tenant_name,
                "enabled_modules": ["dashboard", "settings", "customers", "components"],
                "admin_email": "_itest.db.{0}@example.test".format(label.lower()),
                "admin_first_name": "ITest{0}".format(label),
                "admin_password": "ITestPass!2031",
            })
            cls._tenant_info[label] = result
            frappe.db.commit()

        # One customer with an outstanding invoice per tenant.
        cls._customers = {}
        for label in ("A", "B"):
            company = cls._tenant_info[label]["tenant"]["company"]
            admin_user = cls._tenant_info[label]["admin_user"]
            cust_name = "_ITEST DB Cust {0}".format(label)
            frappe.set_user(admin_user)
            try:
                cust = frappe.get_doc({
                    "doctype": "Customer", "customer_name": cust_name,
                    "customer_group": _leaf("Customer Group"), "territory": _leaf("Territory"),
                }).insert(ignore_permissions=True)
                frappe.db.set_value("Customer", cust.name, "trader_opening_balance", 1000, update_modified=False)
            finally:
                frappe.set_user("Administrator")
            cls._customers[label] = (company, cust.name)
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        frappe.set_user("Administrator")
        for label, (_company, cust_name) in getattr(cls, "_customers", {}).items():
            if frappe.db.exists("Customer", cust_name):
                frappe.delete_doc("Customer", cust_name, ignore_permissions=True, force=True)
        for label, info in getattr(cls, "_tenant_info", {}).items():
            company = info["tenant"]["company"]
            admin_user = info.get("admin_user")
            tenant_name = info["tenant"]["tenant_id"]
            if admin_user and frappe.db.exists("User", admin_user):
                frappe.delete_doc("User", admin_user, ignore_permissions=True, force=True)
            if frappe.db.exists("Trader Tenant", tenant_name):
                frappe.delete_doc("Trader Tenant", tenant_name, ignore_permissions=True, force=True)
            if company and frappe.db.exists("Company", company):
                frappe.delete_doc("Company", company, ignore_permissions=True, force=True)
        frappe.db.commit()

    def test_get_incoming_never_returns_the_other_tenants_customer(self):
        from trader_app.api.daybook import get_incoming

        company_a, cust_a = self._customers["A"]
        company_b, cust_b = self._customers["B"]
        admin_a = self._tenant_info["A"]["admin_user"]

        frappe.set_user(admin_a)
        try:
            result = get_incoming(company=company_a, page=1, page_size=100)
        finally:
            frappe.set_user("Administrator")

        parties = {row["party"] for row in result["data"]}
        self.assertIn(cust_a, parties)
        self.assertNotIn(cust_b, parties, "tenant A must never see tenant B's customer")


def _bootstrap_and_run():
    import argparse
    import sys

    parser = argparse.ArgumentParser()
    parser.add_argument("--site", required=True)
    parser.add_argument("--sites-path", default=".")
    args, remaining = parser.parse_known_args()

    frappe.init(site=args.site, sites_path=args.sites_path)
    frappe.connect()
    frappe.set_user("Administrator")
    try:
        suite = unittest.TestSuite()
        loader = unittest.TestLoader()
        suite.addTests(loader.loadTestsFromTestCase(DayBookIntegrationTests))
        suite.addTests(loader.loadTestsFromTestCase(DayBookTenantIsolationIntegrationTests))
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        sys.exit(0 if result.wasSuccessful() else 1)
    finally:
        frappe.destroy()


if __name__ == "__main__":
    _bootstrap_and_run()
