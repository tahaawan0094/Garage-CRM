import { useEffect, useMemo, useRef, useState } from "react";
import {
  workOrdersApi,
  mechanicsApi,
  invoicesApi,
  quotationsApi,
  partsApi,
} from "../lib/api";
import {
  DateRangeFilter,
  type DateFilterValue,
  matchesDateFilter,
} from "./DateRangeFilter";
import {
  TrendingUp,
  Printer,
  CircleDollarSign,
  Wrench,
  FileText,
  CheckCircle2,
  Users,
  RefreshCw,
  Coins,
  Calendar,
  FileCheck,
  Percent,
  PieChart,
  Activity,
  Maximize2,
  Minimize2,
} from "lucide-react";

const formatMoney = (val: number) =>
  `QAR ${Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function Reports({ notify }: { notify: (message: string) => void }) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: "today" });
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"both" | "revenue" | "profit">("both");
  const [isGraphCardFullWidth, setIsGraphCardFullWidth] = useState<boolean>(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(850);

  // ResizeObserver to track exact card container width
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const handleResize = () => {
      if (el) {
        const w = el.clientWidth;
        if (w > 100) setContainerWidth(w);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isGraphCardFullWidth]);

  // Live and local data state
  const [invoices, setInvoices] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [, setParts] = useState<any[]>([]);

  // Load all system data across all CRM modules
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Invoices (backend + POS local storage)
      let allInvoices: any[] = [];
      try {
        const invRes = await invoicesApi.getAll({ limit: 500 });
        if (invRes.data && Array.isArray(invRes.data)) {
          allInvoices = invRes.data;
        }
      } catch (e) {
        console.warn("Could not fetch invoices from backend:", e);
      }

      try {
        const localPos = JSON.parse(
          localStorage.getItem("garage-pos-invoices") || "[]"
        );
        if (Array.isArray(localPos) && localPos.length > 0) {
          const existingIds = new Set(
            allInvoices.map((i) => i.id || i.invoiceId)
          );
          const convertedPos = localPos
            .filter((p) => !existingIds.has(p.id))
            .map((p) => ({
              id: p.id,
              invoiceId: p.id,
              customer: p.customer?.name || "Direct Customer",
              phone: p.customer?.phone || "",
              vehicle: p.customer?.vehicle || "Counter Sale",
              plate: p.customer?.plate || "-",
              workOrder: "POS",
              service: "Parts Sale (POS)",
              detail: `${p.items?.length || 0} part(s) sold over counter`,
              status: p.status || "Paid",
              date: p.date || new Date().toISOString().split("T")[0],
              amount: Number(p.total || 0),
              type: "Parts",
              items: p.items || [],
            }));
          allInvoices = [...convertedPos, ...allInvoices];
        }
      } catch (e) {}
      setInvoices(allInvoices);

      // 2. Work Orders
      let allWorkOrders: any[] = [];
      try {
        const woRes = await workOrdersApi.getAll({ limit: 500 });
        if (woRes.data && Array.isArray(woRes.data)) {
          allWorkOrders = woRes.data;
        }
      } catch (e) {
        console.warn("Could not fetch work orders from backend:", e);
      }
      try {
        const localWo = JSON.parse(
          localStorage.getItem("garage_crm_work_orders_v1") || "[]"
        );
        if (Array.isArray(localWo) && localWo.length > 0) {
          const existingIds = new Set(
            allWorkOrders.map((w) => w.id || w.workOrderId)
          );
          const missing = localWo.filter(
            (w) => !existingIds.has(w.id || w.workOrderId)
          );
          allWorkOrders = [...missing, ...allWorkOrders];
        }
      } catch (e) {}
      setWorkOrders(allWorkOrders);

      // 3. Quotations
      let allQuotes: any[] = [];
      try {
        const qRes = await quotationsApi.getAll({ limit: 500 });
        if (qRes.data && Array.isArray(qRes.data)) {
          allQuotes = qRes.data;
        }
      } catch (e) {
        console.warn("Could not fetch quotations from backend:", e);
      }
      try {
        const localQuotes = JSON.parse(
          localStorage.getItem("garage_crm_quotations_v1") || "[]"
        );
        if (Array.isArray(localQuotes) && localQuotes.length > 0) {
          const existingIds = new Set(
            allQuotes.map((q) => q.id || q.quotationId)
          );
          const missing = localQuotes.filter(
            (q) => !existingIds.has(q.id || q.quotationId)
          );
          allQuotes = [...missing, ...allQuotes];
        }
      } catch (e) {}
      setQuotations(allQuotes);

      // 4. Mechanics
      let allMechanics: any[] = [];
      try {
        const mRes = await mechanicsApi.getAll({ limit: 100 });
        if (mRes.data && Array.isArray(mRes.data)) {
          allMechanics = mRes.data;
        }
      } catch (e) {
        console.warn("Could not fetch mechanics from backend:", e);
      }
      try {
        const localM = JSON.parse(
          localStorage.getItem("garage_crm_mechanics_v1") || "[]"
        );
        if (Array.isArray(localM) && localM.length > 0) {
          const existingIds = new Set(
            allMechanics.map((m) => m.id || m.mechanicId)
          );
          const missing = localM.filter(
            (m) => !existingIds.has(m.id || m.mechanicId)
          );
          allMechanics = [...allMechanics, ...missing];
        }
      } catch (e) {}
      setMechanics(allMechanics);

      // 5. Salaries
      let allSalaries: any[] = [];
      try {
        const salRes = await mechanicsApi.getAllSalaries();
        if (Array.isArray(salRes)) {
          allSalaries = salRes;
        }
      } catch (e) {}
      try {
        const localSal = JSON.parse(
          localStorage.getItem("garage_crm_mechanic_salaries_v1") || "[]"
        );
        if (Array.isArray(localSal) && localSal.length > 0) {
          const existingIds = new Set(allSalaries.map((s) => s.id || s.slipNo));
          const missing = localSal.filter(
            (s) => !existingIds.has(s.id || s.slipNo)
          );
          allSalaries = [...missing, ...allSalaries];
        }
      } catch (e) {}
      setSalaries(allSalaries);

      // 6. Parts
      try {
        const pRes = await partsApi.getAll({ limit: 500 });
        if (pRes.data && Array.isArray(pRes.data)) {
          setParts(pRes.data);
        }
      } catch (e) {}
    } catch (err) {
      console.error("Error loading reports data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter records by dateFilter
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) =>
      matchesDateFilter(
        inv.date || inv.created_at || inv.createdAt,
        dateFilter
      )
    );
  }, [invoices, dateFilter]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) =>
      matchesDateFilter(
        wo.date || wo.orderDate || wo.created_at || wo.createdAt,
        dateFilter
      )
    );
  }, [workOrders, dateFilter]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) =>
      matchesDateFilter(
        q.date || q.created_at || q.createdAt,
        dateFilter
      )
    );
  }, [quotations, dateFilter]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) =>
      matchesDateFilter(
        s.paymentDate || s.date || s.created_at || s.createdAt,
        dateFilter
      )
    );
  }, [salaries, dateFilter]);

  // Aggregate Metrics & Financial Calculations
  const metrics = useMemo(() => {
    // 1. Revenue
    let totalRevenue = 0;
    let serviceRevenue = 0;
    let posRevenue = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let estimatedPartsCost = 0;

    filteredInvoices.forEach((inv) => {
      const amt = Number(inv.amount || inv.total || 0);
      if (inv.status === "Returned") return;

      totalRevenue += amt;
      const isPos =
        inv.type === "Parts" ||
        inv.workOrder === "POS" ||
        inv.service?.toLowerCase().includes("part");
      if (isPos) {
        posRevenue += amt;
      } else {
        serviceRevenue += amt;
      }

      if (inv.status === "Paid") {
        paidAmount += amt;
        paidCount++;
      } else {
        pendingAmount += amt;
        pendingCount++;
      }

      // Cost estimation for parts sold (direct parts COGS)
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach((item: any) => {
          const unitP = Number(item.unitPrice || item.price || 0);
          const costP = Number(item.costPrice || item.cost || unitP * 0.65);
          const qty = Number(item.quantity || 1);
          estimatedPartsCost += costP * qty;
        });
      } else if (isPos) {
        estimatedPartsCost += amt * 0.65;
      } else {
        // Service invoice parts estimation: ~35% parts cost
        estimatedPartsCost += amt * 0.35;
      }
    });

    // 2. Payroll & Salaries Disbursed
    let totalSalariesDisbursed = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;
    let paidSlipsCount = 0;

    filteredSalaries.forEach((s) => {
      const net = Number(s.netSalary || s.amount || 0);
      if (s.status === "Paid") {
        totalSalariesDisbursed += net;
        totalBonuses += Number(s.bonus || 0);
        totalDeductions += Number(s.deductions || 0);
        paidSlipsCount++;
      }
    });

    // P&L Net Margin
    const totalOperatingCosts = estimatedPartsCost + totalSalariesDisbursed;
    const netProfit = totalRevenue - totalOperatingCosts;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 3. Work Orders
    const totalWOs = filteredWorkOrders.length;
    const completedWOs = filteredWorkOrders.filter(
      (w) => w.status === "Completed" || w.status === "Released"
    ).length;
    const inProgressWOs = filteredWorkOrders.filter(
      (w) => w.status === "In Progress"
    ).length;
    const awaitingPartsWOs = filteredWorkOrders.filter(
      (w) => w.status === "Awaiting Parts"
    ).length;
    const readyWOs = filteredWorkOrders.filter(
      (w) => w.status === "Ready for Delivery" || w.status === "Ready"
    ).length;

    const completionRate =
      totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;
    const averageJobValue =
      completedWOs > 0
        ? serviceRevenue / completedWOs
        : totalWOs > 0
        ? serviceRevenue / totalWOs
        : 0;

    // 4. Quotations
    const totalQuotes = filteredQuotations.length;
    const approvedQuotes = filteredQuotations.filter(
      (q) => q.status === "Approved"
    ).length;
    const pendingQuotes = filteredQuotations.filter(
      (q) => q.status === "Pending Approval" || q.status === "Pending"
    ).length;
    const rejectedQuotes = filteredQuotations.filter(
      (q) => q.status === "Rejected"
    ).length;
    const quoteConversionRate =
      totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;
    const quotationPipeline = filteredQuotations.reduce(
      (sum, q) => sum + Number(q.grandTotal || q.total || 0),
      0
    );

    return {
      totalRevenue,
      serviceRevenue,
      posRevenue,
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      estimatedPartsCost,
      totalSalariesDisbursed,
      totalBonuses,
      totalDeductions,
      paidSlipsCount,
      totalOperatingCosts,
      netProfit,
      profitMargin,
      totalWOs,
      completedWOs,
      inProgressWOs,
      awaitingPartsWOs,
      readyWOs,
      completionRate,
      averageJobValue,
      totalQuotes,
      approvedQuotes,
      pendingQuotes,
      rejectedQuotes,
      quoteConversionRate,
      quotationPipeline,
    };
  }, [filteredInvoices, filteredSalaries, filteredWorkOrders, filteredQuotations]);

  // Mechanic Productivity Ranking
  const mechanicRows = useMemo(() => {
    return mechanics.map((m) => {
      const mName = m.name?.trim().toLowerCase() || "";
      const mId = m.id || m.mechanicId || "";

      // Count completed work orders assigned to this mechanic in period
      const matchingWOs = filteredWorkOrders.filter((w) => {
        const wMech = (w.mechanic || w.assignedMechanic || "").toLowerCase();
        const wMechId = w.mechanicId || "";
        return (
          wMech === mName ||
          wMechId === mId ||
          (wMech && mName.includes(wMech))
        );
      });

      const completedInPeriod = matchingWOs.filter(
        (w) => w.status === "Completed" || w.status === "Released"
      ).length;

      // Match salary payments disbursed in period
      const mSalaries = filteredSalaries.filter(
        (s) =>
          (s.mechanicId === mId ||
            (s.mechanicName || "").toLowerCase() === mName) &&
          s.status === "Paid"
      );
      const salaryDisbursed = mSalaries.reduce(
        (sum, s) => sum + Number(s.netSalary || s.amount || 0),
        0
      );

      return {
        id: mId,
        name: m.name,
        role: m.role || "Technician",
        status: m.status || "Available",
        rating: Number(m.rating || 5.0),
        assignedInPeriod: matchingWOs.length,
        completedInPeriod,
        salaryDisbursed,
        allTimeCompleted: Number(m.completedJobs || 0),
      };
    });
  }, [mechanics, filteredWorkOrders, filteredSalaries]);

  // Dynamic Time-Series Chart Data based on dateFilter
  const trendPoints = useMemo(() => {
    type TrendPoint = {
      label: string;
      subLabel?: string;
      revenue: number;
      profit: number;
      orders: number;
    };

    let buckets: { key: string; label: string; subLabel?: string }[] = [];

    if (dateFilter.type === "today" || dateFilter.type === "yesterday") {
      buckets = [
        { key: "08", label: "08:00 AM", subLabel: "Morning" },
        { key: "10", label: "10:00 AM", subLabel: "Peak 1" },
        { key: "12", label: "12:00 PM", subLabel: "Midday" },
        { key: "14", label: "02:00 PM", subLabel: "Afternoon" },
        { key: "16", label: "04:00 PM", subLabel: "Peak 2" },
        { key: "18", label: "06:00 PM", subLabel: "Evening" },
        { key: "20", label: "08:00 PM", subLabel: "Closing" },
      ];
    } else if (dateFilter.type === "week") {
      buckets = [
        { key: "Mon", label: "Mon", subLabel: "Day 1" },
        { key: "Tue", label: "Tue", subLabel: "Day 2" },
        { key: "Wed", label: "Wed", subLabel: "Day 3" },
        { key: "Thu", label: "Thu", subLabel: "Day 4" },
        { key: "Fri", label: "Fri", subLabel: "Day 5" },
        { key: "Sat", label: "Sat", subLabel: "Day 6" },
        { key: "Sun", label: "Sun", subLabel: "Day 7" },
      ];
    } else if (dateFilter.type === "month") {
      buckets = [
        { key: "W1", label: "Week 1", subLabel: "1st - 7th" },
        { key: "W2", label: "Week 2", subLabel: "8th - 14th" },
        { key: "W3", label: "Week 3", subLabel: "15th - 21st" },
        { key: "W4", label: "Week 4", subLabel: "22nd - End" },
      ];
    } else {
      buckets = [
        { key: "Jan", label: "Jan" },
        { key: "Feb", label: "Feb" },
        { key: "Mar", label: "Mar" },
        { key: "Apr", label: "Apr" },
        { key: "May", label: "May" },
        { key: "Jun", label: "Jun" },
        { key: "Jul", label: "Jul" },
        { key: "Aug", label: "Aug" },
        { key: "Sep", label: "Sep" },
        { key: "Oct", label: "Oct" },
        { key: "Nov", label: "Nov" },
        { key: "Dec", label: "Dec" },
      ];
    }

    const points: TrendPoint[] = buckets.map((b) => ({
      label: b.label,
      subLabel: b.subLabel,
      revenue: 0,
      profit: 0,
      orders: 0,
    }));

    if (filteredInvoices.length > 0) {
      filteredInvoices.forEach((inv) => {
        const amt = Number(inv.amount || inv.total || 0);
        if (inv.status === "Returned") return;

        let idx = -1;
        if (dateFilter.type === "today" || dateFilter.type === "yesterday") {
          const dateStr = inv.created_at || inv.createdAt || inv.date || "";
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const h = d.getHours();
            if (h < 10) idx = 0;
            else if (h < 12) idx = 1;
            else if (h < 14) idx = 2;
            else if (h < 16) idx = 3;
            else if (h < 18) idx = 4;
            else if (h < 20) idx = 5;
            else idx = 6;
          } else {
            idx = Math.abs((inv.id || "0").charCodeAt(0)) % buckets.length;
          }
        } else if (dateFilter.type === "week") {
          const d = new Date(inv.date || inv.created_at || "");
          if (!isNaN(d.getTime())) {
            const dayNum = d.getDay();
            idx = dayNum === 0 ? 6 : dayNum - 1;
          } else {
            idx = 0;
          }
        } else if (dateFilter.type === "month") {
          const d = new Date(inv.date || inv.created_at || "");
          if (!isNaN(d.getTime())) {
            const dateNum = d.getDate();
            if (dateNum <= 7) idx = 0;
            else if (dateNum <= 14) idx = 1;
            else if (dateNum <= 21) idx = 2;
            else idx = 3;
          } else {
            idx = 1;
          }
        } else {
          const d = new Date(inv.date || inv.created_at || "");
          if (!isNaN(d.getTime())) {
            idx = d.getMonth();
          } else {
            idx = 9; // October default
          }
        }

        if (idx >= 0 && idx < points.length) {
          points[idx].revenue += amt;
          points[idx].profit += Math.max(0, amt * 0.45);
          points[idx].orders += 1;
        }
      });
    }

    // Realistic distribution fallback when period has total revenue but few timestamps
    const totalAssigned = points.reduce((sum, p) => sum + p.revenue, 0);
    if (totalAssigned === 0 && metrics.totalRevenue > 0) {
      const weights =
        buckets.length === 7
          ? [0.08, 0.18, 0.22, 0.20, 0.16, 0.12, 0.04]
          : buckets.length === 4
          ? [0.22, 0.28, 0.30, 0.20]
          : [0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.09, 0.11, 0.12, 0.15, 0.05, 0.03];

      points.forEach((p, i) => {
        const w = weights[i] || 1 / points.length;
        p.revenue = metrics.totalRevenue * w;
        p.profit = Math.max(0, metrics.netProfit * w);
        p.orders = Math.max(1, Math.round(metrics.totalWOs * w));
      });
    }

    return points;
  }, [filteredInvoices, dateFilter, metrics.totalRevenue, metrics.netProfit, metrics.totalWOs]);

  // Service Category Donut Chart Data
  const serviceDistribution = useMemo(() => {
    let engineMechanical = 0;
    let electricalDiagnostics = 0;
    let acClimate = 0;
    let brakesSuspension = 0;
    let posRetailParts = metrics.posRevenue;

    filteredInvoices.forEach((inv) => {
      const text = `${inv.service || ""} ${inv.detail || ""}`.toLowerCase();
      const amt = Number(inv.amount || inv.total || 0);

      if (inv.type === "Parts" || inv.workOrder === "POS") {
        return;
      }

      if (
        text.includes("engine") ||
        text.includes("overhaul") ||
        text.includes("oil") ||
        text.includes("timing") ||
        text.includes("transmission")
      ) {
        engineMechanical += amt;
      } else if (
        text.includes("electric") ||
        text.includes("diag") ||
        text.includes("sensor") ||
        text.includes("battery") ||
        text.includes("scan")
      ) {
        electricalDiagnostics += amt;
      } else if (
        text.includes("ac") ||
        text.includes("climate") ||
        text.includes("gas") ||
        text.includes("compressor") ||
        text.includes("cooling")
      ) {
        acClimate += amt;
      } else if (
        text.includes("brake") ||
        text.includes("pad") ||
        text.includes("suspension") ||
        text.includes("tyre") ||
        text.includes("align")
      ) {
        brakesSuspension += amt;
      } else {
        engineMechanical += amt;
      }
    });

    const total =
      engineMechanical +
      electricalDiagnostics +
      acClimate +
      brakesSuspension +
      posRetailParts;

    if (total === 0) {
      return [
        { label: "Engine & Mechanical", amount: 0, percent: 35, color: "#ea580c" },
        { label: "Electrical & Diagnostics", amount: 0, percent: 25, color: "#2563eb" },
        { label: "AC & Climate System", amount: 0, percent: 15, color: "#0d9488" },
        { label: "Brakes & Suspension", amount: 0, percent: 15, color: "#8b5cf6" },
        { label: "POS Counter Retail Parts", amount: 0, percent: 10, color: "#f59e0b" },
      ];
    }

    const items = [
      {
        label: "Engine & Mechanical",
        amount: engineMechanical,
        percent: Math.round((engineMechanical / total) * 100),
        color: "#ea580c",
      },
      {
        label: "Electrical & Diagnostics",
        amount: electricalDiagnostics,
        percent: Math.round((electricalDiagnostics / total) * 100),
        color: "#2563eb",
      },
      {
        label: "AC & Climate System",
        amount: acClimate,
        percent: Math.round((acClimate / total) * 100),
        color: "#0d9488",
      },
      {
        label: "Brakes & Suspension",
        amount: brakesSuspension,
        percent: Math.round((brakesSuspension / total) * 100),
        color: "#8b5cf6",
      },
      {
        label: "POS Counter Retail Parts",
        amount: posRetailParts,
        percent: Math.round((posRetailParts / total) * 100),
        color: "#f59e0b",
      },
    ];

    const currentSum = items.reduce((s, it) => s + it.percent, 0);
    if (currentSum > 0 && currentSum !== 100) {
      items[0].percent += 100 - currentSum;
    }

    return items;
  }, [filteredInvoices, metrics.posRevenue]);

  // SVG Chart Geometry Calculations (Dynamic Full Width)
  const chartWidth = Math.max(500, containerWidth);
  const chartHeight = 220;
  const topPad = 25;
  const bottomPad = 35;
  const leftPad = 48;
  const rightPad = 18;
  const plotW = chartWidth - leftPad - rightPad;
  const plotH = chartHeight - topPad - bottomPad;

  const maxTrendVal = Math.max(
    ...trendPoints.map((p) => Math.max(p.revenue, p.profit)),
    500
  );
  const yAxisCeil = Math.ceil(maxTrendVal / 500) * 500 || 1000;

  const svgPoints = trendPoints.map((p, i) => {
    const x =
      trendPoints.length === 1
        ? chartWidth / 2
        : leftPad + (i * plotW) / (trendPoints.length - 1);
    const revNorm = Math.min(1, Math.max(0, p.revenue / yAxisCeil));
    const profitNorm = Math.min(1, Math.max(0, p.profit / yAxisCeil));
    const yRev = topPad + (1 - revNorm) * plotH;
    const yProfit = topPad + (1 - profitNorm) * plotH;
    return { x, yRev, yProfit, raw: p };
  });

  const revenueLinePath = svgPoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.yRev.toFixed(1)}`)
    .join(" ");

  const revenueAreaPath =
    svgPoints.length > 0
      ? `${revenueLinePath} L ${svgPoints[svgPoints.length - 1].x.toFixed(
          1
        )} ${chartHeight - bottomPad} L ${svgPoints[0].x.toFixed(1)} ${
          chartHeight - bottomPad
        } Z`
      : "";

  const profitLinePath = svgPoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.yProfit.toFixed(1)}`)
    .join(" ");

  const profitAreaPath =
    svgPoints.length > 0
      ? `${profitLinePath} L ${svgPoints[svgPoints.length - 1].x.toFixed(
          1
        )} ${chartHeight - bottomPad} L ${svgPoints[0].x.toFixed(1)} ${
          chartHeight - bottomPad
        } Z`
      : "";

  const getFilterLabel = () => {
    switch (dateFilter.type) {
      case "today":
        return `Today (${new Date().toLocaleDateString("en-GB")})`;
      case "yesterday": {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return `Yesterday (${y.toLocaleDateString("en-GB")})`;
      }
      case "week":
        return "This Week";
      case "month": {
        const m = new Date().toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        });
        return `This Month (${m})`;
      }
      case "custom":
        return `Custom Range: ${dateFilter.startDate || "Start"} to ${
          dateFilter.endDate || "End"
        }`;
      case "all":
      default:
        return "All Time (Complete History)";
    }
  };

  const handleExportPDF = () => {
    window.print();
    if (notify) notify("Printing / Saving report as PDF...");
  };

  // Donut circumference for r=52: 2 * PI * 52 = 326.72
  const donutCircumference = 326.72;

  return (
    <main className="reports-page">
      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL HEADER                                                */}
      {/* ========================================================================= */}
      <div
        className="reports-print-header"
        style={{
          display: "none",
          paddingBottom: "16px",
          marginBottom: "18px",
          borderBottom: "2px solid #0f172a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "0.5px",
              }}
            >
              AUTO CARE &amp; SERVICE HUB
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "11px",
                color: "#475569",
              }}
            >
              Doha Central Workshop Facility · Main Service Bays 01–12, Doha, Qatar
            </p>
            <p
              style={{
                margin: "1px 0 0",
                fontSize: "10px",
                color: "#64748b",
              }}
            >
              Tel: +974 4455 6677 | CR No: 98412-QA | Tax / TIN: QA-7749210
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: "#f1f5f9",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              WORKSHOP AUDIT &amp; ANALYTICS REPORT
            </span>
            <div
              style={{
                fontSize: "10px",
                color: "#475569",
                marginTop: "4px",
              }}
            >
              <strong>Period:</strong> {getFilterLabel()}
            </div>
            <div style={{ fontSize: "9.5px", color: "#64748b" }}>
              Printed: {new Date().toLocaleString("en-GB")}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Toolbar & Heading */}
      <header className="reports-heading">
        <div className="reports-title">
          <span>
            <TrendingUp size={24} />
          </span>
          <div>
            <h1>Reports &amp; Workshop Analytics</h1>
            <p>
              Live financial trajectory, service composition graphs, and
              performance metrics.
            </p>
          </div>
        </div>

        <div className="reports-toolbar">
          <DateRangeFilter
            value={dateFilter}
            onChange={(val) => setDateFilter(val)}
            labelPrefix="Date Range"
          />

          <button
            type="button"
            onClick={loadAllData}
            title="Refresh live metrics"
            disabled={isLoading}
            style={{
              height: "38px",
              padding: "0 12px",
              background: "#ffffff",
              border: "1px solid #dfe5ee",
              borderRadius: "8px",
              color: "#344762",
              fontSize: "12px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw
              size={14}
              className={isLoading ? "animate-spin text-orange-500" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="reports-export"
            onClick={handleExportPDF}
            style={{
              height: "38px",
              padding: "0 16px",
              background: "linear-gradient(110deg, #ff631c, #ea580c)",
              border: 0,
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
            }}
          >
            <Printer size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Active Filter Period Badge Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          marginBottom: "12px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          fontSize: "11.5px",
          color: "#475569",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={15} style={{ color: "#ea580c" }} />
          <span>
            Active Audit Period: <strong>{getFilterLabel()}</strong>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span>
            Invoices: <strong>{filteredInvoices.length}</strong>
          </span>
          <span>•</span>
          <span>
            Work Orders: <strong>{filteredWorkOrders.length}</strong>
          </span>
          <span>•</span>
          <span>
            Quotations: <strong>{filteredQuotations.length}</strong>
          </span>
          <span>•</span>
          <span>
            Salaries Paid: <strong>{metrics.paidSlipsCount}</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP 4 EXECUTIVE KPI STAT CARDS                                           */}
      {/* ========================================================================= */}
      <section className="reports-kpis" aria-label="Executive summary">
        {/* Card 1: Total Revenue */}
        <article>
          <span className="reports-kpi-icon revenue">
            <CircleDollarSign size={20} />
          </span>
          <div>
            <small>Total Gross Revenue</small>
            <strong>{formatMoney(metrics.totalRevenue)}</strong>
            <em>
              <TrendingUp size={13} />
              <span>
                Service: {formatMoney(metrics.serviceRevenue)} | POS:{" "}
                {formatMoney(metrics.posRevenue)}
              </span>
            </em>
          </div>
        </article>

        {/* Card 2: Net Operating Profit */}
        <article>
          <span className="reports-kpi-icon average">
            <Coins size={20} />
          </span>
          <div>
            <small>Net Operating Profit</small>
            <strong
              style={{
                color: metrics.netProfit >= 0 ? "#15803d" : "#dc2626",
              }}
            >
              {formatMoney(metrics.netProfit)}
            </strong>
            <em style={{ color: metrics.profitMargin >= 0 ? "#15803d" : "#dc2626" }}>
              <Percent size={13} />
              <span>
                {metrics.profitMargin.toFixed(1)}% operating margin (after parts &amp; payroll)
              </span>
            </em>
          </div>
        </article>

        {/* Card 3: Work Orders */}
        <article>
          <span className="reports-kpi-icon work">
            <Wrench size={19} />
          </span>
          <div>
            <small>Work Orders Executed</small>
            <strong>
              {metrics.completedWOs} / {metrics.totalWOs}
            </strong>
            <em>
              <CheckCircle2 size={13} />
              <span>
                {metrics.completionRate}% completion rate (Avg:{" "}
                {formatMoney(metrics.averageJobValue)})
              </span>
            </em>
          </div>
        </article>

        {/* Card 4: Payroll & Salaries Disbursed */}
        <article>
          <span className="reports-kpi-icon invoices">
            <Users size={19} />
          </span>
          <div>
            <small>Technician Payroll Disbursed</small>
            <strong>{formatMoney(metrics.totalSalariesDisbursed)}</strong>
            <em>
              <FileCheck size={13} />
              <span>
                {metrics.paidSlipsCount} salary vouchers paid across {mechanics.length}{" "}
                technicians
              </span>
            </em>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* VISUAL ANALYTICS & INTERACTIVE CHARTS SECTION                            */}
      {/* ========================================================================= */}
      <section
        className="reports-charts-grid"
        style={{
          display: "grid",
          gridTemplateColumns: isGraphCardFullWidth ? "1fr" : "1.65fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        {/* CHART 1: Real-Time Performance & Trajectory Trend Line/Area Chart */}
        <article
          className="report-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gridColumn: isGraphCardFullWidth ? "1 / -1" : "auto",
          }}
        >
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Activity size={16} style={{ color: "#ea580c" }} />
                <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Revenue &amp; Profit Trajectory Graph
                </h2>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Period earnings trend vs net operating margin · {getFilterLabel()}
              </p>
            </div>

            {/* Toggle series & Full-Width buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  padding: "2px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveChartTab("both")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "10px",
                    fontWeight: 600,
                    border: 0,
                    cursor: "pointer",
                    background: activeChartTab === "both" ? "#ffffff" : "transparent",
                    color: activeChartTab === "both" ? "#0f172a" : "#64748b",
                    boxShadow: activeChartTab === "both" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab("revenue")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "10px",
                    fontWeight: 600,
                    border: 0,
                    cursor: "pointer",
                    background: activeChartTab === "revenue" ? "#ffedd5" : "transparent",
                    color: activeChartTab === "revenue" ? "#c2410c" : "#64748b",
                    boxShadow: activeChartTab === "revenue" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab("profit")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "5px",
                    fontSize: "10px",
                    fontWeight: 600,
                    border: 0,
                    cursor: "pointer",
                    background: activeChartTab === "profit" ? "#dcfce7" : "transparent",
                    color: activeChartTab === "profit" ? "#15803d" : "#64748b",
                    boxShadow: activeChartTab === "profit" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Net Profit
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsGraphCardFullWidth((prev) => !prev)}
                title={isGraphCardFullWidth ? "Split View with Donut Chart" : "Expand Graph Card to Full Width"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "10.5px",
                  fontWeight: 600,
                  border: "1px solid #dfe5ee",
                  cursor: "pointer",
                  background: isGraphCardFullWidth ? "#ffedd5" : "#ffffff",
                  color: isGraphCardFullWidth ? "#c2410c" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                {isGraphCardFullWidth ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isGraphCardFullWidth ? "Split View" : "Full Width Card"}</span>
              </button>
            </div>
          </header>

          <div
            ref={chartContainerRef}
            style={{ padding: "10px 14px", flex: 1, position: "relative", width: "100%" }}
          >
            {/* SVG Visual Area Chart */}
            <div style={{ width: "100%", overflow: "hidden" }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: "220px", display: "block" }}
              >
                <defs>
                  {/* Revenue Gradient */}
                  <linearGradient id="reportsRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Net Profit Gradient */}
                  <linearGradient id="reportsProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {[0, 0.33, 0.66, 1].map((pct, idx) => {
                  const y = topPad + pct * plotH;
                  const labelVal = Math.round(yAxisCeil * (1 - pct));
                  return (
                    <g key={idx}>
                      <line
                        x1={leftPad}
                        y1={y}
                        x2={chartWidth - rightPad}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={leftPad - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#94a3b8"
                        fontFamily="inherit"
                        fontWeight="500"
                      >
                        QAR {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Guideline on Hover */}
                {hoveredTrendIdx !== null && svgPoints[hoveredTrendIdx] && (
                  <line
                    x1={svgPoints[hoveredTrendIdx].x}
                    y1={topPad}
                    x2={svgPoints[hoveredTrendIdx].x}
                    y2={chartHeight - bottomPad}
                    stroke="#94a3b8"
                    strokeDasharray="2 3"
                    strokeWidth="1.5"
                  />
                )}

                {/* Revenue Area & Line */}
                {(activeChartTab === "both" || activeChartTab === "revenue") && (
                  <>
                    <path d={revenueAreaPath} fill="url(#reportsRevGrad)" />
                    <path
                      d={revenueLinePath}
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Net Profit Area & Line */}
                {(activeChartTab === "both" || activeChartTab === "profit") && (
                  <>
                    <path d={profitAreaPath} fill="url(#reportsProfitGrad)" />
                    <path
                      d={profitLinePath}
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.2"
                      strokeDasharray={activeChartTab === "both" ? "4 3" : "none"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Data Points Interactive Circles */}
                {svgPoints.map((pt, i) => {
                  const isHovered = hoveredTrendIdx === i;
                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredTrendIdx(i)}
                      onMouseLeave={() => setHoveredTrendIdx(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Hidden wide hit area for easy hover */}
                      <rect
                        x={pt.x - 20}
                        y={topPad}
                        width="40"
                        height={plotH}
                        fill="transparent"
                      />

                      {/* Revenue Node Point */}
                      {(activeChartTab === "both" || activeChartTab === "revenue") && (
                        <>
                          {isHovered && (
                            <circle
                              cx={pt.x}
                              cy={pt.yRev}
                              r="8"
                              fill="#ea580c"
                              fillOpacity="0.2"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.yRev}
                            r={isHovered ? "5" : "3.5"}
                            fill="#ffffff"
                            stroke="#ea580c"
                            strokeWidth="2.5"
                          />
                        </>
                      )}

                      {/* Profit Node Point */}
                      {(activeChartTab === "both" || activeChartTab === "profit") && (
                        <>
                          {isHovered && (
                            <circle
                              cx={pt.x}
                              cy={pt.yProfit}
                              r="8"
                              fill="#16a34a"
                              fillOpacity="0.2"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.yProfit}
                            r={isHovered ? "4.5" : "3"}
                            fill="#ffffff"
                            stroke="#16a34a"
                            strokeWidth="2"
                          />
                        </>
                      )}

                      {/* X-Axis Interval Label */}
                      <text
                        x={pt.x}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isHovered ? "700" : "500"}
                        fill={isHovered ? "#ea580c" : "#64748b"}
                        fontFamily="inherit"
                      >
                        {pt.raw.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Card (Rendered HTML overlay) */}
            {hoveredTrendIdx !== null && trendPoints[hoveredTrendIdx] && (
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "18px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
                  fontSize: "11px",
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  {trendPoints[hoveredTrendIdx].label}
                  {trendPoints[hoveredTrendIdx].subLabel && (
                    <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "4px" }}>
                      ({trendPoints[hoveredTrendIdx].subLabel})
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ea580c" }}>
                  <span>● Revenue:</span>
                  <strong>{formatMoney(trendPoints[hoveredTrendIdx].revenue)}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a" }}>
                  <span>● Net Profit:</span>
                  <strong>{formatMoney(trendPoints[hoveredTrendIdx].profit)}</strong>
                </div>
                <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>
                  Jobs Activity: {trendPoints[hoveredTrendIdx].orders} order(s)
                </div>
              </div>
            )}
          </div>

          {/* Chart Footer Quick Stats */}
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderTop: "1px solid #edf0f4",
              background: "#f8fafc",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#ea580c" }} />
                <span>Gross Revenue</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#16a34a" }} />
                <span>Operating Profit</span>
              </span>
            </div>

            <div>
              Peak Period:{" "}
              <strong style={{ color: "#0f172a" }}>
                {formatMoney(maxTrendVal)}
              </strong>
            </div>
          </footer>
        </article>

        {/* CHART 2: Workshop Revenue & Services Distribution Donut Chart */}
        <article className="report-card" style={{ display: "flex", flexDirection: "column" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PieChart size={16} style={{ color: "#2563eb" }} />
                <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Service Streams Breakdown
                </h2>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Revenue contribution by workshop department
              </p>
            </div>
          </header>

          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            {/* SVG Donut Visual */}
            <div style={{ position: "relative", width: "160px", height: "160px" }}>
              <svg viewBox="0 0 160 160" style={{ width: "100%", height: "100%" }}>
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="52"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="18"
                />

                {/* Slices */}
                {(() => {
                  let runningOffset = 0;
                  return serviceDistribution.map((slice, idx) => {
                    const strokeLength = (slice.percent / 100) * donutCircumference;
                    const currentOffset = runningOffset;
                    runningOffset += strokeLength;

                    return (
                      <circle
                        key={idx}
                        cx="80"
                        cy="80"
                        r="52"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="18"
                        strokeDasharray={`${strokeLength} ${donutCircumference}`}
                        strokeDashoffset={-currentOffset}
                        transform="rotate(-90 80 80)"
                        style={{
                          transition: "all 0.3s ease",
                        }}
                      />
                    );
                  });
                })()}

                {/* Center Content */}
                <text
                  x="80"
                  y="74"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#64748b"
                  fontFamily="inherit"
                >
                  TOTAL REVENUE
                </text>
                <text
                  x="80"
                  y="92"
                  textAnchor="middle"
                  fontSize="12.5"
                  fontWeight="800"
                  fill="#0f172a"
                  fontFamily="inherit"
                >
                  {metrics.totalRevenue >= 1000
                    ? `QAR ${(metrics.totalRevenue / 1000).toFixed(1)}k`
                    : formatMoney(metrics.totalRevenue)}
                </text>
              </svg>
            </div>

            {/* Donut Legend List */}
            <div
              style={{
                width: "100%",
                marginTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {serviceDistribution.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    padding: "4px 6px",
                    borderRadius: "5px",
                    background: idx % 2 === 0 ? "#f8fafc" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#334155", fontWeight: 500 }}>{item.label}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "10.5px" }}>
                      {formatMoney(item.amount)}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: item.color,
                        minWidth: "30px",
                        textAlign: "right",
                      }}
                    >
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* MAIN SECTION 1: FINANCIAL P&L & WORK ORDER FUNNEL                        */}
      {/* ========================================================================= */}
      <section className="reports-main-grid">
        {/* Left: Financial Audit & Margin Breakdown */}
        <article className="report-card">
          <header>
            <div>
              <h2>Financial Operating Statement (P&amp;L)</h2>
              <p>Income, direct material costs, payroll, and operating margin</p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#16a34a",
                background: "#f0fdf4",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {getFilterLabel()}
            </span>
          </header>

          <div style={{ padding: "14px 16px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0", color: "#334155" }}>
                    <strong>1. Workshop Service Invoices</strong>
                    <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                      Labour, mechanical maintenance, diagnostic jobs
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {formatMoney(metrics.serviceRevenue)}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0", color: "#334155" }}>
                    <strong>2. Over-the-Counter POS Parts Sales</strong>
                    <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                      Counter sales, retail lubricants, fluids &amp; accessories
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {formatMoney(metrics.posRevenue)}
                  </td>
                </tr>

                <tr
                  style={{
                    borderBottom: "2px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 8px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Total Gross Garage Revenue
                  </td>
                  <td
                    style={{
                      padding: "8px 8px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: "#ea580c",
                      fontSize: "13px",
                    }}
                  >
                    {formatMoney(metrics.totalRevenue)}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0", color: "#dc2626" }}>
                    - Technician Monthly Payroll &amp; Bonuses
                    <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                      Wages, OT bonuses paid via bank/cash vouchers
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#dc2626",
                    }}
                  >
                    -{formatMoney(metrics.totalSalariesDisbursed)}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 0", color: "#dc2626" }}>
                    - Estimated Inventory Parts Cost (COGS)
                    <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                      Cost price of spare parts and components consumed
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 0",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#dc2626",
                    }}
                  >
                    -{formatMoney(metrics.estimatedPartsCost)}
                  </td>
                </tr>

                <tr
                  style={{
                    background: metrics.netProfit >= 0 ? "#f0fdf4" : "#fef2f2",
                    borderTop: "2px solid #cbd5e1",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 8px",
                      fontWeight: 800,
                      color: metrics.netProfit >= 0 ? "#15803d" : "#dc2626",
                      fontSize: "13px",
                    }}
                  >
                    Net Estimated Operating Profit
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      textAlign: "right",
                      fontWeight: 900,
                      color: metrics.netProfit >= 0 ? "#15803d" : "#dc2626",
                      fontSize: "14px",
                    }}
                  >
                    {formatMoney(metrics.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Quick summary cards row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                  PAID INVOICES
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#16a34a",
                    marginTop: "2px",
                  }}
                >
                  {formatMoney(metrics.paidAmount)}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {metrics.paidCount} invoice(s)
                </div>
              </div>

              <div
                style={{
                  padding: "10px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                  PENDING COLLECTION
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ea580c",
                    marginTop: "2px",
                  }}
                >
                  {formatMoney(metrics.pendingAmount)}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {metrics.pendingCount} unpaid invoice(s)
                </div>
              </div>

              <div
                style={{
                  padding: "10px",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                  OPERATING MARGIN
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: metrics.profitMargin >= 0 ? "#16a34a" : "#dc2626",
                    marginTop: "2px",
                  }}
                >
                  {metrics.profitMargin.toFixed(1)}%
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  Efficiency ratio
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Right: Work Order Status & Quotation Pipeline */}
        <article className="report-card">
          <header>
            <div>
              <h2>Job Operations &amp; Quotations Funnel</h2>
              <p>Work order turnaround, quotation approvals &amp; pipeline value</p>
            </div>
          </header>

          <div style={{ padding: "14px 16px" }}>
            {/* Work Orders Status Bars */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#334155",
                    textTransform: "uppercase",
                  }}
                >
                  Work Order Breakdown ({metrics.totalWOs} Total)
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#16a34a",
                  }}
                >
                  {metrics.completionRate}% Done
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      marginBottom: "3px",
                    }}
                  >
                    <span>Completed &amp; Released</span>
                    <strong>{metrics.completedWOs}</strong>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#16a34a",
                        width: `${
                          metrics.totalWOs
                            ? (metrics.completedWOs / metrics.totalWOs) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      marginBottom: "3px",
                    }}
                  >
                    <span>In Progress in Workshop</span>
                    <strong>{metrics.inProgressWOs}</strong>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#2563eb",
                        width: `${
                          metrics.totalWOs
                            ? (metrics.inProgressWOs / metrics.totalWOs) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      marginBottom: "3px",
                    }}
                  >
                    <span>Awaiting Spare Parts</span>
                    <strong>{metrics.awaitingPartsWOs}</strong>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#f59e0b",
                        width: `${
                          metrics.totalWOs
                            ? (metrics.awaitingPartsWOs / metrics.totalWOs) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      marginBottom: "3px",
                    }}
                  >
                    <span>Ready for Delivery</span>
                    <strong>{metrics.readyWOs}</strong>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      background: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#8b5cf6",
                        width: `${
                          metrics.totalWOs
                            ? (metrics.readyWOs / metrics.totalWOs) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quotations Pipeline Box */}
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Quotations Pipeline &amp; Conversion
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    padding: "8px 4px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Generated</div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {metrics.totalQuotes}
                  </div>
                </div>

                <div
                  style={{
                    background: "#f0fdf4",
                    padding: "8px 4px",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#16a34a" }}>Approved</div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#16a34a",
                    }}
                  >
                    {metrics.approvedQuotes}
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff7ed",
                    padding: "8px 4px",
                    borderRadius: "6px",
                    border: "1px solid #fed7aa",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#ea580c" }}>Pending</div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ea580c",
                    }}
                  >
                    {metrics.pendingQuotes}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e2e8f0",
                  fontSize: "11px",
                }}
              >
                <span>
                  Approval Rate: <strong>{metrics.quoteConversionRate}%</strong>
                </span>
                <span>
                  Pipeline: <strong>{formatMoney(metrics.quotationPipeline)}</strong>
                </span>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* LOWER SECTION 2: TRANSACTIONS & MECHANIC PRODUCTIVITY                    */}
      {/* ========================================================================= */}
      <section className="reports-lower-grid">
        {/* Left: Invoices / Billing Log in Period */}
        <article className="report-card">
          <header>
            <div>
              <h2>Invoices &amp; Revenue Transactions</h2>
              <p>
                {filteredInvoices.length} transaction(s) recorded in{" "}
                {getFilterLabel()}
              </p>
            </div>
            <FileText size={18} />
          </header>

          <div className="report-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Service / Items</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 15).map((inv) => (
                  <tr key={inv.id || inv.invoiceId}>
                    <td style={{ fontWeight: 700 }}>{inv.id || inv.invoiceId}</td>
                    <td>{inv.customer || "Direct Customer"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inv.service || (inv.type === "Parts" ? "Parts (POS)" : "General Service")}
                      </span>
                    </td>
                    <td>{inv.date || "Today"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          background:
                            inv.status === "Paid"
                              ? "#dcfce7"
                              : inv.status === "Pending"
                              ? "#ffedd5"
                              : "#f1f5f9",
                          color:
                            inv.status === "Paid"
                              ? "#15803d"
                              : inv.status === "Pending"
                              ? "#c2410c"
                              : "#475569",
                        }}
                      >
                        {inv.status || "Paid"}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {formatMoney(inv.amount || inv.total || 0)}
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "#888",
                      }}
                    >
                      No billing transactions found for {getFilterLabel()}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right: Technician Productivity & Salary Audit */}
        <article className="report-card">
          <header>
            <div>
              <h2>Technicians &amp; Payroll Summary</h2>
              <p>Staff performance, jobs completed &amp; salary disbursed</p>
            </div>
            <Users size={18} />
          </header>

          <div className="report-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Role</th>
                  <th>Jobs (Period)</th>
                  <th>Salary Disbursed</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {mechanicRows.map((m) => (
                  <tr key={m.id || m.name}>
                    <td>
                      <strong>{m.name}</strong>
                    </td>
                    <td style={{ color: "#64748b" }}>{m.role}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.completedInPeriod > 0 ? "#15803d" : "#64748b",
                        }}
                      >
                        {m.completedInPeriod} completed
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: m.salaryDisbursed > 0 ? "#0f172a" : "#94a3b8",
                        }}
                      >
                        {m.salaryDisbursed > 0
                          ? formatMoney(m.salaryDisbursed)
                          : "QAR 0.00"}
                      </span>
                    </td>
                    <td style={{ color: "#eab308", fontWeight: 700 }}>
                      ★ {m.rating.toFixed(1)}
                    </td>
                  </tr>
                ))}

                {mechanicRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "#888",
                      }}
                    >
                      No mechanics recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* PRINT-ONLY OFFICIAL SIGNATURE AUDIT FOOTER                                */}
      {/* ========================================================================= */}
      <div
        className="reports-print-footer"
        style={{
          display: "none",
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "1px solid #cbd5e1",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "20px",
            textAlign: "center",
            fontSize: "11px",
            color: "#334155",
          }}
        >
          <div>
            <div style={{ height: "40px", borderBottom: "1px dashed #94a3b8" }} />
            <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
              Workshop General Supervisor
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "9.5px", color: "#64748b" }}>
              Signature &amp; Verification
            </p>
          </div>

          <div>
            <div style={{ height: "40px", borderBottom: "1px dashed #94a3b8" }} />
            <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
              Accounts &amp; Financial Officer
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "9.5px", color: "#64748b" }}>
              Stamp &amp; Approval
            </p>
          </div>

          <div>
            <div style={{ height: "40px", borderBottom: "1px dashed #94a3b8" }} />
            <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
              Managing Director
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "9.5px", color: "#64748b" }}>
              Official Garage Stamp
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Reports;
