# -*- coding: utf-8 -*-
"""Trader App — Customers API.

Whitelisted endpoints for customer management.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from trader_app.api.company import resolve_active_company
from frappe.utils import nowdate, flt, cint


def _parse_dict(value):
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return {}
        return json.loads(value)
    return {}


def _set_trader_party_fields(doc, short_code=None, opening_balance=None, dba=None):
    if short_code is not None and frappe.db.has_column(doc.doctype, "trader_short_code"):
        doc.trader_short_code = (short_code or "").strip()
    if opening_balance is not None and frappe.db.has_column(doc.doctype, "trader_opening_balance"):
        doc.trader_opening_balance = flt(opening_balance)
    if dba is not None and frappe.db.has_column(doc.doctype, "trader_dba"):
        doc.trader_dba = (dba or "").strip()


def _set_credit_limit(doc, company, credit_limit):
    """Set company-scoped credit limit on Customer.credit_limits child table."""
    if credit_limit is None:
        return
    amount = flt(credit_limit)
    if not hasattr(doc, "credit_limits"):
        if frappe.db.has_column("Customer", "credit_limit"):
            doc.credit_limit = amount
        return

    company = resolve_active_company(company)
    found = False
    for row in doc.get("credit_limits") or []:
        if row.company == company:
            row.credit_limit = amount
            found = True
            break
    if not found:
        doc.append("credit_limits", {"company": company, "credit_limit": amount})


def _get_credit_limit(doc, company):
    company = resolve_active_company(company)
    for row in doc.get("credit_limits") or []:
        if row.company == company:
            return flt(row.credit_limit)
    return flt(getattr(doc, "credit_limit", 0) or 0)


def _upsert_billing_address(customer, address_data):
    address_data = _parse_dict(address_data)
    if not address_data:
        return None

    line1 = (address_data.get("address_line1") or "").strip()
    if not line1:
        return None

    existing = frappe.db.sql(
        """
        SELECT a.name
        FROM `tabAddress` a
        INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name AND dl.parenttype = 'Address'
        WHERE dl.link_doctype = 'Customer'
          AND dl.link_name = %s
          AND IFNULL(a.address_type, '') IN ('Billing', 'Office', '')
        ORDER BY a.is_primary_address DESC, a.creation ASC
        LIMIT 1
        """,
        (customer,),
    )
    payload = {
        "address_title": address_data.get("address_title") or customer,
        "address_type": address_data.get("address_type") or "Billing",
        "address_line1": line1,
        "address_line2": (address_data.get("address_line2") or "").strip(),
        "city": (address_data.get("city") or "").strip() or "—",
        "state": (address_data.get("state") or "").strip(),
        "pincode": (address_data.get("pincode") or "").strip(),
        "country": (address_data.get("country") or "").strip() or frappe.db.get_default("country") or "Pakistan",
        "is_primary_address": 1,
        "is_shipping_address": cint(address_data.get("is_shipping_address") or 0),
    }

    if existing:
        doc = frappe.get_doc("Address", existing[0][0])
        doc.update(payload)
        doc.save(ignore_permissions=True)
        return doc.name

    doc = frappe.get_doc({"doctype": "Address", **payload})
    doc.append("links", {"link_doctype": "Customer", "link_name": customer})
    doc.insert(ignore_permissions=True)
    return doc.name


def _list_addresses(customer):
    return frappe.db.sql(
        """
        SELECT a.name, a.address_type, a.address_line1, a.address_line2, a.city, a.state,
               a.pincode, a.country, a.is_primary_address, a.is_shipping_address,
               a.address_display
        FROM `tabAddress` a
        INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name AND dl.parenttype = 'Address'
        WHERE dl.link_doctype = 'Customer' AND dl.link_name = %s
        ORDER BY a.is_primary_address DESC, a.creation ASC
        """,
        (customer,),
        as_dict=True,
    )


def _list_contacts(customer):
    rows = frappe.db.sql(
        """
        SELECT c.name, c.first_name, c.last_name, c.designation, c.is_primary_contact,
               c.email_id, c.mobile_no, c.phone
        FROM `tabContact` c
        INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name AND dl.parenttype = 'Contact'
        WHERE dl.link_doctype = 'Customer' AND dl.link_name = %s
        ORDER BY c.is_primary_contact DESC, c.creation ASC
        """,
        (customer,),
        as_dict=True,
    )
    return rows


def _apply_extended_fields(doc, company, tax_id=None, payment_terms=None,
                           default_currency=None, credit_limit=None):
    if tax_id is not None and hasattr(doc, "tax_id"):
        doc.tax_id = (tax_id or "").strip()
    if payment_terms is not None and hasattr(doc, "payment_terms"):
        doc.payment_terms = payment_terms or None
    if default_currency is not None and hasattr(doc, "default_currency"):
        doc.default_currency = default_currency or None
    if credit_limit is not None:
        _set_credit_limit(doc, company, credit_limit)


@frappe.whitelist()
def get_customers(page=1, page_size=20, search=None, customer_group=None):
    """Paginated customer list with outstanding summary."""
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size
    company = resolve_active_company()

    conditions = ["c.disabled = 0"]
    params = {}

    dba_col = "COALESCE(c.trader_dba, '') AS trader_dba," if frappe.db.has_column(
        "Customer", "trader_dba"
    ) else "'' AS trader_dba,"
    search_dba = (
        "OR IFNULL(c.trader_dba,'') LIKE %(search)s "
        if frappe.db.has_column("Customer", "trader_dba")
        else ""
    )

    if search:
        conditions.append(
            "(c.name LIKE %(search)s OR c.customer_name LIKE %(search)s "
            "OR IFNULL(c.trader_short_code,'') LIKE %(search)s "
            "{0})".format(search_dba)
        )
        params["search"] = f"%{search}%"
    if customer_group:
        conditions.append("c.customer_group = %(customer_group)s")
        params["customer_group"] = customer_group

    from trader_app.api.permissions import tenant_sql_filter
    tcond, tparams = tenant_sql_filter("c")
    if tcond:
        conditions.append(tcond)
        params.update(tparams)

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabCustomer` c WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT c.name, c.customer_name, c.customer_group, c.territory,
               c.mobile_no, c.email_id, c.tax_id, c.payment_terms,
               COALESCE(c.trader_short_code, '') AS trader_short_code,
               {dba_col}
               COALESCE(c.trader_opening_balance, 0) AS trader_opening_balance,
               COALESCE(outstanding.total, 0) AS outstanding_amount,
               COALESCE(revenue.total, 0) AS total_revenue
        FROM `tabCustomer` c
        LEFT JOIN (
            SELECT customer, SUM(outstanding_amount) AS total
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND company = %(company)s AND outstanding_amount > 0
            GROUP BY customer
        ) outstanding ON outstanding.customer = c.name
        LEFT JOIN (
            SELECT customer, SUM(grand_total) AS total
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND company = %(company)s
            GROUP BY customer
        ) revenue ON revenue.customer = c.name
        WHERE {where}
        ORDER BY c.customer_name
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "company": company, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


@frappe.whitelist()
def get_customer_form_setup(company=None):
    """Lookups + pack settings for create/edit forms."""
    from trader_app.api.customer_pack import resolve_customer_pack_settings

    company = resolve_active_company(company)
    settings = resolve_customer_pack_settings(company)
    payment_terms = frappe.get_all(
        "Payment Terms Template",
        fields=["name"],
        order_by="name asc",
        pluck="name",
    )
    territories = frappe.get_all(
        "Territory", filters={"is_group": 0}, pluck="name", order_by="name asc"
    )
    countries = frappe.get_all("Country", pluck="name", order_by="name asc")
    return {
        "company": company,
        "pack": settings,
        "payment_terms": payment_terms,
        "territories": territories,
        "countries": countries,
        "customer_groups": get_customer_groups(),
        "defaults": {
            "customer_group": _default_customer_group(),
            "territory": _default_territory(),
            "country": frappe.db.get_value("Company", company, "country")
            or frappe.db.get_default("country")
            or "Pakistan",
        },
    }


@frappe.whitelist()
def get_customer_detail(name):
    """Customer detail with transactions summary, addresses, and contacts."""
    doc = frappe.get_doc("Customer", name)
    doc.check_permission("read")
    company = resolve_active_company()

    outstanding = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) FROM `tabSales Invoice`
        WHERE customer = %s AND company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (name, company))[0][0])

    total_revenue = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) FROM `tabSales Invoice`
        WHERE customer = %s AND company = %s AND docstatus = 1
    """, (name, company))[0][0])

    invoice_count = cint(frappe.db.sql("""
        SELECT COUNT(*) FROM `tabSales Invoice`
        WHERE customer = %s AND company = %s AND docstatus = 1
    """, (name, company))[0][0])

    result = doc.as_dict()
    result["outstanding_amount"] = outstanding
    result["total_revenue"] = total_revenue
    result["invoice_count"] = invoice_count
    result["credit_limit"] = _get_credit_limit(doc, company)
    result["addresses"] = _list_addresses(name)
    result["contacts"] = _list_contacts(name)
    from trader_app.api.customer_pack import resolve_customer_pack_settings
    result["pack"] = resolve_customer_pack_settings(company)
    return result


