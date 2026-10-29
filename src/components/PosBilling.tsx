import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Banknote,
  Box,
  CalendarDays,
  CarFront,
  Check,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Minus,
  Package,
  PackageSearch,
  Phone,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { calculateTotals } from '../lib/billing';
import { partsApi, transactionsApi, customersApi, invoicesApi } from '../lib/api';
import { getNextInvoiceId, commitInvoiceId } from '../lib/sequence';
import { CustomDropdown } from './CustomDropdown';

export type Product = {
  id: string | number;
  partId?: string;
  name: string;
  detail: string;
  price: number;
  type: 'Part' | 'Service';
  category: string;
  stock: number;
  icon: LucideIcon;
  color: string;
};

export type CartItem = {
  productId: string | number;
  quantity: number;
  discount: number;
};

export type Customer = {
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
};

export type Invoice = {
  id: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  payment: string;
  date: string;
  status: 'Paid' | 'Pending' | 'Returned' | 'Partially Returned';
};

export type ReturnItem = {
  productId: string | number;
  name: string;
  quantity: number;
  unitPrice: number;
  refund: number;
};

export type ReturnRecord = {
  returnId: string;
  invoiceId: string;
  customer: string;
  date: string;
  items: ReturnItem[];
  totalRefund: number;
  reason: string;
  notes?: string;
};

function getCategoryIcon(category: string): LucideIcon {
  const cat = (category || '').toLowerCase();
  if (cat.includes('oil') || cat.includes('fluid')) return Box;
  if (cat.includes('filter')) return Settings;
  if (cat.includes('brake')) return Settings;
  if (cat.includes('tire')) return Settings;
  if (cat.includes('battery') || cat.includes('electrical') || cat.includes('ignition')) return Box;
  if (cat.includes('engine') || cat.includes('suspension') || cat.includes('belt')) return Wrench;
  return Package;
}

function getCategoryColor(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('oil') || cat.includes('fluid')) return 'oil';
  if (cat.includes('filter')) return 'filter';
  if (cat.includes('brake')) return 'brake';
  if (cat.includes('tire')) return 'tire';
  if (cat.includes('battery') || cat.includes('electrical')) return 'battery';
  if (cat.includes('wash')) return 'wash';
  if (cat.includes('polish')) return 'polish';
  if (cat.includes('ac')) return 'ac';
  return 'alignment';
}

const sampleCart: CartItem[] = [];
const number = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const q = (value: number) => `QAR ${number(value)}`;

const validCart = (value: unknown): value is CartItem[] =>
  Array.isArray(value) &&
  value.every(
    item =>
      item &&
      (typeof item.productId === 'string' || typeof item.productId === 'number') &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      Number.isFinite(item.discount) &&
      item.discount >= 0
  );

const validCustomer = (value: unknown): value is Customer =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as Record<string, unknown>).name === 'string';

function readInvoices(): Invoice[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('garage-pos-invoices') || 'null');
    return Array.isArray(value) &&
      value.every(
        item =>
          item &&
          typeof item.id === 'string' &&
          validCustomer(item.customer) &&
          validCart(item.items) &&
          Number.isFinite(item.total) &&
          typeof item.date === 'string' &&
          typeof item.payment === 'string' &&
          ['Paid', 'Pending', 'Returned', 'Partially Returned'].includes(item.status)
      )
      ? value
      : [];
  } catch {
    return [];
  }
}

