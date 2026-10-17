# -*- coding: utf-8 -*-
"""Sahamid-aligned commercial totals for Quotation print / preview."""

from __future__ import unicode_literals

import json

from frappe.utils import cint, flt, nowdate

GST_GOODS_RATE = 18.0
GST_SERVICES_RATE = 16.0

CLAUSE_CURRENCIES = ("usd", "aed", "euro", "pound")


def resolve_gst_rate(gst_mode, services=0):
    mode = (gst_mode or "exclusive").lower()
    if mode in ("none", ""):
        return 0.0
    return GST_SERVICES_RATE if cint(services) else GST_GOODS_RATE


def parse_clause_rates(raw):
    if not raw:
        return {}
    if isinstance(raw, str):
        try:
            raw = json.loads(raw) if raw.strip() else {}
        except Exception:
            return {}
    if not isinstance(raw, dict):
        return {}
    out = {}
    for key, value in raw.items():
        k = str(key).lower()
        if k in ("note", "as_of", "base"):
            continue
        rate = flt(value)
        if rate > 0:
            out[k] = rate
    return out


def template_tax_rate(template_name):
    """Total ``On Net Total`` rate of a Sales Taxes and Charges Template, or None when unset.

    The printed quotation uses the rate the quoted template will actually charge, so
    the print, the order and the invoice agree (legacy finding F-12).
    """
    if not template_name:
        return None
    import frappe

    rows = frappe.get_all(
        "Sales Taxes and Charges",
        filters={"parent": template_name, "parenttype": "Sales Taxes and Charges Template"},
        fields=["rate", "charge_type"],
    )
    rates = [flt(row.rate) for row in rows if row.charge_type == "On Net Total"]
    return sum(rates) if rates else None


def compute_commercial_totals(
    net,
    gst_mode="exclusive",
    services=0,
    wht_percent=0,
    rate_clause="usd",
    print_exchange="0",
    clause_rates=None,
    gst_rate_override=None,
):
    """Return net/GST/WHT/grand + optional FX columns (first-option commercial base).

    ``gst_rate_override`` replaces the default goods/services rate when the document
    carries a tax template. A ``none`` GST mode still means no tax.
    """
    net = flt(net)
    gst_mode = (gst_mode or "exclusive").lower() or "exclusive"
    gst_rate = resolve_gst_rate(gst_mode, services)
    if gst_rate and gst_rate_override is not None:
        gst_rate = flt(gst_rate_override)
    gst_amount = 0.0
    taxable_base = net
    if gst_mode == "exclusive" and gst_rate > 0:
        gst_amount = net * gst_rate / 100.0
    elif gst_mode == "inclusive" and gst_rate > 0:
        taxable_base = net / (1.0 + gst_rate / 100.0)
        gst_amount = net - taxable_base

    wht_percent = flt(wht_percent)
    wht_base = taxable_base if gst_mode == "inclusive" else net
    wht_amount = wht_base * wht_percent / 100.0 if wht_percent > 0 else 0.0
    if gst_mode == "inclusive":
        grand = net - wht_amount
    else:
        grand = net + gst_amount - wht_amount

    rate_clause = (rate_clause or "usd").lower()
    rates = parse_clause_rates(clause_rates)
    fx_rate = 1.0 if rate_clause == "pkr" else rates.get(rate_clause)
    fx_net = (net / fx_rate) if fx_rate else None
    fx_grand = (grand / fx_rate) if fx_rate else None

    return {
        "net": net,
        "gst_mode": gst_mode,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "taxable_base": taxable_base,
        "wht_percent": wht_percent,
        "wht_amount": wht_amount,
        "grand_total": grand,
        "print_exchange": str(print_exchange if print_exchange is not None else "0"),
        "rate_clause": rate_clause,
        "fx_rate": fx_rate,
        "fx_net": fx_net,
        "fx_grand": fx_grand,
        "clause_rates": rates,
    }


def snapshot_clause_rates(company=None, as_of=None):
    """Freeze foreign→PKR (base) rates for Sahamid rate-clause print."""
    from trader_app.api.company import resolve_active_company
    from trader_app.api.currency import _company_base_currency, _fetch_exchange_rate

    company = resolve_active_company(company)
    base = _company_base_currency(company)
    as_of = as_of or nowdate()
    snapshot = {"base": base, "as_of": str(as_of)}
    for code in CLAUSE_CURRENCIES:
        currency = {"euro": "EUR", "pound": "GBP"}.get(code, code.upper())
        if currency == base:
            snapshot[code] = 1.0
        else:
            snapshot[code] = flt(_fetch_exchange_rate(currency, base, as_of, for_selling=True)) or 1.0
    snapshot["pkr"] = 1.0 if base == "PKR" else flt(_fetch_exchange_rate("PKR", base, as_of, for_selling=True)) or 1.0
    return snapshot


