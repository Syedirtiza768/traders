/**
 * QuickAddForms
 *
 * Lightweight inline entity-creation forms for Customer, Supplier, and Item.
 * These are rendered inside QuickAddModal — they are NOT standalone pages.
 *
 * Each form:
 *  - Fetches its own setup data (groups, UOMs, etc.)
 *  - Calls the existing API layer
 *  - On success, fires onCreated(option, rawEntity) so the parent can inject + select
 *  - On error, shows inline error and keeps the modal open
 *
 * Pattern is intentionally copied from CreateCustomerPage / CreateSupplierPage / CreateItemPage
 * to maintain consistency — but stripped to the minimal fields for quick inline creation.
 */

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { customersApi, inventoryApi, suppliersApi } from '../lib/api';
import SearchableSelect from './SearchableSelect';
import type { SelectOption } from './SearchableSelect';

// ─── Shared Field layout (matches existing pattern in Create*Page files) ──────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── Quick Add Customer Form ─────────────────────────────────────────────────

type QuickAddProps = {
  prefill?: string;
  onCreated: (option: SelectOption, rawEntity: any) => void;
  onCancel: () => void;
};

export function QuickAddCustomerForm({ prefill = '', onCreated, onCancel }: QuickAddProps) {
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    customer_name: prefill,
    customer_group: '',
    territory: '',
    mobile_no: '',
    email_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customersApi.getGroups();
        setGroups(res.data.message || []);
      } catch {
        // Groups are optional — form still works
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await customersApi.create(form);
      const created = res.data.message;
      onCreated(
        { label: created.customer_name || created.name, value: created.name },
        created,
      );
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Could not create customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Name *">
          <input
            autoFocus
            value={form.customer_name}
            onChange={(e) => setForm((c) => ({ ...c, customer_name: e.target.value }))}
            className="input-field"
            placeholder="e.g. Al Noor Traders"
          />
        </Field>
        <Field label="Customer Group">
          <SearchableSelect
            value={form.customer_group}
            onChange={(v) => setForm((c) => ({ ...c, customer_group: v }))}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
            disabled={loading}
          />
        </Field>
        <Field label="Mobile No">
          <input
            value={form.mobile_no}
            onChange={(e) => setForm((c) => ({ ...c, mobile_no: e.target.value }))}
            className="input-field"
            placeholder="03xx-xxxxxxx"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={form.email_id}
            onChange={(e) => setForm((c) => ({ ...c, email_id: e.target.value }))}
            className="input-field"
            placeholder="accounts@example.com"
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Creating…' : 'Create Customer'}
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add Supplier Form ─────────────────────────────────────────────────

export function QuickAddSupplierForm({ prefill = '', onCreated, onCancel }: QuickAddProps) {
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    supplier_name: prefill,
    supplier_group: '',
    country: 'Pakistan',
    mobile_no: '',
    email_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await suppliersApi.getGroups();
        setGroups(res.data.message || []);
      } catch {
        // Groups are optional
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (!form.supplier_name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await suppliersApi.create(form);
      const created = res.data.message;
      onCreated(
        { label: created.supplier_name || created.name, value: created.name },
        created,
      );
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Could not create supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Supplier Name *">
          <input
            autoFocus
            value={form.supplier_name}
            onChange={(e) => setForm((c) => ({ ...c, supplier_name: e.target.value }))}
            className="input-field"
            placeholder="e.g. Pak Industrial Supplies"
          />
        </Field>
        <Field label="Supplier Group">
          <SearchableSelect
            value={form.supplier_group}
            onChange={(v) => setForm((c) => ({ ...c, supplier_group: v }))}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
            disabled={loading}
          />
        </Field>
        <Field label="Mobile No">
          <input
            value={form.mobile_no}
            onChange={(e) => setForm((c) => ({ ...c, mobile_no: e.target.value }))}
            className="input-field"
            placeholder="03xx-xxxxxxx"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={form.email_id}
            onChange={(e) => setForm((c) => ({ ...c, email_id: e.target.value }))}
            className="input-field"
            placeholder="purchasing@example.com"
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Creating…' : 'Create Supplier'}
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add Item Form ─────────────────────────────────────────────────────

export function QuickAddItemForm({ prefill = '', onCreated, onCancel }: QuickAddProps) {
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    item_code: prefill,
    item_name: prefill,
    item_group: '',
    stock_uom: 'Nos',
    is_stock_item: 1,
    standard_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await inventoryApi.getItemGroups();
        setGroups(res.data.message || []);
      } catch {
        // Groups are optional
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSave = async () => {
    if (!form.item_code.trim()) {
      setError('Item code is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await inventoryApi.createItem(form);
      const created = res.data.message;
      onCreated(
        {
          label: created.item_name || created.item_code || created.name,
          value: created.item_code || created.name,
        },
        created,
      );
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Could not create item.');
    } finally {
      setSaving(false);
    }
  };

  const UOM_OPTIONS = ['Nos', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pair', 'Set'].map((u) => ({
    label: u,
    value: u,
  }));

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item Code *">
          <input
            autoFocus
            value={form.item_code}
            onChange={(e) => setForm((c) => ({ ...c, item_code: e.target.value }))}
            className="input-field"
            placeholder="e.g. ITEM-001"
          />
        </Field>
        <Field label="Item Name">
          <input
            value={form.item_name}
            onChange={(e) => setForm((c) => ({ ...c, item_name: e.target.value }))}
            className="input-field"
            placeholder="e.g. Steel Pipe 2 inch"
          />
        </Field>
        <Field label="Item Group">
          <SearchableSelect
            value={form.item_group}
            onChange={(v) => setForm((c) => ({ ...c, item_group: v }))}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Select group"
            disabled={loading}
          />
        </Field>
        <Field label="Stock UOM">
          <SearchableSelect
            value={form.stock_uom}
            onChange={(v) => setForm((c) => ({ ...c, stock_uom: v }))}
            options={UOM_OPTIONS}
            placeholder="Select UOM"
          />
        </Field>
        <Field label="Standard Rate">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.standard_rate}
            onChange={(e) => setForm((c) => ({ ...c, standard_rate: Number(e.target.value) || 0 }))}
            className="input-field"
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Creating…' : 'Create Item'}
        </button>
      </div>
    </div>
  );
}
