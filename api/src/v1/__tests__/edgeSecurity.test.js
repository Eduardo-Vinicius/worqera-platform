const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { isScannerPath } = require('../middleware/probeGuard');
const { originAllowed } = require('../lib/corsOrigins');
const { sendError, GENERIC_500 } = require('../middleware/errors');

test('scanner paths stay outside the API', () => {
  assert.equal(isScannerPath('/.env'), true);
  assert.equal(isScannerPath('/.git/config'), true);
  assert.equal(isScannerPath('/phpinfo.php'), true);
  assert.equal(isScannerPath('/api/phpinfo.php'), true);
  assert.equal(isScannerPath('/api/v1/orders'), false);
  assert.equal(isScannerPath('/api/v1/files/shops/x/.env.jpg'), false);
  assert.equal(isScannerPath('/health'), false);
  assert.equal(isScannerPath('/'), false);
});

test('browser origin allowlist keeps the site and blocks others', () => {
  const prev = process.env.NODE_ENV;
  const web = process.env.PUBLIC_WEB_URL;
  process.env.NODE_ENV = 'production';
  process.env.PUBLIC_WEB_URL = 'https://app.exemplo.com';
  try {
    assert.equal(originAllowed(undefined), true);
    assert.equal(originAllowed('https://worqera.com'), true);
    assert.equal(originAllowed('https://www.worqera.com'), true);
    assert.equal(originAllowed('https://app.exemplo.com'), true);
    assert.equal(originAllowed('https://evil.example'), false);
    assert.equal(originAllowed('http://localhost:3000'), false);
  } finally {
    process.env.NODE_ENV = prev;
    if (web == null) delete process.env.PUBLIC_WEB_URL;
    else process.env.PUBLIC_WEB_URL = web;
  }
});

test('500 response hides the internal message', () => {
  const res = {
    locals: {},
    statusCode: 0,
    body: null,
    req: { correlationId: 'abc' },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  sendError(res, 500, {
    title: 'Internal Server Error',
    detail: 'Cast to [Number] failed secret-stack',
    code: 'INTERNAL_ERROR',
  });
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.detail, GENERIC_500);
  assert.equal(JSON.stringify(res.body).includes('secret-stack'), false);
  assert.match(res.locals.apiError, /secret-stack/);
});

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function request(server, path, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET', headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('probe, health and auth stay on their own paths', async () => {
  const { createExpressApp } = require('../../app');
  const server = await listen(createExpressApp());
  try {
    const probe = await request(server, '/.env');
    assert.equal(probe.status, 404);
    assert.equal(probe.body, 'Not found');
    assert.equal(probe.headers['x-powered-by'], undefined);
    assert.equal(probe.headers['x-content-type-options'], 'nosniff');

    const health = await request(server, '/health');
    assert.equal(health.status, 200);

    const me = await request(server, '/api/v1/auth/me');
    assert.equal(me.status, 401);
    assert.match(me.body, /Authorization/);

    const site = await request(server, '/api/v1/auth/me', { Origin: 'https://worqera.com' });
    assert.equal(site.headers['access-control-allow-origin'], 'https://worqera.com');

    const other = await request(server, '/api/v1/auth/me', { Origin: 'https://evil.example' });
    assert.equal(other.headers['access-control-allow-origin'], undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
