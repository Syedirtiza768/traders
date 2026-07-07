# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderTaxPolicy(Document):
    def validate(self):
        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            frappe.throw(_("Effective To cannot be before Effective From."))
