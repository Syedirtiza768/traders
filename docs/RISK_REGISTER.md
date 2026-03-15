# Risk Register

## R001 — Seed Data Inconsistency
- **Severity**: High
- **Description**: Generated seed data may have broken references (e.g., invoice referencing non-existent customer)
- **Mitigation**: Strict generation order with dependency chain. Validation step after each generator. Use Frappe ORM for data creation to enforce constraints.
- **Detection**: Post-seed validation script checks referential integrity.

## R002 — Unrealistic Demo Numbers
- **Severity**: Medium
- **Description**: Randomly generated amounts may not resemble real-world trading data (e.g., negative margins, absurd quantities)
- **Mitigation**: Use bounded random ranges based on industry research. Define price/quantity profiles per item group. Review generated data against expected ratios.
- **Detection**: Financial summary validation — gross margin between 10–40%.

## R003 — Broken Financial Balances
- **Severity**: High
- **Description**: Journal entries, payments, and invoices may not balance, causing ERPNext accounting errors.
- **Mitigation**: Use ERPNext's built-in document submission workflow (which validates double-entry). Never bypass accounting validations. Run Trial Balance check after seeding.
- **Detection**: Trial Balance report must show zero difference.

## R004 — Orphaned Transactions
- **Severity**: Medium
- **Description**: Transactions created without proper links to master data.
- **Mitigation**: Create master data first (customers, suppliers, items) before transactions. Validate FK references. Use Frappe's `get_doc` and `insert` for all records.
- **Detection**: Run orphan detection queries in validation.

## R005 — ERPNext Workflow Conflicts
- **Severity**: Medium
- **Description**: Custom app may conflict with ERPNext's existing workflows, permissions, or hooks.
- **Mitigation**: Use `after_install` hooks sparingly. Extend, don't override, existing DocTypes. Test with fresh ERPNext installation.
- **Detection**: Run full ERPNext test suite after installation.

## R006 — Migration Issues
- **Severity**: Medium
- **Description**: Schema changes between ERPNext versions may break custom DocTypes or seed scripts.
- **Mitigation**: Pin ERPNext version in Docker. Use version-specific API calls. Document ERPNext version dependencies.
- **Detection**: CI pipeline tests against target ERPNext version.

## R007 — Performance with Large Seed Data
- **Severity**: Medium
- **Description**: Generating 500+ items, 600+ invoices may take excessive time or cause memory issues.
- **Mitigation**: Use batch processing with `frappe.db.commit()` every 50 records. Disable email notifications during seeding. Use `frappe.flags.in_import = True` to skip unnecessary validations.
- **Detection**: Seed execution time monitoring — must complete under 10 minutes.

## R008 — Docker Build Failures
- **Severity**: Low
- **Description**: Docker image builds may fail due to dependency changes or network issues.
- **Mitigation**: Pin all dependency versions. Use multi-stage builds. Cache pip/npm layers.
- **Detection**: CI pipeline builds Docker images on every push.

## R009 — Frontend-Backend API Mismatch
- **Severity**: Medium
- **Description**: Custom frontend may call APIs that don't exist or have changed signatures.
- **Mitigation**: Define API contract documentation. Use TypeScript types matching backend responses. Integration tests for critical endpoints.
- **Detection**: Frontend build + API integration tests in CI.

## R010 — Security Vulnerabilities
- **Severity**: High
- **Description**: Default passwords, exposed admin panels, or unprotected APIs.
- **Mitigation**: Force password change on first login. Restrict ERPNext Desk access. CORS configuration. Rate limiting. Environment-based secrets.
- **Detection**: Security checklist in deployment guide.
