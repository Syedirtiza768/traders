# -*- coding: utf-8 -*-
"""Seed Engine — Base generator class."""

from __future__ import unicode_literals

import frappe
from frappe.utils import now_datetime


class BaseGenerator:
    """Base class for all seed data generators."""

    name = "Base"
    depends_on = []

    def __init__(self, config):
        self.config = config
        self.created_records = []
        self.errors = []
        self.start_time = None
        self.end_time = None

    def generate(self):
        """Override in subclass. Main generation method."""
        raise NotImplementedError(f"{self.name} generator must implement generate()")

    def validate(self):
        """Override in subclass. Validate generated data."""
        raise NotImplementedError(f"{self.name} generator must implement validate()")

    def get_progress(self):
        """Return count of created records."""
        return len(self.created_records)

    def run(self):
        """Execute the generator with progress tracking."""
        self.start_time = now_datetime()
        print(f"\n{'='*60}")
        print(f"🔄 Starting: {self.name} Generator")
        print(f"{'='*60}")

        try:
            self.generate()
            self.end_time = now_datetime()
            elapsed = (self.end_time - self.start_time).total_seconds()
            print(f"✅ {self.name}: Created {self.get_progress()} records in {elapsed:.1f}s")
        except Exception as e:
            self.errors.append(str(e))
            print(f"❌ {self.name}: Failed — {str(e)}")
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Demo Seed Error: {self.name}"
            )
            raise

    def run_validation(self):
        """Execute validation with reporting."""
        print(f"  🔍 Validating: {self.name}...")
        try:
            result = self.validate()
            if result:
                print(f"  ✅ {self.name}: Validation passed")
            else:
                print(f"  ⚠️  {self.name}: Validation returned False")
            return result
        except Exception as e:
            print(f"  ❌ {self.name}: Validation failed — {str(e)}")
            return False

    def _commit_batch(self, batch_size=50):
        """Commit database transaction after batch_size records."""
        if len(self.created_records) % batch_size == 0:
            frappe.db.commit()

    def _suppress_notifications(self):
        """Suppress email notifications during seeding."""
        frappe.flags.in_import = True
        frappe.flags.mute_emails = True
        frappe.flags.mute_messages = True

    def _restore_notifications(self):
        """Restore email notifications after seeding."""
        frappe.flags.in_import = False
        frappe.flags.mute_emails = False
        frappe.flags.mute_messages = False
