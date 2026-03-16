# Frontend Component Matrix

## Title
Traders — Screen-by-Screen Component Matrix

## Purpose
This document is the implementation-grade UI component reference for the Traders ERP frontend.

Use it to:

- break modules into concrete screens
- define reusable UI building blocks by screen
- align frontend engineering, ERP architecture, and workflow coverage
- support AI-assisted screen scaffolding and planning

Format used:

**Module → Submenu → Screen → Components**

Each screen is decomposed into practical UI building blocks such as:

- page header
- action bar
- KPI cards
- filter bar
- tabs
- data table / grid
- form sections
- summary panel
- side drawer
- timeline
- attachments
- comments
- approval panel
- audit trail

---

## 1. Sales Module Component Matrix

## 1.1 Dashboard

### 1.1.1 Sales Overview Dashboard

**Components**

- page header
- date range selector
- branch / warehouse / territory filters
- KPI cards:
  - today sales
  - monthly sales
  - outstanding receivables
  - overdue amount
  - pending deliveries
  - returns today
- sales trend chart
- top customers table
- top selling items table
- salesperson performance mini chart
- alerts panel
- quick actions panel
- export button

### 1.1.2 Sales Operations Dashboard

**Components**

- page header
- date / team filters
- KPI cards:
  - quotations pending approval
  - orders pending dispatch
  - orders awaiting invoice
  - backorders
  - customers on credit hold
- approval queue widget
- delayed deliveries widget
- exceptions widget
- dispatch readiness table
- high discount requests table
- quick actions bar

### 1.1.3 Salesperson Dashboard

**Components**

- page header
- personal target summary cards
- my quotations widget
- my pending orders widget
- overdue collections widget
- assigned customers widget
- visit / follow-up panel
- personal trend chart
- reminders panel
- quick actions bar

---

## 1.2 Leads & Opportunities

### 1.2.1 Lead List

**Components**

- page header
- action bar:
  - create lead
  - import
  - export
- search box
- advanced filter bar
- lead status tabs
- data table:
  - lead name
  - company
  - source
  - phone
  - owner
  - stage
  - expected value
  - created date
- bulk actions toolbar
- pagination
- right-side quick preview drawer

### 1.2.2 Lead Detail

**Components**

- page header with lead status badge
- action bar:
  - edit
  - convert
  - create quotation
  - add activity
- summary card
- tabs:
  - overview
  - contact info
  - activities
  - notes
  - attachments
  - audit trail
- lead details form section
- activity timeline
- notes thread
- attachments uploader
- related records panel
- audit log panel

### 1.2.3 Opportunity Pipeline

**Components**

- page header
- kanban board
- stage columns:
  - inquiry
  - quoted
  - negotiation
  - won
  - lost
- card on each opportunity showing:
  - customer / prospect
  - expected value
  - owner
  - next action date
- top filters
- drag and drop stage controls
- right-side detail drawer
- quick create button

---

## 1.3 Quotations

### 1.3.1 Quotation List

**Components**

- page header
- primary action button
- filter bar:
  - date range
  - customer
  - salesperson
  - status
  - approval state
- search box
- status tabs
- quotations table
- saved views dropdown
- bulk actions
- pagination
- export controls
- quick preview drawer

### 1.3.2 Quotation Detail / Edit

**Components**

- page header with quotation number and status
- action bar:
  - save draft
  - submit
  - print
  - email
  - duplicate
  - convert to order
- form sections:
  - basic information
  - customer information
  - validity / dates
  - pricing context
- item grid:
  - item
  - description
  - warehouse
  - quantity
  - unit
  - rate
  - discount
  - tax
  - line total
- item add/search panel
- totals summary box
- notes / terms section
- internal remarks section
- attachments
- approval section
- linked records panel
- audit trail
- comments thread

### 1.3.3 Quotation Approval Queue

**Components**

- page header
- filter bar:
  - approver
  - threshold
  - status
- approval table
- side-by-side quote summary panel
- discount / margin warning badges
- approval action panel:
  - approve
  - reject
  - send back
- note entry box
- approval history timeline

### 1.3.4 Quotation Comparison

**Components**

- page header
- quotation selector
- comparison grid
- column comparison:
  - items
  - rates
  - discounts
  - taxes
  - totals
  - validity
- highlight differences toggle
- choose final version action
- export comparison button

---

## 1.4 Sales Orders

