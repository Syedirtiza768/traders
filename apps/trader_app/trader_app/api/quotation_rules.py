# -*- coding: utf-8 -*-
"""Pure decision cores for quotation finalisation, revisions and credit control.

Kept free of document access so the rules can be unit-tested without a site.
The Frappe hooks that call these live in ``opportunity.py`` and ``credit_control.py``.
"""

from __future__ import unicode_literals

import re

from frappe.utils import flt

from trader_app.api.hierarchy import cint_safe

_REVISION_LABEL = re.compile(r"^R(\d+)$")


def next_revision_number(labels):
    """Number for the next revision (``R<n>``) given the labels already in use.

    Uses the highest existing number, not the count: a deleted revision must
    not make the next label repeat an earlier one (legacy finding F-30).
    """
    highest = 0
    for label in labels or []:
        match = _REVISION_LABEL.match((label or "").strip().upper())
        if match:
            highest = max(highest, int(match.group(1)))
    return highest + 1


def finalization_errors(rows, quick=False):
    """Messages for hierarchy rows that break the finalisation rules.

    Rules (legacy ``saveFinalQuotation``): every option needs a positive package
    quantity and at least one item, and every item needs a positive quantity.
    A quick quotation skips the rules by design.
    """
    if quick:
        return []
    errors = []
    for row in sorted(rows or [], key=lambda r: (cint_safe(r.get("line_no")), cint_safe(r.get("option_no")))):
        where = "Line {0} option {1}".format(cint_safe(row.get("line_no") or 1), cint_safe(row.get("option_no") or 1))
        if flt(row.get("package_qty")) <= 0:
            errors.append("{0}: package quantity must be above zero.".format(where))
        items = row.get("items") or []
        if not items:
            errors.append("{0}: add at least one item.".format(where))
        for item in items:
            if flt(item.get("unit_qty")) <= 0:
                errors.append(
                    "{0}: quantity for {1} must be above zero.".format(where, item.get("item_code") or "item")
                )
    return errors


def credit_limit_decision(credit_limit, outstanding, amount, action="Warn", can_override=False):
    """Whether booking ``amount`` on top of ``outstanding`` breaches the credit limit.

    ``action`` is ``"Warn"`` (flag only) or ``"Block"`` (refuse unless the user
    holds an override role). A limit of zero means no limit is set.
    """
    limit = flt(credit_limit)
    projected = flt(outstanding) + flt(amount)
    over = limit > 0 and projected > limit
    return {
        "limit": limit,
        "outstanding": flt(outstanding),
        "amount": flt(amount),
        "projected": projected,
        "over_limit": over,
        "block": bool(over and action == "Block" and not can_override),
    }


def wht_mismatch(quote_wht_percent, policy_wht_percent):
    """True when the quotation's withholding rate differs from the rate the invoice will use.

    Legacy finding F-14: the quote printed one withholding rate while the
    invoice applied another. Zero against non-zero counts as a mismatch too.
    """
    return abs(flt(quote_wht_percent) - flt(policy_wht_percent)) > 0.001
