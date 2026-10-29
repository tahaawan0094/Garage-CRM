const Mechanic = require('../models/Mechanic');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Mechanics
 * GET    /api/mechanics              — list all
 * GET    /api/mechanics/:id          — get single
 * POST   /api/mechanics              — create
 * PUT    /api/mechanics/:id          — update
 * PATCH  /api/mechanics/:id/status   — update availability status
 * DELETE /api/mechanics/:id          — delete
 */

// GET /api/mechanics
const getMechanics = async (req, res, next) => {
  try {
    const { search = '', role, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { mechanicId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'All Roles') filter.role = role;
    if (status && status !== 'All Status') filter.status = status;

    const total = await Mechanic.countDocuments(filter);
    const mechanics = await Mechanic.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, mechanics, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/mechanics/:id
const getMechanicById = async (req, res, next) => {
  try {
    const mechanic = await Mechanic.findOne(idQuery(req.params.id, 'mechanicId'));
    if (!mechanic) return sendError(res, 'Mechanic not found', 404);
    return sendSuccess(res, mechanic);
  } catch (err) {
    next(err);
  }
};

// POST /api/mechanics
const createMechanic = async (req, res, next) => {
  try {
    const mechanicId = req.body.mechanicId || (await generateId('mechanic', 'MEC', 4));
    const mechanic = new Mechanic({ ...req.body, mechanicId });
    await mechanic.save();
    return sendSuccess(res, mechanic, 'Mechanic created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/mechanics/:id
const updateMechanic = async (req, res, next) => {
  try {
    const mechanic = await Mechanic.findOneAndUpdate(
      idQuery(req.params.id, 'mechanicId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!mechanic) return sendError(res, 'Mechanic not found', 404);
    return sendSuccess(res, mechanic, 'Mechanic updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/mechanics/:id/status
const updateMechanicStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['On Job', 'Available', 'Busy', 'Off Duty', 'On Leave', 'On Duty'];
    if (!allowedStatuses.includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }
    const mechanic = await Mechanic.findOneAndUpdate(
      idQuery(req.params.id, 'mechanicId'),
      { $set: { status } },
      { new: true }
    );
    if (!mechanic) return sendError(res, 'Mechanic not found', 404);
    return sendSuccess(res, mechanic, `Status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/mechanics/:id
const deleteMechanic = async (req, res, next) => {
  try {
    const mechanic = await Mechanic.findOneAndDelete(idQuery(req.params.id, 'mechanicId'));
    if (!mechanic) return sendError(res, 'Mechanic not found', 404);
    return sendSuccess(res, null, 'Mechanic deleted successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/mechanics/:id/salary - Record salary payment
const recordSalaryPayment = async (req, res, next) => {
  try {
    const slipNo = req.body.slipNo || (await generateId('salary', 'SLIP', 4));
    const salaryRecord = {
      ...req.body,
      slipNo,
      netSalary:
        Number(req.body.baseSalary || 0) +
        Number(req.body.bonus || 0) -
        Number(req.body.deductions || 0),
    };

    const mechanic = await Mechanic.findOneAndUpdate(
      idQuery(req.params.id, 'mechanicId'),
      { $push: { salaryHistory: salaryRecord } },
      { new: true }
    );

    if (!mechanic) return sendError(res, 'Mechanic not found', 404);
    return sendSuccess(res, { mechanic, salaryRecord }, 'Salary payment recorded successfully', 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/mechanics/salaries/all - Get all salary disbursements across all mechanics
const getAllSalaries = async (req, res, next) => {
  try {
    const mechanics = await Mechanic.find({ 'salaryHistory.0': { $exists: true } });
    const allDisbursements = [];

    for (const m of mechanics) {
      for (const slip of m.salaryHistory || []) {
        allDisbursements.push({
          id: slip._id || slip.slipNo,
          slipNo: slip.slipNo,
          mechanicId: m.mechanicId || m._id,
          mechanicName: m.name,
          role: m.role,
          month: slip.month,
          baseSalary: slip.baseSalary,
          bonus: slip.bonus,
          deductions: slip.deductions,
          netSalary: slip.netSalary,
          paymentDate: slip.paymentDate,
          paymentMethod: slip.paymentMethod,
          status: slip.status,
          reference: slip.reference,
          notes: slip.notes,
          createdAt: slip.createdAt,
        });
      }
    }

    // Sort descending by date
    allDisbursements.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return sendSuccess(res, allDisbursements);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMechanics, getMechanicById, createMechanic, updateMechanic,
  updateMechanicStatus, deleteMechanic, recordSalaryPayment, getAllSalaries,
};
