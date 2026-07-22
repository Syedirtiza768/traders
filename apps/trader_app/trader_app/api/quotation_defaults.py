# -*- coding: utf-8 -*-
"""Electrence quotation defaults (terms + Order Details) and sample seed helpers."""

from __future__ import unicode_literals

import json

from frappe.utils import add_days, cint, flt, nowdate

ELECTRENCE_QUOTATION_TERMS = """In case of multiple options amounts of first option is considered
Quoted Prices are Valid for 5 working days
Payment: 50% Advance with Purchase Order and 50% after 30 Days
Our prices are based on USD, If there is a depreciation in PKR greater than 3%, the difference will be charged from customer.
Partial Deliveries and Partial Invoicing Applicable.
All Products supplied are BRAND NEW which are warranted against defects in design, workmanship, and materials.
The following conditions will VOID the warranty: • Misuse or mishandling of component. • Modification or repair of the component. • Fault/ Wrong installation of component.
No returns will be accepted after 5 days from delivery date.
The Company reserves the right to invoke the force majeure clause
This is system generated document and does not require a signature"""

# Sahamid-aligned Order Details defaults for the electrence pack / sample quote.
ELECTRENCE_ORDER_DETAILS = {
    "validity_days": 5,
    "pay_advance_pct": 50,
    "pay_delivery_pct": 0,
    "pay_commissioning_pct": 0,
    "pay_after_pct": 50,
    "pay_after_days": 30,
    "gst_mode": "exclusive",
    "services": 0,
    "wht_percent": 0,
    "freight_clause": "EXW",
    "rate_clause": "usd",
    "print_exchange": "0",
    "default_stock_status": "Ex-Stock (Subject to Prior Sale)",
}


SAMPLE_ITEMS = [
    {
        "item_code": "OFC-12C-SM-GYXTW",
        "item_name": "CABLE FIBER OPTIC (OFC) 12 Core Single Mode",
        "description": (
            "CABLE FIBER OPTIC (OFC). SINGLE MODE\n"
            "12 Core Single Mode Optical Fiber Cable\n"
            "Type: GYXTW Fiber: ITU-T G.652D\n"
            "Armour: Corrugated Steel Tape\n"
            "Outdoor / Direct burial or duct installation\n"
            "Drum length: 1000meter\n"
            "Make: Corning (Data Sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 450,
    },
    {
        "item_code": "BELDEN-9842NH",
        "item_name": "Cable EIA RS-485 Belden 9842NH",
        "description": (
            "Cable EIA RS-485 Cable, 24 AWG stranded (7x32) tinned copper conductors, "
            "polyethylene insulation, 2 twisted pairs, overall Beldfoil (100% coverage) + "
            "tinned copper braid shield (90% coverage), 24 AWG stranded tinned copper drain wire, "
            "LSZH jacket\n"
            "Part: 9842NH (1000 Meter Packing)\n"
            "Make: Belden (Data Sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 1650,
    },
    {
        "item_code": "DRAKA-RS485-24AWG",
        "item_name": "Cable RS-485 Draka 24AWG",
        "description": (
            "Cable For multi-dropped, medium-speed, serial data communication in electrically "
            "noisy industrial environments. Application includes industrial networks using "
            "RS-485 / RS-422 / RS-232 transceivers, RS-422 systems for Process Automation "
            "(chemicals, brewing, paper mills), factory automation (autos, metal fabrication), "
            "HVAC, security, motor control and motion control.\n"
            "Stranded Tinned Copper, 24AWG, Diameter 7 x 0.20mm\n"
            "Make: Draka (Data sheet Attached)\n"
            "Delivery: Ex- Stock (Subject to Prior Sale)"
        ),
        "standard_rate": 450,
    },
]


ORDER_DETAIL_FIELD_MAP = {
    "validity_days": "trader_validity_days",
    "pay_advance_pct": "trader_pay_advance_pct",
    "pay_delivery_pct": "trader_pay_delivery_pct",
    "pay_commissioning_pct": "trader_pay_commissioning_pct",
    "pay_after_pct": "trader_pay_after_pct",
    "pay_after_days": "trader_pay_after_days",
    "gst_mode": "trader_gst_mode",
    "services": "trader_services",
    "wht_percent": "trader_wht_percent",
    "freight_clause": "trader_freight_clause",
    "rate_clause": "trader_rate_clause",
    "rate_validity": "trader_rate_validity",
    "clause_rates": "trader_clause_rates",
    "print_exchange": "trader_print_exchange",
    "warehouse": "trader_warehouse",
    "gst_clause": "trader_gst_clause",
    "deliver_to": "trader_deliver_to",
    "delivery_address": "trader_delivery_address",
    "contact_person": "trader_contact_person",
    "contact_phone": "trader_contact_phone",
    "contact_email": "trader_contact_email",
    "delivery_date": "trader_delivery_date",
    "quote_date": "trader_quote_date",
    "use_quote_date": "trader_use_quote_date",
    "confirmed_date": "trader_confirmed_date",
    "order_comments": "trader_order_comments",
}


def get_default_quotation_terms(company=None):
    """Return seeded Electrence-style terms (editable on the quotation)."""
    return ELECTRENCE_QUOTATION_TERMS


def get_default_order_details(company=None):
    """Return Order Details defaults (payment %, GST/WHT, freight, FX)."""
    from trader_app.api.commercial_totals import snapshot_clause_rates

    details = dict(ELECTRENCE_ORDER_DETAILS)
    details["rate_validity"] = add_days(nowdate(), 15)
    details["quote_date"] = nowdate()
    details["use_quote_date"] = 0
    try:
        details["clause_rates"] = json.dumps(snapshot_clause_rates(company=company))
    except Exception:
        details["clause_rates"] = json.dumps({"usd": 1.0, "note": "snapshot-fallback"})
    return details


def apply_order_details_to_quotation(quotation, order_details=None, company=None):
    """Write Order Details onto a Quotation doc (only if custom fields exist)."""
    import frappe

    defaults = get_default_order_details(company or getattr(quotation, "company", None))
    payload = dict(defaults)
    if isinstance(order_details, str) and order_details.strip():
        try:
            order_details = json.loads(order_details)
        except Exception:
            order_details = {}
    if isinstance(order_details, dict):
        payload.update({k: v for k, v in order_details.items() if v is not None})

    for key, fieldname in ORDER_DETAIL_FIELD_MAP.items():
        if not frappe.db.has_column("Quotation", fieldname):
            continue
        value = payload.get(key)
        if key == "services" or key == "use_quote_date":
            value = cint(value)
        elif key in (
            "validity_days",
            "pay_advance_pct",
            "pay_delivery_pct",
            "pay_commissioning_pct",
            "pay_after_pct",
            "pay_after_days",
            "wht_percent",
        ):
            value = flt(value) if value not in (None, "") else 0
        elif key == "clause_rates" and isinstance(value, (dict, list)):
            value = json.dumps(value)
        elif key == "print_exchange":
            value = str(value if value is not None else "0")
        setattr(quotation, fieldname, value)

    # Derive valid_till from validity days when not explicitly set
    days = cint(payload.get("validity_days") or 0)
    if days and not getattr(quotation, "valid_till", None):
        base = getattr(quotation, "transaction_date", None) or nowdate()
        quotation.valid_till = add_days(base, days)

    return payload
