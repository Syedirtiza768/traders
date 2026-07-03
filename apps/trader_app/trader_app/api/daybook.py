# -*- coding: utf-8 -*-
"""Trader App — Day-Book & Components Reporting API.

All endpoints guard on the per-company `trader_components_enabled` flag.

Provides:
- Day-book voucher list (SI + PI + PE + JE + Stock Entry for a date)
- Day-close summary
- Component stock valuation report (grouped by category)
- AR (In-Coming) / AP (Out-Going) party lists
- One-tap party settlement (FIFO invoice allocation)
- Day-book transaction posting (sale / purchase / payment in / out)
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, flt, cint, today

from trader_app.api.company import resolve_active_company
from trader_app.api.finance import (
    _apply_bank_reference_fields,
    _apply_payment_accounts,
    _resolve_party,
    _resolve_payment_mode,
    record_invoice_payment,
)


# ────────────────────────────────────────────────────────────────
# GUARD
# ────────────────────────────────────────────────────────────────

def _assert_enabled(company):
    enabled = cint(frappe.db.get_value("Company", company, "trader_components_enabled") or 0)
    if not enabled:
        frappe.throw(
            _("Components Trading feature is not enabled for company {0}. "
              "Enable it in Settings.").format(company),
            frappe.PermissionError,
        )


# ────────────────────────────────────────────────────────────────
# 1.  DAY BOOK
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_day_book(company=None, date=None, page=1, page_size=50):
    """Chronological voucher list for a single date.

    Returns Sales Invoices, Purchase Invoices, Payment Entries,
    and Journal Entries for the given date, sorted by posting time.

    Each row includes a `voucher_type`, `voucher_no`, `party`, `amount`,
    `direction` (in/out), and `running_total` fields.
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    date = date or today()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 50, 200)
    offset = (page - 1) * page_size

    params = {"company": company, "date": date}

    voucher_union = """
        SELECT
            'Sale' AS voucher_type,
            si.name AS voucher_no,
            si.customer AS party,
            si.grand_total AS amount,
            si.outstanding_amount,
            si.status,
            si.posting_date,
            si.creation AS posted_at,
            si.docstatus,
            'in' AS direction
        FROM `tabSales Invoice` si
        WHERE si.company = %(company)s
          AND si.posting_date = %(date)s
          AND si.docstatus IN (0, 1)
          AND si.is_return = 0

        UNION ALL

        SELECT
            'Purchase' AS voucher_type,
            pi.name AS voucher_no,
            pi.supplier AS party,
            pi.grand_total AS amount,
            pi.outstanding_amount,
            pi.status,
            pi.posting_date,
            pi.creation AS posted_at,
            pi.docstatus,
            'out' AS direction
        FROM `tabPurchase Invoice` pi
        WHERE pi.company = %(company)s
          AND pi.posting_date = %(date)s
          AND pi.docstatus IN (0, 1)
          AND pi.is_return = 0

        UNION ALL

        SELECT
            CONCAT('Payment ', pe.payment_type) AS voucher_type,
            pe.name AS voucher_no,
            pe.party AS party,
            pe.paid_amount AS amount,
            0 AS outstanding_amount,
            pe.status,
            pe.posting_date,
            pe.creation AS posted_at,
            pe.docstatus,
            CASE pe.payment_type WHEN 'Receive' THEN 'in' ELSE 'out' END AS direction
        FROM `tabPayment Entry` pe
        WHERE pe.company = %(company)s
          AND pe.posting_date = %(date)s
          AND pe.docstatus IN (0, 1)

        UNION ALL

        SELECT
            'Journal' AS voucher_type,
            je.name AS voucher_no,
            '' AS party,
            je.total_debit AS amount,
            0 AS outstanding_amount,
            je.docstatus AS status,
            je.posting_date,
            je.creation AS posted_at,
            je.docstatus,
            'journal' AS direction
        FROM `tabJournal Entry` je
        WHERE je.company = %(company)s
          AND je.posting_date = %(date)s
          AND je.docstatus IN (0, 1)

        UNION ALL

        SELECT
            CONCAT('Stock ', se.stock_entry_type) AS voucher_type,
            se.name AS voucher_no,
            '' AS party,
            COALESCE(se.total_incoming_value, se.total_outgoing_value, 0) AS amount,
            0 AS outstanding_amount,
            CAST(se.docstatus AS CHAR) AS status,
            se.posting_date,
            se.creation AS posted_at,
            se.docstatus,
            CASE se.stock_entry_type
                WHEN 'Material Receipt' THEN 'in'
                WHEN 'Material Issue' THEN 'out'
                ELSE 'journal'
            END AS direction
        FROM `tabStock Entry` se
        WHERE se.company = %(company)s
          AND se.posting_date = %(date)s
          AND se.docstatus IN (0, 1)
          AND se.stock_entry_type IN (
              'Material Receipt', 'Material Issue', 'Material Transfer'
          )
    """

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM ({voucher_union}) vouchers",
        params,
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT * FROM (
            SELECT v.*,
                SUM(
                    CASE v.direction
                        WHEN 'in' THEN v.amount
                        WHEN 'out' THEN -v.amount
                        ELSE 0
                    END
                ) OVER (ORDER BY v.posted_at ASC ROWS UNBOUNDED PRECEDING) AS running_total
            FROM ({voucher_union}) v
        ) ranked
        ORDER BY posted_at ASC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    # Compute totals for the day (unfiltered by page)
    totals = _get_day_totals(company, date)

    return {
        "data": rows,
        "totals": totals,
        "total": cint(total),
        "page": page,
        "page_size": page_size,
        "date": date,
    }


