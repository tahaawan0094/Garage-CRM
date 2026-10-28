const express = require('express');
const router = express.Router();
const {
  getMechanics, getMechanicById, createMechanic, updateMechanic,
  updateMechanicStatus, deleteMechanic,
} = require('../controllers/mechanicController');

router.get('/', getMechanics);
router.get('/:id', getMechanicById);
router.post('/', createMechanic);
router.put('/:id', updateMechanic);
router.patch('/:id/status', updateMechanicStatus);
router.delete('/:id', deleteMechanic);

module.exports = router;
