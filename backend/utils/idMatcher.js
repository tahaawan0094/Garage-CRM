const mongoose = require('mongoose');

/**
 * Build a query that safely checks MongoDB _id OR custom business ID (e.g. CUST-001, WO-00012)
 * Avoids Mongoose CastError when custom ID is passed.
 */
const idQuery = (id, customField) => {
  if (!id) return {};
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
    return { $or: [{ _id: id }, { [customField]: id }] };
  }
  return { [customField]: id };
};

module.exports = { idQuery };
