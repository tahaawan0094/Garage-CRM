const Invoice = require('../models/Invoice');
const WorkOrder = require('../models/WorkOrder');
const Customer = require('../models/Customer');
const Part = require('../models/Part');
const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Controller: Reports
 * GET /api/reports/dashboard   — Dashboard summary stats
 * GET /api/reports/revenue     — Revenue by date range
 * GET /api/reports/jobs        — Jobs summary
 * GET /api/reports/parts       — Low stock parts summary
 */

// GET /api/reports/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeJobs,
      awaitingSignature,
      readyForDelivery,
      pendingQuotations,
      totalCustomers,
      lowStockParts,
      todayInvoices,
      monthInvoices,
    ] = await Promise.all([
      WorkOrder.countDocuments({ status: 'In Progress' }),
      WorkOrder.countDocuments({ status: { $in: ['Awaiting Parts'] } }),
      WorkOrder.countDocuments({ status: 'Ready for Delivery' }),
      Invoice.countDocuments({ status: { $in: ['Pending', 'Overdue'] } }),
      Customer.countDocuments(),
      Part.countDocuments({ $expr: { $lte: ['$quantity', '$lowStockAt'] } }),
      Invoice.find({ createdAt: { $gte: todayStart } }),
      Invoice.find({ createdAt: { $gte: monthStart } }),
    ]);

    const todayRevenue = todayInvoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const monthRevenue = monthInvoices
      .filter((inv) => inv.status === 'Paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    return sendSuccess(res, {
      activeJobs,
      awaitingSignature,
      readyForDelivery,
      pendingQuotations,
      totalCustomers,
      lowStockParts,
      todayInvoicesCount: todayInvoices.length,
      todayRevenue,
      monthRevenue,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/revenue?from=&to=
const getRevenueReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = { status: 'Paid' };
    if (from || to) {
      filter.paidAt = {};
      if (from) filter.paidAt.$gte = new Date(from);
      if (to) filter.paidAt.$lte = new Date(to);
    }

    const invoices = await Invoice.find(filter).sort({ paidAt: 1 });
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return sendSuccess(res, { invoices, total, count: invoices.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/jobs
const getJobsReport = async (req, res, next) => {
  try {
    const statusGroups = await WorkOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const mechanicGroups = await WorkOrder.aggregate([
      { $group: { _id: '$mechanic', count: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { count: -1 } },
    ]);
    return sendSuccess(res, { byStatus: statusGroups, byMechanic: mechanicGroups });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/parts
const getPartsReport = async (req, res, next) => {
  try {
    const lowStock = await Part.find({
      $expr: { $lte: ['$quantity', '$lowStockAt'] },
    }).sort({ quantity: 1 });

    const outOfStock = await Part.countDocuments({ quantity: 0 });
    const totalParts = await Part.countDocuments();

    return sendSuccess(res, { lowStock, outOfStock, totalParts });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getRevenueReport, getJobsReport, getPartsReport };
