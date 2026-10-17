# -*- coding: utf-8 -*-
"""Approvals before submit for discounts, purchase orders, supplier payments and non-stock bills (G-APR-01).

A draft above its limit cannot be submitted until an approver has recorded an approval for it in the decision log.
Approvers are Trader Admin and Trader Finance Manager. The approval holds the value that was approved, so a draft that
is changed afterwards to a higher value needs a fresh approval.

The limits are the demo's settings; a company sets its own. The application holds no budget per purchase line, so a
purchase order is checked against a value limit rather than a budget (08, G-APR-01).
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt

from trader_app.api.company import user_can_access_company
from trader_app.api.decision_log import log_decision

DISCOUNT_LIMIT_PERCENT = 10.0
PURCHASE_ORDER_LIMIT = 50000.0
SUPPLIER_PAYMENT_LIMIT = 25000.0
NON_STOCK_BILL_LIMIT = 50000.0
APPROVER_ROLES = ("Trader Admin", "Trader Finance Manager")
APPROVABLE = ("Quotation", "Purchase Order", "Payment Entry", "Purchase Invoice")
POLICY = "approval"
# The decision log's outcome list has no "approved"; an approval is recorded as "allow".
APPROVAL_OUTCOME = "allow"
# The quote builder keeps the discount on each commercial option's line (its rate is lowered), so the option lines
# are read as well as the flat lines.
OPTIONS_FIELD = "trader_commercial_options"


def _show(doctype, value):
    """A value as a user reads it: a percentage for a discount, otherwise an amount."""
    if doctype == "Quotation":
        return "{0:g}%".format(flt(value))
    return "{0:,.0f}".format(flt(value))


def _non_stock_total(doc):
    total = 0.0
    for row in doc.get("items") or []:
        if row.item_code and frappe.db.get_value("Item", row.item_code, "is_stock_item"):
            continue
        total += flt(row.base_net_amount or row.amount)
    return total


def _worst_discount(doc):
    """The largest discount a quotation gives: on a flat line, or on a line of any commercial option.

    An option's lines are their own rows and are not loaded with the quotation, so they are read from the database."""
    worst = max([flt(row.get("discount_percentage")) for row in doc.get("items") or []] or [0])
    for option in doc.get(OPTIONS_FIELD) or []:
        for line in frappe.get_all(
            "Trader Commercial Option Item",
            filters={"parent": option.name, "parenttype": "Trader Commercial Option"},
            fields=["discount_percent"],
        ):
            worst = max(worst, flt(line.discount_percent))
    return worst


def _breach(doctype, doc):
    """Return (value, limit, reason) when the draft is above its limit, else None."""
    if doctype == "Quotation":
        worst = _worst_discount(doc)
        if worst > DISCOUNT_LIMIT_PERCENT:
            return (worst, DISCOUNT_LIMIT_PERCENT,
                    _("a discount of {0} is above the {1} limit").format(
                        _show(doctype, worst), _show(doctype, DISCOUNT_LIMIT_PERCENT)))
    elif doctype == "Purchase Order":
        total = flt(doc.get("base_net_total") or doc.get("net_total"))
        if total > PURCHASE_ORDER_LIMIT:
            return (total, PURCHASE_ORDER_LIMIT,
                    _("the order totals {0}, above the {1} limit").format(
                        _show(doctype, total), _show(doctype, PURCHASE_ORDER_LIMIT)))
    elif doctype == "Payment Entry":
        paid = flt(doc.paid_amount)
        if doc.payment_type == "Pay" and doc.party_type == "Supplier" and paid > SUPPLIER_PAYMENT_LIMIT:
            return (paid, SUPPLIER_PAYMENT_LIMIT,
                    _("a supplier payment of {0} is above the {1} limit").format(
                        _show(doctype, paid), _show(doctype, SUPPLIER_PAYMENT_LIMIT)))
    elif doctype == "Purchase Invoice":
        non_stock = _non_stock_total(doc)
        if non_stock > NON_STOCK_BILL_LIMIT:
            return (non_stock, NON_STOCK_BILL_LIMIT,
                    _("non-stock items total {0}, above the {1} limit").format(
                        _show(doctype, non_stock), _show(doctype, NON_STOCK_BILL_LIMIT)))
    return None


