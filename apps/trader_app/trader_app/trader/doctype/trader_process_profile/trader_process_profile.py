# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderProcessProfile(Document):
    def validate(self):
        # At most one enforcing profile per company — the guard resolves a single model.
        if self.is_active and self.enforce_states:
            other = frappe.db.get_value(
                "Trader Process Profile",
                {
                    "company": self.company,
                    "is_active": 1,
                    "enforce_states": 1,
                    "name": ["!=", self.name],
                },
                "name",
            )
            if other:
                frappe.throw(
                    _("Company {0} already has an enforcing process profile ({1}). "
                      "Deactivate it first.").format(self.company, other)
                )

        # Each target doctype should declare exactly one initial state.
        initials = {}
        for row in self.states:
            if row.is_initial:
                initials[row.target_doctype] = initials.get(row.target_doctype, 0) + 1
        for dt, count in initials.items():
            if count > 1:
                frappe.throw(_("DocType {0} has more than one initial state.").format(dt))
