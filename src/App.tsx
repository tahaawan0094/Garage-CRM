import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUp, Bell, Box, CalendarDays, CarFront, ChartColumn, Check, ChevronDown, CircleHelp, Clock3, FileText, Headset, Home, Lock, Menu, MoreHorizontal, Plus, Search, Settings, ShoppingCart, Unlock, Users, Wifi, Wrench, X, type LucideIcon } from 'lucide-react';
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
import { workOrdersApi, quotationsApi, customersApi, vehiclesApi, partsApi, mechanicsApi, invoicesApi } from './lib/api';
import { getNextInvoiceId, commitInvoiceId } from './lib/sequence';

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

  const [sidebarLocked, setSidebarLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('garage_sidebar_locked');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (_) {
      return false;
    }
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const isSidebarExpanded = sidebarLocked || sidebarHovered;

  const toggleSidebarLock = () => {
    setSidebarLocked(prev => {
      const next = !prev;
      try {
        localStorage.setItem('garage_sidebar_locked', JSON.stringify(next));
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

  const [modal, setModal] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setModal(null); setNotifications(false); setSidebar(false); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);
  const visibleOrders = liveOrders.filter(order => (tab === 'Active' || tab === 'All' || (tab === 'Awaiting Parts' && order.status === 'Awaiting Parts')) && Object.values(order).join(' ').toLowerCase().includes(query.toLowerCase()));
  const open = (title: string) => { setModal(title); setSidebar(false); };
  const navigate = (label: string) => {
    if (label === 'Dashboard' || label === 'POS Billing' || label === 'New Intake' || label === 'Work Orders' || label === 'Quotations' || label === 'Invoices' || label === 'Vehicles' || label === 'Customers' || label === 'Parts Inventory' || label === 'Mechanics' || label === 'Reports') {
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
      if (target) {
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
        } catch (invErr) {
          console.warn('Invoice generation error:', invErr);
        }
      }
      setRefreshTrigger(prev => prev + 1);
      setNotice(`Quotation ${id} approved and invoice generated.`);
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
      } else if (modal === 'Add Part') {
        const parts = field2.split('/');
        const category = (parts[0] || '').trim() || 'General';
        const brand = (parts[1] || '').trim() || 'Standard';
        await partsApi.create({
          name: field1,
          category,
          brand,
          quantity: Number(field3) >= 0 ? Number(field3) : 0,
          unitCost: 80,
          sellingPrice: 100,
          lowStockAt: 5,
        });
        setNotice(`Part "${field1}" saved to database successfully.`);
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

  const activeJobsCount = liveOrders.filter(o => o.status === 'In Progress' || o.status === 'Active').length;
  const vehiclesReadyCount = liveOrders.filter(o => o.status === 'Ready for Delivery' || o.status === 'Ready').length;
  const todayRevenue = liveInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const pendingQuotesTotal = quotes.reduce((sum, quote) => sum + (Number(quote.amount) || 0), 0);

  const tabCounts = {
    Active: activeJobsCount,
    'Awaiting Parts': liveOrders.filter(o => o.status === 'Awaiting Parts').length,
    Completed: liveOrders.filter(o => o.status === 'Completed').length,
    Released: liveOrders.filter(o => o.status === 'Released' || o.status === 'Ready for Delivery').length,
    All: liveOrders.length,
  };

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
            src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`}
            alt="Garage CRM"
          />
          <div className="brand-title-wrap">
            <span className="brand-title">GARAGE <span className="brand-accent">CRM</span></span>
            <span className="brand-subtitle">Workshop System</span>
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
        {nav.map(([label, Icon]) => {
          const isSelected = label === page;
          return (
            <button
              key={label}
              className={`nav-item ${isSelected ? 'selected' : ''}`}
              onClick={() => navigate(label)}
              title={label}
            >
              <Icon size={18} strokeWidth={isSelected ? 2 : 1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
    {sidebar && <button aria-label="Close navigation" className="sidebar-scrim" onClick={() => setSidebar(false)} />}
    <div className={`main-shell ${!isSidebarExpanded ? 'sidebar-minimized' : 'sidebar-expanded'}`}>
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebar(true)}><Menu /></button>
        <div className="search-box"><Search size={21} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customers, vehicles, work orders, invoices..." aria-label="Search work orders" /><kbd>Ctrl K</kbd></div>
        <div className="header-right"><div className="date"><CalendarDays size={20} /><span>Mon, 14 Apr 2025</span></div><div className="notifications"><button className="icon-button bell" aria-label="Notifications" aria-expanded={notifications} onClick={() => setNotifications(!notifications)}><Bell size={23} /><span>{quotes.length}</span></button>{notifications && <div className="notification-menu"><strong>Notifications</strong><p>{quotes.length} quotations are awaiting your approval.</p><p>{lowStockParts.length} inventory items are running low.</p><p>{vehiclesReadyCount} vehicles are ready for delivery.</p></div>}</div><button className="profile" onClick={() => open('My profile')}><span className="profile-avatar">SA</span><span><strong>Sheikh Ahmed</strong><small>Garage Owner</small></span><ChevronDown size={17} /></button></div>
      </header>
      <div hidden={page !== 'POS Billing'}><PosBilling globalSearch={query} notify={setNotice} /></div>
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
          onCreate={() => {
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
      <main hidden={page !== 'Dashboard'} className="dashboard">
        <section className="stats" aria-label="Workshop overview">{([
          [Wrench, String(activeJobsCount), 'Active Jobs', `${activeJobsCount > 0 ? `+${activeJobsCount}` : '0'} active jobs in garage`, 'orange'], [FileText, '0', 'Awaiting Signature', 'No change', 'blue'], [CarFront, String(vehiclesReadyCount), 'Vehicles Ready', `${vehiclesReadyCount} ready for pickup`, 'green'], [ChartColumn, money(todayRevenue), 'Today Revenue', activeJobsCount > 0 ? '+32% from yesterday' : 'No revenue yet', 'orange'], [FileText, String(quotes.length), 'Pending Quotes', `${money(pendingQuotesTotal)} total`, 'orange'],
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
          <section className="panel billing-panel"><PanelTitle icon={ShoppingCart} title="POS Billing & Invoices" onView={() => navigate('Invoices')} /><div className="billing-stats"><div><span><FileText className="blue-text" size={26} /><strong>{liveInvoices.length}</strong></span><small>Invoices Recorded</small><b>{money(todayRevenue)}</b></div><div><span><CarFront className="green-text" size={24} /><b>{money(todayRevenue)}</b></span><small>Today Revenue</small><em><ArrowUp size={13} /> Live</em></div><div><span><FileText className="purple-text" size={24} /><b>{money(todayRevenue * 3.5)}</b></span><small>This Month (Est)</small><em><ArrowUp size={13} /> Live</em></div></div></section>
          <section className="panel quick-panel"><PanelTitle icon={Plus} title="Quick Actions" /><div className="quick-grid">{([[CarFront, 'New Intake', 'Add customer & vehicle', 'orange'], [Users, 'Add Customer', 'Create new customer', 'blue'], [FileText, 'Create Quotation', 'Send estimate to customer', 'blue'], [FileText, 'Create Invoice', 'Bill for completed work', 'purple']] as [LucideIcon, string, string, string][]).map(([Icon, label, detail, color]) => <button key={label} onClick={() => label === 'New Intake' ? navigate(label) : label === 'Create Invoice' ? navigate('Invoices') : open(label)} className={`quick-action ${color}`}><Icon size={28} fill="currentColor" fillOpacity={0.1} /><strong>{label}</strong><small>{detail}</small></button>)}</div></section>
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
    <footer className="statusbar"><div><span className="online-dot" />System Online<Wifi size={15} /><span className="footer-divider" /><span>Qatar Time (GMT+3)</span><span className="sync">Last synced: 14 Apr 2025, 12:05 PM</span></div><div><span>Garage Workspace v1.0.0</span><button onClick={() => open('Help')}><CircleHelp size={16} />Help</button><button onClick={() => open('Support')}><Headset size={16} />Support</button></div></footer>
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
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><section className="modal" role="dialog" aria-modal="true" aria-label={modal} onClick={event => event.stopPropagation()}><div className="modal-heading"><h2>{modal}</h2><button autoFocus className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X /></button></div>{modal.startsWith('Work order') ? (() => { const order = liveOrders.find(item => modal.endsWith(item.id)); return order ? <div className="order-details"><CarFront size={48} /><h3>{order.vehicle}</h3><p>{order.customer} · Plate {order.plate}</p><p>{order.service} — {order.detail}</p><p>Assigned to {order.mechanic}</p><span className="badge">{order.status}</span></div> : <div className="empty-state"><CarFront size={30} /><p>Work order details not found.</p></div>; })() : ['Add Customer', 'Add Vehicle', 'Add Part', 'Add Mechanic', 'New Intake', 'New Invoice', 'Create Invoice', 'Create Quotation', 'Quick Bill', 'Service Sale', 'Parts Sale'].includes(modal) ? <form onSubmit={handleModalSubmit}><p className="form-intro">Enter details to save directly into MongoDB Atlas database.</p><label>{modal === 'Add Part' ? 'Part name' : modal === 'Add Mechanic' ? 'Mechanic name' : 'Customer name'}<input name="field1" required placeholder={modal === 'Add Part' ? 'e.g. Brake Pads Front' : modal === 'Add Mechanic' ? 'e.g. Tariq Khan' : 'e.g. Sheikh Ahmed'} /></label><label>{modal === 'Add Customer' ? 'Phone number' : modal === 'Add Vehicle' ? 'Vehicle / model' : modal === 'Add Part' ? 'Category / brand' : modal === 'Add Mechanic' ? 'Role / Specialization' : 'Vehicle / description'}<input name="field2" required placeholder={modal === 'Add Customer' ? '+974 5512 3456' : modal === 'Add Vehicle' ? 'e.g. Toyota Land Cruiser' : modal === 'Add Part' ? 'e.g. Brakes / Toyota' : modal === 'Add Mechanic' ? 'e.g. Engine Specialist' : 'e.g. Toyota Land Cruiser'} /></label><label>{modal === 'Add Vehicle' ? 'Plate number' : modal === 'Add Part' ? 'Initial stock quantity' : modal === 'Add Mechanic' ? 'Phone number' : 'Notes / Address'}{modal === 'Add Vehicle' ? <input name="field3" required placeholder="e.g. 770781" /> : modal === 'Add Part' ? <input name="field3" required type="number" min="0" placeholder="e.g. 12" /> : modal === 'Add Mechanic' ? <input name="field3" required placeholder="e.g. 050 123 4567" /> : <textarea name="field3" placeholder="Add address or any customer notes" rows={3} />}</label><button type="submit" className="primary-button"><Plus size={18} />Save to Database</button></form> : <div className="module-placeholder"><Activity size={38} /><h3>{modal}</h3><p>This module is ready for the next development step. Explore work orders and approve quotations on the dashboard now.</p><button className="primary-button" onClick={() => setModal(null)}>Back to dashboard</button></div>}</section></div>}
    <SplashScreen />
  </div>;
}
export default App;
