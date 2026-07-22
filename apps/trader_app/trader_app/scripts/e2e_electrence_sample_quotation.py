# -*- coding: utf-8 -*-
"""Seed Electrence sample quotation E2E (EQFCCL250326 shape).

Creates items, customer Fauji Cement, Project, Quotation with hierarchy,
Customer Ref, terms. Verifies first-option totals and print payloads.

  bench --site <site> execute trader_app.scripts.e2e_electrence_sample_quotation.run \\
    --kwargs "{'company': 'Electrence'}"
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import cint, flt, nowdate

from trader_app.api.quotation_defaults import ELECTRENCE_QUOTATION_TERMS, SAMPLE_ITEMS
from trader_app.setup.custom_fields import ensure_custom_fields


CUSTOMER_NAME = "Fauji Cement Company Limited"
CUSTOMER_REF = "1000009032"
PROJECT_TITLE = "Fauji Cement OFC / RS-485 — EQFCCL250326"


def _ensure_item(spec, company):
    code = spec["item_code"]
    if frappe.db.exists("Item", code):
        item = frappe.get_doc("Item", code)
        item.description = spec["description"]
        item.standard_rate = spec["standard_rate"]
        item.save(ignore_permissions=True)
        return code

    item = frappe.get_doc({
        "doctype": "Item",
        "item_code": code,
        "item_name": spec["item_name"],
        "description": spec["description"],
        "item_group": frappe.db.get_value("Item Group", {"parent_item_group": ["is", "set"]}, "name")
        or frappe.db.get_value("Item Group", {}, "name")
        or "All Item Groups",
        "stock_uom": frappe.db.get_single_value("Stock Settings", "stock_uom") or "Nos",
        "is_stock_item": 1,
        "standard_rate": spec["standard_rate"],
        "valuation_rate": spec["standard_rate"],
    })
    item.insert(ignore_permissions=True)
    return code


def _ensure_customer(company):
    existing = frappe.db.get_value("Customer", {"customer_name": CUSTOMER_NAME}, "name")
    if existing:
        return existing
    # Prefer name = customer_name if free
    name = CUSTOMER_NAME
    if frappe.db.exists("Customer", name):
        return name
    cust = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": CUSTOMER_NAME,
        "customer_type": "Company",
        "customer_group": frappe.db.get_single_value("Selling Settings", "customer_group")
        or frappe.db.get_value("Customer Group", {}, "name")
        or "All Customer Groups",
        "territory": frappe.db.get_single_value("Selling Settings", "territory")
        or frappe.db.get_value("Territory", {}, "name")
        or "All Territories",
    })
    if frappe.db.has_column("Customer", "trader_tenant"):
        tenant = frappe.db.get_value("Company", company, "trader_tenant")
        if tenant:
            cust.trader_tenant = tenant
    cust.insert(ignore_permissions=True)

    if not frappe.db.exists(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": cust.name, "parenttype": "Address"},
    ):
        addr = frappe.get_doc({
            "doctype": "Address",
            "address_title": CUSTOMER_NAME,
            "address_type": "Billing",
            "address_line1": "Fauji Towers, Block - III, 68 Tipu Road, Chaklala",
            "city": "Rawalpindi",
            "country": "Pakistan",
            "links": [{"link_doctype": "Customer", "link_name": cust.name}],
        })
        try:
            addr.insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "e2e address create")
    return cust.name


def _sample_hierarchy():
    return [
        {
            "line_no": 1,
            "client_requirements": "CABLE FIBER OPTIC (OFC). SINGLE MODE",
            "option_no": 1,
            "option_text": "",
            "package_qty": 2500,
            "stock_status": "Ex-Stock",
            "items": [
                {
                    "item_code": "OFC-12C-SM-GYXTW",
                    "description": SAMPLE_ITEMS[0]["description"],
                    "unit_qty": 1,
                    "unit_price": 450,
                    "discount_percent": 0,
                }
            ],
        },
        {
            "line_no": 2,
            "client_requirements": "Cable EIA RS-485",
            "option_no": 1,
            "option_text": "Option A",
            "package_qty": 1000,
            "stock_status": "Ex-Stock",
            "items": [
                {
                    "item_code": "BELDEN-9842NH",
                    "description": SAMPLE_ITEMS[1]["description"],
                    "unit_qty": 1,
                    "unit_price": 1650,
                    "discount_percent": 0,
                }
            ],
        },
        {
            "line_no": 2,
            "client_requirements": "Cable RS-485 industrial",
            "option_no": 2,
            "option_text": "Option B",
            "package_qty": 1000,
            "stock_status": "Ex-Stock",
            "items": [
                {
                    "item_code": "DRAKA-RS485-24AWG",
                    "description": SAMPLE_ITEMS[2]["description"],
                    "unit_qty": 1,
                    "unit_price": 450,
                    "discount_percent": 0,
                }
            ],
        },
    ]


def run(company="Electrence", submit=0):
    ensure_custom_fields()
    if not frappe.db.exists("Company", company):
        frappe.throw("Company {0} not found".format(company))

    if not cint(frappe.db.get_value("Company", company, "trader_opportunity_enabled")):
        from trader_app.scripts.provision_opportunity import run as provision_opp
        provision_opp(company=company, template="electrence", activate=1)

    items = [_ensure_item(spec, company) for spec in SAMPLE_ITEMS]
    customer = _ensure_customer(company)

    # Ensure Address Template so address create works
    if not frappe.db.exists("Address Template", {"is_default": 1}):
        existing = frappe.db.get_value("Address Template", {"country": "Pakistan"}, "name")
        if existing:
            frappe.db.set_value("Address Template", existing, "is_default", 1)
        else:
            frappe.get_doc({
                "doctype": "Address Template",
                "country": "Pakistan",
                "is_default": 1,
                "template": "{{ address_line1 }}<br>{% if address_line2 %}{{ address_line2 }}<br>{% endif %}{{ city }}{% if state %}, {{ state }}{% endif %}<br>{{ country }}",
            }).insert(ignore_permissions=True)

    from trader_app.api.opportunity import create_opportunity, create_quotation_for_opportunity, create_quotation_revision
    from trader_app.api.hierarchy import hierarchy_amount, select_first_options
    from trader_app.api.printing import get_print_data

    project_hub = create_opportunity(
        data={
            "title": PROJECT_TITLE,
            "customer": customer,
            "enquiry_value": 3274500,
            "priority": "High",
            "description": "Sample from EQFCCL250326 letter pad quotation.",
        },
        company=company,
    )
    project_name = project_hub["opportunity"]["name"]

    hierarchy = _sample_hierarchy()
    expected_net = hierarchy_amount(hierarchy, first_option_only=True)
    # 2500*450 + 1000*1650 = 1,125,000 + 1,650,000 = 2,775,000
    assert abs(expected_net - 2775000) < 0.01, "expected first-option net 2775000 got {0}".format(expected_net)

    tax_template = frappe.db.get_value(
        "Sales Taxes and Charges Template",
        {"company": company, "is_default": 1},
        "name",
    ) or frappe.db.get_value("Sales Taxes and Charges Template", {"company": company}, "name")

    created = create_quotation_for_opportunity(
        project_name,
        data={
            "transaction_date": "2026-03-25",
            "valid_till": "2026-04-01",
            "customer_ref": CUSTOMER_REF,
            "terms": ELECTRENCE_QUOTATION_TERMS,
            "taxes_and_charges": tax_template,
            "order_details": {
                "validity_days": 5,
                "pay_advance_pct": 50,
                "pay_after_pct": 50,
                "pay_after_days": 30,
                "gst_mode": "exclusive",
                "freight_clause": "EXW",
                "rate_clause": "usd",
            },
            "commercial_options": hierarchy,
        },
        company=company,
    )
    qname = created["name"]

    # One-draft rule: second create without force returns existing
    again = create_quotation_for_opportunity(
        project_name,
        data={"commercial_options": hierarchy},
        company=company,
    )
    assert cint(again.get("existing_draft")) == 1, "expected existing_draft"
    assert again.get("name") == qname

    from trader_app.api.opportunity import discard_quotation_draft, get_opportunity

    hub = get_opportunity(project_name, company=company)
    assert hub.get("open_quotation_draft") and hub["open_quotation_draft"]["name"] == qname

    discard_quotation_draft(qname, company=company)
    hub2 = get_opportunity(project_name, company=company)
    assert not hub2.get("open_quotation_draft"), "draft should be cleared after discard"

    created = create_quotation_for_opportunity(
        project_name,
        data={
            "transaction_date": "2026-03-25",
            "valid_till": "2026-04-01",
            "customer_ref": CUSTOMER_REF,
            "terms": ELECTRENCE_QUOTATION_TERMS,
            "taxes_and_charges": tax_template,
            "order_details": {
                "validity_days": 5,
                "pay_advance_pct": 50,
                "pay_after_pct": 50,
                "pay_after_days": 30,
                "gst_mode": "exclusive",
                "freight_clause": "EXW",
                "rate_clause": "usd",
            },
            "commercial_options": hierarchy,
        },
        company=company,
    )
    qname = created["name"]
    q = frappe.get_doc("Quotation", qname)

    assert flt(getattr(q, "trader_pay_advance_pct", 0)) == 50
    assert getattr(q, "trader_freight_clause", None) == "EXW"
    assert getattr(q, "trader_customer_ref", None) == CUSTOMER_REF

    external = get_print_data("Quotation", qname, view_mode="external")
    internal = get_print_data("Quotation", qname, view_mode="internal")
    od = external.get("order_details") or {}

    result = {
        "ok": True,
        "company": company,
        "items": items,
        "customer": customer,
        "project": project_name,
        "quotation": qname,
        "customer_ref": getattr(q, "trader_customer_ref", None),
        "currency": q.currency,
        "net_total": flt(q.net_total),
        "grand_total": flt(q.grand_total),
        "expected_net": expected_net,
        "first_options": select_first_options(hierarchy),
        "external_item_count": len(external.get("items") or []),
        "internal_item_count": len(internal.get("items") or []),
        "external_customer_ref": external.get("customer_ref"),
        "print_freight": od.get("freight_clause"),
        "print_advance_pct": od.get("pay_advance_pct"),
        "terms_len": len(q.terms or ""),
        "commercial_rows": len(q.trader_commercial_options or []),
        "draft_rule_ok": True,
        "stock_status_sample": getattr(
            (q.trader_commercial_options or [None])[0], "stock_status", None
        ),
    }

    # CDC isolation: opportunity flag must remain off unless activated
    cdc_rows = frappe.get_all("Company", filters={"name": ["like", "%CDC%"]}, pluck="name", limit=1)
    if cdc_rows:
        cdc = cdc_rows[0]
        result["cdc_company"] = cdc
        result["cdc_opportunity_enabled"] = cint(
            frappe.db.get_value("Company", cdc, "trader_opportunity_enabled") or 0
        )

    if abs(flt(q.net_total) - expected_net) > 1:
        result["ok"] = False
        result["error"] = "net_total mismatch (tax template may alter net)"

    if cint(submit):
        q.submit()
        frappe.db.commit()
        rev = create_quotation_revision(qname, company=company)
        result["revision"] = rev
        result["submitted"] = True

    frappe.db.commit()
    return result
