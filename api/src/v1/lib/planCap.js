const BASIC_ORDER_CAP = 100;
const BASIC_CODES = new Set(['WORQERA_BASIC']);

const BUSINESS_CODES = new Set(['WORQERA_BUSINESS', 'WORQERA_PREMIUM']);

function isBasicPlan(code) {
  return BASIC_CODES.has(String(code || '').trim().toUpperCase());
}

function isBusinessPlan(code) {
  return BUSINESS_CODES.has(String(code || '').trim().toUpperCase());
}

/**
 * Business-only perks: `ai` and `whatsapp`.
 * Takes `req.subscription` (or a plan code). The Worqera admin visiting a shop
 * and non-production runs see everything, so the features can be tried.
 */
function planHas(subscription, feature) {
  if (!['ai', 'whatsapp'].includes(feature)) return false;
  if (subscription && typeof subscription === 'object') {
    if (subscription.platformVisit || subscription.devBypass) return true;
    return isBusinessPlan(subscription.planCode);
  }
  return isBusinessPlan(subscription);
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
  isBasicPlan,
  isBusinessPlan,
  planHas,
  saoPauloMonthStart,
  saoPauloDayKey,
};
