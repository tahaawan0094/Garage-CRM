const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

async function run() {
  const localStorePath = path.join(__dirname, '..', 'data', 'license-store.json');
  let prevDb = null;
  try {
    if (fs.existsSync(localStorePath)) {
      const data = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
      prevDb = data.registration?.databaseName;
    }
    fs.writeFileSync(localStorePath, '{}', 'utf8');
    console.log('Local store file wiped to {}');
  } catch (e) {
    console.error('File wipe error:', e.message);
  }

  if (process.env.MONGO_URI) {
    try {
      if (prevDb) {
        console.log(`Dropping previous tenant database [${prevDb}]...`);
        await mongoose.connect(process.env.MONGO_URI, { dbName: prevDb });
        await mongoose.connection.dropDatabase();
        console.log(`Dropped previous tenant database [${prevDb}]!`);
        await mongoose.disconnect();
      }
      console.log('Connecting to default master DB...');
      await mongoose.connect(process.env.MONGO_URI, { dbName: 'garage_system_master' });
      try {
        await mongoose.connection.collection('licenses').deleteMany({});
        await mongoose.connection.collection('users').deleteMany({});
      } catch (_) {}
      console.log('Master database reset completed!');
      await mongoose.disconnect();
    } catch (err) {
      console.error('Mongo wipe error:', err.message);
    }
  }
  process.exit(0);
}

run();
