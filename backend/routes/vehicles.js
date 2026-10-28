const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const {
  getVehicles, getVehicleById, getVehiclesByCustomer,
  createVehicle, updateVehicle, deleteVehicle,
} = require('../controllers/vehicleController');

const createRules = [
  body('plate').notEmpty().withMessage('Plate number is required').trim(),
  body('model').notEmpty().withMessage('Vehicle model is required').trim(),
  body('year').notEmpty().withMessage('Year is required'),
  body('customer').notEmpty().withMessage('Customer name is required'),
  body('fuel').optional().isIn(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
  body('status').optional().isIn(['In Service', 'Ready', 'Due', 'Archived']),
];

router.get('/', getVehicles);
router.get('/customer/:customerId', getVehiclesByCustomer);
router.get('/:id', getVehicleById);
router.post('/', createRules, validateRequest, createVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
