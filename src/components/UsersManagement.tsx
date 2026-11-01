import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  Edit2,
  Trash2,
  Activity,
  Search,
  Phone,
  Mail,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Home,
  ShoppingCart,
  Plus,
  Wrench,
  FileText,
  CarFront,
  Users,
  Box,
  ChartColumn,
  Settings,
  UsersRound,
  UserCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { authService, type AuthUser, ALL_CRM_TABS } from '../services/authService';
import { CustomDropdown } from './CustomDropdown';

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  'Dashboard': Home,
  'POS Billing': ShoppingCart,
  'New Intake': Plus,
  'Work Orders': Wrench,
  'Quotations': FileText,
  'Invoices': FileText,
  'Vehicles': CarFront,
  'Customers': Users,
  'Parts Inventory': Box,
  'Mechanics': Users,
  'Reports': ChartColumn,
  'Settings': Settings,
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

interface UsersManagementProps {
  notify?: (message: string) => void;
}

export default function UsersManagement({ notify }: UsersManagementProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedId, setSelectedId] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'staff' as AuthUser['role'],
    phone: '',
    email: '',
    allowedTabs: ['Dashboard', 'POS Billing'] as string[],
    isActive: true,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await authService.getUsers();
      setUsers(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (_) {
      const current = authService.getCurrentUser();
      if (current) {
        setUsers([current]);
        setSelectedId(current.id);
      }
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
    setShowPassword(false);
    setError('');
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
    setShowPassword(false);
    setError('');
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

  const applyPreset = (preset: 'cashier' | 'mechanic' | 'advisor' | 'all') => {
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
    } else if (preset === 'all') {
      setFormData(prev => ({
        ...prev,
        allowedTabs: [...ALL_CRM_TABS],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
          fullName: formData.fullName.trim(),
          role: formData.role,
          allowedTabs: formData.role === 'owner' ? ALL_CRM_TABS : formData.allowedTabs,
          isActive: formData.isActive,
          password: formData.password || undefined,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        });
        if (notify) notify(`User "${formData.fullName}" updated successfully.`);
      } else {
        await authService.createUser({
          username: formData.username.trim(),
          fullName: formData.fullName.trim(),
          password: formData.password,
          role: formData.role,
          allowedTabs: formData.allowedTabs,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        });
        if (notify) notify(`New staff user "${formData.fullName}" created successfully.`);
      }

      await loadUsers();
      setModalOpen(false);
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
    if (!window.confirm(`Are you sure you want to delete user "${user.fullName}" (@${user.username})?`)) {
      return;
    }

    try {
      await authService.deleteUser(user.id);
      if (notify) notify(`User "${user.fullName}" deleted successfully.`);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed deleting user.');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const term = search.trim().toLowerCase();
      const matchSearch =
        `${u.fullName} ${u.username} ${u.phone || ''} ${u.email || ''}`
          .toLowerCase()
          .includes(term);
      if (!matchSearch) return false;

      if (roleFilter !== 'All Roles' && u.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter === 'Active' && u.isActive === false) return false;
      if (statusFilter === 'Inactive' && u.isActive !== false) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedUser =
    filteredUsers.find(u => u.id === selectedId) ??
    filteredUsers[0] ??
    users.find(u => u.id === selectedId) ??
    users[0];

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.isActive !== false).length,
      owners: users.filter(u => u.role === 'owner').length,
      staff: users.filter(u => u.role !== 'owner').length,
    };
  }, [users]);

  return (
    <main className="users-management">
      {/* Page Header */}
      <header className="users-page-heading">
        <div className="users-page-title">
          <span>
            <ShieldCheck size={26} />
          </span>
          <div>
            <h1>Staff Users &amp; Role Permissions</h1>
            <p>Owner controls staff logins, roles, and which sidebar tabs each user can see</p>
          </div>
        </div>

        <button className="users-create-button" onClick={openAddModal}>
          <UserPlus size={16} />
          <span>Add New Staff User</span>
        </button>
      </header>

      {/* KPI Metrics */}
      <section className="users-metrics" aria-label="Users summary">
        <article>
          <span className="users-metric-icon blue">
            <UsersRound size={20} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <small>Total Accounts</small>
          </div>
        </article>
        <article>
          <span className="users-metric-icon green">
            <UserCheck size={20} />
          </span>
          <div>
            <strong>{stats.active}</strong>
            <small>Active Users</small>
          </div>
        </article>
        <article>
          <span className="users-metric-icon orange">
            <ShieldCheck size={20} />
          </span>
          <div>
            <strong>{stats.owners}</strong>
            <small>Owner Admins</small>
          </div>
        </article>
        <article>
          <span className="users-metric-icon purple">
            <UserRound size={20} />
          </span>
          <div>
            <strong>{stats.staff}</strong>
            <small>Staff Logins</small>
          </div>
        </article>
      </section>

      {/* 2-Column Split Layout */}
      <div className="users-management-layout">
        {/* Left Side: Users List & Filters */}
        <section className="users-list-card">
          <div className="users-filters">
            <label className="users-search">
              <Search size={15} />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by staff name, @username, phone..."
                aria-label="Search users"
              />
            </label>
            <CustomDropdown
              value={roleFilter}
              onChange={val => {
                setRoleFilter(val);
                setPage(1);
              }}
              options={['All Roles', 'Owner', 'Manager', 'Cashier', 'Mechanic', 'Staff']}
              ariaLabel="Filter by role"
            />
            <CustomDropdown
              value={statusFilter}
              onChange={val => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'All Status', label: 'All Status' },
                { value: 'Active', label: 'Active', badge: 'Active', badgeColor: 'green' },
                { value: 'Inactive', label: 'Inactive', badge: 'Disabled', badgeColor: 'red' },
              ]}
              ariaLabel="Filter by status"
            />
          </div>

          <div className="users-table-scroll">
            <table className="users-management-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff User</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Sidebar Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((user, idx) => {
                  const isSelected = selectedUser?.id === user.id;
                  const initials = getInitials(user.fullName);
                  const isOwner = user.role === 'owner';
                  const tabCount = isOwner ? 12 : user.allowedTabs?.length || 0;

                  return (
                    <tr
                      key={user.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setSelectedId(user.id)}
                    >
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <span className="user-name-cell">
                          <span
                            style={{
                              background: isOwner ? '#fff0e7' : '#eaf3ff',
                              color: isOwner ? '#f15a24' : '#1478ed',
                            }}
                          >
                            {initials}
                          </span>
                          <div>
                            <button
                              className="user-id-link"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedId(user.id);
                              }}
                            >
                              {user.fullName}
                            </button>
                            <small
                              style={{
                                display: 'block',
                                color: '#718099',
                                fontSize: '7px',
                              }}
                            >
                              @{user.username}
                            </small>
                          </div>
                        </span>
                      </td>
                      <td>
                        <span className={`user-role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#536682' }}>
                          {user.phone || user.email || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="user-tabs-badge">
                          <Layers size={11} style={{ color: '#f15a24' }} />
                          <strong>{tabCount} / 12 Tabs</strong>
                        </span>
                      </td>
                      <td>
                        <span
                          className={`user-status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: user.isActive !== false ? '#159653' : '#d43b31',
                            }}
                          />
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {isOwner ? (
                            <span
                              style={{
                                fontSize: '7.5px',
                                color: '#ea580c',
                                background: '#fff0e7',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Master Owner account cannot be modified or deleted"
                            >
                              <ShieldCheck size={11} /> Master
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="user-row-action"
                                title="Edit User & Permissions"
                                onClick={() => openEditModal(user)}
                              >
                                <Edit2 size={12} style={{ color: '#0284c7' }} />
                              </button>
                              <button
                                type="button"
                                className="user-row-action delete"
                                title="Delete User"
                                onClick={() => handleDelete(user)}
                              >
                                <Trash2 size={12} style={{ color: '#e11d48' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="users-empty">
                      No staff accounts match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="users-table-footer">
            <span>
              Showing {filteredUsers.length ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} accounts
            </span>
            <div>
              <button
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  className={currentPage === pageNumber ? 'active' : ''}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>

        {/* Right Side: User Inspector & Tabs Permissions Card */}
        {selectedUser && (
          <aside className="user-detail-card" aria-label={`User details for ${selectedUser.username}`}>
            <header>
              <div>
                <ShieldCheck size={16} />
                <strong>Staff User Details</strong>
              </div>
              {selectedUser.role === 'owner' ? (
                <span
                  style={{
                    fontSize: '8px',
                    color: '#ea580c',
                    background: '#fff0e7',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  Root Owner
                </span>
              ) : (
                <button type="button" onClick={() => openEditModal(selectedUser)}>
                  Edit User
                </button>
              )}
            </header>

            <div className="user-detail-heading">
              <span
                className="user-large-avatar"
                style={{
                  background: selectedUser.role === 'owner' ? '#fff0e7' : '#eaf3ff',
                  color: selectedUser.role === 'owner' ? '#f15a24' : '#1478ed',
                }}
              >
                {getInitials(selectedUser.fullName)}
              </span>
              <div>
                <strong>{selectedUser.fullName}</strong>
                <span>@{selectedUser.username}</span>
              </div>
              <span className={`user-role-badge ${selectedUser.role}`}>
                {selectedUser.role}
              </span>
            </div>

            <div className="user-detail-facts">
              <div>
                <Phone size={14} />
                <span>Phone:</span>
                <strong>{selectedUser.phone || 'Not set'}</strong>
              </div>
              <div>
                <Mail size={14} />
                <span>Email:</span>
                <strong>{selectedUser.email || 'Not set'}</strong>
              </div>
              <div>
                <ShieldCheck size={14} />
                <span>Account Role:</span>
                <strong className="capitalize">{selectedUser.role}</strong>
              </div>
              <div>
                <Check size={14} />
                <span>Status:</span>
                <strong>{selectedUser.isActive !== false ? 'Active' : 'Inactive'}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Database size={14} />
                <span>Directory Sync:</span>
                <strong style={{ color: '#159653' }}>Atlas Cloud Verified</strong>
              </div>
            </div>

            {/* Sidebar Tabs Breakdown Section */}
            <div className="user-permissions-section">
              <h3>
                <Layers size={14} />
                <span>Granted Navigation Tabs</span>
                <span className="badge">
                  {selectedUser.role === 'owner' ? 12 : selectedUser.allowedTabs?.length || 0} / 12
                </span>
              </h3>

              {selectedUser.role === 'owner' ? (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#fff8f3',
                    border: '1px solid #ffd8c4',
                    color: '#c2410c',
                    fontSize: '8px',
                    lineHeight: '1.45',
                    marginBottom: '8px',
                  }}
                >
                  <strong>Full Master Access:</strong> Owner has full control over all 12 modules including Users &amp; Roles and Settings.
                </div>
              ) : null}

              <div className="user-tabs-pill-grid">
                {ALL_CRM_TABS.map(tabName => {
                  const Icon = TAB_ICON_MAP[tabName] || Box;
                  const isGranted =
                    selectedUser.role === 'owner' ||
                    selectedUser.allowedTabs?.includes(tabName);

                  return (
                    <div
                      key={tabName}
                      className={`user-tab-pill ${isGranted ? 'granted' : 'locked'}`}
                      title={isGranted ? `${tabName} is visible` : `${tabName} is hidden`}
                    >
                      <Icon size={12} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tabName}
                      </span>
                      {isGranted ? (
                        <Check size={11} style={{ flexShrink: 0 }} />
                      ) : (
                        <X size={11} style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="user-detail-actions">
              {selectedUser.role === 'owner' ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '9px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '9px',
                    color: '#64748b',
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: '-2px', color: '#ea580c', marginRight: '5px' }} />
                  <strong>Master Owner Account:</strong> Permanent root account. Protected against modifications and deletions.
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => openEditModal(selectedUser)}
                  >
                    <Edit2 size={13} />
                    <span>Edit Permissions</span>
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(selectedUser)}
                  >
                    <Trash2 size={13} />
                    <span>Delete User</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT STAFF USER (Identical CRM Dialog Design)               */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !busy && setModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              color: '#14213a',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#fafbfc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ff631c, #ea580c)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#17223a',
                    }}
                  >
                    {editingUser ? 'Edit Staff User Account' : 'Add New Staff User Account'}
                  </h2>
                  <p style={{ margin: '2px 0 0', color: '#667995', fontSize: '11px' }}>
                    Configure login credentials and select visible CRM sidebar navigation tabs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={busy}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={16} />
              </button>
            </header>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {error && (
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '11.5px',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Account Basic Info Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Tariq Khan"
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#1e293b',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Username (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })
                    }
                    placeholder="e.g. tariq_cashier"
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#1e293b',
                      outline: 'none',
                      backgroundColor: editingUser ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    {editingUser ? 'Password (leave blank to keep unchanged)' : 'Password *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '••••••••' : 'Min. 4 characters'}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 34px 0 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    disabled={editingUser?.role === 'owner'}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#1e293b',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="manager">Manager (Service Advisor)</option>
                    <option value="cashier">Cashier (Billing &amp; Invoices)</option>
                    <option value="mechanic">Mechanic (Job Cards &amp; Inventory)</option>
                    <option value="staff">Staff (Standard)</option>
                    {editingUser?.role === 'owner' && <option value="owner">Owner (Administrator)</option>}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +974 5512 3456"
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#1e293b',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. staff@garage.com"
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#1e293b',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Active Account Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#1e293b' }}>Active Login Status</strong>
                  <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
                    When disabled, this user will be blocked from logging into the CRM system
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    disabled={editingUser?.role === 'owner'}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#f15a24' }}
                  />
                  <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {formData.isActive ? 'Active' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Role Presets & 12 CRM Tabs Selection */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                      Visible Sidebar Navigation Tabs ({formData.allowedTabs.length} / 12)
                    </label>
                    <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                      Select which modules this user can see and access in the left sidebar
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => applyPreset('cashier')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      Cashier Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('mechanic')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      Mechanic Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('advisor')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      Advisor Preset
                    </button>
                    <button
                      type="button"
                      onClick={selectAllTabs}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ffd8c4',
                        background: '#fff0e7',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#ea580c',
                      }}
                    >
                      All Tabs
                    </button>
                    <button
                      type="button"
                      onClick={clearAllTabs}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#64748b',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* 12 Tabs Checkbox Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '6px',
                  }}
                >
                  {ALL_CRM_TABS.map(tabName => {
                    const Icon = TAB_ICON_MAP[tabName] || Box;
                    const isChecked = formData.allowedTabs.includes(tabName);

                    return (
                      <div
                        key={tabName}
                        onClick={() => toggleTab(tabName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 9px',
                          borderRadius: '6px',
                          border: isChecked ? '1px solid #ea580c' : '1px solid #e2e8f0',
                          background: isChecked ? '#fff7ed' : '#ffffff',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by div click
                          style={{ accentColor: '#ea580c' }}
                        />
                        <Icon
                          size={14}
                          style={{
                            color: isChecked ? '#ea580c' : '#64748b',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? '#9a3412' : '#334155',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {tabName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(110deg, #ff631c, #f04c08)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  {busy ? (
                    <span>Saving Account...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingUser ? 'Save Changes' : 'Create Staff User'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
