const Customer = require('../models/Customer');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Customers
 * GET    /api/customers              — list all (with pagination & search)
 * GET    /api/customers/:id          — get single
 * POST   /api/customers              — create
 * PUT    /api/customers/:id          — update
 * DELETE /api/customers/:id          — delete
 */

// GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const { search = '', type, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    if (type && type !== 'All Customer Types') filter.type = type;
    if (status && status !== 'All Status') filter.status = status;

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, customers, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(idQuery(req.params.id, 'customerId'));
    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existing = await Customer.findOne({ name: { $regex: `^${req.body.name.trim()}$`, $options: 'i' } });
      if (existing) {
        if (req.body.phone && (!existing.phone || existing.phone === 'N/A')) existing.phone = req.body.phone;
        if (req.body.email && !existing.email) existing.email = req.body.email;
        if (req.body.address && !existing.address) existing.address = req.body.address;
        await existing.save();
        return sendSuccess(res, existing, 'Customer updated successfully', 200);
      }
    }

    const customerId = req.body.customerId || (await generateId('customer', 'CUST', 3));
    const customer = new Customer({ ...req.body, customerId });
    await customer.save();
    return sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      idQuery(req.params.id, 'customerId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, customer, 'Customer updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete(idQuery(req.params.id, 'customerId'));
    if (!customer) return sendError(res, 'Customer not found', 404);
    return sendSuccess(res, null, 'Customer deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };
