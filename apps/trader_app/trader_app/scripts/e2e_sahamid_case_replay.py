# -*- coding: utf-8 -*-
"""Replay of the legacy sahamid case MT-2595-2022-02-21--030817 on Traders.

The case belonged to salesman Muhammad Bilal (Electrence). Figures come from the sahamid snapshot
(`sahamid_data.sql`, dated 2026-07-07): quotation 42215 (14 option-0 lines, 1 alternative),
Order Confirmations 13786 (PO 4500075386) and 13789 (PO 4500075421), and seven challans.

Sales steps run as the salesman. Purchasing and goods receipt run as Administrator (the same
rule the back-to-back flow uses: sales users hold no purchase role). Each step records its own
result, so a failing step does not hide the rest.

Disposable sites only: it creates real documents.

    bench --site <site> execute trader_app.scripts.e2e_sahamid_case_replay.run

Returns ``{"checks": [...], "passed": n, "failed": m}``.
"""

from __future__ import unicode_literals

import json
import traceback

import frappe
from frappe.utils import add_days, flt, getdate

CUSTOMER_NAME = "Bulleh Shah Packaging (Private) Limited"
SALESMAN = "bilal@electrence.com"
SUPPLIER_NAME = "Electrence Test Supplier"
CASE_REF = "MT-2595-2022-02-21--030817"
PO_386 = "4500075386"
PO_421 = "4500075421"
LEGACY_DELIVERED = {PO_386: 120406, PO_421: 134939}  # legacy delivered net per PO (mapping §3)
# Purchase cost is not in the snapshot. Stock is bought at 80 % of the quoted net (assumption).
COST_FACTOR = 0.8

# (line, option, legacy stkcode, description, list price, net price per line)
QUOTE = [
    (0, 0, "1011DSTBOXKV9112", "Junction box KV 9112 (Hensel-Germany)", 30406, 15050),
    (1, 0, "1011DSTBOXKV9106", "Junction box KV 9106 (Hensel-Germany)", 17014, 8507),
    (2, 0, "1071SMPSml30102", "Switch power supply ML30.102 10-12VDC 2.5A (Puls)", 68474, 37660),
    (3, 0, "1071SMPSml50102", "Switch power supply ML50.102 12-15VDC 3.4-4.2A (Puls)", 83748, 46061),
    (4, 0, "1001RIPS194784", "Inductive proximity sensor NBB20-U1-A2 (Pepperl+Fuchs)", 48207, 26510),
    (5, 0, "1001CIPS085567", "Inductive sensor NBB5-18GM60-A2-V1 (Pepperl+Fuchs)", 18500, 10175),
    (6, 0, "1001CIPS800735", "Inductive sensor NBB4-12GM50-E2-V1 (Pepperl+Fuchs)", 14000, 7700),
    (7, 0, "1001CIPS800734", "Inductive sensor NBB4-12GM50-E2 (Pepperl+Fuchs)", 14000, 7700),
    (8, 0, "3221SPLCON221-612", "Splicing connector 2 way 221-612 (Wago)", 291, 100),
    (9, 0, "1001MIPS264855", "Inductive sensor NBN4-F25K-E8 (Pepperl+Fuchs)", 105056, 57780),
    (10, 0, "1001RDMPES183068", "Diffuse mode sensor RLK31-8-1200-RT/31/115 (Pepperl+Fuchs)", 30750, 16910),
    (11, 0, "1001RDMPES183068", "Diffuse mode sensor RLK31-8-1200-RT/31/115 (Pepperl+Fuchs)", 30750, 16910),
    (12, 0, "1011ACHENKF0600B", "Junction box KF 0600 B (Hensel-Germany)", 8901, 4782),
    (13, 0, "1011ACHENKF0400B", "Junction box KF 0400 B (Hensel-Germany)", 5375, 3225),
    (13, 1, "1011ACHENKF0600B", "Junction box KF 0600 B (Hensel-Germany), alternative", 8901, 4782),
]

