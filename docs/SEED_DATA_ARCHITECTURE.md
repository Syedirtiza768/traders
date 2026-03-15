# Seed Data Architecture

## Overview

The seed data engine generates a complete demo business dataset simulating 6–12 months of activity for a wholesale trading/distribution company.

## Execution Order (Dependency Chain)

```
1. CompanyGenerator      → Company, Fiscal Year, Chart of Accounts, Cost Centers
2. WarehouseGenerator    → Warehouses (Main, Secondary, Retail)
3. TaxGenerator          → Tax templates, tax categories
4. UserGenerator         → Admin, Sales Mgr, Purchase Mgr, Accountant, Warehouse Mgr
5. CustomerGenerator     → 80–120 customers with contacts and addresses
6. SupplierGenerator     → 40–60 suppliers with contacts and addresses
7. ItemGenerator         → 300–500 items across 4 groups
8. InventoryGenerator    → Opening stock entries for all items
9. PurchaseGenerator     → 150–300 POs, 150–300 Purchase Invoices
10. SalesGenerator       → 300–600 SOs, 300–600 Sales Invoices
11. PaymentGenerator     → Customer payments, supplier payments, partial payments
12. FinancialGenerator   → Journal entries, expense entries, bank transactions
13. Validator            → Integrity checks, balance verification
```

## Generator Interface

Each generator follows a standard interface:

```python
class BaseGenerator:
    def __init__(self, demo_config):
        self.config = demo_config
        self.created_records = []

    def generate(self):
        """Main generation method"""
        raise NotImplementedError

    def validate(self):
        """Validate generated data"""
        raise NotImplementedError

    def get_progress(self):
        """Return progress percentage"""
        return len(self.created_records)
```

## Demo Configuration

```python
DEMO_CONFIG = {
    "company_name": "Global Trading Company Ltd",
    "company_abbr": "GTC",
    "country": "Pakistan",
    "currency": "PKR",
    "city": "Lahore",
    "fiscal_year_start": "2025-07-01",
    "fiscal_year_end": "2026-06-30",
    "demo_start_date": "2025-07-01",
    "demo_end_date": "2026-03-16",
    "num_customers": (80, 120),
    "num_suppliers": (40, 60),
    "num_items": (300, 500),
    "num_sales_orders": (300, 600),
    "num_purchase_orders": (150, 300),
    "payment_completion_rate": 0.7,  # 70% of invoices fully paid
    "partial_payment_rate": 0.15,    # 15% partially paid
    # remaining 15% unpaid — creates receivables/payables
}
```

## Item Groups and Profiles

| Group | Items | Price Range (PKR) | Margin |
|-------|-------|--------------------|--------|
| FMCG | 100–150 | 50–5,000 | 15–25% |
| Hardware Tools | 80–120 | 200–15,000 | 20–35% |
| Electrical Supplies | 60–100 | 100–10,000 | 18–30% |
| Consumables | 60–130 | 20–3,000 | 12–20% |

## Customer Profiles

| Segment | Count | Avg Monthly Orders | Credit Limit (PKR) |
|---------|-------|--------------------|---------------------|
| Premium Retailers | 15–25 | 8–15 | 500,000–2,000,000 |
| Regular Retailers | 40–60 | 3–8 | 100,000–500,000 |
| Small Shops | 25–35 | 1–3 | 50,000–150,000 |

## Supplier Profiles

| Type | Count | Lead Time | Payment Terms |
|------|-------|-----------|---------------|
| Manufacturers | 10–15 | 7–14 days | Net 30 |
| Distributors | 15–25 | 3–7 days | Net 15 |
| Importers | 10–15 | 14–30 days | Advance + Net 30 |
| Local Suppliers | 5–10 | 1–3 days | COD / Net 7 |

## Revenue Distribution

- Monthly revenue target: PKR 5,000,000 – 15,000,000
- Seasonal variation: ±20% around mean
- Growth trend: +5% month-over-month (slight upward trend for demo appeal)

## Data Realism Constraints

1. No future-dated transactions
2. Delivery date >= order date
3. Payment date >= invoice date
4. Stock never goes negative (at transaction time)
5. Purchase price < selling price (positive margins)
6. Credit limit not exceeded (mostly)
7. Tax calculations match ERPNext formulas
8. All double-entry accounting balances
