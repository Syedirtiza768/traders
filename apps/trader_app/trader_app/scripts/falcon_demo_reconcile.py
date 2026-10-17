# -*- coding: utf-8 -*-
"""Falcon demo - reconciliations after the run. DEMO ONLY. Fictional data.

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_reconcile.reconcile

Each check states both sides and their difference. Cancelled ledger rows (is_cancelled = 1) are excluded: a
cancellation is a reversal that nets to zero against the original. Amounts are PKR.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import flt

from trader_app.scripts import falcon_demo_spec as S

BANK = "Demo Bank - Current Account - FIS"


def _gl(account):
    """Debit less credit on a control or ledger account, cancelled rows excluded."""
    d, c = frappe.db.sql("""select coalesce(sum(debit), 0), coalesce(sum(credit), 0) from `tabGL Entry`
        where company = %s and account = %s and is_cancelled = 0""", (S.COMPANY, account))[0]
    return flt(d) - flt(c)


def _rows(sql, values=()):
    return frappe.db.sql(sql, values, as_dict=True)


def _rounded(value):
    return round(flt(value), 2)


def _trial_balance():
    rows = _rows("""select g.account, a.root_type, coalesce(sum(g.debit), 0) debit, coalesce(sum(g.credit), 0) credit
        from `tabGL Entry` g join `tabAccount` a on a.name = g.account
        where g.company = %s and g.is_cancelled = 0 group by g.account, a.root_type order by a.root_type, g.account""",
                 (S.COMPANY,))
    table, roots = [], {}
    for r in rows:
        bal = flt(r.debit) - flt(r.credit)
        table.append({"account": r.account, "root_type": r.root_type, "debit": _rounded(r.debit),
                      "credit": _rounded(r.credit), "balance": _rounded(bal)})
        roots[r.root_type] = roots.get(r.root_type, 0.0) + bal
    return table, {k: _rounded(v) for k, v in roots.items()}


def _party_gap(gl_by_party, sub_by_party):
    keys = sorted(set(gl_by_party) | set(sub_by_party))
    out = []
    for key in keys:
        gl_val = _rounded(gl_by_party.get(key, 0.0))
        sub_val = _rounded(sub_by_party.get(key, 0.0))
        out.append({"party": key, "gl": gl_val, "subledger": sub_val, "difference": _rounded(gl_val - sub_val)})
    return out


def reconcile():
    frappe.set_user("Administrator")
    co = S.COMPANY
    company = frappe.get_doc("Company", co)

    def control_account(field, fallback):
        """The company default when set, else the standard account name for the company abbreviation."""
        return company.get(field) or (fallback if frappe.db.exists("Account", fallback) else None)

    abbr = S.COMPANY_ABBR
    ar_acc = control_account("default_receivable_account", "Debtors - " + abbr)
    ap_acc = control_account("default_payable_account", "Creditors - " + abbr)
    stock_acc = control_account("default_inventory_account", "Stock In Hand - " + abbr)
    cogs_acc = control_account("cost_of_goods_sold_account", "Cost of Goods Sold - " + abbr)
    out = {"company": co, "as_of": S.AS_OF, "accounts": {"receivable": ar_acc, "payable": ap_acc,
                                                           "stock_in_hand": stock_acc, "cogs": cogs_acc,
                                                           "bank": BANK}}

    # 1. Journals balance: total debit = total credit, and every voucher balances.
    tot = _rows("""select coalesce(sum(debit), 0) debit, coalesce(sum(credit), 0) credit from `tabGL Entry`
        where company = %s and is_cancelled = 0""", (co,))[0]
    unbalanced = _rows("""select voucher_type, voucher_no, sum(debit) - sum(credit) difference from `tabGL Entry`
        where company = %s and is_cancelled = 0 group by voucher_type, voucher_no
        having abs(sum(debit) - sum(credit)) > 0.005""", (co,))
    out["journals"] = {"total_debit": _rounded(tot.debit), "total_credit": _rounded(tot.credit),
                       "difference": _rounded(flt(tot.debit) - flt(tot.credit)),
                       "unbalanced_vouchers": [dict(r) for r in unbalanced]}

    # 2. Trial balance by account and by root type (assets - liabilities - equity - income + expense = 0).
    table, roots = _trial_balance()
    out["trial_balance"] = table
    out["trial_balance_by_root"] = roots
    out["trial_balance_sum"] = _rounded(sum(roots.values()))

    # 3. Customer subledger (Sales Invoice outstanding) to the receivable control account.
    ar_gl = _gl(ar_acc)
    ar_sub = flt(frappe.db.sql("""select coalesce(sum(outstanding_amount), 0) from `tabSales Invoice`
        where company = %s and docstatus = 1""", (co,))[0][0])
    gl_ar_party = {r.party: flt(r.bal) for r in _rows("""select party, sum(debit) - sum(credit) bal from `tabGL Entry`
        where company = %s and account = %s and is_cancelled = 0 group by party""", (co, ar_acc)) if r.party}
    sub_ar_party = {r.customer: flt(r.bal) for r in _rows("""select customer, sum(outstanding_amount) bal
        from `tabSales Invoice` where company = %s and docstatus = 1 group by customer""", (co,))}
    out["receivables"] = {"control_gl": _rounded(ar_gl), "subledger": _rounded(ar_sub),
                          "difference": _rounded(ar_gl - ar_sub),
                          "by_customer": _party_gap(gl_ar_party, sub_ar_party)}

    # 4. Supplier subledger (Purchase Invoice outstanding) to the payable control account (credit balance).
    ap_gl = -_gl(ap_acc)
    ap_sub = flt(frappe.db.sql("""select coalesce(sum(outstanding_amount), 0) from `tabPurchase Invoice`
        where company = %s and docstatus = 1""", (co,))[0][0])
    gl_ap_party = {r.party: -flt(r.bal) for r in _rows("""select party, sum(debit) - sum(credit) bal from `tabGL Entry`
        where company = %s and account = %s and is_cancelled = 0 group by party""", (co, ap_acc)) if r.party}
    sub_ap_party = {r.supplier: flt(r.bal) for r in _rows("""select supplier, sum(outstanding_amount) bal
        from `tabPurchase Invoice` where company = %s and docstatus = 1 group by supplier""", (co,))}
    out["payables"] = {"control_gl": _rounded(ap_gl), "subledger": _rounded(ap_sub),
                       "difference": _rounded(ap_gl - ap_sub), "by_supplier": _party_gap(gl_ap_party, sub_ap_party)}

    # 5. Stock: zero opening, ledger to bin, ledger value to the stock-in-hand account.
    opening = flt(frappe.db.sql("""select coalesce(sum(actual_qty), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0 and posting_date < %s""", (co, S.FISCAL_YEAR[0]))[0][0])
    sle = _rows("""select item_code, warehouse, sum(actual_qty) qty, sum(stock_value_difference) val
        from `tabStock Ledger Entry` where company = %s and is_cancelled = 0 group by item_code, warehouse""", (co,))
    bins = _rows("""select item_code, warehouse, sum(actual_qty) qty, sum(stock_value) val from `tabBin`
        where warehouse in (select name from `tabWarehouse` where company = %s) group by item_code, warehouse""",
                 (co,))
    sle_map = {(r.item_code, r.warehouse): flt(r.qty) for r in sle}
    bin_map = {(r.item_code, r.warehouse): flt(r.qty) for r in bins}
    keys = sorted(set(sle_map) | set(bin_map))
    qty_gap = [{"item": k[0], "warehouse": k[1], "ledger_qty": _rounded(sle_map.get(k, 0)),
                "bin_qty": _rounded(bin_map.get(k, 0)), "difference": _rounded(sle_map.get(k, 0) - bin_map.get(k, 0))}
               for k in keys]
    received = flt(frappe.db.sql("""select coalesce(sum(actual_qty), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0 and voucher_type = 'Purchase Receipt'""", (co,))[0][0])
    delivered = flt(frappe.db.sql("""select coalesce(sum(actual_qty), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0 and voucher_type = 'Delivery Note' and actual_qty < 0""",
                                  (co,))[0][0])
    returned = flt(frappe.db.sql("""select coalesce(sum(actual_qty), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0 and voucher_type = 'Delivery Note' and actual_qty > 0""",
                                 (co,))[0][0])
    value_ledger = flt(frappe.db.sql("""select coalesce(sum(stock_value_difference), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0""", (co,))[0][0])
    stock_gl = _gl(stock_acc)
    out["stock"] = {"opening_qty": _rounded(opening), "received_qty": _rounded(received),
                    "delivered_qty": _rounded(-delivered), "returned_qty": _rounded(returned),
                    "ledger_qty": _rounded(sum(sle_map.values())), "bin_qty": _rounded(sum(bin_map.values())),
                    "qty_by_item_warehouse": qty_gap, "ledger_value": _rounded(value_ledger),
                    "stock_in_hand_gl": _rounded(stock_gl), "value_difference": _rounded(value_ledger - stock_gl)}

    # 6. Cost of goods sold: GL against the outflow value in the stock ledger.
    cogs_gl = _gl(cogs_acc)
    outflow = flt(frappe.db.sql("""select coalesce(sum(stock_value_difference), 0) from `tabStock Ledger Entry`
        where company = %s and is_cancelled = 0 and voucher_type = 'Delivery Note'""", (co,))[0][0])
    out["cogs"] = {"gl": _rounded(cogs_gl), "ledger_outflow_value": _rounded(-outflow),
                   "difference": _rounded(cogs_gl - (-outflow))}

    # 7. Bank: capital plus receipts minus supplier payments, against the bank control account.
    bank_gl = _gl(BANK)
    # Cash moves at the received amount on a receipt (gross less any withholding) and at the paid amount on a payment.
    pays = dict((r.payment_type, flt(r.amt)) for r in _rows("""select payment_type,
        sum(case when payment_type = 'Receive' then received_amount else paid_amount end) amt
        from `tabPayment Entry` where company = %s and docstatus = 1 group by payment_type""", (co,)))
    capital = flt(frappe.db.sql("""select coalesce(sum(debit), 0) from `tabGL Entry` where company = %s
        and account = %s and voucher_type = 'Journal Entry' and is_cancelled = 0""", (co, BANK))[0][0])
    expected = capital + pays.get("Receive", 0.0) - pays.get("Pay", 0.0)
    out["bank"] = {"gl": _rounded(bank_gl), "capital_introduced": _rounded(capital),
                   "customer_receipts": _rounded(pays.get("Receive", 0.0)),
                   "supplier_payments": _rounded(pays.get("Pay", 0.0)),
                   "expected": _rounded(expected), "difference": _rounded(bank_gl - expected)}

    # 7b. Withholding recoverable: the deduction rows on receipts against the WHT asset account.
    wht_gl = _gl(S.WHT_RECOVERABLE)
    wht_deducted = flt(frappe.db.sql("""select coalesce(sum(d.amount), 0) from `tabPayment Entry Deduction` d
        join `tabPayment Entry` p on p.name = d.parent
        where p.company = %s and p.docstatus = 1 and d.account = %s""", (co, S.WHT_RECOVERABLE))[0][0])
    out["withholding"] = {"account": S.WHT_RECOVERABLE, "control_gl": _rounded(wht_gl),
                          "receipt_deductions": _rounded(wht_deducted),
                          "difference": _rounded(wht_gl - wht_deducted)}

    # 8. Tax: GST on invoices and bills against the tax accounts in the ledger.
    out_accts = [r.account_head for r in _rows("""select distinct t.account_head from `tabSales Taxes and Charges` t
        join `tabSales Invoice` s on s.name = t.parent where s.company = %s and s.docstatus = 1""", (co,))]
    in_accts = [r.account_head for r in _rows("""select distinct t.account_head from `tabPurchase Taxes and Charges` t
        join `tabPurchase Invoice` p on p.name = t.parent where p.company = %s and p.docstatus = 1""", (co,))]
    output_inv = flt(frappe.db.sql("""select coalesce(sum(t.tax_amount), 0) from `tabSales Taxes and Charges` t
        join `tabSales Invoice` s on s.name = t.parent where s.company = %s and s.docstatus = 1""", (co,))[0][0])
    input_bill = flt(frappe.db.sql("""select coalesce(sum(t.tax_amount), 0) from `tabPurchase Taxes and Charges` t
        join `tabPurchase Invoice` p on p.name = t.parent where p.company = %s and p.docstatus = 1""", (co,))[0][0])
    output_gl = -sum(_gl(a) for a in out_accts)
    input_gl = sum(_gl(a) for a in in_accts)
    out["tax"] = {"output_accounts": out_accts, "input_accounts": in_accts,
                  "output_on_invoices": _rounded(output_inv), "output_gl": _rounded(output_gl),
                  "output_difference": _rounded(output_gl - output_inv),
                  "input_on_bills": _rounded(input_bill), "input_gl": _rounded(input_gl),
                  "input_difference": _rounded(input_gl - input_bill),
                  "net_gst_payable": _rounded(output_gl - input_gl)}

    # 9. Profit and loss, and invoice totals behind it.
    income = -sum(r["balance"] for r in table if r["root_type"] == "Income")
    expense = sum(r["balance"] for r in table if r["root_type"] == "Expense")
    net_sales = flt(frappe.db.sql("""select coalesce(sum(net_total), 0) from `tabSales Invoice`
        where company = %s and docstatus = 1 and is_return = 0""", (co,))[0][0])
    out["pnl"] = {"income_gl": _rounded(income), "expense_gl": _rounded(expense),
                  "net_profit_accounting": _rounded(income - expense),
                  "net_sales_on_invoices": _rounded(net_sales)}
    out["cash_vs_profit"] = {"bank_balance": _rounded(bank_gl),
                             "equity_contributed": _rounded(capital),
                             "accounting_profit": _rounded(income - expense),
                             "receivable_open": _rounded(ar_gl), "payable_open": _rounded(ap_gl),
                             "stock_on_hand_value": _rounded(stock_gl), "gst_net_payable": _rounded(output_gl - input_gl)}
    return json.loads(json.dumps(out, default=str))
