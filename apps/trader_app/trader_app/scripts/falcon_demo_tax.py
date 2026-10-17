# -*- coding: utf-8 -*-
"""Falcon demo - income-tax withholding on a customer receipt (TAX-4). DEMO ONLY. Fictional data.

Indus (a filer) settles the balance of invoice 2 net of withholding at 14% on the services portion. The withholding
is a deduction row on the Payment Entry: the allocations clear the invoice in full, the cash received is the gross
less the withholding, and the withheld amount is debited to the WHT recoverable asset.

The base is the installation service value on invoice 2 (140,000, excluding GST). The rate and base are demo
assumptions (10-pakistan-tax-rules.md, T15-T17); a tax adviser confirms them before use.
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import flt

from trader_app.api import finance
from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try
from trader_app.scripts.falcon_demo_run import _as, _user

SETTLE_DATE = "2026-09-15"
SERVICE_BASE = 140000.0  # SVC-INST installation on invoice 2, excluding GST


def wht_final_collection(state):
    rows = []

    def settle(user_key):
        _as(_user(user_key))
        inv = state["inv_2"]
        customer = frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS["indus"]["name"]}, "name")
        outstanding = flt(frappe.db.get_value("Sales Invoice", inv, "outstanding_amount"))
        withheld = round(SERVICE_BASE * S.WHT_SERVICES_RATE / 100.0, 2)
        pe = finance.create_payment_entry(
            payment_type="Receive", party_type="Customer", party=customer, amount=outstanding,
            company=S.COMPANY, posting_date=SETTLE_DATE, reference_no="IBFT-IWTW-0915", reference_date=SETTLE_DATE,
            mode_of_payment="Wire Transfer", paid_to=S.BANK_GL,
            allocations=[{"reference_name": inv, "allocated_amount": outstanding}],
            wht_amount=withheld, wht_account=S.WHT_RECOVERABLE)
        name = pe.get("name") if isinstance(pe, dict) else pe
        finance.submit_payment_entry(name)
        frappe.db.commit()
        state["pe_wht"] = name
        pay = frappe.db.get_value("Payment Entry", name, ["paid_amount", "received_amount"], as_dict=True)
        si = frappe.db.get_value("Sales Invoice", inv, ["outstanding_amount", "status"], as_dict=True)
        return {"name": name, "gross_settled": flt(pay.paid_amount), "cash_received": flt(pay.received_amount),
                "wht_withheld": withheld, "invoice_outstanding": flt(si.outstanding_amount), "status": si.status}

    # Accounts settles an invoice it did not raise (manager rule, G-PERM-03). Only if the application refuses does the
    # founder post the same receipt, recorded as a workaround.
    def settle_by_accounts():
        out = settle("accounts")
        state["settled_by_accounts"] = True
        return out

    _try(rows, "Final settlement of invoice 2 net of 14% WHT by accounts", settle_by_accounts)
    # Recorded in every run: a step that is not needed says so, so the walkthrough keeps its positions.
    _try(rows, "Final settlement of invoice 2 net of 14% WHT, posted by the founder (workaround, only if accounts was refused)",
         lambda: {"note": "not needed: accounts settled invoice 2"} if state.get("settled_by_accounts")
         else settle("founder"))
    return rows, state


def close_project_a(state):
    """Project closure review. Closing at the delivery stage needs a reason while order lines are undelivered (control):
    first without a reason (refused), then with the reason 'Delivered and invoiced', which the data contradicts (the
    preventive visits are undelivered and invoice 1 is open). The reason is accepted without a check (gap)."""
    from trader_app.api import opportunity as opp
    _as(_user("founder"))
    rows = []

    def close_without_reason():
        opp.close_opportunity(state["opp_a"], close_stage="Delivery", company=S.COMPANY)
        frappe.db.commit()
        return {"status": frappe.db.get_value("Trader Opportunity", state["opp_a"], "status")}

    _try(rows, "Close project A at the Delivery stage without a reason: refused while order lines are undelivered (control)",
         close_without_reason)

    def close_with_stated_reason():
        opp.close_opportunity(state["opp_a"], close_stage="Delivery", company=S.COMPANY,
                              close_reason="Delivered and invoiced")
        frappe.db.commit()
        inv1 = flt(frappe.db.get_value("Sales Invoice", state["inv_1"], "outstanding_amount"))
        undelivered = flt(frappe.db.get_value("Sales Order", state["oc_a"], "per_delivered"))
        return {"status": frappe.db.get_value("Trader Opportunity", state["opp_a"], "status"),
                "close_stage": frappe.db.get_value("Trader Opportunity", state["opp_a"], "close_stage"),
                "order_delivered_percent": undelivered, "invoice_1_still_open": inv1}

    _try(rows, "Close project A at the Delivery stage with the reason 'Delivered and invoiced': accepted while lines are "
               "undelivered and invoice 1 is open (gap)", close_with_stated_reason)
    return rows, state
