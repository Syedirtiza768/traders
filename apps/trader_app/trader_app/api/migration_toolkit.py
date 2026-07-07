# -*- coding: utf-8 -*-
"""Trader App — migration toolkit (PRD Phase 5).

Turns a tenant's *existing* (scattered / hardcoded-default) behavior into the
Phase 0–4 config packs, so an established company can adopt the configurable
sales lifecycle **with parity** and opt in when ready.

Design guarantees:
  * **Non-destructive & idempotent** — packs are only created when absent.
  * **Opt-in by default** — provisioned policies are created inactive /
    non-enforcing (and posting profiles are *always* inactive) so provisioning
    never changes a live tenant's behavior until it is explicitly activated.
  * **Parity-checked** — `parity_report` compares the config packs against the
    legacy defaults they replace.
"""

from __future__ import unicode_literals

import os

import frappe
from frappe.utils import cint, getdate, nowdate

from trader_app.api.company import resolve_active_company
from trader_app.api.decision_log import log_decision


def _company_creation_date(company):
    created = frappe.db.get_value("Company", company, "creation")
    return getdate(created) if created else getdate("2020-01-01")


# ────────────────────────────────────────────────────────────────
# Provisioning
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def provision_config_packs(company=None, activate=0):
    """Create the config packs that mirror this company's current defaults."""
    company = resolve_active_company(company)
    activate = cint(activate)
    created = {}

    # Tax policy ← legacy default sales tax template
    if not frappe.db.exists("Trader Tax Policy", {"company": company}):
        from trader_app.api.invoice_types import _default_sales_tax_template

        template = _default_sales_tax_template(company)
        doc = frappe.get_doc({
            "doctype": "Trader Tax Policy",
            "policy_name": "{0} — Standard (migrated)".format(company),
            "company": company, "is_active": activate, "priority": 100,
            "tax_mode": "exclusive", "effective_from": _company_creation_date(company),
            "service_flag": "any", "tax_template": template, "rate": 18,
        }).insert(ignore_permissions=True)
        created["tax"] = doc.name

    # Grouping policy ← current default behavior (same debtor, unlimited)
    if not frappe.db.exists("Trader Grouping Policy", {"company": company}):
        doc = frappe.get_doc({
            "doctype": "Trader Grouping Policy",
            "policy_name": "{0} — Default Grouping (migrated)".format(company),
            "company": company, "is_active": activate,
            "same_debtor_required": 1, "max_docs_per_group": 0,
            "allow_partial_delivery": 1, "auto_submit_invoice": 0,
        }).insert(ignore_permissions=True)
        created["grouping"] = doc.name

    # FX policy ← only when the company already uses multi-currency
    if frappe.db.get_value("Company", company, "trader_multi_currency_enabled") \
            and not frappe.db.exists("Trader FX Policy", {"company": company}):
        doc = frappe.get_doc({
            "doctype": "Trader FX Policy",
            "policy_name": "{0} — FX Clause (migrated)".format(company),
            "company": company, "is_active": activate,
            "snapshot_trigger": "finalize", "validity_days": 7, "print_mode": "both",
        }).insert(ignore_permissions=True)
        created["fx"] = doc.name

    # Posting profile ← company default accounts (ALWAYS inactive; never auto-touch the GL)
    if not frappe.db.exists("Trader Posting Profile", {"company": company, "event": "sales_invoice"}):
        vals = frappe.db.get_value(
            "Company", company,
            ["default_receivable_account", "default_income_account", "cost_center", "round_off_account"],
            as_dict=True,
        ) or {}
        doc = frappe.get_doc({
            "doctype": "Trader Posting Profile",
            "profile_name": "{0} — Sales Posting (migrated)".format(company),
            "company": company, "is_active": 0, "event": "sales_invoice",
            "receivable_account": vals.get("default_receivable_account"),
            "income_account": vals.get("default_income_account"),
            "cost_center": vals.get("cost_center"),
            "round_off_account": vals.get("round_off_account"),
        }).insert(ignore_permissions=True)
        created["posting"] = doc.name

    # Process profile documenting the lifecycle (NOT enforced)
    if not frappe.db.exists("Trader Process Profile", {"company": company}):
        doc = frappe.get_doc({
            "doctype": "Trader Process Profile",
            "profile_name": "{0} — Sales Lifecycle (migrated)".format(company),
            "company": company, "is_active": 1, "enforce_states": 0,
            "states": [
                {"target_doctype": "Quotation", "state": "Draft", "is_initial": 1},
                {"target_doctype": "Quotation", "state": "Sent"},
                {"target_doctype": "Quotation", "state": "Accepted", "is_final": 1},
                {"target_doctype": "Delivery Note", "state": "Draft", "is_initial": 1},
                {"target_doctype": "Delivery Note", "state": "Delivered", "is_final": 1},
                {"target_doctype": "Sales Invoice", "state": "Draft", "is_initial": 1},
                {"target_doctype": "Sales Invoice", "state": "Posted", "is_final": 1},
            ],
            "transitions": [
                {"target_doctype": "Quotation", "from_state": "Draft", "to_state": "Sent"},
                {"target_doctype": "Quotation", "from_state": "Sent", "to_state": "Accepted"},
                {"target_doctype": "Delivery Note", "from_state": "Draft", "to_state": "Delivered"},
                {"target_doctype": "Sales Invoice", "from_state": "Draft", "to_state": "Posted"},
            ],
        }).insert(ignore_permissions=True)
        created["process"] = doc.name

    log_decision(
        "other", company=company, outcome="applied",
        message="Provisioned config packs ({0} created, activate={1})".format(len(created), activate),
        output=created, policy="migration_toolkit",
    )
    frappe.db.commit()
    return {"company": company, "created": created, "activated": bool(activate)}


