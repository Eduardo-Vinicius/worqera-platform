const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não informado.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

module.exports.requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || req.user?.perfil || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.', code: 'FORBIDDEN' });
  }
  next();
};
