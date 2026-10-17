# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class TraderTradingEntity(Document):
    def validate(self):
        self.trading_name = (self.trading_name or "").strip()
        self.code = (self.code or "").strip() or None
        self.letterhead_address = (self.letterhead_address or "").strip()

        if not self.trading_name:
            frappe.throw(_("Trading Name is required."))
        if not self.letterhead_address:
            frappe.throw(_("Letterhead Address is required."))

        self._validate_unique_name()
        self._validate_unique_code()
        if cint(self.is_default):
            self._clear_other_defaults()

    def _validate_unique_name(self):
        existing = frappe.db.get_value(
            "Trader Trading Entity",
            {
                "company": self.company,
                "trading_name": self.trading_name,
                "name": ["!=", self.name],
            },
            "name",
        )
        if existing:
            frappe.throw(_("Trading Entity '{0}' already exists for {1}.").format(self.trading_name, self.company))

    def _validate_unique_code(self):
        if not self.code:
            return
        existing = frappe.db.get_value(
            "Trader Trading Entity",
            {
                "company": self.company,
                "code": self.code,
                "name": ["!=", self.name],
            },
            "name",
        )
        if existing:
            frappe.throw(_("Code '{0}' is already used by Trading Entity {1}.").format(self.code, existing))

    def _clear_other_defaults(self):
        others = frappe.get_all(
            "Trader Trading Entity",
            filters={
                "company": self.company,
                "is_default": 1,
                "name": ["!=", self.name],
            },
            pluck="name",
        )
        for name in others:
            frappe.db.set_value("Trader Trading Entity", name, "is_default", 0, update_modified=False)

    def on_trash(self):
        if not frappe.db.has_column("Customer", "trader_trading_entity"):
            return
        usage = cint(
            frappe.db.count(
                "Customer",
                {"trader_trading_entity": self.name},
            )
        )
        if usage:
            frappe.throw(
                _(
                    "Cannot delete Trading Entity {0}: {1} customer(s) still assigned. "
                    "Deactivate it or reassign customers first."
                ).format(self.trading_name, usage)
            )
