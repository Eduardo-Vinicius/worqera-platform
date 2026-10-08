/**
 * Client order-status emails (created / moved / ready).
 * Fire-and-forget — never block create/move on SMTP failure.
 *
 * created → PDF anexo + link público
 * ready   → pronto + reforço para avaliar no link público
 */
const { sendMail, companyDisplayName } = require('./mailer');

function emailEnabled(shop) {
  const flag = shop?.notifications?.email?.enabled;
  return flag !== false;
}

function publicOrderUrl(shop, order, { hash } = {}) {
  const { buildPublicOrderUrl } = require('../utils/publicOrderToken');
  const web = (process.env.PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || 'https://worqera.com').replace(
    /\/+$/,
    ''
  );
  const slug = shop?.slug || '';
  const code = order?.code || '';
  const token = order?.publicToken || '';
  let url = buildPublicOrderUrl(web, slug, code, token) || web;
  if (hash) url = `${url}#${String(hash).replace(/^#/, '')}`;
  return url;
}

function copyFor(kind, { shopName, sectorName, code }) {
  if (kind === 'created') {
    return {
      subject: `Pedido #${code} recebido — acompanhe e baixe o PDF`,
      title: 'Recebemos o seu pedido',
      body: `Olá! Seu pedido <strong>#${code}</strong> foi registrado em <strong>${shopName}</strong>. Em anexo está o PDF do pedido. Use o link abaixo para acompanhar o status a qualquer momento.`,
    };
  }
  if (kind === 'ready') {
    return {
      subject: `Pedido #${code} pronto — retire e avalie`,
      title: 'Seu pedido está pronto',
      body: `Boa notícia: o pedido <strong>#${code}</strong> está <strong>pronto para retirada</strong>${
        sectorName ? ` (${sectorName})` : ''
      } em <strong>${shopName}</strong>. Pode vir buscar quando quiser.`,
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

async function tryBuildPdfAttachment(shop, order) {
  try {
    const shopId = order.shopId || shop?._id;
    const orderId = order._id || order.id;
    if (!shopId || !orderId) return null;
    const pdfService = require('./pdfService');
    const pdf = await pdfService.generateOrderPdf(shopId, orderId);
    if (!pdf?.buffer) return null;
    return {
      filename: pdf.filename || `pedido-${order.code || orderId}.pdf`,
      content: pdf.buffer,
      contentType: 'application/pdf',
    };
  } catch (err) {
    if (err?.code === 'PHOTOS_PENDING' || err?.code === 'PHOTOS_MISSING') throw err;
    console.warn('[orderNotify] pdf attach skipped', err?.message || err);
    return null;
  }
}

function buildHtml({ kind, title, body, link, trackLink, code, primary, pdfAttached }) {
  const track = trackLink || link;
  const parts = [];
  parts.push(`<h2 style="margin:0 0 12px;font-size:20px;color:${primary}">${title}</h2>`);
  parts.push(`<p style="margin:0 0 16px">${body}</p>`);

  if (kind === 'created' && pdfAttached) {
    parts.push(
      `<p style="margin:0 0 16px;font-size:14px;color:#334155">📎 O <strong>PDF do pedido</strong> segue em anexo neste e-mail.</p>`
    );
  }

  parts.push(`
    <p style="margin:0 0 12px">
      <a href="${track}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">
        Acompanhar pedido
      </a>
    </p>
    <p style="margin:0 0 20px;font-size:13px;color:#64748b">
      Link público: <a href="${track}" style="color:${primary}">${track}</a>
    </p>
  `);

  if (kind === 'ready') {
    parts.push(`
      <div style="margin:24px 0 0;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0">
        <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#0f172a">Como ficou o serviço?</p>
        <p style="margin:0 0 14px;font-size:14px;color:#475569">
          Sua avaliação nos ajuda a melhorar. Leva menos de 30 segundos — abra o link do pedido e deixe sua nota.
        </p>
        <a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600">
          Avaliar agora
        </a>
      </div>
    `);
  }

  parts.push(
    `<p style="margin:20px 0 0;font-size:13px;color:#64748b">Código <strong>${code}</strong></p>`
  );
  return parts.join('\n');
}

const MAIL_LOG_CAP = 200;

async function recordMailLog(entry) {
  try {
    const PlatformMailLog = require('../models/PlatformMailLog');
    await PlatformMailLog.create({
      at: new Date(),
      shopId: entry.shopId ? String(entry.shopId) : null,
      kind: String(entry.kind || ''),
      code: String(entry.code || ''),
      to: String(entry.to || '').slice(0, 200),
      ok: entry.ok === true,
      skipped: Boolean(entry.skipped),
      reason: String(entry.reason || '').slice(0, 80),
      error: String(entry.error || '').slice(0, 300),
      provider: String(entry.provider || '').slice(0, 40),
    });
    const count = await PlatformMailLog.countDocuments();
    if (count > MAIL_LOG_CAP) {
      const old = await PlatformMailLog.find()
        .sort({ at: 1, _id: 1 })
        .limit(count - MAIL_LOG_CAP)
        .select('_id')
        .lean();
      if (old.length) {
        await PlatformMailLog.deleteMany({ _id: { $in: old.map((row) => row._id) } });
      }
    }
  } catch (err) {
    console.warn('[mail] log', err?.message || err);
  }
}

async function listRecentMailLogs(limit = 40) {
  const PlatformMailLog = require('../models/PlatformMailLog');
  const rows = await PlatformMailLog.find()
    .sort({ at: -1 })
    .limit(Math.min(Math.max(Number(limit) || 40, 1), 80))
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    at: row.at,
    shopId: row.shopId || null,
    kind: row.kind || '',
    code: row.code || '',
    to: row.to || '',
    ok: row.ok === true,
    skipped: row.skipped === true,
    reason: row.reason || '',
    error: row.error || '',
    provider: row.provider || '',
  }));
}

