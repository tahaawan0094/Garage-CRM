import { useState, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  Box,
  CarFront,
  ShoppingCart,
  Database,
  Search,
  ArrowRight,
  Activity,
  Clock,
  Home,
  Wrench,
  Users,
  Plus,
  ChartColumn,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';

export interface NotificationItem {
  id: string;
  type: 'quote' | 'stock' | 'vehicle' | 'invoice' | 'system' | string;
  title: string;
  detail: string;
  time: string;
  tab: string;
}

interface NotificationsViewProps {
  notifications: NotificationItem[];
  readNotifIds: Set<string>;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (tab: string) => void;
  onRefresh?: () => void;
  notify?: (msg: string) => void;
}

const TAB_ICONS: Record<string, LucideIcon> = {
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
  'Users & Roles': ShieldCheck,
};

export function NotificationsView({
  notifications,
  readNotifIds,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
  onNavigate,
}: NotificationsViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter(n => !readNotifIds.has(n.id)).length,
      quotes: notifications.filter(n => n.type === 'quote').length,
      stock: notifications.filter(n => n.type === 'stock').length,
      vehicles: notifications.filter(n => n.type === 'vehicle').length,
      invoices: notifications.filter(n => n.type === 'invoice').length,
      system: notifications.filter(n => n.type === 'system').length,
    };
  }, [notifications, readNotifIds]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesDetail = n.detail.toLowerCase().includes(q);
        const matchesTab = n.tab.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDetail && !matchesTab) return false;
      }

      // Category
      if (categoryFilter !== 'All Categories') {
        if (categoryFilter === 'Quotations' && n.type !== 'quote') return false;
        if (categoryFilter === 'Low Stock' && n.type !== 'stock') return false;
        if (categoryFilter === 'Work Orders' && n.type !== 'vehicle') return false;
        if (categoryFilter === 'Invoices' && n.type !== 'invoice') return false;
        if (categoryFilter === 'Cloud System' && n.type !== 'system') return false;
      }

      // Status
      const isRead = readNotifIds.has(n.id);
      if (statusFilter === 'Unread Only' && isRead) return false;
      if (statusFilter === 'Read Alerts' && !isRead) return false;

      return true;
    });
  }, [notifications, readNotifIds, search, categoryFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageNotifications = filteredNotifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedNotif =
    filteredNotifications.find(n => n.id === selectedId) ??
    filteredNotifications[0] ??
    notifications.find(n => n.id === selectedId) ??
    notifications[0];

  const getTypeStyling = (type: string) => {
    switch (type) {
      case 'quote':
        return {
          icon: FileText,
          bg: '#fff0e7',
          text: '#f15a24',
          label: 'Quotation',
          roleClass: 'owner',
        };
      case 'stock':
        return {
          icon: Box,
          bg: '#fee2e2',
          text: '#dc2626',
          label: 'Inventory',
          roleClass: 'staff',
        };
      case 'vehicle':
        return {
          icon: CarFront,
          bg: '#e4f7ec',
          text: '#08a85d',
          label: 'Work Order',
          roleClass: 'mechanic',
        };
      case 'invoice':
        return {
          icon: ShoppingCart,
          bg: '#eaf3ff',
          text: '#1478ed',
          label: 'Billing',
          roleClass: 'cashier',
        };
      case 'system':
      default:
        return {
          icon: Database,
          bg: '#f0eaff',
          text: '#8a46dc',
          label: 'System Sync',
          roleClass: 'manager',
        };
    }
  };

  const selectedStyling = selectedNotif ? getTypeStyling(selectedNotif.type) : null;
  const SelectedTypeIcon = selectedStyling?.icon || Bell;
  const SelectedModuleIcon = selectedNotif ? (TAB_ICONS[selectedNotif.tab] || Bell) : Bell;
  const selectedIsRead = selectedNotif ? readNotifIds.has(selectedNotif.id) : false;

  return (
    <main className="users-management">
      {/* Page Header */}
      <header className="users-page-heading">
        <div className="users-page-title">
          <span>
            <Bell size={24} />
          </span>
          <div>
            <h1>All Notifications &amp; System Alerts</h1>
            <p>Real-time workshop activity monitor, approvals, low stock alerts, and cloud sync</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {stats.unread > 0 && (
            <button className="users-create-button" onClick={onMarkAllRead} title="Mark all alerts as read">
              <CheckCheck size={16} />
              <span>Mark All as Read ({stats.unread})</span>
            </button>
          )}

          <button
            type="button"
            className="intake-action-button outline"
            onClick={() => onNavigate('Dashboard')}
            title="Return to Dashboard"
          >
            <Home size={15} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* KPI Metrics Banner */}
      <section className="users-metrics" aria-label="Alerts summary">
        <article>
          <span className="users-metric-icon orange">
            <Bell size={20} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <small>Total Alerts</small>
          </div>
          <Activity size={24} className="users-spark orange-text" />
        </article>

        <article>
          <span className={`users-metric-icon ${stats.unread > 0 ? 'orange' : 'green'}`}>
            <Clock size={20} />
          </span>
          <div>
            <strong style={{ color: stats.unread > 0 ? '#dc2626' : '#159653' }}>{stats.unread}</strong>
            <small>Unread Alerts</small>
          </div>
          <Activity size={24} className={`users-spark ${stats.unread > 0 ? 'orange-text' : 'green-text'}`} />
        </article>

        <article>
          <span className="users-metric-icon blue">
            <FileText size={20} />
          </span>
          <div>
            <strong>{stats.quotes}</strong>
            <small>Pending Quotes</small>
          </div>
          <Activity size={24} className="users-spark blue-text" />
        </article>

        <article>
          <span className="users-metric-icon purple">
            <Box size={20} />
          </span>
          <div>
            <strong>{stats.stock}</strong>
            <small>Low Stock Alerts</small>
          </div>
          <Activity size={24} className="users-spark purple-text" />
        </article>
      </section>

      {/* 2-Column Split Layout */}
      <div className="users-management-layout">
        {/* Left Side: Alerts Table & Filters */}
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
                placeholder="Search alerts by title, description, module..."
                aria-label="Search alerts"
              />
            </label>

            <CustomDropdown
              value={categoryFilter}
              onChange={val => {
                setCategoryFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'All Categories', label: 'All Categories' },
                { value: 'Quotations', label: 'Quotations', badge: `${stats.quotes}`, badgeColor: 'orange' },
                { value: 'Low Stock', label: 'Low Stock', badge: `${stats.stock}`, badgeColor: 'red' },
                { value: 'Work Orders', label: 'Work Orders', badge: `${stats.vehicles}`, badgeColor: 'green' },
                { value: 'Invoices', label: 'Invoices & POS', badge: `${stats.invoices}`, badgeColor: 'blue' },
                { value: 'Cloud System', label: 'Cloud System', badge: `${stats.system}`, badgeColor: 'purple' },
              ]}
              ariaLabel="Filter by category"
            />

            <CustomDropdown
              value={statusFilter}
              onChange={val => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'All Status', label: 'All Status' },
                { value: 'Unread Only', label: 'Unread Only', badge: `${stats.unread}`, badgeColor: 'orange' },
                { value: 'Read Alerts', label: 'Read Alerts', badge: `${stats.total - stats.unread}`, badgeColor: 'green' },
              ]}
              ariaLabel="Filter by status"
            />
          </div>

          <div className="users-table-scroll">
            <table className="users-management-table">
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>#</th>
                  <th>Alert / Subject</th>
                  <th>Category</th>
                  <th>Target Module</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageNotifications.map((n, idx) => {
                  const isSelected = selectedNotif?.id === n.id;
                  const isRead = readNotifIds.has(n.id);
                  const styling = getTypeStyling(n.type);
                  const TypeIcon = styling.icon;
                  const ModuleIcon = TAB_ICONS[n.tab] || Bell;

                  return (
                    <tr
                      key={n.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => setSelectedId(n.id)}
                    >
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <span className="user-name-cell">
                          <span style={{ background: styling.bg, color: styling.text }}>
                            <TypeIcon size={13} />
                          </span>
                          <div>
                            <button
                              className="user-id-link"
                              style={{
                                color: '#172640',
                                fontWeight: 700,
                                fontSize: '8.5px',
                                textAlign: 'left',
                                display: 'block',
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedId(n.id);
                              }}
                            >
                              {n.title}
                            </button>
                            <span
                              style={{
                                fontSize: '7.5px',
                                color: '#64748b',
                                display: 'block',
                                maxWidth: '320px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {n.detail}
                            </span>
                          </div>
                        </span>
                      </td>

                      <td>
                        <span className={`user-role-badge ${styling.roleClass}`}>
                          {styling.label}
                        </span>
                      </td>

                      <td>
                        <span className="user-tabs-badge">
                          <ModuleIcon size={11} style={{ color: '#f15a24' }} />
                          <span>{n.tab}</span>
                        </span>
                      </td>

                      <td style={{ color: '#64748b', fontSize: '8px' }}>
                        {n.time}
                      </td>

                      <td>
                        {isRead ? (
                          <span className="user-status-badge active">
                            <Check size={9} /> Read
                          </span>
                        ) : (
                          <span
                            className="user-status-badge inactive"
                            style={{ background: '#fff0e7', color: '#ea580c' }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: '#ea580c',
                                display: 'inline-block',
                              }}
                            />
                            Unread
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', paddingRight: '10px' }}>
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="user-row-action"
                            title={isRead ? 'Mark as unread' : 'Mark as read'}
                            onClick={() => (isRead ? onMarkUnread(n.id) : onMarkRead(n.id))}
                          >
                            {isRead ? (
                              <Clock size={11} style={{ color: '#64748b' }} />
                            ) : (
                              <Check size={11} style={{ color: '#ea580c' }} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="user-row-action"
                            title={`Open ${n.tab} module`}
                            onClick={() => {
                              onMarkRead(n.id);
                              onNavigate(n.tab);
                            }}
                          >
                            <ArrowRight size={11} style={{ color: '#0284c7' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredNotifications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="users-empty">
                      No notifications match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="users-table-footer">
            <span>
              Showing {filteredNotifications.length ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredNotifications.length)} of {filteredNotifications.length} alerts
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

        {/* Right Side: Detail Inspector Card */}
        <aside className="user-detail-card">
          <header>
            <div>
              <Bell size={13} />
              <span>Alert Details &amp; Direct Action</span>
            </div>
            {selectedIsRead ? (
              <span style={{ fontSize: '8px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Check size={10} /> Verified Read
              </span>
            ) : (
              <span style={{ fontSize: '8px', color: '#ea580c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ea580c' }} /> Action Required
              </span>
            )}
          </header>

          {selectedNotif && selectedStyling ? (
            <>
              <div className="user-detail-heading">
                <span
                  className="user-large-avatar"
                  style={{ background: selectedStyling.bg, color: selectedStyling.text }}
                >
                  <SelectedTypeIcon size={18} />
                </span>
                <div>
                  <strong>{selectedNotif.title}</strong>
                  <span>Category: {selectedStyling.label} · Status: {selectedIsRead ? 'Read' : 'Active Unread'}</span>
                </div>
              </div>

              <div className="user-detail-facts">
                <div>
                  <SelectedModuleIcon size={13} />
                  <span>Module:</span>
                  <strong>{selectedNotif.tab}</strong>
                </div>
                <div>
                  <Clock size={13} />
                  <span>Time:</span>
                  <strong>{selectedNotif.time}</strong>
                </div>
                <div>
                  <Bell size={13} />
                  <span>Category:</span>
                  <strong>{selectedStyling.label}</strong>
                </div>
                <div>
                  <Check size={13} />
                  <span>Read Status:</span>
                  <strong style={{ color: selectedIsRead ? '#16a34a' : '#ea580c' }}>
                    {selectedIsRead ? 'Marked Read' : 'Unread'}
                  </strong>
                </div>
              </div>

              <div className="view-info-note-box" style={{ marginTop: '10px' }}>
                <small>ALERT DESCRIPTION &amp; EVENT DETAILS</small>
                <p>{selectedNotif.detail}</p>
              </div>

              <div className="user-detail-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => (selectedIsRead ? onMarkUnread(selectedNotif.id) : onMarkRead(selectedNotif.id))}
                  title={selectedIsRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {selectedIsRead ? 'Mark as Unread' : 'Mark as Read'}
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    onMarkRead(selectedNotif.id);
                    onNavigate(selectedNotif.tab);
                  }}
                  title={`Open ${selectedNotif.tab} workspace`}
                >
                  <span>Open {selectedNotif.tab}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </>
          ) : (
            <div className="users-empty" style={{ display: 'grid', placeItems: 'center', height: '180px' }}>
              <p style={{ margin: 0, fontSize: '9px', color: '#64748b' }}>Select an alert from the table to inspect details.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

export default NotificationsView;
