const storageService = require('../services/storageService');
const { wrap } = require('./helpers');

exports.getFile = wrap(async (req, res) => {
  const raw = req.params[0] || req.path || '';
  const key = String(raw).replace(/^\/+/, '');
  if (!key || key === '*') {
    const err = new Error('Missing file key');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  try {
    const { buffer, contentType } = await storageService.getBuffer(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).send(buffer);
  } catch (err) {
    if (err.code === 'ENOENT' || err.statusCode === 404 || err.code === 'NoSuchKey') {
      const notFound = new Error('File not found');
      notFound.status = 404;
      notFound.code = 'NOT_FOUND';
      throw notFound;
    }
    throw err;
  }
});
