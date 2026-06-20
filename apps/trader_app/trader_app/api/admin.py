# -*- coding: utf-8 -*-
"""Trader App — In-App Administration API

Provides whitelisted endpoints for the six admin panels that previously
linked out to ERPNext Desk.  All data is read/written directly via Frappe
DocTypes so the Trader UI never needs to leave the application.

Endpoints:
  User Management   — get_users / get_user_detail / create_user / update_user / set_user_enabled
  Role Management   — get_all_roles / get_role_users / assign_role_to_user / remove_role_from_user
  Company Settings  — get_company_settings / save_company_settings
  Fiscal Year       — get_fiscal_years / create_fiscal_year / set_active_fiscal_year
  Warehouses        — get_warehouses / create_warehouse / update_warehouse
  Accounting        — get_accounting_settings / save_accounting_settings
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import cint, flt, getdate

from trader_app.api.company import resolve_active_company


# ─── Permission helper ────────────────────────────────────────────────────────

def _require_admin():
    """Raise PermissionError unless caller is Trader Admin / System Manager."""
    if frappe.session.user == "Administrator":
        return
    roles = set(frappe.get_roles())
    if not roles.intersection({"System Manager", "Trader Admin"}):
        frappe.throw(
            _("Only Trader Admin or System Manager can access administration settings."),
            frappe.PermissionError,
        )


def _parse(data):
    """Accept a dict or a JSON-encoded string; always return a dict."""
    if isinstance(data, str):
        try:
            return json.loads(data)
        except Exception:
            return {}
    return data or {}


# ─── 1. User Management ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_users(search=None, page=1, page_size=20):
    """Paginated list of system users with their key Trader roles."""
    _require_admin()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["u.name != 'Guest'", "u.user_type != 'Website User'"]
    params = {}

    if search:
        conditions.append(
            "(u.name LIKE %(search)s OR u.full_name LIKE %(search)s OR u.email LIKE %(search)s)"
        )
        params["search"] = "%{}%".format(search)

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        "SELECT COUNT(*) FROM `tabUser` u WHERE {}".format(where), params
    )[0][0]

    users = frappe.db.sql(
        """
        SELECT u.name, u.full_name, u.email, u.enabled, u.user_type,
               u.first_name, u.last_name, u.creation
        FROM `tabUser` u
        WHERE {where}
        ORDER BY u.enabled DESC, u.full_name
        LIMIT %(page_size)s OFFSET %(offset)s
        """.format(where=where),
        {**params, "page_size": page_size, "offset": offset},
        as_dict=True,
    )

    for user in users:
        roles = frappe.db.sql(
            """
            SELECT role FROM `tabHas Role`
            WHERE parent = %s AND parenttype = 'User'
              AND (role LIKE 'Trader %%' OR role IN ('System Manager', 'Administrator'))
            ORDER BY role
            """,
            (user.name,),
            as_dict=True,
        )
        user["roles"] = [r.role for r in roles]

    return {
        "data": users,
        "total": cint(total),
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_user_detail(user):
    """Full user detail including all assigned roles."""
    _require_admin()
    doc = frappe.get_doc("User", user)
    return {
        "name": doc.name,
        "first_name": doc.first_name or "",
        "last_name": doc.last_name or "",
        "full_name": doc.full_name or "",
        "email": doc.email or doc.name,
        "enabled": cint(doc.enabled),
        "user_type": doc.user_type or "System User",
        "roles": [r.role for r in doc.roles],
    }


@frappe.whitelist()
def create_user(data=None):
    """Create a new system user with optional welcome email and roles."""
    _require_admin()
    data = _parse(data)

    email = (data.get("email") or "").strip()
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()

    if not email:
        frappe.throw(_("Email is required."))
    if not first_name:
        frappe.throw(_("First name is required."))
    if frappe.db.exists("User", email):
        frappe.throw(_("A user with email {0} already exists.").format(email))

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.user_type = "System User"
    user.send_welcome_email = cint(data.get("send_welcome_email", 0))

    for role in (data.get("roles") or []):
        user.append("roles", {"role": role})

    user.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "name": user.name}


@frappe.whitelist()
def update_user(data=None):
    """Update a user's name and Trader-role assignments."""
    _require_admin()
    data = _parse(data)

    user_name = data.get("name")
    if not user_name:
        frappe.throw(_("User name is required."))

    doc = frappe.get_doc("User", user_name)

    if "first_name" in data:
        doc.first_name = data["first_name"] or ""
    if "last_name" in data:
        doc.last_name = data["last_name"] or ""

    # Preserve non-Trader roles; replace Trader roles with the submitted set
    new_roles = set(data.get("roles") or [])
    doc.roles = [r for r in doc.roles if not r.role.startswith("Trader ")]
    for role in sorted(new_roles):
        doc.append("roles", {"role": role})

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True}


