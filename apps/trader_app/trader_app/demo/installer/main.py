# -*- coding: utf-8 -*-
"""Demo Installer — Main orchestrator for demo data installation.

Usage:
    bench --site <site> execute trader_app.demo.install_demo
"""

from __future__ import unicode_literals

import time

import frappe
from frappe.utils import now_datetime
from trader_app.demo.generators.bundles_transfers import (
    BundlesTransfersGenerator,
)
from trader_app.demo.generators.company import CompanyGenerator
from trader_app.demo.generators.customers import CustomerGenerator
from trader_app.demo.generators.enrichment import EnrichmentGenerator
from trader_app.demo.generators.financial import FinancialGenerator
from trader_app.demo.generators.inventory import InventoryGenerator
from trader_app.demo.generators.items import ItemGenerator
from trader_app.demo.generators.opportunity_chain import OpportunityChainGenerator
from trader_app.demo.generators.payments import PaymentGenerator
from trader_app.demo.generators.purchases import PurchaseGenerator
from trader_app.demo.generators.quotations import QuotationGenerator
from trader_app.demo.generators.requisitions import RequisitionsGenerator
from trader_app.demo.generators.sales import SalesGenerator
from trader_app.demo.generators.suppliers import SupplierGenerator
from trader_app.demo.generators.users import UserGenerator
from trader_app.demo.seed_engine.config import DEMO_CONFIG


