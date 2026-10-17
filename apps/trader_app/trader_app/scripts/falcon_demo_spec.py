"""Fictional demo dataset: Falcon Industrial Solutions (Pvt.) Ltd, Karachi.

Single source for the seed, run and verify steps. Every identifier here is fictional and marked DEMO ONLY.
Amounts are PKR. Rates are the demo's configured values; the tax basis is documented in 10-pakistan-tax-rules.md.

Expected figures are computed here from first principles (see ``expected_*`` helpers) so the verification
does not rely on the application's own totals.
"""
from __future__ import annotations

COMPANY = "Falcon Industrial Solutions (Pvt.) Ltd"
COMPANY_ABBR = "FIS"
SITE = "traders-demo.localhost"
FISCAL_YEAR = ("2026-07-01", "2027-06-30")
AS_OF = "2026-10-16"  # reporting date used by the demo (today in the demo timeline)
DEMO_TAG = "DEMO ONLY - fictional data"

# Legal identity (fictional). Printed on documents as configured; NOT a real registration.
LEGAL = {
    "ntn": "9876543-2",
    "strn": "12-00-0000-000-00",
    "address": "Plot 14, Sector 17, Korangi Industrial Area, Karachi, Sindh",
}

# Trading entities (DBA / branding dimension, per the Trading Entity PRD). One legal company.
TRADING_ENTITIES = [
    {"name": "Falcon Automation", "code": "FA", "default": True,
     "letterhead": "Falcon Automation - industrial control panels and automation products\n" + LEGAL["address"]},
    {"name": "Falcon Site Services", "code": "FSS", "default": False,
     "letterhead": "Falcon Site Services - maintenance and site services\n" + LEGAL["address"]},
]

# Staff. Emails are fictional. Roles are Traders roles (hooks.py fixtures) plus Frappe roles where needed.
STAFF = {
    "founder": {"email": "founder@falcon-demo.test", "name": "Imran Qureshi",
                "roles": ["Trader Admin", "Trader Finance Manager", "Trader Sales Manager",
                          "Trader Purchase Manager", "Trader Inventory Manager", "Sales User", "Accounts User",
                          "Stock User", "Purchase User", "System Manager"]},
    "sales": {"email": "sales@falcon-demo.test", "name": "Ayesha Rafiq",
              "roles": ["Trader Staff", "Sales User"]},
    "procurement": {"email": "procurement@falcon-demo.test", "name": "Hamza Siddiqui",
                    "roles": ["Trader Purchase Manager", "Purchase User", "Stock User"]},
    "operations": {"email": "operations@falcon-demo.test", "name": "Zeeshan Khan",
                   "roles": ["Trader Inventory Manager", "Stock User"]},
    "accounts": {"email": "accounts@falcon-demo.test", "name": "Sana Iqbal",
                 "roles": ["Trader Finance Manager", "Accounts User"]},
    "management": {"email": "management@falcon-demo.test", "name": "Farhan Ali",
                   "roles": ["Trader Viewer"]},
}

BANK_ACCOUNT = "Demo Bank - Current Account"
BANK_GL = BANK_ACCOUNT + " - " + COMPANY_ABBR  # the ledger account; receipts and supplier payments name it explicitly
CASH_ACCOUNT = "Cash in Hand"
FOUNDER_CAPITAL = 2_000_000  # introduced on 2026-07-01 (equity)

# Customers. filer = demo assumption for the income-tax withholding test (see 10-pakistan-tax-rules.md).
CUSTOMERS = {
    "indus": {"name": "Indus Water Treatment Works (Pvt.) Ltd", "ntn": "1122334-5", "strn": "13-00-1111-222-33",
              "entity": "Falcon Automation", "credit_limit": 1_000_000, "terms_days": 30, "expected_days": 45,
              "filer": True},
    "bayview": {"name": "Bay View Food Processors (Pvt.) Ltd", "ntn": "2233445-6", "strn": "13-00-2222-333-44",
                "entity": "Falcon Automation", "credit_limit": 300_000, "terms_days": 30, "expected_days": 30,
                "filer": True},
    "lakeside": {"name": "Lakeside Packaging Mills (Pvt.) Ltd", "ntn": "3344556-7", "strn": "13-00-3333-444-55",
                 "entity": "Falcon Site Services", "credit_limit": 500_000, "terms_days": 30, "expected_days": 45,
                 "filer": False},
}