### 1.4.1 Sales Order List

**Components**

- page header
- action bar
- search
- advanced filters
- status tabs
- order table
- fulfillment status chips
- billing status chips
- bulk actions
- quick preview drawer
- pagination

### 1.4.2 Sales Order Detail / Edit

**Components**

- page header with order number, status, customer
- action bar:
  - save
  - submit
  - hold
  - release
  - approve
  - convert to delivery
  - convert to invoice
- form sections:
  - customer details
  - order info
  - delivery schedule
  - warehouse / fulfillment setup
- item grid with stock columns:
  - available
  - reserved
  - ordered
  - pending
- stock availability sidebar
- totals / taxes summary
- credit exposure summary card
- delivery/billing progress tracker
- notes / instructions section
- attachments
- linked documents panel
- approval panel
- audit trail
- comments

### 1.4.3 Order Fulfillment Status

**Components**

- page header
- filter bar
- fulfillment summary cards
- line-level fulfillment table
- progress bars
- linked delivery table
- linked invoice table
- shortage / pending panel
- close order action area

### 1.4.4 Backorder Management

**Components**

- page header
- shortage summary cards
- filters:
  - warehouse
  - customer
  - item
  - age
- backorder table
- substitute item suggestion panel
- allocation panel
- warehouse transfer suggestion panel
- customer notification action

### 1.4.5 Sales Order Approval Queue

**Components**

- page header
- exception reason filters
- approval queue table
- order summary drawer
- credit warning panel
- margin analysis box
- approval action buttons
- approval notes
- approval timeline

---

## 1.5 Delivery & Dispatch

### 1.5.1 Delivery Note List

**Components**

- page header
- action bar
- filter bar
- delivery status tabs
- table with dispatch columns
- batch print
- export
- quick preview drawer

### 1.5.2 Delivery Note Detail / Edit

**Components**

- page header
- action bar:
  - pick
  - pack
  - dispatch
  - mark delivered
- delivery summary section
- linked order summary
- item pick grid
- batch / serial selection panel
- transporter details form
- vehicle / driver form
- delivery address panel
- proof of delivery upload
- remarks section
- status timeline
- linked records panel
- audit trail

### 1.5.3 Dispatch Planning

**Components**

- page header
- dispatch batch creation tools
- route filters
- order pool table
- route grouping panel
- vehicle assignment panel
- driver assignment panel
- sequencing board
- dispatch summary

### 1.5.4 Packing List

**Components**

- page header
- package summary cards
- package detail table
- carton / pallet assignment grid
- weight / volume fields
- label print action
- packing notes area

### 1.5.5 Delivery Tracking

**Components**

- page header
- delivery map / route panel if available
- status cards
- tracking timeline
- failed delivery reason panel
- POD viewer
- return-to-warehouse action area
- contact customer quick action

---

## 1.6 Invoices & Receipts

### 1.6.1 Sales Invoice List

**Components**

- page header
- action bar
- invoice status tabs
- filter bar
- search
- invoice table
- outstanding badges
- export controls
- quick preview drawer
- pagination

### 1.6.2 Sales Invoice Detail / Edit

**Components**

- page header
- action bar:
  - save
  - submit
  - print
  - email
  - cancel
- form sections:
  - customer
  - posting date
  - due date
  - linked order/delivery
- item grid
- tax section
- freight / extra charges section
- totals summary card
- receivable posting preview
- terms and notes
- attachments
- linked records
- audit log

### 1.6.3 Customer Payment Entry

**Components**

- page header
- payment form:
  - customer
  - date
  - mode
  - amount
  - reference number
- invoice allocation table
- unapplied balance indicator
- split allocation panel
- receipt preview
- notes
- audit trail

### 1.6.4 Customer Outstanding

**Components**

- page header
- aging summary cards
- customer search and filters
- outstanding table
- quick action buttons:
  - send reminder
  - place hold
  - open ledger
- drilldown side drawer
- export buttons

### 1.6.5 Customer Aging

**Components**

- page header
- bucket filters
- aging heatmap / summary cards
- detailed aging table
- bucket drilldown
- collection action panel
- export controls

---

## 1.7 Returns & Credit Notes

### 1.7.1 Sales Return List

**Components**

- page header
- action bar
- filters
- return status tabs
- return table
- preview drawer
- pagination

### 1.7.2 Sales Return Detail

**Components**

- page header
- action bar:
  - approve
  - reject
  - inspect
  - create credit note
