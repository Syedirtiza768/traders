# -*- coding: utf-8 -*-
"""Trader App — Dashboard API.

Provides all whitelisted endpoints consumed by the frontend Dashboard page.
Every function here is decorated with @frappe.whitelist() so the React UI
can call them via `frappe.call` / REST.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_months, flt, cint, now_datetime, add_days
from frappe.utils.caching import redis_cache


# ────────────────────────────────────────────────────────────────
# 1.  KPI CARDS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_kpis(company=None):
    """Return headline KPIs for the dashboard.

    Returns
    -------
    dict with keys:
        todays_sales, monthly_revenue, outstanding_receivables,
        outstanding_payables, stock_value, low_stock_items,
        total_customers, total_orders_today, quotations_awaiting_conversion,
        sales_orders_with_unpaid_invoices, purchase_orders_with_unpaid_invoices,
        currency
    """
    try:
        company = company or _default_company()
        currency = frappe.get_cached_value("Company", company, "default_currency") or "PKR"
        today = nowdate()
        first_of_month = getdate(today).replace(day=1).isoformat()

    # Today's sales
    todays_sales = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0)
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND posting_date = %s
    """, (company, today))[0][0])

    # Monthly revenue
    monthly_revenue = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0)
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1
              AND posting_date >= %s AND posting_date <= %s
    """, (company, first_of_month, today))[0][0])

    # Outstanding receivables
    outstanding_receivables = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0)
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))[0][0])

    # Outstanding payables
    outstanding_payables = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(outstanding_amount), 0)
        FROM `tabPurchase Invoice`
        WHERE company = %s AND docstatus = 1 AND outstanding_amount > 0
    """, (company,))[0][0])

    # Stock value
    stock_value = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(stock_value), 0)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s
    """, (company,))[0][0])

    # Low stock items (below reorder level or < 10 qty)
    low_stock_items = cint(frappe.db.sql("""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s AND b.actual_qty > 0 AND b.actual_qty < 10
    """, (company,))[0][0])

    # Total active customers
    total_customers = cint(frappe.db.count("Customer", {"disabled": 0}))

    # Today's order count
    total_orders_today = cint(frappe.db.sql("""
        SELECT COUNT(*)
        FROM `tabSales Invoice`
        WHERE company = %s AND docstatus = 1 AND posting_date = %s
    """, (company, today))[0][0])

    # Count submitted/open Quotations not yet converted to a Sales Order.
    # ERPNext v15 links Quotations to Sales Orders via tabSales Order Item.prevdoc_docname,
    # not via a direct column on tabSales Order — so we use that child table instead.
    quotations_awaiting_conversion = cint(frappe.db.sql("""
        SELECT COUNT(*)
        FROM `tabQuotation` q
        WHERE q.company = %s AND q.docstatus IN (0, 1)
          AND NOT EXISTS (
              SELECT 1
              FROM `tabSales Order Item` soi
              INNER JOIN `tabSales Order` so ON so.name = soi.parent
              WHERE soi.prevdoc_docname = q.name AND so.docstatus < 2
          )
    """, (company,))[0][0])

    # Sales Orders that have at least one outstanding (unpaid) Sales Invoice.
    # In ERPNext v15 the SO→SI link lives on tabSales Invoice Item.sales_order,
    # NOT as a direct column on tabSales Invoice.
    sales_orders_with_unpaid_invoices = cint(frappe.db.sql("""
        SELECT COUNT(DISTINCT so.name)
        FROM `tabSales Order` so
        INNER JOIN `tabSales Invoice Item` sii ON sii.sales_order = so.name
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE so.company = %s
          AND so.docstatus IN (0, 1)
          AND si.docstatus = 1
          AND si.outstanding_amount > 0
    """, (company,))[0][0])

    # Purchase Orders that have at least one outstanding (unpaid) Purchase Invoice.
    # Same pattern — link is on tabPurchase Invoice Item.purchase_order.
    purchase_orders_with_unpaid_invoices = cint(frappe.db.sql("""
        SELECT COUNT(DISTINCT po.name)
        FROM `tabPurchase Order` po
        INNER JOIN `tabPurchase Invoice Item` pii ON pii.purchase_order = po.name
        INNER JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
        WHERE po.company = %s
          AND po.docstatus IN (0, 1)
          AND pi.docstatus = 1
          AND pi.outstanding_amount > 0
    """, (company,))[0][0])

        return {
            "todays_sales": todays_sales,
            "monthly_revenue": monthly_revenue,
            "outstanding_receivables": outstanding_receivables,
            "outstanding_payables": outstanding_payables,
            "stock_value": stock_value,
            "low_stock_items": low_stock_items,
            "total_customers": total_customers,
            "total_orders_today": total_orders_today,
            "quotations_awaiting_conversion": quotations_awaiting_conversion,
            "sales_orders_with_unpaid_invoices": sales_orders_with_unpaid_invoices,
            "purchase_orders_with_unpaid_invoices": purchase_orders_with_unpaid_invoices,
            "currency": currency,
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Dashboard get_kpis failed")
        return {
            "todays_sales": 0,
            "monthly_revenue": 0,
            "outstanding_receivables": 0,
            "outstanding_payables": 0,
            "stock_value": 0,
            "low_stock_items": 0,
            "total_customers": 0,
            "total_orders_today": 0,
            "quotations_awaiting_conversion": 0,
            "sales_orders_with_unpaid_invoices": 0,
            "purchase_orders_with_unpaid_invoices": 0,
            "currency": "PKR",
        }


# ────────────────────────────────────────────────────────────────
# 2.  SALES TREND (monthly bar chart)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_trend(company=None, months=12):
    """Monthly revenue for the last *months* months."""
    try:
        company = company or _default_company()
        months = cint(months) or 12
        start = add_months(nowdate(), -months)

        rows = frappe.db.sql("""
            SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
                   SUM(grand_total) AS total
            FROM `tabSales Invoice`
            WHERE company = %s AND docstatus = 1 AND posting_date >= %s
            GROUP BY month
            ORDER BY month
        """, (company, start), as_dict=True)

        return rows
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Dashboard get_sales_trend failed")
        return []


# ────────────────────────────────────────────────────────────────
# 3.  TOP CUSTOMERS (pie chart)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_top_customers(company=None, limit=8):
    """Top N customers by total revenue this fiscal year."""
    try:
        company = company or _default_company()
        limit = cint(limit) or 8

        fy = _current_fiscal_year(company)

        rows = frappe.db.sql("""
            SELECT si.customer AS customer_name,
                   SUM(si.grand_total) AS total_revenue
            FROM `tabSales Invoice` si
            WHERE si.company = %s AND si.docstatus = 1
                  AND si.posting_date >= %s AND si.posting_date <= %s
            GROUP BY si.customer
            ORDER BY total_revenue DESC
            LIMIT %s
        """, (company, fy["from"], fy["to"], limit), as_dict=True)

        return rows
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Dashboard get_top_customers failed")
        return []


# ────────────────────────────────────────────────────────────────
# 4.  RECENT ORDERS (table)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_recent_orders(company=None, limit=10):
    """Most recent Sales Invoices."""
    try:
        company = company or _default_company()
        limit = cint(limit) or 10

        rows = frappe.db.sql("""
            SELECT name, customer AS customer_name,
                   posting_date AS transaction_date,
                   grand_total, outstanding_amount,
                   CASE
                       WHEN docstatus = 0 THEN 'Draft'
                       WHEN docstatus = 2 THEN 'Cancelled'
                       WHEN outstanding_amount <= 0 THEN 'Paid'
                       WHEN outstanding_amount < grand_total THEN 'Partly Paid'
                       ELSE 'Unpaid'
                   END AS status
            FROM `tabSales Invoice`
            WHERE company = %s AND docstatus IN (0, 1)
            ORDER BY posting_date DESC, creation DESC
            LIMIT %s
        """, (company, limit), as_dict=True)

        return rows
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Dashboard get_recent_orders failed")
        return []


# ────────────────────────────────────────────────────────────────
# 5.  CASH-FLOW SUMMARY (Finance page)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_cash_flow_summary(company=None, months=12):
    """Monthly inflow / outflow for the Finance page."""
    company = company or _default_company()
    months = cint(months) or 12
    start = add_months(nowdate(), -months)

    inflow = frappe.db.sql("""
        SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
               SUM(paid_amount) AS amount
        FROM `tabPayment Entry`
        WHERE company = %s AND docstatus = 1
              AND payment_type = 'Receive' AND posting_date >= %s
        GROUP BY month
    """, (company, start), as_dict=True)

    outflow = frappe.db.sql("""
        SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
               SUM(paid_amount) AS amount
        FROM `tabPayment Entry`
        WHERE company = %s AND docstatus = 1
              AND payment_type = 'Pay' AND posting_date >= %s
        GROUP BY month
    """, (company, start), as_dict=True)

    inflow_map = {r.month: flt(r.amount) for r in inflow}
    outflow_map = {r.month: flt(r.amount) for r in outflow}

    all_months = sorted(set(list(inflow_map.keys()) + list(outflow_map.keys())))

    return {
        "monthly": [
            {"month": m, "inflow": inflow_map.get(m, 0), "outflow": outflow_map.get(m, 0)}
            for m in all_months
        ]
    }


# ────────────────────────────────────────────────────────────────
# 6.  INVENTORY SUMMARY WIDGET
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_inventory_summary(company=None):
    """Summary widget for the dashboard — stock distribution by warehouse."""
    company = company or _default_company()

    rows = frappe.db.sql("""
        SELECT w.name AS warehouse,
               COUNT(DISTINCT b.item_code) AS item_count,
               COALESCE(SUM(b.actual_qty), 0) AS total_qty,
               COALESCE(SUM(b.stock_value), 0) AS stock_value
        FROM `tabWarehouse` w
        LEFT JOIN `tabBin` b ON b.warehouse = w.name
        WHERE w.company = %s AND w.is_group = 0
        GROUP BY w.name
        ORDER BY stock_value DESC
    """, (company,), as_dict=True)

    return rows


# ────────────────────────────────────────────────────────────────
# 7.  REFRESH CACHE (scheduler)
# ────────────────────────────────────────────────────────────────

def refresh_dashboard_cache():
    """Called by scheduler every 15 min to warm the dashboard cache."""
    for company in frappe.get_all("Company", pluck="name"):
        try:
            get_kpis(company=company)
        except Exception:
            pass


# ────────────────────────────────────────────────────────────────
#    HELPERS
# ────────────────────────────────────────────────────────────────

def _default_company():
    """Return the first active company."""
    companies = frappe.get_all("Company", limit=1, pluck="name")
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or (companies[0] if companies else None)
    )


def _current_fiscal_year(company):
    """Return dict with 'from' and 'to' for the current fiscal year."""
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
