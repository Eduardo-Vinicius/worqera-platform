const test = require('node:test');
const assert = require('node:assert/strict');
const { nextStep, messageFor } = require('../services/feedbackCrm');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-07T15:00:00Z');
const ago = (d) => new Date(now.getTime() - d * DAY);

test('nextStep: ask → remind (once, after 2 days) → waiting', () => {
  assert.equal(nextStep({}, { now }), 'ask');
  assert.equal(nextStep({ reviewAsk: { at: ago(1), count: 1 } }, { now }), 'waiting');
  assert.equal(nextStep({ reviewAsk: { at: ago(3), count: 1 } }, { now }), 'remind');
  assert.equal(nextStep({ reviewAsk: { at: ago(5), count: 2 } }, { now }), 'waiting', 'no third nudge');
});

test('nextStep: answered 4–5 → Google (only with the link, until tapped); 1–3 → recover', () => {
  assert.equal(nextStep({ feedback: { score: 5 } }, { now, hasReviewUrl: true }), 'google');
  assert.equal(nextStep({ feedback: { score: 5 } }, { now, hasReviewUrl: false }), 'done');
  assert.equal(nextStep({ feedback: { score: 4 }, googleReviewAt: ago(1) }, { now, hasReviewUrl: true }), 'done');
  assert.equal(nextStep({ feedback: { score: 2 } }, { now }), 'recover');
  assert.equal(nextStep({ feedback: { score: 2 }, reviewAsk: { recoverAt: ago(1) } }, { now }), 'done');
});

test('messageFor: rating link goes to #avaliar; Google message carries the shop link', () => {
  const base = { name: 'Ana Souza', shop: 'Galeria', code: '00042', link: 'https://worqera.com/p/o/tok', reviewUrl: 'https://g.page/r/x', score: 5 };
  assert.match(messageFor('ask', base), /Oi, Ana!.*#00042.*https:\/\/worqera\.com\/p\/o\/tok#avaliar/);
  assert.match(messageFor('google', base), /nota 5.*https:\/\/g\.page\/r\/x/);
  assert.equal(messageFor('done', base), null);
});
