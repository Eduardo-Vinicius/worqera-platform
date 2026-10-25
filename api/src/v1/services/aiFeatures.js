/**
 * Business AI features. Each one computes its numbers on the server first and
 * only asks the model to write the words. Without AI (other plans, no key, cap,
 * model down) the same numbers come back in a fixed sentence.
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Quote = require('../models/Quote');
const Sector = require('../models/Sector');
const Shop = require('../models/Shop');
const AiBrief = require('../models/AiBrief');
const { chatJson } = require('./aiService');
const { saoPauloDayKey } = require('../lib/planCap');
const { endOfSaoPauloDay, isDueToday, followUpState, REASON_LABEL, formatMoney } = require('../lib/quotePriority');

const DAY = 24 * 60 * 60 * 1000;
const OPEN = ['open', 'in_progress', 'ready'];

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

async function shopName(shopId) {
  const shop = await Shop.findById(shopId).select('name branding').lean();
  return shop?.branding?.displayName || shop?.name || '';
}

async function dailyNumbers(shopId, now = new Date()) {
  const todayEnd = endOfSaoPauloDay(now);
  const tomorrowEnd = new Date(todayEnd.getTime() + DAY);
  const [ready, open, overdue, dueTomorrow, quotes, sectors] = await Promise.all([
    Order.countDocuments({ shopId, deletedAt: null, status: 'ready' }),
    Order.countDocuments({ shopId, deletedAt: null, status: { $in: OPEN } }),
    Order.countDocuments({ shopId, deletedAt: null, status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: now } }),
    Order.find({
      shopId,
      deletedAt: null,
      status: { $in: ['open', 'in_progress'] },
      dueAt: { $gt: todayEnd, $lte: tomorrowEnd },
    })
      .select('currentSectorId')
      .lean(),
    Quote.find({ shopId, stage: { $in: ['new', 'contact', 'followup'] } })
      .select('stage followUpAt value')
      .lean(),
    Sector.find({ shopId }).select('name').lean(),
  ]);
  const sectorName = new Map(sectors.map((s) => [String(s._id), s.name]));
  const bySector = new Map();
  for (const o of dueTomorrow) {
    const name = sectorName.get(String(o.currentSectorId)) || 'Fila';
    bySector.set(name, (bySector.get(name) || 0) + 1);
  }
  const tomorrowBySector = [...bySector.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const callToday = quotes.filter((q) => isDueToday(q, now)).length;
  const callOverdue = quotes.filter((q) => followUpState(q.followUpAt, now).state === 'overdue').length;
  return {
    ready,
    open,
    overdue,
    dueTomorrow: dueTomorrow.length,
    tomorrowBySector,
    callToday,
    callOverdue,
    quotesOpenValue: quotes.reduce((sum, q) => sum + (Number(q.value) || 0), 0),
  };
}

function dailyFallback(n) {
  const parts = [];
  if (n.ready) parts.push(`${plural(n.ready, 'pedido pronto', 'pedidos prontos')} para avisar`);
  if (n.callToday) parts.push(`${plural(n.callToday, 'orçamento', 'orçamentos')} para ligar`);
  if (n.overdue) parts.push(`${plural(n.overdue, 'pedido atrasado', 'pedidos atrasados')}`);
  if (n.dueTomorrow) {
    const top = n.tomorrowBySector[0];
    parts.push(
      `${plural(n.dueTomorrow, 'vence', 'vencem')} amanhã${top ? `, a maioria em ${top.name}` : ''}`
    );
  }
  if (!parts.length) return `Fila em dia: ${plural(n.open, 'pedido aberto', 'pedidos abertos')} e nada atrasado.`;
  const text = parts.join(', ');
  return `Hoje: ${text}.`;
}

const BRIEF_REFRESH_MS = 3 * 60 * 60 * 1000;

/**
 * Daily brief for the home screen. The numbers are always live; the AI sentence
 * is written at most once every 3 hours (or on demand), so a busy day costs a few calls.
 */
