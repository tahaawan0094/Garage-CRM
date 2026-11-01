const mongoose = require('mongoose');

const CENTRAL_DB_NAME = 'garage_central_directory';

function getCentralDb() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return null;
  }
  return mongoose.connection.useDb(CENTRAL_DB_NAME, { useCache: true });
}

const centralDirectory = {
  async ensureIndexes() {
    try {
      const db = getCentralDb();
      if (!db) return;
      await db.collection('workshops').createIndex({ businessId: 1 }, { unique: true });
      await db.collection('user_directory').createIndex({ username_normalized: 1 }, { unique: true });
      await db.collection('user_directory').createIndex({ businessId: 1 });
    } catch (err) {
      console.warn('[CENTRAL_DIR] Index setup notice:', err.message);
    }
  },

  async recordWorkshop(workshop) {
    try {
      const db = getCentralDb();
      if (!db) return;
      await db.collection('workshops').updateOne(
        { businessId: workshop.businessId },
        {
          $set: {
            businessId: workshop.businessId,
            businessName: workshop.businessName,
            databaseName: workshop.databaseName,
            ownerName: workshop.ownerName,
            phone: workshop.phone || '',
            email: workshop.email || '',
            city: workshop.city || '',
            businessType: workshop.businessType || 'Auto Workshop / Garage',
            license: workshop.license || { status: 'ACTIVATION_REQUIRED', licenseType: 'PERMANENT' },
            companyContact: workshop.companyContact || null,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      console.log(`[CENTRAL_DIR] Workshop recorded in central cloud directory: ${workshop.businessName} [DB: ${workshop.databaseName}]`);
    } catch (err) {
      console.error('[CENTRAL_DIR] Failed to record workshop in central directory:', err.message);
    }
  },

  async updateWorkshopLicense(businessId, licenseUpdate) {
    try {
      const db = getCentralDb();
      if (!db) return;
      await db.collection('workshops').updateOne(
        { businessId },
        {
          $set: {
            license: licenseUpdate,
            updatedAt: new Date(),
          },
        }
      );
    } catch (err) {
      console.warn('[CENTRAL_DIR] License update notice:', err.message);
    }
  },

  async findWorkshop(businessId) {
    try {
      const db = getCentralDb();
      if (!db) return null;
      return await db.collection('workshops').findOne({ businessId });
    } catch (err) {
      console.warn('[CENTRAL_DIR] findWorkshop error:', err.message);
      return null;
    }
  },

  async recordUser(user) {
    try {
      const db = getCentralDb();
      if (!db) return;
      const normalized = user.username.toLowerCase().trim();
      await db.collection('user_directory').updateOne(
        { username_normalized: normalized },
        {
          $set: {
            username_normalized: normalized,
            username: user.username,
            fullName: user.fullName,
            passwordHash: user.passwordHash,
            salt: user.salt,
            role: user.role || 'staff',
            businessId: user.businessId,
            databaseName: user.databaseName,
            allowedTabs: user.allowedTabs || ['Dashboard'],
            isActive: user.isActive !== false,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      console.log(`[CENTRAL_DIR] User recorded in central cloud directory: ${user.username} (Workshop DB: ${user.databaseName})`);
    } catch (err) {
      console.error('[CENTRAL_DIR] Failed to record user in central directory:', err.message);
    }
  },

  async removeUser(username) {
    try {
      const db = getCentralDb();
      if (!db) return;
      const normalized = username.toLowerCase().trim();
      await db.collection('user_directory').deleteOne({ username_normalized: normalized });
    } catch (err) {
      console.warn('[CENTRAL_DIR] removeUser error:', err.message);
    }
  },

  async findUser(username) {
    try {
      const db = getCentralDb();
      if (!db) return null;
      const normalized = username.toLowerCase().trim();
      return await db.collection('user_directory').findOne({ username_normalized: normalized });
    } catch (err) {
      console.warn('[CENTRAL_DIR] findUser error:', err.message);
      return null;
    }
  },
};

module.exports = centralDirectory;

