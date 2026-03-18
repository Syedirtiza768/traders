# -*- coding: utf-8 -*-
"""Trader App — Reports API.

Whitelisted endpoints for the Reports module:
- Sales Report
- Purchase Report
- Item Sales Report
- Customer Ledger
- Supplier Ledger
- Receivables Aging
- Payables Aging
- Profit & Loss
- Stock Ledger Report
- General Ledger
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_months, flt, cint


# ────────────────────────────────────────────────────────────────
# 1.  SALES REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_report(company=None, from_date=None, to_date=None,
                     customer=None, item_group=None):
    """Sales report — grouped by month."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -12)
    to_date = to_date or nowdate()

    conditions = [
        "si.company = %(company)s",
        "si.docstatus = 1",
        "si.posting_date >= %(from_date)s",
        "si.posting_date <= %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if customer:
        conditions.append("si.customer = %(customer)s")
        params["customer"] = customer

    where = " AND ".join(conditions)

    rows = frappe.db.sql(f"""
        SELECT DATE_FORMAT(si.posting_date, '%%Y-%%m') AS month,
               COUNT(*) AS invoice_count,
               SUM(si.total) AS net_total,
               SUM(si.grand_total) AS grand_total,
               SUM(si.outstanding_amount) AS outstanding
        FROM `tabSales Invoice` si
        WHERE {where}
        GROUP BY month
        ORDER BY month
    """, params, as_dict=True)

    totals = frappe.db.sql(f"""
        SELECT COUNT(*) AS invoice_count,
               SUM(si.grand_total) AS grand_total,
               SUM(si.outstanding_amount) AS outstanding
        FROM `tabSales Invoice` si
        WHERE {where}
    """, params, as_dict=True)

    return {"data": rows, "totals": totals[0] if totals else {}}


# ────────────────────────────────────────────────────────────────
# 2.  PURCHASE REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_report(company=None, from_date=None, to_date=None,
                        supplier=None):
    """Purchase report — grouped by month."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -12)
    to_date = to_date or nowdate()

    conditions = [
        "pi.company = %(company)s",
        "pi.docstatus = 1",
        "pi.posting_date >= %(from_date)s",
        "pi.posting_date <= %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if supplier:
        conditions.append("pi.supplier = %(supplier)s")
        params["supplier"] = supplier

    where = " AND ".join(conditions)

    rows = frappe.db.sql(f"""
        SELECT DATE_FORMAT(pi.posting_date, '%%Y-%%m') AS month,
               COUNT(*) AS invoice_count,
               SUM(pi.grand_total) AS grand_total,
               SUM(pi.outstanding_amount) AS outstanding
        FROM `tabPurchase Invoice` pi
        WHERE {where}
        GROUP BY month
        ORDER BY month
    """, params, as_dict=True)

    totals = frappe.db.sql(f"""
        SELECT COUNT(*) AS invoice_count,
               SUM(pi.grand_total) AS grand_total,
               SUM(pi.outstanding_amount) AS outstanding
        FROM `tabPurchase Invoice` pi
        WHERE {where}
    """, params, as_dict=True)

    return {"data": rows, "totals": totals[0] if totals else {}}


# ────────────────────────────────────────────────────────────────
# 3.  ITEM SALES REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_item_sales_report(company=None, from_date=None, to_date=None,
                          item_group=None, page=1, page_size=20):
    """Top selling items."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -12)
    to_date = to_date or nowdate()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = [
        "si.company = %(company)s",
        "si.docstatus = 1",
        "si.posting_date >= %(from_date)s",
        "si.posting_date <= %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if item_group:
        conditions.append("sii.item_group = %(item_group)s")
        params["item_group"] = item_group

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT sii.item_code)
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT sii.item_code, sii.item_name, sii.item_group,
               SUM(sii.qty) AS total_qty,
               SUM(sii.amount) AS total_amount,
               COUNT(DISTINCT si.name) AS invoice_count
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE {where}
        GROUP BY sii.item_code
        ORDER BY total_amount DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 4.  CUSTOMER LEDGER
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_customer_ledger(customer, company=None, from_date=None, to_date=None):
    """GL entries for a specific customer."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -12)
    to_date = to_date or nowdate()

    rows = frappe.db.sql("""
        SELECT gle.posting_date, gle.voucher_type, gle.voucher_no,
               gle.debit, gle.credit, gle.remarks
        FROM `tabGL Entry` gle
        WHERE gle.company = %s AND gle.party_type = 'Customer'
              AND gle.party = %s AND gle.is_cancelled = 0
              AND gle.posting_date >= %s AND gle.posting_date <= %s
        ORDER BY gle.posting_date, gle.creation
    """, (company, customer, from_date, to_date), as_dict=True)

    # Running balance
    balance = 0
    for row in rows:
        balance += flt(row.debit) - flt(row.credit)
        row["balance"] = balance

    return rows


# ────────────────────────────────────────────────────────────────
# 5.  SUPPLIER LEDGER
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_ledger(supplier, company=None, from_date=None, to_date=None):
    """GL entries for a specific supplier."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -12)
    to_date = to_date or nowdate()

    rows = frappe.db.sql("""
        SELECT gle.posting_date, gle.voucher_type, gle.voucher_no,
               gle.debit, gle.credit, gle.remarks
        FROM `tabGL Entry` gle
        WHERE gle.company = %s AND gle.party_type = 'Supplier'
              AND gle.party = %s AND gle.is_cancelled = 0
              AND gle.posting_date >= %s AND gle.posting_date <= %s
        ORDER BY gle.posting_date, gle.creation
    """, (company, supplier, from_date, to_date), as_dict=True)

    balance = 0
    for row in rows:
        balance += flt(row.credit) - flt(row.debit)
        row["balance"] = balance

    return rows


