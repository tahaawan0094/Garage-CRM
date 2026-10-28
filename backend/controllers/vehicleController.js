const Vehicle = require('../models/Vehicle');
const { generateId } = require('../utils/idGenerator');
const { sendSuccess, sendError, sendPaginated } = require('../utils/apiResponse');
const { idQuery } = require('../utils/idMatcher');

/**
 * Controller: Vehicles
 * GET    /api/vehicles               — list all (with pagination, search, filters)
 * GET    /api/vehicles/:id           — get single
 * POST   /api/vehicles               — create
 * PUT    /api/vehicles/:id           — update
 * DELETE /api/vehicles/:id           — delete
 * GET    /api/vehicles/customer/:customerId — vehicles by customer
 */

// GET /api/vehicles
const getVehicles = async (req, res, next) => {
  try {
    const { search = '', status, type, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { vehicleId: { $regex: search, $options: 'i' } },
        { plate: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { year: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'All Status') filter.status = status;
    if (type && type !== 'All Vehicle Types') {
      filter.model = { $regex: type, $options: 'i' };
    }

    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendPaginated(res, vehicles, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicles/:id
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne(idQuery(req.params.id, 'vehicleId'));
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, vehicle);
  } catch (err) {
    next(err);
  }
};

// GET /api/vehicles/customer/:customerId
const getVehiclesByCustomer = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({
      $or: [
        { customerId: req.params.customerId },
        { customer: { $regex: req.params.customerId, $options: 'i' } },
      ],
    }).sort({ createdAt: -1 });
    return sendSuccess(res, vehicles);
  } catch (err) {
    next(err);
  }
};

// POST /api/vehicles
const createVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.body.vehicleId || (await generateId('vehicle', 'VEH', 4));
    const vehicle = new Vehicle({ ...req.body, vehicleId });
    await vehicle.save();
    return sendSuccess(res, vehicle, 'Vehicle created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/vehicles/:id
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndUpdate(
      idQuery(req.params.id, 'vehicleId'),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, vehicle, 'Vehicle updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vehicles/:id
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete(idQuery(req.params.id, 'vehicleId'));
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, null, 'Vehicle deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles, getVehicleById, getVehiclesByCustomer,
  createVehicle, updateVehicle, deleteVehicle,
};
