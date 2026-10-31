import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Check,
  X,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { authService, type AuthUser, ALL_CRM_TABS } from '../services/authService';

export default function UsersManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'staff',
    phone: '',
    email: '',
    allowedTabs: ['Dashboard', 'Work Orders'] as string[],
    isActive: true,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (_) {
      // Fallback: at least show owner session if offline
      const current = authService.getCurrentUser();
      if (current) setUsers([current]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      password: '',
      role: 'staff',
      phone: '',
      email: '',
      allowedTabs: ['Dashboard', 'POS Billing'],
      isActive: true,
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openEditModal = (user: AuthUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      password: '',
      role: user.role,
      phone: user.phone || '',
      email: user.email || '',
      allowedTabs: user.allowedTabs || ['Dashboard'],
      isActive: user.isActive !== false,
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const toggleTab = (tabName: string) => {
    setFormData(prev => {
      const exists = prev.allowedTabs.includes(tabName);
      const next = exists
        ? prev.allowedTabs.filter(t => t !== tabName)
        : [...prev.allowedTabs, tabName];
      return { ...prev, allowedTabs: next };
    });
  };

  const selectAllTabs = () => {
    setFormData(prev => ({ ...prev, allowedTabs: [...ALL_CRM_TABS] }));
  };

  const clearAllTabs = () => {
    setFormData(prev => ({ ...prev, allowedTabs: ['Dashboard'] }));
  };

  const applyPreset = (preset: 'cashier' | 'mechanic' | 'advisor') => {
    if (preset === 'cashier') {
      setFormData(prev => ({
        ...prev,
        role: 'cashier',
        allowedTabs: ['Dashboard', 'POS Billing', 'Invoices', 'Customers'],
      }));
    } else if (preset === 'mechanic') {
      setFormData(prev => ({
        ...prev,
        role: 'mechanic',
        allowedTabs: ['Dashboard', 'Work Orders', 'Vehicles', 'Parts Inventory'],
      }));
    } else if (preset === 'advisor') {
      setFormData(prev => ({
        ...prev,
        role: 'manager',
        allowedTabs: ['Dashboard', 'New Intake', 'Work Orders', 'Quotations', 'Vehicles', 'Customers'],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.fullName.trim() || !formData.username.trim()) {
      setError('Please provide full name and username.');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Please set an initial password for this user.');
      return;
    }

    if (formData.allowedTabs.length === 0) {
      setError('Please select at least one tab permission for this user.');
      return;
    }

    setBusy(true);
    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          fullName: formData.fullName,
          role: formData.role,
          allowedTabs: formData.role === 'owner' ? ALL_CRM_TABS : formData.allowedTabs,
          isActive: formData.isActive,
          password: formData.password || undefined,
          phone: formData.phone,
          email: formData.email,
        });
        setSuccess('User updated successfully!');
      } else {
        await authService.createUser({
          username: formData.username,
          fullName: formData.fullName,
          password: formData.password,
          role: formData.role,
          allowedTabs: formData.allowedTabs,
          phone: formData.phone,
          email: formData.email,
        });
        setSuccess('New staff user created successfully!');
      }

      await loadUsers();
      setTimeout(() => {
        setModalOpen(false);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (user: AuthUser) => {
    if (user.role === 'owner') {
      alert('The Owner account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${user.fullName}" (${user.username})?`)) {
      return;
    }

    try {
      await authService.deleteUser(user.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed deleting user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#f95932] flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">User Accounts & Role Permissions</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Owner controls staff logins, roles, and allowed CRM sidebar tabs
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f95932] hover:bg-[#e04a25] text-white font-semibold text-xs transition shadow-md shadow-orange-500/20 cursor-pointer"
        >
          <UserPlus size={16} />
          <span>Add New Staff User</span>
        </button>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading user accounts...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Users size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="font-semibold text-slate-700">No Staff Users Yet</h3>
          <p className="text-xs text-slate-400 mt-1">Create your first staff login with customized tab permissions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map(u => {
            const isOwner = u.role === 'owner';
            return (
              <div
                key={u.id || u.username}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isOwner
                            ? 'bg-[#f95932] text-white shadow-md shadow-orange-500/25'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{u.fullName}</h3>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isOwner
                          ? 'bg-orange-100 text-[#f95932]'
                          : u.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : u.role === 'cashier'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  {/* Tabs Access Tag List */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-semibold">Allowed CRM Tabs:</span>
                      <span className="text-[11px] font-bold text-[#f95932]">
                        {isOwner ? 'All 12 Tabs' : `${(u.allowedTabs || []).length} / 12 Tabs`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {isOwner ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-50 text-[#f95932] font-semibold border border-orange-200/60">
                          Full Owner Access (All Features)
                        </span>
                      ) : (
                        (u.allowedTabs || []).map(tab => (
                          <span
                            key={tab}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                          >
                            {tab}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      u.isActive !== false ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <span>{u.isActive !== false ? 'Active Account' : 'Disabled'}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                      title="Edit User Permissions"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!isOwner && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add or Edit Staff User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#f95932] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingUser ? `Edit User: ${editingUser.fullName}` : 'Create New Staff User'}
                  </h3>
                  <p className="text-xs text-slate-400">Set credentials & select visible sidebar tabs</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2">
                  <Check size={15} />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mehmood"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f95932]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    placeholder="e.g. cashier1"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f95932] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f95932]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#f95932]"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="mechanic">Mechanic / Technician</option>
                    <option value="manager">Service Manager</option>
                    <option value="staff">General Staff</option>
                    {editingUser?.role === 'owner' && <option value="owner">Owner (Master Admin)</option>}
                  </select>
                </div>
              </div>

              {/* Role Presets */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Allowed CRM Tabs Checklist
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllTabs}
                      className="text-[11px] font-semibold text-[#f95932] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllTabs}
                      className="text-[11px] font-semibold text-slate-500 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="text-[11px] text-slate-400">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('cashier')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  >
                    Cashier Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('mechanic')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    Mechanic Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('advisor')}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                  >
                    Advisor Preset
                  </button>
                </div>

                {/* Checklist Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {ALL_CRM_TABS.map(tab => {
                    const isChecked = formData.allowedTabs.includes(tab);
                    return (
                      <label
                        key={tab}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                          isChecked
                            ? 'bg-orange-50 border-[#f95932]/40 text-[#f95932] font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTab(tab)}
                          className="w-3.5 h-3.5 text-[#f95932] rounded focus:ring-0"
                        />
                        <span className="truncate">{tab}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              {editingUser && editingUser.role !== 'owner' && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Account Status</span>
                    <p className="text-[11px] text-slate-500">Allow this user to sign into the system</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f95932]"></div>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#f95932] hover:bg-[#e04a25] transition shadow-md shadow-orange-500/20 disabled:opacity-60"
                >
                  {busy ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
