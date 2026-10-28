const express = require('express');
const router = express.Router();
const {
  getQuotations, getQuotationById, createQuotation, updateQuotation,
  approveQuotation, rejectQuotation, deleteQuotation,
} = require('../controllers/quotationController');

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);
router.put('/:id', updateQuotation);
router.patch('/:id/approve', approveQuotation);
router.patch('/:id/reject', rejectQuotation);
router.delete('/:id', deleteQuotation);

module.exports = router;
