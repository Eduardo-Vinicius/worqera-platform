require('dotenv').config();
const express = require('express');
const { correlationId } = require('./v1/middleware/correlation');
const { errorHandler } = require('./v1/middleware/errors');

function mountLegacyRoutes(app) {
  const clienteRoutes = require('./routes/clienteRoutes');
  const pedidoRoutes = require('./routes/pedidoRoutes');
  const uploadRoutes = require('./routes/uploadRoutes');
  const authRoutes = require('./routes/authRoutes');
  const statusRoutes = require('./routes/statusRoutes');
  const dashboardRoutes = require('./routes/dashboardRoutes');
  const setorRoutes = require('./routes/setorRoutes');
  const funcionarioRoutes = require('./routes/funcionarioRoutes');
  const metricsRoutes = require('./routes/metricsRoutes');

  app.use('/clientes', clienteRoutes);
  app.use('/pedidos', pedidoRoutes);
  app.use('/upload', uploadRoutes);
  app.use('/auth', authRoutes);
  app.use('/status', statusRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/setores', setorRoutes);
  app.use('/funcionarios', funcionarioRoutes);
  app.use('/metrics', metricsRoutes);
}

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

  mountLegacyRoutes(app);

  app.use(errorHandler);

  return app;
}

const app = createExpressApp();

module.exports = app;
module.exports.createExpressApp = createExpressApp;
