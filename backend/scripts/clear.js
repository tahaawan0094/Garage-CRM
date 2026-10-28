require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const WorkOrder = require('../models/WorkOrder');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Part = require('../models/Part');
const Mechanic = require('../models/Mechanic');
const Transaction = require('../models/Transaction');

const clearDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not set in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, { dbName: 'garage-crm' });
    console.log('Connected to MongoDB Atlas.');

    console.log('Clearing all collections to start from ZERO...');
    await Customer.deleteMany({});
    await Vehicle.deleteMany({});
    await WorkOrder.deleteMany({});
    await Quotation.deleteMany({});
    await Invoice.deleteMany({});
    await Part.deleteMany({});
    await Mechanic.deleteMany({});
    await Transaction.deleteMany({});

    // Also clear counters if collection exists
    if (mongoose.connection.collection('counters')) {
      await mongoose.connection.collection('counters').deleteMany({});
    }

    console.log('✅ ALL collections have been completely cleared! Database is at ZERO.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
