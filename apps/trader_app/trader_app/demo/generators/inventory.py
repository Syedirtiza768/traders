# -*- coding: utf-8 -*-
"""Generator — Inventory (Opening Stock).

Creates:
- Stock entries (Material Receipt) for opening inventory
- Distributes stock across warehouses
- Uses realistic quantities based on item groups
"""

from __future__ import unicode_literals

import random
from datetime import datetime
import frappe
from frappe.utils import getdate
from trader_app.demo.seed_engine.base import BaseGenerator


class InventoryGenerator(BaseGenerator):
    name = "Inventory"
    depends_on = ["Company", "Items"]

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            abbr = self.config["company_abbr"]
            start_date = getdate(self.config["demo_start_date"])

            warehouses = [f"{wh['name']} - {abbr}" for wh in self.config["warehouses"]]

            items = frappe.get_all(
                "Item",
                filters={"is_stock_item": 1, "disabled": 0},
                fields=["name", "item_name", "item_group", "stock_uom"],
                limit_page_length=0,
            )

            # Process items in batches for stock entry
            batch_size = 20
            for batch_start in range(0, len(items), batch_size):
                batch = items[batch_start:batch_start + batch_size]
                warehouse = random.choice(warehouses)

                self._create_stock_entry(batch, company, warehouse, start_date)
                self._commit_batch()

            # Create secondary warehouse stock for some items
            secondary_items = random.sample(items, min(len(items) // 3, 100))
            for batch_start in range(0, len(secondary_items), batch_size):
                batch = secondary_items[batch_start:batch_start + batch_size]
                warehouse = f"Secondary Warehouse - {abbr}"

                self._create_stock_entry(batch, company, warehouse, start_date)
                self._commit_batch()

            frappe.db.commit()
            print(f"  ✅ Created opening stock for {len(items)} items")
        finally:
            self._restore_notifications()

    def _create_stock_entry(self, items, company, warehouse, posting_date):
        """Create a stock entry (Material Receipt) for a batch of items."""
        se = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "posting_date": posting_date,
            "posting_time": "09:00:00",
        })

        for item in items:
            qty = self._get_opening_qty(item.get("item_group", ""))
            rate = self._get_cost_rate(item["name"])

            se.append("items", {
                "item_code": item["name"],
                "item_name": item.get("item_name", item["name"]),
                "qty": qty,
                "uom": item.get("stock_uom", "Nos"),
                "stock_uom": item.get("stock_uom", "Nos"),
                "conversion_factor": 1,
                "t_warehouse": warehouse,
                "basic_rate": rate,
            })

        try:
            se.insert(ignore_permissions=True)
            se.submit()
            self.created_records.append(("Stock Entry", se.name))
        except Exception as e:
            self.errors.append(f"Stock Entry: {str(e)}")

    def _get_opening_qty(self, item_group):
        """Get realistic opening quantity based on item group."""
        qty_ranges = {
            "FMCG": (50, 500),
            "Hardware Tools": (20, 200),
            "Electrical Supplies": (30, 300),
            "Consumables": (40, 400),
        }
        low, high = qty_ranges.get(item_group, (20, 200))
        return random.randint(low, high)

    def _get_cost_rate(self, item_code):
        """Get the buying rate for an item."""
        rate = frappe.db.get_value(
            "Item Price",
            filters={"item_code": item_code, "price_list": "Standard Buying"},
            fieldname="price_list_rate",
        )
        if rate:
            return float(rate)
        # Fallback
        return random.uniform(100, 5000)

    def validate(self):
        # Check that bins exist with stock
        bins_with_stock = frappe.db.count("Bin", filters={"actual_qty": [">", 0]})
        assert bins_with_stock > 0, "No inventory bins with stock found"
        return True
