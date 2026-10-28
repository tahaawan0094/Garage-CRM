import { useState, useEffect } from 'react';
import { Banknote, Box, CarFront, Check, CreditCard, Download, FileText, Landmark, Minus, Pause, Phone, Plus, Printer, Save, Search, Settings, ShoppingCart, Trash2, User, Users, Wrench, X, type LucideIcon } from 'lucide-react';
import { calculateTotals } from '../lib/billing';
import { transactionsApi } from '../lib/api';
import { getNextInvoiceId, commitInvoiceId } from '../lib/sequence';

type Product = { id: number; name: string; detail: string; price: number; type: 'Part' | 'Service'; category: string; icon: LucideIcon; color: string };
type CartItem = { productId: number; quantity: number; discount: number };
type Customer = { name: string; phone: string; vehicle: string; plate: string };
type Invoice = { id: string; customer: Customer; items: CartItem[]; total: number; payment: string; date: string; status: 'Paid' | 'Pending' };
const catalog: Product[] = [
  { id: 1, name: 'Engine Oil 5W-30', detail: 'Fully synthetic 4L', price: 160, type: 'Part', category: 'Oil & Fluids', icon: Box, color: 'oil' },
  { id: 2, name: 'Oil Filter', detail: 'OEM quality', price: 35, type: 'Part', category: 'Filters', icon: Settings, color: 'filter' },
  { id: 3, name: 'Brake Pads (Front)', detail: 'Toyota original', price: 250, type: 'Part', category: 'Brake Parts', icon: Settings, color: 'brake' },
  { id: 4, name: 'Wheel Alignment', detail: '4 wheel alignment', price: 200, type: 'Service', category: 'Services', icon: Wrench, color: 'alignment' },
  { id: 5, name: 'Full Polish', detail: 'Exterior & interior', price: 350, type: 'Service', category: 'Services', icon: CarFront, color: 'polish' },
  { id: 6, name: 'AC Service', detail: 'Gas refill & cleaning', price: 180, type: 'Service', category: 'Services', icon: Wrench, color: 'ac' },
  { id: 7, name: 'Battery (12V)', detail: 'Maintenance free', price: 420, type: 'Part', category: 'Accessories', icon: Box, color: 'battery' },
  { id: 8, name: 'Tire Rotation', detail: '4 tires rotation', price: 80, type: 'Service', category: 'Tires', icon: Settings, color: 'tire' },
  { id: 9, name: 'Car Wash', detail: 'Basic wash', price: 50, type: 'Service', category: 'Services', icon: CarFront, color: 'wash' },
];
const customers: Customer[] = [
  { name: 'Walk-in Customer', phone: '', vehicle: '', plate: '' },
];
const sampleCart: CartItem[] = [];
const number = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const q = (value: number) => `QAR ${number(value)}`;
const productFor = (item: CartItem) => catalog.find(product => product.id === item.productId)!;
const validCart = (value: unknown): value is CartItem[] => Array.isArray(value) && value.every(item => item && catalog.some(product => product.id === item.productId) && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999 && Number.isFinite(item.discount) && item.discount >= 0 && item.discount <= catalog.find(product => product.id === item.productId)!.price * item.quantity);
const validCustomer = (value: unknown): value is Customer => !!value && typeof value === 'object' && ['name', 'phone', 'vehicle', 'plate'].every(key => typeof (value as Record<string, unknown>)[key] === 'string');
function readInvoices(): Invoice[] { try { const value: unknown = JSON.parse(localStorage.getItem('garage-pos-invoices') || 'null'); return Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && validCustomer(item.customer) && validCart(item.items) && Number.isFinite(item.total) && typeof item.date === 'string' && typeof item.payment === 'string' && ['Paid', 'Pending'].includes(item.status)) ? value : []; } catch { return []; } }

