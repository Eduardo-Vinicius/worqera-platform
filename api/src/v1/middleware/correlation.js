const { v4: uuidv4 } = require('uuid');

function correlationId(req, res, next) {
  const incoming = req.headers['x-correlation-id'];
  const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : uuidv4();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}

module.exports = { correlationId };