function mailContext(shop, order, kind) {
  return {
    shopId: shop?._id || shop?.id || order?.shopId || null,
    kind,
    code: order?.code || '',
    to: String(order?.clientEmail || '').trim(),
  };
}

async function notifyGate(shop, order, kind) {
  const base = mailContext(shop, order, kind);
  if (!shop || !order) {
    console.info('[orderNotify] skip', { kind, reason: 'missing' });
    const result = { ok: false, skipped: true, reason: 'missing' };
    await recordMailLog({ ...base, ...result });
    return result;
  }
  if (!emailEnabled(shop)) {
    console.info('[orderNotify] skip', {
      kind,
      code: order.code,
      reason: 'email-disabled',
    });
    const result = { ok: false, skipped: true, reason: 'email-disabled' };
    await recordMailLog({ ...base, ...result });
    return result;
  }
  const { moduleEnabled } = require('./platformConsoleService');
  const shopId = shop._id || shop.id || order.shopId;
  if (!(await moduleEnabled(shopId, 'emailNotify'))) {
    const result = { ok: false, skipped: true, reason: 'email-disabled' };
    await recordMailLog({ ...base, ...result });
    return result;
  }
  const to = String(order.clientEmail || '').trim();
  if (!to) {
    console.info('[orderNotify] skip', {
      kind,
      code: order.code,
      reason: 'no-email',
    });
    const result = { ok: false, skipped: true, reason: 'no-email' };
    await recordMailLog({ ...base, ...result });
    return result;
  }
  return null;
}

async function notifyOrderStatus(shop, order, kind, { sectorName, pdfAttachment, requirePdf } = {}) {
  try {
    const gated = await notifyGate(shop, order, kind);
    if (gated) return gated;
    const to = String(order.clientEmail || '').trim();

    if (!order.publicToken) {
      const { ensureOrderPublicToken } = require('../utils/publicOrderToken');
      await ensureOrderPublicToken(order);
    }

    const shopName = companyDisplayName(shop);
    const code = order.code || '';
    const trackLink = publicOrderUrl(shop, order);
    const link =
      kind === 'ready' ? publicOrderUrl(shop, order, { hash: 'avaliar' }) : trackLink;
    const { subject, title, body } = copyFor(kind, { shopName, sectorName, code });
    const primary = shop.branding?.primaryColor || '#7d26de';

    const attachments = [];
    if (kind === 'created') {
      if (pdfAttachment?.content) attachments.push(pdfAttachment);
      else {
        const pdf = await tryBuildPdfAttachment(shop, order);
        if (pdf) attachments.push(pdf);
      }
      if (requirePdf && !attachments.length) {
        const missing = { ok: false, error: 'laudo sem fotos', reason: 'photos-missing' };
        await recordMailLog({ ...mailContext(shop, order, kind), to, ...missing });
        return missing;
      }
    }

    const html = buildHtml({
      kind,
      title,
      body,
      link,
      trackLink,
      code,
      primary,
      pdfAttached: attachments.length > 0,
    });

    let text = `${title}\n\nPedido #${code}\nAcompanhe: ${trackLink}\n`;
    if (kind === 'created' && attachments.length) {
      text += '\nPDF do pedido em anexo.\n';
    }
    if (kind === 'ready') {
      text +=
        `\nSeu pedido está pronto para retirada.\nQuando puder, avalie o serviço: ${link}\n`;
    }

    const result = await sendMail({
      to,
      subject,
      html,
      text,
      shop,
      attachments: attachments.length ? attachments : undefined,
    });
    console.info('[orderNotify]', {
      kind,
      code,
      to,
      ok: result?.ok !== false,
      provider: result?.provider,
      skipped: result?.skipped,
      reason: result?.reason,
      attachments: attachments.length,
    });
    await recordMailLog({
      ...mailContext(shop, order, kind),
      to,
      ok: result?.ok === true && result?.provider !== 'console',
      skipped: Boolean(result?.skipped) || result?.provider === 'console',
      reason: result?.provider === 'console' ? 'smtp-off' : result?.reason || '',
      error: result?.error || '',
      provider: result?.provider || '',
    });
    return result;
  } catch (err) {
    console.warn('[orderNotify] failed', {
      kind,
      code: order?.code,
      error: err?.message || String(err),
    });
    const result = { ok: false, error: err?.message || String(err) };
    await recordMailLog({
      ...mailContext(shop, order, kind),
      ...result,
      reason: 'failed',
    });
    return result;
  }
}

/** Non-blocking wrapper */
function notifyOrderStatusSafe(shop, order, kind, extras) {
  notifyOrderStatus(shop, order, kind, extras).catch((err) => {
    console.warn('[orderNotify] safe catch', err?.message || err);
  });
}

/** Fast answer for create/resend. PDF and SMTP finish after the HTTP response. */
async function enqueueNotifyOrderStatus(shop, order, kind, extras) {
  const gated = await notifyGate(shop, order, kind);
  if (gated) return gated;
  notifyOrderStatusSafe(shop, order, kind, extras);
  return { ok: true, queued: true };
}

module.exports = {
  notifyOrderStatus,
  notifyOrderStatusSafe,
  enqueueNotifyOrderStatus,
  emailEnabled,
  publicOrderUrl,
  recordMailLog,
  listRecentMailLogs,
};
