/**
 * E-mails from Worqera to the shop owner (billing). Worqera brand, not the shop's.
 * Table layout and inline styles so Gmail, Outlook and phones render the same.
 */
const BRAND = '#7d26de';
const INK = '#110f17';
const MUTED = '#64748b';
const SUPPORT_WHATSAPP = 'https://wa.me/5511985591053';

const METHOD = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  RECEIVED_IN_CASH: 'Dinheiro',
  UNDEFINED: 'Pix, boleto ou cartão',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const brl = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const day = (date) =>
  date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';

function methodLabel(code) {
  return METHOD[String(code || '').toUpperCase()] || '';
}

function layout({ preheader, title, intro, rows, button, outro }) {
  const rowHtml = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:${MUTED};font-size:14px">${escapeHtml(label)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eef0f4;color:${INK};font-size:14px;font-weight:600;text-align:right">${escapeHtml(value)}</td>
          </tr>`
    )
    .join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f2f8">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f8;padding:32px 12px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding:0 4px 16px;font-size:20px;font-weight:700;letter-spacing:-0.2px;color:${BRAND}">Worqera</td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:28px 28px 24px;box-shadow:0 1px 2px rgba(16,24,40,0.06)">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#16a34a">Pagamento confirmado</p>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${INK}">${escapeHtml(title)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
            <tr><td style="border-radius:10px;background:${BRAND}">
              <a href="${escapeHtml(button.href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(button.label)}</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">${outro}</p>
        </td></tr>
        <tr><td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:${MUTED}">
          Worqera · gestão de pedidos, clientes e orçamentos<br>
          Você recebeu este e-mail porque é responsável pela assinatura da empresa.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Sent when Asaas confirms a payment and the subscription becomes active. */
function subscriptionActiveEmail({ ownerName, shopName, planName, cycle, amountBrl, paidUntil, method, billingUrl }) {
  const plan = planName || 'Worqera';
  const first = String(ownerName || '').trim().split(/\s+/)[0];
  const cycleLabel = cycle === 'yearly' ? 'Anual' : 'Mensal';
  const subject = `Assinatura ${plan} ativa`;
  const intro = `${first ? `Olá, ${escapeHtml(first)}! ` : ''}Recebemos o pagamento e a assinatura de <strong>${escapeHtml(
    shopName || 'sua empresa'
  )}</strong> está ativa. A equipe já pode usar tudo do plano.`;
  const rows = [
    ['Empresa', shopName || ''],
    ['Plano', plan],
    ['Ciclo', cycleLabel],
    ['Valor', amountBrl ? brl(amountBrl) : ''],
    ['Forma de pagamento', methodLabel(method)],
    ['Válido até', day(paidUntil)],
  ];
  const html = layout({
    preheader: `${plan} ativo${paidUntil ? ` até ${day(paidUntil)}` : ''}.`,
    title: subject,
    intro,
    rows,
    button: { label: 'Ver meu plano', href: billingUrl },
    outro: `A próxima cobrança chega por e-mail perto do vencimento, com Pix, boleto ou cartão. Dúvidas? Responda este e-mail ou <a href="${SUPPORT_WHATSAPP}" style="color:${BRAND}">fale com a gente no WhatsApp</a>.`,
  });
  const text = [
    `${first ? `Olá, ${first}!` : 'Olá!'}`,
    '',
    `Recebemos o pagamento e a assinatura de ${shopName || 'sua empresa'} está ativa.`,
    '',
    ...rows.filter(([, v]) => v).map(([label, value]) => `${label}: ${value}`),
    '',
    `Ver meu plano: ${billingUrl}`,
    '',
    'Worqera · gestão de pedidos, clientes e orçamentos',
  ].join('\n');
  return { subject, html, text };
}

module.exports = { subscriptionActiveEmail, methodLabel };
