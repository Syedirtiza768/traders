# -*- coding: utf-8 -*-
"""Trader App — Dashboard API endpoints.

Provides aggregated KPI data for the custom Trader UI dashboard.
All methods are whitelisted for authenticated users.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_months, flt, fmt_money


@frappe.whitelist()
def get_dashboard_kpis():
    """Return all dashboard KPI values for the current company."""
    company = _get_default_company()
    today = nowdate()
    first_of_month = getdate(today).replace(day=1).isoformat()

    return {
        "todays_sales": _get_todays_sales(company, today),
        "monthly_revenue": _get_monthly_revenue(company, first_of_month, today),
        "outstanding_receivables": _get_outstanding_receivables(company),
        "outstanding_payables": _get_outstanding_payables(company),
        "stock_value": _get_stock_value(company),
        "low_stock_items": _get_low_stock_count(company),
        "total_customers": _get_total_customers(company),
        "total_orders_today": _get_todays_order_count(company, today),
        "currency": frappe.get_cached_value("Company", company, "default_currency") or "PKR",
        "company": company,
    }


@frappe.whitelist()
def get_sales_trend():
    """Return monthly sales totals for the last 12 months."""
    company = _get_default_company()
    today = getdate(nowdate())
    start_date = add_months(today, -11).replace(day=1)

    data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(posting_date, '%%Y-%%m') as month,
            SUM(grand_total) as total,
            COUNT(*) as count
        FROM `tabSales Invoice`
        WHERE company = %s
            AND docstatus = 1
            AND posting_date >= %s
            AND posting_date <= %s
        GROUP BY DATE_FORMAT(posting_date, '%%Y-%%m')
        ORDER BY month ASC
    """, (company, start_date, today), as_dict=True)

    return data


@frappe.whitelist()
def get_top_customers(limit=10):
    """Return top customers by revenue in the current fiscal year."""
    company = _get_default_company()
    fiscal_year = frappe.defaults.get_defaults().get("fiscal_year")

    data = frappe.db.sql("""
        SELECT
            si.customer as customer,
            si.customer_name as customer_name,
            SUM(si.grand_total) as total_revenue,
            COUNT(*) as invoice_count
        FROM `tabSales Invoice` si
        WHERE si.company = %s
            AND si.docstatus = 1
            AND si.fiscal_year = %s
        GROUP BY si.customer
        ORDER BY total_revenue DESC
        LIMIT %s
    """, (company, fiscal_year, int(limit)), as_dict=True)

    return data


@frappe.whitelist()
def get_recent_orders(limit=20):
    """Return the most recent sales orders."""
    company = _get_default_company()

    data = frappe.db.sql("""
        SELECT
            name,
            customer,
            customer_name,
            grand_total,
            status,
            transaction_date,
            delivery_date
        FROM `tabSales Order`
        WHERE company = %s
            AND docstatus < 2
        ORDER BY creation DESC
        LIMIT %s
    """, (company, int(limit)), as_dict=True)

    return data


@frappe.whitelist()
def get_sales_by_item_group():
    """Return sales breakdown by item group."""
    company = _get_default_company()
    fiscal_year = frappe.defaults.get_defaults().get("fiscal_year")

    data = frappe.db.sql("""
        SELECT
            sii.item_group,
            SUM(sii.amount) as total_amount,
            SUM(sii.qty) as total_qty
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.company = %s
            AND si.docstatus = 1
            AND si.fiscal_year = %s
        GROUP BY sii.item_group
        ORDER BY total_amount DESC
    """, (company, fiscal_year), as_dict=True)

    return data


@frappe.whitelist()
def get_cash_flow_summary():
    """Return cash flow summary for the current month."""
    company = _get_default_company()
    today = getdate(nowdate())
    first_of_month = today.replace(day=1).isoformat()

    inflow = frappe.db.sql("""
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM `tabPayment Entry`
        WHERE company = %s
            AND docstatus = 1
            AND payment_type = 'Receive'
            AND posting_date >= %s
            AND posting_date <= %s
    """, (company, first_of_month, today), as_dict=True)[0].total

    outflow = frappe.db.sql("""
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM `tabPayment Entry`
        WHERE company = %s
            AND docstatus = 1
            AND payment_type = 'Pay'
            AND posting_date >= %s
            AND posting_date <= %s
    """, (company, first_of_month, today), as_dict=True)[0].total

    return {
        "inflow": flt(inflow),
        "outflow": flt(outflow),
        "net": flt(inflow) - flt(outflow),
    }


# --------------------------------------------------------------------------
# Helper Functions
# --------------------------------------------------------------------------

def _get_default_company():
    """Get the default company or the first company."""
    company = frappe.defaults.get_defaults().get("company")
    if not company:
        company = frappe.db.get_value("Company", filters={}, fieldname="name", order_by="creation ASC")
    return company


def _get_todays_sales(company, today):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND posting_date = %s
    """, (company, today))
    return flt(result[0][0]) if result else 0


def _get_monthly_revenue(company, start_date, end_date):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1
            AND posting_date >= %s AND posting_date <= %s
    """, (company, start_date, end_date))
    return flt(result[0][0]) if result else 0


def _get_outstanding_receivables(company):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) as total
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))
    return flt(result[0][0]) if result else 0


def _get_outstanding_payables(company):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0) as total
        FROM `tabPurchase Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))
    return flt(result[0][0]) if result else 0


def _get_stock_value(company):
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(stock_value), 0) as total
        FROM `tabBin`
        WHERE warehouse IN (
            SELECT name FROM `tabWarehouse` WHERE company = %s
        )
    """, (company,))
    return flt(result[0][0]) if result else 0


def _get_low_stock_count(company):
    result = frappe.db.sql("""
        SELECT COUNT(DISTINCT item_code) as count
        FROM `tabBin` b
        WHERE b.actual_qty < 10
            AND b.actual_qty > 0
            AND b.warehouse IN (
                SELECT name FROM `tabWarehouse` WHERE company = %s
            )
    """, (company,))
    return int(result[0][0]) if result else 0


def _get_total_customers(company):
    result = frappe.db.sql("""
        SELECT COUNT(*) as count
        FROM `tabCustomer`
        WHERE disabled = 0
    """)
    return int(result[0][0]) if result else 0


def _get_todays_order_count(company, today):
    result = frappe.db.sql("""
        SELECT COUNT(*) as count
        FROM `tabSales Order`
        WHERE company = %s AND docstatus = 1 AND transaction_date = %s
    """, (company, today))
    return int(result[0][0]) if result else 0