def _get_day_totals(company, date):
    """Fast summary totals for the day."""
    params = {"company": company, "date": date}

    sales_total = frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) FROM `tabSales Invoice`
        WHERE company = %(company)s AND posting_date = %(date)s
          AND docstatus = 1 AND is_return = 0
    """, params)[0][0]

    purchase_total = frappe.db.sql("""
        SELECT COALESCE(SUM(grand_total), 0) FROM `tabPurchase Invoice`
        WHERE company = %(company)s AND posting_date = %(date)s
          AND docstatus = 1 AND is_return = 0
    """, params)[0][0]

    cash_in = frappe.db.sql("""
        SELECT COALESCE(SUM(paid_amount), 0) FROM `tabPayment Entry`
        WHERE company = %(company)s AND posting_date = %(date)s
          AND docstatus = 1 AND payment_type = 'Receive'
    """, params)[0][0]

    cash_out = frappe.db.sql("""
        SELECT COALESCE(SUM(paid_amount), 0) FROM `tabPayment Entry`
        WHERE company = %(company)s AND posting_date = %(date)s
          AND docstatus = 1 AND payment_type = 'Pay'
    """, params)[0][0]

    return {
        "total_sales": flt(sales_total),
        "total_purchases": flt(purchase_total),
        "cash_in": flt(cash_in),
        "cash_out": flt(cash_out),
        "net_cash": flt(cash_in) - flt(cash_out),
    }


# ────────────────────────────────────────────────────────────────
# 2.  DAY-CLOSE SUMMARY
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_day_close_summary(company=None, date=None):
    """End-of-day summary: purchases, sales, cash in/out, closing cash,
    stock value (component items), AR, AP.
    Each line traceable to the vouchers returned by get_day_book.
    """
    company = resolve_active_company(company)
    _assert_enabled(company)
    date = date or today()

    totals = _get_day_totals(company, date)

    # Closing cash = GL balance on Cash accounts as of end of day
    closing_cash = _get_cash_balance(company, date)

    # Component stock value (as of date)
    stock_value = _get_component_stock_value(company, date)

    # AR / AP (open outstanding as of date)
    ar = _get_total_outstanding(company, "Customer", date)
    ap = _get_total_outstanding(company, "Supplier", date)

    return {
        "date": date,
        "total_purchases": totals["total_purchases"],
        "total_sales": totals["total_sales"],
        "cash_in": totals["cash_in"],
        "cash_out": totals["cash_out"],
        "net_cash": totals["net_cash"],
        "closing_cash": flt(closing_cash),
        "component_stock_value": flt(stock_value),
        "total_ar": flt(ar),
        "total_ap": flt(ap),
    }


def _get_cash_balance(company, as_of_date):
    """Sum of debit - credit on Cash/Bank GL accounts up to as_of_date."""
    result = frappe.db.sql("""
        SELECT COALESCE(SUM(gl.debit - gl.credit), 0)
        FROM `tabGL Entry` gl
        INNER JOIN `tabAccount` a ON a.name = gl.account
        WHERE gl.company = %(company)s
          AND gl.is_cancelled = 0
          AND a.account_type IN ('Cash', 'Bank')
          AND gl.posting_date <= %(date)s
    """, {"company": company, "date": as_of_date})
    return flt(result[0][0]) if result else 0.0


def _get_component_stock_value(company, as_of_date=None):
    """Total stock value of component items as of a date (SLE snapshot or current Bin)."""
    as_of_date = getdate(as_of_date or today())
    if as_of_date >= getdate(today()):
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(b.stock_value), 0)
            FROM `tabBin` b
            INNER JOIN `tabItem` i ON i.name = b.item_code AND i.trader_component_item = 1
            INNER JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s
        """, {"company": company})
        return flt(result[0][0]) if result else 0.0

    result = frappe.db.sql("""
        SELECT COALESCE(SUM(sub.stock_value), 0)
        FROM (
            SELECT sle.stock_value,
                ROW_NUMBER() OVER (
                    PARTITION BY sle.item_code, sle.warehouse
                    ORDER BY sle.posting_date DESC, sle.posting_time DESC, sle.creation DESC
                ) AS rn
            FROM `tabStock Ledger Entry` sle
            INNER JOIN `tabItem` i ON i.name = sle.item_code AND i.trader_component_item = 1
            INNER JOIN `tabWarehouse` w ON w.name = sle.warehouse AND w.company = %(company)s
            WHERE sle.company = %(company)s
              AND sle.posting_date <= %(as_of_date)s
        ) sub
        WHERE sub.rn = 1
    """, {"company": company, "as_of_date": as_of_date})
    return flt(result[0][0]) if result else 0.0


