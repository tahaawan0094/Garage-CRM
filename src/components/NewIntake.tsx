import { useEffect, useRef, useState } from "react";
import {
  workOrdersApi,
  quotationsApi,
  invoicesApi,
  customersApi,
  vehiclesApi,
  partsApi,
} from "../lib/api";
import {
  getNextWorkOrderId,
  getNextInvoiceId,
  commitWorkOrderId,
  commitInvoiceId,
} from "../lib/sequence";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CarFront,
  ChevronDown,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  MoreHorizontal,
  Printer,
  Save,
  Search,
  Snowflake,
  Activity,
  Plus,
  Trash2,
  ShoppingCart,
  KeyRound,
  Droplets,
  Hammer,
  Disc3,
  SlidersHorizontal,
  CircleHelp,
  BatteryCharging,
  ScanLine,
  Settings2,
  Check,
  XCircle,
  type LucideIcon,
  UserRound,
  Wrench,
} from "lucide-react";

type IntakeFormData = {
  workOrder: string;
  date: string;
  advisor: string;
  source: string;
  priority: string;
  status: string;
  expectedDate: string;
  notes: string;
  mechanic: string;
  estimatedDate: string;
};

type CustomerFormData = {
  name: string;
  mobile: string;
  phone: string;
  email: string;
  type: string;
  idNumber: string;
  address: string;
  notes: string;
};

type VehicleFormData = {
  carName: string;
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  color: string;
  chassisNumber: string;
  engineNumber: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  vehicleType: string;
  bodyType: string;
  registrationExpiry: string;
  insuranceExpiry: string;
  nextService: string;
  notes: string;
};

type ExternalPart = {
  id: number;
  name: string;
  supplier?: string;
  originalPrice: number;
  commission: number;
};

type LabourCharge = {
  id: number;
  service: string;
  mechanic: string;
  amount: number;
  hours?: number;
  rate?: number;
};

type AdditionalCharge = {
  id: number;
  name: string;
  amount: number;
};

type QuotationTab = "external" | "labour" | "additional";
type QuotationStatus = "Pending Approval" | "Approved" | "Rejected" | "Pending";
type IntakeStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type CustomerMode = "new" | "existing";
type VehicleMode = "new" | "existing";
type RepairStatus = "In Progress" | "Completed";
type PaymentRecord = {
  id: number;
  date: string;
  amount: number;
  method: string;
  reference: string;
};

const getInitialForm = (): IntakeFormData => ({
  workOrder: getNextWorkOrderId(),
  date: "2025-04-14",
  advisor: "",
  source: "Walk-in",
  priority: "Normal",
  status: "In Progress",
  expectedDate: "",
  notes: "",
  mechanic: "",
  estimatedDate: "",
});

const initialCustomer: CustomerFormData = {
  name: "",
  mobile: "",
  phone: "",
  email: "",
  type: "Individual",
  idNumber: "",
  address: "",
  notes: "",
};

const initialVehicle: VehicleFormData = {
  carName: "",
  plateNumber: "",
  make: "",
  model: "",
  year: "",
  color: "",
  chassisNumber: "",
  engineNumber: "",
  mileage: "",
  fuelType: "Petrol",
  transmission: "Automatic",
  vehicleType: "Sedan",
  bodyType: "",
  registrationExpiry: "",
  insuranceExpiry: "",
  nextService: "",
  notes: "",
};

const initialComplaint = "";
const commonComplaints = [
  "Brake noise",
  "AC not cooling",
  "AC weak",
  "Engine noise",
  "Oil leakage",
  "Gear issue",
  "Steering issue",
  "Battery issue",
  "Electrical issue",
  "Suspension noise",
  "Check engine light",
  "Other issue",
];
const requestedServices: { name: string; icon: LucideIcon }[] = [
  { name: "Brake Service", icon: Disc3 },
  { name: "AC Service", icon: Snowflake },
  { name: "Engine Service", icon: Activity },
  { name: "Oil Change", icon: Droplets },
  { name: "General Checkup", icon: ScanLine },
  { name: "Transmission", icon: Settings2 },
  { name: "Suspension", icon: CarFront },
  { name: "Electrical", icon: BatteryCharging },
  { name: "Body Repair", icon: Hammer },
  { name: "Tyre Change", icon: Disc3 },
  { name: "Wheel Alignment", icon: SlidersHorizontal },
  { name: "Other Service", icon: CircleHelp },
];
const initialSelectedServices: string[] = [];
const initialExternalParts: ExternalPart[] = [];
const initialLabourCharges: LabourCharge[] = [];
const initialQuotationDate = "2025-04-14";
const initialQuotationValidUntil = "2025-04-21";
const initialInvoiceDate = "2025-04-14";
const initialPayments: PaymentRecord[] = [];
const serviceOptions = [
  "Brake Service",
  "AC Service",
  "Engine Service",
  "Oil Change",
  "General Service",
  "Transmission",
  "Suspension",
  "Electrical",
  "Body Repair",
  "Tyre Change",
  "Wheel Alignment",
  "Other Service",
];


const customerHistory: Record<string, { vehicles: string; workOrders: string; lastVisit: string; spent: string }> = {};

const vehicleHistory: Record<string, { workOrders: string; lastService: string; spent: string; nextService: string }> = {};

const draftFields: (keyof IntakeFormData)[] = [
  "workOrder",
  "date",
  "advisor",
  "source",
  "priority",
  "status",
  "expectedDate",
  "notes",
  "mechanic",
  "estimatedDate",
];

const customerFields: (keyof CustomerFormData)[] = [
  "name",
  "mobile",
  "phone",
  "email",
  "type",
  "idNumber",
  "address",
  "notes",
];

const vehicleFields: (keyof VehicleFormData)[] = [
  "carName",
  "plateNumber",
  "make",
  "model",
  "year",
  "color",
  "chassisNumber",
  "engineNumber",
  "mileage",
  "fuelType",
  "transmission",
  "vehicleType",
  "bodyType",
  "registrationExpiry",
  "insuranceExpiry",
  "nextService",
  "notes",
];

const documentTypes = ["Work Order", "Quotation", "Invoice", "Gate Pass"] as const;
type DocumentType = (typeof documentTypes)[number];

function isIntakeFormData(value: unknown): value is IntakeFormData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return draftFields.every((field) => typeof record[field] === "string");
}

function isCustomerFormData(value: unknown): value is CustomerFormData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return customerFields.every((field) => typeof record[field] === "string");
}

function isVehicleFormData(value: unknown): value is VehicleFormData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return vehicleFields.every((field) => typeof record[field] === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isExternalParts(value: unknown): value is ExternalPart[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null &&
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.supplier === "string" &&
    typeof item.originalPrice === "number" &&
    typeof item.commission === "number",
  );
}

function isLabourCharges(value: unknown): value is LabourCharge[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null &&
    typeof item.id === "number" &&
    typeof item.service === "string" &&
    typeof item.mechanic === "string" &&
    typeof item.amount === "number",
  );
}

function isAdditionalCharges(value: unknown): value is AdditionalCharge[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null &&
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.amount === "number",
  );
}

function isPaymentRecords(value: unknown): value is PaymentRecord[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" && item !== null &&
    typeof item.id === "number" &&
    typeof item.date === "string" &&
    typeof item.amount === "number" &&
    typeof item.method === "string" &&
    typeof item.reference === "string",
  );
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : value;
}

function parseDateInput(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yearValue}-${monthValue.padStart(2, "0")}-${dayValue.padStart(2, "0")}`;
}

function IntakeDateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [draftValue, setDraftValue] = useState(formatDate(value) === "—" ? "" : formatDate(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftValue(value ? formatDate(value) : "");
  }, [value]);

  const parsedValue = parseDateInput(draftValue);
  const invalid = draftValue !== "" && parsedValue === null;

  return (
    <span className={`intake-date-control${invalid ? " is-invalid" : ""}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="dd/mm/yyyy"
        value={draftValue}
        aria-label={`${label} (DD/MM/YYYY)`}
        aria-invalid={invalid}
        title={invalid ? "Enter a valid date in DD/MM/YYYY format." : undefined}
        onChange={(event) => {
          const typedValue = event.target.value;
          const pastedDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(typedValue);
          const digits = typedValue.replace(/\D/g, "").slice(0, 8);
          const nextValue = pastedDate
            ? `${pastedDate[1].padStart(2, "0")}/${pastedDate[2].padStart(2, "0")}/${pastedDate[3]}`
            : digits.length > 4
              ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
              : digits.length > 2
                ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                : digits;
          setDraftValue(nextValue);
          if (!nextValue) {
            onChange("");
            return;
          }

          const parsedDate = parseDateInput(nextValue);
          if (parsedDate) {
            onChange(parsedDate);
          }
        }}
        onBlur={() => {
          if (invalid) {
            setDraftValue(value ? formatDate(value) : "");
          }
        }}
      />
      <button
        type="button"
        aria-label={`Choose ${label.toLowerCase()} from calendar`}
        onClick={() => pickerRef.current?.showPicker()}
      >
        <CalendarDays size={16} />
      </button>
      <input
        ref={pickerRef}
        className="intake-native-date-picker"
        type="date"
        value={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}