export default function PosBilling({ globalSearch, notify }: { globalSearch: string; notify: (message: string) => void }) {
  const [cart, setCart] = useState<CartItem[]>(sampleCart);
  const [customer, setCustomer] = useState<Customer>(customers[0]);
  const [mode, setMode] = useState('Mixed Bill');
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
  useEffect(() => {
    if (!receipt && !addingCustomer) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.pos-page [role="dialog"]');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('input, button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setReceipt(null); setAddingCustomer(false); }
      if (event.key !== 'Tab') return;
      const controls = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [receipt, addingCustomer]);
  const pricedItems = cart.map(item => ({ ...item, price: productFor(item).price, type: productFor(item).type }));
  const totals = calculateTotals(pricedItems);
  const receivedValue = Number(received) || 0;
  const change = Math.max(0, Math.round((receivedValue - totals.total) * 100) / 100);
  const invoiceId = getNextInvoiceId(invoices);
  const available = catalog.filter(product => (mode === 'Mixed Bill' || product.type === (mode === 'Service Sale' ? 'Service' : 'Part')) && (category === 'All Items' || product.category === category) && `${product.name} ${product.detail} ${product.category}`.toLowerCase().includes(`${search} ${globalSearch}`.trim().toLowerCase()));
  const add = (product: Product) => setCart(current => current.some(item => item.productId === product.id) ? current.map(item => item.productId === product.id ? { ...item, quantity: Math.min(999, item.quantity + 1) } : item) : [...current, { productId: product.id, quantity: 1, discount: 0 }]);
  const quantity = (id: number, delta: number) => setCart(current => current.map(item => item.productId === id ? { ...item, quantity: Math.max(1, Math.min(999, item.quantity + delta)), discount: Math.min(item.discount, productFor(item).price * Math.max(1, item.quantity + delta)) } : item));
  const saveDraft = () => { try { localStorage.setItem('garage-pos-draft', JSON.stringify({ cart, customer, payment, received, workOrder })); notify('Bill saved on this device. Use Resume Draft to reopen it.'); } catch { notify('Your browser could not save this draft.'); } };
  const restoreDraft = () => { try { const draft = JSON.parse(localStorage.getItem('garage-pos-draft') || 'null'); if (!draft) { notify('No saved draft on this device.'); return; } if (!validCart(draft.cart) || !validCustomer(draft.customer)) throw new Error('Invalid draft'); setCart(draft.cart); setCustomer(draft.customer); setPayment(['Cash', 'Card', 'Bank'].includes(draft.payment) ? draft.payment : 'Cash'); setReceived(String(draft.received ?? '0')); setWorkOrder(typeof draft.workOrder === 'string' ? draft.workOrder : ''); notify('Saved bill restored.'); } catch { notify('This draft could not be restored.'); } };
  const newSale = () => { setCart([]); setCustomer({ name: 'Walk-in Customer', phone: '', vehicle: '', plate: '' }); setWorkOrder(''); setReceived(''); setPayment('Cash'); notify('New walk-in sale started.'); };
  const generate = () => {
    if (!cart.length) { notify('Add at least one item to the invoice.'); return; }
    if (!customer.name.trim()) { notify('Select a customer first.'); return; }
    if (payment === 'Cash' && receivedValue < totals.total) { notify(`Amount received is short by ${q(totals.total - receivedValue)}.`); return; }
    commitInvoiceId(invoiceId);
    const invoice: Invoice = { id: invoiceId, customer: { ...customer }, items: cart.map(item => ({ ...item })), total: totals.total, payment, date: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Qatar', dateStyle: 'medium', timeStyle: 'short' }), status: 'Paid' };
    const updated = [invoice, ...invoices];
    try { localStorage.setItem('garage-pos-invoices', JSON.stringify(updated)); localStorage.removeItem('garage-pos-draft'); } catch { notify('Invoice created for this session; browser storage is unavailable.'); }
    
    // Sync sale directly to MongoDB Atlas
    transactionsApi.create({
      transactionId: invoiceId,
      customer: { ...customer },
      items: cart.map(item => ({
        productId: item.productId,
        name: productFor(item).name,
        type: productFor(item).type,
        price: productFor(item).price,
        quantity: item.quantity,
        discount: item.discount,
      })),
      total: totals.total,
      payment,
      status: 'Paid',
    }).catch(err => console.warn('Transaction sync error:', err));

    setInvoices(updated); setReceipt(invoice); setCart([]); setReceived('');
  };
  const exportInvoice = (invoice: Invoice) => {
    const text = ['GARAGE WORKSPACE', invoice.id, invoice.date, invoice.customer.name, invoice.customer.vehicle, '', ...invoice.items.map(item => `${productFor(item).name} x ${item.quantity}: ${q(calculateTotals([{ ...item, price: productFor(item).price, type: productFor(item).type }]).total)}`), '', `Grand total: ${q(invoice.total)}`, `Payment: ${invoice.payment}`, 'Frontend demonstration invoice'].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `${invoice.id}.txt`; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="pos-page">
    <div className="pos-overview"><div className="pos-heading"><span><ShoppingCart size={37} /></span><div><h1>POS Billing</h1><p>Create invoices for services and parts sales</p></div></div><div className="pos-metrics">{([[ShoppingCart, String(cart.length), 'Open Cart', cart.length ? `${cart.length} items in cart` : 'Cart is empty', 'orange'], [FileText, String(invoices.length), 'Today Bills', invoices.length ? `${invoices.length} recorded` : 'No bills yet', 'blue'], [Users, String(invoices.filter(i => i.customer.name === 'Walk-in Customer').length), 'Walk-in Sales', 'From this session', 'green'], [FileText, q(invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0)), 'Pending Payments', `${invoices.filter(i => i.status === 'Pending').length} invoices`, 'orange']] as [LucideIcon, string, string, string, string][]).map(([Icon, value, label, detail, color]) => <div className="pos-metric" key={label}><span className={`stat-icon ${color}`}><Icon size={24} /></span><div><strong>{value}</strong><p>{label}</p><small className={detail.startsWith('+') ? 'positive' : 'muted'}>{detail}</small></div></div>)}</div></div>
    <div className="pos-layout"><div className="pos-left">
      <section className="panel pos-catalog"><div className="pos-customer-fields"><label className="customer-field">Customer <b>*</b><div><User size={17} /><select aria-label="Customer" value={customer.name} onChange={event => { const selected = [...customers, ...extraCustomers].find(item => item.name === event.target.value); if (selected) setCustomer(selected); else setCustomer({ name: 'Walk-in Customer', phone: '', vehicle: '', plate: '' }); }}><option>Walk-in Customer</option>{customer.name !== 'Walk-in Customer' && ![...customers, ...extraCustomers].some(item => item.name === customer.name) && <option>{customer.name}</option>}{[...customers, ...extraCustomers].map(item => <option key={item.name}>{item.name}</option>)}</select></div></label><label>Phone<div><Phone size={16} /><input aria-label="Phone" value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} placeholder="Phone number" /></div></label><label className="vehicle-field">Vehicle<div><CarFront size={17} /><input aria-label="Vehicle" value={customer.vehicle} onChange={event => setCustomer({ ...customer, vehicle: event.target.value })} placeholder="Vehicle / model" /></div></label><label className="plate-field">Plate No.<div><input aria-label="Plate number" value={customer.plate} onChange={event => setCustomer({ ...customer, plate: event.target.value })} placeholder="Plate" /></div></label><label className="work-field">Work Order <span>(Optional)</span><div><Wrench size={15} /><select aria-label="Work order" value={workOrder} onChange={event => setWorkOrder(event.target.value)}><option value="">None</option></select></div></label></div>
        <div className="sale-tabs" role="tablist" aria-label="Sale type">{([[Box, 'Service Sale'], [Box, 'Parts Sale'], [ShoppingCart, 'Mixed Bill']] as [LucideIcon, string][]).map(([Icon, label]) => <button role="tab" aria-selected={mode === label} className={mode === label ? 'active' : ''} key={label} onClick={() => { setMode(label); setCategory('All Items'); }}><Icon size={16} />{label}</button>)}</div>
        <div className="catalog-toolbar"><div className="pos-search"><Search size={17} /><input placeholder="Search services or parts..." aria-label="Search catalog" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="category-chips">{['All Items', 'Services', 'Oil & Fluids', 'Tires', 'Brake Parts', 'Filters', 'Accessories'].map(label => <button key={label} className={category === label ? 'active' : ''} onClick={() => setCategory(label)}>{label}</button>)}</div></div>
        <div className="product-grid">{available.map(product => <button className="product-card" key={product.id} onClick={() => add(product)} aria-label={`Add ${product.name}`}><span className={`product-art ${product.color}`}><product.icon size={34} strokeWidth={1.5} /></span><span className="product-description"><strong>{product.name}</strong><small>{product.detail}</small><b>{q(product.price)}</b></span><span className="add-product"><Plus size={17} /></span></button>)}{available.length === 0 && <div className="catalog-empty">No matching items. Try another category or search.</div>}</div>
      </section>
      <section className="panel pos-cart"><div className="panel-title"><div><ShoppingCart size={22} /><h2>Invoice Items <span>({cart.length} items)</span></h2></div><button className="clear-button" onClick={() => setCart([])} disabled={!cart.length}><Trash2 size={15} />Clear All</button></div><div className="table-scroll"><table className="invoice-table"><thead><tr>{['#', 'Item', 'Type', 'Qty', 'Unit Price (QAR)', 'Discount', 'Tax (5%)', 'Total (QAR)', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{cart.map((item, index) => { const product = productFor(item); const line = calculateTotals([{ ...item, price: product.price, type: product.type }]); return <tr key={item.productId}><td>{index + 1}</td><td><div className="cart-product"><span className={`product-art ${product.color}`}><product.icon size={25} /></span><span><strong>{product.name}</strong><small>{product.detail}</small></span></div></td><td><span className={`badge ${product.type === 'Service' ? 'ready' : ''}`}>{product.type}</span></td><td><div className="quantity-control"><button aria-label={`Decrease ${product.name} quantity`} disabled={item.quantity <= 1} onClick={() => quantity(item.productId, -1)}><Minus size={12} /></button><span>{item.quantity}</span><button aria-label={`Increase ${product.name} quantity`} disabled={item.quantity >= 999} onClick={() => quantity(item.productId, 1)}><Plus size={12} /></button></div></td><td>{number(product.price)}</td><td><input className="discount-input" aria-label={`Discount for ${product.name}`} type="number" min="0" max={product.price * item.quantity} step="0.01" value={item.discount} onChange={event => { const value = Math.max(0, Math.min(product.price * item.quantity, Number(event.target.value) || 0)); setCart(current => current.map(row => row.productId === item.productId ? { ...row, discount: Math.round(value * 100) / 100 } : row)); }} /></td><td>{number(line.tax)}</td><td><strong>{number(line.total)}</strong></td><td><button className="delete-item" aria-label={`Remove ${product.name}`} onClick={() => setCart(current => current.filter(row => row.productId !== item.productId))}><Trash2 size={16} /></button></td></tr>; })}</tbody></table></div>{!cart.length && <div className="cart-empty"><ShoppingCart size={28} /><p>Your cart is empty. Select a service or part above.</p></div>}</section>
      <div className="pos-bottom-grid"><section className="panel recent-invoices"><div className="panel-title"><div><FileText size={23} /><h2>Recent Invoices</h2></div><button className="text-link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'View all'}</button></div><div className="table-scroll"><table><thead><tr>{['Invoice No.', 'Date & Time', 'Customer', 'Vehicle', 'Total (QAR)', 'Status'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{(showAll ? invoices : invoices.slice(0, 4)).map(invoice => <tr key={invoice.id}><td><button className="order-id" onClick={() => setReceipt(invoice)}>{invoice.id}</button></td><td>{invoice.date}</td><td>{invoice.customer.name}</td><td>{invoice.customer.vehicle}</td><td>{number(invoice.total)}</td><td><span className={`badge ${invoice.status === 'Paid' ? 'ready' : ''}`}>{invoice.status}</span></td></tr>)}</tbody></table></div></section><section className="panel pos-shortcuts"><div className="panel-title"><div><Plus size={24} /><h2>Quick Shortcuts</h2></div></div><div className="shortcut-grid">{([[ShoppingCart, 'New Walk-in Sale', 'Start a new invoice', 'orange', newSale], [FileText, 'Open Work Order Bill', 'Load sample WO-00012', 'blue', () => { setCart(sampleCart.map(item => ({ ...item }))); setCustomer(customers[0]); setWorkOrder('WO-00012'); notify('Sample work order bill loaded.'); }], [User, 'Add Customer', 'Create new customer', 'green', () => setAddingCustomer(true)], [Pause, 'Resume Draft', 'Reopen saved bill', 'purple', restoreDraft]] as [LucideIcon, string, string, string, () => void][]).map(([Icon, title, detail, color, action]) => <button key={title} className={`shortcut ${color}`} onClick={action}><Icon size={25} /><span><strong>{title}</strong><small>{detail}</small></span></button>)}</div></section></div>
    </div>
    <aside className="panel pos-summary"><div className="invoice-heading"><FileText size={31} /><div><small>Invoice No.</small><h2>{invoiceId}</h2></div><span>Walk-in Sale</span></div><p className="invoice-date">Local invoice preview</p><div className="customer-summary"><div><User size={17} /><strong>{customer.name}</strong><Phone size={15} /><span>{customer.phone || '—'}</span></div><div><CarFront size={17} /><span>{customer.vehicle || 'No vehicle selected'}</span><span>Plate: {customer.plate || '—'}</span></div></div>
      <h3>Billing Summary</h3><dl className="billing-breakdown"><div><dt>Parts Total ({cart.filter(item => productFor(item).type === 'Part').length} items)</dt><dd>{q(totals.parts)}</dd></div><div><dt>Service Charges ({cart.filter(item => productFor(item).type === 'Service').length} items)</dt><dd>{q(totals.services)}</dd></div><div className="subtotal"><dt>Subtotal</dt><dd>{q(totals.subtotal)}</dd></div><div><dt>Discount (-)</dt><dd className="discount-value">{q(totals.discount)}</dd></div><div><dt>VAT (5%)</dt><dd>{q(totals.tax)}</dd></div></dl><div className="grand-total"><strong>Grand Total</strong><strong>{q(totals.total)}</strong></div>
      <h3 className="payment-title"><CreditCard size={18} />Payment Method</h3><div className="payment-methods">{([[Banknote, 'Cash'], [CreditCard, 'Card'], [Landmark, 'Bank']] as [LucideIcon, string][]).map(([Icon, label]) => <button key={label} className={payment === label ? 'active' : ''} onClick={() => setPayment(label)} aria-pressed={payment === label}><Icon size={18} />{label}</button>)}</div>
      {payment === 'Cash' ? <div className="cash-fields"><label><Banknote size={16} />Amount Received (QAR)<input type="number" min="0" step="0.01" value={received} onChange={event => setReceived(event.target.value)} placeholder="0.00" /></label><label><Landmark size={16} />{receivedValue >= totals.total ? 'Change (QAR)' : 'Amount Due (QAR)'}<output className={receivedValue < totals.total ? 'amount-due' : ''}>{number(receivedValue >= totals.total ? change : totals.total - receivedValue)}</output></label></div> : <p className="payment-note">{payment === 'Card' ? 'Card' : 'Bank transfer'} payment recorded locally. No payment is processed.</p>}
      <button className="generate-invoice" onClick={generate} disabled={!cart.length}><FileText size={19} />Generate Invoice</button><button className="save-draft" onClick={saveDraft}><Save size={18} />Save Draft</button><div className="summary-actions"><button onClick={() => { if (invoices[0]) setReceipt(invoices[0]); }}><Printer size={15} />Last Invoice</button><button onClick={() => { if (invoices[0]) exportInvoice(invoices[0]); }}><Download size={15} />Export Last</button><button className="clear-button" onClick={() => setCart([])}><Trash2 size={15} />Clear Cart</button></div><small className="pos-demo-note">Frontend demo · invoices and drafts stay on this device</small>
    </aside></div>
    {addingCustomer && <div className="modal-backdrop" onClick={() => setAddingCustomer(false)}><section role="dialog" aria-modal="true" aria-label="Add customer" className="modal" onClick={event => event.stopPropagation()}><div className="modal-heading"><h2>Add Customer</h2><button className="icon-button" aria-label="Close" onClick={() => setAddingCustomer(false)}><X /></button></div><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const entry = { name: String(data.get('name')).trim(), phone: String(data.get('phone')).trim(), vehicle: String(data.get('vehicle')).trim(), plate: String(data.get('plate')).trim() }; if (!entry.name) return; if ([...customers, ...extraCustomers].some(item => item.name === entry.name)) { notify('A customer with that name already exists. Select them from the customer list.'); return; } setExtraCustomers(current => [...current, entry]); setCustomer(entry); setAddingCustomer(false); notify('Customer added to this session.'); }}><label>Name<input name="name" required autoFocus /></label><label>Phone<input name="phone" type="tel" required /></label><label>Vehicle<input name="vehicle" /></label><label>Plate No.<input name="plate" /></label><button className="primary-button" type="submit"><Plus size={17} />Add Customer</button></form></section></div>}
    {receipt && <div className="modal-backdrop receipt-backdrop" onClick={() => setReceipt(null)}><section className="modal receipt" role="dialog" aria-modal="true" aria-label={`Invoice ${receipt.id}`} onClick={event => event.stopPropagation()}><div className="modal-heading"><h2>Invoice {receipt.id}</h2><button className="icon-button" aria-label="Close invoice" onClick={() => setReceipt(null)}><X /></button></div><div className="receipt-brand"><img src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`} alt="Garage CRM" /></div><p className="receipt-state"><Check size={17} />{receipt.status}</p><p>{receipt.date} · Qatar time</p><strong>{receipt.customer.name}</strong><p>{receipt.customer.vehicle} · {receipt.customer.plate}</p>{receipt.items.map(item => <div className="receipt-line" key={item.productId}><span>{productFor(item).name} × {item.quantity}</span><strong>{q(calculateTotals([{ ...item, price: productFor(item).price, type: productFor(item).type }]).total)}</strong></div>)}{!receipt.items.length && <p className="muted">Sample invoice. Line item details are unavailable.</p>}<div className="grand-total"><strong>Total</strong><strong>{q(receipt.total)}</strong></div><p>Payment: {receipt.payment}</p><small className="muted">Frontend demonstration invoice</small><div className="receipt-actions"><button className="primary-button" onClick={() => window.print()}><Printer size={17} />Print</button><button className="subtle-button" onClick={() => exportInvoice(receipt)}><Download size={17} />Download</button></div></section></div>}
  </main>;
}
