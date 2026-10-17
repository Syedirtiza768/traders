# -*- coding: utf-8 -*-
"""Customer credit-limit control for quotations.

The limit is set per customer and company in ERPNext (Customer Credit Limit).

* Orders, challans and invoices: ERPNext's own check blocks submission when the limit
  is exceeded, unless the user holds the credit-controller role set in Accounts
  Settings. Nothing is added here, so the two never disagree.
* Quotations: ERPNext does not check them. Finalising a quotation over the limit is
  governed by ``credit_limit_action`` on the company's Trader AR Profile:

  * ``Warn`` (default): the quotation is finalised with a visible warning.
  * ``Block``: finalisation is refused unless the user holds an override role.

  Each warning, block and override is written to the Decision Log.

Legacy finding F-28: the old system only coloured the total red on screen.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt

from trader_app.api.decision_log import log_decision
from trader_app.api.quotation_rules import credit_limit_decision

BASE_OVERRIDE_ROLES = ("System Manager", "Accounts Manager", "Trader Admin")


def credit_limit_action(company):
    """``"Block"`` when the company's AR profile blocks, otherwise ``"Warn"``."""
    from trader_app.api.ar import get_active_ar_profile

    profile = get_active_ar_profile(company) or {}
    return "Block" if profile.get("credit_limit_action") == "Block" else "Warn"


def customer_credit_limit(customer, company):
    from erpnext.selling.doctype.customer.customer import get_credit_limit

    return flt(get_credit_limit(customer, company))


def customer_outstanding(customer, company):
    from erpnext.selling.doctype.customer.customer import get_customer_outstanding

    return flt(get_customer_outstanding(customer, company))


def user_can_override_credit():
    credit_controller = frappe.db.get_single_value("Accounts Settings", "credit_controller")
    roles = set(BASE_OVERRIDE_ROLES) | ({credit_controller} if credit_controller else set())
    return bool(roles.intersection(frappe.get_roles()))


def enforce_customer_credit(doc, method=None):
    """Warn or block when a quotation would take its customer over the credit limit.

    Hooked to ``before_submit`` of Quotation. Drafts stay editable; only finalising
    is gated.
    """
    customer = getattr(doc, "customer", None)
    company = getattr(doc, "company", None)
    if not customer or not company:
        return
    limit = customer_credit_limit(customer, company)
    if not limit:
        return

    outstanding = customer_outstanding(customer, company)
    amount = flt(getattr(doc, "grand_total", 0) or getattr(doc, "net_total", 0))
    action = credit_limit_action(company)
    can_override = user_can_override_credit()
    decision = credit_limit_decision(limit, outstanding, amount, action=action, can_override=can_override)
    if not decision["over_limit"]:
        return

    message = _(
        "{0} {1} takes {2} over the credit limit of {3} (outstanding {4} plus this {0} {5})."
    ).format(
        doc.doctype,
        doc.name or "",
        customer,
        frappe.format_value(limit, {"fieldtype": "Currency"}),
        frappe.format_value(outstanding, {"fieldtype": "Currency"}),
        frappe.format_value(amount, {"fieldtype": "Currency"}),
    )
    reference = {"reference_doctype": doc.doctype, "reference_name": doc.name, "company": company}
    if decision["block"]:
        log_decision(
            "validation",
            outcome="block",
            message=message,
            inputs={"credit_limit": limit, "outstanding": outstanding, "amount": amount},
            policy="credit_limit:Block",
            **reference,
        )
        frappe.throw(
            message + " " + _("An Accounts Manager or Trader Admin can override the block."),
            title=_("Credit limit reached"),
        )

    frappe.msgprint(message, indicator="orange", alert=True)
    log_decision(
        "validation",
        outcome="allow" if (action == "Block" and can_override) else "warn",
        message=message,
        inputs={"credit_limit": limit, "outstanding": outstanding, "amount": amount},
        policy="credit_limit:{0}".format(action),
        **reference,
    )
