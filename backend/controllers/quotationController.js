const Quotation = require('../models/Quotation');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Quotations
 * GET    /api/quotations             — list all
 * GET    /api/quotations/:id         — get single
 * POST   /api/quotations             — create
 * PUT    /api/quotations/:id         — update
 * PATCH  /api/quotations/:id/approve — approve quotation
 * PATCH  /api/quotations/:id/reject  — reject quotation
 * DELETE /api/quotations/:id         — delete
 */

// GET /api/quotations
const getQuotations = async (req, res, next) => {
  try {
    const { search = '', status, advisor, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { quotationId: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { vehicle: { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'Awaiting Approval') {
      filter.status = { $in: ['Awaiting Approval', 'Pending', 'Pending Approval'] };
    } else if (status && status !== 'All Status') {
      filter.status = status;
    }
    if (advisor && advisor !== 'All Service Advisors') filter.advisor = advisor;

    const total = await Quotation.countDocuments(filter);
    const quotations = await Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, quotations, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/quotations/:id
const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne(idQuery(req.params.id, 'quotationId'));
    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, quotation);
  } catch (err) {
    next(err);
  }
};

// POST /api/quotations
const createQuotation = async (req, res, next) => {
  try {
    let quotationId = req.body.quotationId;
    if (!quotationId || quotationId === 'QT-00018' || (await Quotation.exists({ quotationId }))) {
      quotationId = await generateId('quotation', 'QT', 5);
    }
    const quotation = new Quotation({ ...req.body, quotationId });
    await quotation.save();
    return sendSuccess(res, quotation, 'Quotation created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/quotations/:id
const updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOneAndUpdate(
      idQuery(req.params.id, 'quotationId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, quotation, 'Quotation updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/quotations/:id/approve
const approveQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOneAndUpdate(
      idQuery(req.params.id, 'quotationId'),
      { $set: { status: 'Approved' } },
      { new: true }
    );
    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, quotation, `Quotation ${quotation.quotationId} approved`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/quotations/:id/reject
const rejectQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOneAndUpdate(
      idQuery(req.params.id, 'quotationId'),
      { $set: { status: 'Rejected' } },
      { new: true }
    );
    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, quotation, `Quotation ${quotation.quotationId} rejected`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/quotations/:id
const deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOneAndDelete(idQuery(req.params.id, 'quotationId'));
    if (!quotation) return sendError(res, 'Quotation not found', 404);
    return sendSuccess(res, null, 'Quotation deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuotations, getQuotationById, createQuotation, updateQuotation,
  approveQuotation, rejectQuotation, deleteQuotation,
};
