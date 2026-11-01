const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LOCAL_STORE_PATH = path.join(__dirname, '..', 'data', 'license-store.json');
const DEFAULT_MASTER_DB = 'garage_system_master';

function getTenantDatabaseName(businessName, businessId) {
  const cleanName = String(businessName || 'garage')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22) || 'workshop';

  const cleanId = String(businessId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-8) || 'tenant01';

  return `garage_${cleanName}_${cleanId}`;
}

function getStoredDatabaseName() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const store = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, 'utf8'));
      if (store.registration?.databaseName) {
        return store.registration.databaseName;
      }
    }
  } catch (_) {}
  return null;
}

const connectDB = async (overrideDbName) => {
  const targetDb = overrideDbName || getStoredDatabaseName() || DEFAULT_MASTER_DB;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: targetDb,
    });
    console.log(`✅ MongoDB Connected to database [${conn.connection.name}] at: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error [db: ${targetDb}]: ${error.message}`);
    process.exit(1);
  }
};

const switchDatabase = async (targetDbName) => {
  if (!targetDbName) throw new Error('Target database name is required');
  
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.name === targetDbName) {
    return mongoose.connection;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: targetDbName,
    });
    console.log(`✅ Switched MongoDB to tenant database: [${conn.connection.name}]`);
    return conn;
  } catch (error) {
    console.error(`❌ Failed to switch to database [${targetDbName}]: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB,
  switchDatabase,
  getTenantDatabaseName,
  getStoredDatabaseName,
};
