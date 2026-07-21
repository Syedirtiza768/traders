# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderARProfile(Document):
    def validate(self):
        if self.settle_tolerance is not None and self.settle_tolerance < 0:
            frappe.throw(_("Settle Tolerance cannot be negative."))
        if not self.is_active:
            return
        other = frappe.db.get_value(
            "Trader AR Profile",
            {"company": self.company, "is_active": 1, "name": ["!=", self.name]},
            "name",
        )
        if other:
            frappe.throw(
                _("Company {0} already has an active AR profile ({1}).").format(
                    self.company, other
                )
            )
