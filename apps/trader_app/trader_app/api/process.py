# -*- coding: utf-8 -*-
"""Trader App — opt-in sales lifecycle state guard (PRD FR-2).

Unlike a native ERPNext Workflow (which attaches to a doctype globally and would
change behavior for every tenant), this guard is driven by a company-scoped
**Trader Process Profile** and only acts when that profile has both
``is_active`` and ``enforce_states`` set. Companies without an enforcing profile
are completely unaffected — the ``trader_workflow_state`` custom field simply
stays blank.

Responsibilities:
  * stamp the configured initial state on new documents (on validate)
  * gate state changes through ``transition_state`` (allowed transition + role)
  * log every state decision to the Trader Decision Log
"""

from __future__ import unicode_literals

import frappe
from frappe import _

from trader_app.api.decision_log import log_decision

STATE_FIELD = "trader_workflow_state"


def get_active_profile(company):
    """Return the enforcing process profile for a company, or None."""
    if not company:
        return None
    name = frappe.db.get_value(
        "Trader Process Profile",
        {"company": company, "is_active": 1, "enforce_states": 1},
        "name",
    )
    return frappe.get_cached_doc("Trader Process Profile", name) if name else None


def _initial_state(profile, doctype):
    for row in profile.states:
        if row.target_doctype == doctype and row.is_initial:
            return row.state
    return None


def find_transition(profile, doctype, from_state, to_state):
    """Return the configured transition row for a move, or None if not allowed."""
    for row in profile.transitions:
        if row.target_doctype == doctype and row.from_state == from_state and row.to_state == to_state:
            return row
    return None


def _has_state_field(doc):
    return frappe.get_meta(doc.doctype).has_field(STATE_FIELD)


def apply_initial_state(doc, method=None):
    """doc_events validate handler — stamp the initial state when enforcing."""
    if not _has_state_field(doc) or getattr(doc, STATE_FIELD, None):
        return
    profile = get_active_profile(getattr(doc, "company", None))
    if not profile:
        return
    init = _initial_state(profile, doc.doctype)
    if not init:
        return
    doc.set(STATE_FIELD, init)
    log_decision(
        "state", company=doc.company, outcome="applied",
        message="Initial state set to {0}".format(init),
        reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
        output={"state": init}, policy=profile.name,
    )


@frappe.whitelist()
def transition_state(doctype, name, to_state):
    """Move a document to ``to_state`` if the transition is configured and permitted."""
    from trader_app.api.company import assert_document_company_access

    doc = frappe.get_doc(doctype, name)
    company = getattr(doc, "company", None)
    assert_document_company_access(company)
    profile = get_active_profile(company)
    if not profile:
        frappe.throw(_("No active state model is enforced for this company."))

    current = getattr(doc, STATE_FIELD, None) or _initial_state(profile, doctype)

    match = find_transition(profile, doctype, current, to_state)

    if not match:
        log_decision(
            "state", company=company, outcome="block",
            message="Transition {0} -> {1} is not allowed".format(current, to_state),
            reference_doctype=doctype, reference_name=name,
            inputs={"from": current, "to": to_state}, policy=profile.name,
        )
        frappe.throw(_("Transition from {0} to {1} is not allowed.").format(current, to_state))

    if match.required_role and match.required_role not in frappe.get_roles():
        log_decision(
            "state", company=company, outcome="block",
            message="Missing role {0} for transition {1} -> {2}".format(
                match.required_role, current, to_state),
            reference_doctype=doctype, reference_name=name, policy=profile.name,
        )
        frappe.throw(
            _("You need the {0} role to move this document to {1}.").format(
                match.required_role, to_state)
        )

    doc.set(STATE_FIELD, to_state)
    doc.save(ignore_permissions=False)
    log_decision(
        "state", company=company, outcome="applied",
        message="Transitioned {0} -> {1}".format(current, to_state),
        reference_doctype=doctype, reference_name=name,
        inputs={"from": current, "to": to_state}, output={"state": to_state},
        policy=profile.name,
    )
    frappe.db.commit()
    return {"ok": True, "state": to_state}


@frappe.whitelist()
def get_state_model(company, doctype=None):
    """Expose the configured states + transitions for the SPA. Empty when not enforced."""
    from trader_app.api.company import user_can_access_company

    if not user_can_access_company(company):
        frappe.throw(
            _("You do not have permission to access company {0}.").format(company),
            frappe.PermissionError,
        )
    profile = get_active_profile(company)
    if not profile:
        return {"enforced": False, "states": [], "transitions": []}

    def _match(row):
        return not doctype or row.target_doctype == doctype

    return {
        "enforced": True,
        "profile": profile.name,
        "states": [
            {"doctype": r.target_doctype, "state": r.state,
             "is_initial": bool(r.is_initial), "is_final": bool(r.is_final)}
            for r in profile.states if _match(r)
        ],
        "transitions": [
            {"doctype": r.target_doctype, "from": r.from_state, "to": r.to_state,
             "required_role": r.required_role}
            for r in profile.transitions if _match(r)
        ],
    }
