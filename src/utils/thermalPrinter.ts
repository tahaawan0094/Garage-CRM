const normalizeText = (value: any) => String(value ?? '').replace(/\s+/g, ' ').trim();

const pad = (value: any, width: number, align: 'left' | 'right' = 'left') => {
  const text = normalizeText(value);
  const safeText = text.length > width ? text.slice(0, width) : text;
  if (align === 'right') {
    return safeText.padStart(width, ' ');
  }
  return safeText.padEnd(width, ' ');
};

const centerText = (value: any, width: number) => {
  const text = normalizeText(value);
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
};

const formatMoney = (value: any, currency = 'QAR') => {
  const numeric = Number(value) || 0;
  return `${currency} ${numeric.toFixed(2)}`;
};

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  taxNumber?: string;
  crNumber?: string;
  billNumber?: string;
  invoiceNumber?: string;
  date?: string;
  customer?: {
    name?: string;
    phone?: string;
    vehicle?: string;
    plate?: string;
  };
  items?: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentMethod?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  receiptTerms?: string;
}

export const buildReceiptLines = ({
  receipt = {},
  paperSize = '80mm',
  type = 'Invoice',
}: {
  receipt?: ReceiptData;
  paperSize?: string;
  type?: string;
} = {}): string[] => {
  const width = paperSize === '58mm' ? 32 : paperSize === 'A4' ? 68 : 42;

  const header = [
    centerText(receipt.storeName || 'AUTO CARE & SERVICE HUB', width),
    centerText(receipt.storeAddress || 'Automotive Care & Diagnostics Center', width),
    receipt.storePhone ? centerText(`Tel: ${receipt.storePhone}`, width) : '',
    receipt.taxNumber ? centerText(`Tax / TIN: ${receipt.taxNumber}`, width) : '',
    receipt.crNumber ? centerText(`CR No: ${receipt.crNumber}`, width) : '',
    ''.padEnd(width, '='),
    `Date: ${normalizeText(receipt.date || new Date().toLocaleString('en-GB'))}`,
    `${type} ${receipt.invoiceNumber || receipt.billNumber ? `#${receipt.invoiceNumber || receipt.billNumber}` : ''}`.trim(),
    receipt.customer?.name ? `Customer: ${receipt.customer.name}` : 'Customer: Walk-in',
    receipt.customer?.phone ? `Phone: ${receipt.customer.phone}` : '',
    receipt.customer?.vehicle ? `Vehicle: ${receipt.customer.vehicle} (${receipt.customer.plate || 'No Plate'})` : '',
    ''.padEnd(width, '-'),
    `${pad('Item / Service', width - 18, 'left')} ${pad('Qty x Rate', 8, 'right')} ${pad('Total', 8, 'right')}`,
    ''.padEnd(width, '-'),
  ].filter(Boolean);

  const itemLines = (Array.isArray(receipt.items) ? receipt.items : []).map((item) => {
    const name = normalizeText(item.name || 'Item');
    const qty = Number(item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    const subtotal = Number(item.subtotal ?? qty * price);

    const nameTruncated = name.length > width - 20 ? `${name.slice(0, width - 20)}..` : name;
    const rateCol = `${qty}x${price.toFixed(0)}`;
    const totalCol = subtotal.toFixed(2);

    return `${pad(nameTruncated, width - 18, 'left')} ${pad(rateCol, 8, 'right')} ${pad(totalCol, 8, 'right')}`;
  });

  const subtotal = Math.abs(Number(receipt.subtotal ?? 0));
  const tax = Math.abs(Number(receipt.tax ?? 0));
  const discount = Math.abs(Number(receipt.discount ?? 0));
  const total = Math.abs(Number(receipt.total ?? 0));
  const paid = Number(receipt.paidAmount ?? total);
  const change = Number(receipt.changeAmount ?? 0);

  const summary = [
    ''.padEnd(width, '-'),
    `${pad('Subtotal:', width - 14, 'left')}${pad(formatMoney(subtotal), 14, 'right')}`,
    tax > 0 ? `${pad('Tax / VAT:', width - 14, 'left')}${pad(formatMoney(tax), 14, 'right')}` : '',
    discount > 0 ? `${pad('Discount:', width - 14, 'left')}${pad(`-${formatMoney(discount)}`, 14, 'right')}` : '',
    ''.padEnd(width, '='),
    `${pad('GRAND TOTAL:', width - 14, 'left')}${pad(formatMoney(total), 14, 'right')}`,
    paid > 0 ? `${pad('Amount Paid:', width - 14, 'left')}${pad(formatMoney(paid), 14, 'right')}` : '',
    change > 0 ? `${pad('Change Due:', width - 14, 'left')}${pad(formatMoney(change), 14, 'right')}` : '',
    `Payment Method: ${normalizeText(receipt.paymentMethod || 'Cash')}`,
    ''.padEnd(width, '-'),
    receipt.receiptHeader ? centerText(normalizeText(receipt.receiptHeader), width) : '',
    receipt.receiptFooter ? centerText(normalizeText(receipt.receiptFooter), width) : centerText('Thank you for choosing Auto Care Hub!', width),
    receipt.receiptTerms ? centerText(normalizeText(receipt.receiptTerms), width) : '',
  ].filter(Boolean);

  return [...header, ...itemLines, ...summary];
};

export const printThermalOrWindowsReceipt = async ({
  receipt = {},
  settings = {},
  type = 'Invoice',
  manual = false,
}: {
  receipt?: ReceiptData;
  settings?: any;
  type?: string;
  manual?: boolean;
} = {}): Promise<{ success: boolean; status: string; reason?: string; preview?: string }> => {
  const printerSettings = {
    printerMode: 'windows',
    paperSize: '80mm',
    printerName: '',
    autoPrint: true,
    ...settings,
  };

  const paperSize = printerSettings.paperSize || '80mm';
  const lines = buildReceiptLines({ receipt, paperSize, type });
  const content = lines.join('\n');

  if (printerSettings.printerMode === 'demo') {
    return { success: true, status: 'demo', preview: content };
  }

  if (!manual && !printerSettings.autoPrint) {
    return { success: true, status: 'skipped', preview: content };
  }

  const desktopApp = (window as any).desktopApp;
  if (!desktopApp?.printReceipt) {
    // If not running in electron, trigger native browser print preview
    window.print();
    return { success: true, status: 'browser_print', preview: content };
  }

  try {
    const result = await desktopApp.printReceipt({
      content,
      printerName: printerSettings.printerName || '',
      paperSize,
      autoPrint: true,
      type,
    });

    return {
      success: Boolean(result?.success),
      status: result?.success ? 'printed' : 'failed',
      reason: result?.reason,
      preview: content,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'error',
      reason: error?.message || 'Printer command failed',
      preview: content,
    };
  }
};

