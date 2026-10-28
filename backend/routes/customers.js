const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const {
  getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
} = require('../controllers/customerController');

const createRules = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('phone').optional({ checkFalsy: true }).trim(),
  body('type').optional({ checkFalsy: true }).isIn(['Individual', 'Fleet', 'Corporate']),
  body('status').optional({ checkFalsy: true }).isIn(['Active', 'VIP', 'Inactive', 'Corporate']),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format'),
];

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createRules, validateRequest, createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