@frappe.whitelist()
def get_customer_groups():
    """List distinct customer groups."""
    return frappe.get_all("Customer Group", filters={"is_group": 0}, pluck="name", order_by="name")


@frappe.whitelist()
def get_customer_transactions(customer, company=None, page=1, page_size=20):
    """Recent transactions for a customer."""
    company = resolve_active_company(company)
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    total = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabSales Invoice`
        WHERE customer = %s AND company = %s AND docstatus = 1
    """, (customer, company))[0][0]

    rows = frappe.db.sql("""
        SELECT name, posting_date, grand_total, outstanding_amount,
               CASE
                   WHEN outstanding_amount <= 0 THEN 'Paid'
                   WHEN outstanding_amount < grand_total THEN 'Partly Paid'
                   ELSE 'Unpaid'
               END AS status
        FROM `tabSales Invoice`
        WHERE customer = %s AND company = %s AND docstatus = 1
        ORDER BY posting_date DESC
        LIMIT %s OFFSET %s
    """, (customer, company, page_size, offset), as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


@frappe.whitelist()
def create_customer(customer_name, customer_group=None, territory=None, mobile_no=None,
                    email_id=None, short_code=None, opening_balance=None,
                    dba=None, tax_id=None, payment_terms=None, default_currency=None,
                    credit_limit=None, billing_address=None):
    """Create a Customer record for the Trader UI (extended when Customer pack is on)."""
    from trader_app.api.customer_pack import validate_customer_payload

    company = resolve_active_company()
    billing_address = _parse_dict(billing_address)
    validate_customer_payload(
        {
            "tax_id": tax_id,
            "payment_terms": payment_terms,
            "billing_address": billing_address,
        },
        company=company,
    )

    doc = frappe.new_doc("Customer")
    doc.customer_name = customer_name
    doc.customer_group = customer_group or _default_customer_group()
    doc.territory = territory or _default_territory()
    doc.mobile_no = mobile_no
    doc.email_id = email_id
    _set_trader_party_fields(doc, short_code=short_code, opening_balance=opening_balance, dba=dba)
    _apply_extended_fields(
        doc,
        company,
        tax_id=tax_id,
        payment_terms=payment_terms,
        default_currency=default_currency,
        credit_limit=credit_limit,
    )
    doc.insert(ignore_permissions=False)
    if billing_address:
        _upsert_billing_address(doc.name, billing_address)
    frappe.db.commit()
    return {"name": doc.name, "customer_name": doc.customer_name, "status": "Created"}


@frappe.whitelist()
def update_customer(name, customer_name=None, customer_group=None, territory=None,
                    mobile_no=None, email_id=None, short_code=None, opening_balance=None,
                    dba=None, tax_id=None, payment_terms=None, default_currency=None,
                    credit_limit=None, billing_address=None):
    """Update an existing Customer record."""
    from trader_app.api.customer_pack import validate_customer_payload

    company = resolve_active_company()
    billing_address = _parse_dict(billing_address) if billing_address is not None else None
    payload = {
        "tax_id": tax_id,
        "payment_terms": payment_terms,
        "billing_address": billing_address if billing_address is not None else {},
    }
    # Only enforce requireds when extended payload is being set
    if any(v is not None for v in (tax_id, payment_terms, billing_address, dba, credit_limit)):
        if billing_address is None:
            addrs = _list_addresses(name)
            if addrs:
                payload["billing_address"] = {
                    "address_line1": addrs[0].address_line1,
                    "city": addrs[0].city,
                }
        validate_customer_payload(payload, company=company)

    doc = frappe.get_doc("Customer", name)
    doc.check_permission("write")

    if customer_name is not None:
        doc.customer_name = customer_name
    if customer_group is not None:
        doc.customer_group = customer_group
    if territory is not None:
        doc.territory = territory
    if mobile_no is not None:
        doc.mobile_no = mobile_no
    if email_id is not None:
        doc.email_id = email_id
    _set_trader_party_fields(doc, short_code=short_code, opening_balance=opening_balance, dba=dba)
    _apply_extended_fields(
        doc,
        company,
        tax_id=tax_id,
        payment_terms=payment_terms,
        default_currency=default_currency,
        credit_limit=credit_limit,
    )

    doc.save(ignore_permissions=False)
    if billing_address is not None:
        _upsert_billing_address(doc.name, billing_address)
    frappe.db.commit()
    return {"name": doc.name, "customer_name": doc.customer_name, "status": "Updated"}


@frappe.whitelist()
def add_customer_contact(customer, first_name, last_name=None, designation=None,
                         email_id=None, mobile_no=None, phone=None, is_primary=0):
    """Create a Contact linked to Customer."""
    if not frappe.db.exists("Customer", customer):
        frappe.throw(_("Customer {0} not found.").format(customer))
    frappe.get_doc("Customer", customer).check_permission("write")

    first_name = (first_name or "").strip()
    if not first_name:
        frappe.throw(_("Contact first name is required."))

    contact = frappe.new_doc("Contact")
    contact.first_name = first_name
    contact.last_name = (last_name or "").strip() or None
    contact.designation = (designation or "").strip() or None
    contact.is_primary_contact = cint(is_primary)
    contact.append("links", {"link_doctype": "Customer", "link_name": customer})
    if email_id:
        contact.append("email_ids", {"email_id": email_id.strip(), "is_primary": 1})
    if mobile_no:
        contact.append("phone_nos", {"phone": mobile_no.strip(), "is_primary_mobile_no": 1})
    elif phone:
        contact.append("phone_nos", {"phone": phone.strip(), "is_primary_phone": 1})
    contact.insert(ignore_permissions=False)
    frappe.db.commit()
    return {"name": contact.name, "status": "Created"}


@frappe.whitelist()
def delete_customer_contact(name, customer):
    """Unlink/delete a Contact for a Customer."""
    if not frappe.db.exists("Contact", name):
        frappe.throw(_("Contact {0} not found.").format(name))
    frappe.get_doc("Customer", customer).check_permission("write")
    linked = frappe.db.exists(
        "Dynamic Link",
        {"parent": name, "parenttype": "Contact", "link_doctype": "Customer", "link_name": customer},
    )
    if not linked:
        frappe.throw(_("Contact is not linked to this customer."))
    frappe.delete_doc("Contact", name, ignore_permissions=False)
    frappe.db.commit()
    return {"ok": True}


@frappe.whitelist()
def disable_customer(name):
    """Disable (soft-delete) a Customer record."""
    doc = frappe.get_doc("Customer", name)
    doc.check_permission("write")
    doc.disabled = 1
    doc.save(ignore_permissions=False)
    frappe.db.commit()
    return {"name": doc.name, "status": "Disabled"}


@frappe.whitelist()
def enable_customer(name):
    """Re-enable a previously disabled Customer record."""
    doc = frappe.get_doc("Customer", name)
    doc.check_permission("write")
    doc.disabled = 0
    doc.save(ignore_permissions=False)
    frappe.db.commit()
    return {"name": doc.name, "status": "Enabled"}


def _default_customer_group():
    return frappe.db.get_single_value("Selling Settings", "customer_group") or frappe.get_all(
        "Customer Group", filters={"is_group": 0}, order_by="name", limit=1, pluck="name"
    )[0]


def _default_territory():
    return frappe.db.get_single_value("Selling Settings", "territory") or frappe.get_all(
        "Territory", filters={"is_group": 0}, order_by="name", limit=1, pluck="name"
    )[0]

from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "customers")