- original invoice reference panel
- returned item grid
- reason codes section
- inspection results section
- warehouse disposition section
- remarks / evidence attachments
- approval panel
- audit trail

### 1.7.3 Credit Note List / Detail

**Components**

- page header
- credit note summary
- reference linkage section
- item / amount adjustment table
- tax adjustment section
- refund / adjustment options
- approval block
- print/export actions
- audit log

### 1.7.4 Return Inspection

**Components**

- page header
- returned goods checklist
- condition capture form
- photos upload
- decision cards:
  - return to stock
  - scrap
  - replacement
- inspector remarks
- final approval block

---

## 1.8 Pricing & Promotions

### 1.8.1 Price List

**Components**

- page header
- action bar
- filters
- price table
- effective date controls
- import/export tools
- activation status chips

### 1.8.2 Pricing Rules

**Components**

- page header
- rule list
- rule filter chips
- rule form:
  - scope
  - customer / territory / item
  - quantity slab
  - validity
  - price effect
- priority indicator
- activation toggle
- audit log

### 1.8.3 Discount Rules

**Components**

- page header
- discount rule table
- threshold controls
- approval mapping section
- reason code selector
- date validity controls
- audit trail

### 1.8.4 Promotion Campaigns

**Components**

- page header
- campaign cards / list
- campaign setup form
- eligible customer selector
- eligible item selector
- date range fields
- campaign performance widget
- activation toggle

---

## 1.9 Sales Team & Territory

### 1.9.1 Salesperson List

**Components**

- page header
- action bar
- filters
- salespeople table
- target badge
- territory badge
- quick preview drawer

### 1.9.2 Sales Targets

**Components**

- page header
- period selector
- target input grid
- actual vs target chart
- bulk upload control
- variance analysis panel

### 1.9.3 Territory Management

**Components**

- page header
- tree view
- map or region grouping panel
- assignment summary
- edit hierarchy drawer

### 1.9.4 Customer Assignment

**Components**

- page header
- salesperson selector
- customer pool table
- assigned customer table
- bulk reassign tools
- route assignment controls

---

## 1.10 Reports

For all sales reports, use a common matrix:

**Components**

- page header
- report filters
- date selector
- report table / chart
- grouping controls
- drilldown
- saved view dropdown
- export PDF
- export Excel
- print
- schedule/report subscription option if needed

---

## 1.11 Controls & Exceptions

### 1.11.1 Pending Orders

**Components**

- page header
- aging filters
- pending orders table
- action shortcuts
- fulfillment blockers panel

### 1.11.2 Ready for Dispatch

**Components**

- page header
- dispatch-ready summary cards
- ready order table
- batch create dispatch action

### 1.11.3 Orders Awaiting Invoice

**Components**

- page header
- pending invoice table
- delivery linkage view
- create invoice shortcut

### 1.11.4 Credit Hold Queue

**Components**

- page header
- hold reason filters
- customer exposure table
- release/override actions
- finance notes panel

### 1.11.5 Discount Approval Queue

**Components**

- page header
- approval table
- discount details panel
- margin preview
- approve/reject actions

### 1.11.6 Sales Exception Log

**Components**

- page header
- severity filters
- status filters
- exception table
- source transaction quick link
- owner assignment control
- resolution notes panel
- resolution timeline
- audit trail

---

## 2. Purchases Module Component Matrix

## 2.1 Dashboard

Each purchase dashboard should include:

- page header
- date / supplier / warehouse filters
- KPI cards
- pending approvals widget
- delayed delivery widget
- supplier invoice mismatch widget
- shortage alerts widget
- quick actions

---

## 2.2 Requisitions

### 2.2.1 Purchase Requisition List

**Components**

- page header
- action bar
- filter bar
- status tabs
- requisition table
- bulk actions
- preview drawer

### 2.2.2 Purchase Requisition Detail / Edit

**Components**

- page header
- requester info section
- required date section
- item grid
- suggested supplier sidebar
- budget / stock context panel
- approval block
- notes
- attachments
- audit trail

### 2.2.3 Requisition Approval Queue

**Components**

- page header
- approval table
- requisition summary drawer
- approval actions
- notes box
- approval timeline

### 2.2.4 Requisition Tracking

**Components**

- page header
- process tracker:
  - requisition
  - RFQ
  - quotation
  - PO
- linked documents table
- status summary cards
- close requisition action