function NewIntake(props: {
  notify: (message: string) => void;
  isWorkOrders?: boolean;
  onOpenWorkOrders?: () => void;
  startAtQuotation?: boolean;
  onQuotationStarted?: () => void;
}) {
  const {
    notify,
    isWorkOrders = false,
    startAtQuotation = false,
    onQuotationStarted = () => undefined,
  } = props;
  const [form, setForm] = useState<IntakeFormData>(getInitialForm);
  const [customer, setCustomer] = useState<CustomerFormData>(initialCustomer);
  const [vehicle, setVehicle] = useState<VehicleFormData>(initialVehicle);
  const [complaint, setComplaint] = useState(initialComplaint);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState(initialSelectedServices);
  const [externalParts, setExternalParts] = useState(initialExternalParts);
  const [labourCharges, setLabourCharges] = useState(initialLabourCharges);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [quotationTab, setQuotationTab] = useState<QuotationTab>("external");
  const [partName, setPartName] = useState("");
  const [partOriginalPrice, setPartOriginalPrice] = useState("");
  const [partCommission, setPartCommission] = useState("");
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [isOtherPart, setIsOtherPart] = useState(false);
  const [customPartName, setCustomPartName] = useState("");
  const [labourService, setLabourService] = useState("");
  const [labourMechanic, setLabourMechanic] = useState("M. Khan");
  const [labourAmount, setLabourAmount] = useState("");
  const [additionalName, setAdditionalName] = useState("");
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [quotationDiscount, setQuotationDiscount] = useState(0);
  const [quotationNotes, setQuotationNotes] = useState("");
  const [quotationDate, setQuotationDate] = useState(initialQuotationDate);
  const [quotationValidUntil, setQuotationValidUntil] = useState(initialQuotationValidUntil);
  const [quotationStatus, setQuotationStatus] = useState<QuotationStatus>("Pending Approval");
  const [repairDate, setRepairDate] = useState(initialQuotationDate);
  const [completionDate, setCompletionDate] = useState("");
  const [repairStatus, setRepairStatus] = useState<RepairStatus>("In Progress");
  const [vehicleReady, setVehicleReady] = useState("No - In Progress");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => getNextInvoiceId());
  const [invoiceDate, setInvoiceDate] = useState(initialInvoiceDate);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [invoiceNotes, setInvoiceNotes] = useState("Thank you for choosing our service. Please contact us for any further assistance.");
  const [invoiceItemsTab, setInvoiceItemsTab] = useState<"parts" | "labour">("parts");
  const [invoicePreviewTab, setInvoicePreviewTab] = useState<"Invoice Preview" | "Payment">("Invoice Preview");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [paymentDate, setPaymentDate] = useState(initialInvoiceDate);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [customerMode, setCustomerMode] = useState<CustomerMode>("new");
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("new");
  const [step, setStep] = useState<IntakeStep>(1);
  const [documentType, setDocumentType] = useState<DocumentType>("Quotation");
  const [moreOpen, setMoreOpen] = useState(false);
  const previewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    partsApi.getAll({ limit: 100 }).then((res) => {
      if (res.data) {
        setInventoryParts(res.data);
      }
    }).catch(() => {});

    workOrdersApi.getAll({ limit: 100 }).then((res) => {
      if (res.data && res.data.length > 0) {
        setForm((current) => {
          if (!current.workOrder) {
            return { ...current, workOrder: getNextWorkOrderId(res.data) };
          }
          return current;
        });
      }
    }).catch(() => {});

    invoicesApi.getAll({ limit: 100 }).then((res) => {
      if (res.data && res.data.length > 0) {
        setInvoiceNumber((current) => {
          if (!current) {
            return getNextInvoiceId(res.data);
          }
          return current;
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem("garage-intake-draft");
      if (!savedDraft) {
        return;
      }

      const parsedDraft: unknown = JSON.parse(savedDraft);
      const ensureWorkOrder = (f: IntakeFormData) => (f && f.workOrder ? f : { ...f, workOrder: getNextWorkOrderId() });
      if (
        typeof parsedDraft === "object" &&
        parsedDraft !== null &&
        "form" in parsedDraft &&
        "customer" in parsedDraft &&
        "vehicle" in parsedDraft &&
        "complaint" in parsedDraft &&
        "selectedComplaints" in parsedDraft &&
        "selectedServices" in parsedDraft &&
        "externalParts" in parsedDraft &&
        "labourCharges" in parsedDraft &&
        "additionalCharges" in parsedDraft &&
        "quotationDiscount" in parsedDraft &&
        "quotationNotes" in parsedDraft &&
        "quotationDate" in parsedDraft &&
        "quotationValidUntil" in parsedDraft &&
        "quotationStatus" in parsedDraft &&
        "repairDate" in parsedDraft &&
        "completionDate" in parsedDraft &&
        "repairStatus" in parsedDraft &&
        "vehicleReady" in parsedDraft &&
        "technicianNotes" in parsedDraft &&
        "step" in parsedDraft &&
        "customerMode" in parsedDraft &&
        "vehicleMode" in parsedDraft &&
        isIntakeFormData(parsedDraft.form) &&
        isCustomerFormData(parsedDraft.customer) &&
        isVehicleFormData(parsedDraft.vehicle) &&
        typeof parsedDraft.complaint === "string" &&
        isStringArray(parsedDraft.selectedComplaints) &&
        isStringArray(parsedDraft.selectedServices) &&
        isExternalParts(parsedDraft.externalParts) &&
        isLabourCharges(parsedDraft.labourCharges) &&
        isAdditionalCharges(parsedDraft.additionalCharges) &&
        typeof parsedDraft.quotationDiscount === "number" &&
        typeof parsedDraft.quotationNotes === "string" &&
        typeof parsedDraft.quotationDate === "string" &&
        typeof parsedDraft.quotationValidUntil === "string" &&
        (parsedDraft.quotationStatus === "Pending Approval" || parsedDraft.quotationStatus === "Approved" || parsedDraft.quotationStatus === "Rejected" || parsedDraft.quotationStatus === "Pending") &&
        typeof parsedDraft.repairDate === "string" &&
        typeof parsedDraft.completionDate === "string" &&
        (parsedDraft.repairStatus === "In Progress" || parsedDraft.repairStatus === "Completed") &&
        typeof parsedDraft.vehicleReady === "string" &&
        typeof parsedDraft.technicianNotes === "string" &&
        (parsedDraft.step === 1 || parsedDraft.step === 2 || parsedDraft.step === 3 || parsedDraft.step === 4 || parsedDraft.step === 5 || parsedDraft.step === 6 || parsedDraft.step === 7 || parsedDraft.step === 8 || parsedDraft.step === 9) &&
        (parsedDraft.customerMode === "new" || parsedDraft.customerMode === "existing") &&
        (parsedDraft.vehicleMode === "new" || parsedDraft.vehicleMode === "existing")
      ) {
        setForm(ensureWorkOrder(parsedDraft.form));
        setCustomer(parsedDraft.customer);
        setVehicle(parsedDraft.vehicle);
        setComplaint(parsedDraft.complaint);
        setSelectedComplaints(parsedDraft.selectedComplaints);
        setSelectedServices(parsedDraft.selectedServices);
        setExternalParts(parsedDraft.externalParts);
        setLabourCharges(parsedDraft.labourCharges);
        setAdditionalCharges(parsedDraft.additionalCharges);
        setQuotationDiscount(parsedDraft.quotationDiscount);
        setQuotationNotes(parsedDraft.quotationNotes);
        setQuotationDate(parsedDraft.quotationDate);
        setQuotationValidUntil(parsedDraft.quotationValidUntil);
        setQuotationStatus(parsedDraft.quotationStatus);
        setRepairDate(parsedDraft.repairDate);
        setCompletionDate(parsedDraft.completionDate);
        setRepairStatus(parsedDraft.repairStatus);
        setVehicleReady(parsedDraft.vehicleReady);
        setTechnicianNotes(parsedDraft.technicianNotes);
        if ("invoiceNumber" in parsedDraft && typeof parsedDraft.invoiceNumber === "string" && parsedDraft.invoiceNumber) {
          setInvoiceNumber(parsedDraft.invoiceNumber);
        } else {
          setInvoiceNumber(getNextInvoiceId());
        }
        setInvoiceDate("invoiceDate" in parsedDraft && typeof parsedDraft.invoiceDate === "string" ? parsedDraft.invoiceDate : initialInvoiceDate);
        setInvoiceDueDate("invoiceDueDate" in parsedDraft && typeof parsedDraft.invoiceDueDate === "string" ? parsedDraft.invoiceDueDate : "");
        setPaymentTerms("paymentTerms" in parsedDraft && typeof parsedDraft.paymentTerms === "string" ? parsedDraft.paymentTerms : "Due on Receipt");
        setInvoiceNotes("invoiceNotes" in parsedDraft && typeof parsedDraft.invoiceNotes === "string" ? parsedDraft.invoiceNotes : "Thank you for choosing our service. Please contact us for any further assistance.");
        if ("invoiceItemsTab" in parsedDraft && parsedDraft.invoiceItemsTab === "parts" || "invoiceItemsTab" in parsedDraft && parsedDraft.invoiceItemsTab === "labour") {
          setInvoiceItemsTab(parsedDraft.invoiceItemsTab);
        }
        if ("invoicePreviewTab" in parsedDraft && parsedDraft.invoicePreviewTab === "Invoice Preview" || "invoicePreviewTab" in parsedDraft && parsedDraft.invoicePreviewTab === "Payment") {
          setInvoicePreviewTab(parsedDraft.invoicePreviewTab);
        }
        if ("paymentMethod" in parsedDraft && typeof parsedDraft.paymentMethod === "string") {
          setPaymentMethod(parsedDraft.paymentMethod);
        }
        if ("payments" in parsedDraft && isPaymentRecords(parsedDraft.payments)) {
          setPayments(parsedDraft.payments);
        }
        setPaymentDate("paymentDate" in parsedDraft && typeof parsedDraft.paymentDate === "string" ? parsedDraft.paymentDate : initialInvoiceDate);
        setPaymentAmount("paymentAmount" in parsedDraft && typeof parsedDraft.paymentAmount === "string" ? parsedDraft.paymentAmount : "");
        setPaymentReference("paymentReference" in parsedDraft && typeof parsedDraft.paymentReference === "string" ? parsedDraft.paymentReference : "");
        setStep(parsedDraft.step);
        setCustomerMode(parsedDraft.customerMode);
        setVehicleMode(parsedDraft.vehicleMode);
      } else if (
        typeof parsedDraft === "object" &&
        parsedDraft !== null &&
        "form" in parsedDraft &&
        "customer" in parsedDraft &&
        "vehicle" in parsedDraft &&
        "complaint" in parsedDraft &&
        "selectedComplaints" in parsedDraft &&
        "selectedServices" in parsedDraft &&
        "externalParts" in parsedDraft &&
        "labourCharges" in parsedDraft &&
        "additionalCharges" in parsedDraft &&
        "quotationDiscount" in parsedDraft &&
        "quotationNotes" in parsedDraft &&
        "step" in parsedDraft &&
        "customerMode" in parsedDraft &&
        "vehicleMode" in parsedDraft &&
        isIntakeFormData(parsedDraft.form) &&
        isCustomerFormData(parsedDraft.customer) &&
        isVehicleFormData(parsedDraft.vehicle) &&
        typeof parsedDraft.complaint === "string" &&
        isStringArray(parsedDraft.selectedComplaints) &&
        isStringArray(parsedDraft.selectedServices) &&
        isExternalParts(parsedDraft.externalParts) &&
        isLabourCharges(parsedDraft.labourCharges) &&
        isAdditionalCharges(parsedDraft.additionalCharges) &&
        typeof parsedDraft.quotationDiscount === "number" &&
        typeof parsedDraft.quotationNotes === "string" &&
        (parsedDraft.step === 1 || parsedDraft.step === 2 || parsedDraft.step === 3 || parsedDraft.step === 4 || parsedDraft.step === 5) &&
        (parsedDraft.customerMode === "new" || parsedDraft.customerMode === "existing") &&
        (parsedDraft.vehicleMode === "new" || parsedDraft.vehicleMode === "existing")
      ) {
        setForm(parsedDraft.form);
        setCustomer(parsedDraft.customer);
        setVehicle(parsedDraft.vehicle);
        setComplaint(parsedDraft.complaint);
        setSelectedComplaints(parsedDraft.selectedComplaints);
        setSelectedServices(parsedDraft.selectedServices);
        setExternalParts(parsedDraft.externalParts);
        setLabourCharges(parsedDraft.labourCharges);
        setAdditionalCharges(parsedDraft.additionalCharges);
        setQuotationDiscount(parsedDraft.quotationDiscount);
        setQuotationNotes(parsedDraft.quotationNotes);
        setQuotationDate(initialQuotationDate);
        setQuotationValidUntil(initialQuotationValidUntil);
        setQuotationStatus("Pending Approval");
        setStep(parsedDraft.step);
        setCustomerMode(parsedDraft.customerMode);
        setVehicleMode(parsedDraft.vehicleMode);
      } else if (
        typeof parsedDraft === "object" &&
        parsedDraft !== null &&
        "form" in parsedDraft &&
        "customer" in parsedDraft &&
        "vehicle" in parsedDraft &&
        "complaint" in parsedDraft &&
        "selectedComplaints" in parsedDraft &&
        "selectedServices" in parsedDraft &&
        "step" in parsedDraft &&
        "customerMode" in parsedDraft &&
        "vehicleMode" in parsedDraft &&
        isIntakeFormData(parsedDraft.form) &&
        isCustomerFormData(parsedDraft.customer) &&
        isVehicleFormData(parsedDraft.vehicle) &&
        typeof parsedDraft.complaint === "string" &&
        isStringArray(parsedDraft.selectedComplaints) &&
        isStringArray(parsedDraft.selectedServices) &&
        (parsedDraft.step === 1 || parsedDraft.step === 2 || parsedDraft.step === 3 || parsedDraft.step === 4) &&
        (parsedDraft.customerMode === "new" || parsedDraft.customerMode === "existing") &&
        (parsedDraft.vehicleMode === "new" || parsedDraft.vehicleMode === "existing")
      ) {
        setForm(parsedDraft.form);
        setCustomer(parsedDraft.customer);
        setVehicle(parsedDraft.vehicle);
        setComplaint(parsedDraft.complaint);
        setSelectedComplaints(parsedDraft.selectedComplaints);
        setSelectedServices(parsedDraft.selectedServices);
        setStep(parsedDraft.step);
        setQuotationDate(initialQuotationDate);
        setQuotationValidUntil(initialQuotationValidUntil);
        setQuotationStatus("Pending Approval");
        setCustomerMode(parsedDraft.customerMode);
        setQuotationDate(initialQuotationDate);
        setQuotationValidUntil(initialQuotationValidUntil);
        setQuotationStatus("Pending Approval");
        setVehicleMode(parsedDraft.vehicleMode);
      } else if (
        typeof parsedDraft === "object" &&
        parsedDraft !== null &&
        "form" in parsedDraft &&
        "customer" in parsedDraft &&
        "vehicle" in parsedDraft &&
        "step" in parsedDraft &&
        "customerMode" in parsedDraft &&
        "vehicleMode" in parsedDraft &&
        isIntakeFormData(parsedDraft.form) &&
        isCustomerFormData(parsedDraft.customer) &&
        isVehicleFormData(parsedDraft.vehicle) &&
        (parsedDraft.step === 1 || parsedDraft.step === 2 || parsedDraft.step === 3) &&
        (parsedDraft.customerMode === "new" || parsedDraft.customerMode === "existing") &&
        (parsedDraft.vehicleMode === "new" || parsedDraft.vehicleMode === "existing")
      ) {
        setForm(parsedDraft.form);
        setCustomer(parsedDraft.customer);
        setVehicle(parsedDraft.vehicle);
        setStep(parsedDraft.step);
        setCustomerMode(parsedDraft.customerMode);
        setVehicleMode(parsedDraft.vehicleMode);
      } else if (
        typeof parsedDraft === "object" &&
        parsedDraft !== null &&
        "form" in parsedDraft &&
        "customer" in parsedDraft &&
        "step" in parsedDraft &&
        "customerMode" in parsedDraft &&
        isIntakeFormData(parsedDraft.form) &&
        isCustomerFormData(parsedDraft.customer) &&
        (parsedDraft.step === 1 || parsedDraft.step === 2) &&
        (parsedDraft.customerMode === "new" || parsedDraft.customerMode === "existing")
      ) {
        setForm(parsedDraft.form);
        setCustomer(parsedDraft.customer);
        setStep(parsedDraft.step);
        setCustomerMode(parsedDraft.customerMode);
      } else if (isIntakeFormData(parsedDraft)) {
        setForm(parsedDraft);
      } else {
        notify("The saved intake draft is invalid and was not loaded.");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown storage error";
      notify(`Could not load the saved intake draft: ${detail}`);
    }
  }, [notify]);

  useEffect(() => {
    if (isWorkOrders) {
      setStep(7);
    }
  }, [isWorkOrders]);

  useEffect(() => {
    if (!startAtQuotation) return;
    setStep(5);
    setQuotationTab("external");
    onQuotationStarted();
  }, [onQuotationStarted, startAtQuotation]);

  const update = (field: keyof IntakeFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCustomer = (field: keyof CustomerFormData, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  const updateVehicle = (field: keyof VehicleFormData, value: string) => {
    setVehicle((current) => ({ ...current, [field]: value }));
  };

  const toggleComplaint = (item: string) => {
    const isSelected = selectedComplaints.includes(item);
    setSelectedComplaints((current) =>
      isSelected ? current.filter((selected) => selected !== item) : [...current, item],
    );
    setComplaint((current) => {
      const lines = current.split("\n").filter((line) => line !== item);
      return isSelected ? lines.join("\n") : [...lines, item].filter(Boolean).join("\n");
    });
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((selected) => selected !== service)
        : [...current, service],
    );
  };



  const saveDraft = () => {
    try {
      window.localStorage.setItem(
        "garage-intake-draft",
        JSON.stringify({
          form,
          customer,
          vehicle,
          complaint,
          selectedComplaints,
          selectedServices,
          externalParts,
          labourCharges,
          additionalCharges,
          quotationDiscount,
          quotationNotes,
          quotationDate,
          quotationValidUntil,
          quotationStatus,
          repairDate,
          completionDate,
          repairStatus,
          vehicleReady,
          technicianNotes,
          invoiceDate,
          invoiceDueDate,
          paymentTerms,
          invoiceNotes,
          invoiceItemsTab,
          invoicePreviewTab,
          paymentMethod,
          payments,
          paymentDate,
          paymentAmount,
          paymentReference,
          customerMode,
          vehicleMode,
          invoiceNumber,
          step,
        }),
      );
      notify("Intake draft saved on this device.");

      // Sync work order to MongoDB Atlas
      workOrdersApi.create({
        workOrderId: form.workOrder,
        customer: customer.name || 'Walk-in Customer',
        customerPhone: customer.mobile || customer.phone || '',
        vehicle: `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
        plate: vehicle.plateNumber || 'TBD',
        year: vehicle.year || '2024',
        service: selectedServices[0] || 'General Service',
        detail: selectedComplaints.join(', ') || complaint || 'Service',
        mechanic: form.mechanic || 'Ali Hassan',
        status: repairStatus || form.status || 'In Progress',
        total: quotationTotal || 0,
      }).catch(err => console.warn("Work order sync error:", err));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown storage error";
      notify(`Could not save the intake draft: ${detail}`);
    }
  };

  const resetForm = (showNotice = true) => {
    setForm(getInitialForm());
    setInvoiceNumber(getNextInvoiceId());
    setCustomer(initialCustomer);
    setVehicle(initialVehicle);
    setComplaint(initialComplaint);
    setSelectedComplaints([]);
    setComplaintSearch("");
    setSelectedServices(initialSelectedServices);
    setExternalParts(initialExternalParts);
    setLabourCharges(initialLabourCharges);
    setAdditionalCharges([]);
    setQuotationDiscount(0);
    setQuotationNotes("");
    setQuotationDate(initialQuotationDate);
    setQuotationValidUntil(initialQuotationValidUntil);
    setQuotationStatus("Pending Approval");
    setRepairDate(initialQuotationDate);
    setCompletionDate("");
    setRepairStatus("In Progress");
    setVehicleReady("No - In Progress");
    setTechnicianNotes("");
    setInvoiceDate(initialInvoiceDate);
    setInvoiceDueDate("");
    setPaymentTerms("Due on Receipt");
    setInvoiceNotes("Thank you for choosing our service. Please contact us for any further assistance.");
    setInvoiceItemsTab("parts");
    setInvoicePreviewTab("Invoice Preview");
    setPaymentMethod("Cash");
    setPayments(initialPayments);
    setPaymentDate(initialInvoiceDate);
    setPaymentAmount("");
    setPaymentReference("");
    setQuotationTab("external");
    setPartName("");
    setPartOriginalPrice("");
    setPartCommission("");
    setLabourService("");
    setLabourMechanic("M. Khan");
    setLabourAmount("");
    setAdditionalName("");
    setAdditionalAmount("");
    setCustomerMode("new");
    setVehicleMode("new");
    setStep(1);
    setMoreOpen(false);
    try {
      window.localStorage.removeItem("garage-intake-draft");
      if (showNotice) {
        notify("Intake form reset successfully.");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown storage error";
      if (showNotice) {
        notify(`Form restored, but the saved draft could not be removed: ${detail}`);
      }
    }
  };

  const intakeApprovedRef = useRef(false);
  useEffect(() => {
    // Only reset if this intake was actually approved and user is now returning from Work Orders
    if (intakeApprovedRef.current && !isWorkOrders) {
      intakeApprovedRef.current = false;
      resetForm(false);
    }
  }, [isWorkOrders]);

  const focusPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    previewRef.current?.focus({ preventScroll: true });
  };

  const history = customerHistory[customer.name as keyof typeof customerHistory] ?? {
    vehicles: "0",
    workOrders: "0",
    lastVisit: "—",
    spent: "QAR 0.00",
  };

  const selectedVehicleHistory = vehicleHistory[vehicle.plateNumber as keyof typeof vehicleHistory] ?? {
    workOrders: "0",
    lastService: "—",
    spent: "QAR 0.00",
    nextService: "—",
  };
  const partsTotal = externalParts.reduce((total, part) => total + part.originalPrice + part.commission, 0);
  const labourTotal = labourCharges.reduce((total, charge) => total + charge.amount, 0);
  const additionalTotal = additionalCharges.reduce((total, charge) => total + charge.amount, 0);
  const quotationSubtotal = partsTotal + labourTotal + additionalTotal;
  const quotationTotal = Math.max(0, quotationSubtotal - Math.min(quotationDiscount, quotationSubtotal));
  const currency = (amount: number) =>
    `QAR ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const quotePreviewItems = [
    ...externalParts.map((part) => ({
      description: part.name,
      price: part.originalPrice + part.commission,
    })),
    ...labourCharges.map((charge) => ({ description: charge.service, price: charge.amount })),
    ...additionalCharges.map((charge) => ({ description: charge.name, price: charge.amount })),
  ];
  const quoteNumber = "QT-00018";
  const quoteValidityDays = (() => {
    if (!quotationDate || !quotationValidUntil) return 15;
    const start = new Date(`${quotationDate}T00:00:00Z`).getTime();
    const end = new Date(`${quotationValidUntil}T00:00:00Z`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 15;
    return Math.max(1, Math.ceil((end - start) / 86_400_000));
  })();
  const totalPaid = payments.reduce((total, payment) => total + payment.amount, 0);
  const balanceDue = Math.max(0, quotationTotal - totalPaid);
  const paymentStatus = balanceDue === 0 ? "Fully Paid" : totalPaid > 0 ? "Partially Paid" : "Unpaid";

  const addExternalPart = () => {
    const nameToUse = isOtherPart ? customPartName.trim() : partName.trim();
    const originalPrice = Number(partOriginalPrice);
    const commission = partCommission.trim() === "" ? 0 : Number(partCommission);

    if (!nameToUse) {
      notify("Please select or type a part name.");
      return;
    }
    if (!partOriginalPrice || !Number.isFinite(originalPrice) || originalPrice < 0) {
      notify("Please enter a valid part price.");
      return;
    }
    if (!Number.isFinite(commission) || commission < 0) {
      notify("Commission must be a valid positive number or 0.");
      return;
    }

    setExternalParts((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((part) => part.id)) + 1,
        name: nameToUse,
        supplier: "",
        originalPrice,
        commission: commission || 0,
      },
    ]);
    setPartName("");
    setCustomPartName("");
    setIsOtherPart(false);
    setPartOriginalPrice("");
    setPartCommission("");
  };

  const addLabourCharge = () => {
    const amount = Number(labourAmount);
    if (!labourService.trim() || !labourAmount || !Number.isFinite(amount) || amount < 0) {
      notify("Select a service and enter a valid labour amount.");
      return;
    }

    setLabourCharges((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((charge) => charge.id)) + 1,
        service: labourService,
        mechanic: labourMechanic,
        amount,
      },
    ]);
    setLabourService("");
    setLabourAmount("");
  };

  const addAdditionalCharge = () => {
    const amount = Number(additionalAmount);
    if (!additionalName.trim() || !additionalAmount || !Number.isFinite(amount) || amount < 0) {
      notify("Enter a charge description and a valid amount.");
      return;
    }

    setAdditionalCharges((current) => [
      ...current,
      { id: Math.max(0, ...current.map((charge) => charge.id)) + 1, name: additionalName.trim(), amount },
    ]);
    setAdditionalName("");
    setAdditionalAmount("");
  };

  const updateQuotationStatus = async (status: QuotationStatus) => {
    setQuotationStatus(status);
    const dbStatus = status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : "Pending";

    const quoteItems = [
      ...externalParts.map((p) => ({ name: p.name, quantity: 1, unitPrice: p.originalPrice + p.commission })),
      ...labourCharges.map((l) => ({ name: l.service, quantity: l.hours || 1, unitPrice: l.amount })),
      ...additionalCharges.map((a) => ({ name: a.name, quantity: 1, unitPrice: a.amount })),
    ];
    if (quoteItems.length === 0) {
      quoteItems.push({
        name: selectedServices[0] || "General Inspection & Service",
        quantity: 1,
        unitPrice: quotationTotal || 0,
      });
    }

    // Sync Customer to Customers tab / DB
    if (customer.name && customer.name.trim()) {
      try {
        await customersApi.create({
          name: customer.name.trim(),
          phone: customer.mobile || customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          type: customer.type || 'Individual',
          notes: customer.notes || '',
        });
      } catch (err) {
        console.warn("Customer sync error:", err);
      }
    }

    // Sync Vehicle to Vehicles tab / DB
    if (vehicle.plateNumber && vehicle.plateNumber.trim()) {
      try {
        await vehiclesApi.create({
          plate: vehicle.plateNumber.trim(),
          customer: customer.name || 'Walk-in Customer',
          phone: customer.mobile || customer.phone || '',
          model: vehicle.carName || `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
          year: vehicle.year || '2024',
          color: vehicle.color || '',
          chassisNumber: vehicle.chassisNumber || '',
          engineNumber: vehicle.engineNumber || '',
          mileage: vehicle.mileage || '0',
          fuel: vehicle.fuelType || 'Petrol',
          vehicleType: vehicle.vehicleType || 'Sedan',
          bodyType: vehicle.bodyType || '',
          registrationExpiry: vehicle.registrationExpiry || '',
          insuranceExpiry: vehicle.insuranceExpiry || '',
          notes: vehicle.notes || '',
          status: 'In Service',
        });
      } catch (err) {
        console.warn("Vehicle sync error:", err);
      }
    }

    try {
      await quotationsApi.create({
        customer: customer.name || 'Customer',
        vehicle: vehicle.carName || `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
        plate: vehicle.plateNumber || 'TBD',
        year: vehicle.year || '2024',
        service: selectedServices[0] || 'General Service',
        detail: selectedComplaints.join(', ') || complaint || 'General Service',
        amount: quotationTotal,
        status: dbStatus,
        advisor: form.advisor || 'Ali Hassan',
        date: form.date || new Date().toISOString().split('T')[0],
        items: quoteItems,
      });
    } catch (err) {
      console.warn("Quotation sync error:", err);
    }

    if (status === "Approved") {
      commitWorkOrderId(form.workOrder);
      try {
        await workOrdersApi.create({
          workOrderId: form.workOrder,
          customer: customer.name || 'Customer',
          customerPhone: customer.mobile || customer.phone || '',
          vehicle: vehicle.carName || `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
          plate: vehicle.plateNumber || 'TBD',
          year: vehicle.year || '2024',
          service: selectedServices[0] || 'General Service',
          detail: selectedComplaints.join(', ') || complaint || 'Service',
          mechanic: form.mechanic || 'Ali Hassan',
          status: 'In Progress',
          total: quotationTotal || 0,
          subtotal: quotationSubtotal || 0,
          discount: quotationDiscount || 0,
          externalParts: externalParts.map((p) => ({
            name: p.name,
            supplier: p.supplier || '',
            originalPrice: p.originalPrice || 0,
            commission: p.commission || 0,
          })),
          labourCharges: labourCharges.map((l) => ({
            service: l.service,
            mechanic: l.mechanic || 'Ali Hassan',
            amount: l.amount || 0,
            hours: l.hours || 1,
            rate: l.rate || 0,
          })),
          additionalCharges: additionalCharges.map((a) => ({
            name: a.name,
            amount: a.amount || 0,
          })),
        });
      } catch (err) {
        console.warn("Work order sync error:", err);
      }

      try {
        window.localStorage.removeItem("garage-intake-draft");
      } catch (_) {}
      resetForm(false);
      notify("Quotation approved! Synced to Customers, Vehicles, Quotations, and Work Orders.");
    } else {
      resetForm(false);
      notify(
        status === "Rejected"
          ? "Quotation rejected and saved in Quotations."
          : "Quotation saved as Pending in Quotations."
      );
    }
  };

  const completeRepair = () => {
    const completedOn = completionDate || repairDate || form.date;
    setCompletionDate(completedOn);
    setRepairStatus("Completed");
    setVehicleReady("Yes - Ready for Pickup");
    setForm((current) => ({ ...current, status: "Completed" }));
    notify("Repair marked complete. Vehicle is ready for customer handover.");

    workOrdersApi.update(form.workOrder, {
      status: 'Ready for Delivery',
    }).catch(() => {
      workOrdersApi.create({
        workOrderId: form.workOrder,
        customer: customer.name || 'Customer',
        vehicle: `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
        plate: vehicle.plateNumber || 'TBD',
        year: vehicle.year || '2024',
        service: selectedServices[0] || 'General Service',
        mechanic: form.mechanic || 'Ali Hassan',
        status: 'Ready for Delivery',
        total: quotationTotal || 0,
      }).catch(err => console.warn("Work order completion sync error:", err));
    });
  };

  const addPayment = (amountToRecord = Number(paymentAmount)) => {
    if (!Number.isFinite(amountToRecord) || amountToRecord <= 0) {
      notify("Enter a payment amount greater than zero.");
      return;
    }
    if (amountToRecord > balanceDue) {
      notify(`Payment cannot exceed the outstanding balance of ${currency(balanceDue)}.`);
      return;
    }
    setPayments((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((payment) => payment.id)) + 1,
        date: paymentDate,
        amount: amountToRecord,
        method: paymentMethod,
        reference: paymentReference.trim() || `PAY-${String(current.length + 1).padStart(3, "0")}`,
      },
    ]);
    setPaymentAmount("");
    setPaymentReference("");
    notify("Payment recorded on this device.");

    invoicesApi.create({
      invoiceId: invoiceNumber,
      customer: customer.name || 'Customer',
      phone: customer.mobile || customer.phone || '',
      email: customer.email || '',
      vehicle: `${vehicle.make} ${vehicle.model}`.trim() || 'Vehicle',
      plate: vehicle.plateNumber || 'TBD',
      year: vehicle.year || '2024',
      service: selectedServices[0] || 'General Service',
      workOrder: form.workOrder,
      amount: quotationTotal,
      status: (balanceDue - amountToRecord) <= 0 ? 'Paid' : 'Partial',
      advisor: form.advisor || 'Ali Hassan',
      paymentMethod,
    }).catch(err => console.warn("Invoice sync error:", err));
    commitInvoiceId(invoiceNumber);
  };

  const createNewInvoice = () => {
    commitInvoiceId(invoiceNumber);
    resetForm();
    setInvoiceNumber(getNextInvoiceId());
    setPayments([]);
    setStep(1);
    setDocumentType("Work Order");
    notify("A new sample work order is ready.");
  };

  return (
    <main className="intake-page">
      <div className="intake-heading">
        <div className="intake-title">
          <h1>{step === 9 ? "Payment / Balance" : step === 8 ? "Invoice" : step === 7 ? "Repair Done" : "New Intake"}</h1>
          <p>{step === 9 ? "Record payments and review the invoice balance." : step === 8 ? "Generate an invoice for completed repair work and record payment." : step === 7 ? "Manage repair completion information and update vehicle status." : "Manage garage service information and job records."}</p>
        </div>
        <div className="intake-heading-meta">
          <strong>Work Order: {form.workOrder || "—"}</strong>
          <span className={`intake-status${step === 9 || repairStatus === "Completed" ? " completed" : ""}`}>{step === 9 ? paymentStatus : step === 8 ? "Repair Completed" : step === 7 ? repairStatus : form.status}</span>
        </div>
        <div className="intake-actions">
          <button className="intake-action-button dark" onClick={saveDraft}>
            <Save size={16} />
            <span>Save Draft</span>
          </button>
          <button className="intake-action-button blue" onClick={focusPreview}>
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            className="intake-action-button outline"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <div className="intake-more">
            <button
              className="intake-action-button outline more-toggle"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <span>More</span>
              <ChevronDown size={15} />
            </button>
            {moreOpen && (
              <div className="intake-more-menu">
                <button onClick={() => resetForm()}>
                  <MoreHorizontal size={15} />
                  Restore sample values
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="intake-layout">
        <section className="intake-form-card" aria-labelledby="intake-information-title">
          {step === 1 ? (
            <>
          <div className="intake-form-section-title">
            <span>1</span>
            <ClipboardList size={19} />
            <h2 id="intake-information-title">Work Order Information</h2>
          </div>

          <div className="intake-fields">
            <label className="intake-field">
              <div className="intake-field-label-row">
                <span>Work Order No.</span>
                <span className="intake-auto-badge">AUTO</span>
              </div>
              <input
                readOnly
                value={form.workOrder}
                className="intake-input-locked"
                aria-label="Work order number (Auto-generated and locked)"
                title="Work order number is auto-generated and locked"
              />
            </label>
            <label className="intake-field">
              <span>Date</span>
              <IntakeDateField
                value={form.date}
                onChange={(value) => update("date", value)}
                label="Work order date"
              />
            </label>
            <label className="intake-field">
              <span>Service Advisor</span>
              <select
                value={form.advisor}
                onChange={(event) => update("advisor", event.target.value)}
              >
                <option>Sheikh Ahmed</option>
                <option>Ali Hassan</option>
                <option>M. Khan</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Job Source</span>
              <select
                value={form.source}
                onChange={(event) => update("source", event.target.value)}
              >
                <option>Walk-in</option>
                <option>Phone</option>
                <option>Online booking</option>
                <option>Referral</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(event) => update("priority", event.target.value)}
              >
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Job Status</span>
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
              >
                <option>In Progress</option>
                <option>Awaiting Parts</option>
                <option>Ready for Delivery</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Expected Completion Date</span>
              <IntakeDateField
                value={form.expectedDate}
                onChange={(value) => update("expectedDate", value)}
                label="Expected completion date"
              />
            </label>
          </div>

          <label className="intake-field intake-notes">
            <span>Internal Notes <small>(Optional)</small></span>
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Add internal notes..."
              rows={3}
            />
          </label>

          <div className="intake-fields intake-assignment">
            <label className="intake-field">
              <span>Assign Mechanic <small>(Optional)</small></span>
              <select
                value={form.mechanic}
                onChange={(event) => update("mechanic", event.target.value)}
              >
                <option value="">Select Mechanic</option>
                <option>Ali Hassan</option>
                <option>M. Khan</option>
                <option>Ali Shah</option>
              </select>
            </label>
            <label className="intake-field">
              <span>Estimated Completion</span>
              <IntakeDateField
                value={form.estimatedDate}
                onChange={(value) => update("estimatedDate", value)}
                label="Estimated completion date"
              />
            </label>
          </div>

          <div className="intake-form-footer">
            <button
              className="intake-action-button outline"
              onClick={() => notify("You are already on the first intake step.")}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              className="intake-action-button orange"
              onClick={() => setStep(2)}
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="intake-form-section-title">
                <span>2</span>
                <UserRound size={19} />
                <div>
                  <h2 id="intake-information-title">Customer Details</h2>
                  <p>Enter customer information for this vehicle service and quotation.</p>
                </div>
              </div>

              <div className="intake-customer-fields">
                <label className="intake-field">
                  <span>Customer Name <b>*</b></span>
                  <input
                    value={customer.name}
                    onChange={(event) => updateCustomer("name", event.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </label>
                <label className="intake-field">
                  <span>Mobile <b>*</b></span>
                  <input
                    type="tel"
                    value={customer.mobile}
                    onChange={(event) => updateCustomer("mobile", event.target.value)}
                    placeholder="+974"
                    required
                  />
                </label>
                <label className="intake-field">
                  <span>Phone <small>(Optional)</small></span>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    placeholder="+974"
                  />
                </label>
                <label className="intake-field">
                  <span>Email <small>(Optional)</small></span>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(event) => updateCustomer("email", event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="intake-field">
                  <span>Customer Type <b>*</b></span>
                  <select
                    value={customer.type}
                    onChange={(event) => updateCustomer("type", event.target.value)}
                  >
                    <option>Individual</option>
                    <option>Business</option>
                  </select>
                </label>
                <label className="intake-field">
                  <span>ID / Civil No. <small>(Optional)</small></span>
                  <input
                    value={customer.idNumber}
                    onChange={(event) => updateCustomer("idNumber", event.target.value)}
                    placeholder="Enter ID or civil number"
                  />
                </label>
                <label className="intake-field intake-customer-address">
                  <span>Address <small>(Optional)</small></span>
                  <input
                    value={customer.address}
                    onChange={(event) => updateCustomer("address", event.target.value)}
                    placeholder="Enter address"
                  />
                </label>
              </div>

              <label className="intake-field intake-notes">
                <span>Notes <small>(Optional)</small></span>
                <textarea
                  value={customer.notes}
                  onChange={(event) => updateCustomer("notes", event.target.value)}
                  placeholder="Add customer notes..."
                  rows={3}
                />
              </label>

              <section className="intake-customer-history" aria-label="Saved customer history">
                <h3><History size={17} />Saved Customer History <small>(If Existing)</small></h3>
                <div>
                  <article><CarFront size={21} /><span><small>Total Vehicles</small><strong>{history.vehicles}</strong></span></article>
                  <article><FileText size={20} /><span><small>Total Work Orders</small><strong>{history.workOrders}</strong></span></article>
                  <article><History size={20} /><span><small>Last Visit</small><strong>{history.lastVisit}</strong></span></article>
                  <article><span className="intake-spent-icon">QAR</span><span><small>Total Spent</small><strong>{history.spent}</strong></span></article>
                </div>
              </section>

              <div className="intake-form-footer">
                <button
                  className="intake-action-button outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  className="intake-action-button orange"
                  onClick={() => {
                    if (!customer.name || !customer.name.trim()) {
                      notify("Please enter customer name.");
                      return;
                    }
                    if (!customer.mobile || !customer.mobile.trim()) {
                      notify("Please enter customer mobile number.");
                      return;
                    }
                    setStep(3);
                  }}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : step === 3 ? (
            <>
              <div className="intake-form-section-title">
                <span>3</span>
                <CarFront size={19} />
                <div>
                  <h2 id="intake-information-title">Car Details</h2>
                  <p>Enter vehicle information. Car name and plate number are mandatory.</p>
                </div>
              </div>

              <div className="intake-vehicle-fields">
                <label className="intake-field">
                  <span>Car Name <b>*</b></span>
                  <input
                    required
                    value={vehicle.carName || ""}
                    onChange={(event) => updateVehicle("carName", event.target.value)}
                    placeholder="e.g. Land Cruiser V8 / Toyota Camry"
                  />
                </label>
                <label className="intake-field">
                  <span>Plate Number <b>*</b></span>
                  <input
                    required
                    value={vehicle.plateNumber}
                    onChange={(event) => updateVehicle("plateNumber", event.target.value)}
                    placeholder="Enter plate number"
                  />
                </label>
                <label className="intake-field">
                  <span>Make <b>*</b></span>
                  <select value={vehicle.make} onChange={(event) => updateVehicle("make", event.target.value)}>
                    <option>Toyota</option>
                    <option>BMW</option>
                    <option>Lexus</option>
                    <option>Nissan</option>
                    <option>Mercedes-Benz</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="intake-field">
                  <span>Model <b>*</b></span>
                  <input
                    required
                    value={vehicle.model}
                    onChange={(event) => updateVehicle("model", event.target.value)}
                    placeholder="Enter model"
                  />
                </label>
                <label className="intake-field">
                  <span>Year <b>*</b></span>
                  <input
                    required
                    inputMode="numeric"
                    value={vehicle.year}
                    onChange={(event) => updateVehicle("year", event.target.value)}
                    placeholder="YYYY"
                  />
                </label>
                <label className="intake-field">
                  <span>Color</span>
                  <input value={vehicle.color} onChange={(event) => updateVehicle("color", event.target.value)} />
                </label>
                <label className="intake-field">
                  <span>Chassis No. <small>(Optional)</small></span>
                  <input value={vehicle.chassisNumber} onChange={(event) => updateVehicle("chassisNumber", event.target.value)} />
                </label>
                <label className="intake-field">
                  <span>Engine No. <small>(Optional)</small></span>
                  <input value={vehicle.engineNumber} onChange={(event) => updateVehicle("engineNumber", event.target.value)} />
                </label>
                <label className="intake-field">
                  <span>Mileage (KM)</span>
                  <input
                    inputMode="numeric"
                    value={vehicle.mileage}
                    onChange={(event) => updateVehicle("mileage", event.target.value)}
                  />
                </label>
                <label className="intake-field">
                  <span>Fuel Type</span>
                  <select value={vehicle.fuelType} onChange={(event) => updateVehicle("fuelType", event.target.value)}>
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Hybrid</option>
                    <option>Electric</option>
                  </select>
                </label>
                <label className="intake-field">
                  <span>Transmission</span>
                  <select value={vehicle.transmission} onChange={(event) => updateVehicle("transmission", event.target.value)}>
                    <option>Automatic</option>
                    <option>Manual</option>
                  </select>
                </label>
                <label className="intake-field">
                  <span>Vehicle Type</span>
                  <select value={vehicle.vehicleType} onChange={(event) => updateVehicle("vehicleType", event.target.value)}>
                    <option>SUV</option>
                    <option>Sedan</option>
                    <option>Coupe</option>
                    <option>Pickup</option>
                    <option>Van</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="intake-field">
                  <span>Body Type</span>
                  <input value={vehicle.bodyType} onChange={(event) => updateVehicle("bodyType", event.target.value)} />
                </label>
                <label className="intake-field intake-expiry-field">
                  <span>Registration Expiry <small>(Optional)</small></span>
                  <IntakeDateField
                    value={vehicle.registrationExpiry}
                    onChange={(value) => updateVehicle("registrationExpiry", value)}
                    label="Registration expiry"
                  />
                </label>
                <label className="intake-field intake-expiry-field">
                  <span>Insurance Expiry <small>(Optional)</small></span>
                  <IntakeDateField
                    value={vehicle.insuranceExpiry}
                    onChange={(value) => updateVehicle("insuranceExpiry", value)}
                    label="Insurance expiry"
                  />
                </label>
              </div>

              <label className="intake-field intake-notes">
                <span>Additional Notes <small>(Optional)</small></span>
                <textarea
                  value={vehicle.notes}
                  onChange={(event) => updateVehicle("notes", event.target.value)}
                  placeholder="Add vehicle notes (any previous issues, special information, etc.)"
                  rows={3}
                />
              </label>

              <section className="intake-customer-history" aria-label="Vehicle history">
                <h3><History size={17} />Vehicle History <small>(If Existing)</small></h3>
                <div>
                  <article><FileText size={20} /><span><small>Total Work Orders</small><strong>{selectedVehicleHistory.workOrders}</strong></span></article>
                  <article><Wrench size={20} /><span><small>Last Service</small><strong>{selectedVehicleHistory.lastService}</strong></span></article>
                  <article><span className="intake-spent-icon">QAR</span><span><small>Total Spent</small><strong>{selectedVehicleHistory.spent}</strong></span></article>
                  <article><CalendarDays size={20} /><span><small>Next Service (Suggested)</small><strong>{selectedVehicleHistory.nextService}</strong></span></article>
                </div>
              </section>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  className="intake-action-button orange"
                  onClick={() => {
                    if (!vehicle.carName || !vehicle.carName.trim()) {
                      notify("Please enter car name.");
                      return;
                    }
                    if (!vehicle.plateNumber || !vehicle.plateNumber.trim()) {
                      notify("Please enter plate number.");
                      return;
                    }
                    setStep(4);
                  }}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : step === 4 ? (
            <>
              <div className="intake-form-section-title">
                <span>4</span>
                <Wrench size={19} />
                <div>
                  <h2 id="intake-information-title">Customer Complaint</h2>
                  <p>Enter customer complaints and select required services. This will be used for quotation and repair work.</p>
                </div>
              </div>

              <div className="intake-complaint-grid">
                <label className="intake-field intake-complaint-description">
                  <span>Complaint Description <b>*</b></span>
                  <textarea
                    required
                    maxLength={500}
                    value={complaint}
                    onChange={(event) => setComplaint(event.target.value)}
                    placeholder="Describe the customer's complaint..."
                    rows={6}
                  />
                  <small className="intake-character-count">{complaint.length}/500</small>
                </label>

                <section className="intake-common-complaints" aria-label="Common complaints">
                  <h3>Common Complaints</h3>
                  <label className="intake-complaint-search">
                    <Search size={14} />
                    <input
                      value={complaintSearch}
                      onChange={(event) => setComplaintSearch(event.target.value)}
                      placeholder="Search or select common complaint..."
                      aria-label="Search common complaints"
                    />
                  </label>
                  <div className="intake-complaint-chips">
                    {commonComplaints
                      .filter((item) => item.toLowerCase().includes(complaintSearch.toLowerCase().trim()))
                      .map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={selectedComplaints.includes(item) ? "active" : ""}
                          aria-pressed={selectedComplaints.includes(item)}
                          onClick={() => toggleComplaint(item)}
                        >
                          {item}
                        </button>
                      ))}
                    {commonComplaints.every(
                      (item) => !item.toLowerCase().includes(complaintSearch.toLowerCase().trim()),
                    ) && <p className="intake-no-complaints">No common complaints match your search.</p>}
                  </div>
                </section>
              </div>

              <section className="intake-requested-services" aria-labelledby="requested-services-title">
                <h3 id="requested-services-title">Requested Services</h3>
                <p>Select services required based on the customer complaint.</p>
                <div className="intake-service-grid">
                  {requestedServices.map(({ name, icon: Icon }) => (
                    <label
                      key={name}
                      className={`intake-service-option${selectedServices.includes(name) ? " selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(name)}
                        onChange={() => toggleService(name)}
                      />
                      <Icon size={15} />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </section>

              <label className="intake-field intake-notes">
                <span>Additional Notes <small>(Optional)</small></span>
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Add any extra details from customer..."
                  rows={3}
                />
              </label>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(3)}>
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  className="intake-action-button orange"
                  onClick={() => setStep(5)}
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : step === 5 ? (
            <>
              <div className="intake-form-section-title">
                <span>6</span>
                <FileText size={19} />
                <div>
                  <h2 id="intake-information-title">Quotation</h2>
                  <p>Add required parts and labour charges for this job. This will be shown to customer for approval.</p>
                </div>
              </div>

              <div className="intake-quotation-tabs" role="tablist" aria-label="Quotation items">
                <button
                  className={quotationTab === "external" ? "active" : ""}
                  role="tab"
                  aria-selected={quotationTab === "external"}
                  onClick={() => setQuotationTab("external")}
                >
                  <ShoppingCart size={15} />External Parts (No Inventory)
                </button>
                <button
                  className={quotationTab === "labour" ? "active" : ""}
                  role="tab"
                  aria-selected={quotationTab === "labour"}
                  onClick={() => setQuotationTab("labour")}
                >
                  <Wrench size={15} />Labour Charges
                </button>
                <button
                  className={quotationTab === "additional" ? "active" : ""}
                  role="tab"
                  aria-selected={quotationTab === "additional"}
                  onClick={() => setQuotationTab("additional")}
                >
                  <FileText size={15} />Additional Charges
                </button>
              </div>

              <div className="intake-quotation-layout">
                <div className="intake-quotation-editors">
                  {quotationTab === "external" && (
                    <section className="intake-quotation-panel">
                      <h3>Add External Parts</h3>
                      <div className="intake-quotation-entry intake-part-entry">
                        <label className="intake-field" style={{ minWidth: "220px" }}>
                          <span>Part Name <b>*</b></span>
                          <select
                            value={isOtherPart ? "__OTHER__" : partName}
                            onChange={(event) => {
                              const val = event.target.value;
                              if (val === "__OTHER__") {
                                setIsOtherPart(true);
                                setPartName("");
                                setCustomPartName("");
                                setPartOriginalPrice("");
                              } else {
                                setIsOtherPart(false);
                                setPartName(val);
                                const found = inventoryParts.find((p) => p.name === val);
                                if (found) {
                                  const autoPrice = found.sellingPrice ?? found.unitCost ?? "";
                                  setPartOriginalPrice(autoPrice !== "" ? String(autoPrice) : "");
                                } else {
                                  setPartOriginalPrice("");
                                }
                              }
                            }}
                          >
                            <option value="">Select part from inventory...</option>
                            {inventoryParts.map((part) => (
                              <option key={part.id || part.name} value={part.name}>
                                {part.name} (Stock: {part.quantity ?? 0}) — QAR {part.sellingPrice || part.unitCost || 0}
                              </option>
                            ))}
                            <option value="__OTHER__">+ Other Part (Custom Entry)</option>
                          </select>
                        </label>
                        {isOtherPart && (
                          <label className="intake-field">
                            <span>Custom Part Name <b>*</b></span>
                            <input
                              value={customPartName}
                              onChange={(event) => setCustomPartName(event.target.value)}
                              placeholder="Type custom part name..."
                              required
                            />
                          </label>
                        )}
                        <label className="intake-field">
                          <span>Original Price (QAR) <b>*</b></span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={partOriginalPrice}
                            onChange={(event) => setPartOriginalPrice(event.target.value)}
                            placeholder="0.00"
                          />
                        </label>
                        <label className="intake-field">
                          <span>Commission (QAR) <small>(Optional)</small></span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={partCommission}
                            onChange={(event) => setPartCommission(event.target.value)}
                            placeholder="0.00 (Optional)"
                          />
                        </label>
                        <div className="intake-part-price">
                          <span>Customer Price (QAR)</span>
                          <strong>{currency((Number(partOriginalPrice) || 0) + (Number(partCommission) || 0))}</strong>
                        </div>
                        <button className="intake-add-button" onClick={addExternalPart}>
                          <Plus size={14} />Add Part
                        </button>
                      </div>
                      <div className="intake-quotation-table-wrap">
                        <table className="intake-quotation-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Part Name</th>
                              <th>Original Price</th>
                              <th>Commission</th>
                              <th>Customer Price</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {externalParts.map((part, index) => (
                              <tr key={part.id}>
                                <td>{index + 1}</td>
                                <td>{part.name}</td>
                                <td>{currency(part.originalPrice)}</td>
                                <td>{currency(part.commission || 0)}</td>
                                <td>{currency(part.originalPrice + (part.commission || 0))}</td>
                                <td>
                                  <button
                                    className="intake-delete-charge"
                                    aria-label={`Remove ${part.name}`}
                                    onClick={() => setExternalParts((current) => current.filter((item) => item.id !== part.id))}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {externalParts.length === 0 && (
                              <tr>
                                <td className="intake-quotation-empty" colSpan={6}>
                                  No external parts added yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {quotationTab === "labour" && (
                    <section className="intake-quotation-panel">
                      <h3>Labour Charges</h3>
                      <div className="intake-quotation-entry intake-labour-entry">
                        <label className="intake-field">
                          <span>Service Name <b>*</b></span>
                          <select value={labourService} onChange={(event) => setLabourService(event.target.value)}>
                            <option value="">Select or type service...</option>
                            {serviceOptions.map((service) => <option key={service}>{service}</option>)}
                          </select>
                        </label>
                        <label className="intake-field">
                          <span>Mechanic</span>
                          <select value={labourMechanic} onChange={(event) => setLabourMechanic(event.target.value)}>
                            <option>M. Khan</option><option>Ali Hassan</option><option>Ali Shah</option>
                          </select>
                        </label>
                        <label className="intake-field">
                          <span>Labour Amount (QAR) <b>*</b></span>
                          <input type="number" min="0" step="0.01" value={labourAmount} onChange={(event) => setLabourAmount(event.target.value)} placeholder="0.00" />
                        </label>
                        <button className="intake-add-button" onClick={addLabourCharge}><Plus size={14} />Add Labour</button>
                      </div>
                      <div className="intake-quotation-table-wrap">
                        <table className="intake-quotation-table">
                          <thead><tr><th>#</th><th>Service Name</th><th>Mechanic</th><th>Labour Amount (QAR)</th><th>Action</th></tr></thead>
                          <tbody>
                            {labourCharges.map((charge, index) => (
                              <tr key={charge.id}>
                                <td>{index + 1}</td><td>{charge.service}</td><td>{charge.mechanic}</td><td>{currency(charge.amount)}</td>
                                <td><button className="intake-delete-charge" aria-label={`Remove ${charge.service}`} onClick={() => setLabourCharges((current) => current.filter((item) => item.id !== charge.id))}><Trash2 size={14} /></button></td>
                              </tr>
                            ))}
                            {labourCharges.length === 0 && <tr><td className="intake-quotation-empty" colSpan={5}>No labour charges added yet.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {quotationTab === "additional" && (
                    <section className="intake-quotation-panel">
                      <h3>Additional Charges</h3>
                      <div className="intake-quotation-entry intake-additional-entry">
                        <label className="intake-field">
                          <span>Charge Description <b>*</b></span>
                          <input value={additionalName} onChange={(event) => setAdditionalName(event.target.value)} placeholder="e.g. Inspection fee" />
                        </label>
                        <label className="intake-field">
                          <span>Amount (QAR) <b>*</b></span>
                          <input type="number" min="0" step="0.01" value={additionalAmount} onChange={(event) => setAdditionalAmount(event.target.value)} placeholder="0.00" />
                        </label>
                        <button className="intake-add-button" onClick={addAdditionalCharge}><Plus size={14} />Add Charge</button>
                      </div>
                      <div className="intake-quotation-table-wrap">
                        <table className="intake-quotation-table">
                          <thead><tr><th>#</th><th>Charge Description</th><th>Amount (QAR)</th><th>Action</th></tr></thead>
                          <tbody>
                            {additionalCharges.map((charge, index) => (
                              <tr key={charge.id}>
                                <td>{index + 1}</td><td>{charge.name}</td><td>{currency(charge.amount)}</td>
                                <td><button className="intake-delete-charge" aria-label={`Remove ${charge.name}`} onClick={() => setAdditionalCharges((current) => current.filter((item) => item.id !== charge.id))}><Trash2 size={14} /></button></td>
                              </tr>
                            ))}
                            {additionalCharges.length === 0 && <tr><td className="intake-quotation-empty" colSpan={4}>No additional charges added.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  <label className="intake-field intake-quotation-notes">
                    <span>Notes to Customer <small>(Optional)</small></span>
                    <textarea value={quotationNotes} onChange={(event) => setQuotationNotes(event.target.value)} placeholder="Add any special notes, warranty info, or terms..." rows={3} />
                  </label>
                </div>

                <aside className="intake-quotation-summary">
                  <h3>Quotation Summary</h3>
                  <div><span><KeyRound size={14} />Parts Total</span><strong>{currency(partsTotal)}</strong></div>
                  <div><span><Wrench size={14} />Labour Total</span><strong>{currency(labourTotal)}</strong></div>
                  <div><span><FileText size={14} />Additional Charges</span><strong>{currency(additionalTotal)}</strong></div>
                  <div className="intake-quotation-subtotal"><span>Subtotal</span><strong>{currency(quotationSubtotal)}</strong></div>
                  <label className="intake-quotation-discount">
                    <span>Discount</span>
                    <span><input type="number" min="0" max={quotationSubtotal} step="0.01" value={quotationDiscount} onChange={(event) => setQuotationDiscount(Math.min(quotationSubtotal, Math.max(0, Number(event.target.value) || 0)))} /><b>QAR</b></span>
                  </label>
                  <div className="intake-quotation-total"><strong>Total (QAR)</strong><strong>{currency(quotationTotal)}</strong></div>
                </aside>
              </div>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(4)}>
                  <ArrowLeft size={16} />Back
                </button>
                <button
                  className="intake-action-button orange"
                  onClick={() => {
                    setDocumentType("Quotation");
                    setStep(6);
                  }}
                >
                  Next<ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : step === 6 ? (
            <>
              <div className="intake-form-section-title">
                <span>5</span>
                <FileText size={19} />
                <div>
                  <h2 id="intake-information-title">Quotation</h2>
                  <p>Review parts and labour charges, then send the quotation to the customer for approval.</p>
                </div>
              </div>

              <div className="intake-review-dates">
                <label className="intake-field">
                  <span>Quotation No.</span>
                  <input readOnly value={quoteNumber} />
                </label>
                <label className="intake-field">
                  <span>Date</span>
                  <IntakeDateField value={quotationDate} onChange={setQuotationDate} label="Quotation date" />
                </label>
                <label className="intake-field">
                  <span>Valid Until</span>
                  <IntakeDateField value={quotationValidUntil} onChange={setQuotationValidUntil} label="Quotation valid until" />
                </label>
              </div>

              <div className="intake-review-customer">
                <div><small>Customer Name</small><strong>{customer.name || "—"}</strong></div>
                <div><small>Mobile</small><strong>{customer.mobile || "—"}</strong></div>
                <div><small>Vehicle</small><strong>{vehicle.make} {vehicle.model}</strong></div>
                <div><small>Plate No.</small><strong>{vehicle.plateNumber || "—"}</strong></div>
              </div>

              <section className="intake-review-table-section">
                <h3>External Parts</h3>
                <div className="intake-quotation-table-wrap">
                  <table className="intake-review-table">
                    <thead>
                      <tr><th>#</th><th>Description</th><th>Qty</th><th>Original Price (QAR)</th><th>Commission</th><th>Customer Price (QAR)</th><th>Total (QAR)</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {externalParts.map((part, index) => (
                        <tr key={part.id}>
                          <td>{index + 1}</td><td>{part.name}</td><td>1</td>
                          <td>{currency(part.originalPrice)}</td><td>{currency(part.commission)}</td>
                          <td>{currency(part.originalPrice + part.commission)}</td><td>{currency(part.originalPrice + part.commission)}</td>
                          <td><button className="intake-delete-charge" aria-label={`Remove ${part.name}`} onClick={() => setExternalParts((current) => current.filter((item) => item.id !== part.id))}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                      {externalParts.length === 0 && <tr><td className="intake-quotation-empty" colSpan={8}>No external parts added.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button className="intake-review-add" onClick={() => { setQuotationTab("external"); setStep(5); }}><Plus size={14} />Add Part</button>
              </section>

              <section className="intake-review-table-section">
                <h3>Labour Charges</h3>
                <div className="intake-quotation-table-wrap">
                  <table className="intake-review-table">
                    <thead><tr><th>#</th><th>Description</th><th>Hours</th><th>Rate (QAR)</th><th>Total (QAR)</th><th>Action</th></tr></thead>
                    <tbody>
                      {labourCharges.map((charge, index) => {
                        const hours = charge.hours ?? 2;
                        const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                        return (
                          <tr key={charge.id}>
                            <td>{index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)}</td>
                            <td>{currency(rate)}</td><td>{currency(charge.amount)}</td>
                            <td><button className="intake-delete-charge" aria-label={`Remove ${charge.service}`} onClick={() => setLabourCharges((current) => current.filter((item) => item.id !== charge.id))}><Trash2 size={14} /></button></td>
                          </tr>
                        );
                      })}
                      {labourCharges.length === 0 && <tr><td className="intake-quotation-empty" colSpan={6}>No labour charges added.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button className="intake-review-add" onClick={() => { setQuotationTab("labour"); setStep(5); }}><Plus size={14} />Add Labour</button>
              </section>

              {additionalCharges.length > 0 && (
                <section className="intake-review-table-section">
                  <h3>Additional Charges</h3>
                  <div className="intake-quotation-table-wrap">
                    <table className="intake-review-table">
                      <thead><tr><th>#</th><th>Description</th><th>Total (QAR)</th><th>Action</th></tr></thead>
                      <tbody>{additionalCharges.map((charge, index) => (
                        <tr key={charge.id}><td>{index + 1}</td><td>{charge.name}</td><td>{currency(charge.amount)}</td>
                          <td><button className="intake-delete-charge" aria-label={`Remove ${charge.name}`} onClick={() => setAdditionalCharges((current) => current.filter((item) => item.id !== charge.id))}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              <div className="intake-review-bottom">
                <section className="intake-review-summary">
                  <h3>Quotation Summary</h3>
                  <div><span>External Parts Total</span><strong>{currency(partsTotal)}</strong></div>
                  <div><span>Labour Charges Total</span><strong>{currency(labourTotal)}</strong></div>
                  {additionalTotal > 0 && <div><span>Additional Charges</span><strong>{currency(additionalTotal)}</strong></div>}
                  <div><span>Subtotal</span><strong>{currency(quotationSubtotal)}</strong></div>
                  {quotationDiscount > 0 && <div><span>Discount</span><strong>-{currency(quotationDiscount)}</strong></div>}
                  <div className="intake-review-grand-total"><strong>Total Amount (QAR)</strong><strong>{currency(quotationTotal)}</strong></div>
                </section>
                <section className="intake-approval-panel">
                  <p><CircleHelp size={17} />Repair work will start only after customer approval of this quotation.</p>
                  <span className={`intake-approval-status ${quotationStatus === "Approved" ? "approved" : quotationStatus === "Rejected" ? "rejected" : quotationStatus === "Pending" ? "pending" : ""}`}>
                    {quotationStatus}
                  </span>
                  <button className="intake-approve-button" disabled={quotationStatus === "Approved"} onClick={() => {
                    updateQuotationStatus("Approved");
                  }}>
                    <Check size={15} />Approve Quotation
                  </button>
                  <div className="intake-secondary-actions">
                    <button
                      type="button"
                      className="intake-pending-button"
                      onClick={() => updateQuotationStatus("Pending")}
                      title="Keep this quotation pending for later approval or rejection"
                    >
                      <Clock size={14} />Pending
                    </button>
                    <button
                      type="button"
                      className="intake-reject-button"
                      onClick={() => updateQuotationStatus("Rejected")}
                      title="Reject this quotation and reset intake"
                    >
                      <XCircle size={14} />Reject
                    </button>
                  </div>
                </section>
              </div>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(5)}>
                  <ArrowLeft size={16} />Back
                </button>
              </div>
            </>
          ) : step === 7 ? (
            <>
              <div className="intake-form-section-title">
                <span>6</span>
                <Check size={19} />
                <div>
                  <h2 id="intake-information-title">Repair Done</h2>
                  <p>Record completed repair work and confirm when the vehicle is ready for pickup.</p>
                </div>
              </div>

              <section className="intake-repair-information">
                <h3><ClipboardList size={16} />Repair Information</h3>
                <div className="intake-repair-fields">
                  <label className="intake-field">
                    <div className="intake-field-label-row">
                      <span>Work Order No. <b>*</b></span>
                      <span className="intake-auto-badge">AUTO</span>
                    </div>
                    <input
                      readOnly
                      value={form.workOrder}
                      className="intake-input-locked"
                      aria-label="Work order number (Auto-generated and locked)"
                      title="Work order number is locked"
                    />
                  </label>
                  <label className="intake-field">
                    <span>Repair Date <b>*</b></span>
                    <IntakeDateField value={repairDate} onChange={setRepairDate} label="Repair date" />
                  </label>
                  <label className="intake-field">
                    <span>Assigned Mechanic <b>*</b></span>
                    <select value={form.mechanic || labourCharges[0]?.mechanic || "M. Khan"} onChange={(event) => update("mechanic", event.target.value)}>
                      <option>M. Khan</option><option>Ali Hassan</option><option>Ali Shah</option>
                    </select>
                  </label>
                  <label className="intake-field">
                    <span>Repair Status <b>*</b></span>
                    <select value={repairStatus} onChange={(event) => {
                      const nextStatus = event.target.value as RepairStatus;
                      setRepairStatus(nextStatus);
                      if (nextStatus === "Completed") {
                        setCompletionDate((current) => current || repairDate);
                        setVehicleReady("Yes - Ready for Pickup");
                        setForm((current) => ({ ...current, status: "Completed" }));
                      } else {
                        setVehicleReady("No - In Progress");
                        setForm((current) => ({ ...current, status: "In Progress" }));
                      }
                    }}>
                      <option>In Progress</option><option>Completed</option>
                    </select>
                  </label>
                  <label className="intake-field">
                    <span>Completion Date <b>*</b></span>
                    <IntakeDateField value={completionDate} onChange={setCompletionDate} label="Completion date" />
                  </label>
                  <label className="intake-field">
                    <span>Vehicle Ready <b>*</b></span>
                    <select value={vehicleReady} onChange={(event) => setVehicleReady(event.target.value)}>
                      <option>Yes - Ready for Pickup</option><option>No - In Progress</option><option>No - Awaiting Parts</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="intake-repair-section">
                <h3><Settings2 size={16} />Completed Services &amp; Parts</h3>
                <div className="intake-quotation-table-wrap">
                  <table className="intake-repair-table">
                    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price (QAR)</th><th>Total (QAR)</th></tr></thead>
                    <tbody>
                      {externalParts.map((part, index) => {
                        const unitPrice = part.originalPrice + part.commission;
                        return <tr key={`repair-part-${part.id}`}><td>{index + 1}</td><td>{part.name}</td><td>1</td><td>{currency(unitPrice)}</td><td>{currency(unitPrice)}</td></tr>;
                      })}
                      {labourCharges.map((charge, index) => {
                        const hours = charge.hours ?? 2;
                        const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                        return <tr key={`repair-labour-${charge.id}`}><td>{externalParts.length + index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)} hrs</td><td>{currency(rate)}</td><td>{currency(charge.amount)}</td></tr>;
                      })}
                      {additionalCharges.map((charge, index) => <tr key={`repair-additional-${charge.id}`}><td>{externalParts.length + labourCharges.length + index + 1}</td><td>{charge.name}</td><td>1</td><td>{currency(charge.amount)}</td><td>{currency(charge.amount)}</td></tr>)}
                      {externalParts.length + labourCharges.length + additionalCharges.length === 0 && <tr><td colSpan={5} className="intake-quotation-empty">No completed services or parts recorded.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="intake-repair-section intake-technician-notes">
                <h3><FileText size={16} />Technician Notes</h3>
                <textarea value={technicianNotes} onChange={(event) => setTechnicianNotes(event.target.value)} placeholder="Describe the repair work completed..." rows={3} />
              </section>

              <div className="intake-repair-bottom">
                <section className="intake-repair-summary">
                  <h3><Activity size={16} />Final Repair Summary</h3>
                  <div><span>Parts Total</span><strong>{currency(partsTotal + additionalTotal)}</strong></div>
                  <div><span>Labour Charges Total</span><strong>{currency(labourTotal)}</strong></div>
                  <div className="intake-repair-total"><strong>Total Amount (QAR)</strong><strong>{currency(quotationTotal)}</strong></div>
                </section>
                <section className={`intake-repair-confirmation${repairStatus === "Completed" ? " is-complete" : ""}`}>
                  <span className="intake-repair-confirmation-icon"><Check size={19} /></span>
                  <div>
                    <strong>{repairStatus === "Completed" ? "Repair work completed successfully." : "Repair is in progress."}</strong>
                    <p>{repairStatus === "Completed" && vehicleReady.startsWith("Yes") ? "Vehicle is ready for customer handover." : "Complete and verify the work before marking the vehicle ready."}</p>
                  </div>
                </section>
              </div>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(6)}>
                  <ArrowLeft size={16} />Back
                </button>
                {repairStatus !== "Completed" && (
                  <button className="intake-action-button repair-complete-button" onClick={completeRepair}>
                    <Check size={16} />Mark Repair Complete
                  </button>
                )}
                {repairStatus === "Completed" && (
                  <button className="intake-action-button orange" onClick={() => {
                    setDocumentType("Invoice");
                    setInvoicePreviewTab("Invoice Preview");
                    setStep(8);
                  }}>
                    Next<ArrowRight size={16} />
                  </button>
                )}
              </div>
            </>
          ) : step === 8 ? (
            <>
              <div className="intake-form-section-title">
                <span>7</span>
                <FileText size={19} />
                <div>
                  <h2 id="intake-information-title">Invoice Information</h2>
                  <p>Generate an invoice for the completed repair and review the payment summary.</p>
                </div>
              </div>

              <section className="intake-invoice-information">
                <label className="intake-field">
                  <div className="intake-field-label-row">
                    <span>Invoice No.</span>
                    <span className="intake-auto-badge">AUTO</span>
                  </div>
                  <input
                    readOnly
                    value={invoiceNumber}
                    className="intake-input-locked"
                    aria-label="Invoice number (Auto-generated and locked)"
                    title="Invoice number is auto-generated and locked"
                  />
                </label>
                <label className="intake-field">
                  <span>Date</span>
                  <IntakeDateField value={invoiceDate} onChange={setInvoiceDate} label="Invoice date" />
                </label>
                <label className="intake-field">
                  <span>Due Date <small>(Optional)</small></span>
                  <IntakeDateField value={invoiceDueDate} onChange={setInvoiceDueDate} label="Invoice due date" />
                </label>
                <label className="intake-field">
                  <span>Payment Terms</span>
                  <select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)}>
                    <option>Due on Receipt</option><option>Net 7 Days</option><option>Net 15 Days</option><option>Net 30 Days</option>
                  </select>
                </label>
              </section>

              <section className="intake-invoice-items">
                <h3><Wrench size={16} />Items</h3>
                <div className="intake-invoice-item-tabs" role="tablist" aria-label="Invoice item category">
                  <button role="tab" aria-selected={invoiceItemsTab === "parts"} className={invoiceItemsTab === "parts" ? "active" : ""} onClick={() => setInvoiceItemsTab("parts")}>Parts Used</button>
                  <button role="tab" aria-selected={invoiceItemsTab === "labour"} className={invoiceItemsTab === "labour" ? "active" : ""} onClick={() => setInvoiceItemsTab("labour")}>Labour Charges</button>
                </div>
                <div className="intake-quotation-table-wrap">
                  <table className="intake-invoice-table">
                    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price (QAR)</th><th>Total (QAR)</th></tr></thead>
                    <tbody>
                      {invoiceItemsTab === "parts" ? (
                        <>
                          {externalParts.map((part, index) => {
                            const price = part.originalPrice + part.commission;
                            return <tr key={part.id}><td>{index + 1}</td><td>{part.name}</td><td>1</td><td>{currency(price)}</td><td>{currency(price)}</td></tr>;
                          })}
                          {externalParts.length === 0 && <tr><td colSpan={5} className="intake-quotation-empty">No parts used for this repair.</td></tr>}
                        </>
                      ) : (
                        <>
                          {labourCharges.map((charge, index) => {
                            const hours = charge.hours ?? 2;
                            const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                            return <tr key={charge.id}><td>{index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)} hrs</td><td>{currency(rate)}</td><td>{currency(charge.amount)}</td></tr>;
                          })}
                          {labourCharges.length === 0 && <tr><td colSpan={5} className="intake-quotation-empty">No labour charges for this repair.</td></tr>}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="intake-invoice-bottom">
                <section className="intake-invoice-notes">
                  <h3><FileText size={16} />Invoice Notes <small>(Optional)</small></h3>
                  <textarea value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} rows={4} placeholder="Add a note for the customer..." />
                </section>
                <section className="intake-invoice-summary">
                  <h3><ClipboardList size={16} />Summary</h3>
                  <div><span>Parts Total</span><strong>{currency(partsTotal)}</strong></div>
                  <div><span>Labour Total</span><strong>{currency(labourTotal)}</strong></div>
                  <div><span>Additional Charges</span><strong>{currency(additionalTotal)}</strong></div>
                  <div><span>Discount</span><strong>{currency(quotationDiscount)}</strong></div>
                  <div className="intake-invoice-grand-total"><strong>Grand Total</strong><strong>{currency(quotationTotal)}</strong></div>
                </section>
              </div>

              <div className="intake-form-footer">
                <button className="intake-action-button outline" onClick={() => setStep(7)}>
                  <ArrowLeft size={16} />Back
                </button>
                <button className="intake-action-button orange" onClick={() => {
                  setInvoicePreviewTab("Payment");
                  setStep(9);
                }}>
                  Next<ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="intake-form-section-title">
                <span>8</span>
                <Activity size={19} />
                <div>
                  <h2 id="intake-information-title">Payment / Balance</h2>
                  <p>Record payments received and track the remaining invoice balance.</p>
                </div>
              </div>

              <div className="intake-payment-workflow">
                <span className="completed"><Check size={13} />Invoice Created</span>
                <span className="active"><CircleHelp size={13} />Payment</span>
              </div>

              <section className="intake-payment-information">
                <label className="intake-field">
                  <div className="intake-field-label-row">
                    <span>Invoice No.</span>
                    <span className="intake-auto-badge">AUTO</span>
                  </div>
                  <input
                    readOnly
                    value={invoiceNumber}
                    className="intake-input-locked"
                    aria-label="Invoice number"
                    title="Invoice number is locked"
                  />
                </label>
                <label className="intake-field">
                  <span>Invoice Date</span>
                  <input readOnly value={formatDate(invoiceDate)} />
                </label>
                <label className="intake-field">
                  <span>Customer Name</span>
                  <input readOnly value={customer.name} />
                </label>
                <label className="intake-field">
                  <span>Vehicle</span>
                  <input readOnly value={`${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}`} />
                </label>
              </section>

              <section className="intake-payment-items">
                <h3><Wrench size={16} />Invoice Items</h3>
                <div className="intake-quotation-table-wrap">
                  <table className="intake-invoice-table">
                    <thead><tr><th>#</th><th>Description</th><th>Type</th><th>Qty</th><th>Unit Price (QAR)</th><th>Total (QAR)</th></tr></thead>
                    <tbody>
                      {externalParts.map((part, index) => {
                        const amount = part.originalPrice + part.commission;
                        return <tr key={`payment-part-${part.id}`}><td>{index + 1}</td><td>{part.name}</td><td>Part</td><td>1</td><td>{currency(amount)}</td><td>{currency(amount)}</td></tr>;
                      })}
                      {labourCharges.map((charge, index) => {
                        const hours = charge.hours ?? 2;
                        const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                        return <tr key={`payment-labour-${charge.id}`}><td>{externalParts.length + index + 1}</td><td>{charge.service}</td><td>Labour</td><td>{hours.toFixed(1)} hrs</td><td>{currency(rate)}</td><td>{currency(charge.amount)}</td></tr>;
                      })}
                      {additionalCharges.map((charge, index) => <tr key={`payment-additional-${charge.id}`}><td>{externalParts.length + labourCharges.length + index + 1}</td><td>{charge.name}</td><td>Additional</td><td>1</td><td>{currency(charge.amount)}</td><td>{currency(charge.amount)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="intake-payment-entry">
                <div className="intake-payment-entry-title">
                  <div><h3><Plus size={16} />Add Payment</h3><p>Enter a payment received against this invoice.</p></div>
                  <span className={`intake-payment-status ${paymentStatus === "Fully Paid" ? "paid" : paymentStatus === "Partially Paid" ? "partial" : ""}`}>{paymentStatus}</span>
                </div>
                <div className="intake-payment-entry-fields">
                  <label className="intake-field">
                    <span>Payment Date</span>
                    <IntakeDateField value={paymentDate} onChange={setPaymentDate} label="Payment date" />
                  </label>
                  <label className="intake-field">
                    <span>Amount Received (QAR)</span>
                    <input type="number" min="0.01" max={balanceDue} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder={balanceDue.toFixed(2)} disabled={balanceDue === 0} />
                  </label>
                  <label className="intake-field">
                    <span>Payment Method</span>
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                      <option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option>
                    </select>
                  </label>
                  <label className="intake-field">
                    <span>Reference No. <small>(Optional)</small></span>
                    <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Receipt / transaction reference" />
                  </label>
                  <button className="intake-add-payment-button" disabled={balanceDue === 0} onClick={() => addPayment()}>
                    <Plus size={15} />Add Payment
                  </button>
                </div>
              </section>

              <div className="intake-payment-bottom">
                <section className="intake-payment-history">
                  <h3><History size={16} />Payment History</h3>
                  <div className="intake-quotation-table-wrap">
                    <table className="intake-payment-history-table">
                      <thead><tr><th>#</th><th>Date</th><th>Amount (QAR)</th><th>Payment Method</th><th>Reference</th><th>Status</th></tr></thead>
                      <tbody>
                        {payments.map((payment, index) => (
                          <tr key={payment.id}><td>{index + 1}</td><td>{formatDate(payment.date)}</td><td>{currency(payment.amount)}</td><td>{payment.method}</td><td>{payment.reference}</td><td><span className="intake-payment-received">Received</span></td></tr>
                        ))}
                        {payments.length === 0 && <tr><td colSpan={6} className="intake-quotation-empty">No payments recorded yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="intake-payment-summary">
                  <h3><ClipboardList size={16} />Invoice Summary</h3>
                  <div><span>Parts Total</span><strong>{currency(partsTotal)}</strong></div>
                  <div><span>Labour Total</span><strong>{currency(labourTotal)}</strong></div>
                  <div><span>Additional Charges</span><strong>{currency(additionalTotal)}</strong></div>
                  <div><span>Discount</span><strong>-{currency(quotationDiscount)}</strong></div>
                  <div><span>Invoice Total</span><strong>{currency(quotationTotal)}</strong></div>
                  <div className="intake-payment-paid"><span>Total Paid</span><strong>{currency(totalPaid)}</strong></div>
                  <div className="intake-payment-balance"><span>Outstanding Balance</span><strong>{currency(balanceDue)}</strong></div>
                </section>
              </div>

              <div className="intake-form-footer intake-payment-footer">
                <button className="intake-action-button outline" onClick={() => setStep(8)}>
                  <ArrowLeft size={16} />Back
                </button>
                <div>
                  <button className="intake-action-button outline" onClick={() => window.print()}>
                    <Printer size={15} />Preview Receipt
                  </button>
                  <button className="intake-action-button blue" onClick={createNewInvoice}>
                    <Plus size={15} />New Invoice
                  </button>
                  <button className="intake-action-button orange" disabled={balanceDue === 0} onClick={() => addPayment(balanceDue)}>
                    <Check size={15} />Settle Balance
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside
          className="intake-preview-card"
          aria-label="Work order document preview"
          ref={previewRef}
          tabIndex={-1}
        >
          <article className="intake-preview-paper">
            <header className="intake-paper-header">
              <div>
                <strong>{step >= 8 ? "INVOICE" : step === 7 ? "REPAIR SUMMARY" : "QUOTATION"}</strong>
                <b>{step >= 8 ? invoiceNumber : quoteNumber}</b>
                {step >= 8 ? (
                  <>
                    <span className="intake-paper-status approved">Repair Completed</span>
                    <small>Date: {formatDate(invoiceDate)}</small>
                    <small>Due Date: {invoiceDueDate ? formatDate(invoiceDueDate) : paymentTerms}</small>
                  </>
                ) : step === 7 ? (
                  <>
                    <span className={`intake-paper-status${repairStatus === "Completed" ? " approved" : ""}`}>{repairStatus}</span>
                    <small>Repair Date: {formatDate(repairDate)}</small>
                    {completionDate && <small>Completed Date: {formatDate(completionDate)}</small>}
                  </>
                ) : documentType === "Quotation" ? (
                  <>
                    <span className={`intake-paper-status ${quotationStatus === "Approved" ? "approved" : quotationStatus === "Rejected" ? "rejected" : quotationStatus === "Pending" ? "pending" : ""}`}>{quotationStatus}</span>
                    <small>Date: {formatDate(quotationDate)}</small>
                    <small>Valid Until: {formatDate(quotationValidUntil)}</small>
                  </>
                ) : <small>Date: {formatDate(form.date)}</small>}
              </div>
            </header>

            <div className="intake-paper-details">
              <section>
                <h3>Customer Details</h3>
                <strong>{customer.name || "Customer name"}</strong>
                <span>{customer.mobile || "Mobile number"}</span>
                {customer.email && <span>{customer.email}</span>}
              </section>
              <section>
                <h3>Vehicle Details</h3>
                <strong>{vehicle.carName || `${vehicle.make} ${vehicle.model}`.trim() || "Vehicle"}</strong>
                {vehicle.carName && <span>{vehicle.make} {vehicle.model}</span>}
                <span>Plate No: {vehicle.plateNumber || "TBD"}</span>
                <span>Year: {vehicle.year || "—"}</span>
                <span>Mileage: {vehicle.mileage ? `${vehicle.mileage} KM` : "—"}</span>
                <span>Color: {vehicle.color || "—"}</span>
              </section>
            </div>

            {step < 8 && <section className="intake-paper-complaint">
              <h3>Customer Complaint</h3>
              <p>{complaint || "No customer complaint entered."}</p>
              {selectedServices.length > 0 && <small>Requested services: {selectedServices.join(", ")}</small>}
            </section>}

            {step === 9 ? (
              <div className="intake-balance-preview">
                <h3>Invoice Summary</h3>
                <div><span>Invoice Total</span><strong>{currency(quotationTotal)}</strong></div>
                <div><span>Total Paid</span><strong className="paid">{currency(totalPaid)}</strong></div>
                <div className="balance"><span>Outstanding Balance</span><strong>{currency(balanceDue)}</strong></div>
                <span className={`intake-payment-status ${paymentStatus === "Fully Paid" ? "paid" : paymentStatus === "Partially Paid" ? "partial" : ""}`}>{paymentStatus}</span>
                <h3>Payment History</h3>
                {payments.map((payment) => <div className="intake-balance-payment" key={payment.id}><span>{formatDate(payment.date)} · {payment.method}</span><strong>{currency(payment.amount)}</strong></div>)}
                <p>Payment status and amounts are stored in this browser only. No payment was processed.</p>
              </div>
            ) : step === 8 && invoicePreviewTab === "Payment" ? (
              <section className="intake-payment-preview">
                <h3>Payment Summary</h3>
                <div><span>Invoice Total</span><strong>{currency(quotationTotal)}</strong></div>
                <div><span>Payment Terms</span><strong>{paymentTerms}</strong></div>
                <label className="intake-field">
                  <span>Payment Method</span>
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option>Cash</option><option>Card</option><option>Bank Transfer</option>
                  </select>
                </label>
                <p>Payment recording is a frontend preview; no payment will be processed.</p>
              </section>
            ) : step >= 8 ? (
              <div className="intake-invoice-preview">
                <div className="intake-paper-table-wrap">
                  <table className="intake-paper-table">
                    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price (QAR)</th><th>Total (QAR)</th></tr></thead>
                    <tbody>
                      {externalParts.map((part, index) => {
                        const price = part.originalPrice + part.commission;
                        return <tr key={`invoice-part-${part.id}`}><td>{index + 1}</td><td>{part.name}</td><td>1</td><td>{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>;
                      })}
                      {labourCharges.map((charge, index) => {
                        const hours = charge.hours ?? 2;
                        const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                        return <tr key={`invoice-labour-${charge.id}`}><td>{externalParts.length + index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)} hrs</td><td>{rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>;
                      })}
                      {additionalCharges.map((charge, index) => <tr key={`invoice-additional-${charge.id}`}><td>{externalParts.length + labourCharges.length + index + 1}</td><td>{charge.name}</td><td>1</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="intake-invoice-preview-summary">
                  <div><span>Parts Total</span><strong>{currency(partsTotal)}</strong></div>
                  <div><span>Labour Total</span><strong>{currency(labourTotal)}</strong></div>
                  <div><span>Additional Charges</span><strong>{currency(additionalTotal)}</strong></div>
                  <div><span>Discount</span><strong>-{currency(quotationDiscount)}</strong></div>
                  <div className="intake-paper-total quote-preview-total"><strong>Grand Total</strong><strong>{currency(quotationTotal)}</strong></div>
                </div>
              </div>
            ) : documentType === "Quotation" ? (
              <div className="intake-quote-preview-tables">
                <section>
                  <h3>External Parts</h3>
                  <div className="intake-paper-table-wrap">
                    <table className="intake-paper-table">
                      <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price (QAR)</th><th>Total (QAR)</th></tr></thead>
                      <tbody>
                        {externalParts.map((part, index) => (
                          <tr key={part.id}><td>{index + 1}</td><td>{part.name}</td><td>1</td>
                            <td>{(part.originalPrice + part.commission).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td>{(part.originalPrice + part.commission).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        {externalParts.length === 0 && <tr><td colSpan={5}>No parts included.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section>
                  <h3>Labour Charges</h3>
                  <div className="intake-paper-table-wrap">
                    <table className="intake-paper-table">
                      <thead><tr><th>#</th><th>Description</th><th>Hours</th><th>Rate (QAR)</th><th>Total (QAR)</th></tr></thead>
                      <tbody>
                        {labourCharges.map((charge, index) => {
                          const hours = charge.hours ?? 2;
                          const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                          return <tr key={charge.id}><td>{index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)}</td><td>{rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>;
                        })}
                        {labourCharges.length === 0 && <tr><td colSpan={5}>No labour included.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
                {additionalCharges.length > 0 && (
                  <section>
                    <h3>Additional Charges</h3>
                    <div className="intake-paper-table-wrap">
                      <table className="intake-paper-table">
                        <thead><tr><th>#</th><th>Description</th><th>Total (QAR)</th></tr></thead>
                        <tbody>{additionalCharges.map((charge, index) => <tr key={charge.id}><td>{index + 1}</td><td>{charge.name}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </section>
                )}
                {quotationDiscount > 0 && <p className="intake-paper-quote-discount">Discount: -{currency(quotationDiscount)}</p>}
                <div className="intake-paper-total quote-preview-total"><strong>Total Amount (QAR)</strong><strong>{currency(quotationTotal)}</strong></div>
              </div>
            ) : step === 7 ? (
              <div className="intake-repair-preview">
                <h3>Completed Services &amp; Parts</h3>
                <div className="intake-paper-table-wrap">
                  <table className="intake-paper-table">
                    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total (QAR)</th></tr></thead>
                    <tbody>
                      {externalParts.map((part, index) => {
                        const price = part.originalPrice + part.commission;
                        return <tr key={`preview-part-${part.id}`}><td>{index + 1}</td><td>{part.name}</td><td>1</td><td>{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>;
                      })}
                      {labourCharges.map((charge, index) => {
                        const hours = charge.hours ?? 2;
                        const rate = charge.rate ?? (hours > 0 ? charge.amount / hours : 0);
                        return <tr key={`preview-labour-${charge.id}`}><td>{externalParts.length + index + 1}</td><td>{charge.service}</td><td>{hours.toFixed(1)} hrs</td><td>{rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>;
                      })}
                      {additionalCharges.map((charge, index) => <tr key={`preview-charge-${charge.id}`}><td>{externalParts.length + labourCharges.length + index + 1}</td><td>{charge.name}</td><td>1</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td>{charge.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div className="intake-paper-total quote-preview-total"><strong>Total Amount (QAR)</strong><strong>{currency(quotationTotal)}</strong></div>
              </div>
            ) : (
              <div className="intake-paper-table-wrap">
                <table className="intake-paper-table">
                  <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Customer Price (QAR)</th></tr></thead>
                  <tbody>
                    {quotePreviewItems.map(({ description, price }, index) => (
                      <tr key={`${description}-${index}`}><td>{index + 1}</td><td>{description}</td><td>1</td><td>{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td></tr>
                    ))}
                    <tr className="intake-paper-total"><td colSpan={3}>Estimated Total</td><td>{currency(quotationTotal)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {step !== 8 && <section className="intake-paper-notes">
              <h3>Notes</h3>
              {step === 7 ? (
                <>
                  <p>{repairStatus === "Completed" ? "Repair work has been completed." : "Repair work is in progress."}</p>
                  <p>{vehicleReady.startsWith("Yes") ? "Vehicle checked and ready for pickup." : "Vehicle is not ready for pickup."}</p>
                  {technicianNotes && <p>{technicianNotes}</p>}
                </>
              ) : documentType === "Quotation" ? (
                <>
                  <p>This is a quotation and not a tax invoice.</p>
                  <p>Valid until {formatDate(quotationValidUntil)} ({quoteValidityDays} days).</p>
                </>
              ) : (
                <>
                  <p>This is an estimate. Final charges may vary after inspection.</p>
                  <p>Approved work will be carried out as per customer confirmation.</p>
                </>
              )}
              {quotationNotes && <p>{quotationNotes}</p>}
              <p>Job status: {form.status || "—"}</p>
              {form.mechanic && <p>Assigned mechanic: {form.mechanic}</p>}
              {form.notes && <p>Internal notes: {form.notes}</p>}
              {vehicle.notes && <p>Vehicle notes: {vehicle.notes}</p>}
            </section>}
            {step >= 8 && invoicePreviewTab === "Invoice Preview" && step !== 9 && <section className="intake-paper-notes"><h3>Notes</h3><p>{invoiceNotes || "—"}</p></section>}

            {step !== 8 && <div className="intake-paper-signature">
              <strong>Customer Signature:</strong>
              <span />
              <small>Date: __________________</small>
            </div>}
          </article>

          <div className="intake-preview-controls" aria-hidden="true">
            <button tabIndex={-1} aria-label="Previous page">
              <ArrowLeft size={14} />
            </button>
            <span>1 <small>/ 1</small></span>
            <button tabIndex={-1} aria-label="Next page">
              <ArrowRight size={14} />
            </button>
            <button className="preview-zoom" tabIndex={-1}>
              100% <ChevronDown size={13} />
            </button>
          </div>

          <div className="intake-preview-actions">
            <button className="blue" onClick={() => window.print()}>
              <Printer size={16} />
              Print {step >= 8 ? "Invoice" : documentType}
            </button>
            <button
              className="outline"
              onClick={() => notify("PDF download is not available in this frontend preview.")}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default NewIntake;
