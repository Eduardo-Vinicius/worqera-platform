/**
 * More AI reads of the shop: who owes money, who a customer is, and a better
 * message to the customer. Same rule as aiFeatures: the server computes the
 * numbers, the model only writes words, and every answer has a no-AI version.
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Quote = require('../models/Quote');
const Shop = require('../models/Shop');
const Client = require('../models/Client');
const AiBrief = require('../models/AiBrief');
const { chatJson } = require('./aiService');
const { saoPauloDayKey } = require('../lib/planCap');
const { formatMoney } = require('../lib/quotePriority');
const { buildWaMeUrl } = require('./whatsappSuggest');

const DAY = 24 * 60 * 60 * 1000;
const CACHE_MS = 6 * 60 * 60 * 1000;

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function shortDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
}

async function shopName(shopId) {
  const shop = await Shop.findById(shopId).select('name branding').lean();
  return shop?.branding?.displayName || shop?.name || 'a loja';
}

/* ------------------------------------------------------------------ */
/* Cobrança: who owes, how long, in which order to call                */
/* ------------------------------------------------------------------ */

/** Collection message that gets firmer as the debt gets older. */
function collectionText({ stage, client, code, value, days, deliveredAt, shop }) {
  const hi = firstName(client) ? `Oi, ${firstName(client)}!` : 'Oi!';
  const v = formatMoney(value);
  if (stage === 'ready') {
    return `${hi} Seu pedido #${code} está pronto aqui na ${shop}. O saldo para retirada é ${v}. Te esperamos!`;
  }
  if (days <= 7) return `${hi} Tudo bem? Ficou um saldo de ${v} do pedido #${code}. Pode ser por PIX? Obrigado!`;
  if (days <= 30) {
    return `${hi} Passando para lembrar do saldo de ${v} do pedido #${code}, entregue em ${shortDate(deliveredAt)}. Consegue acertar esta semana?`;
  }
  return `${hi} Tudo bem? O pedido #${code}, entregue em ${shortDate(deliveredAt)}, ainda está com ${v} em aberto. Podemos combinar o pagamento? Se já pagou, me avisa que eu atualizo aqui.`;
}

async function receivablesNumbers(shopId, now = new Date()) {
  const shop = await shopName(shopId);
  const orders = await Order.find({
    shopId,
    deletedAt: null,
    status: { $in: ['open', 'in_progress', 'ready', 'delivered'] },
    'pricing.remaining': { $gt: 0.009 },
  })
    .select('code clientName clientPhone status pricing deliveredAt updatedAt dueAt')
    .lean();

  const buckets = { delivered: 0, deliveredCount: 0, ready: 0, readyCount: 0, open: 0, openCount: 0 };
  const aging = { upTo7: 0, upTo30: 0, over30: 0 };
  const list = [];
  for (const o of orders) {
    const value = money(o.pricing?.remaining);
    if (o.status === 'delivered') {
      buckets.delivered += value;
      buckets.deliveredCount += 1;
      const days = Math.max(0, Math.floor((now - new Date(o.deliveredAt || o.updatedAt)) / DAY));
      if (days <= 7) aging.upTo7 += value;
      else if (days <= 30) aging.upTo30 += value;
      else aging.over30 += value;
      list.push({ o, value, days, stage: 'delivered' });
    } else if (o.status === 'ready') {
      buckets.ready += value;
      buckets.readyCount += 1;
      const days = Math.max(0, Math.floor((now - new Date(o.updatedAt)) / DAY));
      list.push({ o, value, days, stage: 'ready' });
    } else {
      buckets.open += value;
      buckets.openCount += 1;
    }
  }

  // Delivered and old first (that money is at risk), then the bigger values.
  list.sort((a, b) => {
    const ra = a.stage === 'delivered' ? 1 : 0;
    const rb = b.stage === 'delivered' ? 1 : 0;
    return rb - ra || b.days - a.days || b.value - a.value;
  });

  const items = list.slice(0, 25).map(({ o, value, days, stage }) => {
    const text = collectionText({ stage, client: o.clientName, code: o.code, value, days, deliveredAt: o.deliveredAt, shop });
    return {
      id: String(o._id),
      code: o.code,
      clientName: o.clientName || '',
      phone: o.clientPhone || '',
      value,
      days,
      stage,
      level: stage === 'ready' ? 'ready' : days <= 7 ? 'soft' : days <= 30 ? 'firm' : 'late',
      text,
      waUrl: o.clientPhone ? buildWaMeUrl(o.clientPhone, text) : '',
    };
  });

  const total = money(buckets.delivered + buckets.ready + buckets.open);
  return {
    total,
    atRisk: money(buckets.delivered),
    buckets: {
      delivered: money(buckets.delivered),
      deliveredCount: buckets.deliveredCount,
      ready: money(buckets.ready),
      readyCount: buckets.readyCount,
      open: money(buckets.open),
      openCount: buckets.openCount,
    },
    aging: { upTo7: money(aging.upTo7), upTo30: money(aging.upTo30), over30: money(aging.over30) },
    items,
  };
}

