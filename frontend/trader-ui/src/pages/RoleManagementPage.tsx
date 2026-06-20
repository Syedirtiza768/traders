import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Users, Shield, X, UserMinus, UserPlus } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type Role = {
  name: string;
  disabled: number;
  desk_access: number;
  is_custom: number;
};

type RoleUser = {
  name: string;
  full_name: string;
  email: string;
  enabled: number;
};

type AllUsersItem = {
  name: string;
  full_name: string;
  email: string;
  enabled: number;
  roles: string[];
};

export default function RoleManagementPage() {
  const navigate = useNavigate();
  const authRoles = useAuthStore((s) => s.roles);
  const isAdmin = authRoles.includes('Trader Admin') || authRoles.includes('System Manager');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected role to inspect
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);

  // Assign-user modal
  const [showAssign, setShowAssign] = useState(false);
  const [allUsers, setAllUsers] = useState<AllUsersItem[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [filter, setFilter] = useState<'all' | 'trader' | 'system'>('trader');

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllRoles();
      setRoles((res.data.message as Role[]) || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load roles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRoles(); }, []);

  const selectRole = async (role: Role) => {
    setSelectedRole(role);
    setRoleUsersLoading(true);
    try {
      const res = await adminApi.getRoleUsers(role.name);
      setRoleUsers((res.data.message as RoleUser[]) || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load role users.' });
    } finally {
      setRoleUsersLoading(false);
    }
  };

  const handleRemoveUser = async (user: RoleUser) => {
    if (!selectedRole) return;
    setAssigning(user.name);
    try {
      await adminApi.removeRoleFromUser(user.name, selectedRole.name);
      setRoleUsers((prev) => prev.filter((u) => u.name !== user.name));
      setFeedback({ type: 'success', message: `Removed "${selectedRole.name}" from ${user.full_name || user.name}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not remove role.' });
    } finally {
      setAssigning(null);
    }
  };

  const openAssignModal = async () => {
    setShowAssign(true);
    setAllUsersLoading(true);
    try {
      const res = await adminApi.getUsers({ page_size: 100 });
      setAllUsers((res.data.message as { data: AllUsersItem[] }).data || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load users.' });
    } finally {
      setAllUsersLoading(false);
    }
  };

  const handleAssignUser = async (user: AllUsersItem) => {
    if (!selectedRole) return;
    setAssigning(user.name);
    try {
      await adminApi.assignRoleToUser(user.name, selectedRole.name);
      // Refresh role users
      const res = await adminApi.getRoleUsers(selectedRole.name);
      setRoleUsers((res.data.message as RoleUser[]) || []);
      setFeedback({ type: 'success', message: `Assigned "${selectedRole.name}" to ${user.full_name || user.name}.` });
      setShowAssign(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not assign role.' });
    } finally {
      setAssigning(null);
    }
  };

  const filteredRoles = roles.filter((r) => {
    if (filter === 'trader') return r.name.startsWith('Trader ');
    if (filter === 'system') return !r.name.startsWith('Trader ');
    return true;
  });

  const alreadyHasRole = new Set(roleUsers.map((u) => u.name));
  const assignableUsers = allUsers.filter((u) => !alreadyHasRole.has(u.name) && u.enabled);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="card p-8 text-center text-gray-500 dark:text-slate-400">Administrator access required.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Role Management</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">View roles and manage which users are assigned to each role</p>
          </div>
          <button onClick={() => void loadRoles()} className="btn-secondary flex items-center gap-2 self-start">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Role list panel */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex gap-1">
              {(['trader', 'system', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {f === 'trader' ? 'Trader' : f === 'system' ? 'System' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40"><div className="spinner" /></div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[480px] overflow-y-auto">
              {filteredRoles.map((role) => (
                <button
                  key={role.name}
                  onClick={() => void selectRole(role)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors ${
                    selectedRole?.name === role.name ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield size={14} className={`flex-shrink-0 ${role.name.startsWith('Trader ') ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-slate-500'}`} />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{role.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {role.disabled ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">Off</span>
                      ) : null}
                      {role.is_custom ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">Custom</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
              {filteredRoles.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No roles found.</div>
              )}
            </div>
          )}
        </div>

        {/* Role detail panel */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">{selectedRole.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {roleUsersLoading ? 'Loading…' : `${roleUsers.length} user${roleUsers.length !== 1 ? 's' : ''} assigned`}
                  </p>
                </div>
                <button
                  onClick={() => void openAssignModal()}
                  className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5"
                >
                  <UserPlus size={13} /> Assign User
                </button>
              </div>

              {roleUsersLoading ? (
                <div className="flex items-center justify-center h-32"><div className="spinner" /></div>
              ) : roleUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">
                  No users assigned to this role yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {roleUsers.map((u) => (
                    <div key={u.name} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
                          <Users size={14} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.full_name || u.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.enabled ? 'bg-green-100 text-green-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                          {u.enabled ? 'Active' : 'Off'}
                        </span>
                        <button
                          onClick={() => void handleRemoveUser(u)}
                          disabled={assigning === u.name}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 hover:text-red-600 disabled:opacity-40"
                          title="Remove role from user"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-10 text-center text-sm text-gray-400 dark:text-slate-500">
              Select a role on the left to view and manage its assigned users.
            </div>
          )}
        </div>
      </div>

      {/* Assign user modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAssign(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Assign user to "{selectedRole?.name}"</h3>
              <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {allUsersLoading ? (
                <div className="flex items-center justify-center h-24"><div className="spinner" /></div>
              ) : assignableUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">All active users already have this role.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {assignableUsers.map((u) => (
                    <button
                      key={u.name}
                      onClick={() => void handleAssignUser(u)}
                      disabled={assigning === u.name}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 text-left disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.full_name || u.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{u.email}</p>
                      </div>
                      <UserPlus size={14} className="ml-auto flex-shrink-0 text-brand-600 dark:text-brand-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
