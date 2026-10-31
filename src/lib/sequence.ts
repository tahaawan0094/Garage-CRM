/**
 * Sequence Generator for Work Order Numbers, Invoice Numbers, and Quotation Numbers
 *
 * Ensures:
 * 1. Automatic generation in sequential order starting from 1 (e.g. 00001).
 * 2. Professional 5-digit zero-padded format: WO-00001, INV-00001, QT-00001 (or user configured prefixes).
 * 3. Read-only / locked input fields so they cannot be altered manually.
 * 4. Persistence across browser sessions via localStorage and synchronization with backend.
 */

const PAD_LENGTH = 5; // e.g. 00001

export function getCustomPrefixes(): { wo: string; inv: string; qt: string } {
  try {
    const raw = localStorage.getItem("garage_crm_settings_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = (val?: string, fallback: string = "") => {
        if (!val || typeof val !== "string") return fallback;
        const trimmed = val.trim().replace(/-+$/, "");
        return trimmed || fallback;
      };
      return {
        wo: clean(parsed.workOrderPrefix, "WO"),
        inv: clean(parsed.invoicePrefix, "INV"),
        qt: clean(parsed.quotationPrefix, "QT"),
      };
    }
  } catch (_) {}
  return { wo: "WO", inv: "INV", qt: "QT" };
}

const STORAGE_KEYS = {
  WO_COUNTER: "garage_work_order_seq",
  INV_COUNTER: "garage_invoice_seq",
  QT_COUNTER: "garage_quotation_seq",
};

/**
 * Format a numeric sequence into a Work Order ID (e.g. 1 -> "WO-00001")
 */
export function formatWorkOrderId(seq: number, prefix?: string): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  const p = prefix || getCustomPrefixes().wo;
  return `${p}-${String(safeSeq).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Format a numeric sequence into an Invoice ID (e.g. 1 -> "INV-00001")
 */
export function formatInvoiceId(seq: number, prefix?: string): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  const p = prefix || getCustomPrefixes().inv;
  return `${p}-${String(safeSeq).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Format a numeric sequence into a Quotation ID (e.g. 1 -> "QT-00001")
 */
export function formatQuotationId(seq: number, prefix?: string): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  const p = prefix || getCustomPrefixes().qt;
  return `${p}-${String(safeSeq).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Extract trailing numeric digits from an ID string (e.g. "WO-00003" -> 3)
 */
export function extractSeq(id: string | undefined | null): number {
  if (!id || typeof id !== "string") return 0;
  const match = id.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Get the currently committed sequence counter for Work Orders
 */
export function getStoredWorkOrderSeq(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WO_COUNTER);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (_) {}
  return 0;
}

/**
 * Get the currently committed sequence counter for Invoices
 */
export function getStoredInvoiceSeq(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INV_COUNTER);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (_) {}
  return 0;
}

/**
 * Get the currently committed sequence counter for Quotations
 */
export function getStoredQuotationSeq(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QT_COUNTER);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (_) {}
  return 0;
}

/**
 * Commit a Work Order ID or sequence number as used.
 * Advances the counter so subsequent calls get the next number.
 */
export function commitWorkOrderId(idOrSeq: string | number): void {
  try {
    const seq = typeof idOrSeq === "number" ? idOrSeq : extractSeq(idOrSeq);
    const current = getStoredWorkOrderSeq();
    if (seq > current) {
      localStorage.setItem(STORAGE_KEYS.WO_COUNTER, String(seq));
    }
  } catch (_) {}
}

/**
 * Commit an Invoice ID or sequence number as used.
 * Advances the counter so subsequent calls get the next number.
 */
export function commitInvoiceId(idOrSeq: string | number): void {
  try {
    const seq = typeof idOrSeq === "number" ? idOrSeq : extractSeq(idOrSeq);
    const current = getStoredInvoiceSeq();
    if (seq > current) {
      localStorage.setItem(STORAGE_KEYS.INV_COUNTER, String(seq));
    }
  } catch (_) {}
}

/**
 * Commit a Quotation ID or sequence number as used.
 */
export function commitQuotationId(idOrSeq: string | number): void {
  try {
    const seq = typeof idOrSeq === "number" ? idOrSeq : extractSeq(idOrSeq);
    const current = getStoredQuotationSeq();
    if (seq > current) {
      localStorage.setItem(STORAGE_KEYS.QT_COUNTER, String(seq));
    }
  } catch (_) {}
}

/**
 * Generate the next Work Order number to use.
 * Starts from 1 and ensures no collisions with existing orders.
 */
export function getNextWorkOrderId(existingOrders?: Array<{ id?: string; workOrderId?: string }>): string {
  const stored = getStoredWorkOrderSeq();
  const existingSet = new Set<string>();

  if (Array.isArray(existingOrders)) {
    for (const order of existingOrders) {
      const id = order.workOrderId || order.id || "";
      if (id) {
        existingSet.add(id.toUpperCase().trim());
      }
    }
  }

  let candidateSeq = Math.max(stored, 0) + 1;
  while (existingSet.has(formatWorkOrderId(candidateSeq))) {
    candidateSeq++;
  }

  return formatWorkOrderId(candidateSeq);
}

/**
 * Generate the next Invoice number to use.
 * Starts from 1 and ensures no collisions with existing invoices.
 */
export function getNextInvoiceId(existingInvoices?: Array<{ id?: string; invoiceId?: string }>): string {
  const stored = getStoredInvoiceSeq();
  const existingSet = new Set<string>();

  if (Array.isArray(existingInvoices)) {
    for (const inv of existingInvoices) {
      const id = inv.invoiceId || inv.id || "";
      if (id) {
        existingSet.add(id.toUpperCase().trim());
      }
    }
  }

  let candidateSeq = Math.max(stored, 0) + 1;
  while (existingSet.has(formatInvoiceId(candidateSeq))) {
    candidateSeq++;
  }

  return formatInvoiceId(candidateSeq);
}

/**
 * Generate the next Quotation number to use.
 * Starts from 1 and ensures no collisions with existing quotations.
 */
export function getNextQuotationId(existingQuotes?: Array<{ id?: string }>): string {
  const stored = getStoredQuotationSeq();
  const existingSet = new Set<string>();

  if (Array.isArray(existingQuotes)) {
    for (const quote of existingQuotes) {
      const id = quote.id || "";
      if (id) {
        existingSet.add(id.toUpperCase().trim());
      }
    }
  }

  let candidateSeq = Math.max(stored, 0) + 1;
  while (existingSet.has(formatQuotationId(candidateSeq))) {
    candidateSeq++;
  }

  return formatQuotationId(candidateSeq);
}
