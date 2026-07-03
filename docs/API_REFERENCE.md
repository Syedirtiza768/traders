# API Reference — Trader App

## Authentication

### Login
```
POST /api/method/login
Content-Type: application/json

{
  "usr": "admin@example.com",
  "pwd": "password"
}
```

### Logout
```
POST /api/method/logout
```

### Get Logged User
```
GET /api/method/frappe.auth.get_logged_user
```

## Dashboard API

### Get Dashboard KPIs
```
GET /api/method/trader_app.api.dashboard.get_kpis
```

Response:
```json
{
  "message": {
    "todays_sales": 245000,
    "monthly_revenue": 8500000,
    "outstanding_receivables": 3200000,
    "outstanding_payables": 1800000,
    "stock_value": 12500000,
    "low_stock_items": 23,
    "total_customers": 95,
    "total_orders_today": 12
  }
}
```

### Get Sales Trend
```
GET /api/method/trader_app.api.dashboard.get_sales_trend
```

### Get Top Customers
```
GET /api/method/trader_app.api.dashboard.get_top_customers
```

### Get Recent Orders
```
GET /api/method/trader_app.api.dashboard.get_recent_orders
```

## Sales Module

### List Sales Orders
```
GET /api/resource/Sales Order?filters=[["company","=","Global Trading Company Ltd"]]&fields=["name","customer","grand_total","status"]&limit_page_length=20
```

### Create Sales Order
```
POST /api/resource/Sales Order
Content-Type: application/json

{
  "customer": "CUST-001",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": 10,
      "rate": 500
    }
  ]
}
```

### List Sales Invoices
```
GET /api/resource/Sales Invoice?fields=["name","customer","grand_total","status","outstanding_amount"]&limit_page_length=20
```

## Purchasing Module

### List Purchase Orders
```
GET /api/resource/Purchase Order?fields=["name","supplier","grand_total","status"]&limit_page_length=20
```

### List Purchase Invoices
```
GET /api/resource/Purchase Invoice?fields=["name","supplier","grand_total","status","outstanding_amount"]&limit_page_length=20
```

## Inventory Module

### Get Stock Balance
```
GET /api/method/trader_app.api.inventory.get_stock_summary
```

### Get Low Stock Items
```
GET /api/method/trader_app.api.inventory.get_low_stock_items
```

## Customers

### List Customers
```
GET /api/resource/Customer?fields=["name","customer_name","customer_group","territory"]&limit_page_length=20
```

## Suppliers

### List Suppliers
```
GET /api/resource/Supplier?fields=["name","supplier_name","supplier_group","country"]&limit_page_length=20
```

## Reports

### Accounts Receivable
```
GET /api/method/trader_app.api.reports.get_accounts_receivable
```

### Accounts Payable
```
GET /api/method/trader_app.api.reports.get_accounts_payable
```

### Profit & Loss
```
GET /api/method/trader_app.api.reports.get_profit_and_loss
```

## Components Trading — Day Book API

Requires `trader_components_enabled = 1` on the active company.

### Day Book (voucher list)
```
GET /api/method/trader_app.api.daybook.get_day_book?date=2026-07-03&page=1&page_size=50
```

### Day Close summary
```
GET /api/method/trader_app.api.daybook.get_day_close_summary?date=2026-07-03
```

### Receivables (AR party list)
```
GET /api/method/trader_app.api.daybook.get_incoming?page=1&page_size=20&search=
```

### Payables (AP party list)
```
GET /api/method/trader_app.api.daybook.get_outgoing?page=1&page_size=20&search=
```

### Settle party (create Payment Entry)
```
POST /api/method/trader_app.api.daybook.settle_party
Content-Type: application/json

{
  "party_type": "Customer",
  "party": "CUST-001",
  "amount": 5000,
  "mode_of_payment": "Cash",
  "posting_date": "2026-07-03",
  "settlement_account": "Cash - GTCL",
  "allocations": [{"reference_name": "SINV-001", "allocated_amount": 5000}]
}
```

### Post day-book transaction
```
POST /api/method/trader_app.api.daybook.post_day_transaction
Content-Type: application/json

{
  "tx_type": "sale",
  "party": "CUST-001",
  "lines": [{"item_code": "ITEM-001", "qty": 1, "rate": 1000}],
  "posting_date": "2026-07-03",
  "record_payment": 1,
  "payment_amount": 500,
  "mode_of_payment": "Cash"
}
```

### Party open invoices (allocation preview)
```
GET /api/method/trader_app.api.daybook.get_party_open_invoices?party_type=Customer&party=CUST-001
```

### Find or create party
```
POST /api/method/trader_app.api.daybook.find_or_create_party
Content-Type: application/json

{
  "party_type": "Customer",
  "party_name": "New Shop",
  "short_code": "NSH"
}
```
