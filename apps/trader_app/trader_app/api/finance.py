# -*- coding: utf-8 -*-
"""Trader App — Finance API.

Whitelisted endpoints for the Finance module:
- Payment Entry management
- Journal Entry
- Outstanding balance queries
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, flt, cint


# ────────────────────────────────────────────────────────────────
# 1.  PAYMENT ENTRIES
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payment_entries(company=None, party_type=None, party=None,
                        payment_type=None, from_date=None, to_date=None,
                        page=1, page_size=20, search=None):
    """Paginated Payment Entries."""
    company = company or _default_company()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["pe.company = %(company)s", "pe.docstatus IN (0, 1)"]
    params = {"company": company}

    if party_type:
        conditions.append("pe.party_type = %(party_type)s")
        params["party_type"] = party_type
    if party:
        conditions.append("pe.party = %(party)s")
        params["party"] = party
    if payment_type:
        conditions.append("pe.payment_type = %(payment_type)s")
        params["payment_type"] = payment_type
    if from_date:
        conditions.append("pe.posting_date >= %(from_date)s")
        params["from_date"] = from_date
    if to_date:
        conditions.append("pe.posting_date <= %(to_date)s")
        params["to_date"] = to_date
    if search:
        conditions.append("(pe.name LIKE %(search)s OR pe.party LIKE %(search)s)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabPayment Entry` pe WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT pe.name, pe.posting_date, pe.payment_type,
               pe.party_type, pe.party, pe.party_name,
               pe.paid_amount, pe.received_amount,
               pe.mode_of_payment, pe.reference_no,
               pe.docstatus
        FROM `tabPayment Entry` pe
        WHERE {where}
        ORDER BY pe.posting_date DESC, pe.creation DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


@frappe.whitelist()
def get_payment_entry_detail(name):
    """Full Payment Entry with references."""
    doc = frappe.get_doc("Payment Entry", name)
    doc.check_permission("read")
    return doc.as_dict()


@frappe.whitelist()
def get_payment_entry_setup(company=None):
    """Lookup payment modes and default source/destination accounts for the form."""
    company = company or _default_company()

    # Ensure standard modes exist so the payment form is always usable
    _ensure_payment_modes()

    modes = frappe.get_all(
        "Mode of Payment",
        filters={"enabled": 1},
        fields=["name", "type"],
        order_by="name asc",
    )

    cash_account = _get_default_account(company, "Cash")
    bank_account = _get_default_account(company, "Bank") or cash_account

    return {
        "modes": modes,
        "defaults": {
            "receive_account": cash_account or bank_account,
            "pay_account": cash_account or bank_account,
            "bank_account": bank_account,
            "cash_account": cash_account,
        },
    }


# ────────────────────────────────────────────────────────────────
# 2.  CREATE PAYMENT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def create_payment_entry(payment_type, party_type, party, amount,
                         company=None, posting_date=None,
                         reference_doctype=None, reference_name=None,
                         mode_of_payment=None):
    """Create a Payment Entry from the UI."""
    company = company or _default_company()

    # Resolve mode_of_payment — ensure it exists in the DB; fall back to first available
    mode_of_payment = _resolve_payment_mode(mode_of_payment)

    pe = frappe.new_doc("Payment Entry")
    pe.company = company
    pe.payment_type = payment_type  # "Receive" or "Pay"
    pe.party_type = party_type
    pe.party = party
    pe.posting_date = posting_date or nowdate()
    pe.paid_amount = flt(amount)
    pe.received_amount = flt(amount)
    if mode_of_payment:
        pe.mode_of_payment = mode_of_payment

    # Set accounts
    if payment_type == "Receive":
        pe.paid_to = _get_default_account(company, "Cash")
    else:
        pe.paid_from = _get_default_account(company, "Cash")

    if reference_doctype and reference_name:
        pe.append("references", {
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
            "allocated_amount": flt(amount),
        })

    pe.insert(ignore_permissions=False)
    return {"name": pe.name, "status": "Draft"}


@frappe.whitelist()
def submit_payment_entry(name):
    """Submit a draft Payment Entry."""
    doc = frappe.get_doc("Payment Entry", name)
    doc.check_permission("submit")
    doc.submit()
    frappe.db.commit()
    return {"name": doc.name, "status": "Submitted"}


# ────────────────────────────────────────────────────────────────
# 3.  JOURNAL ENTRIES
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_journal_entries(company=None, from_date=None, to_date=None,
                        page=1, page_size=20):
    """Paginated Journal Entries."""
    company = company or _default_company()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["je.company = %(company)s", "je.docstatus IN (0, 1)"]
    params = {"company": company}

    if from_date:
        conditions.append("je.posting_date >= %(from_date)s")
        params["from_date"] = from_date
    if to_date:
        conditions.append("je.posting_date <= %(to_date)s")
        params["to_date"] = to_date

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabJournal Entry` je WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT je.name, je.posting_date, je.voucher_type,
               je.total_debit, je.total_credit,
               je.user_remark, je.docstatus
        FROM `tabJournal Entry` je
        WHERE {where}
        ORDER BY je.posting_date DESC, je.creation DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


@frappe.whitelist()
def get_journal_entry_detail(name):
    """Full Journal Entry with account lines."""
    doc = frappe.get_doc("Journal Entry", name)
    doc.check_permission("read")
    return doc.as_dict()


@frappe.whitelist()
def get_accounts(company=None, search=None, limit=100):
    """Lookup selectable ledger accounts for finance forms."""
    company = company or _default_company()
    limit = min(cint(limit) or 100, 200)

    conditions = ["company = %(company)s", "is_group = 0", "disabled = 0"]
    params = {"company": company, "limit": limit}

    if search:
        conditions.append("(name LIKE %(search)s OR account_name LIKE %(search)s)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    rows = frappe.db.sql(f"""
        SELECT name, account_name, account_number, account_type, root_type
        FROM `tabAccount`
        WHERE {where}
        ORDER BY root_type ASC, account_name ASC, name ASC
        LIMIT %(limit)s
    """, params, as_dict=True)

    return rows


@frappe.whitelist()
def create_journal_entry(voucher_type=None, posting_date=None,
                         user_remark=None, accounts=None, company=None):
    """Create a balanced draft Journal Entry from the UI."""
    import json
    if isinstance(accounts, str):
        accounts = json.loads(accounts)

    company = company or _default_company()
    accounts = accounts or []

    if len(accounts) < 2:
        frappe.throw(_("At least two account lines are required."))

    total_debit = 0
    total_credit = 0
    cleaned_accounts = []

    for row in accounts:
        account = row.get("account")
        debit = flt(row.get("debit") or row.get("debit_in_account_currency"))
        credit = flt(row.get("credit") or row.get("credit_in_account_currency"))
        if not account:
            continue
        if debit <= 0 and credit <= 0:
            continue

        total_debit += debit
        total_credit += credit
        cleaned_accounts.append({
            "account": account,
            "debit_in_account_currency": debit,
            "credit_in_account_currency": credit,
            "user_remark": row.get("user_remark") or user_remark,
        })

    if len(cleaned_accounts) < 2:
        frappe.throw(_("Add at least two non-empty account lines."))

    if abs(total_debit - total_credit) > 0.005:
        frappe.throw(_("Total debit and total credit must be equal."))

    je = frappe.new_doc("Journal Entry")
    je.company = company
    je.voucher_type = voucher_type or "Journal Entry"
    je.posting_date = posting_date or nowdate()
    je.user_remark = user_remark

    for row in cleaned_accounts:
        je.append("accounts", row)

    je.insert(ignore_permissions=False)
    return {"name": je.name, "status": "Draft"}


@frappe.whitelist()
def submit_journal_entry(name):
    """Submit a draft Journal Entry."""
    doc = frappe.get_doc("Journal Entry", name)
    doc.check_permission("submit")
    doc.submit()
    frappe.db.commit()
    return {"name": doc.name, "status": "Submitted"}


@frappe.whitelist()
def cancel_payment_entry(name):
    """Cancel a submitted Payment Entry."""
    doc = frappe.get_doc("Payment Entry", name)
    doc.check_permission("cancel")
    doc.cancel()
    frappe.db.commit()
    return {"name": doc.name, "status": "Cancelled"}


@frappe.whitelist()
def cancel_journal_entry(name):
    """Cancel a submitted Journal Entry."""
    doc = frappe.get_doc("Journal Entry", name)
    doc.check_permission("cancel")
    doc.cancel()
    frappe.db.commit()
    return {"name": doc.name, "status": "Cancelled"}


# ────────────────────────────────────────────────────────────────
# 4.  DOCTYPE EVENT HOOKS
# ────────────────────────────────────────────────────────────────

def on_payment_entry_submit(doc, method):
    """Runs on Payment Entry submit — publish realtime event."""
    frappe.publish_realtime(
        "payment_entry_submitted",
        {"payment": doc.name, "party": doc.party, "amount": doc.paid_amount},
        user=frappe.session.user,
    )


# ────────────────────────────────────────────────────────────────
# 5.  OUTSTANDING SUMMARY
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_outstanding_summary(company=None):
    """Receivable + Payable totals."""
    company = company or _default_company()

    receivable = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))[0][0])

    payable = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) FROM `tabPurchase Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))[0][0])

    return {
        "receivable": receivable,
        "payable": payable,
        "net": receivable - payable,
    }


# ────────────────────────────────────────────────────────────────
#    HELPERS
# ────────────────────────────────────────────────────────────────

def _default_company():
    companies = frappe.get_all("Company", limit=1, pluck="name")
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or (companies[0] if companies else None)
    )


def _get_default_account(company, account_type):
    """Get default cash or bank account for the company."""
    account = frappe.db.get_value(
        "Account",
        filters={"company": company, "account_type": account_type, "is_group": 0},
        fieldname="name",
    )
    if not account:
        account = frappe.db.get_value(
            "Account",
            filters={"company": company, "account_type": "Bank", "is_group": 0},
            fieldname="name",
        )
    return account


def _ensure_payment_modes():
    """Create standard Modes of Payment if none exist (first-run bootstrap)."""
    if frappe.db.count("Mode of Payment") > 0:
        return  # already set up

    standard_modes = [
        ("Cash", "Cash"),
        ("Bank Transfer", "Bank"),
        ("Cheque", "Bank"),
        ("Wire Transfer", "Bank"),
    ]
    for mode_name, mode_type in standard_modes:
        if not frappe.db.exists("Mode of Payment", mode_name):
            doc = frappe.new_doc("Mode of Payment")
            doc.mode_of_payment = mode_name
            doc.type = mode_type
            doc.enabled = 1
            doc.insert(ignore_permissions=True)
    frappe.db.commit()


def _resolve_payment_mode(mode_of_payment):
    """Return a valid Mode of Payment name, falling back to the first available."""
    if mode_of_payment and frappe.db.exists("Mode of Payment", mode_of_payment):
        return mode_of_payment

    # Prefer "Cash", otherwise take the first enabled mode
    if frappe.db.exists("Mode of Payment", "Cash"):
        return "Cash"

    first = frappe.db.get_value("Mode of Payment", {"enabled": 1}, "name", order_by="name asc")
    return first  # may be None if table is still empty — ERPNext will use its own default