# ────────────────────────────────────────────────────────────────
# 6.  RECEIVABLE AGING
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_receivable_aging(company=None):
    """Receivable aging summary — buckets 0-30, 31-60, 61-90, 90+."""
    company = company or _default_company()
    today = nowdate()

    rows = frappe.db.sql("""
        SELECT
            SUM(CASE WHEN DATEDIFF(%s, posting_date) <= 30 THEN outstanding_amount ELSE 0 END) AS `0-30`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END) AS `31-60`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END) AS `61-90`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) > 90 THEN outstanding_amount ELSE 0 END) AS `90+`,
            SUM(outstanding_amount) AS total_outstanding
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (today, today, today, today, company), as_dict=True)

    return rows[0] if rows else {}


@frappe.whitelist()
def get_receivable_aging_detail(company=None, page=1, page_size=20):
    """Per-customer receivable aging."""
    company = company or _default_company()
    today = nowdate()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    total = frappe.db.sql("""
        SELECT COUNT(DISTINCT customer)
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))[0][0]

    rows = frappe.db.sql("""
        SELECT customer, customer_name,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) <= 30 THEN outstanding_amount ELSE 0 END) AS `0-30`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END) AS `31-60`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END) AS `61-90`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) > 90 THEN outstanding_amount ELSE 0 END) AS `90+`,
            SUM(outstanding_amount) AS total_outstanding
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
        GROUP BY customer
        ORDER BY total_outstanding DESC
        LIMIT %s OFFSET %s
    """, (today, today, today, today, company, page_size, offset), as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 7.  PAYABLE AGING
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payable_aging(company=None):
    """Payable aging summary."""
    company = company or _default_company()
    today = nowdate()

    rows = frappe.db.sql("""
        SELECT
            SUM(CASE WHEN DATEDIFF(%s, posting_date) <= 30 THEN outstanding_amount ELSE 0 END) AS `0-30`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END) AS `31-60`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END) AS `61-90`,
            SUM(CASE WHEN DATEDIFF(%s, posting_date) > 90 THEN outstanding_amount ELSE 0 END) AS `90+`,
            SUM(outstanding_amount) AS total_outstanding
        FROM `tabPurchase Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (today, today, today, today, company), as_dict=True)

    return rows[0] if rows else {}


# ────────────────────────────────────────────────────────────────
# 8.  PROFIT & LOSS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_profit_and_loss(company=None, from_date=None, to_date=None):
    """Simple P&L summary using GL Entries."""
    company = company or _default_company()

    fy = _current_fiscal_year(company)
    from_date = from_date or fy["from"]
    to_date = to_date or fy["to"]

    def _sum_gl(root_type):
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(gle.debit - gle.credit), 0)
            FROM `tabGL Entry` gle
            INNER JOIN `tabAccount` a ON a.name = gle.account
            WHERE gle.company = %s AND a.root_type = %s
                  AND gle.is_cancelled = 0
                  AND gle.posting_date >= %s AND gle.posting_date <= %s
        """, (company, root_type, from_date, to_date))
        return flt(result[0][0]) if result else 0

    total_income = abs(_sum_gl("Income"))
    total_expense = abs(_sum_gl("Expense"))

    # COGS: look for accounts with 'Cost of Goods' in name
    cogs = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(gle.debit - gle.credit), 0)
        FROM `tabGL Entry` gle
        INNER JOIN `tabAccount` a ON a.name = gle.account
        WHERE gle.company = %s AND a.root_type = 'Expense'
              AND a.name LIKE '%%Cost of Goods%%'
              AND gle.is_cancelled = 0
              AND gle.posting_date >= %s AND gle.posting_date <= %s
    """, (company, from_date, to_date))[0][0])

    gross_profit = total_income - cogs
    net_profit = total_income - total_expense

    return {
        "total_income": total_income,
        "cost_of_goods_sold": cogs,
        "gross_profit": gross_profit,
        "total_expense": total_expense,
        "net_profit": net_profit,
        "from_date": from_date,
        "to_date": to_date,
    }


# ────────────────────────────────────────────────────────────────
# 9.  GENERAL LEDGER
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_general_ledger(company=None, account=None, from_date=None, to_date=None,
                       page=1, page_size=50):
    """General Ledger report."""
    company = company or _default_company()
    from_date = from_date or add_months(nowdate(), -3)
    to_date = to_date or nowdate()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 50, 200)
    offset = (page - 1) * page_size

    conditions = [
        "gle.company = %(company)s",
        "gle.is_cancelled = 0",
        "gle.posting_date >= %(from_date)s",
        "gle.posting_date <= %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if account:
        conditions.append("gle.account = %(account)s")
        params["account"] = account

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabGL Entry` gle WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT gle.posting_date, gle.account, gle.debit, gle.credit,
               gle.voucher_type, gle.voucher_no, gle.party_type, gle.party,
               gle.remarks
        FROM `tabGL Entry` gle
        WHERE {where}
        ORDER BY gle.posting_date, gle.creation
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 10.  ACCOUNTS PAYABLE (for finance page)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_accounts_payable(company=None):
    """Payable aging summary — same structure as receivable."""
    return get_payable_aging(company)


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


def _current_fiscal_year(company):
    from erpnext.accounts.utils import get_fiscal_year
    try:
        fy = get_fiscal_year(nowdate(), company=company)
        return {"from": fy[1].isoformat(), "to": fy[2].isoformat()}
    except Exception:
        today = getdate(nowdate())
        return {
            "from": today.replace(month=1, day=1).isoformat(),
            "to": today.replace(month=12, day=31).isoformat(),
        }
