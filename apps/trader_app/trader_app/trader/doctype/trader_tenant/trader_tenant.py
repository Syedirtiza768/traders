# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from trader_app.api.tenant import (
    DEFAULT_MODULE_ROWS,
    log_tenant_action,
    sync_tenant_modules_to_company,
)


class TraderTenant(Document):
    def validate(self):
        if self.company:
            existing = frappe.db.get_value(
                "Trader Tenant",
                {"company": self.company, "name": ["!=", self.name]},
                "name",
            )
            if existing:
                frappe.throw(
                    _("Company {0} is already linked to tenant {1}.").format(
                        self.company, existing
                    )
                )

            company_tenant = frappe.db.get_value("Company", self.company, "trader_tenant")
            if company_tenant and company_tenant != self.name:
                frappe.throw(
                    _("Company {0} is already assigned to tenant {1}.").format(
                        self.company, company_tenant
                    )
                )

        if not self.enabled_modules:
            for row in DEFAULT_MODULE_ROWS:
                self.append("enabled_modules", row)

    def on_update(self):
        if self.company:
            frappe.db.set_value("Company", self.company, "trader_tenant", self.name, update_modified=False)
            if self.max_users:
                frappe.db.set_value(
                    "Company",
                    self.company,
                    "trader_user_limit",
                    self.max_users,
                    update_modified=False,
                )
            sync_tenant_modules_to_company(self.name)

    def after_insert(self):
        if not self.provisioned_on:
            frappe.db.set_value(self.doctype, self.name, "provisioned_on", now_datetime(), update_modified=False)
        if self.company:
            frappe.db.set_value("Company", self.company, "trader_tenant", self.name, update_modified=False)
            sync_tenant_modules_to_company(self.name)
        log_tenant_action(self.name, "created", {"tenant_name": self.tenant_name})
