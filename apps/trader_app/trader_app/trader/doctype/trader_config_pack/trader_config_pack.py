# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class TraderConfigPack(Document):
    def validate(self):
        # One config pack per (company, pack_key) — the resolver relies on uniqueness.
        existing = frappe.db.get_value(
            "Trader Config Pack",
            {"company": self.company, "pack_key": self.pack_key, "name": ["!=", self.name]},
            "name",
        )
        if existing:
            frappe.throw(
                _("A config pack {0} already exists for company {1} (record {2}).").format(
                    self.pack_key, self.company, existing
                )
            )
        if not self.label:
            self.label = self.pack_key

    def on_update(self):
        # Keep the read cache coherent with the durable record.
        from trader_app.api.config_store import invalidate

        invalidate(self.company, self.pack_key)

    def on_trash(self):
        from trader_app.api.config_store import invalidate

        invalidate(self.company, self.pack_key)
