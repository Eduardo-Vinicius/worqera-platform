const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoute, compareVersion, noticeMatches } = require('../lib/runtimeMatch');

test('normalizeRoute uses express template', () => {
  const route = normalizeRoute({
    baseUrl: '/api/v1/orders',
    route: { path: '/:id' },
    originalUrl: '/api/v1/orders/abc',
  });
  assert.equal(route, '/api/v1/orders/:id');
});

test('normalizeRoute masks raw ids', () => {
  const route = normalizeRoute({
    originalUrl: '/api/v1/orders/507f1f77bcf86cd799439011/items/2',
  });
  assert.equal(route, '/api/v1/orders/:id/items/:n');
});

test('compareVersion orders dotted numbers', () => {
  assert.equal(compareVersion('1.2.0', '1.10.0') < 0, true);
  assert.equal(compareVersion('2.0', '1.9.9') > 0, true);
  assert.equal(compareVersion('1.0', '1'), 0);
});

test('noticeMatches filters platform, version and region', () => {
  const notice = {
    active: true,
    platform: 'ios',
    minVersion: '1.2.0',
    maxVersion: '2.0.0',
    region: 'SP',
  };
  assert.equal(noticeMatches(notice, { platform: 'ios', version: '1.2.0', region: 'sp' }), true);
  assert.equal(noticeMatches(notice, { platform: 'android', version: '1.2.0', region: 'SP' }), false);
  assert.equal(noticeMatches(notice, { platform: 'ios', version: '1.0.0', region: 'SP' }), false);
  assert.equal(noticeMatches(notice, { platform: 'ios', version: '', region: 'SP' }), false);
});
