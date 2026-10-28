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

function money2(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/** Money and names behind the brief: what is due, who to call, what is stuck. */
async function dailyMoney(shopId, now = new Date()) {
  const { toCollect, readySince, STALE_DAYS } = require('./shelfService');
  const [readyOrders, deliveredUnpaid, oldestLate, noPrice, quotes] = await Promise.all([
    Order.find({ shopId, deletedAt: null, status: 'ready' })
      .select('pricing sectorHistory items.sectorHistory updatedAt')
      .lean(),
    Order.find({ shopId, deletedAt: null, status: 'delivered', 'pricing.remaining': { $gt: 0.009 } })
      .select('pricing.remaining')
      .lean(),
    Order.findOne({ shopId, deletedAt: null, status: { $in: ['open', 'in_progress'] }, dueAt: { $lt: now } })
      .sort({ dueAt: 1 })
      .select('code clientName dueAt')
      .lean(),
    Order.countDocuments({ shopId, deletedAt: null, status: { $in: OPEN }, 'pricing.total': { $lte: 0.009 } }),
    Quote.find({ shopId, stage: { $in: ['new', 'contact', 'followup'] } })
      .select('name value reason followUpAt stage')
      .lean(),
  ]);

  let readyValue = 0;
  let staleCount = 0;
  let staleValue = 0;
  for (const order of readyOrders) {
    const due = toCollect(order);
    readyValue += due;
    const days = Math.floor((now.getTime() - readySince(order).getTime()) / DAY);
    if (days >= STALE_DAYS) {
      staleCount += 1;
      staleValue += due;
    }
  }

  const toCall = quotes
    .filter((q) => isDueToday(q, now))
    .sort((a, b) => {
      const ao = followUpState(a.followUpAt, now).state === 'overdue' ? 1 : 0;
      const bo = followUpState(b.followUpAt, now).state === 'overdue' ? 1 : 0;
      return bo - ao || (Number(b.value) || 0) - (Number(a.value) || 0);
    });
  const top = toCall[0] || null;

  return {
    readyValue: money2(readyValue),
    staleCount,
    staleValue: money2(staleValue),
    unpaidCount: deliveredUnpaid.length,
    unpaidValue: money2(deliveredUnpaid.reduce((sum, o) => sum + (Number(o.pricing?.remaining) || 0), 0)),
    callValue: money2(toCall.reduce((sum, q) => sum + (Number(q.value) || 0), 0)),
    topCall: top
      ? { name: top.name, value: money2(top.value), reason: top.reason ? REASON_LABEL[top.reason] || '' : '' }
      : null,
    oldestLate: oldestLate
      ? {
          code: oldestLate.code,
          client: oldestLate.clientName || '',
          days: Math.max(1, Math.floor((now.getTime() - new Date(oldestLate.dueAt).getTime()) / DAY)),
        }
      : null,
    noPrice,
  };
}

/**
 * Up to four things to do today, most money first. Same list with or without AI.
 * `team: true` (front desk) keeps the values they handle at the counter (quote to
 * call about, balance at pickup, delivered unpaid) but drops the shelf, which is
 * the owner's, and puts late orders first.
 */
function dailyActions(n, { team = false } = {}) {
  const m = n.money || {};
  const actions = [];
  if (n.callToday) {
    const top = m.topCall;
    actions.push({
      id: 'call',
      title: top
        ? `Ligar para ${firstName(top.name) || top.name}${n.callToday > 1 ? ` e mais ${n.callToday - 1}` : ''}`
        : `Ligar para ${plural(n.callToday, 'cliente', 'clientes')}`,
      detail: top
        ? [top.value ? formatMoney(top.value) : '', top.reason, n.callOverdue ? `${n.callOverdue} atrasado${n.callOverdue === 1 ? '' : 's'}` : '']
            .filter(Boolean)
            .join(' · ') || 'Orçamento que não fechou'
        : 'Orçamentos que não fecharam',
      value: m.callValue || top?.value || 0,
      href: '/orcamentos',
      tone: n.callOverdue ? 'warn' : 'brand',
    });
  }
  if (n.ready) {
    actions.push({
      id: 'ready',
      title: `Avisar ${plural(n.ready, 'pronto', 'prontos')}`,
      detail: m.readyValue ? `${formatMoney(m.readyValue)} para receber na retirada` : 'Esperando o cliente buscar',
      value: m.readyValue || 0,
      href: '/kanban',
      tone: 'ok',
    });
  }
  if (m.unpaidCount) {
    actions.push({
      id: 'unpaid',
      title: `Cobrar ${plural(m.unpaidCount, 'entregue sem pagar', 'entregues sem pagar')}`,
      detail: `${formatMoney(m.unpaidValue)} em aberto`,
      value: m.unpaidValue || 0,
      href: '/pedidos?tab=entregue_aberto',
      tone: 'warn',
    });
  }
  if (!team && m.staleCount) {
    actions.push({
      id: 'shelf',
      title: `Lembrar ${plural(m.staleCount, 'parado', 'parados')} na prateleira`,
      detail: `${formatMoney(m.staleValue)} · prontos há 3+ dias`,
      value: m.staleValue || 0,
      href: '/dashboard#prateleira',
      tone: 'warn',
    });
  }
  if (!team && n.check?.count) {
    actions.push({
      id: 'check',
      title: `Conferir ${plural(n.check.count, 'pronto antigo', 'prontos antigos')}`,
      detail: `Talvez já tenham saído · o mais antigo há ${plural(n.check.oldestDays, 'dia', 'dias')}`,
      value: 0,
      href: '/dashboard#prateleira',
      tone: 'brand',
    });
  }
  if (n.overdue) {
    const late = m.oldestLate;
    actions.push({
      id: 'late',
      title: `Destravar ${plural(n.overdue, 'atrasado', 'atrasados')}`,
      detail: late ? `Mais antigo #${late.code}${late.client ? ` · ${firstName(late.client)}` : ''} · ${plural(late.days, 'dia', 'dias')}` : 'Passou do prazo',
      value: 0,
      href: '/kanban',
      tone: 'danger',
    });
  }
  if (!team && (n.restock?.late || n.restock?.order)) {
    const r = n.restock;
    actions.push({
      id: 'restock',
      title: r.late
        ? `${r.topName || 'Produto'} atrasado no fornecedor`
        : `Pedir ${r.topName || plural(r.order, 'produto', 'produtos')} ao fornecedor`,
      detail: r.late
        ? `Era para ter chegado${r.lateDays ? ` há ${plural(r.lateDays, 'dia', 'dias')}` : ''}`
        : [r.order > 1 ? `${r.order} na hora de pedir` : 'Hora de pedir', r.topLead ? `chega em ~${r.topLead} dias` : '']
            .filter(Boolean)
            .join(' · '),
      value: 0,
      href: '/admin/produtos#repor',
      tone: r.late ? 'danger' : 'warn',
    });
  }
  if (m.noPrice) {
    actions.push({
      id: 'price',
      title: `Dar preço a ${plural(m.noPrice, 'pedido', 'pedidos')}`,
      detail: 'Sem valor, o laudo não sai',
      value: 0,
      href: '/pedidos',
      tone: 'muted',
    });
  }
  if (n.dueTomorrow) {
    const topSector = n.tomorrowBySector[0];
    actions.push({
      id: 'tomorrow',
      title: `Preparar ${plural(n.dueTomorrow, 'entrega', 'entregas')} de amanhã`,
      detail: topSector ? `A maioria em ${topSector.name}` : 'Vencem amanhã',
      value: 0,
      href: '/kanban',
      tone: 'muted',
    });
  }
  if (team) {
    const late = actions.findIndex((a) => a.id === 'late');
    if (late > 0) actions.unshift(...actions.splice(late, 1));
  }
  return actions.slice(0, 4);
}

function dailyStake(n) {
  const m = n.money || {};
  return money2((m.callValue || 0) + (m.readyValue || 0) + (m.unpaidValue || 0));
}

async function dailyNumbers(shopId, now = new Date()) {
  const todayEnd = endOfSaoPauloDay(now);
  const tomorrowEnd = new Date(todayEnd.getTime() + DAY);
  const [ready, open, overdue, dueTomorrow, quotes, sectors, money] = await Promise.all([
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
    dailyMoney(shopId, now),
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
    money,
  };
}

function dailyFallback(n, { team = false } = {}) {
  const stake = team ? 0 : dailyStake(n);
  const actions = dailyActions(n, { team });
  if (stake > 0.009 && actions.length) {
    const lead = actions
      .slice(0, 2)
      .map((a) => a.title.charAt(0).toLowerCase() + a.title.slice(1))
      .join(' e ');
    return `${formatMoney(stake)} em jogo hoje. Comece por ${lead}.`;
  }
  const readyValue = team ? n.money?.readyValue || 0 : 0;
  const parts = [];
  if (team && n.overdue) parts.push(`${plural(n.overdue, 'pedido atrasado', 'pedidos atrasados')}`);
  if (n.ready) {
    parts.push(
      `${plural(n.ready, 'pedido pronto', 'pedidos prontos')} para avisar${readyValue ? ` (${formatMoney(readyValue)} na retirada)` : ''}`
    );
  }
  if (n.callToday) parts.push(`${plural(n.callToday, 'orçamento', 'orçamentos')} para ligar`);
  if (!team && n.overdue) parts.push(`${plural(n.overdue, 'pedido atrasado', 'pedidos atrasados')}`);
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
/** Who reads the brief: owner/admin see money; front desk sees the moves; a sector sees only its queue. */
function briefAudience(membership) {
  const role = String(membership?.role || '').toLowerCase();
  if (role === 'sector') return 'sector';
  if (role === 'atendimento') return 'team';
  return 'owner';
}

/** Shared AI + cache step: one cached sentence per day and audience, refreshed at most every 3 hours. */
async function writeBrief({ shopId, day, numbers, aiAllowed, refresh, now, fallback, prompt }) {
  const cached = await AiBrief.findOne({ shopId, kind: 'daily', day }).lean();
  const changed = !cached || JSON.stringify(cached.numbers) !== JSON.stringify(numbers);
  const stale = !cached || now - new Date(cached.updatedAt) > BRIEF_REFRESH_MS;
  const writeAi = aiAllowed && (refresh || !cached || !cached.ai || (changed && stale));
  if (!writeAi) {
    if (cached?.ai && aiAllowed) return { text: cached.text, tip: cached.bullets?.[0] || '', ai: true };
    return { text: fallback, tip: '', ai: false };
  }
  const parsed = await chatJson({ shopId, feature: 'daily_brief', maxTokens: 600, system: prompt.system, user: prompt.user });
  const aiText = String(parsed?.headline || parsed?.text || '').trim();
  const out = aiText
    ? { text: aiText.slice(0, 220), tip: String(parsed?.tip || '').trim().slice(0, 220), ai: true }
    : { text: fallback, tip: '', ai: false };
  await AiBrief.updateOne(
    { shopId, kind: 'daily', day },
    { $set: { text: out.text, bullets: out.tip ? [out.tip] : [], ai: out.ai, numbers } },
    { upsert: true }
  );
  return out;
}

const RULES =
  'Português do Brasil, tom confiante e prático, sem emoji. Use só os números e nomes recebidos, nunca invente. ' +
  'Responda JSON: {"headline":"...","tip":"..."}';

/** A sector account's morning: its own queue only, no money. */
async function sectorBrief(shopId, sectorIds, { aiAllowed, refresh, now }) {
  const ids = (sectorIds || []).map((id) => String(id)).filter(Boolean);
  const oids = ids.map((id) => new mongoose.Types.ObjectId(id));
  const sectors = await Sector.find({ shopId, _id: { $in: oids } }).select('name').lean();
  const todayEnd = endOfSaoPauloDay(now);
  const tomorrowEnd = new Date(todayEnd.getTime() + DAY);
  const orders = oids.length
    ? await Order.find({
        shopId,
        deletedAt: null,
        status: { $in: OPEN },
        $or: [{ 'items.currentSectorId': { $in: oids } }, { currentSectorId: { $in: oids } }],
      })
        .select('code clientName dueAt priority')
        .lean()
    : [];
  const late = orders.filter((o) => o.dueAt && new Date(o.dueAt) < now).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const dueToday = orders.filter((o) => o.dueAt && new Date(o.dueAt) >= now && new Date(o.dueAt) <= todayEnd);
  const dueTomorrow = orders.filter((o) => o.dueAt && new Date(o.dueAt) > todayEnd && new Date(o.dueAt) <= tomorrowEnd);
  const urgent = orders.filter((o) => o.priority != null && Number(o.priority) <= 1);
  const oldest = late[0];
  const lateDays = oldest ? Math.max(1, Math.floor((now - new Date(oldest.dueAt)) / DAY)) : 0;
  const numbers = {
    queue: orders.length,
    overdue: late.length,
    dueToday: dueToday.length,
    dueTomorrow: dueTomorrow.length,
    urgent: urgent.length,
    sectors: sectors.map((s) => s.name),
  };

  const actions = [];
  if (late.length) {
    actions.push({
      id: 'late',
      title: `Destravar ${plural(late.length, 'atrasado', 'atrasados')}`,
      detail: `Comece pelo #${oldest.code}${oldest.clientName ? ` · ${firstName(oldest.clientName)}` : ''} · ${plural(lateDays, 'dia', 'dias')}`,
      value: 0,
      href: '/kanban',
      tone: 'danger',
    });
  }
  if (dueToday.length) {
    actions.push({ id: 'today', title: `Terminar ${plural(dueToday.length, 'pedido', 'pedidos')} de hoje`, detail: 'Vencem até o fim do dia', value: 0, href: '/kanban', tone: 'warn' });
  }
  if (urgent.length) {
    actions.push({ id: 'urgent', title: `${plural(urgent.length, 'urgente', 'urgentes')} na fila`, detail: 'Marcados com prioridade alta', value: 0, href: '/kanban', tone: 'brand' });
  }
  if (dueTomorrow.length) {
    actions.push({ id: 'tomorrow', title: `Adiantar ${plural(dueTomorrow.length, 'pedido', 'pedidos')} de amanhã`, detail: 'Folga para não atrasar', value: 0, href: '/kanban', tone: 'muted' });
  }

  const where = sectors.length === 1 ? sectors[0].name : 'sua fila';
  const fallback = !orders.length
    ? `${where}: nada esperando agora.`
    : late.length
      ? `${where}: ${plural(orders.length, 'pedido', 'pedidos')}, ${plural(late.length, 'atrasado', 'atrasados')}. Comece pelo #${oldest.code}.`
      : `${where}: ${plural(orders.length, 'pedido', 'pedidos')} e nada atrasado${dueToday.length ? `; ${dueToday.length} vence${dueToday.length > 1 ? 'm' : ''} hoje` : ''}.`;

  const out = await writeBrief({
    shopId,
    day: `${saoPauloDayKey(now)}:sector:${ids.slice().sort().join(',')}`,
    numbers,
    aiAllowed: aiAllowed && orders.length > 0,
    refresh,
    now,
    fallback,
    prompt: {
      system:
        'Você é o líder do setor e prepara a equipe da bancada para o dia. ' + RULES +
        ' "headline": 1 frase curta (até 140 caracteres) com o que fazer primeiro, citando o código do pedido quando houver. ' +
        '"tip": 1 frase curta para o setor render hoje, ou "".',
      user: [
        `Setor: ${sectors.map((s) => s.name).join(', ') || 'fila'}`,
        `Pedidos na fila: ${orders.length}`,
        `Atrasados: ${late.length}${oldest ? ` (mais antigo #${oldest.code}, ${lateDays} dias)` : ''}`,
        `Vencem hoje: ${dueToday.length}`,
        `Vencem amanhã: ${dueTomorrow.length}`,
        `Urgentes: ${urgent.length}`,
      ].join('\n'),
    },
  });
  return { day: saoPauloDayKey(now), audience: 'sector', numbers, actions: actions.slice(0, 4), stake: 0, ...out };
}

/** Owner-only signals: ready orders to check at the counter and products to reorder. Never blocks the brief. */
async function ownerExtras(shopId, now) {
  const [check, restock] = await Promise.all([
    require('./shelfService').checkCount(shopId, now).catch(() => ({ count: 0, oldestDays: 0 })),
    require('./restockService').restockReport(shopId, now).catch(() => null),
  ]);
  const top = restock?.late?.[0] || restock?.order?.[0] || null;
  return {
    check,
    restock: restock
      ? {
          order: restock.counts.order,
          late: restock.counts.late,
          coming: restock.counts.coming,
          topName: top?.name || '',
          topLead: top?.leadTimeDays || 0,
          lateDays: restock.late?.[0]?.daysLeft != null ? Math.abs(restock.late[0].daysLeft) : 0,
        }
      : null,
  };
}

async function dailyBrief(shopId, { aiAllowed = false, refresh = false, now = new Date(), audience = 'owner', sectorIds = [] } = {}) {
  if (audience === 'sector') return sectorBrief(shopId, sectorIds, { aiAllowed, refresh, now });

  const withMoney = audience === 'owner';
  const day = saoPauloDayKey(now);
  const full = await dailyNumbers(shopId, now);
  if (withMoney) Object.assign(full, await ownerExtras(shopId, now));
  const m = full.money || {};
  // Front desk gets only the values they handle per order; totals and the shelf stay out of the payload.
  const numbers = withMoney
    ? full
    : {
        ...full,
        quotesOpenValue: undefined,
        money: {
          topCall: m.topCall,
          readyValue: m.readyValue,
          unpaidCount: m.unpaidCount,
          unpaidValue: m.unpaidValue,
          oldestLate: m.oldestLate,
          noPrice: m.noPrice,
        },
      };
  const actions = dailyActions(numbers, { team: !withMoney });
  const stake = withMoney ? dailyStake(numbers) : 0;
  const name = await shopName(shopId);
  const late = `Atrasados: ${full.overdue}${m.oldestLate ? ` (mais antigo #${m.oldestLate.code}, ${m.oldestLate.days} dias)` : ''}`;
  const tomorrow = `Vencem amanhã: ${full.dueTomorrow}${full.tomorrowBySector.length ? ` (${full.tomorrowBySector.map((s) => `${s.name} ${s.count}`).join(', ')})` : ''}`;

  const prompt = withMoney
    ? {
        system:
          'Você é o gerente da loja e prepara o dono para o dia. ' + RULES +
          ' "headline": 1 frase curta (até 140 caracteres) com o dinheiro em jogo e a primeira ação, citando nome e valor quando houver. ' +
          '"tip": 1 frase curta com um conselho para hoje (ex.: o que falar na ligação, o que adiantar para amanhã), ou "" se não houver.',
        user: [
          `Loja: ${name || 'a loja'}`,
          `Dinheiro em jogo hoje: ${formatMoney(stake)}`,
          `Orçamentos para ligar hoje: ${full.callToday} (atrasados: ${full.callOverdue}), valor ${formatMoney(m.callValue || 0)}`,
          m.topCall ? `Primeiro da lista: ${m.topCall.name}, ${formatMoney(m.topCall.value)}, motivo: ${m.topCall.reason || 'não informado'}` : 'Ninguém para ligar.',
          `Prontos esperando retirada: ${full.ready}, ${formatMoney(m.readyValue || 0)} a receber`,
          `Parados na prateleira há 3+ dias: ${m.staleCount || 0}, ${formatMoney(m.staleValue || 0)}`,
          `Entregues sem pagar: ${m.unpaidCount || 0}, ${formatMoney(m.unpaidValue || 0)}`,
          late,
          tomorrow,
          `Pedidos sem preço: ${m.noPrice || 0}`,
          `Pedidos abertos: ${full.open}`,
        ].join('\n'),
      }
    : {
        system:
          'Você é o gerente da loja e prepara o atendimento do balcão para o dia. ' +
          'Fale de valores só quando ajudam numa ação (o valor do orçamento na ligação, o que receber na retirada, o que cobrar); ' +
          'nunca some o faturamento nem diga "dinheiro em jogo". Atrasados vêm primeiro. ' + RULES +
          ' "headline": 1 frase curta (até 140 caracteres) com a primeira coisa a fazer: o que destravar, quem avisar ou quem ligar. ' +
          '"tip": 1 frase curta para o balcão render hoje, ou "".',
        user: [
          `Loja: ${name || 'a loja'}`,
          late,
          `Prontos esperando o cliente: ${full.ready}, ${formatMoney(m.readyValue || 0)} para receber na retirada`,
          `Orçamentos para ligar hoje: ${full.callToday} (atrasados: ${full.callOverdue})`,
          m.topCall ? `Primeiro da lista: ${m.topCall.name}, orçamento de ${formatMoney(m.topCall.value)}, motivo: ${m.topCall.reason || 'não informado'}` : 'Ninguém para ligar.',
          `Entregues sem pagar: ${m.unpaidCount || 0}, ${formatMoney(m.unpaidValue || 0)}`,
          tomorrow,
          `Pedidos sem preço: ${m.noPrice || 0}`,
          `Pedidos abertos: ${full.open}`,
        ].join('\n'),
      };

  const out = await writeBrief({
    shopId,
    day: withMoney ? day : `${day}:team`,
    numbers,
    aiAllowed,
    refresh,
    now,
    fallback: dailyFallback(numbers, { team: !withMoney }),
    prompt,
  });
  return { day, audience: withMoney ? 'owner' : 'team', numbers, actions, stake, ...out };
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
  briefAudience,
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
