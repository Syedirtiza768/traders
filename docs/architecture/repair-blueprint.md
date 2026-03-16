# Repair Blueprint

## Title
Traders — Architecture Repair Blueprint

## Purpose
Prioritized engineering fix plan derived from the architecture audit findings. Items are organized by urgency and complexity.

## Generated From
- `docs/audits/architecture-findings.md`
- `docs/audits/dead-path-audit.md`
- `docs/audits/frontend-backend-mapping.md`
- `docs/architecture/permission-visibility-map.md`

## Last Audit Basis
Full repository audit — March 2026

---

## Priority Legend

| Priority | Meaning | Timeline |
|---|---|---|
| 🔴 P0 — Immediate | Release-blocking or data-integrity risk | Fix now |
| 🟠 P1 — Next Sprint | Important gap, should fix before next release | 1-2 weeks |
| 🟡 P2 — Planned | Structural improvement, moderate complexity | 2-4 weeks |
| 🔵 P3 — Cleanup | Low risk, improves maintainability | When capacity allows |

---

## 🔴 P0 — Immediate Fixes

### P0-01: Settings Page Has No Backend Persistence
**Finding:** PERM-03, FBM-04
**Description:** The Settings page (`/settings`) renders forms for General, Company, Localization, Security, Notifications, and Appearance settings, but the "Save Changes" button has no handler — no API call is made. User changes are lost on refresh.
**Fix:** Either connect to Frappe's `frappe.client.set_value` or a custom settings endpoint, or clearly mark Settings as read-only display.
**Files:** `frontend/trader-ui/src/pages/SettingsPage.tsx`

---

## 🟠 P1 — Next Sprint Fixes

### P1-01: "New Invoice" / "New Purchase" / "Add Customer" / "Add Supplier" Buttons Are Non-Functional
**Finding:** ACT-01 through ACT-04
**Description:** Action buttons exist in SalesPage, PurchasesPage, CustomersPage, and SuppliersPage but have no `onClick` handler or form/modal implementation.
**Fix:** Implement create flows — either inline forms, modals, or redirect to ERPNext form views.
**Files:** `SalesPage.tsx`, `PurchasesPage.tsx`, `CustomersPage.tsx`, `SuppliersPage.tsx`

### P1-02: Filter and Export Buttons Are Non-Functional
**Finding:** ACT-05, ACT-06
**Description:** Filter and Export buttons on Sales and Purchases pages have no implementation.
**Fix:** Implement filter panel (dropdowns/date pickers that modify `resourceApi.list` filters) and CSV/Excel export.
**Files:** `SalesPage.tsx`, `PurchasesPage.tsx`

### P1-03: Orphan Backend Endpoints — `get_warehouse_stock` and `get_stock_movement`
**Finding:** SVC-01, ENT-01, DEAD-01
**Description:** Two whitelisted endpoints in `inventory.py` are not called from the frontend.
**Fix:** Either build UI for warehouse-specific stock view and stock movement history, or document as internal-only endpoints.
**Files:** `apps/trader_app/trader_app/api/inventory.py`, potentially new frontend components

### P1-04: Role-Based Sidebar Visibility Not Implemented
**Finding:** PERM-01, PERM-02
**Description:** Custom Trader roles are defined in fixtures but sidebar shows all items to all users.
**Fix:** Check user roles from Frappe API and conditionally render nav items.
**Files:** `Sidebar.tsx`, `authStore.ts`

---

## 🟡 P2 — Planned Improvements

### P2-01: Sales Order Management Missing
**Finding:** ENT-04
**Description:** Sales Orders are read for "recent orders" dashboard widget but cannot be created, edited, or managed from the frontend.
**Fix:** Add Sales Order page or integrate with Sales page tabs.
**Files:** New page or extend `SalesPage.tsx`

### P2-02: Delivery Note and Purchase Receipt Not Exposed
**Finding:** ENT-03
**Description:** These DocTypes are created by demo generators but have no frontend screens.
**Fix:** Add delivery/receiving workflow screens or integrate with existing Sales/Purchases pages.

### P2-03: `_get_default_company()` Duplication
**Finding:** SVC-03
**Description:** Same helper function duplicated in all 3 API modules.
**Fix:** Extract to shared utility module `trader_app/api/_utils.py`.
**Files:** `api/dashboard.py`, `api/inventory.py`, `api/reports.py`

### P2-04: Search Component in Navbar Is Non-Functional
**Finding:** ACT-07
**Description:** The global search input in Navbar has no handler — typing does nothing.
**Fix:** Implement global search using Frappe's search API.
**Files:** `components/Navbar.tsx`

---

## 🔵 P3 — Cleanup Work

### P3-01: Remove Commented-Out Code in hooks.py
**Description:** Multiple sections of hooks.py contain commented-out configuration (doc_events, scheduler_events, website_route_rules, has_permission).
**Fix:** Either implement or remove commented blocks.
**Files:** `apps/trader_app/trader_app/hooks.py`

### P3-02: Notification Bell Has No Implementation
**Description:** Bell icon in Navbar shows a red dot but has no notification system.
**Fix:** Either implement notification system or remove indicator.
**Files:** `components/Navbar.tsx`

### P3-03: Standardize Error Handling in Pages
**Description:** Most pages only `console.error` on API failures without showing user-facing error states.
**Fix:** Add error state UI with retry buttons.

---

## Documentation Gaps

| Gap | Action Required |
|---|---|
| No API documentation for Frappe built-in endpoints used | Document expected Frappe resource API behavior |
| No OpenAPI/Swagger spec | Consider generating from Frappe introspection |
| No component library documentation | Consider Storybook or similar |
| No environment setup guide for contributors | Add CONTRIBUTING.md |