---

## 2.3 RFQs & Supplier Quotations

### 2.3.1 RFQ List

**Components**

- page header
- filter/search
- RFQ table
- send to suppliers action
- status chips
- preview drawer

### 2.3.2 RFQ Detail

**Components**

- RFQ summary section
- supplier list panel
- item requirement grid
- response deadline field
- communication log
- attachments
- audit trail

### 2.3.3 Supplier Quotation Entry

**Components**

- supplier selector
- RFQ reference panel
- item quotation grid
- taxes / freight fields
- lead time fields
- document upload
- comparison readiness indicator

### 2.3.4 Supplier Quotation Comparison

**Components**

- comparison matrix
- supplier columns
- price highlight
- lead time highlight
- tax comparison
- total landed cost comparison
- scorecard view
- select winner action

### 2.3.5 RFQ Award Decision

**Components**

- award summary
- chosen supplier details
- rationale section
- create PO action
- approval block
- audit trail

---

## 2.4 Purchase Orders

### 2.4.1 Purchase Order List

**Components**

- page header
- action bar
- filter bar
- PO status tabs
- PO table
- export
- preview drawer

### 2.4.2 Purchase Order Detail / Edit

**Components**

- supplier summary
- order details section
- delivery schedule
- item grid
- taxes / freight section
- totals card
- linked requisition / RFQ panel
- approval block
- notes
- attachments
- audit trail

### 2.4.3 PO Approval Queue

**Components**

- approval queue table
- variance / budget warning panel
- summary drawer
- actions:
  - approve
  - reject
  - send back

### 2.4.4 PO Fulfillment Status

**Components**

- receipt progress cards
- line-level receipt table
- linked GRNs
- linked invoices
- pending qty summary
- close PO action

### 2.4.5 Open Purchase Orders

**Components**

- aging filters
- open PO table
- supplier follow-up action
- expected receipt variance panel

### 2.4.6 PO Revision History

**Components**

- revision list
- side-by-side comparison
- user/time stamps
- restore draft action

---

## 2.5 Goods Receipts

### 2.5.1 Goods Receipt List

**Components**

- GRN table
- filters
- action bar
- preview drawer

### 2.5.2 Goods Receipt Detail

**Components**

- linked PO summary
- receiving form
- item receipt grid
- short/excess variance badges
- batch / serial entry panel
- warehouse location panel
- inspection request panel
- remarks
- audit trail

### 2.5.3 Partial Receipt

**Components**

- pending quantity table
- partial receipt input grid
- keep PO open checkbox
- remarks

### 2.5.4 Excess / Short Receipt

**Components**

- variance comparison panel
- discrepancy table
- tolerance indicator
- accept/escalate actions

### 2.5.5 Quality Inspection

**Components**

- inspection checklist
- item condition form
- pass/fail controls
- photos upload
- findings notes
- quarantine flag

### 2.5.6 Rejected Goods

**Components**

- rejected items table
- disposition options
- return-to-supplier action
- debit note action
- quarantine details
- audit trail

---

## 2.6 Supplier Invoices

### 2.6.1 Supplier Invoice List

**Components**

- page header
- action bar
- invoice status tabs
- filters
- table
- preview drawer

### 2.6.2 Supplier Invoice Detail / Match

**Components**

- supplier summary
- invoice header section
- item / expense lines
- PO linkage panel
- GRN linkage panel
- taxes and charges
- payable preview
- attachments
- audit log

### 2.6.3 Three-Way Match

**Components**

- 3-column comparison layout
- PO vs GRN vs Invoice tables
- mismatch highlights
- tolerance badges
- approve/reject actions
- notes section

### 2.6.4 Invoice Discrepancy Review

**Components**

- discrepancy table
- issue type chips
- correction request panel
- override approval section
- audit timeline

### 2.6.5 Debit Notes

**Components**

- debit note header
- reference documents panel
- adjustment table
- tax impact
- print/export controls
- approval panel

---

## 2.7 Returns

Common purchase return screens should include:

- header
- linked PO/GRN/invoice references
- return item grid
- reason codes
- supplier replacement tracker
- liability adjustment block
- notes and attachments
- audit trail

---

## 2.8 Payments

Common payment screens:

- payment form
- supplier selector
- outstanding invoices table
- allocation grid
- batch payment table
- approval block
- payment advice preview
- bank/cash selection
- audit trail

