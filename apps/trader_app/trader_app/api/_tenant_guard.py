# -*- coding: utf-8 -*-
"""Apply tenant module guards to whitelisted API handlers."""

from __future__ import unicode_literals

import functools

from trader_app.api.tenant import assert_tenant_module_enabled

# Whitelisted handlers that must stay callable without a module gate (boot, context, jobs).
EXEMPT_HANDLER_NAMES = frozenset({
    "get_multitenant_status",
    "get_tenant_config",
    "get_business_tenant_audit_log",
    "boot_session",
    "get_companies",
    "get_active_company",
    "set_active_company",
    "get_settings",
    "save_settings",
    "get_current_user_roles",
    "get_trader_roles",
    "refresh_dashboard_cache",
    "get_print_data",
})


def _wrap_with_module_guard(fn, module_key):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        assert_tenant_module_enabled(module_key)
        return fn(*args, **kwargs)

    for attr in (
        "whitelisted",
        "allow_guest",
        "xss_safe",
        "methods",
        "api_whitelisted",
        "frappe_whitelisted",
    ):
        if hasattr(fn, attr):
            setattr(wrapper, attr, getattr(fn, attr))

    return wrapper


def apply_module_guards(namespace, module_key, exempt=None):
    """Wrap all @frappe.whitelist handlers in a module with tenant module checks."""
    exempt = exempt or set()
    exempt = set(exempt) | EXEMPT_HANDLER_NAMES

    module_name = namespace.get("__name__")
    for name, fn in list(namespace.items()):
        if name in exempt or name.startswith("_"):
            continue
        if not callable(fn):
            continue
        if getattr(fn, "__module__", None) != module_name:
            continue
        if not getattr(fn, "whitelisted", False):
            continue
        namespace[name] = _wrap_with_module_guard(fn, module_key)
