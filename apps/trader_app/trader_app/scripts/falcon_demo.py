# -*- coding: utf-8 -*-
"""Falcon Industrial Solutions - repeatable demo on an isolated site (DEMO ONLY, fictional data).

Run on a fresh site (see docs/demo-package/00-README.md):

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo.bootstrap
    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo.masters
    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo.run_business

Every step returns a list of ``{"step", "ok", "detail"}`` rows. Failures are recorded, not hidden.
Expected figures and the tax basis live in ``falcon_demo_spec``.
"""

from __future__ import unicode_literals

import json
import traceback

import frappe
from frappe.utils import add_days, flt, getdate, nowdate

from trader_app.scripts import falcon_demo_spec as S


def _log(rows, step, ok, detail=""):
    rows.append({"step": step, "ok": bool(ok), "detail": str(detail)[:500]})
    return ok


def _try(rows, step, fn):
    try:
        out = fn()
        _log(rows, step, True, out if out is not None else "")
        return out
    except Exception as exc:  # noqa: BLE001 - record and continue
        frappe.db.rollback()
        _log(rows, step, False, "{0}: {1} | {2}".format(type(exc).__name__, str(exc)[:300],
                                                         " ; ".join([l.strip() for l in traceback.format_exc().splitlines()
                                                                     if "trader_app/" in l or "erpnext/" in l][-2:])))
        return None


# ---------------------------------------------------------------------------------------------------------
# 1. Bootstrap: standard ERPNext data for Pakistan, the company, its fiscal year, Trader features, DBAs.
# ---------------------------------------------------------------------------------------------------------
def bootstrap():
    frappe.set_user("Administrator")
    rows = []

    def fixtures():
        from erpnext.setup.setup_wizard.operations import install_fixtures

        if not frappe.db.count("Item Group"):
            install_fixtures.install("Pakistan")
        frappe.db.set_single_value("Global Defaults", "default_currency", "PKR")
        frappe.db.set_single_value("Global Defaults", "country", "Pakistan")
        frappe.db.commit()
        return {"item_groups": frappe.db.count("Item Group"), "uoms": frappe.db.count("UOM"),
                "currency": frappe.db.get_single_value("Global Defaults", "default_currency")}

    _try(rows, "ERPNext standard data for Pakistan", fixtures)

    def company():
        if frappe.db.exists("Company", S.COMPANY):
            return "exists"
        doc = frappe.get_doc({
            "doctype": "Company",
            "company_name": S.COMPANY,
            "abbr": S.COMPANY_ABBR,
            "country": "Pakistan",
            "default_currency": "PKR",
            "chart_of_accounts": "Standard",
            "enable_perpetual_inventory": 1,
            "tax_id": S.LEGAL["ntn"],
            "domain": "Distribution",
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

    _try(rows, "Company " + S.COMPANY, company)

    def fiscal_year():
        name = "FY 2026-2027"
        if frappe.db.exists("Fiscal Year", name):
            return name
        fy = frappe.get_doc({"doctype": "Fiscal Year", "year": name,
                             "year_start_date": S.FISCAL_YEAR[0], "year_end_date": S.FISCAL_YEAR[1]})
        fy.append("companies", {"company": S.COMPANY})
        fy.insert(ignore_permissions=True)
        frappe.db.commit()
        return name

    _try(rows, "Fiscal year 2026-27 (1 July to 30 June)", fiscal_year)

    def trader_features():
        from trader_app.api import migration_toolkit as mt
        from trader_app.setup.custom_fields import ensure_custom_fields

        ensure_custom_fields()
        mt.provision_opportunity_pack(company=S.COMPANY, template="electrence", activate=1)
        mt.provision_ar_pack(company=S.COMPANY, template="electrence", activate=1)
        frappe.db.commit()
        return "opportunity and AR packs provisioned"

    _try(rows, "Trader Opportunity and Customer AR packs", trader_features)

    def dbas():
        from trader_app.api import trading_entity as te

        created = []
        for ent in S.TRADING_ENTITIES:
            if frappe.db.exists("Trader Trading Entity", {"trading_name": ent["name"], "company": S.COMPANY}):
                created.append(ent["name"] + " (exists)")
                continue
            res = te.create_trading_entity(data=json.dumps({
                "trading_name": ent["name"], "code": ent["code"], "letterhead_address": ent["letterhead"],
                "company": S.COMPANY, "is_active": 1, "is_default": 1 if ent["default"] else 0,
            }))
            created.append(res.get("name") if isinstance(res, dict) else str(res))
        frappe.db.commit()
        return created

    _try(rows, "Trading entities (DBA letterheads)", dbas)
    return rows
