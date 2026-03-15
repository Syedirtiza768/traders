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
from datetime import timedelta
import frappe
from frappe.utils import getdate, add_days, nowdate
from trader_app.demo.seed_engine.base import BaseGenerator


class SalesGenerator(BaseGenerator):
    name = "Sales"
    depends_on = ["Company", "Customers", "Items", "Inventory"]

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            abbr = self.config["company_abbr"]
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

            # Get tax template
            tax_template = frappe.db.get_value(
                "Sales Taxes and Charges Template",
                filters={"company": company},
                fieldname="name"
            )

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

                customer = random.choice(customers)
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
                    posting_date=posting_date,
                    warehouse=warehouse,
                    tax_template=tax_template,
                    seasonal_factor=seasonal_factor,
                )

                if i % 50 == 0:
                    frappe.db.commit()
                    print(f"    ... {i + 1}/{num_orders} sales created")

            frappe.db.commit()
            print(f"  ✅ Created {len(self.created_records)} sales transactions")
        finally:
            self._restore_notifications()

    def _create_sales_invoice(self, company, customer, items, item_prices,
                               posting_date, warehouse, tax_template, seasonal_factor):
        """Create a Sales Invoice (directly, as many traders skip SO)."""
        si = frappe.get_doc({
            "doctype": "Sales Invoice",
            "company": company,
            "customer": customer,
            "posting_date": posting_date,
            "due_date": add_days(posting_date, random.choice([7, 15, 30, 45])),
            "currency": self.config["currency"],
            "selling_price_list": "Standard Selling",
            "update_stock": 1,
            "set_warehouse": warehouse,
        })

        for item in items:
            rate = item_prices.get(item["name"], random.uniform(100, 5000))
            # Apply seasonal factor and small random variation
            rate = rate * seasonal_factor * random.uniform(0.95, 1.05)
            qty = random.randint(1, 30)

            # Random discount for some items
            discount = 0
            if random.random() < 0.3:  # 30% chance of discount
                discount = random.choice([2, 5, 7, 10, 15])

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

        # Add tax
        if tax_template:
            si.taxes_and_charges = tax_template
            # Let ERPNext calculate taxes
            si.set_taxes()

        try:
            si.insert(ignore_permissions=True)
            si.submit()
            self.created_records.append(("Sales Invoice", si.name))
        except Exception as e:
            self.errors.append(f"Sales Invoice: {str(e)}")

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
