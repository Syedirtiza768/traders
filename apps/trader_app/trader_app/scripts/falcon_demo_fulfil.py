# -*- coding: utf-8 -*-
"""Falcon demo - project A fulfilment: procurement on order, partial supply, partial delivery, partial invoicing,
partial collection and supplier settlement. DEMO ONLY. Fictional data.

Run after falcon_demo_run.phase1_founder (which creates the order confirmation) with:
    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_fulfil.fulfil_project_a
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import flt

from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try
from trader_app.scripts.falcon_demo_run import _as, _company_default_warehouse, _user, option_rows, submit_with_approval

NEXA_RATES = {"FA-PLC-16": S.PRODUCTS["FA-PLC-16"]["cost"], "FA-SRV-15": S.PRODUCTS["FA-SRV-15"]["cost"],
              "FA-CON-40": S.PRODUCTS["FA-CON-40"]["cost"], "FA-ENC-86": S.PRODUCTS["FA-ENC-86"]["cost"]}
R1_DISCOUNT = {(1, 1): 8}
PURCHASE_TAX = "Input GST 18% - FIS"


def _supplier(key):
    return frappe.db.get_value("Supplier", {"supplier_name": S.SUPPLIERS[key]["name"]}, "name")


def _customer(key):
    return frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS[key]["name"]}, "name")


def fulfil_project_a(state=None):
    from trader_app.api import opportunity as opp
    from trader_app.api import finance
    from trader_app.api.back_to_back import create_purchase_order_for_order, receive_purchase_order_for_order
    from trader_app.api import purchases

    rows = []
    state = dict(state or {})
    if "oc_a" not in state:
        state.update(_locate_project_a())
    _as(_user("founder"))
    frappe.db.commit()
    warehouse = _company_default_warehouse()
    nexa = _supplier("nexa")
    customer = _customer("indus")
    so = state.get("oc_a")
    opp_a = state.get("opp_a")

    # 1. Procurement on order: buy the goods shortfall of the order from Nexa at agreed prices, credit 30 days.
    def buy_on_order():
        res = create_purchase_order_for_order(so, nexa, json.dumps(NEXA_RATES), transaction_date="2026-07-17",
                                              submit=False)
        state["po_nexa"] = res["name"]
        # Supplier's promised dispatch date for the whole order (27 July). The customer date stays on the OC.
        for item in frappe.get_doc("Purchase Order", res["name"]).items:
            frappe.db.set_value("Purchase Order Item", item.name, "schedule_date", "2026-07-27")
        frappe.db.commit()
        # Submitted once approved when the order is above the purchase limit (G-APR-01); the draft is the same document.
        gate = submit_with_approval("Purchase Order", res["name"],
                                    "Founder approves the Nexa order for the Indus shortfall at agreed prices",
                                    lambda: purchases.submit_purchase_order(res["name"]))
        return {"po": res["name"], "lines": res["lines"], "supplier": nexa, "submission": gate}

    _try(rows, "Purchase order PO-NEXA for the order shortfall (back-to-back, agreed prices, credit 30 days)", buy_on_order)

    # 2. Partial supply on 27 July: one PLC module and all contactors arrive; the rest is still on order.
    def receipt_partial_1():
        out = receive_purchase_order_for_order(so, state["po_nexa"],
                                               quantities=json.dumps({"FA-PLC-16": 1, "FA-CON-40": 12}),
                                               posting_date="2026-07-27")
        state["pr_1"] = out["name"]
        return out

    _try(rows, "Partial supply 1 (27 Jul): 1 PLC module and 12 contactors received", receipt_partial_1)

    # 3. Supplier delay: the rest arrives 3 August, a week after the promised date.
    def receipt_partial_2():
        out = receive_purchase_order_for_order(so, state["po_nexa"],
                                               quantities=json.dumps({"FA-PLC-16": 1, "FA-SRV-15": 1, "FA-ENC-86": 1}),
                                               posting_date="2026-08-03")
        state["pr_2"] = out["name"]
        return out

    _try(rows, "Supplier delay: remaining goods received 3 Aug (promised 27 Jul)", receipt_partial_2)

    # 4. Partial delivery 1 (29 July): line 1 with what is on hand (1 PLC module, 12 contactors).
    def delivery_1():
        dn = opp.create_delivery_note_for_opportunity(opp_a, source_oc=so, company=S.COMPANY, lines=[1])
        name = dn["name"]
        rows_dn = option_rows([(1, 1, "FA-PLC-16", 1, S.PRODUCTS["FA-PLC-16"]["price"], 8),
                               (1, 1, "FA-CON-40", 12, S.PRODUCTS["FA-CON-40"]["price"], 8)])
        opp.save_commercial_options("Delivery Note", name, rows_dn, company=S.COMPANY)
        doc = frappe.get_doc("Delivery Note", name)
        doc.posting_date = "2026-07-29"
        doc.set_posting_time = 1
        doc.save()
        doc.submit()
        frappe.db.commit()
        state["dn_1"] = doc.name
        return {"name": doc.name, "net": doc.net_total, "items": [(i.item_code, i.qty) for i in doc.items]}

    _try(rows, "Partial delivery 1 (29 Jul): line 1 with 1 PLC module and 12 contactors", delivery_1)

    # 5. Partial invoicing 1: invoice the delivered goods only.
    def invoice_1():
        out = opp.create_invoice_for_opportunity(opp_a, delivery_notes=[state["dn_1"]], posting_date="2026-07-29",
                                                 auto_submit=1, company=S.COMPANY)
        state["inv_1"] = out["name"]
        si = frappe.get_doc("Sales Invoice", out["name"])
        return {"name": si.name, "net": si.net_total, "grand": si.grand_total, "status": si.status,
                "taxes": [(t.account_head, t.rate, t.tax_amount) for t in si.taxes]}

    _try(rows, "Invoice 1 (29 Jul) raised from delivery 1 only (partial invoicing)", invoice_1)

    # 6. Partial collection: 50,000 received against invoice 1 on 5 August; the balance is outstanding.
    def collect_1():
        pe = finance.create_payment_entry(payment_type="Receive", party_type="Customer", party=customer,
                                          amount=50000, company=S.COMPANY, posting_date="2026-08-05",
                                          reference_no="CHQ-IWTW-0501", reference_date="2026-08-05",
                                          mode_of_payment="Cheque", paid_to=S.BANK_GL,
                                          allocations=[{"reference_name": state["inv_1"], "allocated_amount": 50000}])
        name = pe.get("name") if isinstance(pe, dict) else pe
        finance.submit_payment_entry(name)
        frappe.db.commit()
        state["pe_c1"] = name
        si = frappe.get_doc("Sales Invoice", state["inv_1"])
        return {"name": name, "invoice_outstanding": si.outstanding_amount, "status": si.status}

    _try(rows, "Partial collection 1 (5 Aug): 50,000 received against invoice 1", collect_1)

    # 7. Supplier bills for the two receipts (purchase invoice against the purchase receipt, input GST 18%).
    def supplier_bill_1():
        pi = purchases.create_purchase_invoice(
            supplier=nexa,
            items=[{"item_code": "FA-PLC-16", "qty": 1, "rate": NEXA_RATES["FA-PLC-16"], "warehouse": warehouse},
                   {"item_code": "FA-CON-40", "qty": 12, "rate": NEXA_RATES["FA-CON-40"], "warehouse": warehouse}],
            company=S.COMPANY, posting_date="2026-07-27", due_date="2026-08-26",
            taxes_and_charges=PURCHASE_TAX, update_stock=0)
        name = pi.get("name") if isinstance(pi, dict) else pi
        purchases.submit_purchase_invoice(name)
        frappe.db.commit()
        state["pi_1"] = name
        doc = frappe.get_doc("Purchase Invoice", name)
        return {"name": name, "net": doc.net_total, "grand": doc.grand_total, "due": str(doc.due_date)}

    _try(rows, "Supplier bill 1 (Nexa, 27 Jul, due 26 Aug): PLC and contactors, input GST 18%", supplier_bill_1)

    def supplier_bill_2():
        pi = purchases.create_purchase_invoice(
            supplier=nexa,
            items=[{"item_code": "FA-PLC-16", "qty": 1, "rate": NEXA_RATES["FA-PLC-16"], "warehouse": warehouse},
                   {"item_code": "FA-SRV-15", "qty": 1, "rate": NEXA_RATES["FA-SRV-15"], "warehouse": warehouse},
                   {"item_code": "FA-ENC-86", "qty": 1, "rate": NEXA_RATES["FA-ENC-86"], "warehouse": warehouse}],
            company=S.COMPANY, posting_date="2026-08-03", due_date="2026-09-02",
            taxes_and_charges=PURCHASE_TAX, update_stock=0)
        name = pi.get("name") if isinstance(pi, dict) else pi
        purchases.submit_purchase_invoice(name)
        frappe.db.commit()
        state["pi_2"] = name
        doc = frappe.get_doc("Purchase Invoice", name)
        return {"name": name, "net": doc.net_total, "grand": doc.grand_total, "due": str(doc.due_date)}

    _try(rows, "Supplier bill 2 (Nexa, 3 Aug, due 2 Sep): servo, PLC, enclosure, input GST 18%", supplier_bill_2)

    # 8. Supplier payment decision: after the 5 August collection the founder pays 50,000 on account of bill 1.
    def supplier_payment_1():
        pe = finance.create_payment_entry(payment_type="Pay", party_type="Supplier", party=nexa, amount=50000,
                                          company=S.COMPANY, posting_date="2026-08-06",
                                          reference_no="NEXA-TR-0806", reference_date="2026-08-06",
                                          mode_of_payment="Wire Transfer", paid_from=S.BANK_GL,
                                          allocations=[{"reference_name": state["pi_1"], "allocated_amount": 50000}])
        name = pe.get("name") if isinstance(pe, dict) else pe
        gate = submit_with_approval("Payment Entry", name,
                                    "Founder approves the 50,000 supplier payment on account of bill 1",
                                    lambda: finance.submit_payment_entry(name))
        state["pe_s1"] = name
        pi = frappe.get_doc("Purchase Invoice", state["pi_1"])
        return {"name": name, "bill_outstanding": pi.outstanding_amount, "submission": gate}

    _try(rows, "Supplier payment 1 (6 Aug): 50,000 against bill 1 (founder decision)", supplier_payment_1)

    # 9. Partial delivery 2 (4 Aug): remaining goods plus the installation (service item) on line 2.
    def delivery_2():
        dn = opp.create_delivery_note_for_opportunity(opp_a, source_oc=so, company=S.COMPANY, lines=[1, 2])
        name = dn["name"]
        rows_dn = option_rows([(1, 1, "FA-PLC-16", 1, S.PRODUCTS["FA-PLC-16"]["price"], 8),
                               (1, 1, "FA-SRV-15", 1, S.PRODUCTS["FA-SRV-15"]["price"], 8),
                               (1, 1, "FA-ENC-86", 1, S.PRODUCTS["FA-ENC-86"]["price"], 8),
                               (2, 1, "SVC-INST", 1, 140000, 0)])
        opp.save_commercial_options("Delivery Note", name, rows_dn, company=S.COMPANY)
        doc = frappe.get_doc("Delivery Note", name)
        doc.posting_date = "2026-08-04"
        doc.set_posting_time = 1
        doc.save()
        doc.submit()
        frappe.db.commit()
        state["dn_2"] = doc.name
        return {"name": doc.name, "net": doc.net_total, "items": [(i.item_code, i.qty) for i in doc.items]}

    _try(rows, "Partial delivery 2 (4 Aug): remaining goods and installation (service) on line 2", delivery_2)

    # 10. Invoice 2 is a mixed invoice: goods and the service on one document.
    def invoice_2():
        out = opp.create_invoice_for_opportunity(opp_a, delivery_notes=[state["dn_2"]], posting_date="2026-08-04",
                                                 auto_submit=1, company=S.COMPANY)
        state["inv_2"] = out["name"]
        si = frappe.get_doc("Sales Invoice", out["name"])
        return {"name": si.name, "net": si.net_total, "grand": si.grand_total,
                "taxes": [(t.account_head, t.rate, t.tax_amount) for t in si.taxes]}

    _try(rows, "Invoice 2 (4 Aug): mixed goods and installation on one invoice", invoice_2)

    # 11. Subcontracted installation labour (service cost), bill from Ayesha Site Services, 15 days.
    def subcontract_bill():
        pi = purchases.create_purchase_invoice(
            supplier=_supplier("ayesha_site"),
            items=[{"item_code": "SVC-SUBC", "qty": 1, "rate": 90000, "warehouse": None}],
            company=S.COMPANY, posting_date="2026-08-06", due_date="2026-08-21", update_stock=0)
        name = pi.get("name") if isinstance(pi, dict) else pi
        gate = submit_with_approval("Purchase Invoice", name,
                                    "Founder approves the subcontracted installation labour bill (non-stock, 90,000)",
                                    lambda: purchases.submit_purchase_invoice(name))
        state["pi_sub_a"] = name
        return {"name": name, "submission": gate}

    _try(rows, "Subcontractor bill (Ayesha Site Services, 6 Aug): installation labour, service cost", subcontract_bill)
    return rows, state


def _locate_project_a():
    """Find project A and its order confirmation when the run is resumed in a later session."""
    opp_name = frappe.db.get_value("Trader Opportunity", {"company": S.COMPANY, "title": S.PROJECT_A["title"]}, "name")
    oc = frappe.db.get_value("Sales Order", {"trader_opportunity": opp_name, "docstatus": 1,
                                              "po_no": S.PROJECT_A["po"]["number"]}, "name")
    return {"opp_a": opp_name, "oc_a": oc}
