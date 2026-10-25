/**
 * Official WhatsApp money rules, in one place.
 * Meta BRL rate card for Brazil (Oct 2026), per delivered message.
 * Override any value by env if Meta changes the card.
 */

function num(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const META_RATE_BRL = {
  utility: num('WA_RATE_UTILITY_BRL', 0.035),
  marketing: num('WA_RATE_MARKETING_BRL', 0.3217),
  /** First 1,000 per number per month are free; after that, the utility rate. */
  service: num('WA_RATE_SERVICE_BRL', 0.035),
};

const SERVICE_FREE_PER_MONTH = 1000;

/** Included in the Business plan every month. */
const PACK = {
  utility: num('WA_PACK_UTILITY', 1000),
  marketing: num('WA_PACK_MARKETING', 100),
};

/** What Worqera charges per message above the pack (about 2x Meta). */
const OVERAGE_BRL = {
  utility: num('WA_OVERAGE_UTILITY_BRL', 0.08),
  marketing: num('WA_OVERAGE_MARKETING_BRL', 0.5),
};

/** Hard stop per shop: 2x the pack. Only the Worqera admin lifts it. */
const CAP_MULTIPLIER = num('WA_CAP_MULTIPLIER', 2);

/** Business-initiated follow-ups allowed per quote (avoid blocks and low quality). */
const MAX_FOLLOWUPS_PER_QUOTE = 2;

/** Overage unpaid for longer than this pauses automatic sending. */
const OVERAGE_GRACE_DAYS = 10;

function estimateCost(category) {
  return META_RATE_BRL[category] ?? META_RATE_BRL.utility;
}

/**
 * Month usage → what is in the pack, what is extra, what Worqera pays Meta.
 * @param {{ utility: number, marketing: number, service: number }} counts delivered/sent messages
 */
function summarizeUsage(counts) {
  const utility = Number(counts.utility) || 0;
  const marketing = Number(counts.marketing) || 0;
  const service = Number(counts.service) || 0;
  const extraUtility = Math.max(0, utility - PACK.utility);
  const extraMarketing = Math.max(0, marketing - PACK.marketing);
  const paidService = Math.max(0, service - SERVICE_FREE_PER_MONTH);
  const metaCost =
    utility * META_RATE_BRL.utility + marketing * META_RATE_BRL.marketing + paidService * META_RATE_BRL.service;
  const overage = extraUtility * OVERAGE_BRL.utility + extraMarketing * OVERAGE_BRL.marketing;
  const round = (v) => Math.round(v * 100) / 100;
  return {
    counts: { utility, marketing, service },
    pack: { ...PACK },
    cap: { utility: PACK.utility * CAP_MULTIPLIER, marketing: PACK.marketing * CAP_MULTIPLIER },
    extra: { utility: extraUtility, marketing: extraMarketing },
    metaCostBrl: round(metaCost),
    overageBrl: round(overage),
    percentOfPack: {
      utility: PACK.utility ? Math.round((utility / PACK.utility) * 100) : 0,
      marketing: PACK.marketing ? Math.round((marketing / PACK.marketing) * 100) : 0,
    },
  };
}

/** Is this category already at the hard cap for the month? */
function overCap(counts, category) {
  if (category === 'service') return false;
  const cap = (PACK[category] || 0) * CAP_MULTIPLIER;
  return (Number(counts[category]) || 0) >= cap;
}

module.exports = {
  META_RATE_BRL,
  SERVICE_FREE_PER_MONTH,
  PACK,
  OVERAGE_BRL,
  CAP_MULTIPLIER,
  MAX_FOLLOWUPS_PER_QUOTE,
  OVERAGE_GRACE_DAYS,
  estimateCost,
  summarizeUsage,
  overCap,
};
