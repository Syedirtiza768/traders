# -*- coding: utf-8 -*-
"""Falcon demo - phase 1b (founder: project B lost, partial collection on invoice 2) and phase 2 (team).

DEMO ONLY. Fictional data. Team members act under their own logins, so owner-based permissions and role
checks are exercised by the application, not simulated. A step that the application refuses is recorded as
the outcome (it is evidence for the permission matrix), not retried with another user.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import add_days, flt

from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try
from trader_app.scripts.falcon_demo_run import _as, _user, option_rows, submit_with_approval


def _supplier(key):
    return frappe.db.get_value("Supplier", {"supplier_name": S.SUPPLIERS[key]["name"]}, "name")


def _customer(key):
    return frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS[key]["name"]}, "name")


def founder_project_b_and_collection(state):
    from trader_app.api import finance
    from trader_app.api import opportunity as opp

    rows = []
    _as(_user("founder"))
    pb = S.PROJECT_B
    bayview = _customer("bayview")

    def project_b():
        hub = opp.create_opportunity(data={"title": pb["title"], "customer": bayview,
                                           "enquiry_date": pb["enquiry_date"], "enquiry_value": pb["enquiry_value"],
                                           "priority": pb["priority"], "description": "Motor starters. DEMO ONLY."},
                                     company=S.COMPANY)
        state["opp_b"] = hub["opportunity"]["name"]
        created = opp.create_quotation_for_opportunity(state["opp_b"], data={
            "transaction_date": pb["quotation"]["date"],
            "valid_till": add_days(pb["quotation"]["date"], pb["quotation"]["validity_days"]),
            "order_details": {"validity_days": pb["quotation"]["validity_days"],
                              "pay_advance_pct": pb["quotation"]["pay_advance_pct"],
                              "pay_delivery_pct": 0, "gst_mode": pb["quotation"]["gst_mode"]},
            "taxes_and_charges": "GST 18% goods - FIS",
            "commercial_options": option_rows(pb["quotation"]["lines"]),
        }, company=S.COMPANY)
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        state["q_b"] = q.name
        return {"name": q.name, "net": q.net_total, "grand": q.grand_total}

    _try(rows, "Project B: quotation for 6 motor starters and 6 contactors (product only, 10% discount)", project_b)

    def project_b_lost():
        opp.close_opportunity(state["opp_b"], "Quotation", company=S.COMPANY,
                              close_reason=pb["outcome"]["reason"])
        frappe.db.commit()
        status = frappe.db.get_value("Trader Opportunity", state["opp_b"], ["status", "close_stage", "close_reason"])
        return {"status": status, "note": "No Won/Lost outcome field: closed at stage Quotation with a reason"}

    _try(rows, "Project B lost (14 Jul): closed at quotation stage with reason (outcome recorded as a close)",
         project_b_lost)

    # Partial collection 2 on invoice 2 (25 August). The customer is a filer, but no WHT is deducted in this receipt.
    def collect_2():
        inv2 = state.get("inv_2") or frappe.db.get_value("Sales Invoice", {"company": S.COMPANY, "docstatus": 1,
                                                                          "grand_total": 356808.4}, "name")
        state["inv_2"] = inv2
        pe = finance.create_payment_entry(payment_type="Receive", party_type="Customer", party=_customer("indus"),
                                          amount=100000, company=S.COMPANY, posting_date="2026-08-25",
                                          reference_no="IBFT-IWTW-0825", reference_date="2026-08-25",
                                          mode_of_payment="Wire Transfer", paid_to=S.BANK_GL,
                                          allocations=[{"reference_name": inv2, "allocated_amount": 100000}])
        name = pe.get("name") if isinstance(pe, dict) else pe
        finance.submit_payment_entry(name)
        frappe.db.commit()
        state["pe_c2"] = name
        si = frappe.get_doc("Sales Invoice", inv2)
        return {"name": name, "invoice_outstanding": si.outstanding_amount, "status": si.status,
                "due": str(si.due_date)}

    _try(rows, "Partial collection 2 (25 Aug): 100,000 against invoice 2 (balance outstanding)", collect_2)
    return rows, state


def team_phase2(state):
    """From 1 August 2026 the team operates under its own logins. Project C is run end to end by the team."""
    from trader_app.api import finance
    from trader_app.api import opportunity as opp
    from trader_app.api import purchases

    rows = []
    pc = S.PROJECT_C
    lakeside = _customer("lakeside")

    # Sales executive opens project C and quotes it (her own record; owner-scoped).
    _as(_user("sales"))

    def project_c():
        hub = opp.create_opportunity(data={"title": pc["title"], "customer": lakeside,
                                           "enquiry_date": pc["enquiry_date"], "enquiry_value": pc["enquiry_value"],
                                           "priority": pc["priority"], "description": "AMC enquiry. DEMO ONLY."},
                                     company=S.COMPANY)
        state["opp_c"] = hub["opportunity"]["name"]
        q = pc["quotation"]
        created = opp.create_quotation_for_opportunity(state["opp_c"], data={
            "transaction_date": q["date"], "valid_till": add_days(q["date"], q["validity_days"]),
            "order_details": {"validity_days": q["validity_days"], "pay_advance_pct": q["pay_advance_pct"],
                              "pay_delivery_pct": 100 - q["pay_advance_pct"], "gst_mode": q["gst_mode"]},
            "taxes_and_charges": "GST 18% goods - FIS",
            "commercial_options": option_rows(q["lines"]),
        }, company=S.COMPANY)
        quote = frappe.get_doc("Quotation", created["name"])
        quote.submit()
        frappe.db.commit()
        state["q_c"] = quote.name
        return {"name": quote.name, "opp": state["opp_c"], "owner": quote.owner, "net": quote.net_total}

    _try(rows, "Sales executive opens project C and submits the AMC quotation (two options)", project_c)

    def project_c_po_and_oc():
        opp.add_customer_po(state["opp_c"], data={"customer_po_no": pc["po"]["number"], "po_date": pc["po"]["date"],
                                                 "po_amount": 240000}, company=S.COMPANY)
        oc = opp.create_order_confirmation(state["opp_c"], source_quotation=state["q_c"],
                                           customer_po_no=pc["po"]["number"], company=S.COMPANY,
                                           selected_options=json.dumps({"1": 1}), lines=json.dumps([1]))
        so = frappe.get_doc("Sales Order", oc["name"])
        so.transaction_date = pc["po"]["date"]
        so.delivery_date = add_days(pc["po"]["date"], 14)
        for r in so.items:
            r.delivery_date = so.delivery_date
        so.save()
        so.submit()
        frappe.db.commit()
        state["oc_c"] = so.name
        return {"name": so.name, "net": so.net_total, "items": [(i.item_code, i.qty) for i in so.items]}

    _try(rows, "Customer PO PO-LPM-0091 accepted; order confirmation for option 1 (4 quarterly fees)",
         project_c_po_and_oc)

    # Procurement (purchasing officer) buys the subcontract visits from Ayesha Site Services, against project C.
    _as(_user("procurement"))

    def subcontract_po():
        po = purchases.create_purchase_order(
            supplier=_supplier("ayesha_site"),
            items=[{"item_code": "SVC-SUBC", "qty": pc["visits"], "rate": pc["subcontract_actual_per_visit"]}],
            company=S.COMPANY, transaction_date="2026-08-13", schedule_date="2026-08-20")
        name = po.get("name") if isinstance(po, dict) else po
        state["po_sub_c"] = name
        # Procurement submits the draft to the supplier. Above the purchase limit the founder approves it first (G-APR-01).
        gate = submit_with_approval("Purchase Order", name,
                                    "Founder approves the subcontract for 4 visits, above the purchase limit",
                                    lambda: purchases.submit_purchase_order(name))
        return {"name": name, "submission": gate, "budget_per_visit": pc["subcontract_budget_per_visit"],
                "actual_per_visit": pc["subcontract_actual_per_visit"],
                "overrun": (pc["subcontract_actual_per_visit"] - pc["subcontract_budget_per_visit"]) * pc["visits"]}

    _try(rows, "Procurement raises a subcontract purchase order for 4 visits (no budget check exists)", subcontract_po)

    # Operations (delivery coordination) tries to raise the quarter 1 service challan. The application refuses
    # this for a stock-only role: the selling controller reads the customer, which needs sales access.
    _as(_user("operations"))

    def service_challan_by_operations():
        dn = opp.create_delivery_note_for_opportunity(state["opp_c"], source_oc=state["oc_c"],
                                                      company=S.COMPANY, lines=[1])
        doc = frappe.get_doc("Delivery Note", dn["name"])
        doc.posting_date = "2026-08-20"
        doc.set_posting_time = 1
        doc.save()
        doc.submit()
        frappe.db.commit()
        state["dn_c1"] = doc.name
        return {"name": doc.name}

    _try(rows, "Operations raises quarter 1 service challan (stock-only role): refused by the application",
         service_challan_by_operations)

    # Sales executive raises the same challan (role: Sales User). Recorded as a workaround, not a fix.
    _as(_user("sales"))

    def service_challan_by_sales():
        if state.get("dn_c1"):
            return {"name": state["dn_c1"], "note": "already created"}
        dn = opp.create_delivery_note_for_opportunity(state["opp_c"], source_oc=state["oc_c"],
                                                      company=S.COMPANY, lines=[1])
        doc = frappe.get_doc("Delivery Note", dn["name"])
        doc.posting_date = "2026-08-20"
        doc.set_posting_time = 1
        doc.save()
        doc.submit()
        frappe.db.commit()
        state["dn_c1"] = doc.name
        return {"name": doc.name, "net": doc.net_total,
                "items": [(i.item_code, i.qty, frappe.db.get_value("Item", i.item_code, "is_stock_item"))
                          for i in doc.items],
                "note": "workaround: challan raised by the sales executive"}

    _try(rows, "Quarter 1 service challan raised by the sales executive (service-only, non-stock)", service_challan_by_sales)

    # Accounts invoices the quarter from the challan (accounts role, no sales role). Refused before G-PERM-03.
    _as(_user("accounts"))

    def service_invoice_by_accounts():
        out = opp.create_invoice_for_opportunity(state["opp_c"], delivery_notes=[state["dn_c1"]],
                                                 posting_date="2026-08-20", auto_submit=1, company=S.COMPANY)
        state["inv_c1"] = out["name"]
        return {"name": out["name"]}

    _try(rows, "Accounts invoices quarter 1 of the AMC from the challan (accounts role)",
         service_invoice_by_accounts)

    # Workaround, only when accounts was refused: the founder (Trader Admin) issues the invoice, recorded as such.
    _as(_user("founder"))

    def service_invoice_1():
        if state.get("inv_c1"):
            si = frappe.get_doc("Sales Invoice", state["inv_c1"])
            return {"name": si.name, "net": si.net_total, "grand": si.grand_total,
                    "note": "not needed: accounts issued the invoice"}
        out = opp.create_invoice_for_opportunity(state["opp_c"], delivery_notes=[state["dn_c1"]],
                                                 posting_date="2026-08-20", auto_submit=1, company=S.COMPANY)
        state["inv_c1"] = out["name"]
        si = frappe.get_doc("Sales Invoice", out["name"])
        return {"name": si.name, "net": si.net_total, "grand": si.grand_total,
                "taxes": [(t.account_head, t.rate, t.tax_amount) for t in si.taxes],
                "note": "workaround: invoice issued by the founder because accounts is refused"}

    _try(rows, "Quarter 1 AMC invoice by the founder (workaround, only if accounts was refused)", service_invoice_1)

    def general_expense_rent():
        pi = purchases.create_purchase_invoice(
            supplier=_supplier("landlord"),
            items=[{"item_code": "EXP-RENT", "qty": 1, "rate": 120000}],
            company=S.COMPANY, posting_date="2026-08-01", due_date="2026-08-01", update_stock=0)
        name = pi.get("name") if isinstance(pi, dict) else pi
        gate = submit_with_approval("Purchase Invoice", name, "Founder approves the August office rent bill",
                                    lambda: purchases.submit_purchase_invoice(name))
        state["exp_rent"] = name
        return {"name": name, "submission": gate, "note": "expense entered as a supplier bill"}

    _try(rows, "General expense: office rent for August as a supplier bill (approval above 50,000)", general_expense_rent)

    def project_expense_freight():
        pi = purchases.create_purchase_invoice(
            supplier=_supplier("metro"),
            items=[{"item_code": "EXP-FRT", "qty": 2, "rate": 9000}],
            company=S.COMPANY, posting_date="2026-07-30", due_date="2026-08-14", update_stock=0)
        name = pi.get("name") if isinstance(pi, dict) else pi
        gate = submit_with_approval("Purchase Invoice", name, "Founder approves the project A freight bill",
                                    lambda: purchases.submit_purchase_invoice(name))
        state["exp_freight"] = name
        return {"name": name, "submission": gate, "project_link": "none - the bill cannot be tied to project A"}

    _try(rows, "Project expense: freight for two deliveries of project A (cannot be allocated to the project)",
         project_expense_freight)
    return rows, state
