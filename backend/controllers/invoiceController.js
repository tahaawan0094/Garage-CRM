const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const { generateId, peekNextId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Invoices
 * GET    /api/invoices/next-number   — get next sequential invoice ID
 * GET    /api/invoices               — list all
 * GET    /api/invoices/:id           — get single
 * POST   /api/invoices               — create
 * PUT    /api/invoices/:id           — update
 * PATCH  /api/invoices/:id/pay       — mark as paid
 * DELETE /api/invoices/:id           — delete
 */

// GET /api/invoices/next-number
const getNextInvoiceNumber = async (req, res, next) => {
  try {
    const nextId = await peekNextId('invoice', 'INV', 5);
    return sendSuccess(res, { nextId });
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices
const getInvoices = async (req, res, next) => {
  try {
    const { search = '', status, advisor, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { invoiceId: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { vehicle: { $regex: search, $options: 'i' } },
        { plate: { $regex: search, $options: 'i' } },
        { workOrder: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All Status') filter.status = status;
    if (advisor) filter.advisor = advisor;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, invoices, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne(idQuery(req.params.id, 'invoiceId'));
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    return sendSuccess(res, invoice);
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices
const createInvoice = async (req, res, next) => {
  try {
    let invoiceId = req.body.invoiceId;
    if (!invoiceId || (await Invoice.exists({ invoiceId }))) {
      invoiceId = await generateId('invoice', 'INV', 5);
    }
    const invoice = new Invoice({ ...req.body, invoiceId });
    await invoice.save();

    // Update customer totalSpent
    if (req.body.customerId) {
      await Customer.findOneAndUpdate(idQuery(req.body.customerId, 'customerId'), {
        $inc: { totalSpent: invoice.total || invoice.amount || 0 },
      });
    }

    return sendSuccess(res, invoice, 'Invoice created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/invoices/:id
const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      idQuery(req.params.id, 'invoiceId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    return sendSuccess(res, invoice, 'Invoice updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/invoices/:id/pay
const markInvoicePaid = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      idQuery(req.params.id, 'invoiceId'),
      {
        $set: {
          status: 'Paid',
          paidAt: new Date(),
          ...(paymentMethod && { paymentMethod }),
        },
      },
      { new: true }
    );
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    return sendSuccess(res, invoice, `Invoice ${invoice.invoiceId} marked as paid`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/invoices/:id
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete(idQuery(req.params.id, 'invoiceId'));
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    return sendSuccess(res, null, 'Invoice deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInvoices, getInvoiceById, getNextInvoiceNumber, createInvoice, updateInvoice,
  markInvoicePaid, deleteInvoice,
};
