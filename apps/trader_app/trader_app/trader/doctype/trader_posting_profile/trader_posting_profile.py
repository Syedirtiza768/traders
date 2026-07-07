# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderPostingProfile(Document):
    def validate(self):
        if self.is_active:
            other = frappe.db.get_value(
                "Trader Posting Profile",
                {"company": self.company, "event": self.event, "is_active": 1, "name": ["!=", self.name]},
                "name",
            )
            if other:
                frappe.throw(
                    _("Company {0} already has an active posting profile for {1} ({2}).").format(
                        self.company, self.event, other
                    )
                )
