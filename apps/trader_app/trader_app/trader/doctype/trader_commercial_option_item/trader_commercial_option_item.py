# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from frappe.model.document import Document
from frappe.utils import flt


class TraderCommercialOptionItem(Document):
    def validate(self):
        qty = flt(self.unit_qty)
        rate = flt(self.unit_price)
        discount = flt(self.discount_percent)
        self.amount = qty * rate * (1.0 - (discount / 100.0))
