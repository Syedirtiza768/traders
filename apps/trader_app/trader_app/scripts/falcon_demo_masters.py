# -*- coding: utf-8 -*-
"""Falcon demo - masters: accounts, bank, tax templates and policies, WHT, customers, suppliers, items, users.

DEMO ONLY. Fictional data. See falcon_demo.py for the run order and falcon_demo_spec.py for the figures.
"""

from __future__ import unicode_literals

import frappe

from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try


def _abbr():
    return frappe.db.get_value("Company", S.COMPANY, "abbr")


def _account(name_part, parent_name, root_type, account_type=None):
    full = "{0} - {1}".format(name_part, _abbr())
    if frappe.db.exists("Account", full):
        return full
    parent = frappe.db.get_value("Account", {"company": S.COMPANY, "account_name": parent_name, "is_group": 1}, "name")
    doc = frappe.get_doc({"doctype": "Account", "account_name": name_part, "parent_account": parent,
                          "company": S.COMPANY, "root_type": root_type, "is_group": 0,
                          "account_type": account_type or ""})
    doc.insert(ignore_permissions=True)
    return doc.name


def _tax_template(title, account, rate):
    name = "{0} - {1}".format(title, _abbr())
    if frappe.db.exists("Sales Taxes and Charges Template", name):
        return name
    doc = frappe.get_doc({
        "doctype": "Sales Taxes and Charges Template", "title": title, "company": S.COMPANY,
        "taxes": [{"charge_type": "On Net Total", "account_head": account, "description": title, "rate": rate}],
    })
    doc.insert(ignore_permissions=True)
    return doc.name


