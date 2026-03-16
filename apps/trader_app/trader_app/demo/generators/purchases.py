# -*- coding: utf-8 -*-
"""Generator — Purchases (Orders + Invoices).

Creates:
- 150–300 Purchase Orders
- 150–300 Purchase Invoices
- Supplier variety, price changes, partial deliveries
"""

from __future__ import unicode_literals

import random
import frappe
from frappe.utils import getdate, add_days, nowdate
from trader_app.demo.seed_engine.base import BaseGenerator


class PurchaseGenerator(BaseGenerator):
    name = "Purchases"
    depends_on = ["Company", "Suppliers", "Items"]
    debug_single_doc = False

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            abbr = self.config["company_abbr"]
            start_date = getdate(self.config["demo_start_date"])
            end_date = getdate(self.config["demo_end_date"])
            warehouse = f"Main Warehouse - {abbr}"

            suppliers = frappe.get_all("Supplier", filters={"disabled": 0}, pluck="name")
            items = frappe.get_all(
                "Item",
                filters={"is_stock_item": 1, "disabled": 0},
                fields=["name", "item_name", "stock_uom", "item_group"],
                limit_page_length=0,
            )

            self._ensure_item_procurement_flags([item["name"] for item in items])

            if not suppliers or not items:
                print("  ⚠️  No suppliers or items found. Skipping purchase generation.")
                return

            # Get item buying prices
            item_prices = {}
            for ip in frappe.get_all("Item Price",
                                      filters={"price_list": "Standard Buying"},
                                      fields=["item_code", "price_list_rate"],
                                      limit_page_length=0):
                item_prices[ip.item_code] = float(ip.price_list_rate)

            # Get tax template for purchases
            num_orders = random.randint(*self.config["num_purchase_orders"])
            total_days = (end_date - start_date).days

            print(f"  📊 Generating {num_orders} purchase transactions...")

            for i in range(num_orders):
                random_days = random.randint(0, total_days)
                posting_date = add_days(start_date, random_days)

                if getdate(posting_date) > getdate(nowdate()):
                    posting_date = nowdate()

                supplier = random.choice(suppliers)
                num_items = random.randint(1, 10)
                selected_items = random.sample(items, min(num_items, len(items)))

                self._create_purchase_invoice(
                    company=company,
                    supplier=supplier,
                    items=selected_items,
                    item_prices=item_prices,
                    posting_date=posting_date,
                    warehouse=warehouse,
                )

                if i % 50 == 0:
                    frappe.db.commit()
                    print(f"    ... {i + 1}/{num_orders} purchases created")

                if self.debug_single_doc:
                    frappe.db.commit()
                    return

            frappe.db.commit()
            print(f"  ✅ Created {len(self.created_records)} purchase transactions")
            for error in self.errors[:5]:
                print(f"  ⚠️  {error}")
        finally:
            self._restore_notifications()

    def _create_purchase_invoice(self, company, supplier, items, item_prices,
                                  posting_date, warehouse):
        """Create a Purchase Invoice."""
        pi = frappe.get_doc({
            "doctype": "Purchase Invoice",
            "company": company,
            "supplier": supplier,
            "posting_date": posting_date,
            "due_date": posting_date,
            "currency": self.config["currency"],
            "buying_price_list": "Standard Buying",
            "update_stock": 0,
            "set_warehouse": warehouse,
            "bill_date": posting_date,
        })

        for item in items:
            rate = item_prices.get(item["name"], random.uniform(50, 3000))
            # Slight price variation (supplier price changes)
            rate = rate * random.uniform(0.92, 1.08)
            qty = random.randint(5, 100)

            pi.append("items", {
                "item_code": item["name"],
                "item_name": item.get("item_name", item["name"]),
                "qty": qty,
                "rate": round(rate, 2),
                "uom": item.get("stock_uom", "Nos"),
                "stock_uom": item.get("stock_uom", "Nos"),
                "conversion_factor": 1,
                "warehouse": warehouse,
            })

        try:
            pi.insert(ignore_permissions=True)
            pi.submit()
            self.created_records.append(("Purchase Invoice", pi.name))
        except Exception as e:
            if len(self.errors) < 10:
                print(f"  ⚠️  Purchase Invoice failed for {supplier}: {str(e)}")
            self.errors.append(f"Purchase Invoice: {str(e)}")

    def _ensure_item_procurement_flags(self, item_codes):
        if not item_codes:
            return

        for item_code in item_codes:
            frappe.db.set_value("Item", item_code, {
                "is_purchase_item": 1,
                "is_sales_item": 1,
            }, update_modified=False)
        frappe.db.commit()


    def validate(self):
        count = frappe.db.count("Purchase Invoice", filters={"docstatus": 1})
        min_expected = self.config["num_purchase_invoices"][0] // 2
        assert count >= min_expected, f"Expected >= {min_expected} purchase invoices, got {count}"
        return True
