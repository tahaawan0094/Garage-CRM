const express = require('express');
const router = express.Router();
const {
  getTransactions, getTransactionById, createTransaction, deleteTransaction,
} = require('../controllers/transactionController');

router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
