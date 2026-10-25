/**
 * Orçamentos: etapas, motivos e a nota de prioridade do "Ligar hoje".
 * Sem banco — fácil de testar.
 */

const STAGES = ['new', 'contact', 'followup', 'lost', 'won'];
const OPEN_STAGES = ['new', 'contact', 'followup'];
const REASONS = ['price', 'deadline', 'thinking', 'other_shop', 'no_need', 'other'];

const REASON_LABEL = {
  price: 'Preço',
  deadline: 'Prazo',
  thinking: 'Vai pensar',
  other_shop: 'Foi em outro lugar',
  no_need: 'Não precisa mais',
  other: 'Outro',
};

const REASON_WEIGHT = {
  thinking: 20,
  price: 15,
  deadline: 10,
  other: 5,
  other_shop: -15,
  no_need: -25,
};

const DAY = 24 * 60 * 60 * 1000;
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

/** End of the São Paulo day that contains `now`, as a UTC instant. */
function endOfSaoPauloDay(now = new Date()) {
  const local = new Date(now.getTime() - TZ_OFFSET_MS);
  local.setUTCHours(23, 59, 59, 999);
  return new Date(local.getTime() + TZ_OFFSET_MS);
}

function startOfSaoPauloDay(now = new Date()) {
  const end = endOfSaoPauloDay(now);
  return new Date(end.getTime() - DAY + 1);
}

function normalizeStage(value, fallback = 'new') {
  const v = String(value || '').trim().toLowerCase();
  return STAGES.includes(v) ? v : fallback;
}

function normalizeReason(value) {
  const v = String(value || '').trim().toLowerCase();
  return REASONS.includes(v) ? v : null;
}

function formatMoney(value) {
  return `R$ ${Math.round(Number(value) || 0).toLocaleString('pt-BR')}`;
}

/**
 * Due state of the follow-up for the list.
 * @returns {{ state: 'overdue'|'today'|'later'|'none', days: number }}
 */
function followUpState(followUpAt, now = new Date()) {
  if (!followUpAt) return { state: 'none', days: 0 };
  const due = new Date(followUpAt);
  if (Number.isNaN(due.getTime())) return { state: 'none', days: 0 };
  const todayStart = startOfSaoPauloDay(now);
  const todayEnd = endOfSaoPauloDay(now);
  if (due < todayStart) {
    const days = Math.max(1, Math.ceil((todayStart.getTime() - due.getTime()) / DAY));
    return { state: 'overdue', days };
  }
  if (due <= todayEnd) return { state: 'today', days: 0 };
  const days = Math.max(1, Math.ceil((due.getTime() - todayEnd.getTime()) / DAY));
  return { state: 'later', days };
}

/**
 * Score the quote for the call list. Higher = call first.
 * Never uses an LLM: the shop can trust the order every morning.
 */
function quotePriority(quote, now = new Date()) {
  const stage = normalizeStage(quote?.stage);
  if (!OPEN_STAGES.includes(stage)) {
    return { level: 'none', score: 0, hint: stage === 'won' ? 'Recuperado' : 'Encerrado' };
  }

  let score = stage === 'new' ? 30 : stage === 'followup' ? 25 : 20;
  const hints = [];
  const due = followUpState(quote?.followUpAt, now);

  if (due.state === 'overdue') {
    score += 40 + Math.min(20, due.days * 5);
    hints.push(due.days === 1 ? 'Retorno atrasado 1 dia' : `Retorno atrasado ${due.days} dias`);
  } else if (due.state === 'today') {
    score += 30;
    hints.push('Retorno hoje');
  } else if (due.state === 'later') {
    score -= 20;
  } else if (stage === 'new') {
    score += 10;
    hints.push('Ainda sem contato');
  }

  const reason = normalizeReason(quote?.reason);
  if (reason) {
    score += REASON_WEIGHT[reason] || 0;
    if (reason === 'thinking' || reason === 'price') hints.push(REASON_LABEL[reason]);
  }

  const value = Number(quote?.value) || 0;
  if (value > 0) {
    score += Math.min(25, Math.round(value / 20));
    if (value >= 300) hints.push(formatMoney(value));
  }

  const contacts = Number(quote?.contactCount) || 0;
  if (contacts >= 3) {
    score -= 10;
    hints.push(`${contacts} contatos`);
  }

  const created = quote?.createdAt ? new Date(quote.createdAt) : null;
  if (created && !Number.isNaN(created.getTime()) && now - created > 30 * DAY) score -= 10;

  const level = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { level, score, hint: hints.slice(0, 2).join(' · ') };
}

/** Open quotes that belong on today's list. */
function isDueToday(quote, now = new Date()) {
  const stage = normalizeStage(quote?.stage);
  if (!OPEN_STAGES.includes(stage)) return false;
  const due = followUpState(quote?.followUpAt, now);
  if (due.state === 'overdue' || due.state === 'today') return true;
  return due.state === 'none' && stage === 'new';
}

module.exports = {
  STAGES,
  OPEN_STAGES,
  REASONS,
  REASON_LABEL,
  normalizeStage,
  normalizeReason,
  followUpState,
  quotePriority,
  isDueToday,
  endOfSaoPauloDay,
  startOfSaoPauloDay,
  formatMoney,
};
