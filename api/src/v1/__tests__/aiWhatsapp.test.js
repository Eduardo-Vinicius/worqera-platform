const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { planHas, isBusinessPlan, saoPauloDayKey } = require('../lib/planCap');
const pricing = require('../lib/whatsappPricing');
const { costUsd } = require('../services/aiService');
const { dailyFallback, weeklyFallback, reviewFallback, weekKey } = require('../services/aiFeatures');

test('AI is in every plan, WhatsApp stays in Business, and the Worqera visit and dev see all', () => {
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PREMIUM' }, 'whatsapp'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_BASIC' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO' }, 'whatsapp'), false);
  assert.equal(planHas({ planCode: 'visit', platformVisit: true }, 'ai'), true);
  assert.equal(planHas({ planCode: 'dev', devBypass: true }, 'ai'), true);
  assert.equal(planHas('WORQERA_BUSINESS', 'export'), false);
  assert.equal(isBusinessPlan(' worqera_business '), true);
  assert.equal(saoPauloDayKey(new Date('2026-10-25T02:00:00.000Z')), '2026-10-24');
});

test('AI quota renews on the 1st of next month in São Paulo', () => {
  const { nextResetAt, monthlyCap } = require('../services/aiService');
  assert.equal(nextResetAt(new Date('2026-10-25T14:00:00.000Z')).toISOString(), '2026-11-01T03:00:00.000Z');
  assert.equal(nextResetAt(new Date('2026-12-31T23:00:00.000Z')).toISOString(), '2027-01-01T03:00:00.000Z');
  assert.equal(monthlyCap(), 1500);
  assert.equal(monthlyCap('WORQERA_BASIC', 'active'), 50);
  assert.equal(monthlyCap('WORQERA_PRO', 'active'), 300);
  assert.equal(monthlyCap('WORQERA_BUSINESS', 'trialing'), 30);
});

test('AI cost follows the price table', () => {
  // 500 in + 300 out on gpt-6-luna = 0.00005 + 0.00015
  assert.equal(Number(costUsd('gpt-6-luna', 500, 300).toFixed(6)), 0.0002);
  assert.equal(Number(costUsd('gpt-5.6-terra', 10000, 1500).toFixed(4)), 0.038);
});

test('WhatsApp pack, overage and cap', () => {
  const inside = pricing.summarizeUsage({ utility: 800, marketing: 40, service: 300 });
  assert.equal(inside.overageBrl, 0);
  assert.equal(inside.metaCostBrl, Number((800 * 0.035 + 40 * 0.3217).toFixed(2)));

  const over = pricing.summarizeUsage({ utility: 1200, marketing: 130, service: 1500 });
  assert.deepEqual(over.extra, { utility: 200, marketing: 30 });
  assert.equal(over.overageBrl, Number((200 * 0.08 + 30 * 0.5).toFixed(2)));
  assert.ok(over.metaCostBrl > inside.metaCostBrl);

  assert.equal(pricing.overCap({ utility: 1999 }, 'utility'), false);
  assert.equal(pricing.overCap({ utility: 2000 }, 'utility'), true);
  assert.equal(pricing.overCap({ marketing: 200 }, 'marketing'), true);
  assert.equal(pricing.overCap({ service: 99999 }, 'service'), false);
});

test('token encryption round-trips and the webhook signature is checked', () => {
  process.env.META_APP_SECRET = 'test-secret';
  process.env.WHATSAPP_TOKEN_KEY = 'another-key';
  delete require.cache[require.resolve('../services/whatsappCloud')];
  const wa = require('../services/whatsappCloud');
  const packed = wa.encrypt('EAAG-business-token');
  assert.notEqual(packed, 'EAAG-business-token');
  assert.equal(wa.decrypt(packed), 'EAAG-business-token');

  const raw = '{"entry":[]}';
  const sig = `sha256=${crypto.createHmac('sha256', 'test-secret').update(raw).digest('hex')}`;
  assert.equal(wa.verifySignature(raw, sig), true);
  assert.equal(wa.verifySignature(raw, 'sha256=bad'), false);
  assert.equal(wa.verifySignature(raw, ''), false);

  const unpaidLong = { amountBrl: 30, since: new Date(Date.now() - 11 * 86400000), paidAt: null };
  const unpaidShort = { amountBrl: 30, since: new Date(Date.now() - 3 * 86400000), paidAt: null };
  assert.equal(wa.overageBlocked(unpaidLong), true);
  assert.equal(wa.overageBlocked(unpaidShort), false);
  assert.equal(wa.overageBlocked({ ...unpaidLong, paidAt: new Date() }), false);
});

test('fallback texts carry the real numbers when there is no AI', () => {
  const daily = dailyFallback({
    ready: 12,
    open: 40,
    overdue: 3,
    dueTomorrow: 5,
    tomorrowBySector: [{ name: 'Pintura', count: 3 }],
    callToday: 4,
    callOverdue: 1,
    quotesOpenValue: 900,
  });
  assert.match(daily, /12 pedidos prontos para avisar/);
  assert.match(daily, /4 orçamentos para ligar/);
  assert.match(daily, /Pintura/);
  assert.match(dailyFallback({ ready: 0, open: 7, overdue: 0, dueTomorrow: 0, tomorrowBySector: [], callToday: 0 }), /Fila em dia/);

  const weekly = weeklyFallback({
    created: 30,
    delivered: 25,
    revenue: 5000,
    ticket: 200,
    onTimePct: 88,
    late: 2,
    refusedByReason: [{ reason: 'Preço', count: 4 }],
    recovered: 2,
    recoveredValue: 400,
    busiestSectors: [{ name: 'Costura', count: 9 }],
  });
  assert.ok(weekly.length >= 5);
  assert.ok(weekly.some((b) => b.includes('Preço')));

  const low = reviewFallback({ score: 2, clientName: 'João Silva', shopName: 'Sapataria Paulista' });
  assert.match(low[0].text, /Oi João/);
  assert.match(low[0].text, /Sentimos muito/);
  const high = reviewFallback({ score: 5, clientName: '', shopName: '' });
  assert.match(high[0].text, /obrigado/);

  assert.equal(weekKey(new Date('2026-10-24T15:00:00.000Z')), '2026-10-19');
});
