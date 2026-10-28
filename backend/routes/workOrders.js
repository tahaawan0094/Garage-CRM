const express = require('express');
const router = express.Router();
const {
  getWorkOrders, getWorkOrderById, getNextWorkOrderNumber, createWorkOrder,
  updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder,
} = require('../controllers/workOrderController');

router.get('/next-number', getNextWorkOrderNumber);
router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);
router.post('/', createWorkOrder);
router.put('/:id', updateWorkOrder);
router.patch('/:id/status', updateWorkOrderStatus);
router.delete('/:id', deleteWorkOrder);

module.exports = router;