@frappe.whitelist()
def set_user_enabled(user, enabled=1):
    """Enable or disable a user account."""
    _require_admin()
    if user == frappe.session.user:
        frappe.throw(_("You cannot disable your own account."))
    frappe.db.set_value("User", user, "enabled", cint(enabled))
    frappe.db.commit()
    return {"ok": True}


# ─── 2. Role Management ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_all_roles():
    """All roles in the system, Trader roles listed first."""
    _require_admin()
    return frappe.db.sql(
        """
        SELECT name,
               IFNULL(disabled, 0) AS disabled,
               IFNULL(desk_access, 0) AS desk_access,
               IFNULL(is_custom, 0) AS is_custom
        FROM `tabRole`
        WHERE name NOT IN ('Guest', 'All', 'Administrator')
        ORDER BY
            CASE WHEN name LIKE 'Trader %%' THEN 0 ELSE 1 END,
            disabled ASC,
            name ASC
        """,
        as_dict=True,
    )


@frappe.whitelist()
def get_role_users(role):
    """Return all users who currently hold the specified role."""
    _require_admin()
    return frappe.db.sql(
        """
        SELECT u.name, u.full_name, u.email, u.enabled
        FROM `tabHas Role` hr
        INNER JOIN `tabUser` u ON u.name = hr.parent
        WHERE hr.role = %s
          AND hr.parenttype = 'User'
          AND u.user_type != 'Website User'
        ORDER BY u.full_name
        """,
        (role,),
        as_dict=True,
    )


@frappe.whitelist()
def assign_role_to_user(user, role):
    """Assign a role to a user if they don't already have it."""
    _require_admin()
    doc = frappe.get_doc("User", user)
    existing = {r.role for r in doc.roles}
    if role not in existing:
        doc.append("roles", {"role": role})
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    return {"ok": True}


@frappe.whitelist()
def remove_role_from_user(user, role):
    """Remove a role from a user."""
    _require_admin()
    doc = frappe.get_doc("User", user)
    doc.roles = [r for r in doc.roles if r.role != role]
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True}


# ─── 3. Company Settings ──────────────────────────────────────────────────────

@frappe.whitelist()
def get_company_settings(company=None):
    """Return editable company fields for the admin form."""
    _require_admin()
    company = resolve_active_company(company)
    doc = frappe.get_doc("Company", company)
    return {
        "name": doc.name,
        "abbr": doc.abbr or "",
        "country": doc.country or "",
        "default_currency": doc.default_currency or "",
        "domain": doc.domain or "",
        "phone_no": doc.phone_no or "",
        "company_email": doc.company_email or "",
        "website": doc.website or "",
        "date_of_establishment": str(doc.date_of_establishment or ""),
        "standard_working_hours": flt(doc.standard_working_hours or 0),
        "default_cash_account": doc.default_cash_account or "",
        "default_payable_account": doc.default_payable_account or "",
        "default_receivable_account": doc.default_receivable_account or "",
        "round_off_account": doc.round_off_account or "",
        "payment_terms": doc.payment_terms or "",
    }


@frappe.whitelist()
def save_company_settings(data=None):
    """Update editable company fields."""
    _require_admin()
    data = _parse(data)

    company = data.get("name") or resolve_active_company()
    doc = frappe.get_doc("Company", company)

    _editable = [
        "phone_no", "company_email", "website", "date_of_establishment",
        "standard_working_hours", "default_cash_account",
        "default_payable_account", "default_receivable_account",
        "round_off_account", "payment_terms",
    ]
    for field in _editable:
        if field in data:
            setattr(doc, field, data[field] if data[field] is not None else "")

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": "Company settings saved."}


# ─── 4. Fiscal Year ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_fiscal_years():
    """All fiscal years with active flag derived from Global Defaults."""
    _require_admin()
    years = frappe.get_all(
        "Fiscal Year",
        fields=["name", "year_start_date", "year_end_date", "disabled"],
        order_by="year_start_date desc",
    )
    active = (
        frappe.db.get_value("Global Defaults", "Global Defaults", "current_fiscal_year")
        or ""
    )
    for y in years:
        y["is_active"] = y["name"] == active
    return years


@frappe.whitelist()
def create_fiscal_year(data=None):
    """Create a new fiscal year record."""
    _require_admin()
    data = _parse(data)

    start = data.get("year_start_date")
    end = data.get("year_end_date")
    if not start or not end:
        frappe.throw(_("Start date and end date are required."))
    if getdate(start) >= getdate(end):
        frappe.throw(_("Start date must be before end date."))

    fy = frappe.new_doc("Fiscal Year")
    fy.year_start_date = start
    fy.year_end_date = end
    fy.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "name": fy.name}


@frappe.whitelist()
def set_active_fiscal_year(name):
    """Set the active fiscal year in Global Defaults."""
    _require_admin()
    if not frappe.db.exists("Fiscal Year", name):
        frappe.throw(_("Fiscal year '{0}' not found.").format(name))
    frappe.db.set_value(
        "Global Defaults", "Global Defaults", "current_fiscal_year", name
    )
    frappe.db.commit()
    return {"ok": True}


