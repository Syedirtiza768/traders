# -*- coding: utf-8 -*-
"""Trader App — Document Printing / PDF Generation API.

Generates printable document views for:
  - Quotations
  - Sales Orders
  - Sales Invoices (Tax Invoice, Commercial Invoice, Proforma Invoice)

Supports two viewing modes:
  - External (client-facing): grouped/bundle items show only the
    overarching description
  - Internal (staff-facing): shows both bundle description AND
    individual sub-items
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import flt, cint, nowdate, getdate, fmt_money

from trader_app.api.company import assert_document_company_access, resolve_active_company
from trader_app.api.invoice_types import print_format_for_doc, print_title_for_format


# ────────────────────────────────────────────────────────────────
# 1.  DOCUMENT DATA FOR PRINT
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_print_data(doctype, name, view_mode="external", doc_format=None, format=None):
    """Return structured data for printing a document.

    Parameters
    ----------
    doctype : str     — "Quotation", "Sales Order", or "Sales Invoice"
    name : str        — Document name
    view_mode : str   — "external" or "internal"
    doc_format : str  — format key, or "auto" to infer from doctype/classification
    format : str      — alias for doc_format (SPA historically sent this name)
    """
    if doctype not in ("Quotation", "Sales Order", "Sales Invoice", "Delivery Note", "Purchase Invoice"):
        frappe.throw(_("Unsupported document type: {0}").format(doctype))

    doc = frappe.get_doc(doctype, name)
    doc.check_permission("read")
    assert_document_company_access(doc.company)

    doc_format = doc_format or format or "auto"
    if not doc_format or doc_format == "auto":
        doc_format = print_format_for_doc(doc)

    company = doc.company or resolve_active_company()
    company_doc = frappe.get_doc("Company", company)

    # Build structured items — applying view mode filtering
    items = _build_print_items(doc, view_mode)

    # Company info + optional letterhead from tenant branding
    company_info = {
        "name": company_doc.name,
        "abbr": company_doc.abbr,
        "address": _get_company_address(company),
        "phone": company_doc.phone_no or "",
        "email": company_doc.email or "",
        "website": company_doc.website or "",
        "tax_id": company_doc.tax_id or "",
        "country": company_doc.country or "Pakistan",
    }
    letterhead = _get_company_letterhead(company_doc)
    company_info.update(letterhead)

    # Customer/Party info
    party_info = _get_party_info(doc, doctype)

    # Taxes
    taxes = []
    if hasattr(doc, "taxes") and doc.taxes:
        for tax in doc.taxes:
            taxes.append({
                "description": tax.description or "",
                "rate": flt(tax.rate),
                "tax_amount": flt(tax.tax_amount),
                "total": flt(tax.total),
                "charge_type": tax.charge_type or "",
            })

    # Build the document title based on format
    doc_title = _get_document_title(doctype, doc_format, doc.name)

    bank_payment = _get_bank_payment_info(doc, doctype)

    commercial = []
    if doctype == "Quotation" and getattr(doc, "trader_commercial_options", None):
        from trader_app.api.hierarchy import serialize_commercial_options
        commercial = serialize_commercial_options(doc)
        if commercial:
            items = _build_print_items_from_hierarchy(commercial, view_mode)

    return {
        "doc_title": doc_title,
        "doc_format": doc_format,
        "view_mode": view_mode,
        "doctype": doctype,
        "name": doc.name,
        "status": _get_doc_status(doc),
        "date": str(doc.posting_date if hasattr(doc, "posting_date") else doc.transaction_date),
        "due_date": str(getattr(doc, "due_date", "") or getattr(doc, "valid_till", "") or ""),
        "currency": doc.currency or "PKR",
        "company": company_info,
        "party": party_info,
        "customer_ref": getattr(doc, "trader_customer_ref", None) or "",
        "revision_label": getattr(doc, "trader_revision_label", None) or "",
        "revision_of": getattr(doc, "trader_revision_of", None) or "",
        "project": getattr(doc, "trader_opportunity", None) or "",
        "order_details": {
            "validity_days": getattr(doc, "trader_validity_days", None),
            "pay_advance_pct": getattr(doc, "trader_pay_advance_pct", None),
            "pay_delivery_pct": getattr(doc, "trader_pay_delivery_pct", None),
            "pay_commissioning_pct": getattr(doc, "trader_pay_commissioning_pct", None),
            "pay_after_pct": getattr(doc, "trader_pay_after_pct", None),
            "pay_after_days": getattr(doc, "trader_pay_after_days", None),
            "gst_mode": getattr(doc, "trader_gst_mode", None) or "",
            "services": cint(getattr(doc, "trader_services", 0) or 0),
            "wht_percent": getattr(doc, "trader_wht_percent", None),
            "freight_clause": getattr(doc, "trader_freight_clause", None) or "",
            "rate_clause": getattr(doc, "trader_rate_clause", None) or "",
            "rate_validity": str(getattr(doc, "trader_rate_validity", "") or ""),
            "print_exchange": str(getattr(doc, "trader_print_exchange", "0") or "0"),
            "warehouse": getattr(doc, "trader_warehouse", None) or "",
        } if doctype == "Quotation" else {},
        "commercial_options": commercial,
        "items": items,
        "taxes": taxes,
        "net_total": flt(doc.net_total),
        "total_taxes": flt(getattr(doc, "total_taxes_and_charges", 0)),
        "grand_total": flt(doc.grand_total),
        "rounded_total": flt(getattr(doc, "rounded_total", 0)),
        "outstanding_amount": flt(getattr(doc, "outstanding_amount", 0)),
        "paid_amount": flt(getattr(doc, "paid_amount", 0)),
        "in_words": getattr(doc, "in_words", "") or "",
        "terms": getattr(doc, "terms", "") or "",
        "remarks": getattr(doc, "remarks", "") or "",
        "printed_on": nowdate(),
        "bank_payment": bank_payment,
    }


def _build_print_items(doc, view_mode):
    """Build the items list for printing.

    In external mode, bundled items show only the bundle description.
    In internal mode, both the bundle and sub-items are shown.
    """
    items = []
    if not hasattr(doc, "items"):
        return items

    for item in doc.items:
        item_data = {
            "item_code": item.item_code or "",
            "item_name": item.item_name or "",
            "description": item.description or item.item_name or "",
            "qty": flt(item.qty),
            "rate": flt(item.rate),
            "amount": flt(item.amount),
            "uom": getattr(item, "uom", "") or getattr(item, "stock_uom", "") or "Nos",
            "is_bundle": 0,
            "bundle_items": [],
            "line_no": None,
            "option_no": None,
            "option_text": "",
            "is_alternate_option": 0,
        }

        # Check if this item has bundle metadata in custom fields
        bundle_name = getattr(item, "bundle_ref", None) or ""
        bundle_desc = getattr(item, "bundle_description", None) or ""

        if bundle_name or bundle_desc:
            item_data["is_bundle"] = 1
            item_data["bundle_description"] = bundle_desc or item_data["description"]

            if view_mode == "internal":
                # Load sub-items from the bundle reference
                if bundle_name and frappe.db.exists("Item Bundle", bundle_name):
                    bundle_doc = frappe.get_doc("Item Bundle", bundle_name)
                    item_data["bundle_items"] = [
                        {
                            "item_code": bi.item_code,
                            "qty": flt(bi.qty),
                            "rate": flt(bi.rate),
                            "amount": flt(bi.amount),
                        }
                        for bi in bundle_doc.items
                    ]
            elif view_mode == "external":
                # External mode: override description to show only bundle desc
                item_data["description"] = bundle_desc or item_data["description"]
                item_data["item_name"] = bundle_desc or item_data["item_name"]

        items.append(item_data)

    return items


def _build_print_items_from_hierarchy(commercial, view_mode):
    """Print rows from Line→Option→Item. External keeps option text; internal expands items."""
    from trader_app.api.hierarchy import copy_commercial_options, effective_item_qty, select_first_options

    rows = copy_commercial_options(commercial)
    first_by_line = {
        r["line_no"]: r["option_no"] for r in select_first_options(rows)
    }
    items = []
    for row in rows:
        line_no = row.get("line_no")
        option_no = row.get("option_no")
        is_first = first_by_line.get(line_no) == option_no
        package_qty = flt(row.get("package_qty") or 1)
        option_label = row.get("option_text") or ("Option {0}".format(option_no) if option_no else "")
        client_req = row.get("client_requirements") or ""

        if view_mode == "external":
            # One printable row per option (customer-facing)
            amount = 0.0
            rate = 0.0
            qty = package_qty
            desc_parts = []
            if client_req:
                desc_parts.append(client_req)
            if option_label and option_no and option_no > 1 or (option_label and "Option" in str(option_label)):
                desc_parts.append(option_label)
            for it in row.get("items") or []:
                unit_qty = flt(it.get("unit_qty") or 1)
                unit_price = flt(it.get("unit_price") or 0)
                discount = flt(it.get("discount_percent") or 0)
                amount += unit_qty * package_qty * unit_price * (1.0 - discount / 100.0)
                rate = unit_price
                if it.get("description"):
                    desc_parts.append(it.get("description"))
                elif it.get("item_code"):
                    desc_parts.append(it.get("item_code"))
            items.append({
                "item_code": "",
                "item_name": option_label or client_req,
                "description": "\n".join(desc_parts) if desc_parts else (option_label or client_req),
                "qty": qty,
                "rate": rate,
                "amount": amount if is_first else 0.0,
                "uom": "Nos",
                "is_bundle": 1 if len(row.get("items") or []) > 1 else 0,
                "bundle_items": [],
                "line_no": line_no,
                "option_no": option_no,
                "option_text": option_label,
                "is_alternate_option": 0 if is_first else 1,
            })
        else:
            for it in row.get("items") or []:
                unit_qty = flt(it.get("unit_qty") or 1)
                qty = effective_item_qty(unit_qty, package_qty)
                unit_price = flt(it.get("unit_price") or 0)
                discount = flt(it.get("discount_percent") or 0)
                amount = qty * unit_price * (1.0 - discount / 100.0)
                items.append({
                    "item_code": it.get("item_code") or "",
                    "item_name": it.get("item_code") or "",
                    "description": it.get("description") or it.get("item_code") or "",
                    "qty": qty,
                    "rate": unit_price,
                    "amount": amount if is_first else 0.0,
                    "uom": "Nos",
                    "is_bundle": 0,
                    "bundle_items": [],
                    "line_no": line_no,
                    "option_no": option_no,
                    "option_text": option_label,
                    "is_alternate_option": 0 if is_first else 1,
                })
    return items


def _get_party_info(doc, doctype):
    """Extract customer/party info from the document."""
    if doctype == "Quotation":
        party_name = doc.party_name or ""
        party_display = doc.customer_name or party_name
        link_doctype = "Customer"
    elif doctype == "Purchase Invoice":
        party_name = doc.supplier or ""
        party_display = doc.supplier_name or party_name
        link_doctype = "Supplier"
    else:
        party_name = doc.customer or ""
        party_display = doc.customer_name or party_name
        link_doctype = "Customer"

    address = ""
    if party_name:
        # Get primary address
        addr = frappe.db.get_value(
            "Dynamic Link",
            {"link_doctype": link_doctype, "link_name": party_name, "parenttype": "Address"},
            "parent",
        )
        if addr:
            addr_doc = frappe.get_doc("Address", addr)
            parts = [
                addr_doc.address_line1 or "",
                addr_doc.address_line2 or "",
                addr_doc.city or "",
                addr_doc.state or "",
                addr_doc.country or "",
            ]
            address = ", ".join(p for p in parts if p)

    return {
        "name": party_name,
        "display_name": party_display,
        "address": address,
        "tax_id": "",
    }


def _get_bank_payment_info(doc, doctype):
    """Preferred bank account for customer remittance (Sales Invoice)."""
    if doctype != "Sales Invoice":
        return None
    account = getattr(doc, "preferred_bank_account", None) or ""
    if not account or not frappe.db.exists("Account", account):
        return None

    account_name = frappe.get_cached_value("Account", account, "account_name") or account
    info = {
        "account": account,
        "account_name": account_name,
        "bank": "",
        "iban": "",
        "branch_code": "",
        "account_no": "",
    }

    if frappe.db.has_column("Account", "account_number"):
        info["account_no"] = frappe.get_cached_value("Account", account, "account_number") or ""

    if frappe.db.exists("DocType", "Bank Account"):
        bank_row = frappe.db.get_value(
            "Bank Account",
            {"account": account, "is_company_account": 1},
            ["bank", "bank_account_no", "iban", "branch_code"],
            as_dict=True,
        )
        if bank_row:
            info["bank"] = bank_row.get("bank") or ""
            info["account_no"] = info["account_no"] or bank_row.get("bank_account_no") or ""
            info["iban"] = bank_row.get("iban") or ""
            info["branch_code"] = bank_row.get("branch_code") or ""

    return info


def _get_company_address(company):
    """Get the company's primary address."""
    addr = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Company", "link_name": company, "parenttype": "Address"},
        "parent",
    )
    if addr:
        addr_doc = frappe.get_doc("Address", addr)
        parts = [
            addr_doc.address_line1 or "",
            addr_doc.address_line2 or "",
            addr_doc.city or "",
            addr_doc.state or "",
            addr_doc.country or "",
        ]
        return ", ".join(p for p in parts if p)
    return ""


