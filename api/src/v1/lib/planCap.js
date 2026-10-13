const BASIC_ORDER_CAP = 100;
const BASIC_CODES = new Set(['WORQERA_BASIC']);

function isBasicPlan(code) {
  return BASIC_CODES.has(String(code || '').trim().toUpperCase());
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

module.exports = { BASIC_ORDER_CAP, isBasicPlan, saoPauloMonthStart };
