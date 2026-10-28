const express = require('express');
const router = express.Router();
const {
  getParts, getPartById, createPart, updatePart, adjustStock, deletePart,
} = require('../controllers/partController');

router.get('/', getParts);
router.get('/:id', getPartById);
router.post('/', createPart);
router.put('/:id', updatePart);
router.patch('/:id/stock', adjustStock);
router.delete('/:id', deletePart);

module.exports = router;