# ─── 5. Warehouse Management ──────────────────────────────────────────────────

@frappe.whitelist()
def get_warehouses(company=None):
    """All warehouses for the active company (including group nodes)."""
    _require_admin()
    company = resolve_active_company(company)
    return frappe.db.sql(
        """
        SELECT w.name, w.warehouse_name, w.parent_warehouse,
               IFNULL(w.disabled, 0)  AS disabled,
               IFNULL(w.is_group, 0)  AS is_group,
               w.warehouse_type, w.city, w.company, w.creation
        FROM `tabWarehouse` w
        WHERE w.company = %s OR (w.is_group = 1 AND (w.company = %s OR w.company IS NULL OR w.company = ''))
        ORDER BY w.is_group DESC, w.lft
        """,
        (company, company),
        as_dict=True,
    )


@frappe.whitelist()
def create_warehouse(data=None):
    """Create a new warehouse under the active company."""
    _require_admin()
    data = _parse(data)

    company = resolve_active_company(data.get("company"))
    wh_name = (data.get("warehouse_name") or "").strip()
    if not wh_name:
        frappe.throw(_("Warehouse name is required."))

    wh = frappe.new_doc("Warehouse")
    wh.warehouse_name = wh_name
    wh.company = company
    wh.parent_warehouse = data.get("parent_warehouse") or ""
    wh.warehouse_type = data.get("warehouse_type") or ""
    wh.city = data.get("city") or ""
    wh.is_group = cint(data.get("is_group", 0))
    wh.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "name": wh.name}


@frappe.whitelist()
def update_warehouse(data=None):
    """Update warehouse city, type, or disabled status."""
    _require_admin()
    data = _parse(data)

    wh_name = data.get("name")
    if not wh_name:
        frappe.throw(_("Warehouse name is required."))

    doc = frappe.get_doc("Warehouse", wh_name)
    if "city" in data:
        doc.city = data["city"] or ""
    if "warehouse_type" in data:
        doc.warehouse_type = data["warehouse_type"] or ""
    if "disabled" in data:
        doc.disabled = cint(data["disabled"])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True}


# ─── 6. Accounting Settings ───────────────────────────────────────────────────

@frappe.whitelist()
def get_accounting_settings():
    """Return the ERPNext Accounts Settings singleton."""
    _require_admin()
    doc = frappe.get_doc("Accounts Settings")

    def _bool(field):
        return cint(getattr(doc, field, 0))

    def _str(field):
        return getattr(doc, field, "") or ""

    def _flt(field):
        return flt(getattr(doc, field, 0))

    return {
        # Freeze / credit
        "acc_frozen_upto": _str("acc_frozen_upto"),
        "frozen_accounts_modifier": _str("frozen_accounts_modifier"),
        "credit_controller": _str("credit_controller"),
        "over_billing_allowance": _flt("over_billing_allowance"),
        "credit_limit": _flt("credit_limit"),
        # Invoice uniqueness & payment
        "check_supplier_invoice_uniqueness": _bool("check_supplier_invoice_uniqueness"),
        "unlink_payment_on_cancellation_of_invoice": _bool("unlink_payment_on_cancellation_of_invoice"),
        "unlink_advance_payment_on_cancelation_of_order": _bool("unlink_advance_payment_on_cancelation_of_order"),
        # Asset & tax
        "book_asset_depreciation_entry_automatically": _bool("book_asset_depreciation_entry_automatically"),
        "add_taxes_from_item_tax_template": _bool("add_taxes_from_item_tax_template"),
        "show_inclusive_tax_in_print": _bool("show_inclusive_tax_in_print"),
        # Payment terms & multi-currency
        "automatically_fetch_payment_terms": _bool("automatically_fetch_payment_terms"),
        "allow_multi_currency_invoices_against_single_party_account": _bool(
            "allow_multi_currency_invoices_against_single_party_account"
        ),
    }


@frappe.whitelist()
def save_accounting_settings(data=None):
    """Persist changes to the Accounts Settings singleton."""
    _require_admin()
    data = _parse(data)

    doc = frappe.get_doc("Accounts Settings")

    _str_fields = ["acc_frozen_upto", "frozen_accounts_modifier", "credit_controller"]
    _bool_fields = [
        "check_supplier_invoice_uniqueness",
        "unlink_payment_on_cancellation_of_invoice",
        "unlink_advance_payment_on_cancelation_of_order",
        "book_asset_depreciation_entry_automatically",
        "add_taxes_from_item_tax_template",
        "show_inclusive_tax_in_print",
        "automatically_fetch_payment_terms",
        "allow_multi_currency_invoices_against_single_party_account",
    ]
    _flt_fields = ["over_billing_allowance", "credit_limit"]

    for f in _str_fields:
        if f in data:
            setattr(doc, f, data[f] or "")
    for f in _bool_fields:
        if f in data:
            setattr(doc, f, cint(data[f]))
    for f in _flt_fields:
        if f in data:
            setattr(doc, f, flt(data[f]))

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": "Accounting settings saved."}
