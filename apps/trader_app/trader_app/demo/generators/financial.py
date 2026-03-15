# -*- coding: utf-8 -*-
"""Generator — Financial Transactions.

Creates:
- Journal entries for expenses (rent, utilities, salaries, misc)
- Bank account transactions
- Ensures financial statements produce meaningful results
"""

from __future__ import unicode_literals

import random
import frappe
from frappe.utils import getdate, add_months, add_days, nowdate, flt
from trader_app.demo.seed_engine.base import BaseGenerator


# Monthly expense categories
EXPENSE_CATEGORIES = [
    {"name": "Office Rent", "monthly_range": (80000, 150000), "account_type": "Expense Account"},
    {"name": "Utilities", "monthly_range": (15000, 40000), "account_type": "Expense Account"},
    {"name": "Salaries", "monthly_range": (300000, 600000), "account_type": "Expense Account"},
    {"name": "Transportation", "monthly_range": (20000, 50000), "account_type": "Expense Account"},
    {"name": "Office Supplies", "monthly_range": (5000, 15000), "account_type": "Expense Account"},
    {"name": "Communication", "monthly_range": (8000, 20000), "account_type": "Expense Account"},
    {"name": "Insurance", "monthly_range": (10000, 25000), "account_type": "Expense Account"},
    {"name": "Maintenance", "monthly_range": (5000, 20000), "account_type": "Expense Account"},
]


class FinancialGenerator(BaseGenerator):
    name = "Financial"
    depends_on = ["Company", "Sales", "Purchases", "Payments"]

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            abbr = self.config["company_abbr"]
            start_date = getdate(self.config["demo_start_date"])
            end_date = getdate(self.config["demo_end_date"])

            # Create expense accounts if they don't exist
            expense_accounts = self._ensure_expense_accounts(company, abbr)

            # Find cash/bank accounts
            cash_account = frappe.db.get_value(
                "Account",
                filters={"account_type": "Cash", "company": company, "is_group": 0},
                fieldname="name"
            )

            if not cash_account:
                print("  ⚠️  No cash account found. Skipping financial generation.")
                return

            # Generate monthly expenses
            current_date = start_date
            while current_date <= end_date:
                for expense in EXPENSE_CATEGORIES:
                    account = expense_accounts.get(expense["name"])
                    if not account:
                        continue

                    amount = random.randint(*expense["monthly_range"])
                    # Round to nearest 100
                    amount = round(amount / 100) * 100

                    # Post mid-month
                    posting_date = current_date.replace(day=min(15, 28))
                    if getdate(posting_date) > getdate(nowdate()):
                        break

                    self._create_journal_entry(
                        company=company,
                        debit_account=account,
                        credit_account=cash_account,
                        amount=amount,
                        posting_date=posting_date,
                        remark=f"{expense['name']} for {current_date.strftime('%B %Y')}",
                    )

                current_date = add_months(current_date, 1)
                frappe.db.commit()

            frappe.db.commit()
            print(f"  ✅ Created {len(self.created_records)} financial entries")
        finally:
            self._restore_notifications()

    def _ensure_expense_accounts(self, company, abbr):
        """Ensure expense sub-accounts exist."""
        accounts = {}

        # Find a parent expense account
        parent = frappe.db.get_value(
            "Account",
            filters={
                "root_type": "Expense",
                "is_group": 1,
                "company": company,
            },
            fieldname="name",
        )

        if not parent:
            # Try to find any indirect expense parent
            parent = frappe.db.get_value(
                "Account",
                filters={
                    "root_type": "Expense",
                    "company": company,
                    "is_group": 1,
                    "account_name": ["like", "%Indirect%"],
                },
                fieldname="name",
            )

        if not parent:
            parent = frappe.db.get_value(
                "Account",
                filters={"root_type": "Expense", "company": company, "is_group": 1},
                fieldname="name",
            )

        if not parent:
            print("  ⚠️  No parent expense account found.")
            return accounts

        for expense in EXPENSE_CATEGORIES:
            account_name = f"{expense['name']} - {abbr}"
            if frappe.db.exists("Account", account_name):
                accounts[expense["name"]] = account_name
                continue

            try:
                acc = frappe.get_doc({
                    "doctype": "Account",
                    "account_name": expense["name"],
                    "parent_account": parent,
                    "company": company,
                    "root_type": "Expense",
                    "account_type": "Expense Account",
                    "is_group": 0,
                })
                acc.insert(ignore_permissions=True)
                accounts[expense["name"]] = acc.name
            except frappe.DuplicateEntryError:
                accounts[expense["name"]] = account_name
            except Exception as e:
                self.errors.append(f"Account {expense['name']}: {str(e)}")

        return accounts

    def _create_journal_entry(self, company, debit_account, credit_account,
                               amount, posting_date, remark):
        """Create a Journal Entry."""
        je = frappe.get_doc({
            "doctype": "Journal Entry",
            "company": company,
            "posting_date": posting_date,
            "voucher_type": "Journal Entry",
            "user_remark": remark,
            "accounts": [
                {
                    "account": debit_account,
                    "debit_in_account_currency": amount,
                    "credit_in_account_currency": 0,
                },
                {
                    "account": credit_account,
                    "debit_in_account_currency": 0,
                    "credit_in_account_currency": amount,
                },
            ],
        })

        try:
            je.insert(ignore_permissions=True)
            je.submit()
            self.created_records.append(("Journal Entry", je.name))
        except Exception as e:
            self.errors.append(f"Journal Entry: {str(e)}")

    def validate(self):
        count = frappe.db.count("Journal Entry", filters={"docstatus": 1})
        assert count > 0, "No journal entries found"
        return True
