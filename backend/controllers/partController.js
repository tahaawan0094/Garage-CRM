const Part = require('../models/Part');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Parts Inventory
 * GET    /api/parts                  — list all (search, category, status)
 * GET    /api/parts/:id              — get single
 * POST   /api/parts                  — create
 * PUT    /api/parts/:id              — update
 * PATCH  /api/parts/:id/stock        — adjust stock (restock, sell, adjust)
 * DELETE /api/parts/:id              — delete
 */

// GET /api/parts
const getParts = async (req, res, next) => {
  try {
    const { search = '', category, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { partId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'All Categories') filter.category = category;
    if (status === 'Low Stock') filter.$expr = { $lte: ['$quantity', '$lowStockAt'] };
    if (status === 'Out of Stock') filter.quantity = 0;
    if (status === 'In Stock') filter.$expr = { $gt: ['$quantity', '$lowStockAt'] };

    const total = await Part.countDocuments(filter);
    const parts = await Part.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, parts, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/parts/:id
const getPartById = async (req, res, next) => {
  try {
    const part = await Part.findOne(idQuery(req.params.id, 'partId'));
    if (!part) return sendError(res, 'Part not found', 404);
    return sendSuccess(res, part);
  } catch (err) {
    next(err);
  }
};

// POST /api/parts
const createPart = async (req, res, next) => {
  try {
    let partId = req.body.partId;
    if (!partId || (await Part.exists({ partId }))) {
      partId = await generateId('part', 'PRT', 4);
    }
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const quantity = Number(req.body.quantity) >= 0 ? Number(req.body.quantity) : 0;
    const unitCost = Number(req.body.unitCost) >= 0 ? Number(req.body.unitCost) : 0;
    const sellingPrice = Number(req.body.sellingPrice) >= 0 ? Number(req.body.sellingPrice) : unitCost;

    const activity = req.body.activity && req.body.activity.length > 0
      ? req.body.activity
      : quantity > 0
        ? [{ date: today, type: 'Restocked', quantity, reference: 'INIT', notes: 'Initial stock' }]
        : [];

    const part = new Part({
      ...req.body,
      partId,
      quantity,
      unitCost,
      sellingPrice,
      lastUpdated: req.body.lastUpdated || today,
      lastRestocked: req.body.lastRestocked || (quantity > 0 ? today : ''),
      activity,
    });
    await part.save();
    return sendSuccess(res, part, 'Part created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/parts/:id
const updatePart = async (req, res, next) => {
  try {
    const part = await Part.findOneAndUpdate(
      idQuery(req.params.id, 'partId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!part) return sendError(res, 'Part not found', 404);
    return sendSuccess(res, part, 'Part updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/parts/:id/stock
const adjustStock = async (req, res, next) => {
  try {
    const { type, quantity, reference = '', notes = '' } = req.body;

    if (!['Restocked', 'Sold', 'Adjusted'].includes(type)) {
      return sendError(res, 'Invalid adjustment type. Use: Restocked, Sold, Adjusted', 400);
    }
    if (!Number.isInteger(quantity)) {
      return sendError(res, 'Quantity must be an integer', 400);
    }

    const part = await Part.findOne(idQuery(req.params.id, 'partId'));
    if (!part) return sendError(res, 'Part not found', 404);

    // Apply stock change
    const delta = type === 'Sold' ? -Math.abs(quantity) : quantity;
    const newQuantity = part.quantity + delta;
    if (newQuantity < 0) return sendError(res, 'Insufficient stock', 400);

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    part.quantity = newQuantity;
    part.lastUpdated = today;
    if (type === 'Restocked') part.lastRestocked = today;

    part.activity.unshift({ date: today, type, quantity, reference, notes });

    await part.save();
    return sendSuccess(res, part, `Stock ${type.toLowerCase()} successfully`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/parts/:id
const deletePart = async (req, res, next) => {
  try {
    const part = await Part.findOneAndDelete(idQuery(req.params.id, 'partId'));
    if (!part) return sendError(res, 'Part not found', 404);
    return sendSuccess(res, null, 'Part deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getParts, getPartById, createPart, updatePart, adjustStock, deletePart,
};