# Items that are not on the quotation but were delivered in the legacy case: stkcode -> (name, net).
EXTRA_ITEMS = {
    "3221SPLCON221-412": ("Splicing connector 2 way 221-412 (Wago), substitute", 100),
    "1011ACHENKF0600B": ("Junction box KF 0600 B (Hensel-Germany), second unit", 4782),
}

# Legacy order confirmations: the accepted quote lines (0-based) each PO covers.
OC_LINES = {
    PO_386: [2, 3, 4, 5],
    PO_421: [0, 1, 6, 7, 8, 9, 10, 11, 12, 13],
}
PO_VALUE = {PO_386: 120406, PO_421: 138664}  # option-0 net of each PO's lines

# Legacy challans. ``lines`` are the 1-based quote line numbers a challan covers (the Traders line
# numbers). ``extra`` rows are not on the OC and are added by hand. ``refused`` marks the challan
# whose second unit exceeds the OC quantity: the outcome is recorded, not forced.
CHALLANS = [
    {"no": "71423", "date": "2022-03-15", "po": PO_386, "lines": [3, 5, 6], "extra": []},
    {"no": "71427", "date": "2022-03-15", "po": PO_421, "lines": [1, 7, 8, 13],
     "extra": [("3221SPLCON221-412", 1)]},
    {"no": "71436", "date": "2022-03-16", "po": PO_421, "lines": [11], "extra": []},
    {"no": "71590", "date": "2022-03-30", "po": PO_421, "lines": [13],
     "extra": [("1011ACHENKF0600B", 1)], "refused": True},
    {"no": "72390", "date": "2022-07-05", "po": PO_421, "lines": [10, 12], "extra": []},
    {"no": "72646", "date": "2022-08-04", "po": PO_386, "lines": [4], "extra": []},
    {"no": "72685", "date": "2022-08-06", "po": PO_421, "lines": [14], "extra": []},
]

COMMENTS = [
    "PENDING ML50.102 1 PC",
    "Pending material PO 4500075421",
    "Material delivered",
]


def item_code(stkcode):
    return "LG-" + stkcode


def build_rows():
    """Commercial option rows for the quotation (one row per quote line and option)."""
    rows = []
    for line, option, code, desc, list_price, net in QUOTE:
        discount = round(100.0 * (1 - float(net) / float(list_price)), 4)
        rows.append(
            {
                "line_no": line + 1,
                "client_requirements": desc,
                "option_no": option + 1,
                "option_text": desc,
                "package_qty": 1,
                "stock_status": "Ex-Stock (Subject to Prior Sale)",
                "items": [
                    {
                        "item_code": item_code(code),
                        "description": desc,
                        "unit_qty": 1,
                        "unit_price": list_price,
                        "discount_percent": discount,
                    }
                ],
            }
        )
    return rows


def ensure_items():
    group = frappe.db.get_value("Item Group", {"is_group": 0}, "name") or "All Item Groups"
    catalogue = {}
    for line, option, code, desc, list_price, net in QUOTE:
        catalogue.setdefault(code, (desc, net))
    for code, (desc, net) in EXTRA_ITEMS.items():
        catalogue.setdefault(code, (desc, net))
    for code, (desc, net) in catalogue.items():
        name = item_code(code)
        if frappe.db.exists("Item", name):
            continue
        frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": name,
                "item_name": desc[:140],
                "description": desc,
                "item_group": group,
                "stock_uom": "Nos",
                "is_stock_item": 1,
                "standard_rate": net,
                "valuation_rate": round(net * COST_FACTOR, 2),
            }
        ).insert(ignore_permissions=True)


def ensure_customer(company):
    name = frappe.db.get_value("Customer", {"customer_name": CUSTOMER_NAME}, "name")
    if not name:
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
    # Legacy terms: 100 % after 45 days. The case is priced and billed in PKR.
    frappe.db.set_value("Customer", name, {"trader_payment_expected_days": 45, "default_currency": "PKR"})
    return name


