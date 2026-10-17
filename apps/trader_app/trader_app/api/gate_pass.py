# -*- coding: utf-8 -*-
"""Trader App — Outward Gate Pass (walkthrough step 4, FEATURE_COVERAGE I5).

A gate pass is the *physical release* record for goods leaving the premises
against a submitted Delivery Note (challan): vehicle, driver, receiver, and the
quantities actually let out. In the legacy system the gate pass was also what
decremented stock; in ERPNext the Delivery Note already posts the stock ledger
and COGS, so a gate pass here deliberately moves **no stock and posts no GL** —
doing so would double-count.

Rule: the quantity released per item, across all non-cancelled passes for a
challan, may not exceed the challan quantity. Partial releases are allowed.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import flt, nowdate
from trader_app.api.company import (
    assert_document_company_access,
    resolve_active_company,
)
from trader_app.api.decision_log import log_decision


# ── Pure helper (unit-tested, no database) ────────────────────────


def validate_release_quantities(challan_qty, already_released, requested):
    """Return a list of human-readable violations (empty list = OK).

    ``challan_qty`` / ``already_released`` — ``{item_code: qty}``;
    ``requested`` — ``[{"item_code", "qty"}]``.
    """
    violations = []
    asked = {}
    for row in requested:
        code = row.get("item_code")
        qty = flt(row.get("qty"))
        if qty <= 0:
            violations.append(_("Quantity for {0} must be greater than zero.").format(code))
            continue
        asked[code] = asked.get(code, 0.0) + qty

    for code, qty in asked.items():
        if code not in challan_qty:
            violations.append(_("{0} is not on the delivery challan.").format(code))
            continue
        remaining = round(flt(challan_qty[code]) - flt(already_released.get(code, 0)), 6)
        if qty > remaining + 1e-9:
            violations.append(
                _("{0}: releasing {1} but only {2} remains on the challan.").format(code, qty, max(remaining, 0))
            )
    return violations


# ── Queries ───────────────────────────────────────────────────────


def get_challan_qty(delivery_note):
    out = {}
    for r in frappe.get_all("Delivery Note Item", filters={"parent": delivery_note}, fields=["item_code", "qty"]):
        out[r["item_code"]] = out.get(r["item_code"], 0.0) + flt(r["qty"])
    return out


def get_released_qty(delivery_note, exclude=None):
    rows = frappe.db.sql(
        """
        SELECT i.item_code, SUM(i.qty) AS qty
        FROM `tabTrader Gate Pass Item` i
        JOIN `tabTrader Gate Pass` p ON p.name = i.parent
        WHERE p.delivery_note = %(dn)s AND p.status = 'Issued' AND p.name != %(exclude)s
        GROUP BY i.item_code
        """,
        {"dn": delivery_note, "exclude": exclude or ""},
        as_dict=True,
    )
    return {r["item_code"]: flt(r["qty"]) for r in rows}


def _load_challan(delivery_note):
    dn = frappe.get_doc("Delivery Note", delivery_note)
    dn.check_permission("read")
    assert_document_company_access(dn.company)
    return dn


# ── API ───────────────────────────────────────────────────────────


@frappe.whitelist()
def get_dispatch_status(delivery_note):
    """Per-item challan qty, released qty and what is still inside."""
    dn = _load_challan(delivery_note)
    on_challan = get_challan_qty(dn.name)
    out = get_released_qty(dn.name)
    items = [
        {
            "item_code": code,
            "challan_qty": qty,
            "released_qty": flt(out.get(code, 0)),
            "pending_release_qty": round(max(qty - flt(out.get(code, 0)), 0.0), 6),
        }
        for code, qty in on_challan.items()
    ]
    return {
        "delivery_note": dn.name,
        "fully_released": bool(items) and all(i["pending_release_qty"] <= 0 for i in items),
        "items": items,
    }


@frappe.whitelist()
def create_gate_pass(
    delivery_note,
    items=None,
    vehicle_no=None,
    driver_name=None,
    driver_phone=None,
    received_by=None,
    remarks=None,
    pass_date=None,
):
    """Issue a gate pass. ``items`` omitted = release everything still pending."""
    dn = _load_challan(delivery_note)
    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        status = get_dispatch_status(dn.name)
        items = [
            {"item_code": i["item_code"], "qty": i["pending_release_qty"]}
            for i in status["items"]
            if i["pending_release_qty"] > 0
        ]
        if not items:
            frappe.throw(_("Everything on {0} has already been released.").format(dn.name))

    names = {
        r["item_code"]: r["item_name"]
        for r in frappe.get_all("Delivery Note Item", filters={"parent": dn.name}, fields=["item_code", "item_name"])
    }
    gp = frappe.new_doc("Trader Gate Pass")
    gp.company = dn.company
    gp.delivery_note = dn.name
    gp.pass_date = pass_date or nowdate()
    gp.status = "Issued"
    gp.vehicle_no = vehicle_no
    gp.driver_name = driver_name
    gp.driver_phone = driver_phone
    gp.received_by = received_by
    gp.remarks = remarks
    for row in items:
        gp.append(
            "items",
            {
                "item_code": row["item_code"],
                "item_name": names.get(row["item_code"]),
                "qty": flt(row.get("qty")),
            },
        )
    gp.insert()
    log_decision(
        "other",
        company=dn.company,
        outcome="applied",
        message="Gate pass {0} issued for {1}".format(gp.name, dn.name),
        output={"items": [{"item_code": r["item_code"], "qty": flt(r.get("qty"))} for r in items]},
        reference_doctype="Trader Gate Pass",
        reference_name=gp.name,
        policy="gate_pass",
    )
    return {"name": gp.name, "delivery_note": dn.name, "status": gp.status}


@frappe.whitelist()
def cancel_gate_pass(name):
    gp = frappe.get_doc("Trader Gate Pass", name)
    gp.check_permission("write")
    assert_document_company_access(gp.company)
    gp.status = "Cancelled"
    gp.save()
    return {"name": gp.name, "status": gp.status}


@frappe.whitelist()
def list_gate_passes(company=None, delivery_note=None, opportunity=None, status=None):
    company = resolve_active_company(company)
    filters = {"company": company}
    if delivery_note:
        filters["delivery_note"] = delivery_note
    if opportunity:
        filters["opportunity"] = opportunity
    if status:
        filters["status"] = status
    return frappe.get_list(
        "Trader Gate Pass",
        filters=filters,
        fields=[
            "name",
            "delivery_note",
            "customer",
            "opportunity",
            "pass_date",
            "status",
            "vehicle_no",
            "driver_name",
            "received_by",
        ],
        order_by="pass_date desc, name desc",
    )


@frappe.whitelist()
def create_inward_gate_pass(
    purchase_receipt,
    vehicle_no=None,
    driver_name=None,
    driver_phone=None,
    received_by=None,
    remarks=None,
    pass_date=None,
):
    """Record the arrival of goods against a submitted Purchase Receipt (inward gate pass).

    The receipt has already posted stock and the goods-received liability, so the
    pass records the physical arrival only and moves no stock.
    """
    receipt = frappe.get_doc("Purchase Receipt", purchase_receipt)
    receipt.check_permission("read")
    assert_document_company_access(receipt.company)
    if receipt.docstatus != 1:
        frappe.throw(_("Only a submitted Purchase Receipt can have an inward gate pass."))

    gp = frappe.new_doc("Trader Inward Gate Pass")
    gp.purchase_receipt = receipt.name
    gp.pass_date = pass_date or nowdate()
    gp.status = "Issued"
    gp.vehicle_no = vehicle_no
    gp.driver_name = driver_name
    gp.driver_phone = driver_phone
    gp.received_by = received_by
    gp.remarks = remarks
    gp.insert()
    log_decision(
        "other",
        company=receipt.company,
        outcome="applied",
        message="Inward gate pass {0} recorded for {1}".format(gp.name, receipt.name),
        reference_doctype="Trader Inward Gate Pass",
        reference_name=gp.name,
        policy="inward_gate_pass",
    )
    return {"name": gp.name, "purchase_receipt": receipt.name, "status": gp.status}


@frappe.whitelist()
def cancel_inward_gate_pass(name):
    gp = frappe.get_doc("Trader Inward Gate Pass", name)
    gp.check_permission("write")
    assert_document_company_access(gp.company)
    if gp.status == "Cancelled":
        return {"name": gp.name, "status": gp.status}
    gp.status = "Cancelled"
    gp.save()
    return {"name": gp.name, "status": gp.status}


@frappe.whitelist()
def list_inward_gate_passes(company=None, purchase_receipt=None, status=None):
    filters = {}
    if company:
        filters["company"] = company
    if purchase_receipt:
        filters["purchase_receipt"] = purchase_receipt
    if status:
        filters["status"] = status
    return frappe.get_list(
        "Trader Inward Gate Pass",
        filters=filters,
        fields=["name", "purchase_receipt", "supplier", "company", "pass_date", "status", "vehicle_no", "driver_name", "received_by"],
        order_by="pass_date desc, modified desc",
    )


from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "sales")
