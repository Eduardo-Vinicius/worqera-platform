/**
 * Texto para retomar um orçamento: modelo pronto da casa, e o modelo de IA
 * quando `OPENAI_API_KEY` estiver configurada. A UI só mostra "IA" se `ai` vier true.
 */

const { REASON_LABEL, formatMoney } = require('../lib/quotePriority');

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function templateOptions({ name, what, value, reason, shopName }) {
  const hi = firstName(name) ? `Oi ${firstName(name)}, tudo bem?` : 'Oi, tudo bem?';
  const from = shopName ? ` Aqui é da ${shopName}.` : '';
  const item = what || '';
  const price = Number(value) > 0 ? ` (${formatMoney(value)})` : '';
  const onIt = item ? `no orçamento do ${item}` : 'no seu orçamento';
  const ofIt = item ? `do orçamento do ${item}` : 'do seu orçamento';
  const theQuote = item ? `o orçamento do ${item}` : 'o seu orçamento';
  const it = item ? `o ${item}` : 'o seu pedido';

  const byReason = {
    price: `${hi}${from} Fiquei pensando ${onIt}${price}. Consigo ver uma condição melhor para fechar essa semana. Quer que eu te mande?`,
    thinking: `${hi}${from} Passando para saber se deu para pensar ${onIt}${price}. Se quiser, já reservo um lugar na fila.`,
    deadline: `${hi}${from} Abriu espaço na produção. Consigo entregar ${it} mais rápido agora. Quer que eu coloque?`,
    other_shop: `${hi}${from} Se precisar de outra opinião sobre ${it}, a gente continua por aqui. É só mandar uma foto.`,
    no_need: `${hi}${from} Quando precisar de ${item ? `cuidado com o ${item}` : 'algum serviço'} de novo, é só chamar. A gente guarda seu cadastro.`,
    other: `${hi}${from} Passando para retomar ${theQuote}${price}. Ainda faz sentido para você?`,
  };

  const main = byReason[reason] || byReason.other;
  return [
    { tone: 'direct', label: 'Direto', text: main },
    {
      tone: 'gentle',
      label: 'Leve',
      text: `${hi}${from} Só lembrando ${ofIt}. Se quiser tirar alguma dúvida, estou por aqui.`,
    },
    {
      tone: 'short',
      label: 'Curto',
      text: `${hi}${from} Bora fechar ${it}? Consigo começar ainda esta semana.`,
    },
  ];
}

async function aiOptions(ctx) {
  const reason = ctx.reason ? REASON_LABEL[ctx.reason] : 'não informado';
  const prompt = [
    `Loja: ${ctx.shopName || 'a loja'}`,
    `Cliente: ${ctx.name || 'cliente'}`,
    `O que queria: ${ctx.what || 'serviço'}`,
    `Valor orçado: ${Number(ctx.value) > 0 ? formatMoney(ctx.value) : 'não informado'}`,
    `Motivo de não fechar: ${reason}${ctx.reasonNote ? ` — ${ctx.reasonNote}` : ''}`,
    `Contatos já feitos: ${ctx.contactCount || 0}`,
  ].join('\n');

  const { chatJson } = require('./aiService');
  const parsed = await chatJson({
    shopId: ctx.shopId,
    feature: 'quote_message',
    maxTokens: 900,
    system:
      'Você escreve mensagens de WhatsApp para uma loja de serviço retomar um orçamento que o cliente não fechou. ' +
      'Português do Brasil, tom de balcão, curto (até 280 caracteres), sem emoji em excesso, sem prometer desconto que não foi dito. ' +
      'Responda JSON: {"options":[{"tone":"direct","label":"Direto","text":"..."},{"tone":"gentle","label":"Leve","text":"..."},{"tone":"short","label":"Curto","text":"..."}]}',
    user: prompt,
  });
  const options = (parsed?.options || [])
    .map((o) => ({
      tone: String(o.tone || 'direct'),
      label: String(o.label || 'Sugestão'),
      text: String(o.text || '').trim(),
    }))
    .filter((o) => o.text)
    .slice(0, 3);
  return options.length ? options : null;
}

/** `aiAllowed` = Business plan. Everyone else gets the ready-made texts. */
async function suggestQuoteMessages(ctx, { aiAllowed = false } = {}) {
  const ai = aiAllowed ? await aiOptions(ctx) : null;
  if (ai) return { ai: true, options: ai };
  return { ai: false, options: templateOptions(ctx) };
}

module.exports = { suggestQuoteMessages, templateOptions };
