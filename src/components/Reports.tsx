import { useEffect, useMemo, useState } from "react";
import { workOrdersApi, mechanicsApi, invoicesApi } from "../lib/api";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  TrendingUp,
  Wrench,
} from "lucide-react";

type ReportPeriod = "7d" | "30d" | "90d" | "year";
type ReportPoint = { label: string; revenue: number; workOrders: number };

const reportSeries: Record<ReportPeriod, ReportPoint[]> = {
  "7d": [
    { label: "Mon", revenue: 0, workOrders: 0 },
    { label: "Tue", revenue: 0, workOrders: 0 },
    { label: "Wed", revenue: 0, workOrders: 0 },
    { label: "Thu", revenue: 0, workOrders: 0 },
    { label: "Fri", revenue: 0, workOrders: 0 },
    { label: "Sat", revenue: 0, workOrders: 0 },
    { label: "Sun", revenue: 0, workOrders: 0 },
  ],
  "30d": [
    { label: "Week 1", revenue: 0, workOrders: 0 },
    { label: "Week 2", revenue: 0, workOrders: 0 },
    { label: "Week 3", revenue: 0, workOrders: 0 },
    { label: "Week 4", revenue: 0, workOrders: 0 },
  ],
  "90d": [
    { label: "Week 1", revenue: 0, workOrders: 0 },
    { label: "Week 2", revenue: 0, workOrders: 0 },
    { label: "Week 3", revenue: 0, workOrders: 0 },
    { label: "Week 4", revenue: 0, workOrders: 0 },
    { label: "Week 5", revenue: 0, workOrders: 0 },
    { label: "Week 6", revenue: 0, workOrders: 0 },
  ],
  year: [
    { label: "Jan", revenue: 0, workOrders: 0 },
    { label: "Feb", revenue: 0, workOrders: 0 },
    { label: "Mar", revenue: 0, workOrders: 0 },
    { label: "Apr", revenue: 0, workOrders: 0 },
    { label: "May", revenue: 0, workOrders: 0 },
    { label: "Jun", revenue: 0, workOrders: 0 },
    { label: "Jul", revenue: 0, workOrders: 0 },
    { label: "Aug", revenue: 0, workOrders: 0 },
    { label: "Sep", revenue: 0, workOrders: 0 },
    { label: "Oct", revenue: 0, workOrders: 0 },
    { label: "Nov", revenue: 0, workOrders: 0 },
    { label: "Dec", revenue: 0, workOrders: 0 },
  ],
};

const periodLabels: Record<ReportPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
};