def _approved_value(doctype, name):
    """The value in the latest approval recorded for this draft, or None when there is none."""
    rows = frappe.get_all(
        "Trader Decision Log",
        filters={"policy": POLICY, "outcome": APPROVAL_OUTCOME, "reference_doctype": doctype, "reference_name": name},
        fields=["output"],
        order_by="creation desc",
        limit_page_length=1,
    )
    if not rows:
        return None
    output = frappe.parse_json(rows[0].output) or {}
    return flt(output.get("approved_value"))


def _enforce(doctype, doc):
    breach = _breach(doctype, doc)
    if not breach:
        return
    value, limit, reason = breach
    approved = _approved_value(doctype, doc.name)
    if approved is None:
        frappe.throw(
            _("{0} {1} needs an approval before it is submitted: {2}. An approver records it first.").format(
                doctype, doc.name, reason)
        )
    if value > approved:
        frappe.throw(
            _("{0} {1} needs an approval again: the approval covers {2} and the draft now has {3}.").format(
                doctype, doc.name, _show(doctype, approved), _show(doctype, value))
        )


def check_quotation(doc, method=None):
    _enforce("Quotation", doc)


def check_purchase_order(doc, method=None):
    _enforce("Purchase Order", doc)


def check_payment(doc, method=None):
    _enforce("Payment Entry", doc)


def check_bill(doc, method=None):
    _enforce("Purchase Invoice", doc)


@frappe.whitelist()
def approve(doctype, name, reason):
    """Record an approval for a draft that is above its limit. Only approvers may approve, and a reason is required."""
    if frappe.session.user != "Administrator" and not set(frappe.get_roles()).intersection(APPROVER_ROLES):
        frappe.throw(_("Only a Trader Admin or a Trader Finance Manager can approve."), frappe.PermissionError)
    if doctype not in APPROVABLE:
        frappe.throw(_("Approvals apply to quotations, purchase orders, supplier payments and bills."))
    if not (reason or "").strip():
        frappe.throw(_("An approval needs a reason."))
    doc = frappe.get_doc(doctype, name)
    if doc.get("company") and not user_can_access_company(doc.company, frappe.session.user):
        frappe.throw(_("You do not have permission to approve {0}.").format(name), frappe.PermissionError)
    if doc.docstatus != 0:
        frappe.throw(_("Only a draft can be approved."))
    breach = _breach(doctype, doc)
    if not breach:
        frappe.throw(_("{0} {1} is within its limit; there is nothing to approve.").format(doctype, name))
    value, limit, _reason = breach
    record = log_decision(
        "validation",
        company=doc.get("company"),
        outcome=APPROVAL_OUTCOME,
        message=reason,
        output={"approved_by": frappe.session.user, "approved_value": value, "limit": limit},
        reference_doctype=doctype,
        reference_name=name,
        policy=POLICY,
    )
    if not record:
        frappe.throw(_("The approval could not be recorded. See the error log."))
    return {"name": name, "approved_value": value, "limit": limit, "record": record}


@frappe.whitelist()
def get_approval_status(doctype, name):
    """Whether a draft is above its limit, and whether an approver has recorded the approval for it."""
    if doctype not in APPROVABLE:
        frappe.throw(_("Approvals apply to quotations, purchase orders, supplier payments and bills."))
    doc = frappe.get_doc(doctype, name)
    doc.check_permission("read")
    breach = _breach(doctype, doc)
    approved = _approved_value(doctype, name)
    value = breach[0] if breach else None
    approved_ok = approved is not None and (value is None or value <= approved)
    return {
        "doctype": doctype,
        "name": name,
        "docstatus": doc.docstatus,
        "required": bool(breach),
        "value": value,
        "limit": breach[1] if breach else None,
        "reason": breach[2] if breach else "",
        "approved": approved_ok,
        "approved_value": approved,
        "is_approver": frappe.session.user == "Administrator" or bool(
            set(frappe.get_roles()).intersection(APPROVER_ROLES)),
    }
