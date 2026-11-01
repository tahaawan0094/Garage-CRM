import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUp,
  Bell,
  Box,
  CalendarDays,
  CarFront,
  ChartColumn,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  FileText,
  Headset,
  Home,
  Lock,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Unlock,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import PosBilling from './components/PosBilling';
import NewIntake from './components/NewIntake';
import WorkOrders from './components/WorkOrders';
import Quotations from './components/Quotations';
import Invoices from './components/Invoices';
import Vehicles from './components/Vehicles';
import Customers from './components/Customers';
import PartsInventory from './components/PartsInventory';
import Mechanics from './components/Mechanics';
import Reports from './components/Reports';
import AddPartModal from './components/AddPartModal';
import SettingsView, { defaultSettings, type GarageSettings } from './components/Settings';
import UsersManagement from './components/UsersManagement';
import NotificationsView from './components/NotificationsView';
import RegistrationPage from './components/RegistrationPage';
import ActivationPage from './components/ActivationPage';
import LoginPage from './components/LoginPage';
import { licenseService, type BusinessRegistration, type LicenseStatus } from './services/licenseService';
import { authService, type AuthUser } from './services/authService';
import { workOrdersApi, quotationsApi, customersApi, vehiclesApi, partsApi, mechanicsApi, invoicesApi } from './lib/api';
import { getNextInvoiceId, commitInvoiceId } from './lib/sequence';
import { DateRangeFilter, type DateFilterValue, matchesDateFilter } from './components/DateRangeFilter';

