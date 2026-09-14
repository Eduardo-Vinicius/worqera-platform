require('dotenv').config();
const express = require('express');
const { correlationId } = require('./v1/middleware/correlation');
const { errorHandler } = require('./v1/middleware/errors');

function createExpressApp() {
  const app = express();

  // CORS — allow all in development
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Worqera-Shop, X-Correlation-Id'
    );
    res.header('Access-Control-Max-Age', '86400');
    res.status(200).send();
  });

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Worqera-Shop, X-Correlation-Id'
    );
    next();
  });

  // JSON body (webhook raw body can be added later if HMAC over raw bytes is required)
  app.use(express.json({ limit: '2mb' }));

  app.use(correlationId);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', correlationId: req.correlationId });
  });

  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Worqera API',
      health: '/health',
      v1: '/api/v1',
      correlationId: req.correlationId,
    });
  });

  app.use('/api/v1', require('./v1'));

  app.use(errorHandler);

  return app;
}

const app = createExpressApp();

module.exports = app;
module.exports.createExpressApp = createExpressApp;
