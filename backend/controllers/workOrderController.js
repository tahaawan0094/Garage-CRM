const WorkOrder = require('../models/WorkOrder');
const Vehicle = require('../models/Vehicle');
const { generateId, peekNextId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Work Orders
 * GET    /api/work-orders/next-number — get next sequential work order ID
 * GET    /api/work-orders            — list all (pagination, search, status filter)
 * GET    /api/work-orders/:id        — get single
 * POST   /api/work-orders            — create (New Intake)
 * PUT    /api/work-orders/:id        — update
 * PATCH  /api/work-orders/:id/status — update status only
 * DELETE /api/work-orders/:id        — delete
 */

// GET /api/work-orders/next-number
const getNextWorkOrderNumber = async (req, res, next) => {
  try {
    const nextId = await peekNextId('workOrder', 'WO', 5);
    return sendSuccess(res, { nextId });
  } catch (err) {
    next(err);
  }
};

// GET /api/work-orders
const getWorkOrders = async (req, res, next) => {
  try {
    const { search = '', status, mechanic, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { workOrderId: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { vehicle: { $regex: search, $options: 'i' } },
        { plate: { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All') filter.status = status;
    if (mechanic) filter.mechanic = { $regex: mechanic, $options: 'i' };

    const total = await WorkOrder.countDocuments(filter);
    const workOrders = await WorkOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, workOrders, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/work-orders/:id
const getWorkOrderById = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findOne(idQuery(req.params.id, 'workOrderId'));
    if (!workOrder) return sendError(res, 'Work order not found', 404);
    return sendSuccess(res, workOrder);
  } catch (err) {
    next(err);
  }
};

// POST /api/work-orders
const createWorkOrder = async (req, res, next) => {
  try {
    let workOrderId = req.body.workOrderId;
    if (!workOrderId || (await WorkOrder.exists({ workOrderId }))) {
      workOrderId = await generateId('workOrder', 'WO', 5);
    }
    const workOrder = new WorkOrder({ ...req.body, workOrderId });
    await workOrder.save();

    // Update vehicle status to "In Service" if vehicleId is provided
    if (req.body.vehicleId) {
      await Vehicle.findOneAndUpdate(idQuery(req.body.vehicleId, 'vehicleId'), { status: 'In Service' });
    }

    return sendSuccess(res, workOrder, 'Work order created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/work-orders/:id
const updateWorkOrder = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findOneAndUpdate(
      idQuery(req.params.id, 'workOrderId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!workOrder) return sendError(res, 'Work order not found', 404);
    return sendSuccess(res, workOrder, 'Work order updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/work-orders/:id/status
const updateWorkOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['In Progress', 'Awaiting Parts', 'Ready for Delivery', 'Completed', 'Released', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }

    const workOrder = await WorkOrder.findOneAndUpdate(
      idQuery(req.params.id, 'workOrderId'),
      { $set: { status } },
      { new: true }
    );
    if (!workOrder) return sendError(res, 'Work order not found', 404);

    // Update vehicle status accordingly
    if (workOrder.vehicleId) {
      let vehicleStatus = 'In Service';
      if (status === 'Ready for Delivery') vehicleStatus = 'Ready';
      if (status === 'Completed' || status === 'Released') vehicleStatus = 'Ready';
      await Vehicle.findOneAndUpdate(idQuery(workOrder.vehicleId, 'vehicleId'), { status: vehicleStatus });
    }

    return sendSuccess(res, workOrder, `Status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/work-orders/:id
const deleteWorkOrder = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findOneAndDelete(idQuery(req.params.id, 'workOrderId'));
    if (!workOrder) return sendError(res, 'Work order not found', 404);
    return sendSuccess(res, null, 'Work order deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWorkOrders, getWorkOrderById, getNextWorkOrderNumber, createWorkOrder,
  updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder,
};
