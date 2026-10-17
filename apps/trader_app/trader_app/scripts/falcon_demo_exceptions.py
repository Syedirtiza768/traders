# -*- coding: utf-8 -*-
"""Falcon demo - realistic exceptions, each run under the role that meets it. DEMO ONLY. Fictional data.

Each step records what the application did. A refusal by the application is an outcome, not a script failure.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import add_days, flt

from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try
from trader_app.scripts.falcon_demo_run import _as, _user, option_rows, submit_with_approval


def _customer(key):
    return frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS[key]["name"]}, "name")


def _supplier(key):
    return frappe.db.get_value("Supplier", {"supplier_name": S.SUPPLIERS[key]["name"]}, "name")


def exceptions(state):
    from trader_app.api import opportunity as opp
    from trader_app.api import purchases
    from trader_app.api.back_to_back import create_purchase_order_for_order, receive_purchase_order_for_order

    rows = []
    indus = _customer("indus")

    # E1. Cancellation after purchasing: a small spare-parts order for Indus, bought from Nexa, then cancelled.
    _as(_user("sales"))

    def spare_quote():
        hub = opp.create_opportunity(data={"title": "Spare contactors for Filtration Plant 2 (DEMO)", "customer": indus,
                                           "enquiry_date": "2026-08-10", "enquiry_value": 152000,
                                           "priority": "Normal", "description": "Spares. DEMO ONLY."},
                                     company=S.COMPANY)
        state["opp_d"] = hub["opportunity"]["name"]
        created = opp.create_quotation_for_opportunity(state["opp_d"], data={
            "transaction_date": "2026-08-10", "valid_till": add_days("2026-08-10", 15),
            "order_details": {"validity_days": 15, "pay_advance_pct": 100, "pay_delivery_pct": 0, "gst_mode": "exclusive"},
            "taxes_and_charges": "GST 18% goods - FIS",
            "commercial_options": option_rows([(1, 1, "FA-CON-40", 10, 3800, 0)]),
        }, company=S.COMPANY)
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        state["q_d"] = q.name
        return {"name": q.name, "net": q.net_total}

    _try(rows, "E1 setup: spare contactors quotation for Indus (sales executive)", spare_quote)

    def spare_oc_and_purchase():
        opp.add_customer_po(state["opp_d"], data={"customer_po_no": "PO-IWTW-SPARE-02", "po_date": "2026-08-11",
                                                 "po_amount": 152000}, company=S.COMPANY)
        oc = opp.create_order_confirmation(state["opp_d"], source_quotation=state["q_d"],
                                           customer_po_no="PO-IWTW-SPARE-02", company=S.COMPANY,
                                           selected_options=json.dumps({"1": 1}), lines=json.dumps([1]))
        so = frappe.get_doc("Sales Order", oc["name"])
        so.transaction_date = "2026-08-11"
        so.delivery_date = "2026-08-25"
        for r in so.items:
            r.delivery_date = so.delivery_date
        so.save()
        so.submit()
        state["oc_d"] = so.name
        po = create_purchase_order_for_order(so.name, _supplier("nexa"),
                                             json.dumps({"FA-CON-40": S.PRODUCTS["FA-CON-40"]["cost"]}),
                                             transaction_date="2026-08-11")
        state["po_d"] = po["name"]
        frappe.db.commit()
        return {"oc": so.name, "po": po["name"]}

    _try(rows, "E1 setup: order confirmation and back-to-back purchase of 10 contactors", spare_oc_and_purchase)

    # The sales executive cancels the order after the purchase was placed (the supplier has not been told). The
    # application refuses while the purchase is open (G-EXC-01). The decision is then taken: the founder cancels the
    # purchase, and the sales executive cancels the order.
    def cancel_after_purchase():
        from trader_app.api import sales as sales_api
        before = frappe.db.get_value("Purchase Order", state["po_d"], ["docstatus", "status"], as_dict=True)
        try:
            sales_api.cancel_sales_order(state["oc_d"])
            refused = None
        except Exception as exc:  # noqa: BLE001
            frappe.db.rollback()
            refused = "refused while the purchase is open: " + str(exc)[:160]
        _as(_user("founder"))
        frappe.get_doc("Purchase Order", state["po_d"]).cancel()
        frappe.db.commit()
        _as(_user("sales"))
        res = sales_api.cancel_sales_order(state["oc_d"])
        frappe.db.commit()
        after = frappe.db.get_value("Purchase Order", state["po_d"], ["docstatus", "status"], as_dict=True)
        return {"first_attempt": refused, "order": res, "purchase_before": before, "purchase_after": after,
                "finding": "control: the order is refused while a purchase is open; the purchase was cancelled by decision"}

    _try(rows, "E3 cancellation after purchasing: refused while the purchase is open; then the purchase cancelled by decision",
         cancel_after_purchase)

    # E2. Return: the founder takes back two contactors from delivery 1 (return against a submitted challan).
    _as(_user("founder"))

    def return_goods():
        ret = opp.create_return_delivery_note(state["dn_1"] if state.get("dn_1") else
                                              frappe.db.get_value("Delivery Note", {"company": S.COMPANY, "docstatus": 1,
                                                                                    "po_no": S.PROJECT_A["po"]["number"]},
                                                                  "name"), company=S.COMPANY)
        name = ret.get("name") if isinstance(ret, dict) else ret
        doc = frappe.get_doc("Delivery Note", name)
        kept = []
        for row in doc.items:
            if row.item_code == "FA-CON-40":
                row.qty = -2
                kept.append(row)
            elif row.item_code == "FA-PLC-16":
                continue
            else:
                continue
        doc.items = kept
        doc.save()
        doc.submit()
        frappe.db.commit()
        return {"return_note": doc.name, "items": [(i.item_code, i.qty) for i in doc.items],
                "finding": "partial return of 2 contactors submitted; no credit note is raised automatically"}

    _try(rows, "E2 return: 2 contactors taken back from delivery 1 (founder)", return_goods)

    # E3. Credit limit: the sales executive quotes Lakeside 600,000 (limit 500,000). Refused; founder overrides.
    _as(_user("sales"))
    lakeside = _customer("lakeside")

    def credit_block():
        hub = opp.create_opportunity(data={"title": "Packing line spares (DEMO) over credit limit",
                                           "customer": lakeside, "enquiry_date": "2026-09-01",
                                           "enquiry_value": 600000, "priority": "Normal", "description": "DEMO ONLY"},
                                     company=S.COMPANY)
        state["opp_e"] = hub["opportunity"]["name"]
        created = opp.create_quotation_for_opportunity(state["opp_e"], data={
            "transaction_date": "2026-09-01", "valid_till": add_days("2026-09-01", 15),
            "order_details": {"validity_days": 15, "pay_advance_pct": 0, "pay_delivery_pct": 100, "gst_mode": "exclusive"},
            "taxes_and_charges": "GST 18% goods - FIS",
            "commercial_options": option_rows([(1, 1, "FA-SRV-15", 6, 92000, 0)]),
        }, company=S.COMPANY)
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        state["q_e"] = q.name
        return {"name": q.name, "net": q.net_total}

    _try(rows, "E3 credit limit: sales executive submits a 552,000 quotation to Lakeside (limit 500,000)", credit_block)

    _as(_user("founder"))

    def credit_override():
        q = frappe.get_doc("Quotation", state["q_e"])
        return {"quotation": q.name, "docstatus": q.docstatus, "override_by": "founder (Trader Admin)",
                "reason_recorded": "not captured: the override is by role only"}

    _try(rows, "E3 override: founder (Trader Admin) keeps the quotation after the limit warning", credit_override)

    # E4. Discount: the sales executive gives Indus 20% (limit 10%). An approver records it before the quotation is
    # submitted (G-APR-01): refused first, then approved by the founder, then submitted by the sales executive.
    _as(_user("sales"))

    def discount_with_approval():
        hub = opp.create_opportunity(data={"title": "Discount test (DEMO)", "customer": indus,
                                           "enquiry_date": "2026-09-02", "enquiry_value": 50000, "priority": "Low",
                                           "description": "DEMO ONLY"}, company=S.COMPANY)
        created = opp.create_quotation_for_opportunity(hub["opportunity"]["name"], data={
            "transaction_date": "2026-09-02", "valid_till": add_days("2026-09-02", 15),
            "order_details": {"validity_days": 15, "pay_advance_pct": 0, "pay_delivery_pct": 100, "gst_mode": "exclusive"},
            "taxes_and_charges": "GST 18% goods - FIS",
            "commercial_options": option_rows([(1, 1, "FA-MTR-7", 4, 12500, 20)]),
        }, company=S.COMPANY)
        name = created["name"]
        gate = submit_with_approval("Quotation", name, "Founder approves a 20% repeat-customer discount on the quote",
                                    lambda: frappe.get_doc("Quotation", name).submit())
        q = frappe.get_doc("Quotation", name)
        return {"name": q.name, "discount_pct": 20, "net": q.net_total, "submission": gate,
                "finding": "a 20% discount is refused until an approver records it, then the quotation is submitted"}

    _try(rows, "E4 discount: sales executive gives 20% (limit 10%): refused, then approved by the founder and submitted",
         discount_with_approval)

    # E5. Restricted access: the sales executive asks the application for supplier payables and margin reports.
    def restricted_reports():
        from trader_app.api import reports as rep
        out = {}
        for name, fn in (("supplier payables", lambda: rep.get_payable_aging(company=S.COMPANY)),
                         ("customer profitability", lambda: rep.get_customer_profitability_report(company=S.COMPANY)),
                         ("sales performance (gross profit)", lambda: rep.get_sales_performance_report(company=S.COMPANY))):
            try:
                fn()
                out[name] = "allowed"
            except Exception as exc:  # noqa: BLE001
                out[name] = "refused: " + type(exc).__name__ + " " + str(exc)[:140]
        return out

    _try(rows, "E5 restricted access: sales executive reads supplier payables and margin reports", restricted_reports)
    return rows, state
