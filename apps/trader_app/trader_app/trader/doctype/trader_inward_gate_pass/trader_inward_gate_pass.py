# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderInwardGatePass(Document):
    def validate(self):
        receipt = frappe.db.get_value(
            "Purchase Receipt",
            self.purchase_receipt,
            ["docstatus", "company", "supplier"],
            as_dict=True,
        )
        if not receipt:
            frappe.throw(_("Purchase Receipt {0} was not found.").format(self.purchase_receipt))
        if receipt.docstatus != 1:
            frappe.throw(
                _("Purchase Receipt {0} must be submitted before an inward gate pass can be recorded.").format(
                    self.purchase_receipt
                )
            )
        if self.company and self.company != receipt.company:
            frappe.throw(_("Purchase Receipt {0} belongs to company {1}.").format(self.purchase_receipt, receipt.company))
        self.company = receipt.company
        self.supplier = receipt.supplier