# ────────────────────────────────────────────────────────────────
# Status & parity
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def migration_status(company=None):
    """Which config packs exist for a company, and how many are active/enforcing."""
    company = resolve_active_company(company)
    out = {}
    specs = [
        ("tax", "Trader Tax Policy", "is_active"),
        ("wht", "Trader WHT Policy", "is_active"),
        ("fx", "Trader FX Policy", "is_active"),
        ("grouping", "Trader Grouping Policy", "is_active"),
        ("posting", "Trader Posting Profile", "is_active"),
        ("process", "Trader Process Profile", "enforce_states"),
    ]
    for label, dt, flag in specs:
        rows = frappe.get_all(dt, filters={"company": company}, fields=["name", flag])
        out[label] = {"count": len(rows), "enabled": sum(1 for r in rows if r.get(flag))}
    return {"company": company, "packs": out}


@frappe.whitelist()
def parity_report(company=None):
    """Compare the migrated config packs against the legacy defaults they replace."""
    company = resolve_active_company(company)
    checks = []

    # Tax: provisioned policy's template should equal the legacy default template.
    from trader_app.api.invoice_types import _default_sales_tax_template

    legacy_template = _default_sales_tax_template(company)
    policy_template = frappe.db.get_value(
        "Trader Tax Policy", {"company": company}, "tax_template"
    )
    checks.append({
        "dimension": "tax_template",
        "legacy": legacy_template, "config": policy_template,
        "match": (legacy_template or None) == (policy_template or None),
    })

    # Grouping: legacy behavior is "same debtor required".
    same_debtor = frappe.db.get_value(
        "Trader Grouping Policy", {"company": company}, "same_debtor_required"
    )
    checks.append({
        "dimension": "grouping_same_debtor",
        "legacy": 1, "config": cint(same_debtor),
        "match": cint(same_debtor) == 1,
    })

    passed = all(c["match"] for c in checks)
    return {"company": company, "passed": passed, "checks": checks}


# ────────────────────────────────────────────────────────────────
# Deprecation aid — "no tenant logic in core" checklist (PRD §11)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def audit_hardcoded_branches():
    """Scan the API layer for company/tenant-name literals that should be config.
    A CI/dev aid for the architecture gate — returns file:line hits."""
    import re

    api_dir = os.path.join(os.path.dirname(__file__))
    pattern = re.compile(r'(company|tenant)\s*==\s*["\']', re.IGNORECASE)
    hits = []
    for fname in sorted(os.listdir(api_dir)):
        if not fname.endswith(".py") or fname.startswith("_"):
            continue
        path = os.path.join(api_dir, fname)
        try:
            with open(path, "r", encoding="utf-8") as fh:
                for i, line in enumerate(fh, 1):
                    if pattern.search(line):
                        hits.append({"file": "api/{0}".format(fname), "line": i, "code": line.strip()})
        except OSError:
            continue
    return {"clean": not hits, "hits": hits}
