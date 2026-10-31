const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

async function run() {
  const localStorePath = path.join(__dirname, '..', 'data', 'license-store.json');
  try {
    fs.writeFileSync(localStorePath, '{}', 'utf8');
    console.log('Local store file wiped to {}');
  } catch (e) {
    console.error('File wipe error:', e.message);
  }

  if (process.env.MONGO_URI) {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected! Wiping licenses and users...');
      await mongoose.connection.collection('licenses').deleteMany({});
      await mongoose.connection.collection('users').deleteMany({});
      console.log('MongoDB licenses and users collections completely wiped!');
      await mongoose.disconnect();
    } catch (err) {
      console.error('Mongo wipe error:', err.message);
    }
  }
  process.exit(0);
}

run();