def first_option_net_from_doc(doc):
    """Sum first-option commercial amounts (or fall back to doc.net_total)."""
    commercial = getattr(doc, "trader_commercial_options", None)
    if not commercial:
        return flt(getattr(doc, "net_total", 0) or 0)

    from trader_app.api.hierarchy import (
        effective_item_qty,
        select_first_options,
        serialize_commercial_options,
    )

    rows = serialize_commercial_options(doc)
    if not rows:
        return flt(getattr(doc, "net_total", 0) or 0)

    total = 0.0
    for row in select_first_options(rows):
        package_qty = flt(row.get("package_qty") or 1)
        for it in row.get("items") or []:
            qty = effective_item_qty(flt(it.get("unit_qty") or 0), package_qty)
            rate = flt(it.get("unit_price") or 0)
            discount = flt(it.get("discount_percent") or 0)
            total += qty * rate * (1.0 - discount / 100.0)
    return total


def commercial_totals_for_quotation(doc):
    """Build commercial totals payload for a Quotation document."""
    net = first_option_net_from_doc(doc)
    return compute_commercial_totals(
        net=net,
        gst_mode=getattr(doc, "trader_gst_mode", None) or "exclusive",
        services=getattr(doc, "trader_services", 0),
        wht_percent=getattr(doc, "trader_wht_percent", 0),
        rate_clause=getattr(doc, "trader_rate_clause", None) or "usd",
        print_exchange=getattr(doc, "trader_print_exchange", "0"),
        clause_rates=getattr(doc, "trader_clause_rates", None),
        gst_rate_override=template_tax_rate(getattr(doc, "taxes_and_charges", None)),
    )


def _whitelist(fn):
    try:
        import frappe

        return frappe.whitelist()(fn)
    except Exception:
        return fn


@_whitelist
def get_clause_rate_snapshot(company=None, as_of=None):
    """API: refresh FX clause rates snapshot for Order Details."""
    _assert_sales_module_access()
    snap = snapshot_clause_rates(company=company, as_of=as_of)
    return {"clause_rates": snap, "clause_rates_json": json.dumps(snap)}


@_whitelist
def get_customer_credit_check(customer, company=None, quote_amount=0):
    """Soft credit-limit nag (Sahamid-style visual only)."""
    _assert_sales_module_access()
    import frappe
    from trader_app.api.company import resolve_active_company

    company = resolve_active_company(company)
    quote_amount = flt(quote_amount)
    if not customer or not frappe.db.exists("Customer", customer):
        return {"ok": True, "over_limit": False}

    from trader_app.api.permissions import check_master_document_company

    check_master_document_company("Customer", customer, company, ptype="read")

    credit_limit = 0.0
    if frappe.db.exists("DocType", "Customer Credit Limit"):
        row = frappe.db.get_value(
            "Customer Credit Limit",
            {"parent": customer, "company": company},
            "credit_limit",
        )
        credit_limit = flt(row)
    if not credit_limit and frappe.db.has_column("Customer", "credit_limit"):
        credit_limit = flt(frappe.db.get_value("Customer", customer, "credit_limit"))

    outstanding = flt(
        frappe.db.sql(
            """
            SELECT COALESCE(SUM(outstanding_amount), 0)
            FROM `tabSales Invoice`
            WHERE customer = %s AND company = %s AND docstatus = 1 AND outstanding_amount > 0
            """,
            (customer, company),
        )[0][0]
    )

    projected = outstanding + quote_amount
    over = credit_limit > 0 and projected > credit_limit
    return {
        "ok": True,
        "customer": customer,
        "company": company,
        "credit_limit": credit_limit,
        "outstanding": outstanding,
        "quote_amount": quote_amount,
        "projected": projected,
        "over_limit": over,
        "message": (
            "Outstanding {0} + quote {1} exceeds credit limit {2}.".format(outstanding, quote_amount, credit_limit)
            if over
            else ""
        ),
    }


def _assert_sales_module_access():
    """Lazy API guard so pure commercial arithmetic remains importable without Bench."""
    from trader_app.api._tenant_guard import assert_module_role_access
    from trader_app.api.tenant import assert_tenant_module_enabled

    assert_module_role_access("sales")
    assert_tenant_module_enabled("sales")
