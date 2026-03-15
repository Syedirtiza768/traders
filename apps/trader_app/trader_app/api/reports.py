# -*- coding: utf-8 -*-
"""Trader App — Reports API endpoints."""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_months, flt


@frappe.whitelist()
def get_accounts_receivable(limit=50):
    """Return outstanding receivables with aging."""
    company = _get_default_company()
    today = getdate(nowdate())

    data = frappe.db.sql("""
        SELECT
            si.name as invoice,
            si.customer,
            si.customer_name,
            si.posting_date,
            si.due_date,
            si.grand_total,
            si.outstanding_amount,
            DATEDIFF(%s, si.due_date) as overdue_days
        FROM `tabSales Invoice` si
        WHERE si.company = %s
            AND si.docstatus = 1
            AND si.outstanding_amount > 0
        ORDER BY si.outstanding_amount DESC
        LIMIT %s
    """, (today, company, int(limit)), as_dict=True)

    # Add aging buckets
    for row in data:
        days = row.get("overdue_days", 0)
        if days <= 0:
            row["aging_bucket"] = "Current"
        elif days <= 30:
            row["aging_bucket"] = "1-30 Days"
        elif days <= 60:
            row["aging_bucket"] = "31-60 Days"
        elif days <= 90:
            row["aging_bucket"] = "61-90 Days"
        else:
            row["aging_bucket"] = "90+ Days"

    return data


@frappe.whitelist()
def get_accounts_payable(limit=50):
    """Return outstanding payables with aging."""
    company = _get_default_company()
    today = getdate(nowdate())

    data = frappe.db.sql("""
        SELECT
            pi.name as invoice,
            pi.supplier,
            pi.supplier_name,
            pi.posting_date,
            pi.due_date,
            pi.grand_total,
            pi.outstanding_amount,
            DATEDIFF(%s, pi.due_date) as overdue_days
        FROM `tabPurchase Invoice` pi
        WHERE pi.company = %s
            AND pi.docstatus = 1
            AND pi.outstanding_amount > 0
        ORDER BY pi.outstanding_amount DESC
        LIMIT %s
    """, (today, company, int(limit)), as_dict=True)

    for row in data:
        days = row.get("overdue_days", 0)
        if days <= 0:
            row["aging_bucket"] = "Current"
        elif days <= 30:
            row["aging_bucket"] = "1-30 Days"
        elif days <= 60:
            row["aging_bucket"] = "31-60 Days"
        elif days <= 90:
            row["aging_bucket"] = "61-90 Days"
        else:
            row["aging_bucket"] = "90+ Days"

    return data


@frappe.whitelist()
def get_profit_and_loss(from_date=None, to_date=None):
    """Return simplified profit and loss summary."""
    company = _get_default_company()
    today = nowdate()

    if not from_date:
        from_date = getdate(today).replace(month=1, day=1).isoformat()
    if not to_date:
        to_date = today

    # Revenue (Income accounts)
    revenue = frappe.db.sql("""
        SELECT COALESCE(SUM(credit - debit), 0) as total
        FROM `tabGL Entry`
        WHERE company = %s
            AND is_cancelled = 0
            AND posting_date >= %s
            AND posting_date <= %s
            AND account IN (
                SELECT name FROM `tabAccount`
                WHERE root_type = 'Income' AND company = %s
            )
    """, (company, from_date, to_date, company))
    total_revenue = flt(revenue[0][0]) if revenue else 0

    # Cost of Goods Sold
    cogs = frappe.db.sql("""
        SELECT COALESCE(SUM(debit - credit), 0) as total
        FROM `tabGL Entry`
        WHERE company = %s
            AND is_cancelled = 0
            AND posting_date >= %s
            AND posting_date <= %s
            AND account IN (
                SELECT name FROM `tabAccount`
                WHERE account_type = 'Cost of Goods Sold' AND company = %s
            )
    """, (company, from_date, to_date, company))
    total_cogs = flt(cogs[0][0]) if cogs else 0

    # Operating Expenses
    expenses = frappe.db.sql("""
        SELECT COALESCE(SUM(debit - credit), 0) as total
        FROM `tabGL Entry`
        WHERE company = %s
            AND is_cancelled = 0
            AND posting_date >= %s
            AND posting_date <= %s
            AND account IN (
                SELECT name FROM `tabAccount`
                WHERE root_type = 'Expense' AND account_type != 'Cost of Goods Sold' AND company = %s
            )
    """, (company, from_date, to_date, company))
    total_expenses = flt(expenses[0][0]) if expenses else 0

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_expenses
    gross_margin = (gross_profit / total_revenue * 100) if total_revenue else 0
    net_margin = (net_profit / total_revenue * 100) if total_revenue else 0

    return {
        "from_date": from_date,
        "to_date": to_date,
        "total_revenue": total_revenue,
        "cost_of_goods_sold": total_cogs,
        "gross_profit": gross_profit,
        "gross_margin": round(gross_margin, 1),
        "operating_expenses": total_expenses,
        "net_profit": net_profit,
        "net_margin": round(net_margin, 1),
    }


