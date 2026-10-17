# -*- coding: utf-8 -*-
"""Falcon demo - project profitability from the posted documents, tied to the ledger. DEMO ONLY. Fictional data.

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_profit.profitability

Method (the policy is in falcon_demo_spec.OVERHEAD_ACCOUNTS and 04-demo-dataset.md, assumptions A4-A6):
- Revenue is the net of posted sales invoices, by customer (customer A = project A, customer C = project C).
- Direct cost is the cost of goods sold for the project's deliveries (stock ledger outflow, net of returns), the
  subcontract and freight bills that the posting placed in cost of goods sold, and the subcontract commitments
  that are still open (purchase orders not yet billed).
- Overheads (rent and any communications or administration bills) are allocated to projects in proportion to
  invoiced net revenue for the period.
Every figure is computed from documents and ledger rows, not from the application's profit report.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import flt

from trader_app.scripts import falcon_demo_spec as S

PROJECT_OF_CUSTOMER = {"indus": "A", "lakeside": "C", "bayview": "B"}


def _customer_name(key):
    return frappe.db.get_value("Customer", {"customer_name": S.CUSTOMERS[key]["name"]}, "name")


def profitability():
    frappe.set_user("Administrator")
    co = S.COMPANY
    by_project = {p: {"revenue": 0.0, "product_cost": 0.0, "subcontract_cost": 0.0, "freight_cost": 0.0,
                      "open_commitments": 0.0} for p in ("A", "B", "C")}

    # Revenue: net of submitted, non-return sales invoices.
    for key, project in PROJECT_OF_CUSTOMER.items():
        cust = _customer_name(key)
        net = frappe.db.sql("""select coalesce(sum(net_total), 0) from `tabSales Invoice`
            where company = %s and customer = %s and docstatus = 1 and is_return = 0""", (co, cust))[0][0]
        by_project[project]["revenue"] += flt(net)

    # Product cost: stock outflow from deliveries, net of returned goods, by customer of the delivery.
    for key, project in PROJECT_OF_CUSTOMER.items():
        cust = _customer_name(key)
        outflow = frappe.db.sql("""select coalesce(sum(sle.stock_value_difference), 0)
            from `tabStock Ledger Entry` sle join `tabDelivery Note` dn on dn.name = sle.voucher_no
            where sle.company = %s and sle.is_cancelled = 0 and sle.voucher_type = 'Delivery Note'
            and dn.customer = %s and dn.docstatus = 1""", (co, cust))[0][0]
        by_project[project]["product_cost"] += -flt(outflow)

    # Subcontract and freight bills that the posting placed in cost of goods sold (direct project costs).
    rows = frappe.db.sql("""select pii.item_code, pii.base_net_amount
        from `tabPurchase Invoice Item` pii join `tabPurchase Invoice` pi on pi.name = pii.parent
        where pi.company = %s and pi.docstatus = 1 and pii.expense_account = %s""",
                         (co, "Cost of Goods Sold - " + S.COMPANY_ABBR), as_dict=True)
    for row in rows:
        if row.item_code == "SVC-SUBC":
            by_project["A"]["subcontract_cost"] += flt(row.base_net_amount)
        elif row.item_code == "EXP-FRT":
            by_project["A"]["freight_cost"] += flt(row.base_net_amount)

    # Open purchase commitments: goods not yet received and services not yet billed, on draft or submitted orders that
    # are still open. A draft is a commitment that the reports do not show (G-PROC-03).
    open_lines = frappe.db.sql("""select po.name, po.docstatus, poi.item_code, poi.qty, poi.received_qty, poi.rate,
        poi.amount, coalesce(poi.billed_amt, 0) billed_amt, poi.sales_order, it.is_stock_item
        from `tabPurchase Order` po join `tabPurchase Order Item` poi on poi.parent = po.name
        join `tabItem` it on it.name = poi.item_code
        where po.company = %s and po.docstatus in (0, 1) and po.status not in ('Completed', 'Closed', 'Cancelled')""",
                               (co,), as_dict=True)
    commitments, orphans = [], []
    for r in open_lines:
        if r.is_stock_item:
            open_value = max(flt(r.qty) - flt(r.received_qty), 0) * flt(r.rate)
        else:
            open_value = max(flt(r.amount) - flt(r.billed_amt), 0)
        if open_value <= 0.005:
            continue
        commitments.append({"purchase_order": r.name, "item": r.item_code, "docstatus": r.docstatus,
                            "open_value": round(open_value, 2)})
        # A submitted purchase line with no sales order link cannot be traced to a customer order (EX3, G-EXC-01).
        if r.docstatus == 1 and not r.sales_order:
            orphans.append({"purchase_order": r.name, "item": r.item_code, "open_value": round(open_value, 2)})
    # Subcontracted labour belongs to project C; the spare-parts commitment has no project in the run.
    by_project["C"]["open_commitments"] = sum(c["open_value"] for c in commitments if c["item"] == "SVC-SUBC")
    total_open = sum(c["open_value"] for c in commitments)
    orphan_total = sum(o["open_value"] for o in orphans)

    # Overheads: the rent account, allocated by invoiced net revenue.
    rent = flt(frappe.db.sql("""select coalesce(sum(debit) - sum(credit), 0) from `tabGL Entry`
        where company = %s and account = %s and is_cancelled = 0""", (co, "Rent - " + S.COMPANY_ABBR))[0][0])
    total_revenue = sum(p["revenue"] for p in by_project.values())
    for p in by_project.values():
        share = flt(p["revenue"]) / total_revenue if total_revenue else 0.0
        p["overhead_share"] = round(share, 6)
        p["overhead_allocated"] = round(rent * share, 2)

    for name, p in by_project.items():
        direct = p["product_cost"] + p["subcontract_cost"] + p["freight_cost"]
        p["direct_cost"] = round(direct, 2)
        p["gross_margin"] = round(p["revenue"] - direct, 2)
        p["net_after_overhead"] = round(p["gross_margin"] - p["overhead_allocated"], 2)
        p["net_after_commitments"] = round(p["net_after_overhead"] - p["open_commitments"], 2)
        for key in ("revenue", "product_cost", "subcontract_cost", "freight_cost", "open_commitments"):
            p[key] = round(p[key], 2)

    round_off = flt(frappe.db.sql("""select coalesce(sum(debit) - sum(credit), 0) from `tabGL Entry`
        where company = %s and account = %s and is_cancelled = 0""", (co, "Round Off - " + S.COMPANY_ABBR))[0][0])
    ledger_profit = flt(frappe.db.sql("""select coalesce(sum(case when a.root_type = 'Income' then g.credit - g.debit
        else 0 end), 0) - coalesce(sum(case when a.root_type = 'Expense' then g.debit - g.credit else 0 end), 0)
        from `tabGL Entry` g join `tabAccount` a on a.name = g.account
        where g.company = %s and g.is_cancelled = 0""", (co,))[0][0])
    allocated_profit = round(sum(p["net_after_overhead"] for p in by_project.values()), 2)
    return json.loads(json.dumps({
        "projects": by_project,
        "open_purchase_commitments": commitments,
        "open_purchase_commitments_total": round(total_open, 2),
        "orphan_open_purchase_lines": orphans,
        "orphan_open_total": round(orphan_total, 2),
        "rent_booked": round(rent, 2),
        "net_profit_ledger": round(ledger_profit, 2),
        "net_profit_allocated": allocated_profit,
        "round_off_booked": round(round_off, 2),
        "difference": round(ledger_profit - allocated_profit, 2),
    }, default=str))
