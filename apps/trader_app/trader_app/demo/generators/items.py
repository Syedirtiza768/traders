# -*- coding: utf-8 -*-
"""Generator — Items (Products).

Creates:
- 300–500 items across 4 item groups:
  - FMCG (100–150)
  - Hardware Tools (80–120)
  - Electrical Supplies (60–100)
  - Consumables (60–130)
- Each item has cost price, selling price, UOM, barcode, supplier reference
"""

from __future__ import unicode_literals

import random
import string
import frappe
from trader_app.demo.seed_engine.base import BaseGenerator


# Item name templates by group
ITEM_TEMPLATES = {
    "FMCG": {
        "prefixes": [
            "Rice", "Sugar", "Tea", "Cooking Oil", "Flour", "Salt", "Spices",
            "Soap", "Detergent", "Shampoo", "Toothpaste", "Biscuits", "Jam",
            "Ketchup", "Pickle", "Ghee", "Milk Powder", "Butter", "Cheese",
            "Noodles", "Chips", "Juice", "Water", "Honey", "Vinegar",
            "Coffee", "Chocolate", "Cream", "Sauce", "Powder",
        ],
        "brands": [
            "Royal", "Star", "Golden", "Fresh", "Pure", "Premium", "Classic",
            "Natural", "Organic", "Family", "Kitchen", "Home", "Daily",
        ],
        "sizes": ["250g", "500g", "1kg", "2kg", "5kg", "100ml", "250ml", "500ml", "1L"],
        "uom": "Nos",
    },
    "Hardware Tools": {
        "prefixes": [
            "Hammer", "Screwdriver", "Wrench", "Plier", "Saw", "Drill Bit",
            "Spanner", "Chisel", "File", "Tape Measure", "Level", "Clamp",
            "Vice", "Bolt Set", "Nut Set", "Washer Set", "Screw Set",
            "Nail Set", "Anchor Set", "Hinge", "Lock", "Padlock",
            "Door Handle", "Bracket", "Hook", "Chain", "Wire Rope",
            "Sandpaper", "Paint Brush", "Roller",
        ],
        "brands": [
            "ProTool", "MaxGrip", "ToughBuild", "IronForce", "SteelMaster",
            "PowerPro", "HeavyDuty", "BuildRight", "ToolCraft", "HardEdge",
        ],
        "sizes": ['4"', '6"', '8"', '10"', '12"', "Small", "Medium", "Large", "Set of 6", "Set of 12"],
        "uom": "Nos",
    },
    "Electrical Supplies": {
        "prefixes": [
            "LED Bulb", "Switch", "Socket", "Wire", "Cable", "Fuse",
            "MCB", "Distribution Board", "Extension Board", "Plug",
            "Adapter", "Connector", "Terminal", "Tape", "Conduit",
            "Junction Box", "Fan Regulator", "Dimmer", "Timer",
            "Sensor", "LED Strip", "Downlight", "Panel Light",
            "Tube Light", "CFL", "Ballast", "Starter", "Relay",
        ],
        "brands": [
            "BrightStar", "PowerLine", "ElectroPro", "VoltMax", "SparkSafe",
            "LightTech", "WireWorks", "CircuitPro", "AmpMaster", "CurrentFlow",
        ],
        "sizes": ["3W", "5W", "7W", "9W", "12W", "18W", "1m", "5m", "10m", "25m", "50m", "1.5mm", "2.5mm", "4mm"],
        "uom": "Nos",
    },
    "Consumables": {
        "prefixes": [
            "Paper Roll", "Notebook", "Pen", "Marker", "Tape", "Glue",
            "Rubber Band", "Clip", "Stapler", "Staple Pin", "Envelope",
            "File Folder", "Binder", "Label", "Sticker", "Ink Cartridge",
            "Toner", "USB Drive", "Battery", "Light Bulb", "Fuse Wire",
            "Packing Tape", "Bubble Wrap", "Carton Box", "Plastic Bag",
            "Trash Bag", "Cleaning Cloth", "Mop", "Broom", "Dustpan",
        ],
        "brands": [
            "OfficePro", "DeskMate", "WriteRight", "CleanMax", "PackSafe",
            "SupplyLine", "DailyUse", "EcoFriendly", "SmartChoice", "ValuePack",
        ],
        "sizes": ["Pack of 5", "Pack of 10", "Pack of 25", "Pack of 50", "Pack of 100", "Single", "Dozen", "Box"],
        "uom": "Nos",
    },
}


