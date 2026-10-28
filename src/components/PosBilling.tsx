import { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Box,
  CarFront,
  Check,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Minus,
  Package,
  Phone,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  User,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { calculateTotals } from '../lib/billing';
import { partsApi, transactionsApi } from '../lib/api';
import { getNextInvoiceId, commitInvoiceId } from '../lib/sequence';

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
  status: 'Paid' | 'Pending';
};

const defaultServices: Product[] = [
  { id: 'svc-1', name: 'Wheel Alignment', detail: '4 wheel computerized alignment', price: 200, type: 'Service', category: 'Services', stock: 9999, icon: Wrench, color: 'alignment' },
  { id: 'svc-2', name: 'Full Polish & Wax', detail: 'Exterior buffing & interior detailing', price: 350, type: 'Service', category: 'Services', stock: 9999, icon: CarFront, color: 'polish' },
  { id: 'svc-3', name: 'AC Gas & Cleaning', detail: 'R134a refrigerant refill & filter clean', price: 180, type: 'Service', category: 'Services', stock: 9999, icon: Wrench, color: 'ac' },
  { id: 'svc-4', name: 'Tire Rotation & Balance', detail: '4 tires rotation & electronic balance', price: 80, type: 'Service', category: 'Services', stock: 9999, icon: Settings, color: 'tire' },
  { id: 'svc-5', name: 'Car Wash & Sanitization', detail: 'High pressure foam wash & vacuum', price: 50, type: 'Service', category: 'Services', stock: 9999, icon: CarFront, color: 'wash' },
  { id: 'svc-6', name: 'Computer OBD Diagnostics', detail: 'Full ECU & sensors fault code scan', price: 150, type: 'Service', category: 'Services', stock: 9999, icon: Settings, color: 'alignment' },
];

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

const customers: Customer[] = [
  { name: 'Walk-in Customer', phone: '', vehicle: '', plate: '' },
];
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
  ['name', 'phone', 'vehicle', 'plate'].every(key => typeof (value as Record<string, unknown>)[key] === 'string');

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
          ['Paid', 'Pending'].includes(item.status)
      )
      ? value
      : [];
  } catch {
    return [];
  }
}

