# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from trader_app.api.gate_pass import (
    get_challan_qty,
    get_released_qty,
    validate_release_quantities,
)


class TraderGatePass(Document):
    def validate(self):
        dn = frappe.db.get_value(
            "Delivery Note",
            self.delivery_note,
            ["docstatus", "company", "customer", "is_return"],
            as_dict=True,
        )
        if not dn:
            frappe.throw(_("Delivery Challan {0} was not found.").format(self.delivery_note))
        if dn.docstatus != 1:
            frappe.throw(
                _("Delivery Challan {0} must be submitted before a gate pass can be issued.").format(
                    self.delivery_note
                )
            )
        if dn.is_return:
            frappe.throw(_("A gate pass cannot be issued against a return."))
        if self.company and self.company != dn.company:
            frappe.throw(_("Delivery Challan {0} belongs to company {1}.").format(self.delivery_note, dn.company))
        self.company = dn.company
        self.customer = dn.customer
        if frappe.db.has_column("Delivery Note", "trader_opportunity"):
            self.opportunity = frappe.db.get_value("Delivery Note", self.delivery_note, "trader_opportunity")

        if self.status == "Cancelled":
            return

        violations = validate_release_quantities(
            challan_qty=get_challan_qty(self.delivery_note),
            already_released=get_released_qty(self.delivery_note, exclude=self.name),
            requested=[{"item_code": r.item_code, "qty": r.qty} for r in self.items],
        )
        if violations:
            frappe.throw("<br>".join(violations), title=_("Gate pass exceeds the challan"))
