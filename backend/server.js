const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const customerRoutes = require('./routes/customers');
const vehicleRoutes = require('./routes/vehicles');
const workOrderRoutes = require('./routes/workOrders');
const quotationRoutes = require('./routes/quotations');
const invoiceRoutes = require('./routes/invoices');
const partRoutes = require('./routes/parts');
const mechanicRoutes = require('./routes/mechanics');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const licenseRoutes = require('./routes/license');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ─── Security & Utilities ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Garage CRM Backend is running ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Garage CRM Server running on http://localhost:${PORT}`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/health`);
});
