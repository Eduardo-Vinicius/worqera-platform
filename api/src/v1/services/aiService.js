/**
 * One door to the LLM. Every call checks the key and the monthly cap,
 * and records tokens and cost in AiUsage. Callers always have a fallback:
 * when this returns null, they show the ready-made text.
 */

const AiUsage = require('../models/AiUsage');
const { saoPauloMonthStart } = require('../lib/planCap');

/** USD per 1M tokens [input, output]. Unknown models use the fast default. */
const PRICES = {
  'gpt-6-luna': [0.1, 0.5],
  'gpt-5.6-luna': [0.2, 1.2],
  'gpt-5.6-terra': [2, 12],
  'gpt-5-nano': [0.05, 0.4],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4o-mini': [0.15, 0.6],
};

const FALLBACK_MODEL = 'gpt-4o-mini';

function apiKey() {
  return process.env.OPENAI_API_KEY || process.env.WORQERA_OpenAI__ApiKey || '';
}

function aiConfigured() {
  return Boolean(apiKey());
}

function modelFor(depth = 'fast') {
  if (depth === 'deep') return process.env.WORQERA_AI_MODEL_DEEP || 'gpt-5.6-terra';
  return process.env.WORQERA_AI_MODEL || 'gpt-6-luna';
}

/** AI uses included in the Business plan per month (each answer the AI writes = 1 use). */
function monthlyCap() {
  const n = Number(process.env.WORQERA_AI_MONTHLY_CAP);
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

function costUsd(model, inputTokens, outputTokens) {
  const [inp, out] = PRICES[model] || PRICES[modelFor('fast')] || PRICES[FALLBACK_MODEL];
  return (inputTokens * inp + outputTokens * out) / 1_000_000;
}

function monthKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(date);
}

/** First day of next month in São Paulo, when the quota renews. */
function nextResetAt(now = new Date()) {
  const start = saoPauloMonthStart(now);
  return saoPauloMonthStart(new Date(start.getTime() + 32 * 24 * 60 * 60 * 1000));
}

/** Only answers the AI actually wrote count; failures cost nothing. */
async function callsThisMonth(shopId) {
  return AiUsage.countDocuments({ shopId, ok: true, createdAt: { $gte: saoPauloMonthStart() } });
}

/**
 * The shop's AI quota this month: plan limit (or the Worqera override) plus
 * any extra granted for this month by the Worqera admin.
 */
async function quotaFor(shopId, now = new Date()) {
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(shopId).select('aiQuota').lean();
  const q = shop?.aiQuota || {};
  const base = Number(q.monthlyCap) > 0 ? Number(q.monthlyCap) : monthlyCap();
  const extra = q.extraMonth === monthKey(now) ? Number(q.extraCalls) || 0 : 0;
  const limit = base + extra;
  const used = await callsThisMonth(shopId);
  const left = Math.max(0, limit - used);
  return {
    used,
    limit,
    included: base,
    extra,
    left,
    percent: limit ? Math.min(100, Math.round((used / limit) * 100)) : 100,
    blocked: used >= limit,
    nearLimit: used < limit && used >= limit * 0.8,
    resetsAt: nextResetAt(now),
  };
}

async function record(entry) {
  try {
    await AiUsage.create(entry);
  } catch (err) {
    console.warn('[ai] usage not saved', err?.message || err);
  }
}

async function requestOnce({ model, system, user, maxTokens, signal }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Ask for a JSON object. Returns the parsed object or null.
 * @param {{ shopId: any, feature: string, system: string, user: string, depth?: 'fast'|'deep', maxTokens?: number, timeoutMs?: number }} opts
 */
async function chatJson({ shopId, feature, system, user, depth = 'fast', maxTokens = 1200, timeoutMs = 12000 }) {
  if (!aiConfigured() || !shopId) return null;
  if ((await quotaFor(shopId)).blocked) {
    console.info('[ai] monthly limit reached', { shopId: String(shopId), feature });
    return null;
  }

  let model = modelFor(depth);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let res = await requestOnce({ model, system, user, maxTokens, signal: controller.signal });
    if (!res.ok && (res.status === 404 || res.status === 400) && model !== FALLBACK_MODEL) {
      const reason = res.data?.error?.message || res.status;
      console.warn('[ai] model refused, falling back', { model, reason });
      model = FALLBACK_MODEL;
      res = await requestOnce({ model, system, user, maxTokens, signal: controller.signal });
    }
    if (!res.ok) {
      await record({
        shopId,
        feature,
        model,
        ok: false,
        error: String(res.data?.error?.message || `HTTP ${res.status}`).slice(0, 300),
      });
      return null;
    }
    const usage = res.data?.usage || {};
    const inputTokens = Number(usage.prompt_tokens) || 0;
    const outputTokens = Number(usage.completion_tokens) || 0;
    await record({
      shopId,
      feature,
      model,
      inputTokens,
      outputTokens,
      costUsd: costUsd(model, inputTokens, outputTokens),
    });
    const content = res.data?.choices?.[0]?.message?.content || '';
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  } catch (err) {
    await record({ shopId, feature, model, ok: false, error: String(err?.message || err).slice(0, 300) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Calls and cost per shop since the start of the São Paulo month. */
async function monthUsageByShop() {
  return AiUsage.aggregate([
    { $match: { createdAt: { $gte: saoPauloMonthStart() } } },
    {
      $group: {
        _id: '$shopId',
        calls: { $sum: 1 },
        failed: { $sum: { $cond: ['$ok', 0, 1] } },
        costUsd: { $sum: '$costUsd' },
      },
    },
    { $sort: { costUsd: -1 } },
    { $limit: 50 },
  ]);
}

module.exports = {
  PRICES,
  aiConfigured,
  modelFor,
  monthlyCap,
  costUsd,
  chatJson,
  callsThisMonth,
  quotaFor,
  nextResetAt,
  monthKey,
  monthUsageByShop,
};