# Suppliers. terms_days = agreed credit terms.
SUPPLIERS = {
    "nexa": {"name": "Nexa Electrical Distributors (Pvt.) Ltd", "ntn": "4455667-8", "terms_days": 30},
    "sahil": {"name": "Sahil Controls Importers", "ntn": "5566778-9", "terms_days": 45},
    "metro": {"name": "Metro Freight Services", "ntn": "6677889-0", "terms_days": 15},
    "ayesha_site": {"name": "Ayesha Site Services", "ntn": "7788990-1", "terms_days": 15},
    "landlord": {"name": "Saeed Estate Management (Pvt.) Ltd", "ntn": "8899001-2", "terms_days": 0},
}

# Items. Products are stock items (zero opening stock). Services and expenses are non-stock.
# cost = agreed supplier price (demo assumption where the supplier price is not otherwise defined).
PRODUCTS = {
    "FA-PLC-16": {"name": "Industrial PLC module 16DI/16DO", "price": 58_000, "cost": 44_000, "supplier": "nexa"},
    "FA-SRV-15": {"name": "Servo drive 1.5 kW", "price": 92_000, "cost": 71_000, "supplier": "nexa"},
    "FA-CON-40": {"name": "Contactor 40 A", "price": 3_800, "cost": 2_650, "supplier": "nexa"},
    "FA-ENC-86": {"name": "Control panel enclosure 800x600", "price": 26_500, "cost": 18_900, "supplier": "sahil"},
    "FA-MTR-7": {"name": "Motor starter 7.5 kW", "price": 12_500, "cost": 9_200, "supplier": "sahil"},
}
SERVICES = {
    "SVC-INST": {"name": "Installation and commissioning (per site)", "price": 150_000},
    "SVC-PM": {"name": "Preventive maintenance visit", "price": 18_000},
    "SVC-AMC": {"name": "Annual maintenance contract, quarterly fee", "price": 60_000},
    "SVC-SURVEY": {"name": "Site survey visit", "price": 12_000},
    "SVC-SUBC": {"name": "Subcontracted site labour", "price": 0},
}
EXPENSE_ITEMS = {
    "EXP-RENT": "Office rent",
    "EXP-COMMS": "Communications (internet and mobile)",
    "EXP-FRT": "Freight and courier (project delivery)",
    "EXP-TPT": "Site travel and fuel (project)",
    "EXP-ADM": "Administration and stationery",
}

# --- Project A: Indus Water control panel upgrade (product + service, partial delivery, partial invoicing) ----
PROJECT_A = {
    "customer": "indus", "title": "Control panel upgrade - Filtration Plant 2",
    "enquiry_date": "2026-07-03", "enquiry_value": 500_000, "priority": "High",
    "owner": "founder",
    "comments": [("2026-07-03", "Enquiry received by email from plant engineering."),
                 ("2026-07-09", "Site visit done; customer asked for a phased installation option.")],
    "quotation_q1": {
        "date": "2026-07-05", "validity_days": 15, "pay_advance_pct": 50, "gst_mode": "exclusive",
        "freight": "EXW", "lead_time_days": 10,
        "lines": [
            # (line, option, item, qty, unit price, discount %)
            (1, 1, "FA-PLC-16", 2, 58_000, 5), (1, 1, "FA-SRV-15", 1, 92_000, 5),
            (1, 1, "FA-ENC-86", 1, 26_500, 5), (1, 1, "FA-CON-40", 12, 3_800, 5),
            (1, 2, "FA-PLC-16", 1, 58_000, 0), (1, 2, "FA-CON-40", 12, 3_800, 0), (1, 2, "FA-ENC-86", 1, 26_500, 0),
            (2, 1, "SVC-INST", 1, 150_000, 0), (2, 2, "SVC-INST", 1, 120_000, 0),
            (3, 1, "SVC-PM", 4, 18_000, 0),
        ],
    },
    "revision_r1": {"date": "2026-07-12", "changes": {"line1_option1_discount": 8, "svc_inst_option1": 140_000}},
    "accepted": {"line1": 1, "line2": 1, "line3": 1},  # option accepted per line (Option 1 everywhere)
    "po": {"number": "PO-IWTW-2026-0412", "date": "2026-07-16", "attachment": "customer_po_0412.txt"},
}

