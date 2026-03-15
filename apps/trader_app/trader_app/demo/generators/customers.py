# -*- coding: utf-8 -*-
"""Generator — Customers.

Creates:
- 80–120 customers across Premium, Regular, Small segments
- Contact persons for each customer
- Addresses
- Credit limits
- Payment terms
"""

from __future__ import unicode_literals

import random
import frappe
from trader_app.demo.seed_engine.base import BaseGenerator


# Realistic Pakistani business names
BUSINESS_PREFIXES = [
    "Al-", "New ", "City ", "Royal ", "Star ", "Golden ", "Silver ",
    "Diamond ", "Pearl ", "Elite ", "Prime ", "Super ", "Metro ",
    "National ", "United ", "Central ", "Modern ", "Classic ",
    "Grand ", "Lucky ", "Famous ", "Popular ", "Quality ",
]

BUSINESS_SUFFIXES = [
    " Trading Co", " Enterprises", " Store", " Mart", " Distributors",
    " General Store", " Traders", " & Sons", " & Brothers", " Wholesale",
    " Retail", " Emporium", " Collection", " Supply Co", " Hub",
    " Center", " Point", " Plaza", " Corner", " Market",
]

FIRST_NAMES = [
    "Muhammad", "Ahmed", "Ali", "Hassan", "Usman", "Bilal", "Adnan",
    "Tariq", "Naveed", "Imran", "Rashid", "Khalid", "Amir", "Saeed",
    "Faisal", "Kamran", "Shahid", "Zafar", "Nasir", "Waqas",
    "Hamza", "Omar", "Asad", "Farhan", "Junaid", "Sohail", "Rizwan",
    "Arif", "Sajid", "Aamir", "Nadeem", "Zahid", "Irfan", "Salman",
]

LAST_NAMES = [
    "Khan", "Malik", "Ahmed", "Hussain", "Ali", "Raza", "Sheikh",
    "Butt", "Chaudhry", "Iqbal", "Qureshi", "Siddiqui", "Anwar",
    "Mirza", "Baig", "Hashmi", "Bhatti", "Gill", "Akhtar", "Javed",
    "Nawaz", "Shaikh", "Mughal", "Niazi", "Abbasi", "Aslam",
]


class CustomerGenerator(BaseGenerator):
    name = "Customers"
    depends_on = ["Company"]

    def generate(self):
        self._suppress_notifications()
        try:
            self._ensure_customer_groups()
            self._ensure_territories()

            total = 0
            for segment in self.config["customer_segments"]:
                count = random.randint(*segment["count_range"])
                total += count
                for i in range(count):
                    self._create_customer(segment, i)
                    self._commit_batch()

            frappe.db.commit()
            print(f"  ✅ Created {total} customers")
        finally:
            self._restore_notifications()

    def _ensure_customer_groups(self):
        """Create customer groups if they don't exist."""
        groups = ["Premium Retailers", "Regular Retailers", "Small Shops"]
        for g in groups:
            if not frappe.db.exists("Customer Group", g):
                doc = frappe.get_doc({
                    "doctype": "Customer Group",
                    "customer_group_name": g,
                    "parent_customer_group": "All Customer Groups",
                    "is_group": 0,
                })
                try:
                    doc.insert(ignore_permissions=True)
                except frappe.DuplicateEntryError:
                    pass

    def _ensure_territories(self):
        """Create territories if they don't exist."""
        for territory in self.config["territories"]:
            if not frappe.db.exists("Territory", territory):
                doc = frappe.get_doc({
                    "doctype": "Territory",
                    "territory_name": territory,
                    "parent_territory": "All Territories",
                    "is_group": 0,
                })
                try:
                    doc.insert(ignore_permissions=True)
                except frappe.DuplicateEntryError:
                    pass

    def _create_customer(self, segment, index):
        """Create a single customer with contact and address."""
        name = self._generate_business_name()
        customer_name = name

        # Ensure uniqueness
        if frappe.db.exists("Customer", {"customer_name": customer_name}):
            customer_name = f"{name} ({random.randint(100, 999)})"

        territory = random.choice(self.config["territories"])
        city = random.choice(self.config["cities"])
        credit_limit = random.randint(*segment["credit_limit_range"])
        # Round to nearest 10,000
        credit_limit = round(credit_limit / 10000) * 10000

        payment_terms = random.choice(self.config["payment_terms_list"])["name"]

        customer = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": customer_name,
            "customer_group": segment["group"],
            "territory": territory,
            "customer_type": "Company",
            "default_currency": self.config["currency"],
            "payment_terms": payment_terms,
            "credit_limits": [{
                "company": self.config["company_name"],
                "credit_limit": credit_limit,
            }],
        })

        try:
            customer.insert(ignore_permissions=True)
            self.created_records.append(("Customer", customer.name))

            # Create contact
            self._create_contact(customer.name, customer_name, city)

            # Create address
            self._create_address(customer.name, "Customer", customer_name, city, territory)
        except Exception as e:
            self.errors.append(f"Customer {customer_name}: {str(e)}")

    def _create_contact(self, link_name, company_name, city):
        """Create a contact person for the customer."""
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        phone = f"+92-{random.randint(300,345)}-{random.randint(1000000,9999999)}"

        contact = frappe.get_doc({
            "doctype": "Contact",
            "first_name": first_name,
            "last_name": last_name,
            "company_name": company_name,
            "phone_nos": [{"phone": phone, "is_primary_phone": 1}],
            "email_ids": [{
                "email_id": f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@example.com",
                "is_primary": 1,
            }],
            "links": [{"link_doctype": "Customer", "link_name": link_name}],
        })
        try:
            contact.insert(ignore_permissions=True)
        except Exception:
            pass

    def _create_address(self, link_name, link_doctype, title, city, territory):
        """Create an address."""
        streets = [
            "Main Boulevard", "GT Road", "Mall Road", "Ferozepur Road",
            "Multan Road", "Jail Road", "Canal Road", "Wahdat Road",
            "Allama Iqbal Road", "Circular Road", "College Road",
            "Station Road", "Kutchery Road", "University Road",
        ]

        address = frappe.get_doc({
            "doctype": "Address",
            "address_title": title,
            "address_type": "Billing",
            "address_line1": f"{random.randint(1, 500)} {random.choice(streets)}",
            "address_line2": f"Near {random.choice(['Chowk', 'Market', 'Park', 'Masjid', 'School'])}",
            "city": city,
            "state": territory if territory != "Islamabad" else "Islamabad Capital Territory",
            "country": self.config["country"],
            "pincode": str(random.randint(10000, 99999)),
            "phone": f"+92-{random.randint(42, 91)}-{random.randint(1000000, 9999999)}",
            "links": [{"link_doctype": link_doctype, "link_name": link_name}],
        })
        try:
            address.insert(ignore_permissions=True)
        except Exception:
            pass

    def _generate_business_name(self):
        """Generate a realistic Pakistani business name."""
        prefix = random.choice(BUSINESS_PREFIXES)
        suffix = random.choice(BUSINESS_SUFFIXES)
        # Sometimes use a person's name
        if random.random() > 0.5:
            middle = random.choice(LAST_NAMES)
        else:
            middle = random.choice([
                "Lahore", "Punjab", "Pakistan", "Oriental", "Eastern",
                "Western", "Northern", "Southern", "Crescent", "Green",
            ])
        return f"{prefix}{middle}{suffix}"

    def validate(self):
        count = frappe.db.count("Customer")
        min_expected = self.config["num_customers"][0]
        assert count >= min_expected, f"Expected >= {min_expected} customers, got {count}"
        return True
