require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');


const clienteRoutes = require('./src/routes/clienteRoutes');
const pedidoRoutes = require('./src/routes/pedidoRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const authRoutes = require('./src/routes/authRoutes');
const statusRoutes = require('./src/routes/statusRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const setorRoutes = require('./src/routes/setorRoutes');
const funcionarioRoutes = require('./src/routes/funcionarioRoutes');
const metricsRoutes = require('./src/routes/metricsRoutes');
// const emailRoutes = require('./src/routes/emailRoutes'); // TODO: habilitar futuramente

const app = express();

// IMPORTANTE: CORS deve ser gerenciado ANTES de qualquer outra coisa
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).send();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  next();
});

app.use(express.json());

// Middleware para logs de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('[Request Headers]:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Request Body]:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use('/clientes', clienteRoutes);
app.use('/pedidos', pedidoRoutes);
app.use('/upload', uploadRoutes);
app.use('/auth', authRoutes);
app.use('/status', statusRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/setores', setorRoutes);
app.use('/funcionarios', funcionarioRoutes);
app.use('/metrics', metricsRoutes);
// app.use('/emails', emailRoutes); // TODO: habilitar futuramente

app.get('/', (req, res) => {
  console.log('[Handler] Requisição recebida na rota raiz');
  res.status(200).json({ message: 'API Shoe Repair Lambda funcionando!' });
});

// Middleware para logs de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('[Request Headers]:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[Request Body]:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Exporta o app para uso local
module.exports = app;

// Exporta o handler para AWS Lambda
module.exports.handler = serverless(app);