# --- Project B: Bay View motor starters (product only, LOST) ------------------------------------------------
PROJECT_B = {
    "customer": "bayview", "title": "Motor starters for bottling line 3",
    "enquiry_date": "2026-07-07", "enquiry_value": 120_000, "priority": "Normal", "owner": "sales",
    "quotation": {"date": "2026-07-08", "validity_days": 15, "pay_advance_pct": 100, "gst_mode": "exclusive",
                  "lines": [(1, 1, "FA-MTR-7", 6, 12_500, 10), (1, 1, "FA-CON-40", 6, 3_800, 10)]},
    "outcome": {"date": "2026-07-14", "status": "Lost", "reason": "Customer chose a competitor on price"},
    "discount_requested_pct": 20,  # sales user applies 20%; no approval step exists (see gap register)
}

# --- Project C: Lakeside Packaging AMC (service only; subcontractor cost overrun) -----------------------------
PROJECT_C = {
    # Handled by the sales executive after the team is onboarded on 1 August 2026.
    "customer": "lakeside", "title": "Annual maintenance contract - packing lines",
    "enquiry_date": "2026-08-03", "enquiry_value": 240_000, "priority": "Normal", "owner": "sales",
    "quotation": {"date": "2026-08-04", "validity_days": 15, "pay_advance_pct": 25, "gst_mode": "exclusive",
                  "lines": [(1, 1, "SVC-AMC", 4, 60_000, 0), (1, 2, "SVC-PM", 12, 18_000, 0)]},
    "accepted": {"line1": 1},
    "po": {"number": "PO-LPM-0091", "date": "2026-08-12"},
    "subcontract_budget_per_visit": 10_000,
    "subcontract_actual_per_visit": 14_000,  # overrun: 4 visits, 16,000 above budget
    "visits": 4,
}

FX = {"currency": "PKR"}


# --- expected figures computed from first principles --------------------------------------------------------
def line_amount(qty: float, price: float, disc_pct: float) -> float:
    return round(qty * price * (1 - disc_pct / 100.0), 2)


def expected_quote_totals(lines):
    """Net of option-1 lines (the accepted option of each line) and GST at 18% on goods."""
    goods_net = 0.0
    services_net = 0.0
    for line, option, item, qty, price, disc in lines:
        if option != 1:
            continue
        amt = line_amount(qty, price, disc)
        if item in PRODUCTS:
            goods_net += amt
        else:
            services_net += amt
    return {"goods_net": round(goods_net, 2), "services_net": round(services_net, 2)}


def gst(amount: float, rate: float) -> float:
    return round(amount * rate / 100.0, 2)


GOODS_GST_RATE = 18.0          # federal goods rate, demo configuration (T1 in 10-pakistan-tax-rules.md)
SERVICES_GST_RATE = 15.0       # Sindh services general rate: UNVERIFIED (T2)
WHT_SERVICES_RATE = 14.0       # income tax withheld by a filer customer on services: demo configuration (T15-T17)
WHT_RECOVERABLE = "WHT recoverable income tax on services - FIS"  # ledger asset created by the masters

# Policy for the overhead allocation used in the profitability review (explicit, documented assumption):
# fixed overheads for the period are allocated to projects in proportion to their share of invoiced
# net revenue in that period (rent, communications, administration). Freight and site travel are direct
# project costs and are not overhead.
OVERHEAD_ACCOUNTS = ["Rent", "Communications", "Administration"]

# Password for every fictional demo login (DEMO ONLY; not a real credential). Used by the masters and access fixtures.
DEMO_PASSWORD = "Falcon-Demo-2026!"