def _public_file_url(path):
    """Normalize a File URL for browser/print use."""
    if not path:
        return ""
    path = str(path).strip()
    if path.startswith("http://") or path.startswith("https://") or path.startswith("/"):
        return path
    return "/" + path.lstrip("/")


def _get_company_letterhead(company_doc):
    """Optional letterhead images from Trader Tenant branding / logo.

    Branding keys (JSON on Trader Tenant.branding):
      - letterhead_header: wide wordmark for print header
      - letterhead_footer: contact strip for print footer
    Logo (Trader Tenant.logo): compact mark for SPA + optional print fallback.
    """
    out = {
        "logo": "",
        "letterhead_header": "",
        "letterhead_footer": "",
    }
    tenant = getattr(company_doc, "trader_tenant", None)
    if not tenant or not frappe.db.exists("Trader Tenant", tenant):
        return out

    logo = frappe.db.get_value("Trader Tenant", tenant, "logo") or ""
    branding_raw = frappe.db.get_value("Trader Tenant", tenant, "branding") or {}
    if isinstance(branding_raw, str):
        try:
            branding_raw = json.loads(branding_raw) if branding_raw else {}
        except Exception:
            branding_raw = {}
    branding = branding_raw if isinstance(branding_raw, dict) else {}

    out["logo"] = _public_file_url(logo)
    out["letterhead_header"] = _public_file_url(
        branding.get("letterhead_header") or branding.get("header_image") or ""
    )
    out["letterhead_footer"] = _public_file_url(
        branding.get("letterhead_footer") or branding.get("footer_image") or ""
    )
    return out


def _get_document_title(doctype, doc_format, doc_name):
    """Return the appropriate document title based on doctype / format."""
    # Doctype wins for commercial docs so Quotation never prints as TAX INVOICE.
    if doctype == "Quotation":
        return "QUOTATION"
    if doctype == "Sales Order":
        return "ORDER CONFIRMATION"
    if doctype == "Delivery Note":
        return "DELIVERY CHALLAN"
    title = print_title_for_format(doc_format, doctype)
    return title or "INVOICE"


def _get_doc_status(doc):
    """Return a human-readable status."""
    if doc.docstatus == 0:
        return "Draft"
    if doc.docstatus == 2:
        return "Cancelled"
    if hasattr(doc, "status") and doc.status:
        return doc.status
    return "Submitted"
