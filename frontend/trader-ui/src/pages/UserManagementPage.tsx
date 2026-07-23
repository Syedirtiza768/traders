import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, UserCheck, UserX, RefreshCw, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useTenantStore } from '../stores/tenantStore';
import { PageHeader, LoadingBlock, AlertBanner, SearchField, EmptyState } from '../components/ui';

type User = {
  name: string;
  full_name: string;
  email: string;
  enabled: number;
  user_type: string;
  first_name: string;
  last_name: string;
  roles: string[];
};

type TraderRole = { name: string; disabled?: number };

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  roles: [] as string[],
  send_welcome_email: false,
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const roles_ = useAuthStore((s) => s.roles);
  const tenant = useTenantStore((s) => s.tenant);
  const multitenantEnabled = useTenantStore((s) => s.enabled);
  const isAdmin = roles_.includes('Trader Admin') || roles_.includes('System Manager');

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [traderRoles, setTraderRoles] = useState<TraderRole[]>([]);

  // Drawer state
  const [drawer, setDrawer] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ search: debouncedSearch || undefined, page, page_size: PAGE_SIZE });
      const msg = res.data.message as { data: User[]; total: number };
      setUsers(msg.data || []);
      setTotal(msg.total || 0);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load users.' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    settingsApi.getTraderRoles().then((res) => {
      setTraderRoles((res.data.message as TraderRole[]) || []);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setDrawer('create');
  };

  const openEdit = async (user: User) => {
    setEditTarget(user);
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || user.name,
      roles: user.roles.filter((r) => r.startsWith('Trader ')),
      send_welcome_email: false,
    });
    setDrawer('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      if (drawer === 'create') {
        await adminApi.createUser({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          roles: form.roles,
          send_welcome_email: form.send_welcome_email ? 1 : 0,
        });
        setFeedback({ type: 'success', message: `User "${form.email}" created successfully.` });
      } else if (drawer === 'edit' && editTarget) {
        await adminApi.updateUser({
          name: editTarget.name,
          first_name: form.first_name,
          last_name: form.last_name,
          roles: form.roles,
        });
        setFeedback({ type: 'success', message: 'User updated.' });
      }
      setDrawer(null);
      void loadUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.exception || err?.response?.data?.message || 'Could not save user.';
      setFeedback({ type: 'error', message: String(msg) });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (user: User) => {
    setTogglingUser(user.name);
    try {
      await adminApi.setUserEnabled(user.name, !user.enabled);
      setFeedback({ type: 'success', message: `User "${user.full_name || user.name}" ${user.enabled ? 'disabled' : 'enabled'}.` });
      void loadUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.exception || err?.response?.data?.message || 'Could not update user.';
      setFeedback({ type: 'error', message: String(msg) });
    } finally {
      setTogglingUser(null);
    }
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Settings
          </button>
        </div>
        <div className="card p-8 text-center text-gray-500 dark:text-slate-400">
          Administrator access required.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="User Management"
        description="Create and manage system user accounts and their Trader role assignments"
        actions={
          <>
            <button type="button" onClick={() => navigate('/settings')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Settings
            </button>
            <button type="button" onClick={() => void loadUsers()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> New User
            </button>
          </>
        }
      />

      {multitenantEnabled && tenant?.max_users ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          (tenant.user_count ?? total) >= tenant.max_users
            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
        }`}>
          Business users: <strong>{tenant.user_count ?? total}</strong> / <strong>{tenant.max_users}</strong>
          {(tenant.user_count ?? total) >= tenant.max_users && (
            <span className="ml-2">— user limit reached. Upgrade plan or remove inactive users.</span>
          )}
        </div>
      ) : null}

      {feedback ? (
        <AlertBanner tone={feedback.type === 'success' ? 'success' : 'error'} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </AlertBanner>
      ) : null}

      <SearchField
        placeholder="Search by name or email…"
        value={search}
        onChange={(value) => { setSearch(value); setPage(1); }}
        aria-label="Search users"
      />

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingBlock compact label="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState compact title="No users found." />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Trader Roles</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {users.map((u) => (
                    <tr key={u.name} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{u.full_name || u.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{u.user_type}</div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length > 0 ? u.roles.map((r) => (
                            <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                              {r.replace('Trader ', '')}
                            </span>
                          )) : <span className="text-xs text-gray-400 dark:text-slate-500">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          u.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        }`}>
                          {u.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => void openEdit(u)}
                            className="text-xs text-brand-700 dark:text-brand-400 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleToggle(u)}
                            disabled={togglingUser === u.name}
                            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 ${
                              u.enabled ? 'text-red-500' : 'text-green-600'
                            }`}
                            title={u.enabled ? 'Disable user' : 'Enable user'}
                          >
                            {u.enabled ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
              {users.map((u) => (
                <div key={u.name} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.full_name || u.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{u.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.roles.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                            {r.replace('Trader ', '')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.enabled ? 'Active' : 'Off'}
                      </span>
                      <button onClick={() => void openEdit(u)} className="text-xs text-brand-700 dark:text-brand-400">Edit</button>
                      <button onClick={() => void handleToggle(u)} disabled={togglingUser === u.name} className={u.enabled ? 'text-red-500' : 'text-green-600'}>
                        {u.enabled ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer overlay */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer(null)} />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {drawer === 'create' ? 'New User' : `Edit: ${editTarget?.full_name || editTarget?.name}`}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">First Name *</span>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="input-field mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Last Name</span>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="input-field mt-1"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Email *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  disabled={drawer === 'edit'}
                  className="input-field mt-1 disabled:opacity-60"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-2">Trader Roles</span>
                <div className="space-y-2">
                  {traderRoles.map((r) => (
                    <label key={r.name} className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 hover:border-brand-300 dark:hover:border-brand-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(r.name)}
                        onChange={() => toggleRole(r.name)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{r.name}</span>
                      {r.disabled ? <span className="ml-auto text-xs text-red-500">Disabled</span> : null}
                    </label>
                  ))}
                  {traderRoles.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500">No Trader roles found.</p>
                  )}
                </div>
              </div>

              {drawer === 'create' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.send_welcome_email}
                    onChange={(e) => setForm((f) => ({ ...f, send_welcome_email: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Send welcome email with login link</span>
                </label>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setDrawer(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => void handleSave()} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
