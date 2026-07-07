# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.model.document import Document

from trader_app.api.rules import evaluate_condition


class TraderValidationRule(Document):
    def validate(self):
        # Fail fast on malformed condition JSON / unknown operators so a broken
        # rule is caught at author time, not at document-save time.
        condition = self.condition
        if isinstance(condition, str):
            try:
                condition = json.loads(condition)
            except (TypeError, ValueError):
                frappe.throw(_("Condition must be valid JSON."))
        if not isinstance(condition, dict):
            frappe.throw(_("Condition must be a JSON object."))
        try:
            evaluate_condition(condition, {"__probe__": True})
        except ValueError as exc:
            frappe.throw(_("Invalid condition: {0}").format(str(exc)))
