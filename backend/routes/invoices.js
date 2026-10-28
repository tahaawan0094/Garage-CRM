const express = require('express');
const router = express.Router();
const {
  getInvoices, getInvoiceById, getNextInvoiceNumber, createInvoice, updateInvoice,
  markInvoicePaid, deleteInvoice,
} = require('../controllers/invoiceController');

router.get('/next-number', getNextInvoiceNumber);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoice);
router.put('/:id', updateInvoice);
router.patch('/:id/pay', markInvoicePaid);
router.delete('/:id', deleteInvoice);

module.exports = router;
