# Components Trading — Day Book & Variant Catalog

## Overview

This document describes the **Components Trading** feature added to the EnXi Traders ERP.
It is fully controlled by a per-company feature flag (`trader_components_enabled`) that defaults to **OFF**.
When OFF the system behaves byte-for-byte identically to the pre-feature state.

---

## How to Enable

1. Log in as **Trader Admin** (or System Manager / Administrator).
2. Navigate to **Settings** (bottom of sidebar).
3. Scroll to **Feature Flags** → **Components Trading — Day Book & Variant Catalog**.
4. Toggle the switch to **ON**.
5. The page will show a success message. **Reload the page** (F5) to see the new navigation items.

> Only `Trader Admin`, `System Manager`, and `Administrator` roles can change this flag.
> All other roles can only see the current state.

---

## What Turns On

When the feature is **enabled**, the following surfaces become active:

### Finance Menu (new sub-items)
| Route | Feature |
|-------|---------|
| `/finance/day-book` | Chronological day-book voucher list |
| `/finance/receivables` | In-Coming (AR) — outstanding customer balances |
| `/finance/payables` | Out-Going (AP) — outstanding supplier balances |
| `/finance/day-close` | Day-close summary (purchases, sales, cash, stock, AR, AP) |

### Components Menu (new top-level section)
| Route | Feature |
|-------|---------|
| `/components/catalog` | Attribute-driven component catalog + quick-entry parser |
| `/components/opening-stock` | Opening stock import wizard |
| `/components/stock-valuation` | Stock valuation report grouped by category |
| `/components/stock-take` | Stock-take entry → posts Stock Reconciliation |

---

## Data Safety on Disable

**Disabling the feature never deletes any data.**

- All component items (`trader_component_item = 1`) remain in the database.
- All stock entries, invoices, payment entries, and journal entries are preserved.
- New UI surfaces are hidden; existing ERPNext Desk access is unaffected.
- Re-enabling the feature immediately restores access to all previously entered data.

---

## Feature Architecture

### Feature Flag
- **Field:** `Company.trader_components_enabled` (Check, default 0)
- **Pattern:** Follows the existing `trader_multi_currency_enabled` pattern
- **Backend guard:** Every new API function calls `_assert_enabled(company)` first
- **Frontend guard:** All new pages read `useCompanyStore(s => s.componentsEnabled)` and show a redirect-to-settings screen when OFF; nav items filtered in `Sidebar.tsx`

### Attribute Taxonomy
Items are identified by a 4-tuple: **(Category, Form Factor, Capacity, Grade)**

Seeded taxonomy (PRD Appendix B equivalent):

| Category | Form Factors | Capacities | Grades |
|----------|-------------|------------|--------|
| SSD | M.2 NVMe, M.2 SATA, 2.5 SATA, mSATA, M1, e/f | 120GB–4TB | New, Pulled, A, B, C, Refurbished |
| HDD | 3.5 HDD, 2.5 HDD | 250GB–8TB | New, Pulled, A, B, C, Refurbished |
| RAM | DDR4/DDR3/DDR5 Desktop & Laptop | 2GB–64GB | New, Pulled, A, B, C |
| GPU | PCIe x16 Gaming, Workstation | 2GB–24GB | New, Pulled, A, B |
| CPU | Intel/AMD sockets | Dual–16 Core | New, Pulled, A, B |
| Motherboard | ATX/Micro-ATX/Mini-ITX | Various | New, Pulled, A, B |
| Power Supply | ATX PSU | 350W–850W | New, Pulled, A, B |
| Accessories | Various | N/A | New, Pulled, A |

### SKU Resolution
`find_or_create_sku(category, form_factor, capacity, grade)`:
1. Looks for `Item` with matching `trader_component_*` custom fields
2. If not found, creates new Item with code `{CAT}-{FF}-{CAP}-{GRADE}` (slug-normalized)
3. Flat items (existing) are untouched — they remain in their item groups

### Quick-Entry Parser
Grammar (order-tolerant): `<capacity> <grade> <qty> <rate>`

Examples:
```
1tb pulled 5 300       → capacity=1TB, grade=Pulled, qty=5, rate=300
pulled 2tb 10 250      → capacity=2TB, grade=Pulled, qty=10, rate=250
8gb ddr4 new 20 150    → capacity=8GB, grade=New, qty=20, rate=150
```

Warnings are surfaced (never silent failures):
- Capacity not detected → picker required
- Grade not detected → defaults to "Pulled" with warning
- Item not found → suggests using "Create SKU"

### Opening Stock
- Creates a single submitted **Stock Entry (Material Receipt)** for all imported lines
- Run once when the feature is first enabled to match the notebook
- Idempotent (can be rerun — creates a new Stock Entry each time)

### Day Book
- Read-only aggregation of `Sales Invoice`, `Purchase Invoice`, `Payment Entry`, `Journal Entry` for a single date
- Summary tiles: Total Sales, Total Purchases, Cash In, Cash Out, Net Cash
- Pagination (50 rows/page)

### Stock Valuation Report
- Groups component items by Category → Capacity → Grade
- Headline tiles: In-Hand Cash (GL balance), Total Stock Value, Total AR, Total AP
- Date-selectable (as-of any date)
- Print via `window.print()`

