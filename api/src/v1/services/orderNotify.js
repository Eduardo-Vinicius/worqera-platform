/**
 * Client order-status emails (created / moved / ready).
 * Fire-and-forget — never block create/move on SMTP failure.
 */
const { sendMail, companyDisplayName } = require('./mailer');

function emailEnabled(shop) {
  const flag = shop?.notifications?.email?.enabled;
  return flag !== false;
}

function publicOrderUrl(shop, order) {
  const web = (process.env.PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || 'https://worqera.com').replace(
    /\/+$/,
    ''
  );
  const slug = shop?.slug || '';
  const code = order?.code || '';
  if (slug && code) return `${web}/p/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
  return web;
}

function copyFor(kind, { shopName, sectorName, code }) {
  if (kind === 'created') {
    return {
      subject: `Pedido #${code} recebido`,
      title: 'Recebemos o seu pedido',
      body: `Olá! Seu pedido <strong>#${code}</strong> foi registrado em <strong>${shopName}</strong>. Você pode acompanhar o status pelo link abaixo.`,
    };
  }
  if (kind === 'ready') {
    return {
      subject: `Pedido #${code} pronto para retirada`,
      title: 'Seu pedido está pronto',
      body: `Boa notícia: o pedido <strong>#${code}</strong> está <strong>pronto</strong>${
        sectorName ? ` em <strong>${sectorName}</strong>` : ''
      }. Pode vir buscar quando quiser.`,
    };
  }
  return {
    subject: `Pedido #${code} avançou`,
    title: 'Seu pedido avançou',
    body: `O pedido <strong>#${code}</strong> chegou em <strong>${
      sectorName || 'uma nova etapa'
    }</strong> na ${shopName}.`,
  };
}

async function notifyOrderStatus(shop, order, kind, { sectorName } = {}) {
  try {
    if (!shop || !order) return { ok: false, skipped: true, reason: 'missing' };
    if (!emailEnabled(shop)) return { ok: false, skipped: true, reason: 'email-disabled' };
    const to = String(order.clientEmail || '').trim();
    if (!to) return { ok: false, skipped: true, reason: 'no-email' };

    const shopName = companyDisplayName(shop);
    const code = order.code || '';
    const link = publicOrderUrl(shop, order);
    const { subject, title, body } = copyFor(kind, { shopName, sectorName, code });
    const primary = shop.branding?.primaryColor || '#7d26de';

    const html = `
      <h2 style="margin:0 0 12px;font-size:20px;color:${primary}">${title}</h2>
      <p style="margin:0 0 16px">${body}</p>
      <p style="margin:0 0 20px">
        <a href="${link}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">
          Acompanhar pedido
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b">Código <strong>${code}</strong> · link: ${link}</p>
    `;
    const text = `${title}\n\nPedido #${code}\n${link}\n`;

    return await sendMail({ to, subject, html, text, shop });
  } catch (err) {
    console.warn('[orderNotify]', err?.message || err);
    return { ok: false, error: err?.message };
  }
}

/** Non-blocking wrapper */
function notifyOrderStatusSafe(shop, order, kind, extras) {
  notifyOrderStatus(shop, order, kind, extras).catch(() => {});
}

module.exports = {
  notifyOrderStatus,
  notifyOrderStatusSafe,
  emailEnabled,
  publicOrderUrl,
};
