# -*- coding: utf-8 -*-
"""Falcon demo - sample documents and their ledger rows, for the package (06). DEMO ONLY. Fictional data.

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_documents.samples

Finds the documents by what they are (the first of each kind on this run), so the output follows the last run. It reads
only; nothing is posted.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import flt

from trader_app.scripts import falcon_demo_spec as S


def _first(doctype, filters, limit=1, start=0):
    rows = frappe.get_all(doctype, filters=filters, order_by="creation asc", limit_start=start, limit_page_length=limit,
                          pluck="name")
    return rows[0] if rows and limit == 1 else rows


def _customer(key):
    return frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS[key]["name"]}, "name")


def _supplier(key):
    return frappe.db.get_value("Supplier", {"supplier_name": S.SUPPLIERS[key]["name"]}, "name")


def _invoice(name):
    head = frappe.db.get_value("Sales Invoice", name, [
        "name", "posting_date", "due_date", "customer", "company", "net_total", "total_taxes_and_charges", "grand_total",
        "rounded_total", "outstanding_amount", "status", "po_no", "currency", "conversion_rate", "docstatus"], as_dict=True)
    items = frappe.db.sql("""select item_code, item_name, qty, rate, amount, net_amount, discount_percentage,
        delivery_note from `tabSales Invoice Item` where parent = %s order by idx""", (name,), as_dict=True)
    taxes = frappe.db.sql("""select account_head, rate, tax_amount, charge_type from `tabSales Taxes and Charges`
        where parent = %s order by idx""", (name,), as_dict=True)
    return {"header": dict(head), "items": [dict(i) for i in items], "taxes": [dict(t) for t in taxes]}


def _purchase(name):
    head = frappe.db.get_value("Purchase Invoice", name, [
        "name", "posting_date", "due_date", "supplier", "company", "net_total", "total_taxes_and_charges", "grand_total",
        "outstanding_amount", "status", "bill_no", "currency", "docstatus"], as_dict=True)
    items = frappe.db.sql("""select item_code, item_name, qty, rate, amount, expense_account from `tabPurchase Invoice Item`
        where parent = %s order by idx""", (name,), as_dict=True)
    taxes = frappe.db.sql("""select account_head, rate, tax_amount from `tabPurchase Taxes and Charges`
        where parent = %s order by idx""", (name,), as_dict=True)
    return {"header": dict(head), "items": [dict(i) for i in items], "taxes": [dict(t) for t in taxes]}


def _payment(name):
    head = frappe.db.get_value("Payment Entry", name, [
        "name", "posting_date", "payment_type", "party_type", "party", "paid_amount", "received_amount", "mode_of_payment",
        "reference_no", "reference_date", "paid_from", "paid_to", "difference_amount", "status", "docstatus"], as_dict=True)
    refs = frappe.db.sql("""select reference_doctype, reference_name, allocated_amount from `tabPayment Entry Reference`
        where parent = %s""", (name,), as_dict=True)
    deductions = frappe.db.sql("""select account, amount from `tabPayment Entry Deduction` where parent = %s""", (name,),
                               as_dict=True)
    return {"header": dict(head), "references": [dict(r) for r in refs], "deductions": [dict(d) for d in deductions]}


def _gl(voucher_type, voucher_no):
    rows = frappe.db.sql("""select account, party, debit, credit, posting_date from `tabGL Entry`
        where voucher_type = %s and voucher_no = %s and is_cancelled = 0 order by idx, account""",
                         (voucher_type, voucher_no), as_dict=True)
    return [{"account": r.account, "party": r.party or "", "debit": flt(r.debit), "credit": flt(r.credit),
             "posting_date": str(r.posting_date)} for r in rows]


def _stock(voucher_no):
    rows = frappe.db.sql("""select item_code, warehouse, actual_qty, valuation_rate, stock_value_difference
        from `tabStock Ledger Entry` where voucher_no = %s and is_cancelled = 0 order by creation""",
                         (voucher_no,), as_dict=True)
    return [dict(r) for r in rows]


def samples():
    frappe.set_user("Administrator")
    indus, nexa, ayesha, landlord = _customer("indus"), _supplier("nexa"), _supplier("ayesha_site"), _supplier("landlord")
    out = {}
    invoices = frappe.get_all("Sales Invoice", filters={"company": S.COMPANY, "customer": indus, "docstatus": 1},
                              order_by="creation asc", pluck="name")
    if len(invoices) >= 2:
        out["sales_invoice_1"] = _invoice(invoices[0])
        out["sales_invoice_2"] = _invoice(invoices[1])
        out["gl_sales_invoice_1"] = _gl("Sales Invoice", invoices[0])
        out["gl_sales_invoice_2"] = _gl("Sales Invoice", invoices[1])
    dn = frappe.get_all("Delivery Note", filters={"company": S.COMPANY, "customer": indus, "docstatus": 1},
                        order_by="creation asc", pluck="name")
    if dn:
        out["delivery_note_1"] = {"name": dn[0], "stock": _stock(dn[0]), "gl": _gl("Delivery Note", dn[0])}
    bills = frappe.get_all("Purchase Invoice", filters={"company": S.COMPANY, "supplier": nexa, "docstatus": 1},
                           order_by="creation asc", pluck="name")
    if bills:
        out["purchase_invoice_nexa_1"] = _purchase(bills[0])
        out["gl_purchase_invoice_nexa_1"] = _gl("Purchase Invoice", bills[0])
    sub = frappe.get_all("Purchase Invoice", filters={"company": S.COMPANY, "supplier": ayesha, "docstatus": 1},
                         order_by="creation asc", pluck="name")
    if sub:
        out["purchase_invoice_subcontract"] = _purchase(sub[0])
        out["gl_purchase_invoice_subcontract"] = _gl("Purchase Invoice", sub[0])
    rent = frappe.get_all("Purchase Invoice", filters={"company": S.COMPANY, "supplier": landlord, "docstatus": 1},
                          order_by="creation asc", pluck="name")
    if rent:
        out["purchase_invoice_rent"] = _purchase(rent[0])
        out["gl_purchase_invoice_rent"] = _gl("Purchase Invoice", rent[0])
    rec = frappe.get_all("Payment Entry", filters={"company": S.COMPANY, "party": indus, "payment_type": "Receive",
                                                  "docstatus": 1}, order_by="creation asc", pluck="name")
    if rec:
        out["payment_collection_1"] = _payment(rec[0])
        out["gl_payment_collection_1"] = _gl("Payment Entry", rec[0])
    if len(rec) >= 3:
        out["payment_withholding"] = _payment(rec[-1])
        out["gl_payment_withholding"] = _gl("Payment Entry", rec[-1])
    pay = frappe.get_all("Payment Entry", filters={"company": S.COMPANY, "party": nexa, "payment_type": "Pay",
                                                  "docstatus": 1}, order_by="creation asc", pluck="name")
    if pay:
        out["payment_supplier_1"] = _payment(pay[0])
        out["gl_payment_supplier_1"] = _gl("Payment Entry", pay[0])
    jv = frappe.get_all("Journal Entry", filters={"company": S.COMPANY, "docstatus": 1,
                                                  "user_remark": ["like", "Owner capital%"]}, order_by="creation asc",
                        pluck="name")
    if jv:
        out["journal_capital"] = {"name": jv[0], "gl": _gl("Journal Entry", jv[0])}
    return json.loads(json.dumps(out, default=str))
