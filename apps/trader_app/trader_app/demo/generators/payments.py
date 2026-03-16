# -*- coding: utf-8 -*-
"""Generator — Payments.

Creates:
- Customer payments (Payment Entries — Receive)
- Supplier payments (Payment Entries — Pay)
- Partial payments for some invoices
- Ensures outstanding receivables/payables exist

Payment distribution:
- 70% of invoices: fully paid
- 15% of invoices: partially paid
- 15% of invoices: unpaid (creates outstanding balances)
"""

from __future__ import unicode_literals

import random
import frappe
from frappe.utils import flt, add_days, getdate, nowdate
from trader_app.demo.seed_engine.base import BaseGenerator


class PaymentGenerator(BaseGenerator):
    name = "Payments"
    depends_on = ["Sales", "Purchases"]

    def generate(self):
        self._suppress_notifications()
        try:
            self._generate_customer_payments()
            self._generate_supplier_payments()
            frappe.db.commit()
        finally:
            self._restore_notifications()

    def _generate_customer_payments(self):
        """Generate payments against Sales Invoices."""
        company = self.config["company_name"]

        invoices = frappe.get_all(
            "Sales Invoice",
            filters={"company": company, "docstatus": 1, "outstanding_amount": [">", 0]},
            fields=["name", "customer", "outstanding_amount", "grand_total", "posting_date"],
            order_by="posting_date ASC",
            limit_page_length=0,
        )

        if not invoices:
            print("  ⚠️  No outstanding sales invoices found for payment generation.")
            return

        full_pay_rate = self.config["payment_completion_rate"]
        partial_pay_rate = self.config["partial_payment_rate"]

        fully_paid = 0
        partially_paid = 0
        unpaid = 0

        for inv in invoices:
            roll = random.random()

            if roll < full_pay_rate:
                # Full payment
                self._create_payment_entry(
                    company=company,
                    payment_type="Receive",
                    party_type="Customer",
                    party=inv.customer,
                    amount=flt(inv.outstanding_amount),
                    reference_doctype="Sales Invoice",
                    reference_name=inv.name,
                    posting_date=add_days(inv.posting_date, random.randint(1, 30)),
                )
                fully_paid += 1
            elif roll < full_pay_rate + partial_pay_rate:
                # Partial payment (30–80% of outstanding)
                partial_pct = random.uniform(0.3, 0.8)
                amount = round(flt(inv.outstanding_amount) * partial_pct, 2)
                self._create_payment_entry(
                    company=company,
                    payment_type="Receive",
                    party_type="Customer",
                    party=inv.customer,
                    amount=amount,
                    reference_doctype="Sales Invoice",
                    reference_name=inv.name,
                    posting_date=add_days(inv.posting_date, random.randint(1, 45)),
                )
                partially_paid += 1
            else:
                unpaid += 1

            if (fully_paid + partially_paid + unpaid) % 50 == 0:
                frappe.db.commit()

        print(f"  ✅ Customer payments: {fully_paid} full, {partially_paid} partial, {unpaid} unpaid")

    def _generate_supplier_payments(self):
        """Generate payments against Purchase Invoices."""
        company = self.config["company_name"]

        invoices = frappe.get_all(
            "Purchase Invoice",
            filters={"company": company, "docstatus": 1, "outstanding_amount": [">", 0]},
            fields=["name", "supplier", "outstanding_amount", "grand_total", "posting_date"],
            order_by="posting_date ASC",
            limit_page_length=0,
        )

        if not invoices:
            print("  ⚠️  No outstanding purchase invoices found for payment generation.")
            return

        full_pay_rate = self.config["payment_completion_rate"]
        partial_pay_rate = self.config["partial_payment_rate"]

        fully_paid = 0
        partially_paid = 0
        unpaid = 0

        for inv in invoices:
            roll = random.random()

            if roll < full_pay_rate:
                self._create_payment_entry(
                    company=company,
                    payment_type="Pay",
                    party_type="Supplier",
                    party=inv.supplier,
                    amount=flt(inv.outstanding_amount),
                    reference_doctype="Purchase Invoice",
                    reference_name=inv.name,
                    posting_date=add_days(inv.posting_date, random.randint(1, 30)),
                )
                fully_paid += 1
            elif roll < full_pay_rate + partial_pay_rate:
                partial_pct = random.uniform(0.3, 0.8)
                amount = round(flt(inv.outstanding_amount) * partial_pct, 2)
                self._create_payment_entry(
                    company=company,
                    payment_type="Pay",
                    party_type="Supplier",
                    party=inv.supplier,
                    amount=amount,
                    reference_doctype="Purchase Invoice",
                    reference_name=inv.name,
                    posting_date=add_days(inv.posting_date, random.randint(1, 45)),
                )
                partially_paid += 1
            else:
                unpaid += 1

            if (fully_paid + partially_paid + unpaid) % 50 == 0:
                frappe.db.commit()

        print(f"  ✅ Supplier payments: {fully_paid} full, {partially_paid} partial, {unpaid} unpaid")

    def _create_payment_entry(self, company, payment_type, party_type, party,
                               amount, reference_doctype, reference_name, posting_date):
        """Create a Payment Entry."""
        # Don't create future-dated payments
        invoice_posting_date = frappe.db.get_value(reference_doctype, reference_name, "posting_date")
        if invoice_posting_date and getdate(posting_date) < getdate(invoice_posting_date):
            posting_date = invoice_posting_date
        if getdate(posting_date) > getdate(nowdate()):
            posting_date = nowdate()

        abbr = self.config["company_abbr"]

        # Determine accounts
        if payment_type == "Receive":
            paid_to = frappe.db.get_value(
                "Account",
                filters={"account_type": "Cash", "company": company, "is_group": 0},
                fieldname="name"
            ) or f"Cash - {abbr}"
            paid_from = frappe.db.get_value(
                "Account",
                filters={"account_type": "Receivable", "company": company, "is_group": 0},
                fieldname="name"
            ) or f"Debtors - {abbr}"
        else:
            paid_from = frappe.db.get_value(
                "Account",
                filters={"account_type": "Cash", "company": company, "is_group": 0},
                fieldname="name"
            ) or f"Cash - {abbr}"
            paid_to = frappe.db.get_value(
                "Account",
                filters={"account_type": "Payable", "company": company, "is_group": 0},
                fieldname="name"
            ) or f"Creditors - {abbr}"

        pe = frappe.get_doc({
            "doctype": "Payment Entry",
            "payment_type": payment_type,
            "company": company,
            "party_type": party_type,
            "party": party,
            "posting_date": posting_date,
            "paid_amount": amount,
            "received_amount": amount,
            "target_exchange_rate": 1,
            "paid_to": paid_to if payment_type == "Receive" else paid_to,
            "paid_from": paid_from if payment_type == "Receive" else paid_from,
            "paid_to_account_currency": self.config["currency"],
            "paid_from_account_currency": self.config["currency"],
            "references": [{
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "allocated_amount": amount,
            }],
        })

        try:
            pe.insert(ignore_permissions=True)
            pe.submit()
            self.created_records.append(("Payment Entry", pe.name))
        except Exception as e:
            self.errors.append(f"Payment Entry: {str(e)}")

    def validate(self):
        # Check that some receivables exist
        receivables = frappe.db.sql("""
            SELECT COALESCE(SUM(outstanding_amount), 0) as total
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND outstanding_amount > 0
        """)
        assert flt(receivables[0][0]) > 0, "No outstanding receivables found"

        # Check that some payables exist
        payables = frappe.db.sql("""
            SELECT COALESCE(SUM(outstanding_amount), 0) as total
            FROM `tabPurchase Invoice`
            WHERE docstatus = 1 AND outstanding_amount > 0
        """)
        assert flt(payables[0][0]) > 0, "No outstanding payables found"

        return True