def ensure_price_list():
    name = "Standard Selling"
    if not frappe.db.exists("Price List", name):
        frappe.get_doc(
            {"doctype": "Price List", "price_list_name": name, "selling": 1, "buying": 0, "enabled": 1, "currency": "PKR"}
        ).insert(ignore_permissions=True)
    frappe.db.set_single_value("Selling Settings", "selling_price_list", name)
    return name


def ensure_supplier():
    if not frappe.db.exists("Supplier", SUPPLIER_NAME):
        frappe.get_doc(
            {
                "doctype": "Supplier",
                "supplier_name": SUPPLIER_NAME,
                "supplier_group": frappe.db.get_single_value("Buying Settings", "supplier_group")
                or frappe.db.get_value("Supplier Group", {"is_group": 0}, "name"),
                "supplier_type": "Company",
            }
        ).insert(ignore_permissions=True)
    return SUPPLIER_NAME


def run(company=None, run_tag=None):
    from trader_app.api import gate_pass
    from trader_app.api import opportunity as opp
    from trader_app.api.back_to_back import create_purchase_order_for_order
    from trader_app.api.opportunity import _default_warehouse
    from trader_app.scripts.e2e_enquiry_to_cash import (
        _account,
        _ensure_fiscal_year,
        _ensure_tax_policy,
    )
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    company = company or frappe.db.get_value("Company", {"company_name": "Electrence"}, "name")
    if not company:
        frappe.throw("Company Electrence is not on this site. Create it before the replay.")
    checks = []
    state = {}

    def check(label, ok, detail=""):
        checks.append({"check": label, "pass": bool(ok), "detail": str(detail)[:500]})
        return ok

    def step(label, fn):
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 - a failing step must not hide the rest
            frappe.db.rollback()
            # The last app frames show where the step failed, so a defect can be traced to its code.
            where = [line.strip() for line in traceback.format_exc().splitlines()
                     if "trader_app/" in line or "erpnext/" in line][-3:]
            checks.append({"check": label, "pass": False,
                           "detail": "{0}: {1} | {2}".format(type(exc).__name__, str(exc)[:300], " ; ".join(where))})
            return False
        return True

    # ── 0. Master data and packs ─────────────────────────────────────
    _ensure_fiscal_year(getdate("2022-01-01"), getdate("2022-12-31"))
    ensure_items()
    template, _tax_account = _ensure_tax_policy(company, getdate("2022-01-01"))
    write_off = (
        _account(company, root_type="Expense", account_type="Round Off")
        or _account(company, root_type="Expense", account_name="Write Off")
        or _account(company, root_type="Expense")
    )
    from trader_app.api.migration_toolkit import provision_ar_pack, provision_opportunity_pack

    provision_opportunity_pack(company=company, template="electrence", activate=1)
    provision_ar_pack(company=company, template="electrence", activate=1)
    ar_profile = frappe.db.get_value("Trader AR Profile", {"company": company, "is_active": 1}, "name")
    frappe.db.set_value(
        "Trader AR Profile",
        ar_profile,
        {"write_off_account": write_off, "settle_tolerance": 5, "withhold_reporting_enabled": 0},
    )
    ensure_price_list()
    customer = ensure_customer(company)
    supplier = ensure_supplier()
    warehouse = _default_warehouse(company)
    frappe.db.commit()
    costs = {item_code(code): round(net * COST_FACTOR, 2) for _l, _o, code, _d, _lp, net in QUOTE}
    costs.update({item_code(code): round(net * COST_FACTOR, 2) for code, (_d, net) in EXTRA_ITEMS.items()})
    net_by_code = {item_code(code): net for code, (_d, net) in EXTRA_ITEMS.items()}

    # ── 1. Case opened by the salesman ───────────────────────────────
    frappe.set_user(SALESMAN)

    def open_case():
        hub = opp.create_opportunity(
            data={
                "title": "Hensel boxes, P+F sensors, splicing connector (RFQ 6-109215)",
                "customer": customer,
                "enquiry_date": "2022-02-21",
                "enquiry_value": sum(q[4] for q in QUOTE if q[1] == 0),
                "priority": "Normal",  # legacy "medium"
                "description": "Legacy case " + CASE_REF,
            },
            company=company,
        )
        state["opp"] = hub["opportunity"]["name"]
        for text in COMMENTS:
            opp.add_opportunity_comment(state["opp"], text, company=company)
        frappe.db.commit()

    step("case opened and comments recorded", open_case)
    if "opp" not in state:
        return _finish(checks)

    # ── 2. Quotation with 14 option-0 lines and one alternative ──────
    def quote():
        created = opp.create_quotation_for_opportunity(
            state["opp"],
            data={
                "transaction_date": "2022-02-21",
                "valid_till": add_days("2022-02-21", 15),
                "order_details": {"validity_days": 15, "pay_advance_pct": 0, "pay_delivery_pct": 100, "gst_mode": "exclusive"},
                "taxes_and_charges": template,
                "commercial_options": build_rows(),
            },
            company=company,
        )
        q = frappe.get_doc("Quotation", created["name"])
        q.submit()
        frappe.db.commit()
        state["quote"] = q.name
        q.reload()
        net = sum(flt(item.amount) for item in q.items if flt(item.qty) and item.item_code)
        expected = sum(row[5] for row in QUOTE if row[1] == 0)
        check("quotation option-0 net = legacy 259,070", abs(net - expected) < 5, "net={0} expected={1}".format(net, expected))
        check("quotation carries 15 options (14 lines + 1 alternative)",
              len(q.trader_commercial_options) == len(QUOTE), str(len(q.trader_commercial_options)))

    step("quotation with options submitted", quote)
    if "quote" not in state:
        return _finish(checks)

    # ── 3. Customer POs registered on the case ───────────────────────
    def register_pos():
        opp.add_customer_po(state["opp"], data={"customer_po_no": PO_386, "po_date": "2022-03-14", "po_amount": PO_VALUE[PO_386]}, company=company)
        opp.add_customer_po(state["opp"], data={"customer_po_no": PO_421, "po_date": "2022-03-14", "po_amount": PO_VALUE[PO_421]}, company=company)
        frappe.db.commit()

    step("two customer POs registered", register_pos)

    # ── 4. One order confirmation per customer PO ────────────────────
    def oc_for(po_no, lines):
        def fn():
            selected = {str(line + 1): option + 1 for line, option, *_ in QUOTE if line in lines and option == 0}
            oc = opp.create_order_confirmation(
                state["opp"],
                source_quotation=state["quote"],
                customer_po_no=po_no,
                company=company,
                selected_options=json.dumps(selected),
                lines=json.dumps([line + 1 for line in lines]),
            )
            so = frappe.get_doc("Sales Order", oc["name"])
            so.transaction_date = "2022-03-14"
            so.delivery_date = "2022-03-31"
            for row in so.items:
                row.delivery_date = so.delivery_date
            so.save()
            so.submit()
            frappe.db.commit()
            state.setdefault("so", {})[po_no] = so.name
            ordered = sorted(r.item_code for r in so.items)
            wanted = sorted(item_code(q[2]) for q in QUOTE if q[0] in lines and q[1] == 0)
            check("OC for PO {0} carries only its own lines".format(po_no), ordered == wanted,
                  "{0} lines: {1}".format(len(ordered), ",".join(ordered)[:300]))
            check("OC for PO {0} net = {1:,}".format(po_no, PO_VALUE[po_no]),
                  abs(flt(so.net_total) - PO_VALUE[po_no]) < 5, "net={0}".format(so.net_total))
        return fn

    step("OC for PO {0}".format(PO_386), oc_for(PO_386, OC_LINES[PO_386]))
    step("OC for PO {0}".format(PO_421), oc_for(PO_421, OC_LINES[PO_421]))

    # ── 5. Buy the shortfall against each OC, then receive it (Administrator) ──
    def buy(po_no):
        def fn():
            frappe.set_user("Administrator")
            res = create_purchase_order_for_order(
                state["so"][po_no], supplier, json.dumps(costs), transaction_date="2022-03-14"
            )
            frappe.db.commit()
            state.setdefault("buy", {})[po_no] = res["name"]
            check("purchase order for the shortfall of PO {0}".format(po_no), res["lines"] == len(OC_LINES[po_no]),
                  "{0} ({1} lines)".format(res["name"], res["lines"]))
        return fn

    def receive(po_name, label):
        def fn():
            frappe.set_user("Administrator")
            from erpnext.buying.doctype.purchase_order.purchase_order import make_purchase_receipt

            pr = make_purchase_receipt(po_name)
            pr.posting_date = "2022-03-14"
            pr.set_posting_time = 1
            pr.posting_time = "00:00:01"
            pr.insert(ignore_permissions=True)
            pr.submit()
            frappe.db.commit()
            state.setdefault("receipt", {})[label] = pr.name
            check("goods received on {0}".format(label), pr.docstatus == 1, "{0} against {1}".format(pr.name, po_name))
        return fn

    def buy_extras():
        frappe.set_user("Administrator")
        po = frappe.new_doc("Purchase Order")
        po.company = company
        po.supplier = supplier
        po.transaction_date = "2022-03-14"
        po.schedule_date = "2022-03-14"
        for code, _desc in ((code, None) for code in EXTRA_ITEMS):
            po.append("items", {"item_code": item_code(code), "qty": 1, "rate": costs[item_code(code)],
                                "warehouse": warehouse, "schedule_date": "2022-03-14"})
        po.insert(ignore_permissions=True)
        po.submit()
        frappe.db.commit()
        state["extra_po"] = po.name
        check("purchase order for the substitute and the second unit", po.docstatus == 1, po.name)

    step("buy for PO {0}".format(PO_386), buy(PO_386))
    step("buy for PO {0}".format(PO_421), buy(PO_421))
    step("receive PO {0}".format(PO_386), lambda: receive(state.get("buy", {}).get(PO_386), "PO " + PO_386)())
    step("receive PO {0}".format(PO_421), lambda: receive(state.get("buy", {}).get(PO_421), "PO " + PO_421)())
    step("purchase for the substitute and second unit", buy_extras)
    step("receive substitute and second unit", lambda: receive(state.get("extra_po"), "extras")())

    # ── 6. Challans: each covers its lines, the extra rows are added by hand ──
    def make_challan(spec):
        def fn():
            frappe.set_user(SALESMAN)
            label = "challan {0}".format(spec["no"])
            try:
                dn = opp.create_delivery_note_for_opportunity(
                    state["opp"], source_oc=state["so"][spec["po"]], company=company, lines=spec["lines"]
                )
                doc = frappe.get_doc("Delivery Note", dn["name"])
                for code, qty in spec["extra"]:
                    doc.append("items", {"item_code": item_code(code), "qty": qty,
                                         "rate": net_by_code[item_code(code)], "warehouse": warehouse})
                doc.posting_date = spec["date"]
                doc.set_posting_time = 1
                doc.save()
                doc.submit()
                frappe.db.commit()
            except Exception as exc:  # noqa: BLE001
                frappe.db.rollback()
                if spec.get("refused"):
                    check("{0}: second unit beyond the OC quantity is refused".format(label), True, str(exc)[:300])
                    return
                raise
            if spec.get("refused"):
                check("{0}: second unit beyond the OC quantity is refused".format(label), False,
                      "accepted as {0}".format(doc.name))
                return
            state.setdefault("dn", {})[spec["no"]] = doc.name
            check("{0} submitted for PO {1}".format(label, spec["po"]), doc.docstatus == 1,
                  "{0} net {1}".format(doc.name, doc.net_total))
            try:
                gate_pass.create_gate_pass(doc.name, vehicle_no="LHR-2281", driver_name="Imran",
                                           received_by="Store keeper, Bulleh Shah", pass_date=spec["date"])
                frappe.db.commit()
            except Exception as exc:  # noqa: BLE001
                frappe.db.rollback()
                check("{0} gate pass".format(label), False, str(exc)[:200])
        return fn

    for spec in CHALLANS:
        step("challan {0}".format(spec["no"]), make_challan(spec))

    # ── 7. One invoice per challan ───────────────────────────────────
    def invoice(no, date):
        def fn():
            from trader_app.api import opportunity as opp_api

            frappe.set_user(SALESMAN)
            dn = state["dn"][no]
            inv = opp_api.create_invoice_for_opportunity(state["opp"], delivery_notes=[dn], posting_date=date,
                                                         auto_submit=1, company=company)["name"]
            si = frappe.get_doc("Sales Invoice", inv)
            dn_doc = frappe.get_doc("Delivery Note", dn)
            check("invoice {0} for challan {1} matches the challan net".format(inv, no),
                  abs(flt(si.net_total) - flt(dn_doc.net_total)) < 0.5,
                  "invoice net={0} challan net={1}".format(si.net_total, dn_doc.net_total))
            frappe.db.commit()
            state.setdefault("inv", {})[no] = inv
        return fn

    for spec in CHALLANS:
        if spec["no"] in state.get("dn", {}):
            step("invoice for challan {0}".format(spec["no"]), invoice(spec["no"], spec["date"]))

    # ── 8. Reconcile delivered value per PO with the legacy figures ──
    def reconcile():
        for po_no in (PO_386, PO_421):
            delivered = sum(
                flt(frappe.db.get_value("Delivery Note", dn, "net_total"))
                for spec in CHALLANS
                if spec["po"] == po_no and (dn := state.get("dn", {}).get(spec["no"]))
            )
            legacy = LEGACY_DELIVERED[po_no]
            check("delivered net for PO {0} vs legacy {1:,}".format(po_no, legacy), abs(delivered - legacy) < 5,
                  "traders={0:,.2f} legacy={1:,} diff={2:,.2f}".format(delivered, legacy, delivered - legacy))

    step("reconcile delivered value per PO", reconcile)

    # ── 9. Close the case: a reason is required while lines are open ──
    def close_without_reason():
        frappe.set_user(SALESMAN)
        try:
            opp.close_opportunity(state["opp"], "Delivery", company=company)
        except Exception as exc:  # noqa: BLE001
            check("close without a reason refused while lines are open", True, str(exc)[:200])
            return
        check("close without a reason refused while lines are open", False, "closed without a reason")

    def close_with_reason():
        frappe.set_user(SALESMAN)
        opp.close_opportunity(state["opp"], "Delivery", company=company, close_reason="Case Closed")
        frappe.db.commit()
        status = frappe.db.get_value("Trader Opportunity", state["opp"], "status")
        check("case closed with reason 'Case Closed'", status == "Closed", "status={0}".format(status))

    step("close without a reason", close_without_reason)
    step("close with reason", close_with_reason)

    # ── 10. Stock at the end ─────────────────────────────────────────
    def stock_end():
        frappe.set_user("Administrator")
        kv9106 = frappe.db.get_value("Bin", {"item_code": item_code("1011DSTBOXKV9106"), "warehouse": warehouse}, "actual_qty") or 0
        check("KV 9106 bought for the order, not delivered: 1 left on hand", flt(kv9106) == 1, "on hand={0}".format(kv9106))
        # The substitute was delivered on 71427. The second unit was bought for challan 71590, which
        # Traders refuses, so that unit stays on hand.
        sub = frappe.db.get_value("Bin", {"item_code": item_code("3221SPLCON221-412"), "warehouse": warehouse}, "actual_qty") or 0
        check("substitute bought and delivered: nothing left", flt(sub) == 0, "on hand={0}".format(sub))
        second = frappe.db.get_value("Bin", {"item_code": item_code("1011ACHENKF0600B"), "warehouse": warehouse}, "actual_qty") or 0
        check("second unit of KF 0600 B bought for the refused challan: still on hand", flt(second) == 1,
              "on hand={0}".format(second))

    step("stock at the end", stock_end)
    frappe.set_user("Administrator")
    return _finish(checks)


def _finish(checks):
    failed = [c for c in checks if not c["pass"]]
    return {"checks": checks, "passed": len(checks) - len(failed), "failed": len(failed)}
