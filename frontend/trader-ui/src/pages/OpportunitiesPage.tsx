import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { customersApi, opportunityApi } from '../lib/api';
import { debounce, extractFrappeError, formatCurrency, formatDate } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  FilterTabs,
  SearchField,
  StatusBadge,
  PaginationBar,
  StatCard,
} from '../components/ui';

const STATUS_TABS = ['All', 'Open', 'Closed'] as const;
const PAGE_SIZE = 15;
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;

type ProjectRow = {
  name: string;
  opportunity_ref: string;
  title: string;
  customer: string;
  customer_name?: string;
  enquiry_date?: string;
  enquiry_value?: number;
  priority?: string;
  status?: string;
  display_stage?: string;
  watchlist?: number;
};

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const status = searchParams.get('status') || 'All';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') nextParams.delete(key);
      else nextParams.set(key, value);
    });
    setSearchParams(nextParams);
  };

  const buildDetailPath = (name: string) => {
    const query = listSearch ? `?list=${encodeURIComponent(listSearch)}` : '';
    return `/sales/opportunities/${encodeURIComponent(name)}${query}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: PAGE_SIZE };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;
      const res = await opportunityApi.list(params);
      const payload = res.data.message;
      setItems(payload.items || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null, page: null });
    }, 400),
    [searchParams],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openCount = items.filter((row) => row.status === 'Open').length;
  const watchCount = items.filter((row) => row.watchlist).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Projects"
        description="Enquiry hub for quotations, order confirmations, deliveries, and invoices."
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Project
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total" display={total.toLocaleString()} />
        <StatCard label="Open (this page)" display={openCount.toLocaleString()} />
        <StatCard label="Watchlist (this page)" display={watchCount.toLocaleString()} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={[...STATUS_TABS]}
          value={status}
          onChange={(entry) => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
          ariaLabel="Project status"
        />
        <SearchField
          placeholder="Search ref, title, customer…"
          aria-label="Search projects"
          defaultValue={search}
          onChange={debouncedSearch}
        />
      </div>

      <div className="table-container hidden md:block">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Customer</th>
              <th scope="col">Enquiry</th>
              <th scope="col">Stage</th>
              <th scope="col" className="text-right">Estimate</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingBlock compact label="Loading projects…" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No projects found"
                    description={search || status !== 'All' ? 'Try adjusting filters or search.' : undefined}
                    action={
                      <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
                        New Project
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.name}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => navigate(buildDetailPath(row.name))}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-start gap-2">
                      {row.watchlist ? <Star className="mt-0.5 h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
                      <div>
                        <p className="font-medium text-brand-700 dark:text-brand-300">{row.opportunity_ref}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{row.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-700 dark:text-slate-300">{row.customer_name || row.customer}</td>
                  <td className="text-gray-600 dark:text-slate-400">{formatDate(row.enquiry_date)}</td>
                  <td className="text-gray-600 dark:text-slate-400">{row.display_stage || 'Enquiry'}</td>
                  <td className="num text-gray-700 dark:text-slate-300">
                    {row.enquiry_value ? formatCurrency(row.enquiry_value) : '—'}
                  </td>
                  <td>
                    <StatusBadge status={row.status || ''} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card divide-y divide-gray-100 dark:divide-slate-800 md:hidden">
        {loading ? (
          <LoadingBlock compact label="Loading projects…" />
        ) : items.length === 0 ? (
          <EmptyState compact title="No projects found" description={search || status !== 'All' ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          items.map((row) => (
            <button
              key={row.name}
              type="button"
              className="w-full px-4 py-3 text-left"
              onClick={() => navigate(buildDetailPath(row.name))}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{row.opportunity_ref}</p>
                <StatusBadge status={row.status || ''} />
              </div>
              <p className="mt-0.5 text-sm text-gray-800">{row.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                {row.customer_name || row.customer} · {row.display_stage || 'Enquiry'}
              </p>
            </button>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => updateSearchParams({ page: p > 1 ? String(p) : null })}
      />

      {showCreate ? (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(name) => {
            setShowCreate(false);
            navigate(buildDetailPath(name));
          }}
        />
      ) : null}
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<{ name: string; customer_name?: string }[]>([]);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('Normal');
  const [enquiryValue, setEnquiryValue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await customersApi.getList({ search: customerQuery || undefined, page_size: 20 });
        const payload = res.data.message;
        setCustomers(payload.data || payload.items || payload || []);
      } catch {
        setCustomers([]);
      }
    };
    void loadCustomers();
  }, [customerQuery]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customer) {
      setError('Title and customer are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await opportunityApi.create({
        title: title.trim(),
        customer,
        priority,
        enquiry_value: enquiryValue ? Number(enquiryValue) : 0,
        description: description || undefined,
      });
      const name = res.data.message?.opportunity?.name;
      if (!name) throw new Error('Missing project name');
      onCreated(name);
    } catch (err) {
      setError(extractFrappeError(err, 'Could not create project.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form onSubmit={handleSubmit} className="card w-full max-w-lg space-y-4 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
          <button type="button" className="text-sm text-gray-500 hover:text-gray-800" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Title</span>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Customer search</span>
          <input
            className="input-field"
            placeholder="Type to filter…"
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Customer</span>
          <select className="input-field" value={customer} onChange={(e) => setCustomer(e.target.value)} required>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.name} value={c.name}>
                {c.customer_name || c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Priority</span>
            <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">Enquiry value</span>
            <input
              className="input-field"
              type="number"
              min="0"
              step="0.01"
              value={enquiryValue}
              onChange={(e) => setEnquiryValue(e.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Description</span>
          <textarea className="input-field min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
