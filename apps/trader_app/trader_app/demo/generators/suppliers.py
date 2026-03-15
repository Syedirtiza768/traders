# -*- coding: utf-8 -*-
"""Generator — Suppliers.

Creates:
- 40–60 suppliers across Manufacturer, Distributor, Importer, Local types
- Contact persons
- Addresses
- Payment terms
"""

from __future__ import unicode_literals

import random
import frappe
from trader_app.demo.seed_engine.base import BaseGenerator


SUPPLIER_NAMES = [
    "Pakistan Manufacturing Co", "Lahore Industries", "Karachi Trading Corp",
    "Allied Products Ltd", "National Suppliers Inc", "Eastern Traders",
    "Western Imports", "Northern Distributors", "Southern Supply Chain",
    "Punjab Hardware Co", "Sindh Electronics", "Frontier Tools Ltd",
    "Baloch Supplies", "Islamabad Trading Co", "Crescent Industries",
    "Star Manufacturing", "Diamond Products", "Golden Enterprises",
    "Silver Trade Corp", "Ruby Imports", "Sapphire Distributors",
    "Emerald Supply Co", "Pearl Industries", "Crystal Trading",
    "Platinum Products", "Bronze Manufacturing", "Copper Traders",
    "Steel Distributors", "Iron Works Ltd", "Alloy Trading Co",
    "Metro Supplies", "City Trading Corp", "Royal Industries",
    "Elite Distributors", "Prime Trading Co", "Global Imports",
    "United Manufacturers", "Central Supply Chain", "Modern Trading",
    "Classic Industries", "Grand Distributors", "Premium Suppliers",
    "Quality Products Ltd", "Reliable Trading Co", "Trusted Suppliers",
    "Eagle Distributors", "Falcon Trading", "Tiger Industries",
    "Lion Imports", "Phoenix Suppliers", "Summit Trading Co",
    "Peak Industries", "Apex Distributors", "Nova Supply Chain",
    "Alpha Trading", "Beta Industries", "Gamma Imports",
    "Delta Suppliers", "Omega Trading Corp", "Sigma Distributors",
]

CONTACT_NAMES = [
    ("Asif", "Mahmood"), ("Tahir", "Hussain"), ("Naeem", "Shah"),
    ("Kashif", "Aziz"), ("Waseem", "Abbas"), ("Majid", "Saleemi"),
    ("Liaqat", "Hayat"), ("Pervez", "Rana"), ("Ghulam", "Mustafa"),
    ("Shafiq", "Rehman"), ("Anwar", "Karim"), ("Bashir", "Ahmad"),
]


class SupplierGenerator(BaseGenerator):
    name = "Suppliers"
    depends_on = ["Company"]

    def generate(self):
        self._suppress_notifications()
        try:
            self._ensure_supplier_groups()

            total = 0
            name_pool = list(SUPPLIER_NAMES)
            random.shuffle(name_pool)
            name_idx = 0

            for sup_type in self.config["supplier_types"]:
                count = random.randint(*sup_type["count_range"])
                total += count
                for i in range(count):
                    if name_idx < len(name_pool):
                        base_name = name_pool[name_idx]
                        name_idx += 1
                    else:
                        base_name = f"Supplier {total + i}"

                    self._create_supplier(sup_type, base_name)
                    self._commit_batch()

            frappe.db.commit()
            print(f"  ✅ Created {total} suppliers")
        finally:
            self._restore_notifications()

    def _ensure_supplier_groups(self):
        """Create supplier groups if they don't exist."""
        groups = ["Manufacturer", "Distributor", "Importer", "Local Supplier"]
        for g in groups:
            if not frappe.db.exists("Supplier Group", g):
                doc = frappe.get_doc({
                    "doctype": "Supplier Group",
                    "supplier_group_name": g,
                })
                try:
                    doc.insert(ignore_permissions=True)
                except frappe.DuplicateEntryError:
                    pass

    def _create_supplier(self, sup_type, supplier_name):
        """Create a single supplier with contact and address."""
        if frappe.db.exists("Supplier", {"supplier_name": supplier_name}):
            supplier_name = f"{supplier_name} ({random.randint(100, 999)})"

        city = random.choice(self.config["cities"])
        payment_terms = sup_type["payment_terms"]
        territory = random.choice(self.config["territories"])

        supplier = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": supplier_name,
            "supplier_group": sup_type["type"],
            "supplier_type": "Company",
            "country": self.config["country"],
            "default_currency": self.config["currency"],
            "payment_terms": payment_terms if frappe.db.exists("Payment Terms Template", payment_terms) else None,
        })

        try:
            supplier.insert(ignore_permissions=True)
            self.created_records.append(("Supplier", supplier.name))

            # Create contact
            contact = random.choice(CONTACT_NAMES)
            self._create_contact(supplier.name, supplier_name, contact[0], contact[1])

            # Create address
            self._create_address(supplier.name, supplier_name, city, territory)
        except Exception as e:
            self.errors.append(f"Supplier {supplier_name}: {str(e)}")

    def _create_contact(self, link_name, company_name, first_name, last_name):
        phone = f"+92-{random.randint(300, 345)}-{random.randint(1000000, 9999999)}"

        contact = frappe.get_doc({
            "doctype": "Contact",
            "first_name": first_name,
            "last_name": last_name,
            "company_name": company_name,
            "phone_nos": [{"phone": phone, "is_primary_phone": 1}],
            "email_ids": [{
                "email_id": f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@supplier.example.com",
                "is_primary": 1,
            }],
            "links": [{"link_doctype": "Supplier", "link_name": link_name}],
        })
        try:
            contact.insert(ignore_permissions=True)
        except Exception:
            pass

    def _create_address(self, link_name, title, city, territory):
        streets = [
            "Industrial Area", "SITE Area", "I.I. Chundrigar Road",
            "Korangi Industrial Area", "GT Road", "Multan Road",
            "Main Boulevard", "Industrial Estate", "Factory Area",
        ]

        address = frappe.get_doc({
            "doctype": "Address",
            "address_title": title,
            "address_type": "Billing",
            "address_line1": f"Plot {random.randint(1, 200)}, {random.choice(streets)}",
            "city": city,
            "state": territory,
            "country": self.config["country"],
            "pincode": str(random.randint(10000, 99999)),
            "links": [{"link_doctype": "Supplier", "link_name": link_name}],
        })
        try:
            address.insert(ignore_permissions=True)
        except Exception:
            pass

    def validate(self):
        count = frappe.db.count("Supplier")
        min_expected = self.config["num_suppliers"][0]
        assert count >= min_expected, f"Expected >= {min_expected} suppliers, got {count}"
        return True