class DemoInstaller:
    """Orchestrates the complete demo data installation."""

    SEED_GUARD_DOCTYPES = (
        "Customer",
        "Supplier",
        "Item",
        "Item Price",
        "Quotation",
        "Sales Invoice",
        "Purchase Invoice",
        "Sales Order",
        "Purchase Order",
        "Delivery Note",
        "Purchase Receipt",
        "POS Invoice",
        "Payment Entry",
        "Journal Entry",
        "Stock Entry",
        "Stock Reconciliation",
        "Landed Cost Voucher",
        "Material Request",
        "Request for Quotation",
        "Supplier Quotation",
        "Opportunity",
        "Stock Ledger Entry",
        "GL Entry",
    )

    GENERATOR_ORDER = [
        CompanyGenerator,
        UserGenerator,
        CustomerGenerator,
        SupplierGenerator,
        ItemGenerator,
        InventoryGenerator,
        BundlesTransfersGenerator,
        QuotationGenerator,
        RequisitionsGenerator,
        PurchaseGenerator,
        SalesGenerator,
        PaymentGenerator,
        FinancialGenerator,
        OpportunityChainGenerator,
        EnrichmentGenerator,
    ]

    def __init__(self, config=None):
        self.config = config or DEMO_CONFIG
        self.generators = []
        self.start_time = None
        self.end_time = None

    def install(self):
        """Run the complete demo installation."""
        self._assert_install_target()
        self.start_time = time.time()

        print("\n" + "=" * 70)
        print("🚀 TRADERS — DEMO DATA INSTALLER")
        print("=" * 70)
        print(f"Company: {self.config['company_name']}")
        print(f"Period:  {self.config['demo_start_date']} → {self.config['demo_end_date']}")
        print(f"Started: {now_datetime()}")
        print("=" * 70)

        # Suppress all notifications
        frappe.flags.in_import = True
        frappe.flags.mute_emails = True
        frappe.flags.mute_messages = True

        try:
            # Run generators in order
            for GeneratorClass in self.GENERATOR_ORDER:
                generator = GeneratorClass(self.config)
                generator.run()
                self.generators.append(generator)

            # Run validation
            print("\n" + "=" * 60)
            print("🔍 VALIDATION")
            print("=" * 60)

            all_valid = True
            validation_failures = 0
            for generator in self.generators:
                try:
                    if not generator.run_validation():
                        all_valid = False
                        validation_failures += 1
                except Exception as e:
                    all_valid = False
                    validation_failures += 1
                    print(f"  ❌ {generator.name}: {str(e)}")

            # Print summary
            self.end_time = time.time()
            elapsed = self.end_time - self.start_time

            print("\n" + "=" * 70)
            print("📊 INSTALLATION SUMMARY")
            print("=" * 70)

            total_records = 0
            total_errors = 0
            for gen in self.generators:
                count = gen.get_progress()
                errors = len(gen.errors)
                total_records += count
                total_errors += errors
                if errors:
                    all_valid = False
                status = "✅" if errors == 0 else "⚠️"
                print(f"  {status} {gen.name:20s} — {count:6d} records, {errors:3d} errors")
                for detail in gen.errors[:10]:
                    print(f"      - {str(detail)[:500]}")
                if errors > 10:
                    print(f"      - ... and {errors - 10} more errors")

            print(f"\n  📦 Total Records: {total_records}")
            print(f"  ⚠️  Total Errors:  {total_errors}")
            print(f"  ⏱️  Time Elapsed:  {elapsed:.1f} seconds")
            print(f"  {'✅ DEMO INSTALLED SUCCESSFULLY' if all_valid else '⚠️  DEMO INSTALLED WITH WARNINGS'}")
            print("=" * 70)

            # Print dashboard verification
            self._verify_dashboard_data()

            if not all_valid:
                failure_summary = []
                if total_errors:
                    failure_summary.append(f"{total_errors} generator errors")
                if validation_failures:
                    failure_summary.append(f"{validation_failures} validation failures")
                frappe.throw(
                    "Demo installation is incomplete: {0}. "
                    "Review the generator details above before using this dataset.".format(
                        " and ".join(failure_summary)
                    )
                )

        except Exception as e:
            frappe.db.rollback()
            print(f"\n❌ INSTALLATION FAILED: {str(e)}")
            frappe.log_error(message=frappe.get_traceback(), title="Demo Installation Failed")
            raise
        finally:
            frappe.flags.in_import = False
            frappe.flags.mute_emails = False
            frappe.flags.mute_messages = False

    def _assert_install_target(self):
        """Restrict demo seeding to an explicitly disposable, empty site."""
        if frappe.conf.get("allow_demo_seed") is not True:
            frappe.throw(
                "Demo seeding is disabled. Set allow_demo_seed=true only on a disposable development or QA site."
            )

        if frappe.db.count("Company"):
            frappe.throw(
                "Demo seeding requires a fresh site with no Company records. "
                "Use an empty disposable site or reset this site before seeding."
            )

        company = self.config["company_name"]
        if frappe.db.exists("Company", company):
            frappe.throw(
                "The demo company already exists. Demo seeding can only run once on a fresh disposable site; "
                "reset the site to reseed."
            )

        populated_doctypes = [doctype for doctype in self.SEED_GUARD_DOCTYPES if frappe.db.count(doctype)]
        if populated_doctypes:
            frappe.throw(
                "Demo seeding requires an empty site. Existing business data was found in: {0}. "
                "Use a fresh disposable site.".format(", ".join(populated_doctypes))
            )

    def uninstall(self):
        """Reject the unsafe legacy site-wide demo deletion path."""
        frappe.throw(
            "Demo uninstallation is disabled because it could delete business data. "
            "Remove demo data by resetting its disposable site."
        )

    def _verify_dashboard_data(self):
        """Verify that dashboard metrics would show meaningful data."""
        company = self.config["company_name"]

        print("\n📊 DASHBOARD VERIFICATION")
        print("-" * 40)

        # Total customers
        customers = frappe.db.count("Customer", filters={"disabled": 0})
        print(f"  Customers:           {customers}")

        # Total suppliers
        suppliers = frappe.db.count("Supplier", filters={"disabled": 0})
        print(f"  Suppliers:           {suppliers}")

        # Total items
        items = frappe.db.count("Item", filters={"is_stock_item": 1})
        print(f"  Items:               {items}")

        # Sales invoices
        sales = frappe.db.count("Sales Invoice", filters={"company": company, "docstatus": 1})
        print(f"  Sales Invoices:      {sales}")

        # Purchase invoices
        purchases = frappe.db.count("Purchase Invoice", filters={"company": company, "docstatus": 1})
        print(f"  Purchase Invoices:   {purchases}")

        # Outstanding receivables
        receivables = frappe.db.sql(
            """
            SELECT COALESCE(SUM(outstanding_amount), 0)
            FROM `tabSales Invoice`
            WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
        """,
            (company,),
        )
        print(f"  Receivables (PKR):   {receivables[0][0]:,.0f}")

        # Outstanding payables
        payables = frappe.db.sql(
            """
            SELECT COALESCE(SUM(outstanding_amount), 0)
            FROM `tabPurchase Invoice`
            WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
        """,
            (company,),
        )
        print(f"  Payables (PKR):      {payables[0][0]:,.0f}")

        # Stock value
        stock_val = frappe.db.sql(
            """
            SELECT COALESCE(SUM(stock_value), 0)
            FROM `tabBin`
            WHERE warehouse IN (SELECT name FROM `tabWarehouse` WHERE company = %s)
        """,
            (company,),
        )
        print(f"  Stock Value (PKR):   {stock_val[0][0]:,.0f}")

        # Payment entries
        payments = frappe.db.count("Payment Entry", filters={"company": company, "docstatus": 1})
        print(f"  Payment Entries:     {payments}")

        # Journal entries
        journals = frappe.db.count("Journal Entry", filters={"company": company, "docstatus": 1})
        print(f"  Journal Entries:     {journals}")

        print("-" * 40)
