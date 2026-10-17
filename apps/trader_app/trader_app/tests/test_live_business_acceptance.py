# -*- coding: utf-8 -*-
"""Disposable-site acceptance coverage using real ERPNext documents and ledgers."""

from __future__ import unicode_literals

import unittest
import uuid

try:
    import frappe
    from frappe.tests.utils import FrappeTestCase
    from frappe.utils import flt

    FRAPPE_SITE_ACTIVE = bool(getattr(getattr(frappe, "local", None), "site", None))
except (ImportError, ModuleNotFoundError):
    frappe = None
    FrappeTestCase = unittest.TestCase
    flt = None
    FRAPPE_SITE_ACTIVE = False


@unittest.skipUnless(FRAPPE_SITE_ACTIVE, "requires an initialized Frappe site")
class LiveBusinessAcceptanceTests(FrappeTestCase):
    """Exercise sale, purchase, returns, payment, journal, reports, and stock in one rollback scope."""

    def test_sales_purchase_returns_and_finance_reconcile(self):
        from erpnext.accounts.doctype.payment_entry.payment_entry import (
            get_payment_entry,
        )
        from erpnext.buying.doctype.purchase_order.purchase_order import (
            make_purchase_receipt,
        )
        from erpnext.controllers.sales_and_purchase_return import make_return_doc
        from erpnext.selling.doctype.quotation.quotation import make_sales_order
        from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note
        from erpnext.stock.doctype.delivery_note.delivery_note import make_sales_invoice
        from erpnext.stock.doctype.purchase_receipt.purchase_receipt import (
            make_purchase_invoice,
        )
        from frappe.utils import add_days, nowdate
        from trader_app.api import dashboard, reports
        from trader_app.demo.seed_engine.config import DEMO_CONFIG

        company = DEMO_CONFIG["company_name"]
        token = uuid.uuid4().hex[:10].upper()
        customer_name = "QA Acceptance Customer " + token
        supplier_name = "QA Acceptance Supplier " + token
        sales_item_code = "QA-SALE-" + token
        purchase_item_code = "QA-PUR-" + token
        test_date = "2026-03-20"
        delivery_date = "2026-03-21"
        return_date = "2026-03-22"
        warehouse = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0}, "name")
        item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name")
        customer_group = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
        territory = frappe.db.get_value("Territory", {"is_group": 0}, "name")
        supplier_group = frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
        self.assertTrue(warehouse)
        self.assertTrue(item_group)
        self.assertTrue(customer_group)
        self.assertTrue(territory)
        self.assertTrue(supplier_group)

        def create_item(item_code, item_name):
            return frappe.get_doc(
                {
                    "doctype": "Item",
                    "item_code": item_code,
                    "item_name": item_name,
                    "item_group": item_group,
                    "stock_uom": "Nos",
                    "is_stock_item": 1,
                }
            ).insert(ignore_permissions=True)

        def submit(doc):
            doc.insert(ignore_permissions=True)
            doc.submit()
            return doc

        def assert_balanced(voucher_type, voucher_no):
            delta = frappe.db.sql(
                """
                SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
                FROM `tabGL Entry`
                WHERE voucher_type = %s AND voucher_no = %s
                """,
                (voucher_type, voucher_no),
            )[0][0]
            self.assertAlmostEqual(flt(delta), 0, places=2, msg="{0} {1} must balance".format(voucher_type, voucher_no))

        def dashboard_kpis():
            frappe.cache().delete_value(dashboard._dashboard_kpi_cache_key(company))
            return dashboard.get_kpis(company=company)

        customer = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": customer_name,
                "customer_type": "Company",
                "customer_group": customer_group,
                "territory": territory,
            }
        ).insert(ignore_permissions=True)
        supplier = frappe.get_doc(
            {
                "doctype": "Supplier",
                "supplier_name": supplier_name,
                "supplier_group": supplier_group,
                "supplier_type": "Company",
            }
        ).insert(ignore_permissions=True)
        sales_item = create_item(sales_item_code, sales_item_code)
        purchase_item = create_item(purchase_item_code, purchase_item_code)

        opening_stock = submit(
            frappe.get_doc(
                {
                    "doctype": "Stock Entry",
                    "purpose": "Material Receipt",
                    "stock_entry_type": "Material Receipt",
                    "company": company,
                    "posting_date": test_date,
                    "posting_time": "08:00:00",
                    "set_posting_time": 1,
                    "items": [
                        {
                            "item_code": sales_item.name,
                            "t_warehouse": warehouse,
                            "qty": 20,
                            "basic_rate": 100,
                        }
                    ],
                }
            )
        )

        baseline_kpis = dashboard_kpis()
        baseline_receivables = flt(baseline_kpis["outstanding_receivables"])
        baseline_payables = flt(baseline_kpis["outstanding_payables"])
        quotation = submit(
            frappe.get_doc(
                {
                    "doctype": "Quotation",
                    "quotation_to": "Customer",
                    "party_name": customer.name,
                    "company": company,
                    "transaction_date": test_date,
                    "valid_till": add_days(nowdate(), 30),
                    "items": [
                        {
                            "item_code": sales_item.name,
                            "qty": 4,
                            "rate": 150,
                            "warehouse": warehouse,
                        }
                    ],
                }
            )
        )
        sales_order = make_sales_order(quotation.name)
        sales_order.transaction_date = test_date
        sales_order.delivery_date = delivery_date
        sales_order = submit(sales_order)
        delivery_note = make_delivery_note(sales_order.name)
        delivery_note.posting_date = delivery_date
        delivery_note.posting_time = "10:00:00"
        delivery_note.set_posting_time = 1
        submit(delivery_note)
        sales_invoice = make_sales_invoice(delivery_note.name)
        sales_invoice.posting_date = delivery_date
        submit(sales_invoice)
        self.assertEqual(sales_invoice.docstatus, 1)
        self.assertEqual(sales_invoice.items[0].delivery_note, delivery_note.name)
        self.assertAlmostEqual(flt(sales_invoice.outstanding_amount), flt(sales_invoice.grand_total), places=2)
        assert_balanced("Stock Entry", opening_stock.name)
        assert_balanced("Delivery Note", delivery_note.name)
        assert_balanced("Sales Invoice", sales_invoice.name)

        kpis_after_sale = dashboard_kpis()
        self.assertAlmostEqual(
            flt(kpis_after_sale["outstanding_receivables"]),
            baseline_receivables + flt(sales_invoice.grand_total),
            places=2,
        )
        sales_report = reports.get_sales_report(
            company=company,
            from_date=delivery_date,
            to_date=delivery_date,
            customer=customer.name,
        )
        self.assertEqual(int(sales_report["totals"]["invoice_count"]), 1)
        self.assertAlmostEqual(flt(sales_report["totals"]["grand_total"]), flt(sales_invoice.grand_total), places=2)

        sales_payment = get_payment_entry("Sales Invoice", sales_invoice.name, ignore_permissions=True)
        sales_payment.posting_date = delivery_date
        sales_payment.reference_date = delivery_date
        sales_payment.reference_no = "QA-SALE-" + token
        submit(sales_payment)
        sales_invoice.reload()
        self.assertAlmostEqual(flt(sales_invoice.outstanding_amount), 0, places=2)
        self.assertAlmostEqual(flt(dashboard_kpis()["outstanding_receivables"]), baseline_receivables, places=2)
        assert_balanced("Payment Entry", sales_payment.name)

        sales_return = make_return_doc("Sales Invoice", sales_invoice.name)
        sales_return.posting_date = return_date
        sales_return.set_posting_time = 1
        sales_return.posting_time = "10:00:00"
        submit(sales_return)
        delivery_return = make_return_doc("Delivery Note", delivery_note.name)
        delivery_return.posting_date = return_date
        delivery_return.set_posting_time = 1
        delivery_return.posting_time = "11:00:00"
        submit(delivery_return)
        self.assertEqual(sales_return.return_against, sales_invoice.name)
        self.assertEqual(delivery_return.return_against, delivery_note.name)
        self.assertAlmostEqual(flt(sales_return.grand_total), -flt(sales_invoice.grand_total), places=2)
        sales_stock_qty = frappe.db.sql(
            """
            SELECT COALESCE(SUM(actual_qty), 0)
            FROM `tabStock Ledger Entry`
            WHERE item_code = %s AND warehouse = %s AND is_cancelled = 0
            """,
            (sales_item.name, warehouse),
        )[0][0]
        self.assertAlmostEqual(flt(sales_stock_qty), 20, places=2)
        assert_balanced("Sales Invoice", sales_return.name)
        assert_balanced("Delivery Note", delivery_return.name)
        return_report = reports.get_sales_return_report(
            company=company,
            from_date=return_date,
            to_date=return_date,
            customer=customer.name,
        )
        self.assertEqual(return_report["summary"]["total_returns"], 1)
        self.assertGreater(return_report["summary"]["total_return_value"], 0)

        purchase_order = submit(
            frappe.get_doc(
                {
                    "doctype": "Purchase Order",
                    "company": company,
                    "supplier": supplier.name,
                    "transaction_date": test_date,
                    "schedule_date": test_date,
                    "items": [
                        {
                            "item_code": purchase_item.name,
                            "qty": 6,
                            "rate": 80,
                            "warehouse": warehouse,
                            "schedule_date": test_date,
                        }
                    ],
                }
            )
        )
        purchase_receipt = make_purchase_receipt(purchase_order.name)
        purchase_receipt.posting_date = test_date
        purchase_receipt.posting_time = "09:00:00"
        purchase_receipt.set_posting_time = 1
        submit(purchase_receipt)
        purchase_invoice = make_purchase_invoice(purchase_receipt.name)
        purchase_invoice.posting_date = test_date
        submit(purchase_invoice)
        self.assertEqual(purchase_invoice.docstatus, 1)
        self.assertEqual(purchase_invoice.items[0].purchase_receipt, purchase_receipt.name)
        self.assertAlmostEqual(flt(purchase_invoice.outstanding_amount), flt(purchase_invoice.grand_total), places=2)
        purchase_report = reports.get_purchase_report(
            company=company,
            from_date=test_date,
            to_date=test_date,
            supplier=supplier.name,
        )
        self.assertEqual(int(purchase_report["totals"]["invoice_count"]), 1)
        self.assertAlmostEqual(
            flt(purchase_report["totals"]["grand_total"]), flt(purchase_invoice.grand_total), places=2
        )
        self.assertAlmostEqual(
            flt(dashboard_kpis()["outstanding_payables"]),
            baseline_payables + flt(purchase_invoice.grand_total),
            places=2,
        )
        assert_balanced("Purchase Receipt", purchase_receipt.name)
        assert_balanced("Purchase Invoice", purchase_invoice.name)

        purchase_payment = get_payment_entry("Purchase Invoice", purchase_invoice.name, ignore_permissions=True)
        purchase_payment.posting_date = test_date
        purchase_payment.reference_date = test_date
        purchase_payment.reference_no = "QA-PUR-" + token
        submit(purchase_payment)
        purchase_invoice.reload()
        self.assertAlmostEqual(flt(purchase_invoice.outstanding_amount), 0, places=2)
        self.assertAlmostEqual(flt(dashboard_kpis()["outstanding_payables"]), baseline_payables, places=2)
        assert_balanced("Payment Entry", purchase_payment.name)

        purchase_invoice_return = make_return_doc("Purchase Invoice", purchase_invoice.name)
        purchase_invoice_return.posting_date = return_date
        purchase_invoice_return.set_posting_time = 1
        purchase_invoice_return.posting_time = "12:00:00"
        submit(purchase_invoice_return)
        purchase_receipt_return = make_return_doc("Purchase Receipt", purchase_receipt.name)
        purchase_receipt_return.posting_date = return_date
        purchase_receipt_return.set_posting_time = 1
        purchase_receipt_return.posting_time = "13:00:00"
        submit(purchase_receipt_return)
        self.assertEqual(purchase_invoice_return.return_against, purchase_invoice.name)
        self.assertEqual(purchase_receipt_return.return_against, purchase_receipt.name)
        self.assertAlmostEqual(flt(purchase_invoice_return.grand_total), -flt(purchase_invoice.grand_total), places=2)
        purchase_stock_qty = frappe.db.sql(
            """
            SELECT COALESCE(SUM(actual_qty), 0)
            FROM `tabStock Ledger Entry`
            WHERE item_code = %s AND warehouse = %s AND is_cancelled = 0
            """,
            (purchase_item.name, warehouse),
        )[0][0]
        self.assertAlmostEqual(flt(purchase_stock_qty), 0, places=2)
        assert_balanced("Purchase Invoice", purchase_invoice_return.name)
        assert_balanced("Purchase Receipt", purchase_receipt_return.name)
        purchase_return_report = reports.get_purchase_return_report(
            company=company,
            from_date=return_date,
            to_date=return_date,
            supplier=supplier.name,
        )
        self.assertEqual(purchase_return_report["summary"]["total_returns"], 1)
        self.assertGreater(purchase_return_report["summary"]["total_return_value"], 0)

        cash_account = frappe.db.get_value("Company", company, "default_cash_account")
        bank_account = frappe.db.get_value(
            "Account", {"company": company, "account_type": "Bank", "is_group": 0}, "name"
        )
        self.assertTrue(cash_account)
        self.assertTrue(bank_account)
        journal = submit(
            frappe.get_doc(
                {
                    "doctype": "Journal Entry",
                    "company": company,
                    "posting_date": test_date,
                    "user_remark": "QA acceptance transfer " + token,
                    "accounts": [
                        {"account": cash_account, "debit_in_account_currency": 100},
                        {"account": bank_account, "credit_in_account_currency": 100},
                    ],
                }
            )
        )
        assert_balanced("Journal Entry", journal.name)
        posted_journal = frappe.db.sql(
            """
            SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            FROM `tabGL Entry`
            WHERE voucher_type = 'Journal Entry' AND voucher_no = %s AND is_cancelled = 0
            """,
            (journal.name,),
        )[0]
        self.assertEqual(int(posted_journal[0]), 2)
        self.assertAlmostEqual(flt(posted_journal[1]), 100, places=2)
        self.assertAlmostEqual(flt(posted_journal[2]), 100, places=2)
        journal.cancel()
        self.assertEqual(journal.docstatus, 2)
        assert_balanced("Journal Entry", journal.name)
        reversed_journal = frappe.db.sql(
            """
            SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            FROM `tabGL Entry`
            WHERE voucher_type = 'Journal Entry' AND voucher_no = %s
              AND is_cancelled = 1 AND remarks = CONCAT('On cancellation of ', voucher_no)
            """,
            (journal.name,),
        )[0]
        self.assertEqual(int(reversed_journal[0]), 2)
        self.assertAlmostEqual(flt(reversed_journal[1]), 100, places=2)
        self.assertAlmostEqual(flt(reversed_journal[2]), 100, places=2)
