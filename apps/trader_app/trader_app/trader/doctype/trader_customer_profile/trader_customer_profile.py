# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderCustomerProfile(Document):
    def validate(self):
        if not self.is_active:
            return
        other = frappe.db.get_value(
            "Trader Customer Profile",
            {"company": self.company, "is_active": 1, "name": ["!=", self.name]},
            "name",
        )
        if other:
            frappe.throw(
                _("Company {0} already has an active Customer profile ({1}).").format(
                    self.company, other
                )
            )