---

## 2.9 Reports & Exceptions

Common components:

- report filters
- chart / grid
- drilldown
- source transaction link
- exception owner assignment
- resolution notes
- export controls

---

## 3. Inventory Module Component Matrix

## 3.1 Dashboard

Common dashboard components:

- page header
- warehouse/date filters
- KPI cards:
  - stock value
  - low stock
  - dead stock
  - near expiry
  - pending counts
- stock movement chart
- low stock table
- negative stock alerts
- quick actions

---

## 3.2 Item Master

### 3.2.1 Item List

**Components**

- header
- search
- filters
- category tabs
- item table
- image thumbnail column
- import/export actions
- preview drawer

### 3.2.2 Item Detail / Edit

**Components**

- item header with SKU/barcode
- tabs:
  - basic info
  - inventory
  - purchasing
  - sales
  - pricing
  - suppliers
  - stock history
  - audit
- image gallery
- core fields form
- reorder settings
- default warehouse
- preferred supplier
- pricing section
- stock snapshot
- attachments
- audit trail

### 3.2.3 Item Categories

**Components**

- tree view
- category form
- reorder hierarchy controls

### 3.2.4 UOM Conversion

**Components**

- conversion table
- add conversion action
- ratio form

### 3.2.5 Reorder Settings

**Components**

- warehouse-wise settings grid
- min/max controls
- reorder quantity controls
- lead time reference

### 3.2.6 Barcode / SKU Setup

**Components**

- barcode list
- scan input
- print barcode action
- duplicate conflict panel

---

## 3.3 Warehouses

Common warehouse screens should include:

- warehouse list or tree
- warehouse profile form
- address block
- manager field
- capacity card
- location/bin table
- transfer route panel
- audit trail

---

## 3.4 Stock Transactions

Common stock transaction screens:

- transaction header
- transaction type selector
- source / target warehouse
- item grid
- batch/serial allocation
- quantity validation
- posting preview
- attachments
- remarks
- audit trail

---

## 3.5 Batch / Serial / Expiry

Common components:

- batch/serial table
- search by item/batch/serial
- expiry date column
- stock location column
- traceability panel
- forward/backward trace view
- expiry alerts
- action bar

---

## 3.6 Stock Counting

Common screens should include:

- count schedule section
- warehouse/location selector
- count sheet grid
- freeze indicator
- variance analysis table
- approval section
- recount controls
- audit timeline

---

## 3.7 Reservation & Allocation

Common components:

- reservation table
- order reference
- warehouse stock context
- pick list table
- putaway target locations
- confirm action buttons
- shortages panel

---

## 3.8 Valuation

Common components:

- valuation method indicator
- valuation table
- cost layer panel
- landed cost allocation grid
- recalculation summary
- financial impact preview
- export controls

---

## 3.9 Reports & Exceptions

Common components:

- report filters
- warehouse/item grouping controls
- movement or balance grid
- chart widgets
- drilldown drawer
- exception severity badges
- resolution panel

---

## 4. Customers Module Component Matrix

## 4.1 Dashboard

Common dashboard components:

- header
- date/team filters
- KPI cards
- overdue customer widget
- inactive customer widget
- complaints widget
- top customers chart
- quick actions

---

## 4.2 Customer Master

### 4.2.1 Customer List

**Components**

- page header
- action bar
- search
- filters
- status tabs
- customer table
- credit status badge
- outstanding badge
- preview drawer
- pagination

### 4.2.2 Customer Detail / 360 View

**Components**

- customer header card
- action bar
- summary KPIs:
  - sales
  - outstanding
  - overdue
  - last order
- tabs:
  - profile
  - contacts
  - addresses
  - financials
  - sales settings
  - history
  - statements
  - complaints
  - attachments
  - audit
- customer form sections
- notes thread
- related records panel
- audit timeline

### 4.2.3 Customer Group / Segment

**Components**

- group list
- create/edit form
- counts by group widget

### 4.2.4 Customer Category

**Components**

- category table
- category form
- activation controls

### 4.2.5 Customer Status Management

**Components**

- status history
- hold/block reason form
- activate/deactivate actions
- audit trail

---

## 4.3 Contacts & Addresses

Common components:

- contact table
- contact detail form
- address cards
- default address indicator
- validation status
- map pin/location if relevant
- bulk import/export

---

## 4.4 Financial Profile

Common components:

