# -*- coding: utf-8 -*-
"""Falcon demo - business run (phase 1: the founder operates alone; phase 2 adds the team).

DEMO ONLY. Fictional data. Each step is recorded with its outcome in the returned rows; a failure is
recorded and the run continues where later steps do not depend on it. Documents created are returned in
``state`` so the verification script and the walkthrough can refer to them by name.

Run order: falcon_demo.bootstrap -> falcon_demo_masters.masters -> falcon_demo_run.phase1_founder
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import add_days, flt, getdate

from trader_app.scripts import falcon_demo_spec as S
from trader_app.scripts.falcon_demo import _try

LINE_LABEL = {
    1: "Control panel hardware (PLC, servo drive, enclosure, contactors)",
    2: "Installation and commissioning on site",
    3: "Preventive maintenance, first year",
}
OPTION_LABEL = {
    (1, 1): "Option 1 - recommended: 2 PLC, 1 servo drive, enclosure, 12 contactors",
    (1, 2): "Option 2 - economy: 1 PLC, enclosure, 12 contactors (no servo drive)",
    (2, 1): "Option 1 - complete installation in one visit",
    (2, 2): "Option 2 - phased installation in two visits",
    (3, 1): "Option 1 - four visits in the year",
}


def _item_desc(code):
    if code in S.PRODUCTS:
        return S.PRODUCTS[code]["name"]
    if code in S.SERVICES:
        return S.SERVICES[code]["name"]
    return code


def option_rows(lines, discount_override=None):
    """Group quote lines into commercial option rows: one row per (line, option), items as its list."""
    grouped = {}
    for line, option, item, qty, price, disc in lines:
        if discount_override and (line, option) in discount_override:
            disc = discount_override[(line, option)]
        row = grouped.setdefault((line, option), {"items": []})
        row["items"].append({"item_code": item, "description": _item_desc(item), "unit_qty": qty,
                             "unit_price": price, "discount_percent": disc})
    rows = []
    for (line, option), g in sorted(grouped.items()):
        has_goods = any(i["item_code"] in S.PRODUCTS for i in g["items"])
        rows.append({
            "line_no": line, "option_no": option,
            "client_requirements": LINE_LABEL.get(line, "Line {0}".format(line)),
            "option_text": OPTION_LABEL.get((line, option), "Option {0}".format(option)),
            "package_qty": 1,
            "stock_status": "Ex-Stock (Subject to Prior Sale)" if has_goods else "",
            "items": g["items"],
        })
    return rows


def _as(email):
    frappe.set_user(email)


def _user(role_key):
    return S.STAFF[role_key]["email"]


def submit_with_approval(doctype, name, reason, submit):
    """Submit a draft as the current user. When the application needs an approval, the founder (Trader Admin) records
    it and the same user submits again. The refusal and the approval are both returned, so the run records both."""
    from trader_app.api import approvals

    frappe.db.commit()
    try:
        submit()
        frappe.db.commit()
        return {"submitted": True, "approval": "not needed"}
    except Exception as exc:  # noqa: BLE001
        frappe.db.rollback()
        if "needs an approval" not in str(exc):
            raise
        refused = str(exc)[:200]
    user = frappe.session.user
    _as(_user("founder"))
    approval = approvals.approve(doctype, name, reason)
    frappe.db.commit()
    _as(user)
    submit()
    frappe.db.commit()
    return {"submitted": True, "refused_first": refused, "approved_by": "founder", "approval": approval}


def _company_default_warehouse():
    abbr = frappe.db.get_value("Company", S.COMPANY, "abbr")
    name = "Main Warehouse - {0}".format(abbr)
    if not frappe.db.exists("Warehouse", name):
        frappe.get_doc({"doctype": "Warehouse", "warehouse_name": "Main Warehouse", "company": S.COMPANY,
                        "is_group": 0}).insert(ignore_permissions=True)
    return name


def phase1_founder():
    """Founder operates alone: capital, project A end to end up to the purchase commitment, then the rest."""
    rows = []
    state = {}
    founder = _user("founder")
    _as(founder)
    from trader_app.api import opportunity as opp
    from trader_app.api import finance
    from trader_app.api.hierarchy import serialize_commercial_options

    warehouse = _company_default_warehouse()
    customer = frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS["indus"]["name"]}, "name")
    template = "GST 18% goods - FIS"
    frappe.db.commit()

    # ---- capital introduced by the founder on day one (equity; no inventory) -------------------------
    def capital():
        je = finance.create_journal_entry(
            voucher_type="Journal Entry", posting_date="2026-07-01",
            user_remark="Owner capital introduced into the business account (DEMO ONLY)",
            accounts=[
                {"account": "Demo Bank - Current Account - FIS", "debit": S.FOUNDER_CAPITAL},
                {"account": "Capital Stock - FIS", "credit": S.FOUNDER_CAPITAL},
            ],
            company=S.COMPANY)
        name = je.get("name") if isinstance(je, dict) else je
        finance.submit_journal_entry(name)
        frappe.db.commit()
        state["capital_je"] = name
        return name

    _try(rows, "Founder capital introduced (journal entry 2,000,000)", capital)

    # ---- project A: enquiry ----------------------------------------------------------------------------
    pa = S.PROJECT_A

    def open_project_a():
        hub = opp.create_opportunity(data={
            "title": pa["title"], "customer": customer, "enquiry_date": pa["enquiry_date"],
            "enquiry_value": pa["enquiry_value"], "priority": pa["priority"],
            "description": "Enquiry from plant engineering. DEMO ONLY.",
        }, company=S.COMPANY)
        state["opp_a"] = hub["opportunity"]["name"]
        for date, text in pa["comments"]:
            opp.add_opportunity_comment(state["opp_a"], "[{0}] {1}".format(date, text), company=S.COMPANY)
        frappe.db.commit()
        return state["opp_a"]

    _try(rows, "Project A opened for Indus Water (enquiry, comments)", open_project_a)
    if "opp_a" not in state:
        return rows, state

    # ---- quotation Q1 with options and services ----------------------------------------------------------
    def quote_q1():
        q1 = pa["quotation_q1"]
        created = opp.create_quotation_for_opportunity(state["opp_a"], data={
            "transaction_date": q1["date"], "valid_till": add_days(q1["date"], q1["validity_days"]),
            "order_details": {"validity_days": q1["validity_days"], "pay_advance_pct": q1["pay_advance_pct"],
                              "pay_delivery_pct": 100 - q1["pay_advance_pct"], "gst_mode": q1["gst_mode"],
                              "freight_clause": q1["freight"]},
            "taxes_and_charges": template,
            "commercial_options": option_rows(q1["lines"]),
        }, company=S.COMPANY)
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        state["q1"] = q.name
        return {"name": q.name, "net": q.net_total, "grand": q.grand_total, "items": len(q.items)}

    _try(rows, "Quotation Q1: 3 lines, 6 options, GST exclusive, validity 15 days", quote_q1)

    # ---- revision R1: negotiated discount and phased-installation price ---------------------------------
    def revision_r1():
        rev = opp.create_quotation_revision(state["q1"], company=S.COMPANY)
        name = rev["name"]
        disc_override = {(1, 1): 8}
        rows_r1 = option_rows(pa["quotation_q1"]["lines"], discount_override=disc_override)
        for r in rows_r1:
            if (r["line_no"], r["option_no"]) == (2, 1):
                for it in r["items"]:
                    it["unit_price"] = pa["revision_r1"]["changes"]["svc_inst_option1"]
        opp.save_commercial_options("Quotation", name, rows_r1, company=S.COMPANY)
        q = frappe.get_doc("Quotation", name)
        old_date = getdate(q.transaction_date)
        q.transaction_date = pa["revision_r1"]["date"]
        q.valid_till = add_days(pa["revision_r1"]["date"], 15)
        # DEFECT G-QUO-01: moving the quotation date leaves payment-schedule due dates from the old date, and the
        # save is refused. The demo keeps each due date's offset from the new date (documented workaround).
        for row in q.get("payment_schedule") or []:
            if row.due_date:
                offset = (getdate(row.due_date) - old_date).days
                row.due_date = add_days(q.transaction_date, offset)
        q.save()
        q.submit()
        frappe.db.commit()
        state["r1"] = name
        return {"name": name, "label": rev.get("revision_label"), "net": q.net_total, "grand": q.grand_total}

    _try(rows, "Revision R1 of Q1 (line 1 discount 8%, installation 140,000)", revision_r1)

    # ---- customer PO and order confirmation from the accepted revision ----------------------------------
    def customer_po():
        r1 = frappe.get_doc("Quotation", state["r1"])
        opp.add_customer_po(state["opp_a"], data={"customer_po_no": pa["po"]["number"],
                                                 "po_date": pa["po"]["date"],
                                                 "po_amount": flt(r1.net_total)}, company=S.COMPANY)
        frappe.db.commit()
        return pa["po"]["number"]

    _try(rows, "Customer PO PO-IWTW-2026-0412 registered on project A", customer_po)

    def order_confirmation():
        oc = opp.create_order_confirmation(
            state["opp_a"], source_quotation=state["r1"], customer_po_no=pa["po"]["number"], company=S.COMPANY,
            selected_options=json.dumps({"1": 1, "2": 1, "3": 1}), lines=json.dumps([1, 2, 3]))
        so = frappe.get_doc("Sales Order", oc["name"])
        so.transaction_date = pa["po"]["date"]
        so.delivery_date = add_days(pa["po"]["date"], 21)
        for r in so.items:
            r.delivery_date = so.delivery_date
        so.save()
        so.submit()
        frappe.db.commit()
        state["oc_a"] = so.name
        return {"name": so.name, "net": so.net_total, "grand": so.grand_total, "lines": len(so.items),
                "taxes": [(t.account_head, t.rate, t.tax_amount) for t in so.taxes]}

    _try(rows, "Order Confirmation from accepted revision R1 (options 1, 1, 1)", order_confirmation)
    return rows, state



def reset_business():
    """Cancel and delete this company's transactions (masters stay). Makes the demo repeatable.

    Several passes: a document is cancelled only when nothing still depends on it (a return note blocks its
    delivery note; a delivery blocks the receipt that stocked it; a submitted order blocks its quotation). Newest
    documents go first. A pass that cancels nothing ends the loop; anything left is reported.
    """
    frappe.set_user("Administrator")
    rows = []
    doctypes = ["Payment Entry", "Journal Entry", "Sales Invoice", "Delivery Note", "Purchase Invoice",
                "Purchase Receipt", "Purchase Order", "Sales Order", "Quotation"]
    for _ in range(8):
        progress = 0
        for doctype in doctypes:
            for name in frappe.get_all(doctype, filters={"company": S.COMPANY, "docstatus": 1},
                                       order_by="creation desc", pluck="name"):
                try:
                    frappe.get_doc(doctype, name).cancel()
                    frappe.db.commit()
                    rows.append(("cancelled", doctype, name))
                    progress += 1
                except Exception as exc:  # noqa: BLE001
                    frappe.db.rollback()
                    rows.append(("blocked", doctype, name, str(exc)[:120]))
        if progress == 0:
            break
    for doctype in doctypes:
        for name in frappe.get_all(doctype, filters={"company": S.COMPANY, "docstatus": 0}, pluck="name"):
            try:
                frappe.delete_doc(doctype, name, force=1, ignore_permissions=True)
                frappe.db.commit()
                rows.append(("deleted_draft", doctype, name))
            except Exception as exc:  # noqa: BLE001
                frappe.db.rollback()
                rows.append(("delete_failed", doctype, name, str(exc)[:120]))
    for name in frappe.get_all("Trader Opportunity", filters={"company": S.COMPANY}, pluck="name"):
        try:
            frappe.delete_doc("Trader Opportunity", name, force=1, ignore_permissions=True)
            frappe.db.commit()
            rows.append(("deleted", "Trader Opportunity", name))
        except Exception as exc:  # noqa: BLE001
            frappe.db.rollback()
            rows.append(("delete_failed", "Trader Opportunity", name, str(exc)[:120]))
    return rows
