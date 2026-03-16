# -*- coding: utf-8 -*-
"""Generator — Sales (Orders + Invoices).

Creates:
- 300–600 Sales Orders
- 300–600 Sales Invoices
- Realistic distribution across customers, dates, items
- Some invoices remain unpaid (creates receivables)
- Revenue trends with seasonal variation
"""

from __future__ import unicode_literals

import random
import frappe
from frappe.utils import flt, getdate, add_days, nowdate
from trader_app.demo.seed_engine.base import BaseGenerator


class SalesGenerator(BaseGenerator):
    name = "Sales"
    depends_on = ["Company", "Customers", "Items", "Inventory"]
    debug_single_doc = False

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            abbr = self.config["company_abbr"]
            self._last_invoice_total = 0.0
            start_date = getdate(self.config["demo_start_date"])
            end_date = getdate(self.config["demo_end_date"])
            warehouse = f"Main Warehouse - {abbr}"

            customers = frappe.get_all("Customer", filters={"disabled": 0}, pluck="name")
            items = frappe.get_all(
                "Item",
                filters={"is_stock_item": 1, "disabled": 0},
                fields=["name", "item_name", "stock_uom", "item_group"],
                limit_page_length=0,
            )

            self._ensure_item_sales_flags([item["name"] for item in items])

            customer_credit_limits = self._get_customer_credit_limits(company)
            customer_outstanding = self._get_customer_outstanding(company)

            if not customers or not items:
                print("  ⚠️  No customers or items found. Skipping sales generation.")
                return

            # Get item prices
            item_prices = {}
            for ip in frappe.get_all("Item Price",
                                      filters={"price_list": "Standard Selling"},
                                      fields=["item_code", "price_list_rate"],
                                      limit_page_length=0):
                item_prices[ip.item_code] = float(ip.price_list_rate)

            # Generate sales orders and invoices
            num_orders = random.randint(*self.config["num_sales_orders"])
            total_days = (end_date - start_date).days

            print(f"  📊 Generating {num_orders} sales transactions...")

            for i in range(num_orders):
                # Random date within demo period
                random_days = random.randint(0, total_days)
                posting_date = add_days(start_date, random_days)

                # Don't create future transactions
                if getdate(posting_date) > getdate(nowdate()):
                    posting_date = nowdate()

                eligible_customers = [
                    c for c in customers
                    if self._get_available_credit(c, customer_credit_limits, customer_outstanding) > 5000
                ]
                customer = random.choice(eligible_customers or customers)
                num_items = random.randint(1, 8)
                selected_items = random.sample(items, min(num_items, len(items)))

                # Apply seasonal variation (higher in Nov-Jan, lower in Jul-Aug)
                month = getdate(posting_date).month
                seasonal_factor = self._seasonal_factor(month)

                self._create_sales_invoice(
                    company=company,
                    customer=customer,
                    items=selected_items,
                    item_prices=item_prices,
                    customer_credit_limit=customer_credit_limits.get(customer, 0),
                    customer_outstanding=customer_outstanding.get(customer, 0),
                    posting_date=posting_date,
                    warehouse=warehouse,
                    seasonal_factor=seasonal_factor,
                )

                if self._last_invoice_total > 0:
                    customer_outstanding[customer] = customer_outstanding.get(customer, 0) + self._last_invoice_total

                if i % 50 == 0:
                    frappe.db.commit()
                    print(f"    ... {i + 1}/{num_orders} sales created")

                if self.debug_single_doc:
                    frappe.db.commit()
                    return

            frappe.db.commit()
            print(f"  ✅ Created {len(self.created_records)} sales transactions")
            for error in self.errors[:5]:
                print(f"  ⚠️  {error}")
        finally:
            self._restore_notifications()

    def _create_sales_invoice(self, company, customer, items, item_prices,
                               customer_credit_limit, customer_outstanding,
                               posting_date, warehouse, seasonal_factor):
        """Create a Sales Invoice (directly, as many traders skip SO)."""
        si = frappe.get_doc({
            "doctype": "Sales Invoice",
            "company": company,
            "customer": customer,
            "posting_date": posting_date,
            "due_date": posting_date,
            "currency": self.config["currency"],
            "selling_price_list": "Standard Selling",
            "update_stock": 0,
            "set_warehouse": warehouse,
        })

        available_credit = self._get_available_credit(
            customer,
            {customer: customer_credit_limit},
            {customer: customer_outstanding},
        )
        if available_credit <= 2500:
            self._last_invoice_total = 0.0
            return

        remaining_credit = available_credit * 0.6

        for item in items:
            rate = item_prices.get(item["name"], random.uniform(100, 5000))
            # Apply seasonal factor and small random variation
            rate = rate * seasonal_factor * random.uniform(0.95, 1.05)
            max_qty = max(1, int(remaining_credit // max(rate, 1)))
            if max_qty < 1:
                continue

            qty = random.randint(1, min(max_qty, 5))

            # Random discount for some items
            discount = 0
            if random.random() < 0.3:  # 30% chance of discount
                discount = random.choice([2, 5, 7, 10, 15])
            line_total = flt(rate) * qty * (1 - (discount / 100.0))

            if line_total > remaining_credit:
                continue

            remaining_credit -= line_total

            si.append("items", {
                "item_code": item["name"],
                "item_name": item.get("item_name", item["name"]),
                "qty": qty,
                "rate": round(rate, 2),
                "uom": item.get("stock_uom", "Nos"),
                "stock_uom": item.get("stock_uom", "Nos"),
                "conversion_factor": 1,
                "warehouse": warehouse,
                "discount_percentage": discount,
            })

            if remaining_credit <= 0:
                break

        if not si.items:
            self._last_invoice_total = 0.0
            return

        try:
            si.insert(ignore_permissions=True)
            si.submit()
            self._last_invoice_total = flt(si.grand_total)
            self.created_records.append(("Sales Invoice", si.name))
        except Exception as e:
            self._last_invoice_total = 0.0
            if len(self.errors) < 10:
                print(f"  ⚠️  Sales Invoice failed for {customer}: {str(e)}")
            self.errors.append(f"Sales Invoice: {str(e)}")

    def _get_customer_credit_limits(self, company):
        limits = {}
        for row in frappe.get_all(
            "Customer Credit Limit",
            filters={"company": company},
            fields=["parent", "credit_limit"],
            limit_page_length=0,
        ):
            limits[row.parent] = float(row.credit_limit or 0)
        return limits

    def _get_customer_outstanding(self, company):
        outstanding = {}
        for row in frappe.get_all(
            "Sales Invoice",
            filters={"company": company, "docstatus": 1, "outstanding_amount": [">", 0]},
            fields=["customer", "outstanding_amount"],
            limit_page_length=0,
        ):
            outstanding[row.customer] = outstanding.get(row.customer, 0.0) + flt(row.outstanding_amount)
        return outstanding

    @staticmethod
    def _get_available_credit(customer, customer_credit_limits, customer_outstanding):
        credit_limit = flt(customer_credit_limits.get(customer, 0))
        currently_outstanding = flt(customer_outstanding.get(customer, 0))
        return max(credit_limit - currently_outstanding, 0.0)

    def _ensure_item_sales_flags(self, item_codes):
        if not item_codes:
            return

        for item_code in item_codes:
            frappe.db.set_value("Item", item_code, {
                "is_purchase_item": 1,
                "is_sales_item": 1,
            }, update_modified=False)
        frappe.db.commit()


    def _seasonal_factor(self, month):
        """Return a seasonal adjustment factor for revenue."""
        factors = {
            1: 1.15,   # Jan — post-holiday purchasing
            2: 1.05,
            3: 1.10,   # Mar — Ramadan prep
            4: 0.90,   # Apr — Ramadan (may slow)
            5: 1.05,   # May — Eid
            6: 0.95,
            7: 0.85,   # Jul — start of fiscal, slower
            8: 0.90,
            9: 1.00,
            10: 1.05,
            11: 1.15,  # Nov — winter prep
            12: 1.20,  # Dec — year-end, high demand
        }
        return factors.get(month, 1.0)

    def validate(self):
        count = frappe.db.count("Sales Invoice", filters={"docstatus": 1})
        min_expected = self.config["num_sales_invoices"][0] // 2  # Allow some failures
        assert count >= min_expected, f"Expected >= {min_expected} sales invoices, got {count}"
        return True