function receivablesFallback(n) {
  if (n.total <= 0.009) return { headline: 'Ninguém devendo agora. Caixa em dia.', plan: [] };
  const plan = [];
  if (n.aging.over30 > 0) plan.push(`Comece pelos entregues há mais de 30 dias: ${formatMoney(n.aging.over30)}.`);
  if (n.aging.upTo30 > 0) plan.push(`Depois, os de 8 a 30 dias: ${formatMoney(n.aging.upTo30)}.`);
  if (n.buckets.readyCount) plan.push(`Avise os ${n.buckets.readyCount} prontos com saldo: ${formatMoney(n.buckets.ready)} entram na retirada.`);
  const top = n.items[0];
  return {
    headline: `${formatMoney(n.total)} a receber${n.atRisk > 0 ? `, ${formatMoney(n.atRisk)} de pedidos já entregues` : ''}.${top ? ` Primeiro: ${firstName(top.clientName) || top.clientName}, ${formatMoney(top.value)}.` : ''}`,
    plan: plan.slice(0, 3),
  };
}

async function receivablesInsight(shopId, { aiAllowed = false, refresh = false, now = new Date() } = {}) {
  const numbers = await receivablesNumbers(shopId, now);
  const day = saoPauloDayKey(now);
  const fallback = receivablesFallback(numbers);
  const base = { ...numbers };
  if (!aiAllowed || numbers.total <= 0.009) return { ...base, ...fallback, ai: false };

  const key = { totals: numbers.total, top: numbers.items.slice(0, 5).map((i) => `${i.code}:${i.value}:${i.days}`) };
  const cached = await AiBrief.findOne({ shopId, kind: 'receivables', day }).lean();
  const fresh = cached && JSON.stringify(cached.numbers) === JSON.stringify(key) && now - new Date(cached.updatedAt) < CACHE_MS;
  if (cached?.ai && (fresh || !refresh) && JSON.stringify(cached.numbers) === JSON.stringify(key)) {
    return { ...base, headline: cached.text, plan: cached.bullets || [], ai: true };
  }

  const parsed = await chatJson({
    shopId,
    feature: 'receivables',
    maxTokens: 600,
    system:
      'Você é o gerente financeiro de uma loja de serviço. Português do Brasil, direto, sem emoji, sem inventar número. ' +
      '"headline": 1 frase (até 160 caracteres) com quanto há a receber e onde está o risco. ' +
      '"plan": até 3 frases curtas com a ordem de cobrança de hoje, citando nomes e valores recebidos. ' +
      'Responda JSON: {"headline":"...","plan":["..."]}',
    user: [
      `Loja: ${await shopName(shopId)}`,
      `A receber: ${formatMoney(numbers.total)}`,
      `Entregues sem pagar: ${numbers.buckets.deliveredCount}, ${formatMoney(numbers.buckets.delivered)}`,
      `Idade dos entregues sem pagar: até 7 dias ${formatMoney(numbers.aging.upTo7)}, 8 a 30 dias ${formatMoney(numbers.aging.upTo30)}, mais de 30 dias ${formatMoney(numbers.aging.over30)}`,
      `Prontos com saldo na retirada: ${numbers.buckets.readyCount}, ${formatMoney(numbers.buckets.ready)}`,
      `Em produção com saldo: ${numbers.buckets.openCount}, ${formatMoney(numbers.buckets.open)}`,
      'Maiores pendências:',
      ...numbers.items.slice(0, 6).map((i) => `- ${i.clientName || 'Cliente'} #${i.code}: ${formatMoney(i.value)}, ${i.stage === 'ready' ? 'pronto' : `entregue há ${i.days} dias`}`),
    ].join('\n'),
  });
  const headline = String(parsed?.headline || '').trim().slice(0, 220);
  const plan = (Array.isArray(parsed?.plan) ? parsed.plan : []).map((p) => String(p || '').trim().slice(0, 200)).filter(Boolean).slice(0, 3);
  if (!headline) return { ...base, ...fallback, ai: false };

  await AiBrief.updateOne(
    { shopId, kind: 'receivables', day },
    { $set: { text: headline, bullets: plan, ai: true, numbers: key } },
    { upsert: true }
  );
  return { ...base, headline, plan, ai: true };
}

