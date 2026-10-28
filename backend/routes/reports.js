const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getRevenueReport, getJobsReport, getPartsReport,
} = require('../controllers/reportController');

router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueReport);
router.get('/jobs', getJobsReport);
router.get('/parts', getPartsReport);

module.exports = router;
