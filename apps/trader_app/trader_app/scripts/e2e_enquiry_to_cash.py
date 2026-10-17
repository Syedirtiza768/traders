# -*- coding: utf-8 -*-
"""End-to-end enquiry-to-cash scenario (walkthrough capabilities).

One new customer goes through the whole commercial cycle on a Commercial
Opportunity, with the same figures as the sahamid walkthrough
(``docs/walkthrough/README.md`` in that repository):

  enquiry -> 3 quotations (3 lines, alternative options, revisions R1/R2)
  -> customer PO -> Order Confirmation (one option per line)
  -> 2 partial delivery challans, each with a gate pass
  -> 2 invoices -> 3 receipts (split allocation, a 3.00 shortfall written off)
  -> payment tracking, fulfilment progress and double-entry checks.

**Writes real documents.** Run it only on a disposable site that already has a
company (for example one seeded with ``trader_app.demo.install_demo``):

  bench --site <site> execute trader_app.scripts.e2e_enquiry_to_cash.run \\
      --kwargs "{'company': 'Global Trading Company Ltd'}"

Not idempotent: each run creates a new Opportunity and documents. If a run is
repeated on the same site pass ``'run_tag': 'R2'`` so the customer PO number
stays unique (ERPNext allows one Sales Order per customer PO).

Returns a dict; ``ok`` is true only when every check passed.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import add_days, cint, flt, getdate, nowdate

CUSTOMER_NAME = "Zenith Healthcare Trading (Pvt) Ltd"

# item_code: (name, list price, cost)
ITEMS = {
    "WT-UPS-3K": ("3kVA Online UPS", 180000, 126000),
    "WT-UPS-3K-B": ("3kVA Line-interactive UPS", 120000, 84000),
    "WT-BAT-100": ("100Ah Deep-cycle Battery", 38000, 26600),
    "WT-CAB-CAT6": ("CAT6 Cable Box 305m", 24000, 16800),
    "WT-RACK-42U": ("42U Server Rack", 95000, 66500),
    "WT-PDU-16": ("16-port Rack PDU", 12000, 8400),
}
OPENING_STOCK = {"WT-UPS-3K": 10, "WT-UPS-3K-B": 10, "WT-BAT-100": 40, "WT-CAB-CAT6": 5, "WT-RACK-42U": 6, "WT-PDU-16": 10}


# ── builders ──────────────────────────────────────────────────────


def _row(line, option, requirement, text, package_qty, items):
    return {
        "line_no": line,
        "client_requirements": requirement,
        "option_no": option,
        "option_text": text,
        "package_qty": package_qty,
        "stock_status": "Ex-Stock (Subject to Prior Sale)",
        "items": [
            {
                "item_code": code,
                "description": ITEMS[code][0],
                "unit_qty": unit_qty,
                "unit_price": ITEMS[code][1],
                "discount_percent": discount,
            }
            for code, unit_qty, discount in items
        ],
    }


L_UPS = "Online UPS 3kVA for server rooms (3 sites)"
L_BAT = "Battery backup per UPS"
L_RACK = "42U network rack with PDU"
L_CAB = "Structured cabling (CAT6)"


def hierarchy_q1():
    return [
        _row(1, 1, L_UPS, "3kVA online double-conversion UPS", 3, [("WT-UPS-3K", 1, 0)]),
        _row(1, 2, L_UPS, "3kVA line-interactive UPS (economy)", 3, [("WT-UPS-3K-B", 1, 0)]),
        _row(2, 1, L_BAT, "4 x 100Ah per UPS", 3, [("WT-BAT-100", 4, 0)]),
        _row(2, 2, L_BAT, "2 x 100Ah per UPS (short runtime)", 3, [("WT-BAT-100", 2, 0)]),
        _row(3, 1, L_CAB, "CAT6 cable box", 2, [("WT-CAB-CAT6", 1, 0)]),
    ]


def hierarchy_q2():
    return [
        _row(1, 1, L_UPS, "3kVA online double-conversion UPS", 3, [("WT-UPS-3K", 1, 2.5)]),
        _row(1, 2, L_UPS, "3kVA line-interactive UPS (economy)", 3, [("WT-UPS-3K-B", 1, 0)]),
        _row(2, 1, L_BAT, "4 x 100Ah per UPS", 3, [("WT-BAT-100", 4, 5)]),
        _row(2, 2, L_BAT, "2 x 100Ah per UPS (short runtime)", 3, [("WT-BAT-100", 2, 0)]),
        _row(3, 1, L_RACK, "42U rack with 2 PDU", 2, [("WT-RACK-42U", 1, 0), ("WT-PDU-16", 2, 0)]),
    ]


def hierarchy_q3():
    return [
        _row(1, 1, L_UPS, "3kVA online double-conversion UPS", 3, [("WT-UPS-3K", 1, 5)]),
        _row(1, 2, L_UPS, "3kVA line-interactive UPS (economy)", 3, [("WT-UPS-3K-B", 1, 0)]),
        _row(2, 1, L_BAT, "4 x 100Ah per UPS", 3, [("WT-BAT-100", 4, 10)]),
        _row(2, 2, L_BAT, "2 x 100Ah per UPS (short runtime)", 3, [("WT-BAT-100", 2, 0)]),
        _row(3, 1, L_RACK, "42U rack with 2 PDU", 2, [("WT-RACK-42U", 1, 0), ("WT-PDU-16", 2, 0)]),
        _row(3, 2, L_RACK, "42U rack with 1 PDU (lighter)", 2, [("WT-RACK-42U", 1, 0), ("WT-PDU-16", 1, 0)]),
    ]


def hierarchy_dc1():
    return [
        _row(1, 1, L_UPS, "3kVA online double-conversion UPS", 2, [("WT-UPS-3K", 1, 5)]),
        _row(2, 1, L_BAT, "4 x 100Ah per UPS", 2, [("WT-BAT-100", 4, 10)]),
    ]


def hierarchy_dc2():
    return [
        _row(1, 1, L_UPS, "3kVA online double-conversion UPS", 1, [("WT-UPS-3K", 1, 5)]),
        _row(2, 1, L_BAT, "4 x 100Ah per UPS", 1, [("WT-BAT-100", 4, 10)]),
        _row(3, 1, L_RACK, "42U rack with 2 PDU", 2, [("WT-RACK-42U", 1, 0), ("WT-PDU-16", 2, 0)]),
    ]


# ── master data / setup ───────────────────────────────────────────


def _ensure_fiscal_year(first_date, last_date):
    from erpnext.accounts.utils import FiscalYearError, get_fiscal_year

    for d in (first_date, last_date):
        try:
            get_fiscal_year(d, as_dict=True)
        except FiscalYearError:
            start = getdate(d).replace(month=1, day=1)
            fy = frappe.get_doc(
                {
                    "doctype": "Fiscal Year",
                    "year": "WT-{0}".format(start.year),
                    "year_start_date": start,
                    "year_end_date": start.replace(month=12, day=31),
                }
            )
            fy.insert(ignore_permissions=True)


def _ensure_items(company):
    group = frappe.db.get_value("Item Group", {"is_group": 0}, "name") or "All Item Groups"
    for code, (name, rate, cost) in ITEMS.items():
        if frappe.db.exists("Item", code):
            continue
        frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": code,
                "item_name": name,
                "description": name,
                "item_group": group,
                "stock_uom": "Nos",
                "is_stock_item": 1,
                "standard_rate": rate,
                "valuation_rate": cost,
            }
        ).insert(ignore_permissions=True)


def _ensure_opening_stock(company, warehouse, posting_date):
    existing = {
        r["item_code"]: flt(r["qty"])
        for r in frappe.db.sql(
            "select item_code, sum(actual_qty) qty from `tabBin` where warehouse=%s and item_code like 'WT-%%' group by item_code",
            warehouse,
            as_dict=True,
        )
    }
    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Receipt"
    se.company = company
    se.set_posting_time = 1
    se.posting_date = posting_date
    se.posting_time = "00:00:01"
    se.to_warehouse = warehouse
    for code, qty in OPENING_STOCK.items():
        if existing.get(code, 0) >= qty:
            continue
        se.append(
            "items",
            {"item_code": code, "qty": qty - existing.get(code, 0), "basic_rate": ITEMS[code][2], "t_warehouse": warehouse},
        )
    if not se.items:
        return None
    se.insert(ignore_permissions=True)
    se.submit()
    return se.name


def _ensure_payment_terms():
    name = "Walkthrough Net 30"
    if frappe.db.exists("Payment Terms Template", name):
        return name
    if not frappe.db.exists("Payment Term", "Walkthrough 30 days"):
        frappe.get_doc(
            {
                "doctype": "Payment Term",
                "payment_term_name": "Walkthrough 30 days",
                "invoice_portion": 100,
                "due_date_based_on": "Day(s) after invoice date",
                "credit_days": 30,
            }
        ).insert(ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "Payment Terms Template",
            "template_name": name,
            "terms": [
                {
                    "payment_term": "Walkthrough 30 days",
                    "invoice_portion": 100,
                    "due_date_based_on": "Day(s) after invoice date",
                    "credit_days": 30,
                }
            ],
        }
    ).insert(ignore_permissions=True)
    return name


def _ensure_customer(company):
    if frappe.db.exists("Customer", {"customer_name": CUSTOMER_NAME}):
        name = frappe.db.get_value("Customer", {"customer_name": CUSTOMER_NAME}, "name")
    else:
        cust = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": CUSTOMER_NAME,
                "customer_type": "Company",
                "customer_group": frappe.db.get_single_value("Selling Settings", "customer_group")
                or frappe.db.get_value("Customer Group", {"is_group": 0}, "name"),
                "territory": frappe.db.get_single_value("Selling Settings", "territory")
                or frappe.db.get_value("Territory", {"is_group": 0}, "name"),
            }
        )
        if frappe.db.has_column("Customer", "trader_tenant"):
            tenant = frappe.db.get_value("Company", company, "trader_tenant")
            if tenant:
                cust.trader_tenant = tenant
        cust.insert(ignore_permissions=True)
        name = cust.name
    frappe.db.set_value(
        "Customer",
        name,
        {"trader_payment_expected_days": 21, "payment_terms": _ensure_payment_terms()},
    )
    return name


def _account(company, **filters):
    return frappe.db.get_value("Account", dict(company=company, is_group=0, **filters), "name")


def _ensure_tax_policy(company, effective_from):
    """18 % exclusive GST template + Trader Tax Policy (no literals in the runtime)."""
    abbr = frappe.db.get_value("Company", company, "abbr")
    tax_account = _account(company, account_type="Tax", root_type="Liability")
    if not tax_account:
        parent = frappe.db.get_value("Account", {"company": company, "account_name": "Duties and Taxes", "is_group": 1}, "name")
        acc = frappe.get_doc(
            {
                "doctype": "Account",
                "account_name": "Walkthrough Output GST",
                "parent_account": parent,
                "company": company,
                "account_type": "Tax",
                "root_type": "Liability",
            }
        )
        acc.insert(ignore_permissions=True)
        tax_account = acc.name
    template = "Walkthrough GST 18% - {0}".format(abbr)
    if not frappe.db.exists("Sales Taxes and Charges Template", template):
        frappe.get_doc(
            {
                "doctype": "Sales Taxes and Charges Template",
                "title": "Walkthrough GST 18%",
                "company": company,
                "taxes": [
                    {
                        "charge_type": "On Net Total",
                        "account_head": tax_account,
                        "description": "GST 18%",
                        "rate": 18,
                    }
                ],
            }
        ).insert(ignore_permissions=True)
    if not frappe.db.exists("Trader Tax Policy", {"company": company, "tax_template": template}):
        frappe.get_doc(
            {
                "doctype": "Trader Tax Policy",
                "policy_name": "Walkthrough GST 18% exclusive",
                "company": company,
                "is_active": 1,
                "priority": 1,
                "tax_mode": "exclusive",
                "tax_template": template,
                "rate": 18,
                "effective_from": effective_from,
                "service_flag": "any",
            }
        ).insert(ignore_permissions=True)
    return template, tax_account


def _provision_packs(company, write_off_account):
    from trader_app.api.migration_toolkit import provision_ar_pack, provision_opportunity_pack

    provision_opportunity_pack(company=company, template="electrence", activate=1)
    provision_ar_pack(company=company, template="electrence", activate=1)
    name = frappe.db.get_value("Trader AR Profile", {"company": company, "is_active": 1}, "name")
    frappe.db.set_value(
        "Trader AR Profile",
        name,
        {"write_off_account": write_off_account, "settle_tolerance": 5, "withhold_reporting_enabled": 0},
    )
    frappe.clear_document_cache("Trader AR Profile", name)
    frappe.db.commit()


# ── the scenario ──────────────────────────────────────────────────


def run(company=None, today=None, run_tag=None):
    from trader_app.api import (
        ar_tracking,
        finance,
        fulfilment,
        gate_pass,
    )
    from trader_app.api import opportunity as opp
    from trader_app.api.hierarchy import hierarchy_amount
    from trader_app.api.opportunity import _default_warehouse
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    company = company or frappe.db.get_value("Company", {}, "name")
    if not company:
        frappe.throw("No Company on this site; seed one first (trader_app.demo.install_demo).")

    today = getdate(today or nowdate())
    d = {  # same offsets as the walkthrough timeline (relative to today)
        "enquiry": add_days(today, -72),
        "q1": add_days(today, -69),
        "q2": add_days(today, -61),
        "q3": add_days(today, -54),
        "po": add_days(today, -50),
        "dc1": add_days(today, -42),
        "inv1": add_days(today, -41),
        "r1": add_days(today, -34),
        "dc2": add_days(today, -28),
        "inv2": add_days(today, -27),
        "r2": add_days(today, -20),
        "r3": add_days(today, -13),
    }
    checks = []

    def check(label, ok, detail=""):
        checks.append({"check": label, "pass": bool(ok), "detail": detail})
        return ok

    _ensure_fiscal_year(add_days(d["enquiry"], -2), today)
    _ensure_items(company)
    warehouse = _default_warehouse(company)
    stock_entry = _ensure_opening_stock(company, warehouse, add_days(d["enquiry"], -1))
    customer = _ensure_customer(company)
    template, tax_account = _ensure_tax_policy(company, add_days(d["enquiry"], -30))
    write_off = _account(company, root_type="Expense", account_type="Round Off") or _account(
        company, root_type="Expense", account_name="Write Off"
    ) or _account(company, root_type="Expense")
    _provision_packs(company, write_off)

    # 1 ── enquiry
    hub = opp.create_opportunity(
        data={
            "title": "Online UPS, batteries and rack for Zenith head office",
            "customer": customer,
            "enquiry_date": str(d["enquiry"]),
            "enquiry_value": 2500000,
            "priority": "High",
            "description": "Enquiry received by email; UPS for server rooms at 3 sites.",
        },
        company=company,
    )
    opportunity = hub["opportunity"]["name"]
    opp.add_opportunity_comment(opportunity, "Enquiry received from procurement manager.", company=company)

    # 2 ── three quotations
    order_details = {"validity_days": 15, "pay_advance_pct": 30, "pay_delivery_pct": 70, "gst_mode": "exclusive"}

    def new_quote(date, rows):
        created = opp.create_quotation_for_opportunity(
            opportunity,
            data={
                "transaction_date": str(date),
                "valid_till": str(add_days(date, 15)),
                "order_details": order_details,
                "taxes_and_charges": template,
                "commercial_options": rows,
            },
            company=company,
        )
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        return q.name

    def revise(source, date, rows):
        rev = opp.create_quotation_revision(source, company=company)
        opp.save_commercial_options("Quotation", rev["name"], rows, company=company)
        q = frappe.get_doc("Quotation", rev["name"])
        q.transaction_date = date
        q.valid_till = add_days(date, 15)
        q.save()
        q.submit()
        frappe.db.commit()
        return rev["name"], rev["revision_label"]

    q1 = new_quote(d["q1"], hierarchy_q1())
    q2, q2_label = revise(q1, d["q2"], hierarchy_q2())
    q3, q3_label = revise(q2, d["q3"], hierarchy_q3())

    totals = {
        "Q1": hierarchy_amount(hierarchy_q1()),
        "Q2": hierarchy_amount(hierarchy_q2()),
        "Q3": hierarchy_amount(hierarchy_q3()),
    }
    check("quotation values (option 0 per line) 1,044,000 / 1,197,700 / 1,161,400",
          [round(totals[k], 2) for k in ("Q1", "Q2", "Q3")] == [1044000.0, 1197700.0, 1161400.0], str(totals))
    check("revisions labelled R1 and R2", (q2_label, q3_label) == ("R1", "R2"), "{0},{1}".format(q2_label, q3_label))
    q3_doc = frappe.get_doc("Quotation", q3)
    check("Q3 flat lines carry only option 0 (net 1,161,400)", round(flt(q3_doc.net_total), 2) == 1161400.0,
          "net_total={0}".format(q3_doc.net_total))
    check("Q3 keeps all 6 options in the hierarchy", len(q3_doc.trader_commercial_options) == 6,
          str(len(q3_doc.trader_commercial_options)))

    # 3 ── customer PO -> Order Confirmation (accepted: option 1 of every line)
    po_no = "ZHT/PO/2026/0457" + ("-{0}".format(run_tag) if run_tag else "")
    opp.add_customer_po(opportunity, data={"customer_po_no": po_no, "po_date": str(d["po"]), "po_amount": 1161400}, company=company)
    oc = opp.create_order_confirmation(opportunity, source_quotation=q3, customer_po_no=po_no, company=company)
    so = frappe.get_doc("Sales Order", oc["name"])
    so.transaction_date = d["po"]
    so.delivery_date = add_days(d["po"], 20)
    for row in so.items:
        row.delivery_date = so.delivery_date
    so.save()
    so.submit()
    frappe.db.commit()
    so.reload()
    ordered = {r.item_code: flt(r.qty) for r in so.items}
    check("OC orders one option per line, not every alternative",
          ordered == {"WT-UPS-3K": 3.0, "WT-BAT-100": 12.0, "WT-RACK-42U": 2.0, "WT-PDU-16": 4.0}, str(ordered))
    check("OC value 1,161,400", round(flt(so.net_total), 2) == 1161400.0, str(so.net_total))
    dup = None
    try:
        opp.create_order_confirmation(opportunity, source_quotation=q3, customer_po_no=po_no, company=company)
    except Exception as e:  # noqa: BLE001
        dup = str(e)
    check("one OC per customer PO enforced", bool(dup), dup or "second OC was created")

    # 4 ── two partial delivery challans + gate passes
    def make_dc(rows, date):
        dn = opp.create_delivery_note_for_opportunity(opportunity, source_oc=so.name, company=company)
        opp.save_commercial_options("Delivery Note", dn["name"], rows, company=company)
        doc = frappe.get_doc("Delivery Note", dn["name"])
        doc.posting_date = date
        doc.set_posting_time = 1
        doc.save()
        doc.submit()
        frappe.db.commit()
        return doc.name

    dc1 = make_dc(hierarchy_dc1(), d["dc1"])
    gp1 = gate_pass.create_gate_pass(dc1, vehicle_no="KHI-4471", driver_name="Imran", received_by="Store keeper, Zenith",
                                     pass_date=str(d["dc1"]))
    status1 = gate_pass.get_dispatch_status(dc1)
    check("gate pass 1 releases the whole challan", status1["fully_released"], json.dumps(status1["items"]))
    over = None
    try:
        gate_pass.create_gate_pass(dc1, items=[{"item_code": "WT-UPS-3K", "qty": 1}])
    except Exception as e:  # noqa: BLE001
        over = str(e)
    check("gate pass cannot release more than the challan", bool(over), over or "extra release accepted")

    prog1 = fulfilment.get_fulfilment_progress(opportunity)
    p1 = {i["item_code"]: i for i in prog1["items"]}
    check("after DC1: UPS 2 of 3 delivered, racks 0 of 2",
          p1["WT-UPS-3K"]["delivered_qty"] == 2 and p1["WT-RACK-42U"]["delivered_qty"] == 0,
          json.dumps({k: v["delivered_qty"] for k, v in p1.items()}))

    # 5a ── invoice 1
    inv1 = opp.create_invoice_for_opportunity(opportunity, delivery_notes=[dc1], posting_date=str(d["inv1"]),
                                              auto_submit=1, company=company)["name"]
    si1 = frappe.get_doc("Sales Invoice", inv1)
    check("INV1 net 615,600 + 18% GST = 726,408", round(flt(si1.net_total), 2) == 615600.0 and round(flt(si1.grand_total), 2) == 726408.0,
          "net={0} grand={1}".format(si1.net_total, si1.grand_total))
    check("INV1 expected payment date = invoice date + 21 days",
          str(si1.trader_expected_payment_date) == str(add_days(d["inv1"], 21)), str(si1.trader_expected_payment_date))
    check("INV1 due date = invoice date + 30 days", str(si1.due_date) == str(add_days(d["inv1"], 30)), str(si1.due_date))

    # 6a ── receipt 1: 300,000 against INV1
    def receive(amount, date, allocations, ref):
        pe = finance.create_payment_entry(
            payment_type="Receive",
            party_type="Customer",
            party=customer,
            amount=amount,
            company=company,
            posting_date=str(date),
            allocations=allocations,
            reference_no=ref,
            reference_date=str(date),
        )
        finance.submit_payment_entry(pe["name"])
        return pe["name"]

    r1 = receive(300000, d["r1"], [{"reference_name": inv1, "allocated_amount": 300000}], "CHQ-884211")
    si1.reload()
    check("after RCT1 INV1 outstanding = 426,408", round(flt(si1.outstanding_amount), 2) == 426408.0, str(si1.outstanding_amount))

    # 4b/5b ── delivery 2 and invoice 2
    dc2 = make_dc(hierarchy_dc2(), d["dc2"])
    gate_pass.create_gate_pass(dc2, vehicle_no="KHI-4471", driver_name="Imran", received_by="Store keeper, Zenith",
                               pass_date=str(d["dc2"]))
    inv2 = opp.create_invoice_for_opportunity(opportunity, delivery_notes=[dc2], posting_date=str(d["inv2"]),
                                              auto_submit=1, company=company)["name"]
    si2 = frappe.get_doc("Sales Invoice", inv2)
    check("INV2 net 545,800 + 18% GST = 644,044", round(flt(si2.net_total), 2) == 545800.0 and round(flt(si2.grand_total), 2) == 644044.0,
          "net={0} grand={1}".format(si2.net_total, si2.grand_total))

    prog2 = fulfilment.get_fulfilment_progress(opportunity)
    check("fulfilment: OC fully delivered and fully invoiced", prog2["fully_delivered"] and prog2["fully_invoiced"],
          json.dumps(prog2["totals"]))
    check("fulfilment invoiced value = 1,161,400", round(prog2["totals"]["invoiced_amount"], 2) == 1161400.0,
          str(prog2["totals"]["invoiced_amount"]))

    # 6b ── receipt 2: 526,405 split; 426,405 closes INV1 (3.00 short), 100,000 part-pays INV2
    r2 = receive(
        526405,
        d["r2"],
        [
            {"reference_name": inv1, "allocated_amount": 426405},
            {"reference_name": inv2, "allocated_amount": 100000},
        ],
        "IBFT-77120931",
    )
    si1.reload()
    check("INV1 closed by RCT2 within tolerance (outstanding 0)", round(flt(si1.outstanding_amount), 2) == 0.0,
          str(si1.outstanding_amount))
    check("INV1 status Paid", si1.status == "Paid", si1.status)
    pe2 = frappe.get_doc("Payment Entry", r2)
    wo = [row for row in pe2.deductions]
    check("RCT2 carries one 3.00 write-off deduction", len(wo) == 1 and round(flt(wo[0].amount), 2) == 3.0,
          json.dumps([{"account": w.account, "amount": w.amount} for w in wo]))

    # 6c ── receipt 3: 400,000 against INV2 (leaves 144,044)
    r3 = receive(400000, d["r3"], [{"reference_name": inv2, "allocated_amount": 400000}], "CHQ-884377")
    si2.reload()
    check("INV2 outstanding = 144,044", round(flt(si2.outstanding_amount), 2) == 144044.0, str(si2.outstanding_amount))
    check("INV2 status Partly Paid / Overdue-or-Unpaid", si2.status in ("Partly Paid", "Overdue", "Overdue and Discounted", "Partly Paid and Discounted"),
          si2.status)

    # 7 ── tracking
    tracker = ar_tracking.get_invoice_payment_tracker(company=company, opportunity=opportunity, as_of=str(today))
    by_inv = {r["invoice"]: r for r in tracker["rows"]}
    check("tracker: INV1 Paid", by_inv[inv1]["status"] == "Paid", by_inv[inv1]["status"])
    check("tracker: INV2 Part Paid with 144,044 open",
          by_inv[inv2]["status"] == "Part Paid" and round(by_inv[inv2]["outstanding_amount"], 2) == 144044.0,
          json.dumps(by_inv[inv2], default=str))
    check("tracker: INV2 six days past expected date, not yet due",
          by_inv[inv2]["days_past_expected"] == 6 and by_inv[inv2]["days_past_due"] == 0,
          "expected+{0} due+{1}".format(by_inv[inv2]["days_past_expected"], by_inv[inv2]["days_past_due"]))
    hist = ar_tracking.get_invoice_payment_history(inv1)
    check("INV1 payment history shows RCT1 and RCT2 allocations",
          [round(p["allocated_to_invoice"], 2) for p in hist["payments"]] == [300000.0, 426408.0],
          json.dumps([p["allocated_to_invoice"] for p in hist["payments"]]))

    # 8 ── ledger integrity
    vouchers = [inv1, inv2, r1, r2, r3, dc1, dc2]
    rows = frappe.db.sql(
        """
        select voucher_type, voucher_no, round(sum(debit) - sum(credit), 2) as diff,
               round(sum(debit), 2) as dr, round(sum(credit), 2) as cr
        from `tabGL Entry`
        where is_cancelled = 0 and company = %(company)s and voucher_no in %(vouchers)s
        group by voucher_type, voucher_no
        """,
        {"company": company, "vouchers": tuple(vouchers)},
        as_dict=True,
    )
    unbalanced = [r for r in rows if abs(flt(r["diff"])) > 0.005]
    check("every scenario voucher balances (Dr = Cr)", not unbalanced and len(rows) >= 5, json.dumps(rows, default=str))

    receivable = si1.debit_to
    gl_ar = flt(
        frappe.db.sql(
            """select sum(debit) - sum(credit) from `tabGL Entry`
               where is_cancelled = 0 and company = %s and party_type = 'Customer' and party = %s and account = %s
                 and voucher_no in %s""",
            (company, customer, receivable, tuple(vouchers)),
        )[0][0]
    )
    sub_ledger = flt(si1.outstanding_amount) + flt(si2.outstanding_amount)
    check("customer sub-ledger equals GL receivable (144,044.00)", round(gl_ar, 2) == round(sub_ledger, 2) == 144044.0,
          "gl={0} sub={1}".format(round(gl_ar, 2), round(sub_ledger, 2)))

    sales_total = flt(
        frappe.db.sql(
            """select sum(credit) - sum(debit) from `tabGL Entry`
               where is_cancelled = 0 and company = %s and voucher_no in (%s, %s)
                 and account in (select name from `tabAccount` where company = %s and root_type = 'Income')""",
            (company, inv1, inv2, company),
        )[0][0]
    )
    check("income posted = 1,161,400", round(sales_total, 2) == 1161400.0, str(sales_total))

    ok = all(c["pass"] for c in checks)
    result = {
        "ok": ok,
        "company": company,
        "customer": customer,
        "opportunity": opportunity,
        "quotations": [q1, q2, q3],
        "order_confirmation": so.name,
        "delivery_challans": [dc1, dc2],
        "invoices": [inv1, inv2],
        "payments": [r1, r2, r3],
        "tracker_summary": tracker["summary"],
        "checks": checks,
    }
    frappe.db.commit()
    for c in checks:
        print("{0}  {1}{2}".format("PASS" if c["pass"] else "FAIL", c["check"], "" if c["pass"] else "  -> " + str(c["detail"])))
    print("RESULT: {0}".format("ALL CHECKS PASSED" if ok else "FAILURES PRESENT"))
    return result
