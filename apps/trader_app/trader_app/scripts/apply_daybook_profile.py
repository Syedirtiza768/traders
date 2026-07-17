# -*- coding: utf-8 -*-
"""Apply components_daybook nav profile to an existing tenant (e.g. CDC / TNT-0001).

Usage on bench:
  bench --site <site> execute trader_app.scripts.apply_daybook_profile.apply --kwargs "{'tenant': 'TNT-0001'}"

Or via frappe console / this file path under apps.
"""

from __future__ import unicode_literals


def apply(tenant=None, company=None):
    import frappe
    from trader_app.api.tenant import apply_components_daybook_profile, log_tenant_action

    if not tenant and company:
        tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if not tenant:
        tenant = frappe.db.get_value("Trader Tenant", {"tenant_name": "CDC"}, "name")
    if not tenant:
        frappe.throw("Pass tenant=TNT-xxxx or company=CDC")

    result = apply_components_daybook_profile(tenant)
    log_tenant_action(tenant, "config_changed", {"nav_profile": "components_daybook", "source": "apply_daybook_profile"})
    frappe.db.commit()
    frappe.clear_cache(doctype="Trader Tenant")
    return result