async function dailyBrief(shopId, { aiAllowed = false, refresh = false, now = new Date() } = {}) {
  const day = saoPauloDayKey(now);
  const numbers = await dailyNumbers(shopId, now);
  const cached = await AiBrief.findOne({ shopId, kind: 'daily', day }).lean();
  const changed = !cached || JSON.stringify(cached.numbers) !== JSON.stringify(numbers);
  const stale = !cached || now - new Date(cached.updatedAt) > BRIEF_REFRESH_MS;
  const writeAi = aiAllowed && (refresh || !cached || !cached.ai || (changed && stale));

  if (!writeAi) {
    if (cached?.ai && aiAllowed) return { day, text: cached.text, ai: true, numbers };
    return { day, text: dailyFallback(numbers), ai: false, numbers };
  }

  let text = dailyFallback(numbers);
  let ai = false;
  const name = await shopName(shopId);
  const parsed = await chatJson({
    shopId,
    feature: 'daily_brief',
    maxTokens: 500,
    system:
      'Você é o gerente de uma loja de serviço e escreve o resumo da manhã para o dono. ' +
      'Português do Brasil, direto, no máximo 2 frases curtas, sem emoji, sem inventar número. ' +
      'Comece pelo que precisa de ação hoje. Responda JSON: {"text":"..."}',
    user: [
      `Loja: ${name || 'a loja'}`,
      `Pedidos prontos esperando aviso/retirada: ${numbers.ready}`,
      `Pedidos abertos: ${numbers.open}`,
      `Pedidos atrasados: ${numbers.overdue}`,
      `Vencem amanhã: ${numbers.dueTomorrow}${numbers.tomorrowBySector.length ? ` (${numbers.tomorrowBySector.map((s) => `${s.name} ${s.count}`).join(', ')})` : ''}`,
      `Orçamentos para ligar hoje: ${numbers.callToday} (atrasados: ${numbers.callOverdue})`,
      `Valor em orçamentos abertos: ${formatMoney(numbers.quotesOpenValue)}`,
    ].join('\n'),
  });
  const aiText = String(parsed?.text || '').trim();
  if (aiText) {
    text = aiText.slice(0, 400);
    ai = true;
  }

  await AiBrief.updateOne(
    { shopId, kind: 'daily', day },
    { $set: { text, ai, numbers } },
    { upsert: true }
  );
  return { day, text, ai, numbers };
}

function weekKey(now = new Date()) {
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dow = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - dow);
  return local.toISOString().slice(0, 10);
}

