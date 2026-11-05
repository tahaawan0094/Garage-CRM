const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb+srv://mrtaha09876_db_user:m4BXvKQeeDvdd2gj@garage-crm.lwqlkqr.mongodb.net/garage-crm?retryWrites=true&w=majority';
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
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
const settingsRoutes = require('./routes/settings');
const licenseManager = require('./services/licenseManager');

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ─── Security & Utilities ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
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
app.use('/api/settings', settingsRoutes);

// License validation gate for all workshop operations
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/license') || req.path.startsWith('/settings') || req.path === '/health') {
    return next();
  }
  try {
    const status = await licenseManager.getStatus();
    if (!status.license || !status.license.accessAllowed) {
      return res.status(423).json({
        success: false,
        code: 'LICENSE_LOCKED',
        status: status.license?.status || 'LOCKED',
        message: status.license?.message || 'Software license has expired or is locked. Please renew with Vertexia.',
        license: status.license,
      });
    }
  } catch (_) {}
  next();
});

app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// ─── Static Frontend Serving ────────────────────────────────────────────────
let distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  distPath = path.join(__dirname, 'dist');
}

app.use(express.static(distPath));

app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.redirect('http://localhost:5173');
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

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
