# -*- coding: utf-8 -*-
"""Regression coverage for ERPNext mapper invoice classifications."""

from __future__ import unicode_literals

import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

if "frappe" not in sys.modules:
    sys.modules["frappe"] = MagicMock()
if "frappe.utils" not in sys.modules:
    sys.modules["frappe.utils"] = MagicMock()

from trader_app import hooks
from trader_app.api import invoice_types


class MappedInvoiceTypeTests(unittest.TestCase):
    def normalize(self, doctype, current_type, is_return=0):
        doc = SimpleNamespace(doctype=doctype, trader_invoice_type=current_type, is_return=is_return)
        with patch.object(invoice_types.frappe.db, "has_column", return_value=True), patch.object(
            invoice_types, "cint", side_effect=lambda value: int(value or 0)
        ):
            invoice_types.normalize_mapped_invoice_type(doc)
        return doc.trader_invoice_type

    def test_delivery_challan_copied_to_sales_invoice_becomes_tax_invoice(self):
        self.assertEqual(self.normalize("Sales Invoice", "Delivery Challan"), "Tax Invoice")

    def test_sales_return_becomes_credit_note(self):
        self.assertEqual(self.normalize("Sales Invoice", "Tax Invoice", is_return=1), "Credit Note")

    def test_purchase_return_becomes_debit_note(self):
        self.assertEqual(self.normalize("Purchase Invoice", "Tax Invoice", is_return=1), "Debit Note")

    def test_valid_invoice_classification_is_preserved(self):
        self.assertEqual(self.normalize("Sales Invoice", "Commercial Invoice"), "Commercial Invoice")

    def test_normalizer_runs_before_erpnext_select_validation(self):
        for doctype in ("Sales Invoice", "Purchase Invoice"):
            self.assertEqual(
                hooks.doc_events[doctype]["before_validate"],
                "trader_app.api.invoice_types.normalize_mapped_invoice_type",
            )


if __name__ == "__main__":
    unittest.main()
