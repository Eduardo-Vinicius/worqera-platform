const test = require('node:test');
const assert = require('node:assert/strict');
const { isBasicPlan, saoPauloMonthStart, BASIC_ORDER_CAP } = require('../lib/planCap');

test('only Basic is capped, and the month follows São Paulo', () => {
  assert.equal(BASIC_ORDER_CAP, 150);
  assert.equal(isBasicPlan('WORQERA_BASIC'), true);
  assert.equal(isBasicPlan(' worqera_basic '), true);
  assert.equal(isBasicPlan('WORQERA_PRO'), false);
  assert.equal(isBasicPlan('WORQERA_BUSINESS'), false);
  assert.equal(isBasicPlan('WORQERA_EARLY'), false);
  assert.equal(isBasicPlan('WORQERA_PREMIUM'), false);

  const stillSeptember = saoPauloMonthStart(new Date('2026-10-01T02:30:00.000Z'));
  assert.equal(stillSeptember.toISOString(), '2026-09-01T03:00:00.000Z');

  const october = saoPauloMonthStart(new Date('2026-10-01T03:30:00.000Z'));
  assert.equal(october.toISOString(), '2026-10-01T03:00:00.000Z');
});

test('every paid plan has AI; WhatsApp and the weekly reading stay in Business', () => {
  const { planHas, planTier } = require('../lib/planCap');
  assert.equal(planTier('WORQERA_BASIC'), 'basic');
  assert.equal(planTier('worqera_premium'), 'business');
  assert.equal(planTier('WORQERA_EARLY'), 'pro');
  assert.equal(planTier('nope'), null);
  assert.equal(planHas({ planCode: 'WORQERA_BASIC', status: 'active' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'trialing' }, 'ai'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'active' }, 'whatsapp'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'trialing' }, 'whatsapp'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'active' }, 'whatsapp'), true);
  assert.equal(planHas({ planCode: 'WORQERA_PRO', status: 'active' }, 'weekly'), false);
  assert.equal(planHas({ planCode: 'WORQERA_BUSINESS', status: 'trialing' }, 'weekly'), true);
});

test('Basic stops at 2 active accounts; Pro and Business have no cap', () => {
  const { BASIC_USER_CAP, basicUserCapReached } = require('../lib/planCap');
  assert.equal(BASIC_USER_CAP, 2);
  assert.equal(basicUserCapReached('WORQERA_BASIC', 1), false);
  assert.equal(basicUserCapReached('WORQERA_BASIC', 2), true);
  assert.equal(basicUserCapReached('WORQERA_BASIC', 5), true);
  assert.equal(basicUserCapReached('WORQERA_PRO', 50), false);
  assert.equal(basicUserCapReached('WORQERA_BUSINESS', 50), false);
  assert.equal(basicUserCapReached(null, 50), false);
});