@frappe.whitelist()
def get_receivable_aging_summary():
    """Return receivable aging summary by bucket."""
    company = _get_default_company()
    today = getdate(nowdate())

    data = frappe.db.sql("""
        SELECT
            CASE
                WHEN DATEDIFF(%s, si.due_date) <= 0 THEN 'Current'
                WHEN DATEDIFF(%s, si.due_date) <= 30 THEN '1-30 Days'
                WHEN DATEDIFF(%s, si.due_date) <= 60 THEN '31-60 Days'
                WHEN DATEDIFF(%s, si.due_date) <= 90 THEN '61-90 Days'
                ELSE '90+ Days'
            END as aging_bucket,
            COUNT(*) as invoice_count,
            SUM(si.outstanding_amount) as total_outstanding
        FROM `tabSales Invoice` si
        WHERE si.company = %s
            AND si.docstatus = 1
            AND si.outstanding_amount > 0
        GROUP BY aging_bucket
        ORDER BY
            CASE aging_bucket
                WHEN 'Current' THEN 1
                WHEN '1-30 Days' THEN 2
                WHEN '31-60 Days' THEN 3
                WHEN '61-90 Days' THEN 4
                WHEN '90+ Days' THEN 5
            END
    """, (today, today, today, today, company), as_dict=True)

    return data


@frappe.whitelist()
def get_monthly_sales_report(year=None):
    """Return monthly sales summary for a given year."""
    company = _get_default_company()
    if not year:
        year = getdate(nowdate()).year

    data = frappe.db.sql("""
        SELECT
            MONTH(posting_date) as month_num,
            DATE_FORMAT(posting_date, '%%b') as month_name,
            COUNT(*) as invoice_count,
            SUM(grand_total) as total_sales,
            SUM(net_total) as net_sales,
            SUM(total_taxes_and_charges) as total_tax
        FROM `tabSales Invoice`
        WHERE company = %s
            AND docstatus = 1
            AND YEAR(posting_date) = %s
        GROUP BY MONTH(posting_date), DATE_FORMAT(posting_date, '%%b')
        ORDER BY month_num
    """, (company, year), as_dict=True)

    return data


@frappe.whitelist()
def get_supplier_balances(limit=50):
    """Return supplier-wise outstanding balances."""
    company = _get_default_company()

    data = frappe.db.sql("""
        SELECT
            pi.supplier,
            pi.supplier_name,
            SUM(pi.outstanding_amount) as total_outstanding,
            COUNT(*) as invoice_count,
            MIN(pi.posting_date) as oldest_invoice
        FROM `tabPurchase Invoice` pi
        WHERE pi.company = %s
            AND pi.docstatus = 1
            AND pi.outstanding_amount > 0
        GROUP BY pi.supplier, pi.supplier_name
        ORDER BY total_outstanding DESC
        LIMIT %s
    """, (company, int(limit)), as_dict=True)

    return data


def _get_default_company():
    company = frappe.defaults.get_defaults().get("company")
    if not company:
        company = frappe.db.get_value("Company", filters={}, fieldname="name", order_by="creation ASC")
    return company
