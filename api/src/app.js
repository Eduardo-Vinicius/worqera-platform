require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { correlationId } = require('./v1/middleware/correlation');
const { requestLog } = require('./v1/middleware/requestLog');
const { errorHandler } = require('./v1/middleware/errors');

function createExpressApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    })
  );

  app.use(cookieParser());

  // Preserve raw body for webhook HMAC verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        if (req.originalUrl && String(req.originalUrl).includes('/webhooks/')) {
          req.rawBody = buf.toString('utf8');
        }
      },
    })
  );

  app.use(correlationId);
  app.use(requestLog);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      live: true,
      correlationId: req.correlationId,
    });
  });

  app.get('/health/ready', async (req, res) => {
    try {
      const { mongoose } = require('./v1/db/mongo');
      const ready = mongoose.connection.readyState === 1;
      if (!ready) {
        return res.status(503).json({
          status: 'not_ready',
          mongo: mongoose.connection.readyState,
          correlationId: req.correlationId,
        });
      }
      await mongoose.connection.db.admin().command({ ping: 1 });
      return res.status(200).json({
        status: 'ok',
        ready: true,
        mongo: 'up',
        correlationId: req.correlationId,
      });
    } catch (err) {
      return res.status(503).json({
        status: 'not_ready',
        mongo: 'down',
        error: err.message,
        correlationId: req.correlationId,
      });
    }
  });

  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Worqera API',
      health: '/health',
      ready: '/health/ready',
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
