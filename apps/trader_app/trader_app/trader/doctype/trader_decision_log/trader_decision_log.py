# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from frappe.model.document import Document


class TraderDecisionLog(Document):
    """Append-only. No mutation logic — records are written via
    trader_app.api.decision_log.log_decision and never edited in place."""

    pass