- credit summary cards
- payment terms form
- tax info form
- outstanding table
- aging chart
- hold/release action area
- temporary credit approval panel

---

## 4.5 Sales Settings

Common components:

- price list selector
- discount rule mapping
- salesperson assignment
- territory assignment
- route assignment
- delivery preferences form
- effective date controls

---

## 4.6 History & Interactions

Common components:

- sales history table
- payment history table
- returns history table
- activity timeline
- issue/complaint tracker
- statement generator panel
- attachments
- comments

---

## 4.7 Reports & Exceptions

Common components:

- report filters
- profitability table/chart
- dormant customer analysis
- risk scoring panel
- exception table
- merge duplicate action
- resolution notes

---

## 5. Suppliers Module Component Matrix

## 5.1 Dashboard

Common components:

- supplier KPIs
- overdue payable widget
- delayed delivery widget
- quality issue widget
- performance chart
- quick actions

---

## 5.2 Supplier Master

### 5.2.1 Supplier List

**Components**

- page header
- action bar
- search
- filters
- supplier table
- status chips
- outstanding badge
- preview drawer

### 5.2.2 Supplier Detail / 360 View

**Components**

- supplier summary card
- action bar
- KPI cards:
  - spend
  - outstanding
  - on-time delivery
  - rejection rate
- tabs:
  - profile
  - contacts
  - addresses
  - financials
  - procurement settings
  - history
  - quality
  - communications
  - attachments
  - audit
- forms and grids within tabs
- notes thread
- audit timeline

### 5.2.3 Supplier Category

**Components**

- category table
- category form

### 5.2.4 Supplier Status

**Components**

- status history
- block/unblock actions
- reason capture
- audit trail

---

## 5.3 Contacts & Addresses

Common components:

- contacts table
- contact form
- address cards
- default address marker
- pickup/return address type badges

---

## 5.4 Financial Profile

Common components:

- payment terms form
- tax details form
- bank details form
- advance balance panel
- outstanding table
- aging widget
- adjustment controls

---

## 5.5 Procurement Settings

Common components:

- default items grid
- supplier price list table
- lead time form
- supplier SKU mapping grid
- preferred supplier badge
- import tools

---

## 5.6 History & Performance

Common components:

- purchase history table
- invoice history table
- return history table
- performance scorecard
- quality issue log
- communication timeline
- export scorecard action

---

## 5.7 Reports & Exceptions

Common components:

- spend analysis chart
- delivery performance table
- quality variance chart
- exception table
- source PO link
- block supplier action
- resolution notes

---

## 6. Finance Module Component Matrix

## 6.1 Dashboard

### 6.1.1 Finance Overview Dashboard

**Components**

- page header
- fiscal period selector
- company / branch filter
- KPI cards:
  - cash balance
  - bank balance
  - receivables
  - payables
  - revenue
  - expenses
  - profit estimate
- cash flow chart
- receivables aging widget
- payables aging widget
- bank reconciliation alert widget
- quick actions panel

### 6.1.2 Receivables Dashboard

**Components**

- KPI cards
- overdue customer table
- aging chart
- collection tracker
- high-risk accounts widget
- reminder action panel

### 6.1.3 Payables Dashboard

**Components**

- KPI cards
- due payments table
- supplier aging chart
- approval queue widget
- cash requirement summary

### 6.1.4 Treasury / Cash Dashboard

**Components**

- bank/cash balances cards
- inflow/outflow forecast chart
- unreconciled transactions table
- transfer action panel
- cheque clearance widget

---

## 6.2 Accounting Setup

### 6.2.1 Chart of Accounts

**Components**

- page header
- tree view
- account detail form
- create/edit actions
- account status badge
- balance preview
- audit trail

### 6.2.2 Account Groups / Tree

**Components**

- tree hierarchy
- drag/reorder tools
- group form
- counts/balance per group

### 6.2.3 Fiscal Years

**Components**

- fiscal year table
- open/close status badges
- create/edit form
- close/reopen controls

### 6.2.4 Cost Centers

**Components**

- list/table
- form
- hierarchy or grouping
- status badge

### 6.2.5 Profit Centers / Departments

**Components**

- list/table
- form
- reporting linkages

### 6.2.6 Tax Configuration

**Components**

- tax rules table
- rule form
- jurisdiction fields
- default mapping section
- effective dates

### 6.2.7 Currency Setup

**Components**