/* ------------------------------------------------------------------ */
/* Raio-X do cliente                                                    */
/* ------------------------------------------------------------------ */

async function clientNumbers(shopId, clientId, now = new Date()) {
  const client = await Client.findOne({ _id: clientId, shopId }).select('name phone createdAt').lean();
  if (!client) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const oid = new mongoose.Types.ObjectId(String(clientId));
  const [orders, quotes] = await Promise.all([
    Order.find({ shopId, clientId: oid, deletedAt: null })
      .select('status pricing services items.services createdAt deliveredAt feedback quoteRefusal')
      .sort({ createdAt: 1 })
      .lean(),
    Quote.find({ shopId, clientId: oid }).select('stage value').lean(),
  ]);

  const done = orders.filter((o) => o.status === 'delivered');
  const spent = money(done.reduce((s, o) => s + (Number(o.pricing?.total) || 0), 0));
  const open = orders.filter((o) => ['open', 'in_progress', 'ready'].includes(o.status));
  const owed = money(orders.reduce((s, o) => s + (['cancelled'].includes(o.status) ? 0 : Number(o.pricing?.remaining) || 0), 0));
  const counts = new Map();
  for (const o of orders) {
    const list = (o.items || []).flatMap((it) => it.services || []);
    for (const s of list.length ? list : o.services || []) {
      const name = String(s?.name || '').trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  const topServices = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
  const scores = orders.map((o) => Number(o.feedback?.score) || 0).filter(Boolean);
  const last = orders[orders.length - 1];
  const daysSinceLast = last ? Math.floor((now - new Date(last.createdAt)) / DAY) : null;
  const visits = orders.length;
  const gaps = [];
  for (let i = 1; i < orders.length; i += 1) gaps.push((new Date(orders[i].createdAt) - new Date(orders[i - 1].createdAt)) / DAY);
  const avgGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null;

  const tags = [];
  if (visits >= 5) tags.push('Cliente fiel');
  else if (visits === 1) tags.push('Primeira vez');
  if (daysSinceLast != null && daysSinceLast > 90 && !open.length) tags.push(`Sumido há ${daysSinceLast} dias`);
  if (avgGap && daysSinceLast != null && !open.length && daysSinceLast > avgGap * 1.5 && daysSinceLast <= 90) tags.push('Passou da hora de voltar');
  if (owed > 0.009) tags.push(`Deve ${formatMoney(owed)}`);
  if (scores.length && scores.reduce((s, x) => s + x, 0) / scores.length >= 4.5) tags.push('Ama a loja');
  if (scores.some((s) => s <= 2)) tags.push('Já reclamou');
  const refused = orders.filter((o) => o.quoteRefusal?.refusedAt).length;
  if (refused) tags.push(`Recusou ${refused} orçamento${refused > 1 ? 's' : ''}`);

  return {
    name: client.name,
    visits,
    delivered: done.length,
    openNow: open.length,
    spent,
    avgTicket: done.length ? money(spent / done.length) : 0,
    owed,
    firstAt: orders[0]?.createdAt || null,
    lastAt: last?.createdAt || null,
    daysSinceLast,
    avgGap,
    topServices,
    avgScore: scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : null,
    quotes: {
      open: quotes.filter((q) => ['new', 'contact', 'followup'].includes(q.stage)).length,
      won: quotes.filter((q) => q.stage === 'won').length,
      lost: quotes.filter((q) => q.stage === 'lost').length,
    },
    tags,
  };
}

function clientFallback(n) {
  if (!n.visits) return { summary: `${firstName(n.name) || 'Cliente'} ainda não fez pedido.`, next: 'Ofereça um orçamento no balcão.' };
  const fav = n.topServices[0]?.name;
  const summary = [
    `${n.visits} pedido${n.visits > 1 ? 's' : ''}`,
    n.spent ? `${formatMoney(n.spent)} gastos` : '',
    fav ? `mais pede ${fav}` : '',
    n.daysSinceLast != null ? `último há ${n.daysSinceLast} dia${n.daysSinceLast === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  let next = 'Tudo em dia.';
  if (n.owed > 0.009) next = `Cobrar o saldo de ${formatMoney(n.owed)}.`;
  else if (n.daysSinceLast != null && n.daysSinceLast > 90 && !n.openNow) next = `Chamar de volta${fav ? ` com uma oferta de ${fav}` : ''}.`;
  else if (n.quotes.open) next = 'Tem orçamento em aberto: vale ligar.';
  return { summary, next };
}

async function clientInsight(shopId, clientId, { aiAllowed = false, now = new Date() } = {}) {
  const numbers = await clientNumbers(shopId, clientId, now);
  const fallback = clientFallback(numbers);
  if (!aiAllowed || !numbers.visits) return { numbers, ...fallback, ai: false };

  const day = `${saoPauloDayKey(now)}:${clientId}`;
  const key = { visits: numbers.visits, spent: numbers.spent, owed: numbers.owed, last: numbers.lastAt };
  const cached = await AiBrief.findOne({ shopId, kind: 'client', day }).lean();
  if (cached?.ai && JSON.stringify(cached.numbers) === JSON.stringify(key)) {
    return { numbers, summary: cached.text, next: cached.bullets?.[0] || fallback.next, ai: true };
  }

  const parsed = await chatJson({
    shopId,
    feature: 'client_insight',
    maxTokens: 500,
    system:
      'Você descreve um cliente para a equipe da loja. Português do Brasil, prático, sem emoji, sem inventar. ' +
      '"summary": 1 frase (até 180 caracteres) sobre quem é esse cliente (frequência, gasto, preferência, satisfação). ' +
      '"next": 1 frase curta com a melhor próxima ação da loja com ele. Responda JSON: {"summary":"...","next":"..."}',
    user: [
      `Cliente: ${numbers.name}`,
      `Pedidos: ${numbers.visits} (entregues ${numbers.delivered}, em aberto ${numbers.openNow})`,
      `Gasto total: ${formatMoney(numbers.spent)}, ticket médio ${formatMoney(numbers.avgTicket)}`,
      `Saldo devendo: ${formatMoney(numbers.owed)}`,
      `Último pedido há ${numbers.daysSinceLast ?? '-'} dias; costuma voltar a cada ${numbers.avgGap ?? '-'} dias`,
      `Serviços mais pedidos: ${numbers.topServices.map((s) => `${s.name} (${s.count})`).join(', ') || '-'}`,
      `Nota média: ${numbers.avgScore ?? 'sem avaliação'}`,
      `Orçamentos: ${numbers.quotes.open} em aberto, ${numbers.quotes.won} recuperados, ${numbers.quotes.lost} perdidos`,
    ].join('\n'),
  });
  const summary = String(parsed?.summary || '').trim().slice(0, 240);
  const next = String(parsed?.next || '').trim().slice(0, 200);
  if (!summary) return { numbers, ...fallback, ai: false };
  await AiBrief.updateOne(
    { shopId, kind: 'client', day },
    { $set: { text: summary, bullets: [next || fallback.next], ai: true, numbers: key } },
    { upsert: true }
  );
  return { numbers, summary, next: next || fallback.next, ai: true };
}

/* ------------------------------------------------------------------ */
/* Melhorar a mensagem ao cliente                                       */
/* ------------------------------------------------------------------ */

async function improveClientMessage(shopId, orderId, { text, aiAllowed = false } = {}) {
  const base = String(text || '').trim().slice(0, 1200);
  if (!base) {
    const err = new Error('Mensagem vazia');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!aiAllowed) return { text: base, ai: false, locked: true };
  const order = await Order.findOne({ _id: orderId, shopId }).select('code clientName status dueAt').lean();
  if (!order) {
    const err = new Error('Pedido não encontrado');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const parsed = await chatJson({
    shopId,
    feature: 'client_message',
    maxTokens: 500,
    system:
      'Você reescreve uma mensagem de WhatsApp da loja para o cliente. Português do Brasil, simpático, natural, curto (até 320 caracteres), no máximo 1 emoji. ' +
      'Mantenha exatamente o código do pedido, valores e qualquer link. Não invente prazo nem preço. Responda JSON: {"text":"..."}',
    user: `Loja: ${await shopName(shopId)}\nCliente: ${order.clientName || ''}\nPedido: #${order.code} (${order.status})\nMensagem atual:\n${base}`,
  });
  const out = String(parsed?.text || '').trim().slice(0, 600);
  const links = base.match(/https?:\/\/\S+/g) || [];
  const keepsLinks = links.every((l) => out.includes(l));
  if (!out || !keepsLinks || !out.includes(String(order.code))) return { text: base, ai: false };
  return { text: out, ai: true };
}

module.exports = {
  receivablesNumbers,
  receivablesFallback,
  receivablesInsight,
  collectionText,
  clientNumbers,
  clientFallback,
  clientInsight,
  improveClientMessage,
};
