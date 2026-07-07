# -*- coding: utf-8 -*-
"""Trader App — declarative validation rule engine (PRD FR-4).

Rules live in the **Trader Validation Rule** DocType as data. The runtime loads
the active rules for a document's doctype + company, evaluates each rule's
``condition`` (a small, safe JSON DSL — no ``eval``) against the document, and
applies the rule's severity:

  * ``block`` → raises, preventing save/submit
  * ``warn``  → shows a non-blocking alert

Every evaluation is written to the Trader Decision Log so the "why was this
blocked?" question is always answerable.

Condition DSL
-------------
Leaf:     {"field": "grand_total", "op": "<=", "value": 0}
Combine:  {"all": [ ...leaves/nodes... ]}
          {"any": [ ...leaves/nodes... ]}
          {"not": { ...node... }}

Dotted field paths cross child tables existentially — ``items.qty`` with
op ``<=`` 0 fires if ANY item row has qty <= 0.

Design rule: this module is generic. It never branches on company or tenant —
behavior comes entirely from the rule rows.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import flt

from trader_app.api.decision_log import log_decision

_MISSING = object()

# Operators that compare resolved value(s) against a target.
_BINARY_OPS = {"==", "!=", ">", "<", ">=", "<=", "in", "not in"}
# Operators that take no target.
_UNARY_OPS = {"is_empty", "is_set"}


# ────────────────────────────────────────────────────────────────
# Condition evaluation
# ────────────────────────────────────────────────────────────────

def evaluate_condition(node, context):
    """Return True if ``node`` matches ``context``. Raises ValueError on a
    structurally invalid node or unknown operator (used for author-time checks)."""
    if not isinstance(node, dict):
        raise ValueError("condition node must be an object")

    if "all" in node:
        clauses = node["all"]
        if not isinstance(clauses, list):
            raise ValueError("'all' must be a list")
        return all(evaluate_condition(c, context) for c in clauses)

    if "any" in node:
        clauses = node["any"]
        if not isinstance(clauses, list):
            raise ValueError("'any' must be a list")
        return any(evaluate_condition(c, context) for c in clauses)

    if "not" in node:
        return not evaluate_condition(node["not"], context)

    # Leaf comparison
    if "field" not in node or "op" not in node:
        raise ValueError("leaf must have 'field' and 'op'")
    op = node["op"]
    if op not in _BINARY_OPS and op not in _UNARY_OPS:
        raise ValueError("unknown operator: {0}".format(op))

    values = _resolve(context, node["field"])

    if op in _UNARY_OPS:
        return _apply_unary(values, op)

    if "value" not in node:
        raise ValueError("operator {0} requires 'value'".format(op))
    return _apply_binary(values, op, node["value"])


def _resolve(context, path):
    """Resolve a dotted path to a list of values (existential over child rows)."""
    current = [context]
    for part in str(path).split("."):
        nxt = []
        for item in current:
            if isinstance(item, dict):
                val = item.get(part, _MISSING)
            else:
                val = getattr(item, part, _MISSING)
            if val is _MISSING:
                continue
            if isinstance(val, (list, tuple)):
                nxt.extend(val)
            else:
                nxt.append(val)
        current = nxt
    return current


def _apply_unary(values, op):
    present = [v for v in values if v not in (None, "", _MISSING)]
    if op == "is_set":
        return len(present) > 0
    # is_empty
    return len(present) == 0


def _apply_binary(values, op, target):
    if not values:
        return False
    return any(_compare(v, op, target) for v in values)


def _compare(value, op, target):
    if op == "in":
        try:
            return value in target
        except TypeError:
            return False
    if op == "not in":
        try:
            return value not in target
        except TypeError:
            return False

    a, b = _coerce(value, target)
    if op == "==":
        return a == b
    if op == "!=":
        return a != b
    # Ordered comparisons require compatible types; guard against mismatches.
    try:
        if op == ">":
            return a > b
        if op == "<":
            return a < b
        if op == ">=":
            return a >= b
        if op == "<=":
            return a <= b
    except TypeError:
        return False
    return False


def _coerce(a, b):
    """Coerce to float when both operands look numeric, else compare as-is."""
    try:
        return flt(a), flt(b)
    except (TypeError, ValueError):
        return a, b


# ────────────────────────────────────────────────────────────────
# Runtime
# ────────────────────────────────────────────────────────────────

def _load_rules(target_doctype, company, event):
    or_filters = [{"company": company}, {"company": ["is", "not set"]}] if company else None
    filters = {"is_active": 1, "target_doctype": target_doctype, "event": event}
    return frappe.get_all(
        "Trader Validation Rule",
        filters=filters,
        or_filters=or_filters,
        fields=["name", "rule_name", "condition", "severity", "message", "bypass_role", "company"],
        order_by="priority asc, creation asc",
    )


def run_rules(doc, event="validate"):
    """Evaluate active Trader Validation Rules for ``doc`` and enforce them.

    Blocking violations are collected and raised together so the user sees all
    problems at once. Warnings are shown as non-blocking alerts. Safe to call
    unconditionally — a doctype/company with no rules is a no-op.
    """
    company = getattr(doc, "company", None)
    rules = _load_rules(doc.doctype, company, event)
    if not rules:
        return

    context = doc.as_dict()
    user_roles = set(frappe.get_roles())
    blocking_messages = []

    for rule in rules:
        # Bypass by role
        if rule.get("bypass_role") and rule["bypass_role"] in user_roles:
            log_decision(
                "validation", company=company, outcome="skipped",
                message="Bypassed by role {0}".format(rule["bypass_role"]),
                reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
                policy=rule["name"],
            )
            continue

        condition = rule.get("condition")
        if isinstance(condition, str):
            try:
                condition = json.loads(condition)
            except (TypeError, ValueError):
                condition = None

        try:
            fired = bool(condition) and evaluate_condition(condition, context)
        except ValueError:
            # A malformed rule must not break document flow — log and skip.
            log_decision(
                "validation", company=company, outcome="error",
                message="Rule {0} has an invalid condition".format(rule["name"]),
                reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
                policy=rule["name"],
            )
            continue

        if not fired:
            log_decision(
                "validation", company=company, outcome="allow",
                message=rule["rule_name"],
                reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
                policy=rule["name"],
            )
            continue

        severity = rule.get("severity") or "block"
        msg = rule.get("message") or rule["rule_name"]
        log_decision(
            "validation", company=company,
            outcome="block" if severity == "block" else "warn",
            message=msg,
            reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
            policy=rule["name"],
        )
        if severity == "block":
            blocking_messages.append(msg)
        else:
            frappe.msgprint(msg, indicator="orange", alert=True)

    if blocking_messages:
        frappe.throw("<br>".join(_(m) for m in blocking_messages))
