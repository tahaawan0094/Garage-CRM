const Transaction = require('../models/Transaction');
const Part = require('../models/Part');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Transactions (POS Billing)
 * GET    /api/transactions           — list all POS invoices
 * GET    /api/transactions/:id       — get single
 * POST   /api/transactions           — create new POS sale (checkout)
 * DELETE /api/transactions/:id       — delete/void
 */

// GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { search = '', status, payment, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.plate': { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') filter.status = status;
    if (payment) filter.payment = payment;

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, transactions, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne(idQuery(req.params.id, 'transactionId'));
    if (!transaction) return sendError(res, 'Transaction not found', 404);
    return sendSuccess(res, transaction);
  } catch (err) {
    next(err);
  }
};

// POST /api/transactions
const createTransaction = async (req, res, next) => {
  try {
    const transactionId = req.body.transactionId || (await generateId('transaction', 'INV', 5));
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const transaction = new Transaction({
      ...req.body,
      transactionId,
      date: req.body.date || today,
    });
    await transaction.save();

    // Deduct inventory stock for 'Part' items
    if (Array.isArray(transaction.items)) {
      for (const item of transaction.items) {
        if (item.type === 'Part') {
          // Try to find matching part by id / partId or name
          let part = null;
          if (item.productId) {
            part = await Part.findOne(idQuery(item.productId, 'partId'));
          }
          if (!part && item.name) {
            const escaped = item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            part = await Part.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
          }
          if (part) {
            const adjustedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            part.quantity = Math.max(0, (Number(part.quantity) || 0) - (Number(item.quantity) || 1));
            part.lastUpdated = adjustedDate;
            if (Array.isArray(part.activity)) {
              part.activity.unshift({
                date: adjustedDate,
                type: 'Sold',
                quantity: item.quantity,
                reference: transactionId,
                notes: `POS Sale to ${transaction.customer?.name || 'Customer'}`,
              });
            }
            await part.save();
          }
        }
      }
    }

    return sendSuccess(res, transaction, 'Transaction completed successfully', 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/transactions/:id (void)
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete(idQuery(req.params.id, 'transactionId'));
    if (!transaction) return sendError(res, 'Transaction not found', 404);
    return sendSuccess(res, null, 'Transaction voided successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions, getTransactionById, createTransaction, deleteTransaction };
