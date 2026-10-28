import { useEffect, useMemo, useState } from "react";
import { customersApi } from "../lib/api";
import ViewInfoModal, { type ViewInfoTarget } from "./ViewInfoModal";
import {
  Activity,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

type CustomerType = "Individual" | "Fleet" | "Corporate";
type CustomerStatus = "Active" | "VIP" | "Inactive" | "Corporate";
type CustomerVehicle = { model: string; year: string; plate: string; lastService: string };
type ServiceRecord = { date: string; vehicle: string; service: string; amount: number };
type Customer = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  address: string;
  type: CustomerType;
  vehicleCount: number;
  lastVisit: string;
  totalSpent: number;
  status: CustomerStatus;
  vehicles: CustomerVehicle[];
  history: ServiceRecord[];
  notes: string;
};

const featuredCustomers: Customer[] = [];

const initialCustomers = featuredCustomers;
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusClass: Record<CustomerStatus, string> = { Active: "active", VIP: "vip", Inactive: "inactive", Corporate: "corporate" };
const typeClass: Record<CustomerType, string> = { Individual: "individual", Fleet: "fleet", Corporate: "corporate" };

function Customers({ notify, onCreateWorkOrder: _onCreateWorkOrder, refreshTrigger }: { notify: (message: string) => void; onAdd?: () => void; onCreateWorkOrder?: () => void; refreshTrigger?: number }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Customer Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [viewInfoTarget, setViewInfoTarget] = useState<ViewInfoTarget | null>(null);

  useEffect(() => {
    customersApi.getAll({ limit: 200 })
      .then((res) => {
        setCustomers(res.data || []);
      })
      .catch((err) => {
        console.warn("Could not fetch customers from backend:", err);
      });
  }, [refreshTrigger]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const matchesSearch = `${customer.id} ${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = typeFilter === "All Customer Types" || customer.type === typeFilter;
    const matchesStatus = statusFilter === "All Status" || customer.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }), [customers, search, statusFilter, typeFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageCustomers = filteredCustomers.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedCustomer = filteredCustomers.find((customer) => customer.id === selectedId) ?? filteredCustomers[0] ?? customers.find((customer) => customer.id === selectedId);
  const counts = {
    total: customers.length,
    active: customers.filter((c) => c.status === "Active" || c.status === "VIP").length,
    fleet: customers.filter((c) => c.type === "Fleet" || c.type === "Corporate").length,
    newThisMonth: customers.filter((c) => c.status === "Active").length,
  };

  return (
    <main className="customer-management">
      <header className="customer-page-heading">
        <div className="customer-page-title"><span><UserRound size={25} /></span><div><h1>Customers</h1><p>Manage customers, service records, and contact details.</p></div></div>
      </header>
      <section className="customer-metrics" aria-label="Customer summary">
        <article><span className="customer-metric-icon blue"><UsersRound size={21} /></span><div><strong>{counts.total}</strong><small>Total Customers</small></div><Activity size={23} className="customer-spark blue-text" /></article>
        <article><span className="customer-metric-icon green"><UserRound size={20} /></span><div><strong>{counts.active}</strong><small>Active Customers</small></div><Activity size={23} className="customer-spark green-text" /></article>
        <article><span className="customer-metric-icon purple"><UsersRound size={20} /></span><div><strong>{counts.fleet}</strong><small>Fleet Customers</small></div><Activity size={23} className="customer-spark purple-text" /></article>
        <article><span className="customer-metric-icon orange"><UserRound size={20} /></span><div><strong>{counts.newThisMonth}</strong><small>New This Month</small></div><Activity size={23} className="customer-spark orange-text" /></article>
      </section>
      <div className="customer-management-layout">
        <section className="customer-list-card">
          <div className="customer-filters">
            <label className="customer-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by customer name, phone, or customer ID..." aria-label="Search customers" /></label>
            <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} aria-label="Filter by customer type">{["All Customer Types", "Individual", "Fleet", "Corporate"].map((type) => <option key={type}>{type}</option>)}</select>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by customer status">{["All Status", "Active", "VIP", "Inactive", "Corporate"].map((status) => <option key={status}>{status}</option>)}</select>
            <label className="customer-date-filter"><CalendarDays size={15} /><span>Last Visit (All Dates)</span></label>
          </div>
          <div className="customer-table-scroll">
            <table className="customer-management-table">
              <thead><tr><th>#</th><th>Customer ID</th><th>Customer Name</th><th>Phone</th><th>Customer Type</th><th>Vehicles</th><th>Last Visit</th><th>Total Spent</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageCustomers.map((customer, index) => (
                  <tr key={customer.id} className={selectedCustomer?.id === customer.id ? "selected" : ""} onClick={() => setSelectedId(customer.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="customer-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(customer.id); }}>{customer.id}</button></td>
                    <td><span className="customer-name-cell"><span>{customer.initials}</span>{customer.name}</span></td>
                    <td>{customer.phone}</td><td><span className={`customer-type-badge ${typeClass[customer.type]}`}>{customer.type}</span></td>
                    <td>{customer.vehicleCount}</td><td>{customer.lastVisit}</td><td className="customer-amount">{money(customer.totalSpent)}</td>
                    <td><span className={`customer-status-badge ${statusClass[customer.status]}`}>{customer.status}</span></td>
                    <td>
                      <button
                        className="crm-table-view-btn"
                        aria-label={`View info for ${customer.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewInfoTarget({ type: "customer", data: customer });
                        }}
                      >
                        <Eye size={13} />
                        <span>View Info</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && <tr><td colSpan={10} className="customer-empty">No customers match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="customer-table-footer"><span>Showing {filteredCustomers.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredCustomers.length)} of {filteredCustomers.length} customers</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: Math.min(5, pageCount) }, (_, index) => { const pageNumber = Math.min(Math.max(1, currentPage - 2), pageCount - 4) + index; return <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>; })}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedCustomer && (
          <aside className="customer-detail-card" aria-label={`Customer details for ${selectedCustomer.id}`}>
            <header><div><FileText size={16} /><strong>Customer Details</strong></div></header>
            <div className="customer-detail-heading"><span className="customer-large-avatar">{selectedCustomer.initials}</span><div><strong>{selectedCustomer.name}</strong><span><Phone size={13} />{selectedCustomer.phone}</span><span><Mail size={13} />{selectedCustomer.email}</span><span><MapPin size={13} />{selectedCustomer.address}</span></div><span className={`customer-status-badge ${statusClass[selectedCustomer.status]}`}>{selectedCustomer.status}</span></div>
            <div className="customer-detail-facts">
              <div><UserRound size={15} /><span>Customer Type</span><strong>{selectedCustomer.type}</strong></div>
              <div><CarFront size={15} /><span>Total Vehicles</span><strong>{selectedCustomer.vehicleCount}</strong></div>
              <div><Wrench size={15} /><span>Total Visits</span><strong>{selectedCustomer.history.length * 4}</strong></div>
              <div><FileText size={15} /><span>Total Spent</span><strong>{money(selectedCustomer.totalSpent)}</strong></div>
              <div><CalendarDays size={15} /><span>Last Service Date</span><strong>{selectedCustomer.lastVisit}</strong></div>
              <div><CalendarDays size={15} /><span>Member Since</span><strong>10 Jan 2022</strong></div>
            </div>
            <section className="customer-notes"><h3><FileText size={15} />Recent Notes</h3><p>{selectedCustomer.notes}</p></section>
            <section className="customer-associated-vehicles">
              <h3><CarFront size={16} />Associated Vehicles ({selectedCustomer.vehicleCount})<button onClick={() => setViewInfoTarget({ type: "customer", data: selectedCustomer })}>View All</button></h3>
              <div className="customer-detail-table-scroll"><table><thead><tr><th>Vehicle</th><th>Year</th><th>Plate No.</th><th>Last Service</th></tr></thead><tbody>{selectedCustomer.vehicles.map((vehicle) => <tr key={`${selectedCustomer.id}-${vehicle.plate}`}><td>{vehicle.model}</td><td>{vehicle.year}</td><td>{vehicle.plate}</td><td>{vehicle.lastService}</td></tr>)}</tbody></table></div>
            </section>
            <section className="customer-service-history">
              <h3><Clock3 size={15} />Service History (Latest 3)<button onClick={() => setViewInfoTarget({ type: "customer", data: selectedCustomer })}>View All</button></h3>
              <div className="customer-detail-table-scroll"><table><thead><tr><th>Date</th><th>Vehicle</th><th>Service</th><th>Amount</th></tr></thead><tbody>{selectedCustomer.history.map((record) => <tr key={`${selectedCustomer.id}-${record.date}`}><td>{record.date}</td><td>{record.vehicle}</td><td>{record.service}</td><td>{money(record.amount)}</td></tr>)}</tbody></table></div>
            </section>
            <div className="customer-detail-actions single-action">
              <button
                type="button"
                className="crm-view-info-card-btn"
                onClick={() => setViewInfoTarget({ type: "customer", data: selectedCustomer })}
              >
                <Eye size={14} />
                <span>View Full Info &amp; History</span>
              </button>
            </div>
          </aside>
        )}
      </div>
      <ViewInfoModal
        isOpen={!!viewInfoTarget}
        onClose={() => setViewInfoTarget(null)}
        target={viewInfoTarget}
        notify={notify}
      />
    </main>
  );
}

export default Customers;
