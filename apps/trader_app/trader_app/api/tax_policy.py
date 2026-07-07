# -*- coding: utf-8 -*-
"""Trader App — declarative tax & withholding policy engine (PRD FR-5).

Tax behavior is data, not code: `Trader Tax Policy` rows carry an effective
window plus match dimensions (goods/service, customer category, jurisdiction)
and resolve to a tax *mode* + an ERPNext tax template. There are no hardcoded
percentages in the runtime.

`Trader WHT Policy` rows resolve a withholding section + rate + account for a
party; the actual GL posting of the withheld amount is a Phase 4 concern.

Every resolution is written to the Trader Decision Log.
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import flt, getdate

from trader_app.api.decision_log import log_decision


# ────────────────────────────────────────────────────────────────
# Tax policy resolution
# ────────────────────────────────────────────────────────────────

def _service_matches(policy_flag, is_service):
    if not policy_flag or policy_flag == "any" or is_service is None:
        return True
    return (policy_flag == "service") == bool(is_service)


def match_tax_policies(policies, context):
    """Pure matcher. ``policies`` is a list of dicts (already ordered by
    priority). Returns the first policy whose window + dimensions match
    ``context`` = {date, is_service, customer_category, jurisdiction}, or None."""
    on = getdate(context.get("date")) if context.get("date") else getdate()
    cust = context.get("customer_category")
    juris = context.get("jurisdiction")
    is_service = context.get("is_service")

    for p in policies:
        eff_from = getdate(p.get("effective_from")) if p.get("effective_from") else None
        eff_to = getdate(p.get("effective_to")) if p.get("effective_to") else None
        if eff_from and on < eff_from:
            continue
        if eff_to and on > eff_to:
            continue
        if not _service_matches(p.get("service_flag"), is_service):
            continue
        if p.get("customer_category") and p["customer_category"] != cust:
            continue
        if p.get("jurisdiction") and p["jurisdiction"] != juris:
            continue
        return p
    return None


def resolve_tax_policy(company, context=None, log=True):
    """Resolve the applicable tax policy for a company + context. Returns a dict
    (tax_mode, tax_template, rate, policy) or None when nothing matches."""
    context = context or {}
    policies = frappe.get_all(
        "Trader Tax Policy",
        filters={"company": company, "is_active": 1},
        fields=["name", "priority", "tax_mode", "tax_template", "rate",
                "effective_from", "effective_to", "service_flag",
                "customer_category", "jurisdiction"],
        order_by="priority asc, creation asc",
    )
    if not policies:
        return None

    match = match_tax_policies(policies, context)
    if log:
        log_decision(
            "tax", company=company,
            outcome="applied" if match else "skipped",
            message=("Tax policy {0} ({1})".format(match["name"], match["tax_mode"])
                     if match else "No tax policy matched context"),
            inputs=context,
            output=(match and {"policy": match["name"], "tax_mode": match["tax_mode"],
                               "tax_template": match["tax_template"]}) or {},
            policy=match["name"] if match else None,
        )
    if not match:
        return None
    return {
        "policy": match["name"],
        "tax_mode": match["tax_mode"],
        "tax_template": match["tax_template"],
        "rate": match["rate"],
    }


def apply_tax_policy(doc, method=None):
    """doc_events / create-path helper. When a policy resolves and the document
    has no tax template yet, stamp the resolved template so ERPNext populates
    and calculates taxes. Opt-in: a company with no active tax policy is a no-op."""
    if getattr(doc, "taxes_and_charges", None):
        return
    company = getattr(doc, "company", None)
    if not company:
        return

    context = {
        "date": getattr(doc, "posting_date", None) or getattr(doc, "transaction_date", None),
        "is_service": None,
        "customer_category": frappe.db.get_value("Customer", doc.customer, "customer_group")
        if getattr(doc, "customer", None) else None,
        "jurisdiction": None,
    }
    resolved = resolve_tax_policy(company, context)
    if not resolved:
        return

    if resolved["tax_mode"] == "none":
        return
    template = resolved["tax_template"]
    if template and frappe.db.exists("Sales Taxes and Charges Template", template):
        doc.taxes_and_charges = template
        # Mirror ERPNext "inclusive" behavior onto rows when populated later.
        doc.flags.trader_tax_inclusive = resolved["tax_mode"] == "inclusive"


# ────────────────────────────────────────────────────────────────
# Withholding tax resolution
# ────────────────────────────────────────────────────────────────

def resolve_wht(company, party_type, amount, log=True):
    """Resolve applicable WHT for a party type + amount. ``party_type`` is
    'customer' or 'supplier'. Returns a dict (section_code, rate, account,
    wht_amount, policy) or None."""
    amount = flt(amount)
    policies = frappe.get_all(
        "Trader WHT Policy",
        filters={"company": company, "is_active": 1, "applies_to": party_type},
        fields=["name", "section_code", "rate", "threshold", "account"],
        order_by="threshold desc, creation asc",
    )
    match = None
    for p in policies:
        if amount >= flt(p.get("threshold")):
            match = p
            break

    if log:
        log_decision(
            "wht", company=company,
            outcome="applied" if match else "skipped",
            message=("WHT {0} @ {1}%".format(match["section_code"], match["rate"])
                     if match else "No WHT policy matched"),
            inputs={"party_type": party_type, "amount": amount},
            output=(match and {"policy": match["name"],
                               "wht_amount": flt(amount) * flt(match["rate"]) / 100.0}) or {},
            policy=match["name"] if match else None,
        )
    if not match:
        return None
    return {
        "policy": match["name"],
        "section_code": match["section_code"],
        "rate": flt(match["rate"]),
        "account": match["account"],
        "wht_amount": flt(amount) * flt(match["rate"]) / 100.0,
    }


@frappe.whitelist()
def preview_tax(company, posting_date=None, customer=None, is_service=0):
    """SPA helper — show which tax policy would apply (no side effects, no log)."""
    from trader_app.api.company import resolve_active_company

    company = resolve_active_company(company)
    context = {
        "date": posting_date,
        "is_service": bool(int(is_service)) if str(is_service).isdigit() else None,
        "customer_category": frappe.db.get_value("Customer", customer, "customer_group") if customer else None,
        "jurisdiction": None,
    }
    return resolve_tax_policy(company, context, log=False) or {"tax_mode": None, "tax_template": None}
