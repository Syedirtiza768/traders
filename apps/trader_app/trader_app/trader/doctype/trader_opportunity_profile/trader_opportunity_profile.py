# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderOpportunityProfile(Document):
    def validate(self):
        if self.stock_posting_moment == "delivery_note" and self.cogs_model == "B":
            frappe.throw(
                _("COGS model B (post on Invoice) requires stock_posting_moment = invoice.")
            )
        if self.stock_posting_moment == "invoice" and self.cogs_model == "A":
            frappe.throw(
                _("COGS model A (post on DN) requires stock_posting_moment = delivery_note.")
            )

        if not self.is_active:
            return

        other = frappe.db.get_value(
            "Trader Opportunity Profile",
            {"company": self.company, "is_active": 1, "name": ["!=", self.name]},
            "name",
        )
        if other:
            frappe.throw(
                _("Company {0} already has an active opportunity profile ({1}).").format(
                    self.company, other
                )
            )