### AR/AP Lists (In-Coming / Out-Going)
- AR: customers with `outstanding_amount > 0` on Sales Invoices
- AP: suppliers with `outstanding_amount > 0` on Purchase Invoices
- Searchable by party name or `trader_short_code`
- One-tap **Settle**: posts a submitted Payment Entry and deducts from outstanding

### Stock Take
- Shows all component items with their system perpetual qty
- User enters counted qty for each item
- Only rows with variance (>0.001) are submitted
- Posts a submitted **Stock Reconciliation** document
- Scopeable by warehouse and category

### Day Close
- Summary of purchases, sales, cash in/out, closing cash, component stock value, AR, AP for any date
- "Closing Cash" = GL debit − credit on Cash/Bank accounts up to end of date
- Voucher-traceable via the Day Book link

---

## Custom Fields Added (all additive, no existing columns changed)

### Company
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `trader_components_enabled` | Check | 0 | Feature flag |

### Item
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `trader_component_item` | Check | 0 | Marks item as component |
| `trader_component_category` | Data | null | Component category |
| `trader_component_form_factor` | Data | null | Form factor |
| `trader_component_capacity` | Data | null | Capacity (e.g. 1TB) |
| `trader_component_grade` | Data | null | Grade/variant |

### Customer
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `trader_short_code` | Data | null | Informal short-code (A7, C3) |
| `trader_opening_balance` | Currency | 0 | Opening AR balance |

### Supplier
| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `trader_short_code` | Data | null | Informal short-code |
| `trader_opening_balance` | Currency | 0 | Opening AP balance |

---

## New API Endpoints

All endpoints in `trader_app.api.catalog` and `trader_app.api.daybook` require `trader_components_enabled = 1`.

| Module | Function | Description |
|--------|----------|-------------|
| `catalog` | `get_taxonomy` | Full attribute taxonomy (no flag required) |
| `catalog` | `get_catalog_items` | Paginated component items with stock |
| `catalog` | `find_or_create_sku` | Resolve or create item from 4-tuple |
| `catalog` | `parse_quick_entry` | Parse free-text entry line |
| `catalog` | `import_opening_stock` | Import opening stock (Material Receipt) |
| `catalog` | `get_stock_take_items` | Items for stock-take |
| `catalog` | `create_stock_take` | Post Stock Reconciliation |
| `daybook` | `get_day_book` | Vouchers for a date |
| `daybook` | `get_day_close_summary` | Day-close figures |
| `daybook` | `get_component_stock_valuation` | Grouped stock valuation |
| `daybook` | `get_incoming` | AR party list |
| `daybook` | `get_outgoing` | AP party list |
| `daybook` | `settle_party` | Post settlement Payment Entry |
| `settings` | `toggle_components_feature` | Enable/disable the flag |

---

## Regression Contract (OFF-path parity)

When `trader_components_enabled = 0`:

1. **Item lookup/create** — `inventory.create_item`, `get_items`, `lookup_item_by_barcode` unchanged; new custom fields are nullable and ignored by all existing APIs
2. **Voucher posting** — `sales.create_sales_invoice`, `purchases.create_purchase_invoice` unchanged; no new `doc_events` hooks
3. **Stock balance** — `inventory.get_stock_balance` queries `tabBin`; no new joins; new component items (if any exist) appear just like any other item
4. **Valuation** — `reports.get_stock_balance_report` unchanged; new fields on Item are ignored
5. **AR/AP** — `reports.get_receivable_aging`, `get_payable_aging` unchanged; short-code field is nullable/ignored
6. **All existing reports** — no changes to `reports.py`; new report IDs additive
7. **Navigation** — all new nav items hidden via `requiresComponents` + `componentsEnabled` guard
8. **Routes** — new routes exist but pages self-guard and redirect to settings
9. **Permissions** — new capabilities (`components:view`, `components:execute`) don't affect existing role → capability mappings
10. **Company API** — `get_active_company`, `set_active_company`, `get_companies` now include `components_enabled: false` — purely additive field

---

## Open Questions (surfaced, not hardcoded)

| # | Question | Current handling |
|---|----------|-----------------|
| OQ-1 | Rate = cost or sale price? | `standard_rate` field used; interpret as cost for stock valuation, sale price shown separately |
| OQ-2 | "In-hand cash" = GL Cash or day receipts? | GL Cash/Bank account balance (debit − credit) up to as-of-date |
| OQ-3 | M1, e/f form factors | Added as-is to taxonomy seed; display-only labels |
| OQ-4 | Single cash account? | Uses first Cash account in chart; can be extended via `mode_of_payment` |
| OQ-5 | Capacity decimal format | Stored as string (1TB, 256GB); no arithmetic on capacity |
| OQ-6 | Multi-warehouse | Supported via warehouse dropdown on all relevant pages |
| OQ-7 | Tax (GST/non-GST) | Reuses existing `trader_invoice_type` on SI/PI; no new field needed |
| OQ-8 | Day-close = hard lock or snapshot? | Snapshot only; does not prevent further posting on the date |