const nav: [string, LucideIcon][] = [['Dashboard', Home], ['POS Billing', ShoppingCart], ['New Intake', Plus], ['Work Orders', Wrench], ['Quotations', FileText], ['Invoices', FileText], ['Vehicles', CarFront], ['Customers', Users], ['Parts Inventory', Box], ['Mechanics', Users], ['Reports', ChartColumn], ['Settings', Settings]];
const money = (value: number) => `QAR ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
function PanelTitle({ icon: Icon, title, onView }: { icon: LucideIcon; title: string; onView?: () => void }) {
  return <div className="panel-title"><div><Icon size={25} /><h2>{title}</h2></div>{onView && <button className="text-link" onClick={onView}>View all</button>}</div>;
}
function App() {
  const [page, setPage] = useState('Dashboard');
  const [quotationRequested, setQuotationRequested] = useState(false);
  const [tab, setTab] = useState('Active');
  const [query, setQuery] = useState('');
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [liveInvoices, setLiveInvoices] = useState<any[]>([]);
  const [lowStockParts, setLowStockParts] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [posInitialTab, setPosInitialTab] = useState<'sale' | 'returns'>('sale');
  const [posTargetInvoiceId, setPosTargetInvoiceId] = useState<string | undefined>(undefined);
  const [dashboardDateFilter, setDashboardDateFilter] = useState<DateFilterValue>({ type: 'today' });

  // System Authentication & License Gate State
  const [systemState, setSystemState] = useState<{
    loading: boolean;
    isRegistered: boolean;
    registration: BusinessRegistration | null;
    license: LicenseStatus | null;
    currentUser: AuthUser | null;
    showActivationOverride: boolean;
    showLoginDirect: boolean;
  }>({
    loading: true,
    isRegistered: false,
    registration: null,
    license: null,
    currentUser: authService.getCurrentUser(),
    showActivationOverride: false,
    showLoginDirect: false,
  });

  useEffect(() => {
    let isMounted = true;
    const checkLicenseStatus = async () => {
      try {
        if (window.location.search.includes('reset') || window.location.search.includes('register')) {
          localStorage.removeItem('garage_registration_cache');
          localStorage.removeItem('garage_license_cache');
          localStorage.removeItem('garage_crm_user_session_v1');
          window.history.replaceState({}, '', window.location.pathname);
        }

        const res = await licenseService.getStatus();
        if (isMounted) {
          if (!res.isRegistered || !res.registration) {
            localStorage.removeItem('garage_registration_cache');
            localStorage.removeItem('garage_license_cache');
            localStorage.removeItem('garage_crm_user_session_v1');
            setSystemState({
              loading: false,
              isRegistered: false,
              registration: null,
              license: res.license || { status: 'UNREGISTERED', accessAllowed: false },
              currentUser: null,
              showActivationOverride: false,
              showLoginDirect: false,
            });
            return;
          }
          const savedUser = authService.getCurrentUser();
          setSystemState(prev => ({
            ...prev,
            loading: false,
            isRegistered: true,
            registration: res.registration || null,
            license: res.license,
            currentUser: savedUser,
          }));
        }
      } catch (err) {
        if (isMounted) {
          setSystemState(prev => ({ ...prev, loading: false }));
        }
      }
    };
    checkLicenseStatus();

    const handleAuth = (e: any) => {
      setSystemState(prev => ({ ...prev, currentUser: e.detail }));
    };
    window.addEventListener('garage-auth-changed', handleAuth);
    return () => {
      isMounted = false;
      window.removeEventListener('garage-auth-changed', handleAuth);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setSystemState(prev => ({ ...prev, currentUser: null }));
  };

  const [appSettings, setAppSettings] = useState<GarageSettings>(() => {
    try {
      const saved = localStorage.getItem('garage_crm_settings_v1');
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (_) {}
    return defaultSettings;
  });

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setAppSettings(e.detail);
      } else {
        try {
          const saved = localStorage.getItem('garage_crm_settings_v1');
          if (saved) setAppSettings({ ...defaultSettings, ...JSON.parse(saved) });
        } catch (_) {}
      }
    };
    window.addEventListener('garage-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('garage-settings-updated', handleSettingsUpdate);
  }, []);

  const [sidebarLocked, setSidebarLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('garage_sidebar_locked_v3');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (_) {
      return true;
    }
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const isSidebarExpanded = sidebarLocked || sidebarHovered;

  const toggleSidebarLock = () => {
    setSidebarLocked(prev => {
      const next = !prev;
      try {
        localStorage.setItem('garage_sidebar_locked_v3', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  useEffect(() => {
    workOrdersApi.getAll({ limit: 100 }).then(res => {
      setLiveOrders(res.data || []);
    }).catch(() => { setLiveOrders([]); });

    quotationsApi.getAll({ status: 'Awaiting Approval', limit: 50 }).then(res => {
      setQuotes(res.data || []);
    }).catch(() => { setQuotes([]); });

    invoicesApi.getAll({ limit: 50 }).then(res => {
      setLiveInvoices(res.data || []);
    }).catch(() => { setLiveInvoices([]); });

    partsApi.getAll({ limit: 20 }).then(res => {
      if (res.data) {
        const low = res.data.filter((p: any) => p.quantity <= p.lowStockAt);
        setLowStockParts(low);
      }
    }).catch(() => { setLowStockParts([]); });
  }, [refreshTrigger]);

  const allNotifications = useMemo(() => {
    const list: any[] = [];
    quotes.forEach((q: any) => {
      list.push({
        id: `quote-${q.id}`,
        type: 'quote',
        title: `Quotation #${q.id} Awaiting Approval`,
        detail: `${q.vehicle} · ${q.customer} (${money(q.amount || 0)})`,
        time: q.time || 'Pending approval',
        tab: 'Quotations',
      });
    });
    lowStockParts.forEach((p: any) => {
      list.push({
        id: `stock-${p.id || p.partId}`,
        type: 'stock',
        title: `Low Stock: ${p.name}`,
        detail: `Only ${p.quantity} units left (Min threshold: ${p.lowStockAt})`,
        time: 'Inventory alert',
        tab: 'Parts Inventory',
      });
    });
    liveOrders.filter((o: any) => o.status === 'Ready for Delivery' || o.status === 'Completed').forEach((o: any) => {
      list.push({
        id: `order-${o.id}`,
        type: 'vehicle',
        title: `Vehicle Ready: ${o.vehicle}`,
        detail: `Work Order ${o.id} · ${o.customer} (${o.plate || 'No Plate'})`,
        time: 'Ready for delivery',
        tab: 'Work Orders',
      });
    });
    liveInvoices.filter((i: any) => i.status === 'Pending' || i.status === 'Unpaid').slice(0, 3).forEach((i: any) => {
      list.push({
        id: `inv-${i.id || i.invoiceId}`,
        type: 'invoice',
        title: `Unpaid Invoice #${i.id || i.invoiceId}`,
        detail: `${i.customer} · Amount: ${money(i.amount || 0)}`,
        time: 'Pending payment',
        tab: 'Invoices',
      });
    });
    list.push({
      id: 'cloud-db-sync',
      type: 'system',
      title: 'Atlas Central Directory Connected',
      detail: `Tenant database [${systemState.registration?.databaseName || 'garage_taha_be02f35e'}] cloud verified`,
      time: 'Cloud verified',
      tab: 'Dashboard',
    });
    return list;
  }, [quotes, lowStockParts, liveOrders, liveInvoices, systemState.registration]);

  const [modal, setModal] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: '', phone: '', category: 'General', message: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close notifications panel and profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('garage_read_notifs_v1');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (_) {
      return new Set();
    }
  });

  const markNotifRead = (id: string) => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('garage_read_notifs_v1', JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });
  };

  const markNotifUnread = (id: string) => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      try {
        localStorage.setItem('garage_read_notifs_v1', JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });
  };

  const markAllNotifsRead = () => {
    const allIds = new Set(allNotifications.map(n => n.id));
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('garage_read_notifs_v1', JSON.stringify(Array.from(allIds)));
    } catch (_) {}
    setNotice('All notifications marked as read.');
  };

  const unreadNotifications = useMemo(() => {
    return allNotifications.filter(n => !readNotifIds.has(n.id));
  }, [allNotifications, readNotifIds]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') {
        setModal(null);
        setNotifications(false);
        setProfileDropdownOpen(false);
        setSidebar(false);
        setShowHelpModal(false);
        setShowSupportModal(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);
  const open = (title: string) => { setModal(title); setSidebar(false); };
  const navigate = (label: string) => {
    if (
      label === 'Dashboard' ||
      label === 'POS Billing' ||
      label === 'New Intake' ||
      label === 'Work Orders' ||
      label === 'Quotations' ||
      label === 'Invoices' ||
      label === 'Vehicles' ||
      label === 'Customers' ||
      label === 'Parts Inventory' ||
      label === 'Mechanics' ||
      label === 'Reports' ||
      label === 'Users & Roles' ||
      label === 'Settings' ||
      label === 'Notifications'
    ) {
      setPage(label);
      setSidebar(false);
      setQuery('');
      setRefreshTrigger(prev => prev + 1);
      if (label === 'Quotations') setQuotationRequested(false);
      return;
    }
    open(label);
  };
  const decideQuote = async (id: string, decision: string) => {
    const target = quotes.find(quote => quote.id === id);
    setQuotes(current => current.filter(quote => quote.id !== id));
    if (decision === 'Approved') {
      quotationsApi.approve(id).catch(err => console.warn('Approve sync error:', err));
      if (target && appSettings.autoInvoiceOnApproval !== false) {
        try {
          const newInvId = getNextInvoiceId();
          commitInvoiceId(newInvId);
          await invoicesApi.create({
            invoiceId: newInvId,
            customer: target.customer,
            vehicle: target.vehicle,
            plate: target.plate || 'TBD',
            year: target.year || '2024',
            service: target.service,
            detail: target.detail || '',
            amount: target.amount,
            total: target.amount,
            status: 'Pending',
            advisor: target.advisor || 'Ali Hassan',
            date: new Date().toLocaleDateString('en-GB'),
            items: target.items || [],
            workOrder: target.id,
          });
          setNotice(`Quotation ${id} approved and invoice generated.`);
        } catch (invErr) {
          console.warn('Invoice generation error:', invErr);
        }
      } else {
        setNotice(`Quotation ${id} approved.`);
      }
      setRefreshTrigger(prev => prev + 1);
    } else {
      quotationsApi.reject(id).catch(err => console.warn('Reject sync error:', err));
      setRefreshTrigger(prev => prev + 1);
      setNotice(`${id} ${decision.toLowerCase()}.`);
    }
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const field1 = String(formData.get('field1') || '').trim();
    const field2 = String(formData.get('field2') || '').trim();
    const field3 = String(formData.get('field3') || '').trim();

    try {
      if (modal === 'Add Customer') {
        await customersApi.create({
          name: field1,
          phone: field2,
          address: field3 || 'Doha, Qatar',
          notes: 'Added from CRM',
          status: 'Active',
          type: 'Individual',
        });
        setNotice(`Customer "${field1}" saved to database successfully.`);
        setRefreshTrigger(prev => prev + 1);
      } else if (modal === 'Add Vehicle') {
        await vehiclesApi.create({
          customer: field1,
          model: field2,
          plate: field3,
          year: '2024',
          status: 'Due',
        });
        setNotice(`Vehicle "${field2}" saved to database successfully.`);
        setRefreshTrigger(prev => prev + 1);
      } else if (modal === 'Add Mechanic') {
        await mechanicsApi.create({
          name: field1,
          role: field2 || 'Technician',
          phone: field3 || '050 000 0000',
          shift: 'Morning',
          status: 'Available',
        });
        setNotice(`Mechanic "${field1}" saved to database successfully.`);
        setRefreshTrigger(prev => prev + 1);
      } else {
        setNotice(`${modal} saved successfully.`);
      }
    } catch (err: any) {
      setNotice(`Failed to save: ${err.message || 'Error'}`);
    }
    setModal(null);
  };

  const handleSavePart = async (partData: any) => {
    try {
      await partsApi.create(partData);
      setNotice(`Part "${partData.name}" saved to database successfully.`);
      setRefreshTrigger(prev => prev + 1);
      setModal(null);
    } catch (err: any) {
      setNotice(`Failed to save part: ${err.message || 'Error'}`);
    }
  };

  const filteredDashboardOrders = useMemo(() => {
    return liveOrders.filter(o => matchesDateFilter(o.date || o.createdAt, dashboardDateFilter));
  }, [liveOrders, dashboardDateFilter]);

  const filteredDashboardInvoices = useMemo(() => {
    return liveInvoices.filter(i => matchesDateFilter(i.date || i.created_at, dashboardDateFilter));
  }, [liveInvoices, dashboardDateFilter]);

  const filteredDashboardQuotes = useMemo(() => {
    return quotes.filter(q => matchesDateFilter(q.date || (q as any).createdAt, dashboardDateFilter));
  }, [quotes, dashboardDateFilter]);

  const activeJobsCount = filteredDashboardOrders.filter(o => o.status === 'In Progress' || o.status === 'Active').length;
  const vehiclesReadyCount = filteredDashboardOrders.filter(o => o.status === 'Ready for Delivery' || o.status === 'Ready').length;
  const pendingQuotesTotal = filteredDashboardQuotes.reduce((sum, quote) => sum + (Number(quote.amount) || 0), 0);

  // POS Parts sales & returns calculation (responsive to dashboardDateFilter)
  const posSalesCalculation = useMemo(() => {
    let posInvoicesList: any[] = [];
    let posReturnsList: any[] = [];
    try {
      posInvoicesList = JSON.parse(localStorage.getItem('garage-pos-invoices') || '[]');
    } catch {}
    try {
      posReturnsList = JSON.parse(localStorage.getItem('garage-pos-returns') || '[]');
    } catch {}

    const backendPartsInvoices = liveInvoices.filter(
      (inv: any) => inv.type === 'Parts' || inv.service?.toLowerCase().includes('part') || inv.workOrder === 'POS'
    );
    const existingIds = new Set(backendPartsInvoices.map((inv: any) => inv.id || inv.invoiceId));
    const mergedPartsInvoices = [
      ...backendPartsInvoices,
      ...posInvoicesList.filter((inv: any) => !existingIds.has(inv.id)),
    ];

    const filteredPartsInvoices = mergedPartsInvoices.filter((inv: any) =>
      matchesDateFilter(inv.date || inv.created_at, dashboardDateFilter)
    );
    const filteredReturnsList = posReturnsList.filter((ret: any) =>
      matchesDateFilter(ret.date || ret.createdAt, dashboardDateFilter)
    );

    const totalPartsSales = filteredPartsInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total || inv.amount) || 0), 0);
    const totalReturnsRefunded = filteredReturnsList.reduce((sum: number, ret: any) => sum + (Number(ret.refundAmount) || 0), 0);
    const netPartsRevenue = Math.max(0, totalPartsSales - totalReturnsRefunded);

    const partsSoldToday = filteredPartsInvoices.reduce((sum: number, inv: any) => {
      const items = inv.items || [];
      return sum + items.reduce((iSum: number, item: any) => iSum + (Number(item.quantity) || 1), 0);
    }, 0);

    return {
      totalPartsSales,
      totalReturnsRefunded,
      netPartsRevenue,
      partsSoldToday,
      partsInvoicesCount: filteredPartsInvoices.length,
      returnsCount: filteredReturnsList.length,
    };
  }, [liveInvoices, refreshTrigger, dashboardDateFilter]);

  const serviceRevenue = filteredDashboardInvoices
    .filter((inv: any) => inv.type !== 'Parts' && !inv.service?.toLowerCase().includes('part') && inv.workOrder !== 'POS')
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalWorkshopRevenue = serviceRevenue + posSalesCalculation.netPartsRevenue;

  const tabCounts = {
    Active: activeJobsCount,
    'Awaiting Parts': filteredDashboardOrders.filter(o => o.status === 'Awaiting Parts').length,
    Completed: filteredDashboardOrders.filter(o => o.status === 'Completed').length,
    Released: filteredDashboardOrders.filter(o => o.status === 'Released' || o.status === 'Ready for Delivery').length,
    All: filteredDashboardOrders.length,
  };

  const visibleOrders = filteredDashboardOrders.filter(order => {
    const matchesTab =
      tab === 'All' ||
      (tab === 'Active' && (order.status === 'In Progress' || order.status === 'Active')) ||
      (tab === 'Awaiting Parts' && order.status === 'Awaiting Parts') ||
      (tab === 'Completed' && order.status === 'Completed') ||
      (tab === 'Released' && (order.status === 'Released' || order.status === 'Ready for Delivery'));
    const matchesQuery = !query || Object.values(order).join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const getInitials = (name?: string) => name ? name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : 'AH';

  const recentActivities = [
    ...liveInvoices.slice(0, 2).map((inv: any) => ({
      title: `Invoice ${inv.id || inv.invoiceId} recorded`,
      detail: `${money(inv.amount || 0)} · ${inv.status || 'Pending'}`,
      time: 'Recent',
      color: 'green',
    })),
    ...liveOrders.slice(0, 3).map((wo: any) => ({
      title: `Work Order ${wo.id} - ${wo.status}`,
      detail: `${wo.vehicle} · ${wo.customer}`,
      time: 'Today',
      color: wo.status === 'In Progress' ? 'blue' : wo.status === 'Awaiting Parts' ? 'orange' : 'purple',
    })),
  ];

  const allowedNav = useMemo(() => {
    const user = systemState.currentUser;
    if (!user) return [];
    if (user.role === 'owner') {
      // Owner sees all tabs, with Users & Roles right before Settings, and Settings always last
      const beforeSettings = nav.filter(([title]) => title !== 'Settings');
      return [
        ...beforeSettings,
        ['Users & Roles', ShieldCheck] as [string, LucideIcon],
        ['Settings', Settings] as [string, LucideIcon],
      ];
    }
    // Staff/Cashier/Mechanic only see tabs assigned to them by Owner, with Settings always last if permitted
    const filtered = nav.filter(([title]) => title !== 'Users & Roles' && user.allowedTabs?.includes(title));
    const withoutSettings = filtered.filter(([title]) => title !== 'Settings');
    const hasSettings = filtered.some(([title]) => title === 'Settings');
    return hasSettings
      ? [...withoutSettings, ['Settings', Settings] as [string, LucideIcon]]
      : filtered.length > 0
      ? filtered
      : nav.slice(0, 1);
  }, [systemState.currentUser]);

  if (systemState.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-10 h-10 border-3 border-orange-200 border-t-[#f95932] rounded-full animate-spin" />
          <p className="text-slate-500 text-xs tracking-wider uppercase font-semibold">
            Loading Workshop System...
          </p>
        </div>
      </div>
    );
  }

  // 1. Not Registered -> Registration Page (unless user clicked "Sign in to existing workshop")
  if ((!systemState.isRegistered || !systemState.registration) && !systemState.showLoginDirect) {
    return (
      <RegistrationPage
        onRegistered={(reg) => {
          setSystemState(prev => ({
            ...prev,
            isRegistered: true,
            registration: reg,
            showLoginDirect: false,
            license: {
              status: 'ACTIVATION_REQUIRED',
              accessAllowed: false,
              message: 'Garage registered. Please enter license key.',
            },
          }));
        }}
        onGoToLogin={() => {
          setSystemState(prev => ({ ...prev, showLoginDirect: true }));
        }}
      />
    );
  }

  // 2. Unactivated, Suspended, or Expired -> Activation Page (unless bypassed for universal login)
  if ((!systemState.license?.accessAllowed || systemState.showActivationOverride) && !systemState.showLoginDirect) {
    return (
      <ActivationPage
        registration={systemState.registration || { businessId: '', businessName: '', businessType: '', ownerName: '', phone: '', city: '' }}
        license={systemState.license || { status: 'ACTIVATION_REQUIRED', accessAllowed: false }}
        onActivated={() => {
          licenseService.getStatus().then(res => {
            setSystemState(prev => ({
              ...prev,
              license: res.license,
              showActivationOverride: false,
            }));
          });
        }}
        onGoToLogin={
          systemState.license?.accessAllowed
            ? () => setSystemState(prev => ({ ...prev, showActivationOverride: false }))
            : undefined
        }
        onResetToRegister={() => {
          setSystemState({
            loading: false,
            isRegistered: false,
            registration: null,
            license: { status: 'UNREGISTERED', accessAllowed: false },
            currentUser: null,
            showActivationOverride: false,
            showLoginDirect: false,
          });
        }}
      />
    );
  }

  // 3. Activated or Universal Multi-PC Login -> Login Page
  if (!systemState.currentUser) {
    return (
      <LoginPage
        garageName={appSettings.garageName || systemState.registration?.businessName}
        garageLogo={
          appSettings.logoUrl?.startsWith('data:')
            ? appSettings.logoUrl
            : `${import.meta.env.BASE_URL}${appSettings.logoUrl || 'Garage-crm-logo.png'}`
        }
        onLogin={(user) => {
          licenseService.getStatus().then(res => {
            setSystemState({
              loading: false,
              isRegistered: true,
              registration: res.registration || null,
              license: res.license,
              currentUser: user,
              showActivationOverride: false,
              showLoginDirect: false,
            });
          });
        }}
        onOpenActivation={() => {
          setSystemState(prev => ({ ...prev, showActivationOverride: true, showLoginDirect: false }));
        }}
        onResetToRegister={() => {
          setSystemState({
            loading: false,
            isRegistered: false,
            registration: null,
            license: { status: 'UNREGISTERED', accessAllowed: false },
            currentUser: null,
            showActivationOverride: false,
            showLoginDirect: false,
          });
        }}
      />
    );
  }

  return <div className="workspace">
    <aside
      className={`sidebar ${sidebar ? 'is-open' : ''} ${!isSidebarExpanded ? 'is-minimized' : ''} ${sidebarHovered && !sidebarLocked ? 'is-hover-expanded' : ''}`}
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
    >
      <div className="sidebar-header">
        <a className="brand" href="#" aria-label="Garage CRM dashboard" onClick={(e) => { e.preventDefault(); navigate('Dashboard'); }}>
          <img
            className="brand-logo-icon"
            src={
              appSettings.logoUrl?.startsWith('data:')
                ? appSettings.logoUrl
                : `${import.meta.env.BASE_URL}${appSettings.logoUrl || 'Garage-crm-logo.png'}`
            }
            alt={appSettings.garageName || 'Garage CRM'}
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}Garage-crm-logo.png`;
            }}
          />
          <div className="brand-title-wrap">
            <span className="brand-title">{(appSettings.garageName || 'AUTO CARE & SERVICE').toUpperCase()}</span>
            <span className="brand-subtitle">{appSettings.facilitySubtitle || 'Workshop CRM System'}</span>
          </div>
        </a>
        <button
          type="button"
          className={`sidebar-lock-btn ${sidebarLocked ? 'locked' : ''}`}
          title={sidebarLocked ? "Sidebar is locked open. Click to unlock (auto-minimize)." : "Sidebar in hover mode. Click to lock open."}
          aria-label={sidebarLocked ? "Unlock sidebar" : "Lock sidebar"}
          onClick={toggleSidebarLock}
        >
          {sidebarLocked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>
      <nav aria-label="Main navigation">
        <div className="nav-group-main">
          {allowedNav.map(([label, Icon]) => {
            const isSelected = label === page;
            return (
              <button
                key={label}
                className={`nav-item ${isSelected ? 'selected' : ''}`}
                onClick={() => navigate(label)}
                title={label}
              >
                <Icon size={19} strokeWidth={isSelected ? 2.4 : 2.0} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="nav-group-bottom">
          <button
            type="button"
            className="nav-item nav-logout-item"
            onClick={handleLogout}
            title="Sign Out from Garage CRM"
          >
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
    {sidebar && <button aria-label="Close navigation" className="sidebar-scrim" onClick={() => setSidebar(false)} />}
    <div className={`main-shell ${!isSidebarExpanded ? 'sidebar-minimized' : 'sidebar-expanded'}`}>
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebar(true)}><Menu /></button>
        <div className="topbar-workshop-hub">
          <div
            className="topbar-suite-pill"
            onClick={() => navigate('Dashboard')}
            title="Garage CRM Suite - Click to return to Dashboard"
          >
            <div className="topbar-suite-icon">
              <Wrench size={20} strokeWidth={2.4} />
            </div>
            <div className="topbar-suite-details">
              <div className="topbar-suite-title-row">
                <span className="topbar-suite-title">GARAGE CRM SUITE</span>
                <span className="topbar-suite-tag">
                  <span className="dot" />
                  Active
                </span>
              </div>
              <span className="topbar-suite-sub">
                <span>Workshop Workspace</span>
                <span className="dot-sep">•</span>
                <span className="active-page">{page}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="date-pill">
            <CalendarDays size={16} />
            <span className="day-badge">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short' })}
            </span>
            <span>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="notifications" ref={notifRef}>
            <button
              className="icon-button bell"
              aria-label="Notifications"
              aria-expanded={notifications}
              onClick={() => {
                setNotifications(!notifications);
                setProfileDropdownOpen(false);
              }}
            >
              <Bell size={20} />
              {unreadNotifications.length > 0 && <span>{unreadNotifications.length}</span>}
            </button>
            {notifications && (
              <div className="notification-menu-enhanced">
                <div className="notif-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={16} style={{ color: '#ea580c' }} />
                    <h4>Real-Time Alerts</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {unreadNotifications.length > 0 && (
                      <button
                        type="button"
                        className="notif-mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllNotifsRead();
                        }}
                        title="Mark all alerts as read"
                      >
                        <Check size={12} />
                        <span>Mark as read</span>
                      </button>
                    )}
                    <span className="notif-count-badge">{unreadNotifications.length} Active</span>
                  </div>
                </div>
                <div className="notif-list">
                  {allNotifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-item ${readNotifIds.has(n.id) ? 'is-read' : 'is-unread'}`}
                      onClick={() => {
                        markNotifRead(n.id);
                        setNotifications(false);
                        navigate(n.tab);
                      }}
                    >
                      <div className={`notif-icon-wrap ${n.type}`}>
                        {n.type === 'quote' ? (
                          <FileText size={15} />
                        ) : n.type === 'stock' ? (
                          <Box size={15} />
                        ) : n.type === 'vehicle' ? (
                          <CarFront size={15} />
                        ) : n.type === 'invoice' ? (
                          <ShoppingCart size={15} />
                        ) : (
                          <Database size={15} />
                        )}
                      </div>
                      <div className="notif-content">
                        <strong>{n.title}</strong>
                        <p>{n.detail}</p>
                        <small>{n.time}</small>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="notif-footer">
                  <button
                    type="button"
                    className="notif-view-all-btn"
                    onClick={() => {
                      setNotifications(false);
                      navigate('Notifications');
                    }}
                  >
                    View All Notifications ({allNotifications.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-container" ref={profileRef}>
            <button
              className="profile"
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setNotifications(false);
              }}
              title="Workshop Settings & Profile Menu"
            >
              <span className="profile-avatar">{getInitials(systemState.currentUser?.fullName || appSettings.ownerName)}</span>
              <span>
                <strong>{systemState.currentUser?.fullName || appSettings.ownerName || 'Sheikh Ahmed'}</strong>
                <small className="capitalize">{systemState.currentUser?.role || appSettings.ownerRole || 'Garage Owner'}</small>
              </span>
              <ChevronDown
                size={16}
                style={{
                  transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {profileDropdownOpen && (
              <div className="profile-dropdown-menu">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-user">
                    <span className="profile-dropdown-avatar">
                      {getInitials(systemState.currentUser?.fullName || appSettings.ownerName)}
                    </span>
                    <div className="profile-dropdown-details">
                      <strong>{systemState.currentUser?.fullName || appSettings.ownerName}</strong>
                      <small>@{systemState.currentUser?.username || 'admin'}</small>
                    </div>
                  </div>
                  <div className="profile-dropdown-meta">
                    <div>
                      <span style={{ color: '#94a3b8' }}>Workshop: </span>
                      <strong style={{ color: '#ffffff' }}>{appSettings.garageName || systemState.registration?.businessName || 'Auto Care Hub'}</strong>
                    </div>
                  </div>
                </div>

                <div className="profile-dropdown-items">
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('Settings');
                    }}
                  >
                    <Settings size={15} />
                    <span>Workshop Settings</span>
                  </button>

                  {systemState.currentUser?.role === 'owner' && (
                    <button
                      type="button"
                      className="profile-dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('Users & Roles');
                      }}
                    >
                      <ShieldCheck size={15} />
                      <span>Users &amp; Role Permissions</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setShowHelpModal(true);
                    }}
                  >
                    <CircleHelp size={15} />
                    <span>System Help &amp; FAQs</span>
                  </button>

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setShowSupportModal(true);
                    }}
                  >
                    <Headset size={15} />
                    <span>Contact Technical Support</span>
                  </button>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                  <button
                    type="button"
                    className="profile-dropdown-item logout"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div hidden={page !== 'POS Billing'}>
        <PosBilling
          globalSearch={query}
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          initialTab={posInitialTab}
          initialReturnInvoiceId={posTargetInvoiceId}
        />
      </div>
      <div hidden={page !== 'New Intake'}>
        <NewIntake
          notify={setNotice}
          onSynced={() => setRefreshTrigger(prev => prev + 1)}
          startAtQuotation={quotationRequested && page === 'New Intake'}
          onQuotationStarted={() => setQuotationRequested(false)}
          onOpenWorkOrders={() => {
            setRefreshTrigger(prev => prev + 1);
            setPage('Work Orders');
          }}
        />
      </div>
      <div hidden={page !== 'Work Orders'}>
        <WorkOrders
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          onNavigateToInvoices={() => {
            setRefreshTrigger(prev => prev + 1);
            setPage('Invoices');
          }}
        />
      </div>
      <div hidden={page !== 'Quotations'}>
        <Quotations
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          onSynced={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>
      <div hidden={page !== 'Invoices'}>
        <Invoices
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          onCreate={(initialTab?: string, invoiceId?: string) => {
            if (initialTab === 'returns') {
              setPosInitialTab('returns');
              setPosTargetInvoiceId(invoiceId);
            } else {
              setPosInitialTab('sale');
              setPosTargetInvoiceId(undefined);
            }
            setPage('POS Billing');
            setSidebar(false);
            setQuery('');
          }}
        />
      </div>
      <div hidden={page !== 'Vehicles'}>
        <Vehicles
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          onAdd={() => open('Add Vehicle')}
          onCreateWorkOrder={() => {
            setQuotationRequested(false);
            setPage('New Intake');
            setSidebar(false);
            setQuery('');
          }}
        />
      </div>
      <div hidden={page !== 'Customers'}>
        <Customers
          notify={setNotice}
          refreshTrigger={refreshTrigger}
          onAdd={() => open('Add Customer')}
          onCreateWorkOrder={() => {
            setQuotationRequested(false);
            setPage('New Intake');
            setSidebar(false);
            setQuery('');
          }}
        />
      </div>
      <div hidden={page !== 'Parts Inventory'}>
        <PartsInventory notify={setNotice} refreshTrigger={refreshTrigger} onAdd={() => open('Add Part')} />
      </div>
      <div hidden={page !== 'Mechanics'}>
        <Mechanics notify={setNotice} refreshTrigger={refreshTrigger} onAdd={() => open('Add Mechanic')} onAssign={() => open('Assign Work Order')} />
      </div>
      <div hidden={page !== 'Reports'}>
        <Reports notify={setNotice} />
      </div>
      <div hidden={page !== 'Users & Roles'}>
        <UsersManagement notify={setNotice} />
      </div>
      <div hidden={page !== 'Settings'}>
        <SettingsView notify={setNotice} />
      </div>
      <div hidden={page !== 'Notifications'}>
        <NotificationsView
          notifications={allNotifications}
          readNotifIds={readNotifIds}
          onMarkRead={markNotifRead}
          onMarkUnread={markNotifUnread}
          onMarkAllRead={markAllNotifsRead}
          onNavigate={navigate}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
          notify={setNotice}
        />
      </div>
      <main hidden={page !== 'Dashboard'} className="dashboard">
        <div className="dashboard-header-bar">
          <div className="dashboard-header-title">
            <h2>Workshop Overview</h2>
            <p>Real-time garage activity, revenue performance &amp; work orders</p>
          </div>
          <div className="dashboard-header-filters">
            <DateRangeFilter
              value={dashboardDateFilter}
              onChange={setDashboardDateFilter}
              labelPrefix="Overview"
            />
          </div>
        </div>
        <section className="stats" aria-label="Workshop overview">{([
          [Wrench, String(activeJobsCount), 'Active Jobs', `${activeJobsCount > 0 ? `+${activeJobsCount}` : '0'} active jobs in garage`, 'orange'],
          [Box, money(posSalesCalculation.netPartsRevenue), 'Parts Sales (POS)', `${posSalesCalculation.partsSoldToday} parts sold · ${money(posSalesCalculation.totalReturnsRefunded)} returns`, 'blue'],
          [CarFront, String(vehiclesReadyCount), 'Vehicles Ready', `${vehiclesReadyCount} ready for pickup`, 'green'],
          [ChartColumn, money(totalWorkshopRevenue), 'Total Revenue', `${money(serviceRevenue)} service + ${money(posSalesCalculation.netPartsRevenue)} parts`, 'orange'],
          [FileText, String(quotes.length), 'Pending Quotes', `${money(pendingQuotesTotal)} total`, 'orange'],
        ] as [LucideIcon, string, string, string, string][]).map(([Icon, value, label, change, color]) => <article className="stat-card" key={label}><span className={`stat-icon ${color}`}><Icon size={27} strokeWidth={2.3} /></span><div><strong className={`stat-value ${value.length > 8 ? 'currency' : ''}`}>{value}</strong><p>{label}</p><small className={change.startsWith('+') ? 'positive' : 'muted'}>{change}</small></div></article>)}</section>
        <div className="primary-grid">
          <section className="panel orders-panel"><PanelTitle icon={Wrench} title="Active Work Orders" onView={() => { setTab('All'); setQuery(''); }} /><div className="tabs" role="tablist" aria-label="Work order status">{[['Active', tabCounts.Active], ['Awaiting Parts', tabCounts['Awaiting Parts']], ['Completed', tabCounts.Completed], ['Released', tabCounts.Released], ['All', tabCounts.All]].map(([label, count]) => <button role="tab" aria-selected={tab === label} key={label} className={tab === label ? 'active' : ''} onClick={() => setTab(String(label))}>{label} ({count})</button>)}</div>
            <div className="table-scroll"><table><thead><tr>{['WO#', 'Vehicle', 'Plate No.', 'Customer', 'Service', 'Mechanic', 'Status', ''].map((heading, index) => <th key={index}>{heading}</th>)}</tr></thead><tbody>{visibleOrders.map(order => {
              const initials = order.initials || getInitials(order.mechanic);
              return <tr key={order.id}><td><button className="order-id" onClick={() => open(`Work order ${order.id}`)}>{order.id}</button><small>{order.year || '2024'}</small></td><td><div className="vehicle-cell"><CarFront className="vehicle-icon" size={39} strokeWidth={1.4} /><span>{order.vehicle}</span></div></td><td className="muted">{order.plate}</td><td>{order.customer}</td><td>{order.service}<span className="cell-detail">{order.detail || ''}</span></td><td><div className="mechanic"><span className={`avatar ${initials === 'MK' ? 'peach' : ''}`}>{initials}</span>{order.mechanic}</div></td><td><span className={`badge ${order.status === 'Awaiting Parts' ? 'pending' : order.status === 'Ready for Delivery' ? 'ready' : ''}`}>{order.status}</span></td><td><button className="icon-button" aria-label={`View ${order.id}`} onClick={() => open(`Work order ${order.id}`)}><MoreHorizontal size={19} /></button></td></tr>;
            })}</tbody></table>{visibleOrders.length === 0 && <div className="empty-state"><CarFront size={30} /><p>{query ? 'No work orders match your search.' : `No ${tab.toLowerCase()} work orders. Start with New Intake.`}</p></div>}</div>
          </section>
          <section className="panel quotes-panel"><PanelTitle icon={FileText} title="Quotations Awaiting Approval" onView={() => open('All quotations')} /><div className="quote-list">{quotes.map((quote, index) => <article className="quote" key={quote.id}><CarFront size={53} strokeWidth={1.3} className={`quote-car car-${index}`} /><div className="quote-info"><strong>{quote.id}</strong><p>{quote.vehicle} · {quote.year || '2024'}</p><p>{quote.service}</p></div><div className="quote-actions"><strong>{money(quote.amount || 0)}</strong><small>{quote.time || 'Awaiting approval'}</small><div><button className="approve" onClick={() => decideQuote(quote.id, 'Approved')}>Approve</button><button className="reject" onClick={() => decideQuote(quote.id, 'Rejected')}>Reject</button></div></div></article>)}{quotes.length === 0 && <div className="empty-state"><Check /><p>No quotations awaiting approval.</p></div>}</div></section>
        </div>
        <div className="secondary-grid">
          <section className="panel billing-panel">
            <PanelTitle icon={ShoppingCart} title="POS Billing & Invoices" onView={() => navigate('Invoices')} />
            <div className="billing-stats">
              <div>
                <span><FileText className="blue-text" size={24} /><strong>{liveInvoices.length + posSalesCalculation.partsInvoicesCount}</strong></span>
                <small>Invoices Recorded</small>
                <b>{money(totalWorkshopRevenue)}</b>
              </div>
              <div>
                <span><Box className="orange-text" size={24} /><b>{money(posSalesCalculation.netPartsRevenue)}</b></span>
                <small>Parts Net Sales</small>
                <em><ArrowUp size={13} /> {posSalesCalculation.partsSoldToday} sold</em>
              </div>
              <div>
                <span><CarFront className="green-text" size={24} /><b>{money(serviceRevenue)}</b></span>
                <small>Service Invoices</small>
                <em><ArrowUp size={13} /> Live</em>
              </div>
              <div>
                <span><RotateCcw className="red-text" size={22} /><b style={{ color: '#dc2626' }}>-{money(posSalesCalculation.totalReturnsRefunded)}</b></span>
                <small>Returns &amp; Refunds</small>
                <em style={{ background: '#fef2f2', color: '#dc2626' }}>{posSalesCalculation.totalReturnsRefunded > 0 ? 'Restocked' : 'No returns'}</em>
              </div>
            </div>
            <div className="billing-panel-actions">
              <button className="primary-button" onClick={() => navigate('POS Billing')}>
                <ShoppingCart size={15} />
                <span>Open POS Counter</span>
              </button>
              <button className="subtle-button" onClick={() => navigate('Invoices')}>
                <FileText size={15} />
                <span>View All Invoices</span>
              </button>
              <button className="subtle-button" onClick={() => navigate('New Intake')}>
                <Plus size={15} />
                <span>New Intake Job</span>
              </button>
            </div>
          </section>
          <section className="panel stock-panel"><PanelTitle icon={Box} title="Low Stock Parts" onView={() => navigate('Parts Inventory')} />{lowStockParts.length > 0 ? lowStockParts.map((item: any) => {
            const name = item.name;
            const count = item.quantity ?? 0;
            const code = item.id || item.partId || 'P-001';
            const type = (item.category?.toLowerCase().includes('oil')) ? 'oil' : (item.category?.toLowerCase().includes('wiper')) ? 'wiper' : 'brake';
            return <button className={`stock-item ${type}`} key={code} onClick={() => navigate('Parts Inventory')}><span className={`part-art ${type}`}>{type === 'oil' ? <Box size={25} /> : type === 'wiper' ? <Wrench size={28} /> : <Settings size={29} />}</span><span><strong>{name}</strong><small>{count} units left</small></span><span className="stock-code">{code}</span></button>;
          }) : <div className="empty-state"><Box size={28} /><p>No low stock parts.</p></div>}</section>
          <section className="panel activity-panel"><PanelTitle icon={Clock3} title="Recent Activity" onView={() => open('Recent Activity')} />{recentActivities.length > 0 ? <div className="timeline">{recentActivities.map((act: any, idx: number) => <div className="activity" key={idx}><span className={`timeline-dot ${act.color}`} /><div><p>{act.title}</p><small>{act.detail}</small></div><time>{act.time}</time></div>)}</div> : <div className="empty-state"><Clock3 size={28} /><p>No recent activity yet. Added records will appear here.</p></div>}</section>
        </div>
      </main>
    </div>
    <footer className="statusbar">
      <div>
        <span className="online-indicator-wrap" title={isOnline ? 'System Online (Atlas Cloud Database Active)' : 'System Offline (Local Workspace)'}>
          <span className={`online-ping ${!isOnline ? 'offline' : ''}`} />
          <span className={`online-core ${!isOnline ? 'offline' : ''}`} />
        </span>
        <span>{isOnline ? 'System Online' : 'System Offline (Local)'}</span>
        {isOnline ? (
          <Wifi size={15} className="wifi-animated" />
        ) : (
          <WifiOff size={15} style={{ color: '#ef4444' }} />
        )}
        <span className="footer-divider" />
        <span>Qatar Time (GMT+3)</span>
      </div>

      <div className="statusbar-center">
        <span>Powered by <strong>Vertexia</strong></span>
      </div>

      <div>
        <span>Garage Workspace v1.0.0</span>
        <button onClick={() => setShowHelpModal(true)}><CircleHelp size={15} />Help</button>
        <button onClick={() => setShowSupportModal(true)}><Headset size={15} />Support</button>
      </div>
    </footer>

    {/* Help Modal */}
    {showHelpModal && (
      <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
        <section className="modal" style={{ width: '560px' }} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="modal-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff0e7', color: '#f15a24', display: 'grid', placeItems: 'center' }}>
                <CircleHelp size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', margin: 0 }}>Garage CRM Help &amp; FAQs</h2>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Quick reference manual and keyboard shortcuts</p>
              </div>
            </div>
            <button className="icon-button" aria-label="Close" onClick={() => setShowHelpModal(false)}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#334155' }}>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>⚡ System Keyboard Shortcuts</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div><kbd style={{ background: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', fontSize: '10px' }}>Ctrl + K</kbd> Focus Global Search</div>
                <div><kbd style={{ background: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', fontSize: '10px' }}>Esc</kbd> Close Active Dialog / Modal</div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>🚗 Creating New Intake &amp; Job Card</strong>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.45 }}>
                Go to <strong>New Intake</strong> in the sidebar. Select or add a customer and vehicle, then choose whether to create an instant Work Order or draft a Quotation.
              </p>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>🛒 POS Billing &amp; Counter Sales</strong>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.45 }}>
                Open <strong>POS Billing</strong> for quick spare parts sales. Scan or search parts, select customer, apply VAT or discounts, and print invoices or returns directly.
              </p>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>☁️ Multi-PC Cloud Database</strong>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.45 }}>
                Your workshop data is stored in your dedicated MongoDB Atlas cloud database. Logging in from any PC with your credentials automatically connects to your workshop.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="subtle-button"
              onClick={() => { setShowHelpModal(false); setShowSupportModal(true); }}
            >
              <Headset size={14} /> Contact Support
            </button>
            <button type="button" className="primary-button" onClick={() => setShowHelpModal(false)}>
              Close
            </button>
          </div>
        </section>
      </div>
    )}

    {/* Support Modal */}
    {showSupportModal && (
      <div className="modal-backdrop" onClick={() => setShowSupportModal(false)}>
        <section className="modal" style={{ width: '520px' }} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="modal-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff0e7', color: '#f15a24', display: 'grid', placeItems: 'center' }}>
                <Headset size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', margin: 0 }}>Vertexia Support Desk</h2>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Technical help &amp; customer assistance</p>
              </div>
            </div>
            <button className="icon-button" aria-label="Close" onClick={() => setShowSupportModal(false)}><X size={16} /></button>
          </div>

          {supportSubmitted ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', color: '#16a34a', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <Check size={26} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Support Ticket Submitted!</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                Thank you. Your support request has been dispatched to the Vertexia technical team. An engineer will contact you via WhatsApp / Phone shortly.
              </p>
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setSupportSubmitted(false);
                  setShowSupportModal(false);
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSupportSubmitted(true);
                setNotice('Support ticket submitted successfully to Vertexia!');
              }}
            >
              {/* Quick Direct WhatsApp / Call buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <a
                  href="https://wa.me/923172981931?text=Hello%20Vertexia%20Support,%20I%20need%20help%20with%20Garage%20CRM"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>💬 WhatsApp Support</span>
                </a>
                <a
                  href="mailto:support@vertexiaagency.com?subject=Garage%20CRM%20Support%20Request"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>✉️ Email Support</span>
                </a>
              </div>

              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px' }}>
                Or fill out the direct support ticket below:
              </p>

              <label style={{ margin: '8px 0', fontSize: '11px', fontWeight: 600 }}>
                Your Name / Garage Owner *
                <input
                  required
                  value={supportForm.name}
                  onChange={e => setSupportForm({ ...supportForm, name: e.target.value })}
                  placeholder={systemState.currentUser?.fullName || 'e.g. Sheikh Ahmed'}
                />
              </label>

              <label style={{ margin: '8px 0', fontSize: '11px', fontWeight: 600 }}>
                Contact Phone / WhatsApp *
                <input
                  required
                  value={supportForm.phone}
                  onChange={e => setSupportForm({ ...supportForm, phone: e.target.value })}
                  placeholder="+974 5512 3456"
                />
              </label>

              <label style={{ margin: '8px 0', fontSize: '11px', fontWeight: 600 }}>
                Issue Category
                <select
                  value={supportForm.category}
                  onChange={e => setSupportForm({ ...supportForm, category: e.target.value })}
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '9px 10px',
                    background: '#f7f9fc',
                    border: '1px solid #dce3ec',
                    borderRadius: '7px',
                    fontSize: '11.5px',
                    color: '#1e293b',
                  }}
                >
                  <option value="General">General Inquiry</option>
                  <option value="Billing">POS &amp; Invoicing Issue</option>
                  <option value="WorkOrders">Work Orders &amp; Intake</option>
                  <option value="License">License &amp; Activation Key</option>
                  <option value="Database">MongoDB Cloud Database</option>
                  <option value="Feature">Feature Request</option>
                </select>
              </label>

              <label style={{ margin: '8px 0', fontSize: '11px', fontWeight: 600 }}>
                Issue Description *
                <textarea
                  required
                  rows={3}
                  value={supportForm.message}
                  onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Describe the problem you are experiencing or question..."
                />
              </label>

              <button type="submit" className="primary-button" style={{ width: '100%', marginTop: '14px' }}>
                Submit Support Ticket
              </button>
            </form>
          )}
        </section>
      </div>
    )}
    {notice && (
      <div className="toast" role="status">
        <span className="toast-icon-wrap">
          <Check size={15} />
        </span>
        <span className="toast-content">{notice}</span>
        <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
          <X size={15} />
        </button>
      </div>
    )}
    {modal === 'Add Part' ? (
      <AddPartModal
        isOpen={true}
        onClose={() => setModal(null)}
        onSave={handleSavePart}
        notify={setNotice}
      />
    ) : modal && (
      <div className="modal-backdrop" onClick={() => setModal(null)}>
        <section className="modal" role="dialog" aria-modal="true" aria-label={modal} onClick={event => event.stopPropagation()}>
          <div className="modal-heading"><h2>{modal}</h2><button autoFocus className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X /></button></div>
          {modal.startsWith('Work order') ? (() => { const order = liveOrders.find(item => modal.endsWith(item.id)); return order ? <div className="order-details"><CarFront size={48} /><h3>{order.vehicle}</h3><p>{order.customer} · Plate {order.plate}</p><p>{order.service} — {order.detail}</p><p>Assigned to {order.mechanic}</p><span className="badge">{order.status}</span></div> : <div className="empty-state"><CarFront size={30} /><p>Work order details not found.</p></div>; })() : ['Add Customer', 'Add Vehicle', 'Add Mechanic', 'New Intake', 'New Invoice', 'Create Invoice', 'Create Quotation', 'Quick Bill', 'Service Sale', 'Parts Sale'].includes(modal) ? <form onSubmit={handleModalSubmit}><p className="form-intro">Enter details to save directly into MongoDB Atlas database.</p><label>{modal === 'Add Mechanic' ? 'Mechanic name' : 'Customer name'}<input name="field1" required placeholder={modal === 'Add Mechanic' ? 'e.g. Tariq Khan' : 'e.g. Sheikh Ahmed'} /></label><label>{modal === 'Add Customer' ? 'Phone number' : modal === 'Add Vehicle' ? 'Vehicle / model' : modal === 'Add Mechanic' ? 'Role / Specialization' : 'Vehicle / description'}<input name="field2" required placeholder={modal === 'Add Customer' ? '+974 5512 3456' : modal === 'Add Vehicle' ? 'e.g. Toyota Land Cruiser' : modal === 'Add Mechanic' ? 'e.g. Engine Specialist' : 'e.g. Toyota Land Cruiser'} /></label><label>{modal === 'Add Vehicle' ? 'Plate number' : modal === 'Add Mechanic' ? 'Phone number' : 'Notes / Address'}{modal === 'Add Vehicle' ? <input name="field3" required placeholder="e.g. 770781" /> : modal === 'Add Mechanic' ? <input name="field3" required placeholder="e.g. 050 123 4567" /> : <textarea name="field3" placeholder="Add address or any customer notes" rows={3} />}</label><button type="submit" className="primary-button"><Plus size={18} />Save to Database</button></form> : <div className="module-placeholder"><Activity size={38} /><h3>{modal}</h3><p>This module is ready for the next development step. Explore work orders and approve quotations on the dashboard now.</p><button className="primary-button" onClick={() => setModal(null)}>Back to dashboard</button></div>}
        </section>
      </div>
    )}
    <SplashScreen />
  </div>;
}
export default App;
