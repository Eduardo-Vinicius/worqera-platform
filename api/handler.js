const { createExpressApp } = require('./src/app');
const serverless = require('serverless-http');

const app = createExpressApp();

module.exports = app;
module.exports.handler = serverless(app);