const formatMoney = (value: number) =>
  `QAR ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Reports({ notify }: { notify: (message: string) => void }) {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [liveMechanics, setLiveMechanics] = useState<any[]>([]);
  const [liveInvoices, setLiveInvoices] = useState<any[]>([]);

  useEffect(() => {
    workOrdersApi.getAll({ limit: 100 }).then(res => setLiveOrders(res.data || [])).catch(() => {});
    mechanicsApi.getAll({ limit: 20 }).then(res => setLiveMechanics(res.data || [])).catch(() => {});
    invoicesApi.getAll({ limit: 10 }).then(res => setLiveInvoices(res.data || [])).catch(() => {});
  }, []);

  const totalOrders = liveOrders.length;
  const statusCounts = {
    Completed: liveOrders.filter(o => o.status === 'Completed').length,
    'In Progress': liveOrders.filter(o => o.status === 'In Progress').length,
    'Awaiting Parts': liveOrders.filter(o => o.status === 'Awaiting Parts').length,
    'Ready for Delivery': liveOrders.filter(o => o.status === 'Ready for Delivery' || o.status === 'Ready').length,
  };
  const statusData = [
    { label: "Completed", value: totalOrders ? Math.round((statusCounts.Completed / totalOrders) * 100) : 0, count: statusCounts.Completed, color: "completed" },
    { label: "In Progress", value: totalOrders ? Math.round((statusCounts['In Progress'] / totalOrders) * 100) : 0, count: statusCounts['In Progress'], color: "in-progress" },
    { label: "Awaiting Parts", value: totalOrders ? Math.round((statusCounts['Awaiting Parts'] / totalOrders) * 100) : 0, count: statusCounts['Awaiting Parts'], color: "awaiting" },
    { label: "Ready for Delivery", value: totalOrders ? Math.round((statusCounts['Ready for Delivery'] / totalOrders) * 100) : 0, count: statusCounts['Ready for Delivery'], color: "ready" },
  ];

  const mechanicPerformance = liveMechanics.map(m => ({
    name: m.name,
    role: m.role || 'Mechanic',
    initials: m.initials || m.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
    jobs: m.completedJobs || 0,
    rating: m.rating || 5.0,
    completion: m.completedJobs ? Math.min(100, Math.round((m.completedJobs / ((m.assignedJobs || 0) + m.completedJobs)) * 100)) : 100,
  }));

  const recentInvoices = liveInvoices.map((inv: any) => ({
    id: inv.id || inv.invoiceId,
    customer: inv.customer?.name || inv.customer || 'Customer',
    date: inv.date || 'Recent',
    amount: Number(inv.amount) || Number(inv.total) || 0,
    status: inv.status || 'Paid',
  }));

  const series = reportSeries[period];
  const summary = useMemo(() => {
    const totalRev = liveInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || Number(inv.total) || 0), 0);
    const invoices = liveInvoices.length;
    return { revenue: totalRev, workOrders: totalOrders, invoices, averageInvoice: invoices ? totalRev / invoices : 0 };
  }, [liveInvoices, totalOrders]);
  const maxRevenue = Math.ceil(Math.max(...series.map((point) => point.revenue)) / 1000) * 1000;
  const chartWidth = Math.max(440, series.length * 74);
  const chartHeight = 196;
  const points = series.map((point, index) => ({
    x: series.length === 1 ? chartWidth / 2 : 82 + (index * (chartWidth - 96)) / (series.length - 1),
    y: chartHeight - 18 - (point.revenue / maxRevenue) * (chartHeight - 36),
  }));
  const revenuePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  const downloadReport = () => {
    try {
      const rows = [
        ["Period", "Label", "Revenue (QAR)", "Work Orders"],
        ...series.map((point) => [periodLabels[period], point.label, String(point.revenue), String(point.workOrders)]),
      ];
      const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `garage-report-${period}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify("Report CSV downloaded.");
    } catch {
      notify("The report could not be downloaded in this browser.");
    }
  };

  return (
    <main className="reports-page">
      <header className="reports-heading">
        <div className="reports-title">
          <span><TrendingUp size={24} /></span>
          <div><h1>Reports & Analytics</h1><p>Track workshop performance, revenue, invoices, and team productivity.</p></div>
        </div>
        <div className="reports-toolbar">
          <label className="reports-period"><CalendarDays size={16} /><select value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} aria-label="Report date range">{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></label>
          <button className="reports-export" onClick={downloadReport}><Download size={16} />Export CSV</button>
        </div>
      </header>
      <div className="reports-demo-note"><Clock3 size={15} /> Report figures are sample data for the selected period and are not connected to live transactions.</div>
      <section className="reports-kpis" aria-label="Report summary">
        <article><span className="reports-kpi-icon revenue"><CircleDollarSign size={20} /></span><div><small>Total Revenue</small><strong>{formatMoney(summary.revenue)}</strong><em><TrendingUp size={13} />12.8% <span>vs previous period</span></em></div></article>
        <article><span className="reports-kpi-icon work"><Wrench size={19} /></span><div><small>Work Orders</small><strong>{summary.workOrders.toLocaleString()}</strong><em><TrendingUp size={13} />8.4% <span>vs previous period</span></em></div></article>
        <article><span className="reports-kpi-icon invoices"><FileText size={19} /></span><div><small>Invoices Issued</small><strong>{summary.invoices.toLocaleString()}</strong><em><Check size={13} />91% <span>work order conversion</span></em></div></article>
        <article><span className="reports-kpi-icon average"><TrendingUp size={19} /></span><div><small>Average Invoice</small><strong>{formatMoney(summary.averageInvoice)}</strong><em><TrendingUp size={13} />4.2% <span>vs previous period</span></em></div></article>
      </section>
      <section className="reports-main-grid">
        <article className="report-card revenue-report">
          <header><div><h2>Revenue Overview</h2><p>{periodLabels[period]} · QAR</p></div><span className="report-legend"><i /> Revenue</span></header>
          <div className="revenue-chart-scroll">
            <svg className="revenue-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Revenue chart for ${periodLabels[period]}`}>
              {[0, 1, 2, 3].map((index) => {
                const y = 14 + index * ((chartHeight - 36) / 3);
                return <g key={index}><line x1="80" y1={y} x2={chartWidth - 12} y2={y} /><text x="0" y={y + 3}>{`QAR ${Math.round((maxRevenue * (1 - index / 3)) / 1000)}k`}</text></g>;
              })}
              <path className="revenue-area" d={`${revenuePath} L ${points[points.length - 1].x} ${chartHeight - 18} L ${points[0].x} ${chartHeight - 18} Z`} />
              <path className="revenue-line" d={revenuePath} />
              {points.map((point, index) => <g key={series[index].label}><circle cx={point.x} cy={point.y} r="4" /><text className="revenue-label" x={point.x} y={chartHeight - 2} textAnchor="middle">{series[index].label}</text></g>)}
            </svg>
          </div>
          <footer><span>Period revenue</span><strong>{formatMoney(summary.revenue)}</strong></footer>
        </article>
        <article className="report-card work-orders-report">
          <header><div><h2>Work Order Status</h2><p>Current workshop breakdown</p></div><button aria-label="More work order report options" onClick={() => notify("Work order report options are not available in this preview.")}>•••</button></header>
          <div className="status-summary"><strong>{totalOrders}</strong><span>Work orders</span><small>Across all statuses</small></div>
          <div className="status-bars">{statusData.map((status) => <div className="status-bar-row" key={status.label}><div><span>{status.label}</span><strong>{status.count}</strong></div><div className="status-track"><i className={status.color} style={{ width: `${status.value}%` }} /></div></div>)}</div>
        </article>
      </section>
      <section className="reports-lower-grid">
        <article className="report-card mechanic-report">
          <header><div><h2>Mechanic Performance</h2><p>Top technicians by completed jobs</p></div><span className="report-period-chip">{periodLabels[period]}</span></header>
          <div className="report-table-scroll"><table><thead><tr><th>Mechanic</th><th>Completed Jobs</th><th>Rating</th><th>Completion</th></tr></thead><tbody>{mechanicPerformance.map((mechanic) => <tr key={mechanic.initials}><td><span className="report-mechanic"><i>{mechanic.initials}</i><span><strong>{mechanic.name}</strong><small>{mechanic.role}</small></span></span></td><td>{mechanic.jobs}</td><td><span className="report-rating">★ {mechanic.rating.toFixed(1)}</span></td><td><span className="completion-value">{mechanic.completion}%</span><span className="completion-track"><i style={{ width: `${mechanic.completion}%` }} /></span></td></tr>)}{mechanicPerformance.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: "1.5rem", color: "#888" }}>No mechanics added yet.</td></tr>}</tbody></table></div>
        </article>
        <article className="report-card invoice-report">
          <header><div><h2>Recent Invoices</h2><p>Latest billing activity</p></div><FileText size={18} /></header>
          <div className="invoice-report-list">{recentInvoices.map((invoice) => <div className="invoice-report-row" key={invoice.id}><span className="invoice-report-icon"><FileText size={15} /></span><span className="invoice-report-info"><strong>{invoice.id}</strong><small>{invoice.customer} · {invoice.date}</small></span><span className="invoice-report-amount"><strong>{formatMoney(invoice.amount)}</strong><small className={invoice.status.toLowerCase()}>{invoice.status}</small></span></div>)}{recentInvoices.length === 0 && <div style={{ padding: "1.5rem", textAlign: "center", color: "#888" }}>No invoices recorded yet.</div>}</div>
        </article>
      </section>
    </main>
  );
}

export default Reports;