export default function PosBilling({
  globalSearch,
  notify,
  refreshTrigger,
}: {
  globalSearch: string;
  notify: (message: string) => void;
  refreshTrigger?: number;
}) {
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(sampleCart);
  const [customer, setCustomer] = useState<Customer>(customers[0]);
  const [mode, setMode] = useState<'Service Sale' | 'Parts Sale' | 'Mixed Bill'>('Parts Sale');
  const [category, setCategory] = useState('All Items');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [received, setReceived] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>(readInvoices);
  const [receipt, setReceipt] = useState<Invoice | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);

  // Fetch actual parts from inventory database
  const loadInventory = () => {
    setIsLoadingParts(true);
    partsApi
      .getAll({ limit: 200 })
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
    if (!receipt && !addingCustomer) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.pos-page [role="dialog"]');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('input, button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReceipt(null);
        setAddingCustomer(false);
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
  }, [receipt, addingCustomer]);

  // Combine inventory parts with services for POS Catalog
  const catalog: Product[] = useMemo(() => {
    const partsProducts: Product[] = inventoryParts.map((part) => {
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

    return [...partsProducts, ...defaultServices];
  }, [inventoryParts]);

  const productFor = (item: CartItem): Product => {
    const found = catalog.find((product) => String(product.id) === String(item.productId));
    if (found) return found;
    return {
      id: item.productId,
      name: 'Car Part / Service',
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
    const cats = new Set<string>();
    cats.add('All Items');
    if (mode === 'Service Sale' || mode === 'Mixed Bill') {
      cats.add('Services');
    }
    if (mode === 'Parts Sale' || mode === 'Mixed Bill') {
      inventoryParts.forEach((p) => {
        if (p.category) cats.add(p.category);
      });
    }
    return Array.from(cats);
  }, [mode, inventoryParts]);

  const pricedItems = cart.map((item) => ({
    ...item,
    price: productFor(item).price,
    type: productFor(item).type,
  }));
  const totals = calculateTotals(pricedItems);
  const receivedValue = Number(received) || 0;
  const change = Math.max(0, Math.round((receivedValue - totals.total) * 100) / 100);
  const invoiceId = getNextInvoiceId(invoices);

  const available = useMemo(() => {
    return catalog.filter((product) => {
      const matchesMode =
        mode === 'Mixed Bill' ||
        product.type === (mode === 'Service Sale' ? 'Service' : 'Part');
      const matchesCategory =
        category === 'All Items' || product.category === category;
      const fullSearch = `${search} ${globalSearch}`.trim().toLowerCase();
      const matchesSearch =
        !fullSearch ||
        `${product.name} ${product.detail} ${product.category} ${product.partId || ''}`
          .toLowerCase()
          .includes(fullSearch);

      return matchesMode && matchesCategory && matchesSearch;
    });
  }, [catalog, mode, category, search, globalSearch]);

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

    // Sync sale to backend (backend automatically deducts MongoDB inventory stock for 'Part' items)
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

  const exportInvoice = (invoice: Invoice) => {
    const text = [
      'GARAGE WORKSPACE',
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
      'Frontend demonstration invoice',
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
            <h1>POS Billing</h1>
            <p>Create invoices for services and parts sales</p>
          </div>
        </div>
        <div className="pos-metrics">
          {(
            [
              [ShoppingCart, String(cart.length), 'Open Cart', cart.length ? `${cart.length} items in cart` : 'Cart is empty', 'orange'],
              [FileText, String(invoices.length), 'Today Bills', invoices.length ? `${invoices.length} recorded` : 'No bills yet', 'blue'],
              [Users, String(invoices.filter((i) => i.customer.name === 'Walk-in Customer').length), 'Walk-in Sales', 'From this session', 'green'],
              [FileText, q(invoices.filter((i) => i.status === 'Pending').reduce((s, i) => s + i.total, 0)), 'Pending Payments', `${invoices.filter((i) => i.status === 'Pending').length} invoices`, 'orange'],
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

      <div className="pos-layout">
        <div className="pos-left">
          <section className="panel pos-catalog">
            <div className="pos-customer-fields">
              <label className="customer-field">
                Customer <b>*</b>
                <div>
                  <User size={17} />
                  <select
                    aria-label="Customer"
                    value={customer.name}
                    onChange={(event) => {
                      const selected = [...customers, ...extraCustomers].find((item) => item.name === event.target.value);
                      if (selected) setCustomer(selected);
                      else setCustomer({ name: 'Walk-in Customer', phone: '', vehicle: '', plate: '' });
                    }}
                  >
                    <option>Walk-in Customer</option>
                    {customer.name !== 'Walk-in Customer' &&
                      ![...customers, ...extraCustomers].some((item) => item.name === customer.name) && (
                        <option>{customer.name}</option>
                      )}
                    {[...customers, ...extraCustomers].map((item) => (
                      <option key={item.name}>{item.name}</option>
                    ))}
                  </select>
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

            <div className="sale-tabs" role="tablist" aria-label="Sale type">
              {(
                [
                  [Wrench, 'Service Sale'],
                  [Box, 'Parts Sale'],
                  [ShoppingCart, 'Mixed Bill'],
                ] as [LucideIcon, 'Service Sale' | 'Parts Sale' | 'Mixed Bill'][]
              ).map(([Icon, label]) => (
                <button
                  role="tab"
                  aria-selected={mode === label}
                  className={mode === label ? 'active' : ''}
                  key={label}
                  onClick={() => {
                    setMode(label);
                    setCategory('All Items');
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
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
              </div>
              <div className="category-chips">
                {categoryList.map((label) => (
                  <button
                    key={label}
                    className={category === label ? 'active' : ''}
                    onClick={() => setCategory(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                  {isLoadingParts
                    ? 'Loading parts from inventory...'
                    : 'No matching items in inventory. Try another category or search.'}
                </div>
              )}
            </div>
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

      {addingCustomer && (
        <div className="modal-backdrop" onClick={() => setAddingCustomer(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Add customer"
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>Add Customer</h2>
              <button className="icon-button" aria-label="Close" onClick={() => setAddingCustomer(false)}>
                <X />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const entry = {
                  name: String(data.get('name')).trim(),
                  phone: String(data.get('phone')).trim(),
                  vehicle: String(data.get('vehicle')).trim(),
                  plate: String(data.get('plate')).trim(),
                };
                if (!entry.name) return;
                if ([...customers, ...extraCustomers].some((item) => item.name === entry.name)) {
                  notify('A customer with that name already exists. Select them from the customer list.');
                  return;
                }
                setExtraCustomers((current) => [...current, entry]);
                setCustomer(entry);
                setAddingCustomer(false);
                notify('Customer added to this session.');
              }}
            >
              <label>
                Name
                <input name="name" required autoFocus />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" required />
              </label>
              <label>
                Vehicle
                <input name="vehicle" />
              </label>
              <label>
                Plate No.
                <input name="plate" />
              </label>
              <button className="primary-button" type="submit">
                <Plus size={17} />
                Add Customer
              </button>
            </form>
          </section>
        </div>
      )}

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
              <h2>Invoice {receipt.id}</h2>
              <button className="icon-button" aria-label="Close invoice" onClick={() => setReceipt(null)}>
                <X />
              </button>
            </div>
            <div className="receipt-brand">
              <img src={`${import.meta.env.BASE_URL}Garage-crm-logo-light.png`} alt="Garage CRM" />
            </div>
            <p className="receipt-state">
              <Check size={17} />
              {receipt.status}
            </p>
            <p>{receipt.date} · Qatar time</p>
            <strong>{receipt.customer.name}</strong>
            <p>
              {receipt.customer.vehicle} · {receipt.customer.plate}
            </p>
            {receipt.items.map((item) => (
              <div className="receipt-line" key={String(item.productId)}>
                <span>
                  {productFor(item).name} × {item.quantity}
                </span>
                <strong>
                  {q(
                    calculateTotals([
                      { ...item, price: productFor(item).price, type: productFor(item).type },
                    ]).total
                  )}
                </strong>
              </div>
            ))}
            {!receipt.items.length && <p className="muted">Sample invoice. Line item details are unavailable.</p>}
            <div className="grand-total">
              <strong>Total</strong>
              <strong>{q(receipt.total)}</strong>
            </div>
            <p>Payment: {receipt.payment}</p>
            <small className="muted">Frontend demonstration invoice</small>
            <div className="receipt-actions">
              <button className="primary-button" onClick={() => window.print()}>
                <Printer size={17} />
                Print
              </button>
              <button className="subtle-button" onClick={() => exportInvoice(receipt)}>
                <Download size={17} />
                Download
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
