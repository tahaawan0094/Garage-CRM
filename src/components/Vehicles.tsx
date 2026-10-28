import { useEffect, useMemo, useState } from "react";
import { vehiclesApi } from "../lib/api";
import ViewInfoModal, { type ViewInfoTarget } from "./ViewInfoModal";
import {
  Activity,
  CalendarDays,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";

type VehicleStatus = "In Service" | "Ready" | "Due" | "Archived";
type ServiceRecord = { date: string; job: string; mileage: string; amount: number };
type Vehicle = {
  id: string;
  plate: string;
  customer: string;
  phone: string;
  model: string;
  year: string;
  mileage: string;
  lastService: string;
  nextService: string;
  status: VehicleStatus;
  advisor: string;
  fuel: string;
  color: string;
  notes: string;
  history: ServiceRecord[];
};

const initialVehicles: Vehicle[] = [];

const statusClass: Record<VehicleStatus, string> = {
  "In Service": "in-service",
  Ready: "ready",
  Due: "due",
  Archived: "archived",
};
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Vehicles(props: { notify: (message: string) => void; onAdd?: () => void; onCreateWorkOrder?: () => void; refreshTrigger?: number }) {
  const { notify, refreshTrigger } = props;
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Vehicle Types");
  const [page, setPage] = useState(1);
  const [viewInfoTarget, setViewInfoTarget] = useState<ViewInfoTarget | null>(null);

  useEffect(() => {
    vehiclesApi.getAll({ limit: 100 })
      .then((res) => {
        setVehicles(res.data || []);
      })
      .catch((err) => {
        console.warn("Could not fetch vehicles from backend:", err);
      });
  }, [refreshTrigger]);

  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const matchesSearch = `${vehicle.id} ${vehicle.plate} ${vehicle.customer} ${vehicle.model} ${vehicle.year} ${vehicle.mileage}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "All Status" || vehicle.status === statusFilter;
    const matchesType = typeFilter === "All Vehicle Types" || vehicle.model.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesType;
  }), [search, statusFilter, typeFilter, vehicles]);
  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageVehicles = filteredVehicles.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedVehicle = filteredVehicles.find((vehicle) => vehicle.id === selectedId) ?? filteredVehicles[0] ?? vehicles.find((vehicle) => vehicle.id === selectedId);
  const counts = {
    total: vehicles.length,
    inService: vehicles.filter((v) => v.status === "In Service").length,
    ready: vehicles.filter((v) => v.status === "Ready").length,
    due: vehicles.filter((v) => v.status === "Due").length,
  };

  return (
    <main className="vehicle-management">
      <header className="vehicle-page-heading">
        <div className="vehicle-page-title">
          <span><CarFront size={27} /></span>
          <div><h1>Vehicles</h1><p>Manage customer vehicles, service records, and vehicle details.</p></div>
        </div>
      </header>
      <section className="vehicle-metrics" aria-label="Vehicle summary">
        <article><span className="vehicle-metric-icon blue"><CarFront size={21} /></span><div><strong>{counts.total}</strong><small>Total Vehicles</small></div><Activity size={23} className="vehicle-spark blue-text" /></article>
        <article><span className="vehicle-metric-icon green"><Wrench size={20} /></span><div><strong>{counts.inService}</strong><small>Active in Service</small></div><Activity size={23} className="vehicle-spark green-text" /></article>
        <article><span className="vehicle-metric-icon orange"><Check size={20} /></span><div><strong>{counts.ready}</strong><small>Ready for Pickup</small></div><Activity size={23} className="vehicle-spark orange-text" /></article>
        <article><span className="vehicle-metric-icon red"><CalendarDays size={20} /></span><div><strong>{counts.due}</strong><small>Due for Maintenance</small></div><Activity size={23} className="vehicle-spark red-text" /></article>
      </section>
      <div className="vehicle-management-layout">
        <section className="vehicle-list-card">
          <div className="vehicle-filters">
            <label className="vehicle-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by number plate, customer, or model..." aria-label="Search vehicles" /></label>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by vehicle status">
              {["All Status", "In Service", "Ready", "Due", "Archived"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} aria-label="Filter by vehicle type">
              {["All Vehicle Types", "Toyota", "Nissan", "Lexus", "BMW", "Honda"].map((type) => <option key={type}>{type}</option>)}
            </select>
            <label className="vehicle-date-filter"><CalendarDays size={15} /><span>Last Service (All Dates)</span></label>
          </div>
          <div className="vehicle-table-scroll">
            <table className="vehicle-management-table">
              <thead><tr><th>#</th><th>Vehicle ID</th><th>Plate No.</th><th>Customer</th><th>Vehicle</th><th>Year</th><th>Mileage (KM)</th><th>Last Service</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageVehicles.map((vehicle, index) => (
                  <tr key={vehicle.id} className={selectedVehicle?.id === vehicle.id ? "selected" : ""} onClick={() => setSelectedId(vehicle.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="vehicle-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(vehicle.id); }}>{vehicle.id}</button></td>
                    <td>{vehicle.plate}</td><td>{vehicle.customer}</td>
                    <td><span className="vehicle-model-cell"><CarFront size={31} /><span>{vehicle.model}</span></span></td>
                    <td>{vehicle.year}</td><td>{vehicle.mileage}</td><td>{vehicle.lastService}</td>
                    <td><span className={`vehicle-status-badge ${statusClass[vehicle.status]}`}>{vehicle.status}</span></td>
                    <td>
                      <button
                        className="crm-table-view-btn"
                        aria-label={`View info for ${vehicle.model} (${vehicle.plate})`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewInfoTarget({ type: "vehicle", data: vehicle });
                        }}
                      >
                        <Eye size={13} />
                        <span>View Info</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && <tr><td colSpan={10} className="vehicle-empty">No vehicles match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="vehicle-table-footer"><span>Showing {filteredVehicles.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredVehicles.length)} of {filteredVehicles.length} vehicles</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedVehicle && (
          <aside className="vehicle-detail-card" aria-label={`Vehicle details for ${selectedVehicle.id}`}>
            <header><div><FileText size={16} /><strong>Vehicle Details</strong></div></header>
            <div className="vehicle-detail-heading"><strong>{selectedVehicle.model} - {selectedVehicle.year}</strong><span className={`vehicle-status-badge ${statusClass[selectedVehicle.status]}`}>{selectedVehicle.status}</span></div>
            <div className="vehicle-detail-overview">
              <span className={`vehicle-large-illustration ${selectedVehicle.color.toLowerCase().replaceAll(" ", "-")}`}><CarFront size={76} strokeWidth={1.4} /></span>
              <div><span>Plate No.<strong>{selectedVehicle.plate}</strong></span><span>VIN:<strong>N/A</strong></span><span>Mileage:<strong>{selectedVehicle.mileage} KM</strong></span><span>Fuel Type:<strong>{selectedVehicle.fuel}</strong></span><span>Color:<strong>{selectedVehicle.color}</strong></span></div>
            </div>
            <div className="vehicle-detail-facts">
              <div><UserRound size={15} /><span>Customer</span><strong>{selectedVehicle.customer}<small>{selectedVehicle.phone}</small></strong></div>
              <div><Wrench size={15} /><span>Service Advisor</span><strong>{selectedVehicle.advisor}</strong></div>
              <div><CalendarDays size={15} /><span>Last Service Date</span><strong>{selectedVehicle.lastService}</strong></div>
              <div><CalendarDays size={15} className="due-icon" /><span>Next Service Due</span><strong className="next-due">{selectedVehicle.nextService} (in 3 months)</strong></div>
            </div>
            <section className="vehicle-notes">
              <h3><FileText size={15} />Recent Notes</h3>
              <p>{selectedVehicle.notes}</p>
            </section>
            <section className="vehicle-history">
              <h3><Clock3 size={15} />Service History (Latest 5)<button onClick={() => setViewInfoTarget({ type: "vehicle", data: selectedVehicle })}>View All</button></h3>
              <div className="vehicle-history-scroll"><table><thead><tr><th>Date</th><th>Job Type</th><th>Mileage</th><th>Amount</th></tr></thead><tbody>{selectedVehicle.history.map((record) => <tr key={`${selectedVehicle.id}-${record.date}`}><td>{record.date}</td><td>{record.job}</td><td>{record.mileage}</td><td>{money(record.amount)}</td></tr>)}</tbody></table></div>
            </section>
            <div className="vehicle-detail-actions single-action">
              <button
                type="button"
                className="crm-view-info-card-btn"
                onClick={() => setViewInfoTarget({ type: "vehicle", data: selectedVehicle })}
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

export default Vehicles;
