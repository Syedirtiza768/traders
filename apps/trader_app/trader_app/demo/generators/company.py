# -*- coding: utf-8 -*-
"""Generator — Company setup.

Creates:
- Company profile
- Fiscal year
- Chart of accounts (uses standard Pakistan chart)
- Cost centers
- Currencies
- Payment terms
- Tax configuration
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import getdate
from trader_app.demo.seed_engine.base import BaseGenerator


class CompanyGenerator(BaseGenerator):
    name = "Company"
    depends_on = []

    def generate(self):
        self._suppress_notifications()
        try:
            self._create_company()
            self._create_fiscal_year()
            self._create_cost_centers()
            self._create_payment_terms()
            self._create_warehouses()
            self._create_tax_templates()
            self._set_defaults()
            frappe.db.commit()
        finally:
            self._restore_notifications()

    def _create_company(self):
        cfg = self.config
        company_name = cfg["company_name"]

        if frappe.db.exists("Company", company_name):
            print(f"  ⏭️  Company '{company_name}' already exists, skipping.")
            return

        company = frappe.get_doc({
            "doctype": "Company",
            "company_name": company_name,
            "abbr": cfg["company_abbr"],
            "country": cfg["country"],
            "default_currency": cfg["currency"],
            "chart_of_accounts": "Standard",
            "enable_perpetual_inventory": 1,
            "default_holiday_list": "",
        })
        company.insert(ignore_permissions=True)
        self.created_records.append(("Company", company_name))
        print(f"  ✅ Created company: {company_name}")

    def _create_fiscal_year(self):
        cfg = self.config
        fy_name = cfg["fiscal_year_name"]

        if frappe.db.exists("Fiscal Year", fy_name):
            print(f"  ⏭️  Fiscal Year '{fy_name}' already exists.")
            return

        fy = frappe.get_doc({
            "doctype": "Fiscal Year",
            "year": fy_name,
            "year_start_date": cfg["fiscal_year_start"],
            "year_end_date": cfg["fiscal_year_end"],
            "companies": [{"company": cfg["company_name"]}],
        })
        fy.insert(ignore_permissions=True)
        self.created_records.append(("Fiscal Year", fy_name))
        print(f"  ✅ Created fiscal year: {fy_name}")

    def _create_cost_centers(self):
        cfg = self.config
        company = cfg["company_name"]
        abbr = cfg["company_abbr"]

        parent_cc = f"{company} - {abbr}"

        for cc_name in cfg["cost_centers"]:
            full_name = f"{cc_name} - {abbr}"
            if frappe.db.exists("Cost Center", full_name):
                continue

            cc = frappe.get_doc({
                "doctype": "Cost Center",
                "cost_center_name": cc_name,
                "company": company,
                "parent_cost_center": parent_cc,
                "is_group": 0,
            })
            try:
                cc.insert(ignore_permissions=True)
                self.created_records.append(("Cost Center", full_name))
            except frappe.DuplicateEntryError:
                pass

        print(f"  ✅ Created {len(cfg['cost_centers'])} cost centers")

    def _create_payment_terms(self):
        cfg = self.config

        for pt in cfg["payment_terms_list"]:
            if frappe.db.exists("Payment Terms Template", pt["name"]):
                continue

            doc = frappe.get_doc({
                "doctype": "Payment Terms Template",
                "template_name": pt["name"],
                "terms": [{
                    "payment_term": pt["name"],
                    "due_date_based_on": "Day(s) after invoice date",
                    "credit_days": pt["days"],
                    "invoice_portion": 100,
                }],
            })

            # Also create the Payment Term if it doesn't exist
            if not frappe.db.exists("Payment Term", pt["name"]):
                term = frappe.get_doc({
                    "doctype": "Payment Term",
                    "payment_term_name": pt["name"],
                    "due_date_based_on": "Day(s) after invoice date",
                    "credit_days": pt["days"],
                    "invoice_portion": 100,
                })
                term.insert(ignore_permissions=True)

            doc.insert(ignore_permissions=True)
            self.created_records.append(("Payment Terms Template", pt["name"]))

        print(f"  ✅ Created {len(cfg['payment_terms_list'])} payment terms")

    def _create_warehouses(self):
        cfg = self.config
        company = cfg["company_name"]
        abbr = cfg["company_abbr"]

        for wh in cfg["warehouses"]:
            wh_name = f"{wh['name']} - {abbr}"
            if frappe.db.exists("Warehouse", wh_name):
                continue

            doc = frappe.get_doc({
                "doctype": "Warehouse",
                "warehouse_name": wh["name"],
                "company": company,
                "is_group": wh.get("is_group", 0),
                "warehouse_type": wh.get("type", "Warehouse"),
            })
            try:
                doc.insert(ignore_permissions=True)
                self.created_records.append(("Warehouse", wh_name))
            except frappe.DuplicateEntryError:
                pass

        print(f"  ✅ Created {len(cfg['warehouses'])} warehouses")

    def _create_tax_templates(self):
        cfg = self.config
        company = cfg["company_name"]
        abbr = cfg["company_abbr"]

        for tax in cfg["taxes"]:
            template_name = f"{tax['name']} - {abbr}"

            # Sales tax template
            if not frappe.db.exists("Sales Taxes and Charges Template", template_name):
                # Find tax account
                tax_account = frappe.db.get_value(
                    "Account",
                    filters={"account_type": "Tax", "company": company, "is_group": 0},
                    fieldname="name"
                )
                if not tax_account:
                    # Create a tax account if not exists
                    parent_account = frappe.db.get_value(
                        "Account",
                        filters={
                            "company": company,
                            "root_type": "Liability",
                            "is_group": 1,
                            "account_name": ["like", "%Duties%Tax%"]
                        },
                        fieldname="name"
                    )
                    if not parent_account:
                        parent_account = frappe.db.get_value(
                            "Account",
                            filters={"company": company, "root_type": "Liability", "is_group": 1},
                            fieldname="name"
                        )

                    tax_acc = frappe.get_doc({
                        "doctype": "Account",
                        "account_name": "Output Tax",
                        "company": company,
                        "parent_account": parent_account,
                        "account_type": "Tax",
                    })
                    try:
                        tax_acc.insert(ignore_permissions=True)
                        tax_account = tax_acc.name
                    except frappe.DuplicateEntryError:
                        tax_account = f"Output Tax - {abbr}"

                if tax_account:
                    doc = frappe.get_doc({
                        "doctype": "Sales Taxes and Charges Template",
                        "title": tax["name"],
                        "company": company,
                        "taxes": [{
                            "charge_type": tax["type"],
                            "account_head": tax_account,
                            "rate": tax["rate"],
                            "description": tax["name"],
                        }],
                    })
                    try:
                        doc.insert(ignore_permissions=True)
                        self.created_records.append(("Sales Taxes and Charges Template", template_name))
                    except Exception:
                        pass

        print(f"  ✅ Created tax templates")

    def _set_defaults(self):
        """Set company as default."""
        cfg = self.config
        company = cfg["company_name"]

        frappe.defaults.set_global_default("company", company)
        frappe.defaults.set_global_default("currency", cfg["currency"])
        frappe.defaults.set_global_default("country", cfg["country"])
        frappe.defaults.set_global_default("fiscal_year", cfg["fiscal_year_name"])

        print(f"  ✅ Set defaults for {company}")

    def validate(self):
        cfg = self.config
        assert frappe.db.exists("Company", cfg["company_name"]), "Company not found"
        assert frappe.db.exists("Fiscal Year", cfg["fiscal_year_name"]), "Fiscal Year not found"
        return True