async function weeklyNumbers(shopId, now = new Date()) {
  const since = new Date(now.getTime() - 7 * DAY);
  const [created, delivered, late, quotes, sectors, openBySector] = await Promise.all([
    Order.countDocuments({ shopId, deletedAt: null, createdAt: { $gte: since } }),
    Order.find({ shopId, deletedAt: null, status: 'delivered', deliveredAt: { $gte: since } })
      .select('pricing dueAt deliveredAt')
      .lean(),
    Order.countDocuments({ shopId, deletedAt: null, status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: now } }),
    Quote.find({ shopId, updatedAt: { $gte: since } }).select('stage reason value wonAt lostAt createdAt').lean(),
    Sector.find({ shopId }).select('name').lean(),
    Order.aggregate([
      { $match: { shopId: new mongoose.Types.ObjectId(String(shopId)), deletedAt: null, status: { $in: OPEN } } },
      { $group: { _id: '$currentSectorId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]),
  ]);
  const sectorName = new Map(sectors.map((s) => [String(s._id), s.name]));
  const revenue = delivered.reduce((sum, o) => sum + (Number(o.pricing?.total) || 0), 0);
  const onTime = delivered.filter((o) => !o.dueAt || (o.deliveredAt && new Date(o.deliveredAt) <= new Date(o.dueAt))).length;
  const reasons = {};
  for (const q of quotes) {
    if (q.reason && q.createdAt >= since) reasons[q.reason] = (reasons[q.reason] || 0) + 1;
  }
  const won = quotes.filter((q) => q.stage === 'won' && q.wonAt && new Date(q.wonAt) >= since);
  const lost = quotes.filter((q) => q.stage === 'lost' && q.lostAt && new Date(q.lostAt) >= since);
  return {
    created,
    delivered: delivered.length,
    revenue: Math.round(revenue * 100) / 100,
    ticket: delivered.length ? Math.round((revenue / delivered.length) * 100) / 100 : 0,
    onTimePct: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0,
    late,
    refusedByReason: Object.entries(reasons)
      .map(([reason, count]) => ({ reason: REASON_LABEL[reason] || reason, count }))
      .sort((a, b) => b.count - a.count),
    recovered: won.length,
    recoveredValue: won.reduce((sum, q) => sum + (Number(q.value) || 0), 0),
    lostQuotes: lost.length,
    busiestSectors: openBySector.map((s) => ({ name: sectorName.get(String(s._id)) || 'Sem setor', count: s.count })),
  };
}

function weeklyFallback(n) {
  const bullets = [
    `${plural(n.delivered, 'pedido entregue', 'pedidos entregues')}, ${formatMoney(n.revenue)} no total, ticket de ${formatMoney(n.ticket)}.`,
    `${n.onTimePct}% saiu no prazo; ${plural(n.late, 'pedido está', 'pedidos estão')} atrasado agora.`,
    `${plural(n.created, 'pedido entrou', 'pedidos entraram')} na semana.`,
  ];
  if (n.busiestSectors[0]) bullets.push(`Setor mais cheio: ${n.busiestSectors[0].name} (${n.busiestSectors[0].count}).`);
  if (n.refusedByReason[0]) {
    bullets.push(`Motivo que mais fez perder orçamento: ${n.refusedByReason[0].reason} (${n.refusedByReason[0].count}).`);
  }
  if (n.recovered) bullets.push(`${plural(n.recovered, 'orçamento recuperado', 'orçamentos recuperados')}: ${formatMoney(n.recoveredValue)}.`);
  return bullets;
}

/** Weekly read of the operation. Business only; cached per week. */
async function weeklyInsights(shopId, { aiAllowed = false, refresh = false, now = new Date() } = {}) {
  const day = weekKey(now);
  const cached = await AiBrief.findOne({ shopId, kind: 'weekly', day }).lean();
  if (cached && !refresh) return { week: day, bullets: cached.bullets, ai: cached.ai, numbers: cached.numbers };

  const numbers = await weeklyNumbers(shopId, now);
  let bullets = weeklyFallback(numbers);
  let ai = false;
  if (aiAllowed) {
    const name = await shopName(shopId);
    const parsed = await chatJson({
      shopId,
      feature: 'weekly_insights',
      depth: 'deep',
      maxTokens: 2500,
      timeoutMs: 30000,
      system:
        'Você é consultor de operação de uma loja de serviço (fila de pedidos por setor). ' +
        'Leia os números da semana e escreva de 5 a 7 pontos curtos em português do Brasil para o dono: ' +
        'o que foi bem, o que travou, onde está perdendo dinheiro e uma ação concreta para a próxima semana. ' +
        'Use só os números dados, sem inventar. Sem emoji. Responda JSON: {"bullets":["...","..."]}',
      user: `Loja: ${name || 'a loja'}\nNúmeros dos últimos 7 dias (JSON):\n${JSON.stringify(numbers)}`,
    });
    const list = (parsed?.bullets || []).map((b) => String(b || '').trim()).filter(Boolean).slice(0, 8);
    if (list.length >= 3) {
      bullets = list;
      ai = true;
    }
  }
  await AiBrief.updateOne(
    { shopId, kind: 'weekly', day },
    { $set: { bullets, ai, numbers, text: '' } },
    { upsert: true }
  );
  return { week: day, bullets, ai, numbers };
}

function describeServices(order) {
  const items = Array.isArray(order.items) && order.items.length ? order.items : [order];
  return items
    .map((it, i) => {
      const piece = [it.brand, it.shoeModel].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
      const services = (it.services || []).map((s) => [s.name, s.note].filter(Boolean).join(': ')).filter(Boolean);
      return `Item ${i + 1}: ${piece || 'peça'} — ${services.join('; ') || 'sem serviço'}${it.notes ? ` (obs.: ${it.notes})` : ''}`;
    })
    .join('\n');
}

/**
 * Customer-facing summary of what will be done, for the laudo PDF and the
 * public page. Saved on the order; the team can edit it.
 */
async function generateCustomerSummary(shopId, orderId, { aiAllowed = false, force = false } = {}) {
  if (!aiAllowed) return null;
  const order = await Order.findOne({ _id: orderId, shopId }).lean();
  if (!order) return null;
  if (order.customerSummary?.text && order.customerSummary?.edited && !force) return order.customerSummary;
  const name = await shopName(shopId);
  const due = order.dueAt ? new Date(order.dueAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
  const parsed = await chatJson({
    shopId,
    feature: 'customer_summary',
    maxTokens: 500,
    system:
      'Você explica para o cliente final, em português do Brasil, o que a loja vai fazer no item dele. ' +
      'Uma ou duas frases claras, sem siglas nem jargão de bancada, sem preço, sem prometer o que não está nos serviços. ' +
      'Responda JSON: {"text":"..."}',
    user: `Loja: ${name || 'a loja'}\nCliente: ${order.clientName || ''}\n${describeServices(order)}${due ? `\nPrevisão: ${due}` : ''}`,
  });
  const text = String(parsed?.text || '').trim().slice(0, 500);
  if (!text) return null;
  const summary = { text, ai: true, edited: false, at: new Date() };
  await Order.updateOne({ _id: orderId, shopId }, { $set: { customerSummary: summary } });
  return summary;
}

function generateCustomerSummarySafe(shopId, orderId, opts) {
  generateCustomerSummary(shopId, orderId, opts).catch((err) => {
    console.warn('[ai] customer summary failed', err?.message || err);
  });
}

function reviewFallback({ score, clientName, shopName: shop }) {
  const hi = String(clientName || '').trim().split(/\s+/)[0];
  const greet = hi ? `Oi ${hi}` : 'Oi';
  const sign = shop ? ` — ${shop}` : '';
  if (score >= 4) {
    return [
      { tone: 'thanks', label: 'Agradecer', text: `${greet}, obrigado pela avaliação! Foi um prazer cuidar do seu pedido. Quando precisar, estamos aqui${sign}.` },
      { tone: 'invite', label: 'Convidar de volta', text: `${greet}, que bom que gostou! Guarde nosso contato: na próxima, é só chamar que a gente encaixa na fila${sign}.` },
    ];
  }
  return [
    { tone: 'sorry', label: 'Pedir desculpa', text: `${greet}, obrigado por contar. Sentimos muito que não saiu como esperava. Pode nos chamar para a gente entender e resolver?${sign}` },
    { tone: 'fix', label: 'Oferecer solução', text: `${greet}, sua avaliação chegou aqui. Queremos corrigir: traga o item de volta que a gente revisa sem custo, ou nos diga o melhor horário para conversar${sign}.` },
  ];
}

/** Two reply options for a customer review. */
async function suggestReviewReply(shopId, orderId, { aiAllowed = false } = {}) {
  const order = await Order.findOne({ _id: orderId, shopId }).select('clientName feedback code').lean();
  if (!order?.feedback?.score) {
    const err = new Error('Pedido sem avaliação');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const name = await shopName(shopId);
  const ctx = { score: order.feedback.score, clientName: order.clientName, shopName: name };
  if (aiAllowed) {
    const parsed = await chatJson({
      shopId,
      feature: 'review_reply',
      maxTokens: 600,
      system:
        'Você responde, em nome da loja, a avaliação que um cliente deixou. Português do Brasil, curto (até 240 caracteres), humano, sem emoji em excesso. ' +
        'Nota 4 ou 5: agradeça e convide a voltar. Nota 3 ou menos: peça desculpa sem se defender e chame para resolver. ' +
        'Responda JSON: {"options":[{"tone":"a","label":"...","text":"..."},{"tone":"b","label":"...","text":"..."}]}',
      user: `Loja: ${name || 'a loja'}\nCliente: ${order.clientName || ''}\nNota: ${order.feedback.score}/5\nComentário: ${order.feedback.comment || '(sem comentário)'}\nTags: ${(order.feedback.tags || []).join(', ') || '-'}`,
    });
    const options = (parsed?.options || [])
      .map((o) => ({ tone: String(o.tone || 'a'), label: String(o.label || 'Sugestão'), text: String(o.text || '').trim() }))
      .filter((o) => o.text)
      .slice(0, 2);
    if (options.length) return { ai: true, options };
  }
  return { ai: false, options: reviewFallback(ctx) };
}

module.exports = {
  dailyBrief,
  dailyNumbers,
  dailyFallback,
  weeklyInsights,
  weeklyFallback,
  weekKey,
  generateCustomerSummary,
  generateCustomerSummarySafe,
  suggestReviewReply,
  reviewFallback,
};
