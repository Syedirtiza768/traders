# -*- coding: utf-8 -*-
"""Apply tenant module guards to whitelisted API handlers."""

from __future__ import unicode_literals

import functools

from trader_app.api.tenant import assert_tenant_module_enabled

# Whitelisted handlers that must stay callable without a module gate (boot, context, jobs).
EXEMPT_HANDLER_NAMES = frozenset(
    {
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
    }
)

# Roles that may invoice from a challan. Accounts issues invoices; the sales module stays open to sales staff.
INVOICING_ROLES = ("Trader Finance Manager", "Trader Accountant")

# Read access for the roles that raise documents: tax templates for the sales and purchase forms, and items and
# warehouses for the purchasing forms. Reading these does not change any record.
TAX_TEMPLATE_READ_ROLES = (
    "Trader Staff",
    "Trader Sales Manager",
    "Trader Purchase Manager",
    "Trader Inventory Manager",
    "Trader Warehouse Manager",
    "Trader Finance Manager",
    "Trader Accountant",
    "Trader Viewer",
)
ITEM_READ_ROLES = (
    "Trader Staff",
    "Trader Sales Manager",
    "Trader Purchase Manager",
    "Trader Inventory Manager",
    "Trader Warehouse Manager",
    "Trader Finance Manager",
    "Trader Accountant",
)


MODULE_CAPABILITIES = {
    "dashboard": "dashboard:view",
    "sales": "sales:view",
    "purchases": "purchases:view",
    "inventory": "inventory:view",
    "customers": "customers:view",
    "suppliers": "suppliers:view",
    "finance": "finance:view",
    "reports": "reports:view",
    "settings": "settings:view",
    "components": "components:view",
    "pos": "sales:view",
    "trading_entity": "settings:view",
}

CAPABILITY_ROLES = {
    "dashboard:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Inventory Manager",
            "Trader Warehouse Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "sales:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "purchases:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Purchase Manager",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "inventory:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Inventory Manager",
            "Trader Warehouse Manager",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "customers:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "suppliers:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Purchase Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
    "finance:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Viewer",
        }
    ),
    "reports:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Inventory Manager",
            "Trader Warehouse Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Viewer",
        }
    ),
    # Supplier payables: the people who buy, pay and report on suppliers. Sales and operations are not included (G-PERM-01).
    "reports:payables": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Purchase Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Viewer",
        }
    ),
    # Margin and gross profit: finance, the founder and the viewer. Sales, purchasing and operations are not included.
    "reports:margin": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Viewer",
        }
    ),
    "settings:view": frozenset({"Trader Admin", "System Manager"}),
    "components:view": frozenset(
        {
            "Trader Admin",
            "System Manager",
            "Trader Sales Manager",
            "Trader Purchase Manager",
            "Trader Inventory Manager",
            "Trader Warehouse Manager",
            "Trader Finance Manager",
            "Trader Accountant",
            "Trader Staff",
            "Trader Viewer",
        }
    ),
}


def assert_capability_access(capability, extra_roles=()):
    """Enforce a capability's role list, plus any roles granted to one handler (extra_roles)."""
    frappe_module = __import__("frappe")
    if capability not in CAPABILITY_ROLES:
        frappe_module.throw("This API module has no server-side access policy.", frappe_module.PermissionError)

    if getattr(getattr(frappe_module, "session", None), "user", None) == "Administrator":
        return

    roles = set(frappe_module.get_roles() or [])
    allowed = set(CAPABILITY_ROLES[capability]) | set(extra_roles or ())
    if not roles.intersection(allowed):
        frappe_module.throw("You do not have permission to access this module.", frappe_module.PermissionError)


def assert_module_role_access(module_key, extra_roles=()):
    """Enforce the same role capability that gates each module in the SPA."""
    capability = MODULE_CAPABILITIES.get(module_key)
    if not capability:
        frappe_module = __import__("frappe")
        frappe_module.throw("This API module has no server-side access policy.", frappe_module.PermissionError)
    assert_capability_access(capability, extra_roles)


def _wrap_with_module_guard(fn, module_key, capability, extra_roles=()):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        assert_capability_access(capability, extra_roles)
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


WHITELIST_LISTS = ("whitelisted", "guest_methods", "xss_safe_methods")


def _is_registered(frappe_module, fn):
    """Frappe keys its HTTP method table by the function object, so membership there means the handler is whitelisted."""
    return fn in getattr(frappe_module, "allowed_http_methods_for_whitelisted_func", {})


def _register_wrapper(frappe_module, fn, wrapper):
    """Point every Frappe registry at the guarded wrapper, so the HTTP route resolves to the guard (G-PERM-01)."""
    for registry in WHITELIST_LISTS:
        items = getattr(frappe_module, registry, None)
        if items is None:
            continue
        for index, item in enumerate(items):
            if item is fn:
                items[index] = wrapper
    methods = getattr(frappe_module, "allowed_http_methods_for_whitelisted_func", None)
    if isinstance(methods, dict) and fn in methods:
        methods[wrapper] = methods.pop(fn)


def apply_module_guards(namespace, module_key, exempt=None, extra_roles=None, capabilities=None):
    """Guard every whitelisted handler in a module with its role capability.

    A handler counts as whitelisted when Frappe registered it (frappe.whitelisted). Frappe v15 sets no attribute on
    the function, so the earlier check skipped every handler and no role rule was enforced (G-PERM-01). The wrapper
    replaces the handler in the registry as well, so the HTTP route resolves to the guarded function.

    capabilities: handler name -> capability, when a handler needs a narrower rule than its module.
    extra_roles:  handler name -> roles granted to that handler on top of its capability.
    """
    if module_key not in MODULE_CAPABILITIES:
        raise ValueError("Missing server-side capability policy for module: {0}".format(module_key))
    exempt = exempt or set()
    exempt = set(exempt) | EXEMPT_HANDLER_NAMES
    extra_roles = extra_roles or {}
    capabilities = capabilities or {}
    frappe_module = __import__("frappe")

    module_name = namespace.get("__name__")
    for name, fn in list(namespace.items()):
        if name in exempt or name.startswith("_"):
            continue
        if not callable(fn):
            continue
        if getattr(fn, "__module__", None) != module_name:
            continue
        if not (getattr(fn, "whitelisted", False) or _is_registered(frappe_module, fn)):
            continue
        capability = capabilities.get(name, MODULE_CAPABILITIES[module_key])
        wrapper = _wrap_with_module_guard(fn, module_key, capability, extra_roles.get(name, ()))
        namespace[name] = wrapper
        _register_wrapper(frappe_module, fn, wrapper)