class ItemGenerator(BaseGenerator):
    name = "Items"
    depends_on = ["Company"]

    def generate(self):
        self._suppress_notifications()
        try:
            self._ensure_item_groups()
            self._ensure_uom()
            self._ensure_price_lists()

            suppliers = [s.name for s in frappe.get_all("Supplier", limit_page_length=0)]

            total = 0
            for group_cfg in self.config["item_groups"]:
                group_name = group_cfg["name"]
                count = random.randint(*group_cfg["count_range"])
                templates = ITEM_TEMPLATES.get(group_name, ITEM_TEMPLATES["Consumables"])

                for i in range(count):
                    self._create_item(group_cfg, templates, suppliers, i)
                    total += 1
                    self._commit_batch()

            frappe.db.commit()
            print(f"  ✅ Created {total} items")
        finally:
            self._restore_notifications()

    def _ensure_item_groups(self):
        """Create item groups if they don't exist."""
        if not frappe.db.exists("Item Group", "All Item Groups"):
            root = frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": "All Item Groups",
                "is_group": 1,
            })
            try:
                root.insert(ignore_permissions=True)
            except frappe.DuplicateEntryError:
                pass

        for group_cfg in self.config["item_groups"]:
            name = group_cfg["name"]
            if not frappe.db.exists("Item Group", name):
                doc = frappe.get_doc({
                    "doctype": "Item Group",
                    "item_group_name": name,
                    "parent_item_group": "All Item Groups",
                    "is_group": 0,
                })
                try:
                    doc.insert(ignore_permissions=True)
                except frappe.DuplicateEntryError:
                    pass

    def _ensure_uom(self):
        """Ensure UOMs exist."""
        for uom_name in ["Nos", "Box", "Kg", "Ltr", "Mtr", "Set", "Pair", "Dozen", "Pack"]:
            if not frappe.db.exists("UOM", uom_name):
                doc = frappe.get_doc({
                    "doctype": "UOM",
                    "uom_name": uom_name,
                })
                try:
                    doc.insert(ignore_permissions=True)
                except frappe.DuplicateEntryError:
                    pass

    def _ensure_price_lists(self):
        """Ensure standard buying/selling price lists exist."""
        for price_list_name, buying, selling in [
            ("Standard Buying", 1, 0),
            ("Standard Selling", 0, 1),
        ]:
            if frappe.db.exists("Price List", price_list_name):
                continue

            doc = frappe.get_doc({
                "doctype": "Price List",
                "price_list_name": price_list_name,
                "currency": self.config["currency"],
                "enabled": 1,
                "buying": buying,
                "selling": selling,
            })
            try:
                doc.insert(ignore_permissions=True)
            except frappe.DuplicateEntryError:
                pass

    def _create_item(self, group_cfg, templates, suppliers, index):
        """Create a single item."""
        prefix = random.choice(templates["prefixes"])
        brand = random.choice(templates["brands"])
        size = random.choice(templates["sizes"])

        item_name = f"{brand} {prefix} {size}"
        item_code = f"{group_cfg['name'][:3].upper()}-{str(index + 1).zfill(4)}"

        # Check uniqueness
        if frappe.db.exists("Item", item_code):
            item_code = f"{item_code}-{random.randint(100, 999)}"

        # Generate prices
        cost_price = round(random.uniform(*group_cfg["price_range"]), 2)
        margin = random.uniform(*group_cfg["margin_range"])
        selling_price = round(cost_price * (1 + margin), 2)

        # Generate valid EAN-13 barcode
        barcode = self._generate_ean13()

        item = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": item_name,
            "item_group": group_cfg["name"],
            "stock_uom": templates.get("uom", "Nos"),
            "is_stock_item": 1,
            "is_purchase_item": 1,
            "is_sales_item": 1,
            "include_item_in_manufacturing": 0,
            "valuation_method": "FIFO",
            "standard_rate": selling_price,
            "opening_stock": 0,
            "barcodes": [{"barcode": barcode, "barcode_type": "EAN"}],
        })

        # Assign a default supplier
        if suppliers:
            item.append("supplier_items", {
                "supplier": random.choice(suppliers),
            })

        try:
            item.insert(ignore_permissions=True)
            frappe.db.set_value("Item", item.name, {
                "is_purchase_item": 1,
                "is_sales_item": 1,
            }, update_modified=False)
            self.created_records.append(("Item", item_code))

            # Create price list entries
            self._create_item_price(item_code, "Standard Buying", cost_price)
            self._create_item_price(item_code, "Standard Selling", selling_price)
        except Exception as e:
            if len(self.errors) < 10:
                print(f"  ⚠️  Item {item_code} failed: {str(e)}")
            self.errors.append(f"Item {item_code}: {str(e)}")

    def _generate_ean13(self):
        """Generate a valid EAN-13 barcode with checksum."""
        base = ''.join(random.choices(string.digits, k=12))
        checksum = self._ean13_checksum(base)
        return f"{base}{checksum}"

    @staticmethod
    def _ean13_checksum(base):
        digits = [int(d) for d in base]
        odd_sum = sum(digits[::2])
        even_sum = sum(digits[1::2])
        total = odd_sum + (even_sum * 3)
        return (10 - (total % 10)) % 10

    def _create_item_price(self, item_code, price_list, rate):
        """Create item price for buying/selling."""
        if not frappe.db.exists("Price List", price_list):
            return

        existing = frappe.db.exists("Item Price", {
            "item_code": item_code,
            "price_list": price_list,
        })
        if existing:
            return

        price = frappe.get_doc({
            "doctype": "Item Price",
            "item_code": item_code,
            "price_list": price_list,
            "price_list_rate": rate,
            "currency": self.config["currency"],
        })
        try:
            price.insert(ignore_permissions=True)
        except Exception:
            pass

    def validate(self):
        count = frappe.db.count("Item", filters={"is_stock_item": 1})
        min_expected = self.config["num_items"][0]
        assert count >= min_expected, f"Expected >= {min_expected} items, got {count}"
        return True
