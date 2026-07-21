# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import now_datetime


class TraderOpportunity(Document):
    def before_naming(self):
        # field:opportunity_ref autoname needs the value before name is assigned.
        self._ensure_ref()

    def validate(self):
        self._ensure_ref()
        if self.status == "Closed" and not self.close_stage:
            frappe.throw(_("Close Stage is required when closing an Opportunity."))
        if self.status == "Open":
            self.close_stage = None
            self.closed_at = None
            self.closed_by = None

        seen = set()
        for row in self.customer_pos or []:
            po = (row.customer_po_no or "").strip()
            if not po:
                continue
            key = po.lower()
            if key in seen:
                frappe.throw(_("Duplicate customer PO {0} on this Opportunity.").format(po))
            seen.add(key)

    def before_save(self):
        if self.status == "Closed" and not self.closed_at:
            self.closed_at = now_datetime()
            self.closed_by = frappe.session.user

    def _ensure_ref(self):
        if self.opportunity_ref:
            self.opportunity_ref = self.opportunity_ref.strip()
            return
        abbr = frappe.db.get_value("Company", self.company, "abbr") or "OPP"
        self.opportunity_ref = make_autoname("OPP-{0}-.####".format(abbr))
