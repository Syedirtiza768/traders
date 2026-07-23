# -*- coding: utf-8 -*-
"""Generator — full Commercial Opportunity project chain.

Exercises the entire sales-case backbone end-to-end so the accounting impact
can be validated with one command:

    Trader Opportunity (Project)
      -> Quotation
      -> Order Confirmation (Sales Order)
      -> Delivery Challan (Delivery Note)
      -> Sales Invoice          (GL: receivable / income / tax / COGS)
      -> Payment Entry          (GL: bank / receivable; withhold GL on settle)

Opt-in: only runs when Commercial Opportunity is enabled for the company
(``Company.trader_opportunity_enabled`` + active ``Trader Opportunity Profile``).
Otherwise it prints a skip notice and returns, so it is safe to keep in the
default generator order for tenants that don't use the project flow.
"""

from __future__ import unicode_literals

import random

import frappe
from frappe.utils import add_days, flt, getdate, nowdate

from trader_app.api.opportunity import (
    add_customer_po,
    create_invoice_for_opportunity,
    create_opportunity,
    create_order_confirmation,
    create_quotation_for_opportunity,
    is_opportunity_enabled,
)
from trader_app.demo.seed_engine.base import BaseGenerator


class OpportunityChainGenerator(BaseGenerator):
    name = "OpportunityChain"
    depends_on = ["Company", "Customers", "Items", "Inventory"]

    def generate(self):
        self._suppress_notifications()
        try:
            company = self.config["company_name"]
            if not is_opportunity_enabled(company):
                print("  ⏭️  Opportunity module disabled — skipping project-chain seed.")
                return

            customers = frappe.get_all(
                "Customer", filters={"disabled": 0}, pluck="name", limit_page_length=0
            )
            items = frappe.get_all(
                "Item",
                filters={"is_stock_item": 1, "disabled": 0, "is_sales_item": 1},
                fields=["name", "stock_uom"],
                limit_page_length=0,
            )
            if not customers or not items:
                print("  ⚠️  No customers or sellable items — skipping project-chain seed.")
                return

            item_prices = {}
            for ip in frappe.get_all(
                "Item Price",
                filters={"price_list": "Standard Selling"},
                fields=["item_code", "price_list_rate"],
                limit_page_length=0,
            ):
                item_prices[ip.item_code] = float(ip.price_list_rate or 0)

            n_chains = int(self.config.get("num_opportunity_chains", 3))
            print("  📊 OpportunityChain: %d project chain(s) planned" % n_chains)

            for i in range(n_chains):
                try:
                    self._build_one_chain(company, customers, items, item_prices, seq=i)
                except Exception as e:
                    if len(self.errors) < 20:
                        self.errors.append("OpportunityChain #%d: %s" % (i, str(e)))
                if i % 5 == 0:
                    frappe.db.commit()

            frappe.db.commit()
            print("  ✅ OpportunityChain: created %d records" % len(self.created_records))
            for err in self.errors[:5]:
                print("  ⚠️  %s" % err)
        finally:
            self._restore_notifications()

    # ─────────────────────────────────────────────────────────────
    def _build_one_chain(self, company, customers, items, item_prices, seq):
        customer = random.choice(customers)
        item = random.choice(items)
        rate = item_prices.get(item["name"]) or random.uniform(500, 5000)
        rate = round(rate, 2)
        qty = random.randint(1, 5)
        po_no = "DEMO-PO-%s-%d" % (getdate(nowdate()).strftime("%Y%m%d"), seq)

        # 1. Project
        opp = create_opportunity(
            data={
                "title": "Demo Project %d — %s" % (seq, customer),
                "customer": customer,
                "priority": random.choice(["Normal", "High", "Low"]),
                "enquiry_value": rate * qty,
            },
            company=company,
        )
        opp_name = opp.get("name") or opp.get("opportunity", {}).get("name")
        if not opp_name:
            raise RuntimeError("Opportunity creation returned no name")
        self.created_records.append(("Trader Opportunity", opp_name))

        # 2. Customer PO
        add_customer_po(
            opp_name,
            data={"customer_po_no": po_no, "po_date": nowdate(), "po_amount": rate * qty},
        )

        # 3. Quotation (draft -> submit)
        qres = create_quotation_for_opportunity(
            opp_name, data={"item_code": item["name"]}, company=company
        )
        qname = qres.get("name")
        if not qname:
            raise RuntimeError("Quotation creation returned no name")
        qdoc = frappe.get_doc("Quotation", qname)
        # Ensure a realistic rate/qty on the seeded line.
        for row in qdoc.items:
            row.rate = rate
            row.qty = qty
        qdoc.save(ignore_permissions=True)
        qdoc.submit()
        self.created_records.append(("Quotation", qname))

        # 4. Order Confirmation (Sales Order) -> submit
        oc = create_order_confirmation(
            opp_name, source_quotation=qname, customer_po_no=po_no, company=company
        )
        so_name = oc.get("name")
        if not so_name:
            raise RuntimeError("OC creation returned no name")
        so = frappe.get_doc("Sales Order", so_name)
        if so.docstatus == 0:
            so.submit()
        self.created_records.append(("Sales Order", so_name))

        # 5. Delivery Challan (Delivery Note) -> submit
        dn = create_delivery_note_for_opportunity_local(opp_name, so_name, company)
        dn_name = dn.get("name")
        if not dn_name:
            raise RuntimeError("DN creation returned no name")
        dndoc = frappe.get_doc("Delivery Note", dn_name)
        if dndoc.docstatus == 0:
            dndoc.submit()
        self.created_records.append(("Delivery Note", dn_name))

        # 6. Invoice from the challan (auto-submit) — posts AR/income/tax/COGS GL
        inv = create_invoice_for_opportunity(
            opp_name, delivery_notes=[dn_name], auto_submit=1, company=company
        )
        si_name = inv.get("name")
        if not si_name:
            raise RuntimeError("Invoice creation returned no name")
        self.created_records.append(("Sales Invoice", si_name))

        # 7. Payment Entry allocated to the invoice — posts bank/receivable GL
        self._receive_payment(company, customer, si_name)

    def _receive_payment(self, company, customer, si_name):
        si = frappe.get_doc("Sales Invoice", si_name)
        if si.docstatus != 1 or flt(si.outstanding_amount) <= 0:
            return
        paid = flt(si.outstanding_amount)
        bank = _default_bank_account(company)
        if not bank:
            raise RuntimeError("No bank/cash account found for payment")

        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Receive"
        pe.company = company
        pe.party_type = "Customer"
        pe.party = customer
        pe.posting_date = nowdate()
        pe.paid_amount = paid
        pe.received_amount = paid
        pe.paid_to = bank
        pe.paid_from = _receivable_account(company, si)
        pe.reference_no = si.name
        pe.reference_date = nowdate()
        pe.append(
            "references",
            {
                "reference_doctype": "Sales Invoice",
                "reference_name": si.name,
                "total_amount": flt(si.grand_total),
                "outstanding_amount": paid,
                "allocated_amount": paid,
            },
        )
        pe.insert(ignore_permissions=True)
        pe.submit()
        self.created_records.append(("Payment Entry", pe.name))

    def validate(self):
        if not is_opportunity_enabled(self.config["company_name"]):
            return True
        n_opp = frappe.db.count("Trader Opportunity", filters={"docstatus": ["<", 2]})
        assert n_opp >= 1, "No Trader Opportunities seeded"
        return True


# ── helpers (module-level to avoid importing the API's private path) ──

def create_delivery_note_for_opportunity_local(opp_name, so_name, company):
    from trader_app.api.opportunity import create_delivery_note_for_opportunity
    return create_delivery_note_for_opportunity(opp_name, source_oc=so_name, company=company)


def _default_bank_account(company):
    for at in ("Bank", "Cash"):
        acc = frappe.db.get_value(
            "Account",
            {"company": company, "account_type": at, "is_group": 0, "disabled": 0},
            "name",
        )
        if acc:
            return acc
    return None


def _receivable_account(company, si):
    return getattr(si, "debit_to", None) or frappe.db.get_value(
        "Account",
        {"company": company, "account_type": "Receivable", "is_group": 0, "disabled": 0},
        "name",
    )