- currency table
- exchange rate table
- rate history chart
- update action
- default currency indicator

---

## 6.3 General Ledger

### 6.3.1 Journal Entry List

**Components**

- page header
- action bar
- filters
- JE table
- status tabs
- preview drawer
- export controls

### 6.3.2 Journal Entry Detail / Edit

**Components**

- entry header
- line items grid:
  - account
  - debit
  - credit
  - cost center
  - remarks
- balance indicator
- attachments
- narration section
- approval block
- posting preview
- audit trail

### 6.3.3 Recurring Journal Entries

**Components**

- recurring schedule table
- recurrence rule form
- next run panel
- active/inactive toggle

### 6.3.4 Accrual / Adjustment Entries

**Components**

- entry form
- reversal date field
- linked source reference
- approval block
- audit trail

### 6.3.5 GL Voucher Drilldown

**Components**

- voucher summary
- linked transaction panel
- line item view
- export/print action

### 6.3.6 General Ledger Report

**Components**

- filters
- account selector
- date range
- GL table
- running balance
- drilldown
- export controls

---

## 6.4 Accounts Receivable

Common screens should include:

- customer selector
- receivable summary cards
- invoice table
- payment allocation grid
- aging chart
- credit note section
- reminders / follow-up area
- write-off approval panel
- audit trail

---

## 6.5 Accounts Payable

Common screens should include:

- supplier selector
- payable summary cards
- invoice table
- payment allocation grid
- debit note section
- aging chart
- approval block
- audit trail

---

## 6.6 Cash & Bank

Common screens should include:

- bank account selector
- transaction table
- import tools
- matching engine panel
- reconciliation split view
- cheque register
- petty cash voucher form
- transfer form
- audit trail

---

## 6.7 Period Closing

Common screens should include:

- closing checklist
- open issues panel
- suspense entries table
- lock/unlock controls
- closing progress indicator
- approvals
- audit log

---

## 6.8 Financial Reports

Common report components:

- page header
- company / branch / fiscal filters
- comparison period controls
- report table
- chart view
- drilldown
- export PDF / Excel
- print
- saved views

---

## 6.9 Controls, Audit & Exceptions

Common components:

- exception / approval queue table
- severity/status filters
- source transaction linkage
- override actions
- audit notes
- resolution timeline
- system-generated rule badge

---

## 7. Cross-Module Global Component Matrix

## 7.1 Global Search

**Components**

- universal search input
- recent searches
- result grouping by module
- filters by record type
- quick preview drawer

## 7.2 Notifications

**Components**

- notifications list
- unread markers
- severity/priority badge
- open source action
- mark read controls

## 7.3 Approvals

**Components**

- approval queue table
- approval type filter
- record summary drawer
- approve/reject buttons
- notes
- approval history

## 7.4 Attachments / Document Manager

**Components**

- file grid/list
- upload area
- preview pane
- version history
- replace/delete actions
- linked records view

## 7.5 Activity Log / System Audit

**Components**

- timeline view
- user filter
- module filter
- action type filter
- record link
- before/after comparison panel

## 7.6 Settings

**Components**

- settings navigation sidebar
- detail form panel
- save/reset actions
- role/permission tables
- workflow designer area
- print/email template editors

---

## 8. Standard Screen Template Library

To keep implementation consistent, most ERP screens should reuse one of these templates.

## 8.1 Dashboard Template

- page header
- filter row
- KPI cards row
- main charts row
- action widgets row
- exceptions/alerts row

## 8.2 Master List Template

- page header
- primary action button
- search
- filters
- status tabs
- table
- bulk actions
- pagination
- preview drawer

## 8.3 Master Detail / 360 Template

- record header
- action bar
- summary cards
- tabs
- form sections / data panels
- related records
- notes/comments
- attachments
- audit trail

## 8.4 Transaction Form Template

- record header
- status tracker
- action bar
- form header section
- line items grid
- totals summary
- notes/instructions
- attachments
- approval block
- linked records
- audit trail

## 8.5 Approval Queue Template

- queue header
- filter row
- approval table
- selected record summary drawer
- warning panels
- action buttons
- notes
- approval timeline

## 8.6 Report Template

- page header
- report filters
- summary widgets
- chart/table switch
- drilldown
- export controls
- saved views

## 8.7 Exception Log Template

- header
- severity/status filters
- exception table
- source linkage
- owner assignment
- resolution notes
- timeline
- audit block
