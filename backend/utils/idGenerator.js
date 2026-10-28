const mongoose = require('mongoose');

/**
 * Utility: Sequential ID Generator
 * Generates IDs like CUST-011, VEH-0053, WO-00013, etc.
 * Uses a counters collection in MongoDB and ensures no duplicate IDs.
 */

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

const modelMap = {
  customer: { model: 'Customer', field: 'customerId' },
  vehicle: { model: 'Vehicle', field: 'vehicleId' },
  workOrder: { model: 'WorkOrder', field: 'workOrderId' },
  quotation: { model: 'Quotation', field: 'quotationId' },
  invoice: { model: 'Invoice', field: 'invoiceId' },
  part: { model: 'Part', field: 'partId' },
  mechanic: { model: 'Mechanic', field: 'mechanicId' },
  transaction: { model: 'Transaction', field: 'transactionId' },
};

const generateId = async (name, prefix, padLength = 3) => {
  const mapping = modelMap[name];

  let counter = await Counter.findById(name);
  if (!counter) {
    let maxSeq = 0;
    if (mapping && mongoose.models[mapping.model]) {
      const records = await mongoose.models[mapping.model].find({}, mapping.field).lean();
      for (const rec of records) {
        const val = rec[mapping.field];
        if (typeof val === 'string') {
          const match = val.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxSeq) maxSeq = num;
          }
        }
      }
    }
    counter = await Counter.findByIdAndUpdate(
      name,
      { $set: { seq: maxSeq } },
      { returnDocument: 'after', upsert: true }
    );
  }

  while (true) {
    const updated = await Counter.findByIdAndUpdate(
      name,
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const candidateId = `${prefix}-${String(updated.seq).padStart(padLength, '0')}`;

    if (mapping && mongoose.models[mapping.model]) {
      const exists = await mongoose.models[mapping.model].findOne({ [mapping.field]: candidateId });
      if (!exists) return candidateId;
    } else {
      return candidateId;
    }
  }
};

const peekNextId = async (name, prefix, padLength = 5) => {
  const mapping = modelMap[name];
  let maxSeq = 0;
  const counter = await Counter.findById(name);
  if (counter && counter.seq > maxSeq) {
    maxSeq = counter.seq;
  }
  if (mapping && mongoose.models[mapping.model]) {
    const records = await mongoose.models[mapping.model].find({}, mapping.field).lean();
    for (const rec of records) {
      const val = rec[mapping.field];
      if (typeof val === 'string') {
        const match = val.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(padLength, '0')}`;
};

module.exports = { generateId, peekNextId };