def _get_party_opening_balance(party_type, party):
    if not frappe.db.has_column(party_type, "trader_opening_balance"):
        return 0.0
    return flt(frappe.db.get_value(party_type, party, "trader_opening_balance") or 0)


def _get_total_opening_balances(party_type):
    """Sum of trader_opening_balance across active parties."""
    if not frappe.db.has_column(party_type, "trader_opening_balance"):
        return 0.0
    result = frappe.db.sql(f"""
        SELECT COALESCE(SUM(trader_opening_balance), 0)
        FROM `tab{party_type}`
        WHERE disabled = 0 AND COALESCE(trader_opening_balance, 0) > 0
    """)
    return flt(result[0][0]) if result else 0.0


def _reduce_opening_balance(party_type, party, amount):
    """Apply payment remainder against trader_opening_balance. Returns amount applied."""
    if not frappe.db.has_column(party_type, "trader_opening_balance"):
        return 0.0
    amount = flt(amount)
    if amount <= 0:
        return 0.0
    current = _get_party_opening_balance(party_type, party)
    if current <= 0:
        return 0.0
    applied = min(amount, current)
    frappe.db.set_value(
        party_type, party, "trader_opening_balance", flt(current) - applied,
    )
    return applied


def _get_total_outstanding(company, party_type, as_of_date):
    """Total outstanding AR (Customers) or AP (Suppliers), incl. opening balances."""
    if party_type == "Customer":
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(outstanding_amount), 0)
            FROM `tabSales Invoice`
            WHERE company = %(company)s AND docstatus = 1
              AND outstanding_amount > 0
              AND posting_date <= %(date)s
        """, {"company": company, "date": as_of_date})
    else:
        result = frappe.db.sql("""
            SELECT COALESCE(SUM(outstanding_amount), 0)
            FROM `tabPurchase Invoice`
            WHERE company = %(company)s AND docstatus = 1
              AND outstanding_amount > 0
              AND posting_date <= %(date)s
        """, {"company": company, "date": as_of_date})
    invoice_total = flt(result[0][0]) if result else 0.0
    return invoice_total + _get_total_opening_balances(party_type)


# ────────────────────────────────────────────────────────────────
# 3.  STOCK VALUATION (grouped, notebook-style)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_component_stock_valuation(company=None, as_of_date=None):
    """Stock valuation report grouped by category, then by capacity+grade.

    Returns:
        groups: list of { category, items: [{...}], subtotal_qty, subtotal_value }
        grand_total_qty: float
        grand_total_value: float
        tiles: { in_hand_cash, total_stock_value, total_ar, total_ap }
    """
    company = resolve_active_company(company)
    _assert_enabled(company)
    as_of_date = as_of_date or today()

    rows = frappe.db.sql("""
        SELECT
            i.item_code, i.item_name,
            i.trader_component_category AS category,
            i.trader_component_form_factor AS form_factor,
            i.trader_component_capacity AS capacity,
            i.trader_component_grade AS grade,
            i.stock_uom,
            COALESCE(SUM(b.actual_qty), 0) AS qty_on_hand,
            COALESCE(SUM(b.stock_value), 0) AS stock_value,
            CASE WHEN SUM(b.actual_qty) > 0
                 THEN SUM(b.stock_value) / SUM(b.actual_qty)
                 ELSE 0 END AS valuation_rate,
            i.standard_rate
        FROM `tabItem` i
        LEFT JOIN `tabBin` b ON b.item_code = i.item_code
        LEFT JOIN `tabWarehouse` w ON w.name = b.warehouse AND w.company = %(company)s
        WHERE i.trader_component_item = 1 AND i.disabled = 0
        GROUP BY i.item_code
        ORDER BY i.trader_component_category, i.trader_component_capacity, i.trader_component_grade
    """, {"company": company}, as_dict=True)

    # Group into notebook-style structure
    groups_map = {}
    for row in rows:
        cat = row.category or "Uncategorised"
        if cat not in groups_map:
            groups_map[cat] = {"category": cat, "items": [], "subtotal_qty": 0.0, "subtotal_value": 0.0}
        groups_map[cat]["items"].append(row)
        groups_map[cat]["subtotal_qty"] += flt(row.qty_on_hand)
        groups_map[cat]["subtotal_value"] += flt(row.stock_value)

    groups = list(groups_map.values())
    grand_total_qty = sum(g["subtotal_qty"] for g in groups)
    grand_total_value = sum(g["subtotal_value"] for g in groups)

    # Headline tiles
    in_hand_cash = _get_cash_balance(company, as_of_date)
    total_ar = _get_total_outstanding(company, "Customer", as_of_date)
    total_ap = _get_total_outstanding(company, "Supplier", as_of_date)

    return {
        "as_of_date": as_of_date,
        "groups": groups,
        "grand_total_qty": flt(grand_total_qty),
        "grand_total_value": flt(grand_total_value),
        "tiles": {
            "in_hand_cash": flt(in_hand_cash),
            "total_stock_value": flt(grand_total_value),
            "total_ar": flt(total_ar),
            "total_ap": flt(total_ap),
        },
    }


# ────────────────────────────────────────────────────────────────
# 4.  IN-COMING (AR) / OUT-GOING (AP) LISTS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_incoming(company=None, page=1, page_size=20, search=None):
    """AR — customers with outstanding receivable balances (In-Coming money)."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    search_cond = ""
    params = {"company": company}
    if search:
        search_cond = (
            "AND (c.name LIKE %(search)s OR c.customer_name LIKE %(search)s "
            "OR c.trader_short_code LIKE %(search)s)"
        )
        params["search"] = f"%{search}%"

    having = (
        "COALESCE(SUM(si.outstanding_amount), 0) + COALESCE(c.trader_opening_balance, 0) > 0"
    )

    total = frappe.db.sql(f"""
        SELECT COUNT(*) FROM (
            SELECT c.name
            FROM `tabCustomer` c
            LEFT JOIN `tabSales Invoice` si
              ON si.customer = c.name
             AND si.company = %(company)s
             AND si.docstatus = 1
             AND si.outstanding_amount > 0
            WHERE c.disabled = 0
              {search_cond}
            GROUP BY c.name, c.customer_name, c.trader_short_code, c.trader_opening_balance
            HAVING {having}
        ) parties
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT
            c.name AS party,
            c.customer_name,
            COALESCE(c.trader_short_code, '') AS short_code,
            COUNT(si.name) AS open_invoices,
            COALESCE(SUM(si.outstanding_amount), 0)
                + COALESCE(c.trader_opening_balance, 0) AS total_outstanding,
            COALESCE(c.trader_opening_balance, 0) AS opening_balance,
            MIN(si.posting_date) AS oldest_invoice_date
        FROM `tabCustomer` c
        LEFT JOIN `tabSales Invoice` si
          ON si.customer = c.name
         AND si.company = %(company)s
         AND si.docstatus = 1
         AND si.outstanding_amount > 0
        WHERE c.disabled = 0
          {search_cond}
        GROUP BY c.name, c.customer_name, c.trader_short_code, c.trader_opening_balance
        HAVING {having}
        ORDER BY total_outstanding DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    grand_total = frappe.db.sql(f"""
        SELECT COALESCE(SUM(party_total), 0) FROM (
            SELECT
                COALESCE(SUM(si.outstanding_amount), 0)
                    + COALESCE(c.trader_opening_balance, 0) AS party_total
            FROM `tabCustomer` c
            LEFT JOIN `tabSales Invoice` si
              ON si.customer = c.name
             AND si.company = %(company)s
             AND si.docstatus = 1
             AND si.outstanding_amount > 0
            WHERE c.disabled = 0
              {search_cond}
            GROUP BY c.name, c.trader_opening_balance
            HAVING {having}
        ) totals
    """, params)[0][0]

    return {
        "data": rows,
        "total": cint(total),
        "grand_total": flt(grand_total),
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_outgoing(company=None, page=1, page_size=20, search=None):
    """AP — suppliers with outstanding payable balances (Out-Going money)."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    search_cond = ""
    params = {"company": company}
    if search:
        search_cond = (
            "AND (s.name LIKE %(search)s OR s.supplier_name LIKE %(search)s "
            "OR s.trader_short_code LIKE %(search)s)"
        )
        params["search"] = f"%{search}%"

    having = (
        "COALESCE(SUM(pi.outstanding_amount), 0) + COALESCE(s.trader_opening_balance, 0) > 0"
    )

    total = frappe.db.sql(f"""
        SELECT COUNT(*) FROM (
            SELECT s.name
            FROM `tabSupplier` s
            LEFT JOIN `tabPurchase Invoice` pi
              ON pi.supplier = s.name
             AND pi.company = %(company)s
             AND pi.docstatus = 1
             AND pi.outstanding_amount > 0
            WHERE s.disabled = 0
              {search_cond}
            GROUP BY s.name, s.supplier_name, s.trader_short_code, s.trader_opening_balance
            HAVING {having}
        ) parties
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT
            s.name AS party,
            s.supplier_name,
            COALESCE(s.trader_short_code, '') AS short_code,
            COUNT(pi.name) AS open_invoices,
            COALESCE(SUM(pi.outstanding_amount), 0)
                + COALESCE(s.trader_opening_balance, 0) AS total_outstanding,
            COALESCE(s.trader_opening_balance, 0) AS opening_balance,
            MIN(pi.posting_date) AS oldest_invoice_date
        FROM `tabSupplier` s
        LEFT JOIN `tabPurchase Invoice` pi
          ON pi.supplier = s.name
         AND pi.company = %(company)s
         AND pi.docstatus = 1
         AND pi.outstanding_amount > 0
        WHERE s.disabled = 0
          {search_cond}
        GROUP BY s.name, s.supplier_name, s.trader_short_code, s.trader_opening_balance
        HAVING {having}
        ORDER BY total_outstanding DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    grand_total = frappe.db.sql(f"""
        SELECT COALESCE(SUM(party_total), 0) FROM (
            SELECT
                COALESCE(SUM(pi.outstanding_amount), 0)
                    + COALESCE(s.trader_opening_balance, 0) AS party_total
            FROM `tabSupplier` s
            LEFT JOIN `tabPurchase Invoice` pi
              ON pi.supplier = s.name
             AND pi.company = %(company)s
             AND pi.docstatus = 1
             AND pi.outstanding_amount > 0
            WHERE s.disabled = 0
              {search_cond}
            GROUP BY s.name, s.trader_opening_balance
            HAVING {having}
        ) totals
    """, params)[0][0]

    return {
        "data": rows,
        "total": cint(total),
        "grand_total": flt(grand_total),
        "page": page,
        "page_size": page_size,
    }


# ────────────────────────────────────────────────────────────────
# 5.  SETTLE PARTY (one-tap payment with FIFO allocation)
# ────────────────────────────────────────────────────────────────

def _get_open_invoices(party_type, party, company):
    """Open submitted invoices for a party, oldest first."""
    if party_type == "Customer":
        return frappe.db.sql("""
            SELECT name, outstanding_amount, posting_date
            FROM `tabSales Invoice`
            WHERE customer = %(party)s
              AND company = %(company)s
              AND docstatus = 1
              AND outstanding_amount > 0
            ORDER BY posting_date ASC, creation ASC
        """, {"party": party, "company": company}, as_dict=True)

    return frappe.db.sql("""
        SELECT name, outstanding_amount, posting_date
        FROM `tabPurchase Invoice`
        WHERE supplier = %(party)s
          AND company = %(company)s
          AND docstatus = 1
          AND outstanding_amount > 0
        ORDER BY posting_date ASC, creation ASC
    """, {"party": party, "company": company}, as_dict=True)


def _payment_reference_doctype(party_type):
    return "Sales Invoice" if party_type == "Customer" else "Purchase Invoice"


def _parse_allocations(allocations):
    if allocations is None:
        return None
    if isinstance(allocations, str):
        allocations = json.loads(allocations)
    if not isinstance(allocations, list):
        return None
    return allocations


def _allocate_payment_to_invoices(pe, party_type, party, company, amount):
    """FIFO allocation across oldest open invoices. Returns unallocated remainder."""
    ref_doctype = _payment_reference_doctype(party_type)
    remaining = flt(amount)

    for inv in _get_open_invoices(party_type, party, company):
        if remaining <= 0:
            break
        alloc = min(remaining, flt(inv.outstanding_amount))
        if alloc <= 0:
            continue
        pe.append("references", {
            "reference_doctype": ref_doctype,
            "reference_name": inv.name,
            "allocated_amount": alloc,
        })
        remaining -= alloc

    return remaining


def _allocate_payment_manual(pe, party_type, party, company, amount, allocations):
    """Apply user-specified invoice allocations. Returns unallocated remainder."""
    ref_doctype = _payment_reference_doctype(party_type)
    open_map = {
        inv.name: inv for inv in _get_open_invoices(party_type, party, company)
    }
    total_allocated = 0.0

    for row in allocations:
        ref_name = (row.get("reference_name") or row.get("name") or "").strip()
        alloc = flt(row.get("allocated_amount", 0))
        if alloc <= 0:
            continue
        if not ref_name:
            frappe.throw(_("Each allocation row must include reference_name."))
        if ref_name not in open_map:
            frappe.throw(
                _("Invoice {0} is not open for this party.").format(ref_name)
            )
        outstanding = flt(open_map[ref_name].outstanding_amount)
        if alloc > outstanding + 0.005:
            frappe.throw(
                _("Allocation {0} exceeds outstanding {1} on {2}.").format(
                    alloc, outstanding, ref_name
                )
            )
        pe.append("references", {
            "reference_doctype": ref_doctype,
            "reference_name": ref_name,
            "allocated_amount": alloc,
        })
        total_allocated += alloc

    if total_allocated > flt(amount) + 0.005:
        frappe.throw(_("Total allocated amount exceeds payment amount."))

    return flt(amount) - total_allocated


def _allocate_payment(pe, party_type, party, company, amount, allocations=None):
    """Allocate payment to invoices.

    ``allocations=None`` — FIFO across open invoices.
    ``allocations=[]`` — post full amount as party advance (no invoice refs).
    ``allocations=[{...}]`` — apply explicit per-invoice rows.
    """
    if allocations is None:
        return _allocate_payment_to_invoices(pe, party_type, party, company, amount)

    parsed = _parse_allocations(allocations)
    if parsed is not None and len(parsed) == 0:
        return flt(amount)

    if parsed:
        return _allocate_payment_manual(pe, party_type, party, company, amount, parsed)

    return _allocate_payment_to_invoices(pe, party_type, party, company, amount)


def _create_settlement_payment(party_type, party, amount, company, posting_date=None,
                               mode_of_payment=None, settlement_account=None,
                               allocations=None):
    """Create and submit a Payment Entry with invoice allocation."""
    payment_type = "Receive" if party_type == "Customer" else "Pay"
    party = _resolve_party(party_type, party)
    mode_of_payment = _resolve_payment_mode(mode_of_payment or "Cash")
    posting_date = posting_date or nowdate()

    doc = frappe.new_doc("Payment Entry")
    doc.company = company
    doc.payment_type = payment_type
    doc.party_type = party_type
    doc.party = party
    doc.posting_date = posting_date
    doc.paid_amount = amount
    doc.received_amount = amount
    if mode_of_payment:
        doc.mode_of_payment = mode_of_payment

    settlement_account, _party_account = _apply_payment_accounts(
        doc,
        company,
        payment_type,
        party_type,
        party,
        mode_of_payment=mode_of_payment,
        paid_to=settlement_account if payment_type == "Receive" else None,
        paid_from=settlement_account if payment_type == "Pay" else None,
    )

    unallocated_after_invoices = _allocate_payment(
        doc, party_type, party, company, amount, allocations=allocations,
    )
    opening_applied = _reduce_opening_balance(party_type, party, unallocated_after_invoices)
    unallocated = flt(unallocated_after_invoices) - flt(opening_applied)

    fallback = doc.references[0].reference_name if doc.get("references") else party
    _apply_bank_reference_fields(doc, fallback_reference=fallback)

    doc.insert(ignore_permissions=False)
    doc.submit()
    frappe.db.commit()

    return {
        "payment_entry": doc.name,
        "amount": amount,
        "allocated_amount": flt(amount) - flt(unallocated_after_invoices),
        "opening_balance_applied": flt(opening_applied),
        "unallocated_amount": flt(unallocated),
        "settlement_account": settlement_account,
    }


@frappe.whitelist()
def settle_party(party_type, party, amount, mode_of_payment="Cash", company=None,
                 posting_date=None, settlement_account=None, allocations=None):
    """Create and submit a Payment Entry to settle a party's balance.

    When ``allocations`` is provided, applies those invoice rows; otherwise FIFO.
    Any remainder is posted as advance.
    """
    company = resolve_active_company(company)
    _assert_enabled(company)

    amount = flt(amount)
    if amount <= 0:
        frappe.throw(_("Settlement amount must be positive."))

    if party_type not in ("Customer", "Supplier"):
        frappe.throw(_("party_type must be Customer or Supplier."))

    result = _create_settlement_payment(
        party_type,
        party,
        amount,
        company,
        posting_date=posting_date,
        mode_of_payment=mode_of_payment,
        settlement_account=settlement_account,
        allocations=allocations,
    )
    return {"ok": True, **result}


@frappe.whitelist()
def get_party_open_invoices(party_type, party, company=None):
    """Open invoices for a party (oldest first) for payment allocation preview."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    if party_type not in ("Customer", "Supplier"):
        frappe.throw(_("party_type must be Customer or Supplier."))

    party = _resolve_party(party_type, party)
    rows = _get_open_invoices(party_type, party, company)
    total = sum(flt(row.outstanding_amount) for row in rows)

    opening_balance = _get_party_opening_balance(party_type, party)

    return {
        "party": party,
        "invoices": rows,
        "invoice_outstanding": flt(total),
        "opening_balance": opening_balance,
        "total_outstanding": flt(total) + opening_balance,
    }


@frappe.whitelist()
def find_or_create_party(party_type, party_name, short_code=None, company=None):
    """Resolve party by name or short code; create if missing."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    if party_type not in ("Customer", "Supplier"):
        frappe.throw(_("party_type must be Customer or Supplier."))

    party_name = (party_name or "").strip()
    short_code = (short_code or "").strip()

    if short_code and frappe.db.has_column(party_type, "trader_short_code"):
        existing = frappe.db.get_value(party_type, {"trader_short_code": short_code}, "name")
        if existing:
            return {"party": existing, "created": False}

    if not party_name:
        frappe.throw(_("Party name is required to create a new {0}.").format(party_type))

    try:
        return {"party": _resolve_party(party_type, party_name), "created": False}
    except frappe.ValidationError:
        pass

    if party_type == "Customer":
        from trader_app.api.customers import create_customer
        result = create_customer(party_name)
    else:
        from trader_app.api.suppliers import create_supplier
        result = create_supplier(party_name)

    party = result["name"]
    if short_code and frappe.db.has_column(party_type, "trader_short_code"):
        frappe.db.set_value(party_type, party, "trader_short_code", short_code)
        frappe.db.commit()

    return {"party": party, "created": True}


@frappe.whitelist()
def post_day_transaction(tx_type, party, lines=None, amount=0, mode_of_payment="Cash",
                         posting_date=None, company=None, record_payment=0,
                         payment_amount=None, settlement_account=None, invoice_type=None,
                         allocations=None):
    """Post a day-book transaction: sale, purchase, payment_in, or payment_out."""
    company = resolve_active_company(company)
    _assert_enabled(company)

    tx_type = (tx_type or "").strip().lower()
    posting_date = posting_date or nowdate()

    if tx_type in ("payment_in", "payment_out"):
        party_type = "Customer" if tx_type == "payment_in" else "Supplier"
        pay_amount = flt(amount or payment_amount)
        if pay_amount <= 0:
            frappe.throw(_("Payment amount must be positive."))
        result = _create_settlement_payment(
            party_type,
            party,
            pay_amount,
            company,
            posting_date=posting_date,
            mode_of_payment=mode_of_payment,
            settlement_account=settlement_account,
            allocations=allocations,
        )
        return {
            "ok": True,
            "tx_type": tx_type,
            "invoice": None,
            "payment_entry": result["payment_entry"],
            "grand_total": pay_amount,
            "outstanding_amount": 0,
            "allocated_amount": result["allocated_amount"],
        }

    if tx_type not in ("sale", "purchase"):
        frappe.throw(_("tx_type must be sale, purchase, payment_in, or payment_out."))

    if isinstance(lines, str):
        lines = json.loads(lines)

    if not lines:
        frappe.throw(_("At least one item line is required for {0}.").format(tx_type))

    party_type = "Customer" if tx_type == "sale" else "Supplier"
    if not party or not party.strip():
        frappe.throw(_("Select a {0}.").format(party_type.lower()))
    party = _resolve_party(party_type, party)

    if tx_type == "sale":
        from trader_app.api.sales import create_sales_invoice, submit_sales_invoice

        invoice_result = create_sales_invoice(
            customer=party,
            items=lines,
            company=company,
            posting_date=posting_date,
            due_date=posting_date,
            update_stock=1,
            invoice_type=invoice_type or "tax_invoice",
        )
        submit_sales_invoice(invoice_result["name"])
        invoice = frappe.get_doc("Sales Invoice", invoice_result["name"])
        ref_doctype = "Sales Invoice"
    else:
        from trader_app.api.purchases import create_purchase_invoice, submit_purchase_invoice

        invoice_result = create_purchase_invoice(
            supplier=party,
            items=lines,
            company=company,
            posting_date=posting_date,
            due_date=posting_date,
            update_stock=1,
            invoice_type=invoice_type or "tax_invoice",
        )
        submit_purchase_invoice(invoice_result["name"])
        invoice = frappe.get_doc("Purchase Invoice", invoice_result["name"])
        ref_doctype = "Purchase Invoice"

    payment_entry = None
    outstanding = flt(invoice.outstanding_amount)

    if cint(record_payment) and outstanding > 0:
        pay_amount = flt(payment_amount) if payment_amount else outstanding
        if pay_amount > outstanding + 0.005:
            frappe.throw(
                _("Payment amount {0} exceeds outstanding {1}.").format(pay_amount, outstanding)
            )
        pe_result = record_invoice_payment(
            reference_doctype=ref_doctype,
            reference_name=invoice.name,
            amount=pay_amount,
            mode_of_payment=mode_of_payment,
            settlement_account=settlement_account,
            posting_date=posting_date,
            submit=1,
        )
        payment_entry = pe_result.get("name")
        invoice.reload()
        outstanding = flt(invoice.outstanding_amount)

    frappe.db.commit()

    return {
        "ok": True,
        "tx_type": tx_type,
        "invoice": invoice.name,
        "payment_entry": payment_entry,
        "grand_total": flt(invoice.grand_total),
        "outstanding_amount": outstanding,
    }

from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "components")