def masters():
    frappe.set_user("Administrator")
    rows = []

    def site_defaults():
        # The site-wide currency default must match the company. A stale INR default made the back-to-back purchase
        # orders price the agreed PKR rates as rupees of India (DEMO defect G-CFG-01).
        frappe.db.set_default("currency", S.FX["currency"])
        frappe.clear_cache()
        frappe.db.commit()
        return S.FX["currency"]

    _try(rows, "Site default currency matches the company (PKR)", site_defaults)

    def accounts():
        out = {}
        out["bank"] = _account("Demo Bank - Current Account", "Bank Accounts", "Asset", "Bank")
        # Overhead accounts for the expense items (rent, communications, administration). Without them, expense bills
        # fall to the company's cost of goods sold (DEMO defect G-ACC-01).
        out["rent"] = _account("Rent", "Indirect Expenses", "Expense")
        out["communications"] = _account("Communications", "Indirect Expenses", "Expense")
        out["administration"] = _account("Administration", "Indirect Expenses", "Expense")
        out["output_gst"] = _account("Output GST 18%", "Duties and Taxes", "Liability", "Tax")
        out["output_sst"] = _account("Output Sindh SST 15% services (unverified rate)", "Duties and Taxes",
                                     "Liability", "Tax")
        out["wht_recoverable"] = _account("WHT recoverable income tax on services", "Duties and Taxes",
                                          "Asset", "Tax")
        frappe.db.commit()
        return out

    accts = _try(rows, "Accounts: bank, output GST and SST, WHT recoverable", accounts) or {}

    def bank_account():
        if frappe.db.exists("Bank Account", {"account": accts.get("bank"), "company": S.COMPANY}):
            return "exists"
        if not frappe.db.exists("Bank", "Demo Bank (fictional)"):
            frappe.get_doc({"doctype": "Bank", "bank_name": "Demo Bank (fictional)"}).insert(ignore_permissions=True)
        doc = frappe.get_doc({"doctype": "Bank Account", "account_name": "Demo Bank - Current Account",
                              "bank": "Demo Bank (fictional)", "company": S.COMPANY, "account": accts.get("bank"),
                              "is_company_account": 1})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

    _try(rows, "Bank account record for the demo bank", bank_account)

    def tax_templates():
        goods = _tax_template("GST 18% goods", accts.get("output_gst"), 18)
        services = _tax_template("Sindh SST 15% services (unverified)", accts.get("output_sst"), 15)

        def policy(name, template, svc_flag, jurisdiction, rate):
            if frappe.db.exists("Trader Tax Policy", {"policy_name": name, "company": S.COMPANY}):
                return
            frappe.get_doc({"doctype": "Trader Tax Policy", "policy_name": name, "company": S.COMPANY,
                            "is_active": 1, "priority": 10 if svc_flag == "goods" else 20, "tax_mode": "exclusive",
                            "tax_template": template, "rate": rate, "effective_from": S.FISCAL_YEAR[0],
                            "service_flag": svc_flag, "jurisdiction": jurisdiction}).insert(ignore_permissions=True)

        policy("Federal GST 18% on goods", goods, "goods", "Federal", 18)
        policy("Sindh SST 15% on services (unverified)", services, "service", "Sindh", 15)
        frappe.db.commit()
        return {"goods": goods, "services": services}

    _try(rows, "Tax templates and Trader Tax Policies (goods federal, services Sindh)", tax_templates)

    def input_tax():
        acc = _account("Input GST 18%", "Duties and Taxes", "Asset", "Tax")
        name = "Input GST 18% - {0}".format(_abbr())
        if not frappe.db.exists("Purchase Taxes and Charges Template", name):
            frappe.get_doc({"doctype": "Purchase Taxes and Charges Template", "title": "Input GST 18%",
                            "company": S.COMPANY,
                            "taxes": [{"charge_type": "On Net Total", "account_head": acc,
                                       "description": "Input GST 18%", "rate": 18,
                                       "category": "Total", "add_deduct_tax": "Add"}]}).insert(ignore_permissions=True)
        frappe.db.commit()
        return name

    _try(rows, "Input GST 18% purchase template (recoverable tax)", input_tax)

    def price_list():
        name = "Standard Selling"
        if not frappe.db.exists("Price List", name):
            frappe.get_doc({"doctype": "Price List", "price_list_name": name, "selling": 1, "buying": 0,
                            "enabled": 1, "currency": "PKR"}).insert(ignore_permissions=True)
        frappe.db.set_single_value("Selling Settings", "selling_price_list", name)
        frappe.db.commit()
        return name

    _try(rows, "Selling price list Standard Selling (PKR) as the company default", price_list)

    def wht():
        name = "Income tax WHT 14% services (filer)"
        if frappe.db.exists("Trader WHT Policy", {"policy_name": name, "company": S.COMPANY}):
            return "exists"
        frappe.get_doc({"doctype": "Trader WHT Policy", "policy_name": name, "company": S.COMPANY, "is_active": 1,
                        "applies_to": "customer", "section_code": "153(1)(b) services, filer",
                        "rate": 14, "threshold": 0, "account": accts.get("wht_recoverable")}
                       ).insert(ignore_permissions=True)
        frappe.db.commit()
        return name

    _try(rows, "WHT policy 14% on services (filer customers, section 153)", wht)

    def customers():
        out = {}
        for key, c in S.CUSTOMERS.items():
            if frappe.db.exists("Customer", {"customer_name": c["name"]}):
                out[key] = c["name"]
                continue
            entity = frappe.db.get_value("Trader Trading Entity", {"trading_name": c["entity"], "company": S.COMPANY}, "name")
            doc = frappe.get_doc({
                "doctype": "Customer", "customer_name": c["name"], "customer_type": "Company",
                "customer_group": "Commercial", "territory": "Pakistan", "tax_id": c["ntn"],
                "default_currency": "PKR", "trader_trading_entity": entity,
                "trader_payment_expected_days": c["expected_days"],
                "credit_limits": [{"company": S.COMPANY, "credit_limit": c["credit_limit"]}],
            })
            doc.insert(ignore_permissions=True)
            out[key] = doc.name
        frappe.db.commit()
        return out

    _try(rows, "Customers (3) with trading entity, NTN and credit limit", customers)

    def suppliers():
        out = {}
        for key, s in S.SUPPLIERS.items():
            if frappe.db.exists("Supplier", {"supplier_name": s["name"]}):
                out[key] = s["name"]
                continue
            doc = frappe.get_doc({"doctype": "Supplier", "supplier_name": s["name"], "supplier_type": "Company",
                                  "tax_id": s["ntn"], "default_currency": "PKR"})
            doc.insert(ignore_permissions=True)
            out[key] = doc.name
        frappe.db.commit()
        return out

    _try(rows, "Suppliers (5) with NTN", suppliers)

    def items():
        group_products = frappe.db.get_value("Item Group", {"item_group_name": "Products"}, "name") or "All Item Groups"
        group_services = frappe.db.get_value("Item Group", {"item_group_name": "Services"}, "name") or "All Item Groups"
        made = []
        for code, p in S.PRODUCTS.items():
            if frappe.db.exists("Item", code):
                continue
            frappe.get_doc({"doctype": "Item", "item_code": code, "item_name": p["name"], "item_group": group_products,
                            "stock_uom": "Nos", "is_stock_item": 1, "maintain_stock": 1,
                            "standard_rate": p["price"], "valuation_rate": p["cost"]}).insert(ignore_permissions=True)
            made.append(code)
        for code, s in S.SERVICES.items():
            if frappe.db.exists("Item", code):
                continue
            frappe.get_doc({"doctype": "Item", "item_code": code, "item_name": s["name"], "item_group": group_services,
                            "stock_uom": "Nos", "is_stock_item": 0, "is_sales_item": 1, "is_purchase_item": 1,
                            "standard_rate": s["price"]}).insert(ignore_permissions=True)
            made.append(code)
        for code, label in S.EXPENSE_ITEMS.items():
            if frappe.db.exists("Item", code):
                continue
            frappe.get_doc({"doctype": "Item", "item_code": code, "item_name": label, "item_group": group_services,
                            "stock_uom": "Nos", "is_stock_item": 0, "is_purchase_item": 1,
                            "is_sales_item": 0}).insert(ignore_permissions=True)
            made.append(code)
        frappe.db.commit()
        return made

    _try(rows, "Items: 5 products (stock), 5 services and 5 expense items (non-stock)", items)

    def expense_defaults():
        """Each expense item names its P&L account. Freight, site travel and subcontract are direct project costs
        (cost of goods sold); rent, communications and administration are overheads."""
        cogs = "Cost of Goods Sold - " + _abbr()
        targets = {"EXP-RENT": accts.get("rent"), "EXP-COMMS": accts.get("communications"),
                   "EXP-ADM": accts.get("administration"), "EXP-FRT": cogs, "EXP-TPT": cogs, "SVC-SUBC": cogs}
        changed = []
        for code, account in targets.items():
            if not account or not frappe.db.exists("Item", code):
                continue
            item = frappe.get_doc("Item", code)
            row = next((d for d in item.get("item_defaults") or [] if d.company == S.COMPANY), None)
            if row is None:
                item.append("item_defaults", {"company": S.COMPANY, "expense_account": account})
            elif row.expense_account != account:
                row.expense_account = account
            else:
                continue
            item.save(ignore_permissions=True)
            changed.append(code)
        frappe.db.commit()
        return changed

    _try(rows, "Expense items name their P&L accounts (overheads; direct project costs)", expense_defaults)

    def payment_modes():
        """Each payment mode names its company account, so a receipt or payment cannot fall to the cash account (G-PAY-02)."""
        mapping = {"Cash": "Cash - " + _abbr(), "Cheque": S.BANK_GL, "Wire Transfer": S.BANK_GL, "Bank Draft": S.BANK_GL}
        changed = []
        for mode, account in mapping.items():
            if not frappe.db.exists("Mode of Payment", mode) or not frappe.db.exists("Account", account):
                continue
            doc = frappe.get_doc("Mode of Payment", mode)
            row = next((d for d in doc.get("accounts") or [] if d.company == S.COMPANY), None)
            if row is None:
                doc.append("accounts", {"company": S.COMPANY, "default_account": account})
            elif row.default_account != account:
                row.default_account = account
            else:
                continue
            doc.save(ignore_permissions=True)
            changed.append(mode)
        frappe.db.commit()
        return changed

    _try(rows, "Payment modes name their company accounts (cash; cheque, transfer and draft to the bank)", payment_modes)

    def ar_profile_wht():
        """The receivable profile names the withholding account and the filer services rate. With the hook active, a
        settled invoice must still post no income-tax withholding: the receipt deduction is the only posting (G-TAX-05)."""
        name = frappe.db.get_value("Trader AR Profile", {"company": S.COMPANY}, "name")
        if not name:
            return "no profile"
        doc = frappe.get_doc("Trader AR Profile", name)
        doc.wht_account = S.WHT_RECOVERABLE
        doc.default_wht_percent = S.WHT_SERVICES_RATE
        doc.withhold_reporting_enabled = 1
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return name

    _try(rows, "Receivable profile names the WHT account and the filer services rate (hook active, test of G-TAX-05)",
         ar_profile_wht)

    def users():
        out = {}
        for key, u in S.STAFF.items():
            if frappe.db.exists("User", u["email"]):
                out[key] = "exists"
                continue
            first, _, last = u["name"].partition(" ")
            doc = frappe.get_doc({"doctype": "User", "email": u["email"], "first_name": first, "last_name": last,
                                  "enabled": 1, "send_welcome_email": 0, "user_type": "System User",
                                  "new_password": S.DEMO_PASSWORD})
            for role in u["roles"]:
                if frappe.db.exists("Role", role):
                    doc.append("roles", {"role": role})
            doc.insert(ignore_permissions=True)
            frappe.get_doc({"doctype": "User Permission", "user": u["email"], "allow": "Company",
                            "for_value": S.COMPANY}).insert(ignore_permissions=True)
            out[key] = "created"
        frappe.db.commit()
        return out

    _try(rows, "Staff users (founder, sales, procurement, operations, accounts, management)", users)
    return rows
