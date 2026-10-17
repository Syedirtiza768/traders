# -*- coding: utf-8 -*-
"""Valuation settlement in the request that back-dates it (G-VAL-01).

ERPNext values a back-dated receipt or challan, or its cancellation, through a queued repost job. The scheduler runs
that job, and the company can limit it to a time window in Stock Reposting Settings. Until it runs, the stock ledger
and cost of goods sold are not final.

This settles the queue straight after the submit or cancel has committed, so the valuation is final before the caller
has its answer. It reposts each queued entry directly, so the company's reposting window does not hold it back. That
is a deliberate trade-off: the repost runs during business hours when a window is set. A failure is logged and the
entry stays queued for the scheduler; the submitted document stays submitted.
"""

from __future__ import unicode_literals

import frappe


def settle_valuation():
    """Repost every queued valuation entry now, in ERPNext's own order."""
    from erpnext.stock.doctype.repost_item_valuation.repost_item_valuation import (
        get_repost_item_valuation_entries,
        repost,
    )

    for row in get_repost_item_valuation_entries():
        doc = frappe.get_doc("Repost Item Valuation", row.name)
        if doc.status in ("Queued", "In Progress"):
            repost(doc)
            doc.deduplicate_similar_repost()
    frappe.db.commit()


def _settle_or_log():
    try:
        settle_valuation()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Valuation settlement failed; the entries stay queued")


def settle_valuation_after_commit(doc, method=None):
    """on_submit and on_cancel hook for receipts and challans: settle once the transaction has committed."""
    frappe.db.after_commit.add(_settle_or_log)
