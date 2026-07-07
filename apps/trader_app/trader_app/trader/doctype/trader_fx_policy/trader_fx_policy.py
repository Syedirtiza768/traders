# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderFXPolicy(Document):
    def validate(self):
        if self.is_active:
            other = frappe.db.get_value(
                "Trader FX Policy",
                {"company": self.company, "is_active": 1, "name": ["!=", self.name]},
                "name",
            )
            if other:
                frappe.throw(_("Company {0} already has an active FX policy ({1}).").format(self.company, other))
