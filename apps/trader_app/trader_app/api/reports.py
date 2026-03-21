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
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.get_all("Company", limit=1, pluck="name")[0]
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


def _date_range(from_date, to_date, default_months=12):
    return (
        from_date or add_months(nowdate(), -default_months),
        to_date or nowdate(),
    )


def _paginate(page, page_size, max_size=200):
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, max_size)
    return page, page_size, (page - 1) * page_size


def _safe_pct(numerator, denominator):
    return round(flt(numerator) / flt(denominator) * 100, 2) if flt(denominator) else 0


def _csv_response(columns, rows, filename="report.csv"):
    """Return a CSV download response if format=csv was requested."""
    import csv
    import io
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    frappe.response["filecontent"] = output.getvalue()
    frappe.response["filename"] = filename
    frappe.response["type"] = "download"


# ────────────────────────────────────────────────────────────────
# 11.  SALES PERFORMANCE REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_performance_report(company=None, from_date=None, to_date=None,
                                  customer=None, item_code=None, item_group=None,
                                  brand=None, sales_person=None, group_by='month',
                                  sort_by='net_sales', sort_order='desc',
                                  page=1, page_size=20, format=None):
    """Sales performance — groupable by month, customer, item, item_group, brand, sales_person."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    page, page_size, offset = _paginate(page, page_size)

    allowed_groups = {
        'month': "DATE_FORMAT(si.posting_date, '%%Y-%%m')",
        'customer': 'si.customer',
        'item': 'sii.item_code',
        'item_group': 'sii.item_group',
        'brand': 'i.brand',
        'sales_person': 'COALESCE(st.sales_person, "Unassigned")',
    }
    group_expr = allowed_groups.get(group_by, allowed_groups['month'])
    dim_alias = 'dimension'

    conditions = [
        "si.company = %(company)s",
        "si.docstatus = 1",
        "si.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if customer:
        conditions.append("si.customer = %(customer)s")
        params["customer"] = customer
    if item_code:
        conditions.append("sii.item_code = %(item_code)s")
        params["item_code"] = item_code
    if item_group:
        conditions.append("sii.item_group = %(item_group)s")
        params["item_group"] = item_group
    if brand:
        conditions.append("i.brand = %(brand)s")
        params["brand"] = brand

    where = " AND ".join(conditions)

    joins = """
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabItem` i ON i.name = sii.item_code
    """
    if group_by == 'sales_person' or sales_person:
        joins += " LEFT JOIN `tabSales Team` st ON st.parent = si.name AND st.parenttype = 'Sales Invoice'"
        if sales_person:
            conditions.append("st.sales_person = %(sales_person)s")
            params["sales_person"] = sales_person
            where = " AND ".join(conditions)

    # Summary
    summary = frappe.db.sql(f"""
        SELECT
            COALESCE(SUM(sii.amount), 0) AS net_sales,
            COALESCE(SUM(sii.qty * sii.rate), 0) AS gross_sales,
            COALESCE(SUM(sii.qty * sii.rate) - SUM(sii.amount), 0) AS discount_amount,
            COALESCE(SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS cogs,
            COALESCE(SUM(sii.amount) - SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS gross_profit,
            COALESCE(SUM(sii.qty), 0) AS qty,
            COUNT(DISTINCT si.name) AS invoice_count
        {joins}
        WHERE {where}
    """, params, as_dict=True)[0]
    summary['gross_margin_pct'] = _safe_pct(summary['gross_profit'], summary['net_sales'])

    # Chart data (always by month)
    chart = frappe.db.sql(f"""
        SELECT DATE_FORMAT(si.posting_date, '%%Y-%%m') AS label,
               COALESCE(SUM(sii.amount), 0) AS net_sales,
               COALESCE(SUM(sii.amount) - SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS gross_profit
        {joins}
        WHERE {where}
        GROUP BY label
        ORDER BY label
    """, params, as_dict=True)

    allowed_sort = ['net_sales', 'gross_profit', 'gross_margin_pct', 'qty', 'invoice_count', 'dimension']
    order_col = sort_by if sort_by in allowed_sort else 'net_sales'
    order_dir = 'ASC' if sort_order == 'asc' else 'DESC'

    total = frappe.db.sql(f"""
        SELECT COUNT(*) FROM (
            SELECT {group_expr} AS dim
            {joins}
            WHERE {where}
            GROUP BY dim
        ) sub
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT {group_expr} AS dimension,
               COALESCE(SUM(sii.qty), 0) AS qty,
               COALESCE(SUM(sii.amount), 0) AS net_sales,
               COALESCE(SUM(sii.qty * sii.rate), 0) AS gross_sales,
               COALESCE(SUM(sii.qty * sii.rate) - SUM(sii.amount), 0) AS discount_amount,
               COALESCE(SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS cogs,
               COALESCE(SUM(sii.amount) - SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS gross_profit,
               COUNT(DISTINCT si.name) AS invoice_count
        {joins}
        WHERE {where}
        GROUP BY dimension
        ORDER BY {order_col} {order_dir}
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        row['gross_margin_pct'] = _safe_pct(row['gross_profit'], row['net_sales'])
        row['avg_selling_price'] = round(flt(row['net_sales']) / flt(row['qty']), 2) if flt(row['qty']) else 0

    if format == 'csv':
        cols = ['dimension', 'qty', 'net_sales', 'gross_sales', 'discount_amount', 'cogs', 'gross_profit', 'gross_margin_pct', 'invoice_count', 'avg_selling_price']
        _csv_response(cols, rows, 'sales_performance.csv')
        return

    return {"summary": summary, "chart": chart, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 12.  CUSTOMER PROFITABILITY REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_customer_profitability_report(company=None, from_date=None, to_date=None,
                                       customer_group=None, territory=None,
                                       page=1, page_size=20, format=None):
    """Customer profitability — revenue, GP, margins, outstanding, payment days."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    page, page_size, offset = _paginate(page, page_size)

    conditions = [
        "si.company = %(company)s",
        "si.docstatus = 1",
        "si.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if customer_group:
        conditions.append("c.customer_group = %(customer_group)s")
        params["customer_group"] = customer_group
    if territory:
        conditions.append("c.territory = %(territory)s")
        params["territory"] = territory

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT si.customer)
        FROM `tabSales Invoice` si
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT si.customer,
               si.customer_name,
               COALESCE(SUM(sii.amount), 0) AS revenue,
               COALESCE(SUM(sii.amount) - SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS gross_profit,
               COALESCE(SUM(sii.qty * COALESCE(sii.valuation_rate, 0)), 0) AS cogs,
               COUNT(DISTINCT si.name) AS invoice_count,
               COALESCE(SUM(si.outstanding_amount), 0) AS outstanding_amount,
               c.credit_limit
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
        WHERE {where}
        GROUP BY si.customer
        ORDER BY revenue DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        row['gross_margin_pct'] = _safe_pct(row['gross_profit'], row['revenue'])
        cl = flt(row.get('credit_limit'))
        row['credit_utilization_pct'] = _safe_pct(row['outstanding_amount'], cl) if cl else None

    if format == 'csv':
        cols = ['customer', 'customer_name', 'revenue', 'gross_profit', 'gross_margin_pct', 'outstanding_amount', 'invoice_count']
        _csv_response(cols, rows, 'customer_profitability.csv')
        return

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 13.  STOCK AGING REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_stock_aging_report(company=None, warehouse=None, item_group=None,
                           brand=None, page=1, page_size=20, format=None):
    """Stock aging — bucket by days since last inward transaction."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)

    conditions = ["w.company = %(company)s", "b.actual_qty > 0"]
    params = {"company": company}

    if warehouse:
        conditions.append("b.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group
    if brand:
        conditions.append("i.brand = %(brand)s")
        params["brand"] = brand

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
    """, params)[0][0]

    summary = frappe.db.sql(f"""
        SELECT COALESCE(SUM(b.stock_value), 0) AS total_value,
               COALESCE(SUM(b.actual_qty), 0) AS total_qty,
               COUNT(DISTINCT b.item_code) AS item_count
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
    """, params, as_dict=True)[0]

    rows = frappe.db.sql(f"""
        SELECT b.item_code, i.item_name, i.item_group, i.brand,
               b.warehouse,
               b.actual_qty AS current_qty,
               b.valuation_rate,
               b.stock_value,
               sle.last_inward_date,
               sle.last_sale_date,
               DATEDIFF(CURDATE(), COALESCE(sle.last_inward_date, '2000-01-01')) AS age_days
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        LEFT JOIN (
            SELECT item_code, warehouse,
                   MAX(CASE WHEN actual_qty > 0 THEN posting_date END) AS last_inward_date,
                   MAX(CASE WHEN actual_qty < 0 THEN posting_date END) AS last_sale_date
            FROM `tabStock Ledger Entry`
            WHERE is_cancelled = 0
            GROUP BY item_code, warehouse
        ) sle ON sle.item_code = b.item_code AND sle.warehouse = b.warehouse
        WHERE {where}
        ORDER BY age_days DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        age = cint(row.get('age_days', 0))
        if age <= 30: row['bucket'] = '0-30'
        elif age <= 60: row['bucket'] = '31-60'
        elif age <= 90: row['bucket'] = '61-90'
        elif age <= 180: row['bucket'] = '91-180'
        else: row['bucket'] = '180+'

    if format == 'csv':
        cols = ['item_code', 'item_name', 'item_group', 'warehouse', 'current_qty', 'valuation_rate', 'stock_value', 'age_days', 'bucket']
        _csv_response(cols, rows, 'stock_aging.csv')
        return

    # Bucket summary for chart
    bucket_summary = {'0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0}
    for row in rows:
        bucket_summary[row['bucket']] = bucket_summary.get(row['bucket'], 0) + flt(row['stock_value'])

    chart = [{'bucket': k, 'stock_value': v} for k, v in bucket_summary.items()]

    return {"summary": summary, "chart": chart, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 14.  INVENTORY MOVEMENT REPORT (Fast/Slow/Non-Moving)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_inventory_movement_report(company=None, warehouse=None, item_group=None,
                                   brand=None, page=1, page_size=20, format=None):
    """Classify inventory as fast, slow, or non-moving based on sales velocity."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)
    today = nowdate()
    d30 = add_months(today, -1)
    d90 = add_months(today, -3)

    conditions = ["w.company = %(company)s", "b.actual_qty > 0"]
    params = {"company": company, "d30": d30, "d90": d90}

    if warehouse:
        conditions.append("b.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group
    if brand:
        conditions.append("i.brand = %(brand)s")
        params["brand"] = brand

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT b.item_code, i.item_name, i.item_group, i.brand,
               SUM(b.actual_qty) AS stock_qty,
               SUM(b.stock_value) AS stock_value,
               s30.sold_qty_30d,
               s90.sold_qty_90d,
               last_sale.last_sale_date,
               DATEDIFF(CURDATE(), last_sale.last_sale_date) AS days_since_last_sale
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        LEFT JOIN (
            SELECT sii.item_code, COALESCE(SUM(sii.qty), 0) AS sold_qty_30d
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.docstatus = 1 AND si.company = %(company)s AND si.posting_date >= %(d30)s
            GROUP BY sii.item_code
        ) s30 ON s30.item_code = b.item_code
        LEFT JOIN (
            SELECT sii.item_code, COALESCE(SUM(sii.qty), 0) AS sold_qty_90d
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.docstatus = 1 AND si.company = %(company)s AND si.posting_date >= %(d90)s
            GROUP BY sii.item_code
        ) s90 ON s90.item_code = b.item_code
        LEFT JOIN (
            SELECT sii.item_code, MAX(si.posting_date) AS last_sale_date
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.docstatus = 1 AND si.company = %(company)s
            GROUP BY sii.item_code
        ) last_sale ON last_sale.item_code = b.item_code
        WHERE {where}
        GROUP BY b.item_code
        ORDER BY stock_value DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        s30 = flt(row.get('sold_qty_30d'))
        s90 = flt(row.get('sold_qty_90d'))
        days = cint(row.get('days_since_last_sale'))
        if s30 > 0:
            row['movement_class'] = 'fast'
        elif s90 > 0:
            row['movement_class'] = 'slow'
        else:
            row['movement_class'] = 'non_moving'

    class_counts = {'fast': 0, 'slow': 0, 'non_moving': 0}
    class_values = {'fast': 0, 'slow': 0, 'non_moving': 0}
    for row in rows:
        mc = row['movement_class']
        class_counts[mc] += 1
        class_values[mc] += flt(row['stock_value'])

    summary = {
        'total_items': cint(total),
        'fast_count': class_counts['fast'],
        'slow_count': class_counts['slow'],
        'non_moving_count': class_counts['non_moving'],
        'fast_value': class_values['fast'],
        'slow_value': class_values['slow'],
        'non_moving_value': class_values['non_moving'],
    }

    chart = [
        {'label': 'Fast Moving', 'count': class_counts['fast'], 'value': class_values['fast']},
        {'label': 'Slow Moving', 'count': class_counts['slow'], 'value': class_values['slow']},
        {'label': 'Non-Moving', 'count': class_counts['non_moving'], 'value': class_values['non_moving']},
    ]

    if format == 'csv':
        cols = ['item_code', 'item_name', 'item_group', 'stock_qty', 'stock_value', 'sold_qty_30d', 'sold_qty_90d', 'days_since_last_sale', 'movement_class']
        _csv_response(cols, rows, 'inventory_movement.csv')
        return

    return {"summary": summary, "chart": chart, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 15.  REORDER REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_reorder_report(company=None, warehouse=None, item_group=None,
                       page=1, page_size=20, format=None):
    """Items with stock cover analysis and reorder recommendations."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)
    d30 = add_months(nowdate(), -1)

    conditions = ["w.company = %(company)s", "b.actual_qty > 0"]
    params = {"company": company, "d30": d30}

    if warehouse:
        conditions.append("b.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT b.item_code, i.item_name, i.item_group,
               SUM(b.actual_qty) AS current_stock,
               SUM(b.reserved_qty) AS reserved_stock,
               SUM(b.actual_qty) - SUM(COALESCE(b.reserved_qty, 0)) AS available_stock,
               s30.sold_qty_30d,
               ir.warehouse_reorder_level AS reorder_level,
               ir.warehouse_reorder_qty AS reorder_qty,
               ir.lead_time AS lead_time_days,
               d.default_supplier AS preferred_supplier
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        LEFT JOIN `tabItem Reorder` ir ON ir.parent = i.name AND ir.warehouse = b.warehouse
        LEFT JOIN `tabItem Default` d ON d.parent = i.name AND d.company = %(company)s
        LEFT JOIN (
            SELECT sii.item_code, COALESCE(SUM(sii.qty), 0) AS sold_qty_30d
            FROM `tabSales Invoice Item` sii
            INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
            WHERE si.docstatus = 1 AND si.company = %(company)s AND si.posting_date >= %(d30)s
            GROUP BY sii.item_code
        ) s30 ON s30.item_code = b.item_code
        WHERE {where}
        GROUP BY b.item_code
        ORDER BY available_stock ASC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        avg_daily = flt(row.get('sold_qty_30d', 0)) / 30
        row['avg_daily_sales'] = round(avg_daily, 2)
        avail = flt(row.get('available_stock', 0))
        row['days_of_cover'] = round(avail / avg_daily, 1) if avg_daily else 9999
        rl = flt(row.get('reorder_level', 0))
        lt = cint(row.get('lead_time_days', 0))
        lt_demand = avg_daily * lt
        row['suggested_reorder'] = max(round(rl + lt_demand - avail, 0), 0) if rl else None
        if avail <= 0:
            row['stock_status'] = 'stockout'
        elif row['days_of_cover'] < 7:
            row['stock_status'] = 'critical'
        elif row['days_of_cover'] < 14:
            row['stock_status'] = 'low'
        else:
            row['stock_status'] = 'healthy'

    summary = {
        'total_items': cint(total),
        'stockout': sum(1 for r in rows if r['stock_status'] == 'stockout'),
        'critical': sum(1 for r in rows if r['stock_status'] == 'critical'),
        'low': sum(1 for r in rows if r['stock_status'] == 'low'),
        'healthy': sum(1 for r in rows if r['stock_status'] == 'healthy'),
    }

    if format == 'csv':
        cols = ['item_code', 'item_name', 'current_stock', 'available_stock', 'avg_daily_sales', 'days_of_cover', 'reorder_level', 'suggested_reorder', 'preferred_supplier', 'stock_status']
        _csv_response(cols, rows, 'reorder_report.csv')
        return

    return {"summary": summary, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 16.  SUPPLIER SCORECARD REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_scorecard_report(company=None, from_date=None, to_date=None,
                                   supplier=None, page=1, page_size=20, format=None):
    """Supplier scorecard — cost, delivery, and quality metrics."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    page, page_size, offset = _paginate(page, page_size)

    conditions = [
        "pi.company = %(company)s",
        "pi.docstatus = 1",
        "pi.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if supplier:
        conditions.append("pi.supplier = %(supplier)s")
        params["supplier"] = supplier

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT pi.supplier)
        FROM `tabPurchase Invoice` pi
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT pi.supplier, pi.supplier_name,
               COALESCE(SUM(pii.amount), 0) AS purchase_value,
               COALESCE(SUM(pii.qty), 0) AS total_qty,
               COUNT(DISTINCT pi.name) AS invoice_count,
               COALESCE(SUM(pi.outstanding_amount), 0) AS payable_outstanding
        FROM `tabPurchase Invoice Item` pii
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
        WHERE {where}
        GROUP BY pi.supplier
        ORDER BY purchase_value DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        row['avg_rate'] = round(flt(row['purchase_value']) / flt(row['total_qty']), 2) if flt(row['total_qty']) else 0

    if format == 'csv':
        cols = ['supplier', 'supplier_name', 'purchase_value', 'total_qty', 'avg_rate', 'invoice_count', 'payable_outstanding']
        _csv_response(cols, rows, 'supplier_scorecard.csv')
        return

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 17.  PURCHASE PRICE VARIANCE REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_price_variance_report(company=None, from_date=None, to_date=None,
                                        supplier=None, item_code=None, item_group=None,
                                        page=1, page_size=20, format=None):
    """Purchase price variance — detect cost drift per item/supplier."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    page, page_size, offset = _paginate(page, page_size)

    conditions = [
        "pi.company = %(company)s",
        "pi.docstatus = 1",
        "pi.posting_date BETWEEN %(from_date)s AND %(to_date)s",
    ]
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if supplier:
        conditions.append("pi.supplier = %(supplier)s")
        params["supplier"] = supplier
    if item_code:
        conditions.append("pii.item_code = %(item_code)s")
        params["item_code"] = item_code
    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT CONCAT(pii.item_code, '||', pi.supplier))
        FROM `tabPurchase Invoice Item` pii
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
        LEFT JOIN `tabItem` i ON i.name = pii.item_code
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT pii.item_code, pii.item_name, i.item_group,
               pi.supplier, pi.supplier_name,
               COALESCE(SUM(pii.qty), 0) AS qty,
               COALESCE(SUM(pii.amount), 0) AS purchase_value,
               ROUND(SUM(pii.amount) / NULLIF(SUM(pii.qty), 0), 2) AS avg_rate,
               MIN(pii.rate) AS min_rate,
               MAX(pii.rate) AS max_rate
        FROM `tabPurchase Invoice Item` pii
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
        LEFT JOIN `tabItem` i ON i.name = pii.item_code
        WHERE {where}
        GROUP BY pii.item_code, pi.supplier
        ORDER BY purchase_value DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        min_r = flt(row.get('min_rate'))
        max_r = flt(row.get('max_rate'))
        row['price_spread'] = round(max_r - min_r, 2)
        row['variance_pct'] = _safe_pct(max_r - min_r, min_r) if min_r else 0

    if format == 'csv':
        cols = ['item_code', 'item_name', 'supplier', 'qty', 'purchase_value', 'avg_rate', 'min_rate', 'max_rate', 'price_spread', 'variance_pct']
        _csv_response(cols, rows, 'purchase_price_variance.csv')
        return

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 18.  RECEIVABLE AGING — INVOICE DETAIL
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_receivable_aging_invoice_detail(company=None, customer=None,
                                         bucket=None, page=1, page_size=20, format=None):
    """Invoice-level receivable aging detail."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)
    today = nowdate()

    conditions = [
        "si.company = %(company)s",
        "si.docstatus = 1",
        "si.outstanding_amount > 0",
    ]
    params = {"company": company, "today": today}

    if customer:
        conditions.append("si.customer = %(customer)s")
        params["customer"] = customer

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(*) FROM `tabSales Invoice` si WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT si.name AS invoice_no, si.customer, si.customer_name,
               si.posting_date, si.due_date,
               si.grand_total, si.outstanding_amount,
               DATEDIFF(%(today)s, si.due_date) AS age_days
        FROM `tabSales Invoice` si
        WHERE {where}
        ORDER BY age_days DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        age = cint(row.get('age_days', 0))
        if age <= 30: row['bucket'] = '0-30'
        elif age <= 60: row['bucket'] = '31-60'
        elif age <= 90: row['bucket'] = '61-90'
        else: row['bucket'] = '90+'

    if bucket:
        rows = [r for r in rows if r.get('bucket') == bucket]

    summary = frappe.db.sql(f"""
        SELECT
            SUM(CASE WHEN DATEDIFF(%(today)s, si.due_date) <= 30 THEN si.outstanding_amount ELSE 0 END) AS `0-30`,
            SUM(CASE WHEN DATEDIFF(%(today)s, si.due_date) BETWEEN 31 AND 60 THEN si.outstanding_amount ELSE 0 END) AS `31-60`,
            SUM(CASE WHEN DATEDIFF(%(today)s, si.due_date) BETWEEN 61 AND 90 THEN si.outstanding_amount ELSE 0 END) AS `61-90`,
            SUM(CASE WHEN DATEDIFF(%(today)s, si.due_date) > 90 THEN si.outstanding_amount ELSE 0 END) AS `90+`,
            SUM(si.outstanding_amount) AS total_outstanding,
            COUNT(*) AS invoice_count
        FROM `tabSales Invoice` si
        WHERE {where}
    """, params, as_dict=True)[0]

    if format == 'csv':
        cols = ['invoice_no', 'customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'age_days', 'bucket']
        _csv_response(cols, rows, 'receivable_aging_detail.csv')
        return

    return {"summary": summary, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 19.  PAYABLE AGING — INVOICE DETAIL
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payable_aging_invoice_detail(company=None, supplier=None,
                                      bucket=None, page=1, page_size=20, format=None):
    """Invoice-level payable aging detail."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)
    today = nowdate()

    conditions = [
        "pi.company = %(company)s",
        "pi.docstatus = 1",
        "pi.outstanding_amount > 0",
    ]
    params = {"company": company, "today": today}

    if supplier:
        conditions.append("pi.supplier = %(supplier)s")
        params["supplier"] = supplier

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(*) FROM `tabPurchase Invoice` pi WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT pi.name AS bill_no, pi.supplier, pi.supplier_name,
               pi.posting_date, pi.due_date,
               pi.grand_total, pi.outstanding_amount,
               DATEDIFF(%(today)s, pi.due_date) AS age_days
        FROM `tabPurchase Invoice` pi
        WHERE {where}
        ORDER BY age_days DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        age = cint(row.get('age_days', 0))
        if age <= 30: row['bucket'] = '0-30'
        elif age <= 60: row['bucket'] = '31-60'
        elif age <= 90: row['bucket'] = '61-90'
        else: row['bucket'] = '90+'

    if bucket:
        rows = [r for r in rows if r.get('bucket') == bucket]

    summary = frappe.db.sql(f"""
        SELECT
            SUM(CASE WHEN DATEDIFF(%(today)s, pi.due_date) <= 30 THEN pi.outstanding_amount ELSE 0 END) AS `0-30`,
            SUM(CASE WHEN DATEDIFF(%(today)s, pi.due_date) BETWEEN 31 AND 60 THEN pi.outstanding_amount ELSE 0 END) AS `31-60`,
            SUM(CASE WHEN DATEDIFF(%(today)s, pi.due_date) BETWEEN 61 AND 90 THEN pi.outstanding_amount ELSE 0 END) AS `61-90`,
            SUM(CASE WHEN DATEDIFF(%(today)s, pi.due_date) > 90 THEN pi.outstanding_amount ELSE 0 END) AS `90+`,
            SUM(pi.outstanding_amount) AS total_outstanding,
            COUNT(*) AS invoice_count
        FROM `tabPurchase Invoice` pi
        WHERE {where}
    """, params, as_dict=True)[0]

    if format == 'csv':
        cols = ['bill_no', 'supplier', 'supplier_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'age_days', 'bucket']
        _csv_response(cols, rows, 'payable_aging_detail.csv')
        return

    return {"summary": summary, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 20.  TAX SUMMARY REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_tax_summary_report(company=None, from_date=None, to_date=None, format=None):
    """Tax summary — output tax (sales) vs input tax (purchases)."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    params = {"company": company, "from_date": from_date, "to_date": to_date}

    output_tax = frappe.db.sql("""
        SELECT stc.account_head AS tax_account,
               stc.description AS tax_template,
               COALESCE(SUM(stc.tax_amount), 0) AS tax_amount,
               COALESCE(SUM(stc.base_total), 0) AS taxable_amount,
               COUNT(DISTINCT si.name) AS invoice_count
        FROM `tabSales Taxes and Charges` stc
        INNER JOIN `tabSales Invoice` si ON si.name = stc.parent
        WHERE si.company = %(company)s AND si.docstatus = 1
              AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY stc.account_head, stc.description
    """, params, as_dict=True)

    input_tax = frappe.db.sql("""
        SELECT ptc.account_head AS tax_account,
               ptc.description AS tax_template,
               COALESCE(SUM(ptc.tax_amount), 0) AS tax_amount,
               COALESCE(SUM(ptc.base_total), 0) AS taxable_amount,
               COUNT(DISTINCT pi.name) AS invoice_count
        FROM `tabPurchase Taxes and Charges` ptc
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = ptc.parent
        WHERE pi.company = %(company)s AND pi.docstatus = 1
              AND pi.posting_date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY ptc.account_head, ptc.description
    """, params, as_dict=True)

    total_output = sum(flt(r['tax_amount']) for r in output_tax)
    total_input = sum(flt(r['tax_amount']) for r in input_tax)

    summary = {
        'output_tax': total_output,
        'input_tax': total_input,
        'net_tax_payable': total_output - total_input,
        'from_date': from_date,
        'to_date': to_date,
    }

    if format == 'csv':
        all_rows = [{'type': 'Output', **r} for r in output_tax] + [{'type': 'Input', **r} for r in input_tax]
        cols = ['type', 'tax_account', 'tax_template', 'taxable_amount', 'tax_amount', 'invoice_count']
        _csv_response(cols, all_rows, 'tax_summary.csv')
        return

    return {"summary": summary, "output_tax": output_tax, "input_tax": input_tax}


# ────────────────────────────────────────────────────────────────
# 21.  OPEN PURCHASE ORDERS REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_open_purchase_orders_report(company=None, supplier=None, warehouse=None,
                                     page=1, page_size=20, format=None):
    """Open purchase order items — pending receipt."""
    company = company or _default_company()
    page, page_size, offset = _paginate(page, page_size)

    conditions = [
        "po.company = %(company)s",
        "po.docstatus = 1",
        "po.status NOT IN ('Completed', 'Closed', 'Cancelled')",
        "poi.received_qty < poi.qty",
    ]
    params = {"company": company}

    if supplier:
        conditions.append("po.supplier = %(supplier)s")
        params["supplier"] = supplier
    if warehouse:
        conditions.append("poi.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(*)
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT po.name AS po_no, po.supplier, po.supplier_name,
               po.transaction_date, poi.item_code, poi.item_name,
               poi.qty AS ordered_qty, poi.received_qty,
               (poi.qty - poi.received_qty) AS pending_qty,
               poi.rate,
               (poi.qty - poi.received_qty) * poi.rate AS pending_value,
               poi.schedule_date,
               DATEDIFF(CURDATE(), poi.schedule_date) AS delay_days
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE {where}
        ORDER BY delay_days DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    summary = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT po.name) AS order_count,
               COALESCE(SUM((poi.qty - poi.received_qty) * poi.rate), 0) AS total_pending_value,
               COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), poi.schedule_date) > 0
                            THEN (poi.qty - poi.received_qty) * poi.rate ELSE 0 END), 0) AS delayed_value
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE {where}
    """, params, as_dict=True)[0]

    if format == 'csv':
        cols = ['po_no', 'supplier', 'item_code', 'item_name', 'ordered_qty', 'received_qty', 'pending_qty', 'rate', 'pending_value', 'schedule_date', 'delay_days']
        _csv_response(cols, rows, 'open_purchase_orders.csv')
        return

    return {"summary": summary, "data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 22.  COLLECTION EFFICIENCY REPORT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_collection_efficiency_report(company=None, from_date=None, to_date=None,
                                      group_by='month', page=1, page_size=20, format=None):
    """Collection efficiency — billed vs collected by period or customer."""
    company = company or _default_company()
    from_date, to_date = _date_range(from_date, to_date)
    page, page_size, offset = _paginate(page, page_size)

    params = {"company": company, "from_date": from_date, "to_date": to_date}

    if group_by == 'customer':
        dim_expr = 'si.customer'
    else:
        dim_expr = "DATE_FORMAT(si.posting_date, '%%Y-%%m')"

    rows = frappe.db.sql(f"""
        SELECT {dim_expr} AS dimension,
               COALESCE(SUM(si.grand_total), 0) AS billed_amount,
               COALESCE(SUM(si.grand_total - si.outstanding_amount), 0) AS collected_amount,
               COALESCE(SUM(si.outstanding_amount), 0) AS outstanding_amount,
               COUNT(DISTINCT si.name) AS invoice_count
        FROM `tabSales Invoice` si
        WHERE si.company = %(company)s AND si.docstatus = 1
              AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY dimension
        ORDER BY billed_amount DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    for row in rows:
        row['efficiency_pct'] = _safe_pct(row['collected_amount'], row['billed_amount'])

    total_billed = sum(flt(r['billed_amount']) for r in rows)
    total_collected = sum(flt(r['collected_amount']) for r in rows)
    summary = {
        'total_billed': total_billed,
        'total_collected': total_collected,
        'total_outstanding': total_billed - total_collected,
        'overall_efficiency_pct': _safe_pct(total_collected, total_billed),
    }

    if format == 'csv':
        cols = ['dimension', 'billed_amount', 'collected_amount', 'outstanding_amount', 'efficiency_pct', 'invoice_count']
        _csv_response(cols, rows, 'collection_efficiency.csv')
        return

    return {"summary": summary, "data": rows, "total": len(rows), "page": page, "page_size": page_size}
