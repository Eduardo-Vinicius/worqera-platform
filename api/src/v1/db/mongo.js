const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/worqera';

function getMongoUri() {
  return (
    process.env.WORQERA_Mongo__Uri ||
    process.env.MONGODB_URI ||
    DEFAULT_URI
  );
}

async function connectMongo(uri = getMongoUri()) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[Mongo] Connected:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  return mongoose.connection;
}

module.exports = {
  connectMongo,
  getMongoUri,
  mongoose,
};
