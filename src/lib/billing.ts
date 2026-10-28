export type PricedItem = { price: number; quantity: number; discount: number; type: 'Part' | 'Service' };
export function calculateTotals(items: PricedItem[]) {
  let parts = 0, services = 0, discount = 0, tax = 0;
  for (const item of items) {
    const gross = Math.round(item.price * 100) * item.quantity;
    const deduction = Math.min(gross, Math.max(0, Math.round(item.discount * 100)));
    if (item.type === 'Part') parts += gross; else services += gross;
    discount += deduction;
    tax += Math.round((gross - deduction) * 0.05);
  }
  return { parts: parts / 100, services: services / 100, subtotal: (parts + services) / 100, discount: discount / 100, tax: tax / 100, total: (parts + services - discount + tax) / 100 };
}
