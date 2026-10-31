const BASIC_ORDER_CAP = 150;

const TIER = {
  WORQERA_BASIC: 'basic',
  WORQERA_PRO: 'pro',
  WORQERA_EARLY: 'pro',
  WORQERA_BUSINESS: 'business',
  WORQERA_PREMIUM: 'business',
};

function planTier(code) {
  return TIER[String(code || '').trim().toUpperCase()] || null;
}

function isBasicPlan(code) {
  return planTier(code) === 'basic';
}

function isBusinessPlan(code) {
  return planTier(code) === 'business';
}

/**
 * `ai`: every paid plan and the trial (the quota is what changes).
 * `whatsapp`: Business, not during the trial. `weekly`: Business.
 * Takes `req.subscription` (or a plan code). The Worqera admin visiting a shop
 * and non-production runs see everything, so the features can be tried.
 */
function planHas(subscription, feature) {
  const sub = subscription && typeof subscription === 'object' ? subscription : { planCode: subscription };
  if (sub.platformVisit || sub.devBypass) return ['ai', 'whatsapp', 'weekly'].includes(feature);
  if (feature === 'ai') return Boolean(planTier(sub.planCode));
  if (feature === 'weekly') return isBusinessPlan(sub.planCode);
  if (feature === 'whatsapp') return isBusinessPlan(sub.planCode) && sub.status !== 'trialing';
  return false;
}

/** Midnight on the first day of the month in America/Sao_Paulo (UTC−3). */
function saoPauloMonthStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  return new Date(`${year}-${month}-01T00:00:00-03:00`);
}

/** YYYY-MM-DD of the São Paulo calendar day. */
function saoPauloDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

module.exports = {
  BASIC_ORDER_CAP,
  planTier,
  isBasicPlan,
  isBusinessPlan,
  planHas,
  saoPauloMonthStart,
  saoPauloDayKey,
};