function readReturns(): ReturnRecord[] {
  try {
    const val = JSON.parse(localStorage.getItem('garage-pos-returns') || '[]');
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

export default function PosBilling({
  globalSearch,
  notify,
  refreshTrigger,
  initialTab,
  initialReturnInvoiceId,
}: {
  globalSearch: string;
  notify: (message: string) => void;
  refreshTrigger?: number;
  initialTab?: 'sale' | 'returns';
  initialReturnInvoiceId?: string;
}) {
  const [viewTab, setViewTab] = useState<'sale' | 'returns'>(initialTab || 'sale');
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<any[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(sampleCart);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', vehicle: '', plate: '' });
  const [category, setCategory] = useState('All Items');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [received, setReceived] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>(readInvoices);
  const [returns, setReturns] = useState<ReturnRecord[]>(readReturns);
  const [receipt, setReceipt] = useState<Invoice | null>(null);
  const [activeReturnSlip, setActiveReturnSlip] = useState<ReturnRecord | null>(null);
  const [printDoc, setPrintDoc] = useState<{ type: 'invoice'; data: Invoice } | { type: 'return'; data: ReturnRecord } | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Return process state
  const [selectedReturnInvoiceId, setSelectedReturnInvoiceId] = useState<string>('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>('Defective / Damaged Part');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [restockToInventory, setRestockToInventory] = useState<boolean>(true);

  // Fetch actual parts from inventory database
  const loadInventory = () => {
    setIsLoadingParts(true);
    partsApi
      .getAll({ limit: 1000 })
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setInventoryParts(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load inventory parts in POS:', err);
      })
      .finally(() => {
        setIsLoadingParts(false);
      });
  };

  useEffect(() => {
    loadInventory();
  }, [refreshTrigger]);

  useEffect(() => {
    customersApi.getAll({ limit: 100 })
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setRegisteredCustomers(res.data);
        }
      })
      .catch(() => {});
  }, [refreshTrigger]);

  useEffect(() => {
    if (initialTab) setViewTab(initialTab);
    if (initialReturnInvoiceId) setSelectedReturnInvoiceId(initialReturnInvoiceId);
  }, [initialTab, initialReturnInvoiceId]);

  useEffect(() => {
    if (!receipt && !activeReturnSlip) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.pos-page [role="dialog"]');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('input, button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReceipt(null);
        setActiveReturnSlip(null);
      }
      if (event.key !== 'Tab') return;
      const controls = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea');
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [receipt, activeReturnSlip]);

  // POS is strictly for Parts Sale: only inventory parts
  const catalog: Product[] = useMemo(() => {
    return inventoryParts.map((part) => {
      const stock = Number(part.quantity) || 0;
      const cat = part.category || 'Parts';
      return {
        id: part.id || part.partId,
        partId: part.partId,
        name: part.name,
        detail: part.brand
          ? `${part.brand} · ${part.compatibility || 'OEM Spec'}`
          : part.compatibility || 'In Inventory',
        price: Number(part.sellingPrice) || Number(part.unitCost) || 0,
        type: 'Part' as const,
        category: cat,
        stock,
        icon: getCategoryIcon(cat),
        color: getCategoryColor(cat),
      };
    });
  }, [inventoryParts]);

  const productFor = (item: CartItem): Product => {
    const found = catalog.find((product) => String(product.id) === String(item.productId));
    if (found) return found;
    return {
      id: item.productId,
      name: 'Inventory Part',
      detail: '—',
      price: 0,
      type: 'Part',
      category: 'General',
      stock: 0,
      icon: Box,
      color: 'alignment',
    };
  };

  const categoryList = useMemo(() => {
    const map = new Map<string, string>();
    map.set('all items', 'All Items');
    inventoryParts.forEach((p) => {
      const raw = (p.category || '').trim();
      if (raw) {
        const lower = raw.toLowerCase();
        if (!map.has(lower)) {
          const formatted = raw
            .split(' ')
            .map((w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
            .join(' ');
          map.set(lower, formatted);
        }
      }
    });
    return Array.from(map.values());
  }, [inventoryParts]);

  const pricedItems = cart.map((item) => ({
    ...item,
    price: productFor(item).price,
    type: productFor(item).type,
  }));
  const totals = calculateTotals(pricedItems);
  const receivedValue = Number(received) || 0;
  const change = Math.max(0, Math.round((receivedValue - totals.total) * 100) / 100);
  const invoiceId = getNextInvoiceId(invoices);

  // Search-driven: items should only appear when user searches or picks a category
  const isSearchActive = Boolean(
    search.trim() ||
    globalSearch.trim() ||
    category !== 'All Items'
  );

  const available = useMemo(() => {
    if (!isSearchActive) {
      return [];
    }

    return catalog.filter((product) => {
      const matchesCategory =
        category === 'All Items' ||
        (product.category || '').toLowerCase() === category.toLowerCase();
      const fullSearch = `${search} ${globalSearch}`.trim().toLowerCase();
      const matchesSearch =
        !fullSearch ||
        `${product.name} ${product.detail} ${product.category} ${product.partId || ''}`
          .toLowerCase()
          .includes(fullSearch);

      return matchesCategory && matchesSearch;
    });
  }, [catalog, category, search, globalSearch, isSearchActive]);

  const add = (product: Product) => {
    if (product.type === 'Part') {
      if (product.stock <= 0) {
        notify(`Cannot sell "${product.name}": Out of Stock in inventory.`);
        return;
      }
      const existing = cart.find((item) => String(item.productId) === String(product.id));
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + 1 > product.stock) {
        notify(`Cannot add more. Only ${product.stock} unit(s) of "${product.name}" available in inventory.`);
        return;
      }
    }

    setCart((current) => {
      const existing = current.find((item) => String(item.productId) === String(product.id));
      if (existing) {
        return current.map((item) =>
          String(item.productId) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { productId: product.id, quantity: 1, discount: 0 }];
    });
  };

  const quantity = (id: string | number, delta: number) => {
    const item = cart.find((ci) => String(ci.productId) === String(id));
    if (!item) return;
    const product = productFor(item);

    if (delta > 0 && product.type === 'Part') {
      if (item.quantity + delta > product.stock) {
        notify(`Cannot exceed stock: Only ${product.stock} unit(s) of "${product.name}" available in inventory.`);
        return;
      }
    }

    setCart((current) =>
      current.map((row) => {
        if (String(row.productId) !== String(id)) return row;
        const newQty = Math.max(1, Math.min(999, row.quantity + delta));
        const maxDiscount = product.price * newQty;
        return {
          ...row,
          quantity: newQty,
          discount: Math.min(row.discount, maxDiscount),
        };
      })
    );
  };

  const saveDraft = () => {
    try {
      localStorage.setItem('garage-pos-draft', JSON.stringify({ cart, customer, payment, received, workOrder }));
      notify('Bill saved on this device.');
    } catch {
      notify('Your browser could not save this draft.');
    }
  };

  const generate = () => {
    if (!cart.length) {
      notify('Add at least one item to the invoice.');
      return;
    }
    if (!customer.name.trim()) {
      notify('Select a customer first.');
      return;
    }
    if (payment === 'Cash' && receivedValue < totals.total) {
      notify(`Amount received is short by ${q(totals.total - receivedValue)}.`);
      return;
    }

    // Verify stock constraints before completing sale
    for (const item of cart) {
      const product = productFor(item);
      if (product.type === 'Part' && item.quantity > product.stock) {
        notify(`Cannot generate invoice: "${product.name}" has only ${product.stock} in stock, but ${item.quantity} requested.`);
        return;
      }
    }

    commitInvoiceId(invoiceId);
    const invoice: Invoice = {
      id: invoiceId,
      customer: { ...customer },
      items: cart.map((item) => ({ ...item })),
      total: totals.total,
      payment,
      date: new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Qatar',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'Paid',
    };
    const updated = [invoice, ...invoices];
    try {
      localStorage.setItem('garage-pos-invoices', JSON.stringify(updated));
      localStorage.removeItem('garage-pos-draft');
    } catch {
      notify('Invoice created for this session; browser storage is unavailable.');
    }

    // Immediate local stock decrement
    setInventoryParts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find(
          (ci) => String(ci.productId) === String(p.id) || String(ci.productId) === String(p.partId)
        );
        if (cartItem) {
          return {
            ...p,
            quantity: Math.max(0, (Number(p.quantity) || 0) - cartItem.quantity),
          };
        }
        return p;
      })
    );

    // Save invoice to backend database as well
    invoicesApi
      .create({
        invoiceId: invoiceId,
        customer: customer.name || 'Direct Customer',
        phone: customer.phone || '',
        vehicle: customer.vehicle || 'Over The Counter',
        plate: customer.plate || '-',
        year: '2024',
        service: 'Parts Sale (POS)',
        detail: `${cart.length} inventory part(s) sold over-the-counter`,
        amount: totals.subtotal,
        discount: totals.discount,
        vat: totals.tax,
        total: totals.total,
        status: 'Paid',
        paymentMethod: payment === 'Card' ? 'Card' : payment === 'Bank Transfer' ? 'Bank Transfer' : 'Cash',
        date: new Date().toLocaleDateString('en-GB'),
        dueDate: new Date().toLocaleDateString('en-GB'),
        items: cart.map((item) => {
          const prod = productFor(item);
          return {
            name: prod.name,
            quantity: item.quantity,
            unitPrice: prod.price,
          };
        }),
        type: 'Parts',
      })
      .catch((err) => console.warn('Backend invoice save error:', err));

    // Sync sale to backend transactions (backend automatically deducts MongoDB inventory stock for 'Part' items)
    transactionsApi
      .create({
        transactionId: invoiceId,
        customer: { ...customer },
        items: cart.map((item) => {
          const product = productFor(item);
          return {
            productId: item.productId,
            name: product.name,
            type: product.type,
            price: product.price,
            quantity: item.quantity,
            discount: item.discount,
          };
        }),
        total: totals.total,
        payment,
        status: 'Paid',
      })
      .then(() => {
        loadInventory();
      })
      .catch((err) => console.warn('Transaction sync error:', err));

    setInvoices(updated);
    setReceipt(invoice);
    setCart([]);
    setReceived('');
    notify(`Invoice ${invoiceId} generated and inventory updated.`);
  };

  // Calculation of today's figures for metrics
  const todayPaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.status === 'Paid' || i.status === 'Partially Returned' || i.status === 'Returned');
  }, [invoices]);

  const todaySalesTotal = useMemo(() => {
    return todayPaidInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  }, [todayPaidInvoices]);

  const todayReturnsTotal = useMemo(() => {
    return returns.reduce((sum, r) => sum + (Number(r.totalRefund) || 0), 0);
  }, [returns]);

  const todayNetRevenue = Math.max(0, todaySalesTotal - todayReturnsTotal);

  const todayItemsSold = useMemo(() => {
    return todayPaidInvoices.reduce((sum, inv) => {
      const soldInInv = inv.items.reduce((s, it) => s + it.quantity, 0);
      return sum + soldInInv;
    }, 0);
  }, [todayPaidInvoices]);

  // Selected return invoice details
  const selectedReturnInvoice = useMemo(() => {
    return invoices.find((inv) => inv.id === selectedReturnInvoiceId) || null;
  }, [invoices, selectedReturnInvoiceId]);

  // Helper to get return availability for an item
  const getItemReturnInfo = (productId: string | number, originalQty: number) => {
    const priorReturned = returns
      .filter((r) => r.invoiceId === selectedReturnInvoiceId)
      .flatMap((r) => r.items)
      .filter((it) => String(it.productId) === String(productId))
      .reduce((s, it) => s + it.quantity, 0);
    const availableToReturn = Math.max(0, originalQty - priorReturned);
    return { priorReturned, availableToReturn };
  };

  // Total refund calculation based on return quantities
  const totalRefundAmount = useMemo(() => {
    if (!selectedReturnInvoice) return 0;
    return selectedReturnInvoice.items.reduce((sum, item) => {
      const qty = returnQuantities[String(item.productId)] || 0;
      const product = productFor(item);
      return sum + qty * product.price;
    }, 0);
  }, [selectedReturnInvoice, returnQuantities, catalog]);

  // Execute customer return & restock inventory
  const handleProcessReturn = async () => {
    if (!selectedReturnInvoice) {
      notify('Select an invoice to return items from.');
      return;
    }
    if (totalRefundAmount <= 0) {
      notify('Please specify at least 1 item quantity to return.');
      return;
    }

    const returnItems: ReturnItem[] = selectedReturnInvoice.items
      .filter((it) => (returnQuantities[String(it.productId)] || 0) > 0)
      .map((it) => {
        const prod = productFor(it);
        const qty = returnQuantities[String(it.productId)] || 0;
        return {
          productId: it.productId,
          name: prod.name,
          quantity: qty,
          unitPrice: prod.price,
          refund: qty * prod.price,
        };
      });

    const returnId = `RET-${String(returns.length + 1).padStart(4, '0')}`;

    // Restock parts to inventory
    if (restockToInventory) {
      for (const item of returnItems) {
        try {
          await partsApi.adjustStock(String(item.productId), {
            type: 'Add',
            quantity: item.quantity,
            notes: `POS Return ${returnId} for ${selectedReturnInvoice.id}`,
          });
        } catch (e) {
          console.warn('Restock error for part:', item.productId, e);
        }
      }
      loadInventory();
    }

    const newReturn: ReturnRecord = {
      returnId,
      invoiceId: selectedReturnInvoice.id,
      customer: selectedReturnInvoice.customer.name,
      date: new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Qatar',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      items: returnItems,
      totalRefund: totalRefundAmount,
      reason: returnReason,
      notes: returnNotes,
    };

    const updatedReturns = [newReturn, ...returns];
    setReturns(updatedReturns);
    try {
      localStorage.setItem('garage-pos-returns', JSON.stringify(updatedReturns));
    } catch {}

    // Check if fully returned or partially returned
    const allItemsFullyReturned = selectedReturnInvoice.items.every((it) => {
      const prior = returns
        .filter((r) => r.invoiceId === selectedReturnInvoice.id)
        .flatMap((r) => r.items)
        .filter((rit) => String(rit.productId) === String(it.productId))
        .reduce((s, rit) => s + rit.quantity, 0);
      const currentReturning = returnQuantities[String(it.productId)] || 0;
      return prior + currentReturning >= it.quantity;
    });

    const newStatus = allItemsFullyReturned ? 'Returned' : 'Partially Returned';
    const updatedInvoices = invoices.map((inv) =>
      inv.id === selectedReturnInvoice.id ? { ...inv, status: newStatus as any } : inv
    );
    setInvoices(updatedInvoices);
    try {
      localStorage.setItem('garage-pos-invoices', JSON.stringify(updatedInvoices));
    } catch {}

    // Reset return quantities
    setReturnQuantities({});
    setReturnNotes('');
    setActiveReturnSlip(newReturn);
    notify(`Return ${returnId} processed: ${q(totalRefundAmount)} refunded & inventory restocked.`);
  };

  // High-fidelity print handler
  const triggerPrint = (doc: { type: 'invoice'; data: Invoice } | { type: 'return'; data: ReturnRecord }) => {
    setPrintDoc(doc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'visible';
    setTimeout(() => {
      window.print();
      document.body.style.overflow = prev;
    }, 120);
  };

  const exportInvoice = (invoice: Invoice) => {
    const text = [
      'GARAGE WORKSPACE - PARTS INVOICE',
      invoice.id,
      invoice.date,
      invoice.customer.name,
      invoice.customer.vehicle,
      '',
      ...invoice.items.map(
        (item) =>
          `${productFor(item).name} x ${item.quantity}: ${q(
            calculateTotals([{ ...item, price: productFor(item).price, type: productFor(item).type }]).total
          )}`
      ),
      '',
      `Grand total: ${q(invoice.total)}`,
      `Payment: ${invoice.payment}`,
      'Parts sales tax receipt',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="pos-page">
      <div className="pos-overview">
        <div className="pos-heading">
          <span>
            <ShoppingCart size={37} />
          </span>
          <div>
            <h1>Parts POS &amp; Counter Sales</h1>
            <p>Direct counter sales, instant parts billing &amp; sales returns</p>
          </div>
        </div>
        <div className="pos-metrics">
          {(
            [
              [CreditCard, q(todaySalesTotal), "Today's Parts Sales", `${todayPaidInvoices.length} invoices recorded`, 'orange'],
              [RotateCcw, q(todayReturnsTotal), 'Returns & Refunds (Loss)', `${returns.length} returns processed`, 'red'],
              [TrendingUp, q(todayNetRevenue), 'Net Parts Revenue', 'Sales minus returns', 'green'],
              [Box, `${todayItemsSold} units`, 'Parts Sold Today', 'Dispatched from inventory', 'blue'],
            ] as [LucideIcon, string, string, string, string][]
          ).map(([Icon, value, label, detail, color]) => (
            <div className="pos-metric" key={label}>
              <span className={`stat-icon ${color}`}>
                <Icon size={24} />
              </span>
              <div>
                <strong>{value}</strong>
                <p>{label}</p>
                <small className={detail.startsWith('+') ? 'positive' : 'muted'}>{detail}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Top Navigation: Parts Sale vs Returns & Refunds */}
      <div className="tabs" role="tablist" style={{ margin: '14px 0 16px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === 'sale'}
          className={viewTab === 'sale' ? 'active' : ''}
          onClick={() => setViewTab('sale')}
        >
          <ShoppingCart size={15} />
          <span>Parts Sale POS</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === 'returns'}
          className={viewTab === 'returns' ? 'active' : ''}
          onClick={() => setViewTab('returns')}
        >
          <RotateCcw size={15} />
          <span>Sales Returns &amp; Refunds</span>
          {returns.length > 0 && <span className="badge ready" style={{ marginLeft: '6px', padding: '1px 6px', fontSize: '9px' }}>{returns.length}</span>}
        </button>
      </div>

      {viewTab === 'sale' ? (
        <div className="pos-layout">
          <div className="pos-left">
            <section className="panel pos-catalog">
              <div className="pos-customer-fields">
                <label className="customer-field">
                  Customer <b>*</b>
                  <div>
                    <User size={17} />
                    <input
                      aria-label="Customer Name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="Customer name (e.g. Counter Sale / Client)"
                    />
                    {registeredCustomers.length > 0 && (
                      <select
                        aria-label="Select existing customer"
                        className="pos-quick-customer-select"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          if (val === 'Direct Counter Sale') {
                            setCustomer({ name: 'Direct Counter Sale', phone: '', vehicle: '', plate: '' });
                            return;
                          }
                          const found = registeredCustomers.find(
                            (c: any) => (c.id || c.name) === val || c.name === val
                          );
                          if (found) {
                            setCustomer({
                              name: found.name,
                              phone: found.phone || '',
                              vehicle: found.vehicles?.[0]?.model || found.vehicle || '',
                              plate: found.vehicles?.[0]?.plate || found.plate || '',
                            });
                          }
                        }}
                      >
                        <option value="">Quick Pick Existing...</option>
                        <option value="Direct Counter Sale">Direct Counter Sale</option>
                        {registeredCustomers.map((c: any) => (
                          <option key={c.id || c.customerId || c.name} value={c.name}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
                <label>
                  Phone
                  <div>
                    <Phone size={16} />
                    <input
                      aria-label="Phone"
                      value={customer.phone}
                      onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                </label>
                <label className="vehicle-field">
                  Vehicle
                  <div>
                    <CarFront size={17} />
                    <input
                      aria-label="Vehicle"
                      value={customer.vehicle}
                      onChange={(event) => setCustomer({ ...customer, vehicle: event.target.value })}
                      placeholder="Vehicle / model"
                    />
                  </div>
                </label>
                <label className="plate-field">
                  Plate No.
                  <div>
                    <input
                      aria-label="Plate number"
                      value={customer.plate}
                      onChange={(event) => setCustomer({ ...customer, plate: event.target.value })}
                      placeholder="Plate"
                    />
                  </div>
                </label>
                <label className="work-field">
                  Work Order <span>(Optional)</span>
                  <div>
                    <Wrench size={15} />
                    <select
                      aria-label="Work order"
                      value={workOrder}
                      onChange={(event) => setWorkOrder(event.target.value)}
                    >
                      <option value="">None</option>
                    </select>
                  </div>
                </label>
              </div>

            <div className="catalog-toolbar">
              <div className="pos-search">
                <Search size={17} />
                <input
                  placeholder="Search services or inventory parts..."
                  aria-label="Search catalog"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="category-chips">
                {categoryList.map((label) => (
                  <button
                    key={label}
                    className={category.toLowerCase() === label.toLowerCase() ? 'active' : ''}
                    onClick={() => setCategory(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!isSearchActive ? (
              <div className="pos-search-prompt">
                <div className="pos-search-prompt-icon">
                  <PackageSearch size={26} strokeWidth={2} />
                </div>
                <h3>Search to View &amp; Add Items</h3>
                <p>
                  Type a part name, OEM number, brand, or select a category above to find and add items.
                </p>
                <div className="pos-search-prompt-chips">
                  <span>Quick Search:</span>
                  {['Brakes', 'Filters', 'Engine Oil', 'Battery', 'Spark Plugs', 'Wiper Blades'].map((term) => (
                    <button
                      type="button"
                      key={term}
                      className="pos-prompt-chip"
                      onClick={() => setSearch(term)}
                    >
                      <Search size={11} /> {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="pos-search-results-header">
                  <span>
                    Found <strong>{available.length}</strong> {available.length === 1 ? 'item' : 'items'}
                    {search.trim() && <> matching &ldquo;<strong>{search.trim()}</strong>&rdquo;</>}
                    {category !== 'All Items' && <> in &ldquo;<strong>{category}</strong>&rdquo;</>}
                  </span>
                  <button
                    type="button"
                    className="pos-clear-filter-btn"
                    onClick={() => {
                      setSearch('');
                      setCategory('All Items');
                    }}
                  >
                    <X size={12} /> Clear Filter
                  </button>
                </div>

                {/* Inventory Products Grid */}
                <div className="product-grid">
                  {available.map((product) => {
                    const isOutOfStock = product.type === 'Part' && product.stock <= 0;
                    return (
                      <button
                        className={`product-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}
                        key={String(product.id)}
                        onClick={() => {
                          if (isOutOfStock) {
                            notify(`"${product.name}" is Out of Stock in inventory and cannot be sold.`);
                            return;
                          }
                          add(product);
                        }}
                        aria-label={`Add ${product.name}`}
                        disabled={isOutOfStock}
                        title={
                          isOutOfStock
                            ? `${product.name} is Out of Stock`
                            : product.type === 'Part'
                            ? `Available in inventory: ${product.stock}`
                            : 'Service'
                        }
                        style={{
                          opacity: isOutOfStock ? 0.6 : 1,
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          borderColor: isOutOfStock ? '#fecaca' : undefined,
                          background: isOutOfStock ? '#fff5f5' : undefined,
                        }}
                      >
                        <span className={`product-art ${product.color}`}>
                          <product.icon size={34} strokeWidth={1.5} />
                        </span>
                        <span className="product-description">
                          <strong>{product.name}</strong>
                          <small>{product.detail}</small>
                          <b>{q(product.price)}</b>
                          {product.type === 'Part' && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '3px',
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 7px',
                                borderRadius: '10px',
                                background: isOutOfStock ? '#fee2e2' : product.stock <= 5 ? '#fef3c7' : '#ecfdf5',
                                color: isOutOfStock ? '#dc2626' : product.stock <= 5 ? '#d97706' : '#059669',
                              }}
                            >
                              {isOutOfStock ? 'Out of Stock (0)' : `${product.stock} in stock`}
                            </span>
                          )}
                        </span>
                        <span
                          className="add-product"
                          style={{
                            background: isOutOfStock ? '#fee2e2' : undefined,
                            color: isOutOfStock ? '#dc2626' : undefined,
                          }}
                        >
                          {isOutOfStock ? <X size={15} /> : <Plus size={17} />}
                        </span>
                      </button>
                    );
                  })}
                  {available.length === 0 && (
                    <div className="catalog-empty">
                      <PackageSearch size={32} style={{ color: '#ff631c', margin: '0 auto 8px' }} />
                      <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>
                        No Matching Items Found
                      </strong>
                      <p style={{ margin: '4px 0 12px', fontSize: '11px', color: '#64748b' }}>
                        {isLoadingParts
                          ? 'Loading parts from inventory...'
                          : `No inventory parts match "${search || category}". Check spelling or try another keyword.`}
                      </p>
                      <button
                        type="button"
                        className="pos-clear-filter-btn"
                        onClick={() => {
                          setSearch('');
                          setCategory('All Items');
                        }}
                      >
                        <X size={12} /> Reset Search
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Cart Section */}
          <section className="panel pos-cart">
            <div className="panel-title">
              <div>
                <ShoppingCart size={22} />
                <h2>
                  Invoice Items <span>({cart.length} items)</span>
                </h2>
              </div>
              <button className="clear-button" onClick={() => setCart([])} disabled={!cart.length}>
                <Trash2 size={15} />
                Clear All
              </button>
            </div>
            <div className="table-scroll">
              <table className="invoice-table">
                <thead>
                  <tr>
                    {['#', 'Item', 'Type', 'Qty', 'Unit Price (QAR)', 'Discount', 'Tax (5%)', 'Total (QAR)', 'Action'].map(
                      (label) => (
                        <th key={label}>{label}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => {
                    const product = productFor(item);
                    const line = calculateTotals([{ ...item, price: product.price, type: product.type }]);
                    const isMaxStock = product.type === 'Part' && item.quantity >= product.stock;
                    return (
                      <tr key={String(item.productId)}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="cart-product">
                            <span className={`product-art ${product.color}`}>
                              <product.icon size={25} />
                            </span>
                            <span>
                              <strong>{product.name}</strong>
                              <small>
                                {product.detail}
                                {product.type === 'Part' && ` · Stock: ${product.stock}`}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${product.type === 'Service' ? 'ready' : ''}`}>{product.type}</span>
                        </td>
                        <td>
                          <div className="quantity-control">
                            <button
                              aria-label={`Decrease ${product.name} quantity`}
                              disabled={item.quantity <= 1}
                              onClick={() => quantity(item.productId, -1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={`Increase ${product.name} quantity`}
                              disabled={isMaxStock || item.quantity >= 999}
                              onClick={() => quantity(item.productId, 1)}
                              title={isMaxStock ? `Max available stock reached (${product.stock})` : undefined}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td>{number(product.price)}</td>
                        <td>
                          <input
                            className="discount-input"
                            aria-label={`Discount for ${product.name}`}
                            type="number"
                            min="0"
                            max={product.price * item.quantity}
                            step="0.01"
                            value={item.discount}
                            onChange={(event) => {
                              const value = Math.max(
                                0,
                                Math.min(product.price * item.quantity, Number(event.target.value) || 0)
                              );
                              setCart((current) =>
                                current.map((row) =>
                                  String(row.productId) === String(item.productId)
                                    ? { ...row, discount: Math.round(value * 100) / 100 }
                                    : row
                                )
                              );
                            }}
                          />
                        </td>
                        <td>{number(line.tax)}</td>
                        <td>
                          <strong>{number(line.total)}</strong>
                        </td>
                        <td>
                          <button
                            className="delete-item"
                            aria-label={`Remove ${product.name}`}
                            onClick={() =>
                              setCart((current) => current.filter((row) => String(row.productId) !== String(item.productId)))
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!cart.length && (
              <div className="cart-empty">
                <ShoppingCart size={28} />
                <p>Your cart is empty. Select an inventory part or service above.</p>
              </div>
            )}
          </section>

          {/* Bottom Grid: Recent Invoices (Quick Shortcuts removed) */}
          <div className="pos-bottom-grid">
            <section className="panel recent-invoices">
              <div className="panel-title">
                <div>
                  <FileText size={23} />
                  <h2>Recent Invoices</h2>
                </div>
                <button className="text-link" onClick={() => setShowAll(!showAll)}>
                  {showAll ? 'Show less' : 'View all'}
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {['Invoice No.', 'Date & Time', 'Customer', 'Vehicle', 'Total (QAR)', 'Status'].map((label) => (
                        <th key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? invoices : invoices.slice(0, 5)).map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <button className="order-id" onClick={() => setReceipt(invoice)}>
                            {invoice.id}
                          </button>
                        </td>
                        <td>{invoice.date}</td>
                        <td>{invoice.customer.name}</td>
                        <td>{invoice.customer.vehicle}</td>
                        <td>{number(invoice.total)}</td>
                        <td>
                          <span className={`badge ${invoice.status === 'Paid' ? 'ready' : ''}`}>{invoice.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        {/* Right Summary Sidebar */}
        <aside className="panel pos-summary">
          <div className="invoice-heading">
            <FileText size={31} />
            <div>
              <small>Invoice No.</small>
              <h2>{invoiceId}</h2>
            </div>
            <span>Walk-in Sale</span>
          </div>
          <p className="invoice-date">Local invoice preview</p>
          <div className="customer-summary">
            <div>
              <User size={17} />
              <strong>{customer.name}</strong>
              <Phone size={15} />
              <span>{customer.phone || '—'}</span>
            </div>
            <div>
              <CarFront size={17} />
              <span>{customer.vehicle || 'No vehicle selected'}</span>
              <span>Plate: {customer.plate || '—'}</span>
            </div>
          </div>
          <h3>Billing Summary</h3>
          <dl className="billing-breakdown">
            <div>
              <dt>Parts Total ({cart.filter((item) => productFor(item).type === 'Part').length} items)</dt>
              <dd>{q(totals.parts)}</dd>
            </div>
            <div>
              <dt>Service Charges ({cart.filter((item) => productFor(item).type === 'Service').length} items)</dt>
              <dd>{q(totals.services)}</dd>
            </div>
            <div className="subtotal">
              <dt>Subtotal</dt>
              <dd>{q(totals.subtotal)}</dd>
            </div>
            <div>
              <dt>Discount (-)</dt>
              <dd className="discount-value">{q(totals.discount)}</dd>
            </div>
            <div>
              <dt>VAT (5%)</dt>
              <dd>{q(totals.tax)}</dd>
            </div>
          </dl>
          <div className="grand-total">
            <strong>Grand Total</strong>
            <strong>{q(totals.total)}</strong>
          </div>
          <h3 className="payment-title">
            <CreditCard size={18} />
            Payment Method
          </h3>
          <div className="payment-methods">
            {(
              [
                [Banknote, 'Cash'],
                [CreditCard, 'Card'],
                [Landmark, 'Bank'],
              ] as [LucideIcon, string][]
            ).map(([Icon, label]) => (
              <button
                key={label}
                className={payment === label ? 'active' : ''}
                onClick={() => setPayment(label)}
                aria-pressed={payment === label}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          {payment === 'Cash' ? (
            <div className="cash-fields">
              <label>
                <Banknote size={16} />
                Amount Received (QAR)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                <Landmark size={16} />
                {receivedValue >= totals.total ? 'Change (QAR)' : 'Amount Due (QAR)'}
                <output className={receivedValue < totals.total ? 'amount-due' : ''}>
                  {number(receivedValue >= totals.total ? change : totals.total - receivedValue)}
                </output>
              </label>
            </div>
          ) : (
            <p className="payment-note">{payment === 'Card' ? 'Card' : 'Bank transfer'} payment recorded locally.</p>
          )}
          <button className="generate-invoice" onClick={generate} disabled={!cart.length}>
            <FileText size={19} />
            Generate Invoice
          </button>
          <button className="save-draft" onClick={saveDraft}>
            <Save size={18} />
            Save Draft
          </button>
          <div className="summary-actions">
            <button
              onClick={() => {
                if (invoices[0]) setReceipt(invoices[0]);
              }}
            >
              <Printer size={15} />
              Last Invoice
            </button>
            <button
              onClick={() => {
                if (invoices[0]) exportInvoice(invoices[0]);
              }}
            >
              <Download size={15} />
              Export Last
            </button>
            <button className="clear-button" onClick={() => setCart([])}>
              <Trash2 size={15} />
              Clear Cart
            </button>
          </div>
          <small className="pos-demo-note">Frontend demo · invoices and drafts stay on this device</small>
        </aside>
      </div>
      ) : (
        /* SALES RETURNS & REFUNDS VIEW */
        <div className="pos-bottom-grid" style={{ gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 1fr)', gap: '14px', alignItems: 'start' }}>
          <section className="panel" style={{ padding: '16px' }}>
            <div className="panel-title">
              <div>
                <RotateCcw size={18} />
                <h2>Process Parts Return &amp; Customer Refund</h2>
              </div>
            </div>

            <div className="pos-customer-fields" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', padding: '0 0 14px' }}>
              <label>
                Select Invoice to Return *
                <CustomDropdown
                  value={selectedReturnInvoiceId}
                  onChange={(val) => {
                    setSelectedReturnInvoiceId(val);
                    setReturnQuantities({});
                  }}
                  icon={FileText}
                  placeholder={`-- Choose Paid Invoice (${invoices.length} available) --`}
                  options={[
                    { value: '', label: `-- Choose Paid Invoice (${invoices.length} available) --` },
                    ...invoices.map((inv) => ({
                      value: inv.id,
                      label: `${inv.id} — ${inv.customer.name || 'Direct Customer'}`,
                      detail: `${inv.date} · Paid`,
                      badge: q(inv.total),
                      badgeColor: 'orange' as const,
                    })),
                  ]}
                />
              </label>

              <label>
                Reason for Return *
                <CustomDropdown
                  value={returnReason}
                  onChange={(val) => setReturnReason(val)}
                  icon={AlertTriangle}
                  options={[
                    { value: 'Defective / Damaged Part', label: 'Defective / Damaged Part', detail: 'Part failed quality check' },
                    { value: 'Wrong Part Supplied', label: 'Wrong Part Supplied', detail: 'Mismatch with customer order' },
                    { value: 'Customer Changed Mind / Unneeded', label: 'Customer Changed Mind / Unneeded', detail: 'Customer return' },
                    { value: 'Fitting Issue / Incompatible', label: 'Fitting Issue / Incompatible', detail: 'Does not fit vehicle' },
                    { value: 'Warranty Claim', label: 'Warranty Claim', detail: 'Manufacturer warranty' },
                    { value: 'Other', label: 'Other', detail: 'Special remarks in notes' },
                  ]}
                />
              </label>
            </div>

            {selectedReturnInvoice ? (
              <div>
                <div className="customer-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '14px', padding: '10px 12px' }}>
                  <div><User size={14} /><span>Customer: <strong>{selectedReturnInvoice.customer.name || 'Direct Customer'}</strong></span></div>
                  <div><Phone size={14} /><span>Phone: <strong>{selectedReturnInvoice.customer.phone || '—'}</strong></span></div>
                  <div><CalendarDays size={14} /><span>Date: <strong>{selectedReturnInvoice.date}</strong></span></div>
                  <div><Banknote size={14} /><span>Paid: <strong>{q(selectedReturnInvoice.total)}</strong></span></div>
                </div>

                <div className="table-scroll" style={{ marginBottom: '14px' }}>
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Part Name</th>
                        <th style={{ textAlign: 'center' }}>Sold</th>
                        <th style={{ textAlign: 'center' }}>Returned</th>
                        <th style={{ textAlign: 'center' }}>Available</th>
                        <th style={{ textAlign: 'center', width: '110px' }}>Return Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Refund Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturnInvoice.items.map((item, idx) => {
                        const prod = productFor(item);
                        const { priorReturned, availableToReturn } = getItemReturnInfo(item.productId, item.quantity);
                        const curReturnQty = returnQuantities[String(item.productId)] || 0;
                        const lineRefund = curReturnQty * prod.price;

                        return (
                          <tr key={String(item.productId)}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{prod.name}</strong>
                              <small style={{ display: 'block', color: '#6b7c96' }}>{prod.detail}</small>
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'center', color: '#8a99b1' }}>{priorReturned}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${availableToReturn > 0 ? 'ready' : 'pending'}`}>
                                {availableToReturn}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="quantity-control" style={{ margin: 'auto' }}>
                                <button
                                  type="button"
                                  disabled={curReturnQty <= 0}
                                  onClick={() =>
                                    setReturnQuantities((prev) => ({
                                      ...prev,
                                      [String(item.productId)]: Math.max(0, curReturnQty - 1),
                                    }))
                                  }
                                >
                                  -
                                </button>
                                <span>{curReturnQty}</span>
                                <button
                                  type="button"
                                  disabled={curReturnQty >= availableToReturn}
                                  onClick={() =>
                                    setReturnQuantities((prev) => ({
                                      ...prev,
                                      [String(item.productId)]: Math.min(availableToReturn, curReturnQty + 1),
                                    }))
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>{number(prod.price)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: lineRefund > 0 ? '#ff301e' : '#17223a' }}>
                              {q(lineRefund)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, color: '#253857', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={restockToInventory}
                      onChange={(e) => setRestockToInventory(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#ff6218' }}
                    />
                    <span>Automatically restore returned items back to warehouse inventory stock</span>
                  </label>

                  <div className="pos-customer-fields" style={{ display: 'grid', gridTemplateColumns: '1fr', padding: '0 0 4px' }}>
                    <label style={{ width: '100%' }}>
                      Optional Return Notes
                      <div>
                        <input
                          placeholder="Add optional notes or remarks for this return..."
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                        />
                      </div>
                    </label>
                  </div>

                  <div className="grand-total" style={{ marginTop: '4px' }}>
                    <span>Total Refund Payable</span>
                    <strong style={{ color: totalRefundAmount > 0 ? '#ff301e' : '#17223a' }}>{q(totalRefundAmount)}</strong>
                  </div>

                  <button
                    type="button"
                    className="generate-invoice"
                    style={{ marginTop: '4px' }}
                    disabled={totalRefundAmount <= 0}
                    onClick={handleProcessReturn}
                  >
                    <RotateCcw size={16} />
                    Process Return &amp; Refund Customer
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '36px 12px' }}>
                <RotateCcw size={32} />
                <p>Select a paid invoice from the dropdown above to begin processing a return and restock parts.</p>
              </div>
            )}
          </section>

          {/* Recent Returns History */}
          <section className="panel recent-invoices" style={{ padding: '16px' }}>
            <div className="panel-title">
              <div>
                <Receipt size={18} />
                <h2>Recent Parts Returns &amp; Credit Notes ({returns.length})</h2>
              </div>
            </div>

            {returns.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px 12px' }}>
                <Receipt size={32} />
                <p>No returns recorded yet. All sales are intact.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Return Slip</th>
                      <th>Invoice No.</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Reason</th>
                      <th style={{ textAlign: 'right' }}>Refund</th>
                      <th style={{ textAlign: 'center' }}>Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((ret) => (
                      <tr key={ret.returnId}>
                        <td><strong>{ret.returnId}</strong></td>
                        <td><span className="order-id">{ret.invoiceId}</span></td>
                        <td className="muted">{ret.date}</td>
                        <td>{ret.customer}</td>
                        <td>{ret.items.length} item(s)</td>
                        <td><span className="badge pending">{ret.reason}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#ff301e' }}>
                          -{q(ret.totalRefund)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="crm-table-view-btn"
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                            onClick={() => {
                              setActiveReturnSlip(ret);
                              triggerPrint({ type: 'return', data: ret });
                            }}
                            title="Reprint Credit Note"
                          >
                            <Printer size={12} />
                            <span>Slip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Invoice Details Modal */}
      {receipt && (
        <div className="modal-backdrop receipt-backdrop" onClick={() => setReceipt(null)}>
          <section
            className="modal receipt"
            role="dialog"
            aria-modal="true"
            aria-label={`Invoice ${receipt.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>Parts Invoice {receipt.id}</h2>
              <button className="icon-button" aria-label="Close invoice" onClick={() => setReceipt(null)}>
                <X />
              </button>
            </div>
            <div className="receipt-brand-clean">
              <img src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`} alt="Garage CRM" />
              <div>
                <h3>DOHA CENTRAL GARAGE</h3>
                <p>Parts &amp; Auto Accessories Hub · Doha, Qatar</p>
              </div>
            </div>
            <p className="receipt-state">
              <Check size={17} />
              {receipt.status}
            </p>
            <p className="receipt-meta-line">{receipt.date} · Qatar time</p>
            <div className="receipt-cust-box">
              <strong>{receipt.customer.name || 'Direct Customer'}</strong>
              <p>
                {receipt.customer.phone ? `Tel: ${receipt.customer.phone}` : 'Counter Sale'}
                {receipt.customer.vehicle ? ` · ${receipt.customer.vehicle} (${receipt.customer.plate})` : ''}
              </p>
            </div>

            <div className="receipt-items-list">
              {receipt.items.map((item) => {
                const prod = productFor(item);
                const lineTotal = prod.price * item.quantity;
                return (
                  <div className="receipt-line" key={String(item.productId)}>
                    <div>
                      <span>{prod.name} × {item.quantity}</span>
                      <small style={{ display: 'block', color: '#64748b', fontSize: '10px' }}>{prod.detail}</small>
                    </div>
                    <strong>{q(lineTotal)}</strong>
                  </div>
                );
              })}
            </div>

            {!receipt.items.length && <p className="muted">Line item details are unavailable.</p>}
            <div className="grand-total">
              <strong>Total (Incl. VAT)</strong>
              <strong>{q(receipt.total)}</strong>
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              Payment Mode: <strong>{receipt.payment}</strong>
            </p>

            <div className="receipt-actions">
              <button className="primary-button" onClick={() => triggerPrint({ type: 'invoice', data: receipt })}>
                <Printer size={17} />
                Print Invoice
              </button>
              <button className="subtle-button" onClick={() => exportInvoice(receipt)}>
                <Download size={17} />
                Download Text
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Credit Note / Return Modal */}
      {activeReturnSlip && (
        <div className="modal-backdrop receipt-backdrop" onClick={() => setActiveReturnSlip(null)}>
          <section
            className="modal receipt"
            role="dialog"
            aria-modal="true"
            aria-label={`Credit Note ${activeReturnSlip.returnId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>Credit Note {activeReturnSlip.returnId}</h2>
              <button className="icon-button" aria-label="Close" onClick={() => setActiveReturnSlip(null)}>
                <X />
              </button>
            </div>
            <div className="receipt-brand-clean">
              <img src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`} alt="Garage CRM" />
              <div>
                <h3 style={{ color: '#dc2626' }}>PARTS RETURN VOUCHER</h3>
                <p>Credit Note · Doha Central Workshop</p>
              </div>
            </div>
            <p className="receipt-state" style={{ color: '#dc2626' }}>
              <RotateCcw size={17} />
              Return Processed &amp; Inventory Restocked
            </p>
            <p className="receipt-meta-line">{activeReturnSlip.date} · Qatar time</p>
            <div className="receipt-cust-box">
              <strong>{activeReturnSlip.customer}</strong>
              <p>Original Invoice: #{activeReturnSlip.invoiceId} · Reason: {activeReturnSlip.reason}</p>
            </div>

            <div className="receipt-items-list">
              {activeReturnSlip.items.map((item, idx) => (
                <div className="receipt-line" key={idx}>
                  <span>{item.name} × {item.quantity}</span>
                  <strong style={{ color: '#dc2626' }}>- {q(item.refund)}</strong>
                </div>
              ))}
            </div>

            <div className="grand-total" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <strong style={{ color: '#dc2626' }}>Total Refund Paid</strong>
              <strong style={{ color: '#dc2626' }}>{q(activeReturnSlip.totalRefund)}</strong>
            </div>

            <div className="receipt-actions">
              <button className="primary-button" onClick={() => triggerPrint({ type: 'return', data: activeReturnSlip })}>
                <Printer size={17} />
                Print Return Slip
              </button>
              <button className="subtle-button" onClick={() => setActiveReturnSlip(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Direct Clean Print Document (Hidden on screen, 100% visible and formatted in Print) */}
      {printDoc && (
        <div id="pos-printable-receipt" className="pos-printable-receipt">
          {printDoc.type === 'invoice' ? (
            <div className="pos-print-document">
              <div className="pos-print-header">
                <div className="pos-print-brand">
                  <img src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`} alt="Garage Logo" />
                  <div>
                    <h2>DOHA CENTRAL GARAGE &amp; AUTO PARTS</h2>
                    <p>Industrial Area, Street 15, Doha - Qatar | Tel: +974 4455 6677</p>
                    <p>Tax Reg. (TRN): QTR-VAT-9021884 | Commercial Reg: 10293847</p>
                  </div>
                </div>
                <div className="pos-print-badge-box">
                  <h1>PARTS TAX INVOICE</h1>
                  <span className="badge-paid-print">ORIGINAL RECEIPT (PAID)</span>
                </div>
              </div>

              <div className="pos-print-meta-grid">
                <div>
                  <span>Invoice No:</span>
                  <strong>{printDoc.data.id}</strong>
                </div>
                <div>
                  <span>Date &amp; Time:</span>
                  <strong>{printDoc.data.date}</strong>
                </div>
                <div>
                  <span>Customer Name:</span>
                  <strong>{printDoc.data.customer.name || 'Direct Customer'}</strong>
                </div>
                <div>
                  <span>Phone Number:</span>
                  <strong>{printDoc.data.customer.phone || 'N/A'}</strong>
                </div>
                <div>
                  <span>Vehicle / Plate:</span>
                  <strong>
                    {printDoc.data.customer.vehicle
                      ? `${printDoc.data.customer.vehicle} (${printDoc.data.customer.plate})`
                      : 'Over The Counter'}
                  </strong>
                </div>
                <div>
                  <span>Payment Mode:</span>
                  <strong>{printDoc.data.payment} (Settled)</strong>
                </div>
              </div>

              <table className="pos-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th>Part Name &amp; Description</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Unit Price (QAR)</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Line Total (QAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {printDoc.data.items.map((item, idx) => {
                    const prod = productFor(item);
                    const lineTotal = prod.price * item.quantity;
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{prod.name}</strong>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                            {prod.detail}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{number(prod.price)}</td>
                        <td style={{ textAlign: 'right' }}>{number(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pos-print-summary-grid">
                <div className="pos-print-terms">
                  <strong>Return &amp; Warranty Terms:</strong>
                  <ul>
                    <li>Parts return / exchange accepted within 7 days with this original receipt.</li>
                    <li>Items must be undamaged, uninstalled, in original factory packaging.</li>
                    <li>Electrical &amp; electronic components are non-returnable once fitted.</li>
                  </ul>
                </div>
                <div className="pos-print-totals">
                  <div className="pos-print-row">
                    <span>Subtotal:</span>
                    <strong>{q(printDoc.data.total / 1.05)}</strong>
                  </div>
                  <div className="pos-print-row">
                    <span>VAT (5%):</span>
                    <strong>{q(printDoc.data.total - printDoc.data.total / 1.05)}</strong>
                  </div>
                  <div className="pos-print-row grand">
                    <span>Net Grand Total:</span>
                    <strong>{q(printDoc.data.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="pos-print-signatures">
                <div>
                  <div className="sign-box-line" />
                  <p>Customer Signature</p>
                </div>
                <div>
                  <div className="sign-box-line" />
                  <p>Authorized Cashier / Workshop Stamp</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="pos-print-document return-document">
              <div className="pos-print-header">
                <div className="pos-print-brand">
                  <img src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`} alt="Garage Logo" />
                  <div>
                    <h2>DOHA CENTRAL GARAGE &amp; AUTO PARTS</h2>
                    <p>Industrial Area, Street 15, Doha - Qatar | Tel: +974 4455 6677</p>
                    <p>Tax Reg. (TRN): QTR-VAT-9021884 | Commercial Reg: 10293847</p>
                  </div>
                </div>
                <div className="pos-print-badge-box">
                  <h1 style={{ color: '#dc2626' }}>CREDIT NOTE / RETURN</h1>
                  <span className="badge-paid-print" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    REFUND ISSUED
                  </span>
                </div>
              </div>

              <div className="pos-print-meta-grid">
                <div>
                  <span>Return Slip No:</span>
                  <strong>{printDoc.data.returnId}</strong>
                </div>
                <div>
                  <span>Original Invoice:</span>
                  <strong>{printDoc.data.invoiceId}</strong>
                </div>
                <div>
                  <span>Return Date:</span>
                  <strong>{printDoc.data.date}</strong>
                </div>
                <div>
                  <span>Customer Name:</span>
                  <strong>{printDoc.data.customer}</strong>
                </div>
                <div>
                  <span>Return Reason:</span>
                  <strong>{printDoc.data.reason}</strong>
                </div>
                <div>
                  <span>Total Refund:</span>
                  <strong style={{ color: '#dc2626' }}>{q(printDoc.data.totalRefund)}</strong>
                </div>
              </div>

              <table className="pos-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th>Returned Part Description</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Unit Price (QAR)</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Refund (QAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {printDoc.data.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{item.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{number(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                        {number(item.refund)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pos-print-summary-grid">
                <div className="pos-print-terms">
                  <p>Returned items have been inspected and restocked back into inventory.</p>
                  <p>Cash/Card refund has been successfully settled with customer.</p>
                </div>
                <div className="pos-print-totals">
                  <div className="pos-print-row grand" style={{ color: '#dc2626' }}>
                    <span>Total Refund Settled:</span>
                    <strong style={{ color: '#dc2626' }}>{q(printDoc.data.totalRefund)}</strong>
                  </div>
                </div>
              </div>

              <div className="pos-print-signatures">
                <div>
                  <div className="sign-box-line" />
                  <p>Customer Signature (Received Refund)</p>
                </div>
                <div>
                  <div className="sign-box-line" />
                  <p>Authorized Cashier / Manager</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
