/**
 * wa.me helpers (no Meta Cloud API) — shared with move suggestions.
 */

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function toWhatsAppE164Digits(phone) {
  let d = digitsOnly(phone);
  if (!d) return '';
  if (d.startsWith('55') && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

function fillWaTemplate(template, vars = {}) {
  const map = {
    '{{code}}': vars.code || '',
    '{{client}}': vars.client || '',
    '{{link}}': vars.link || '',
    '{{sector}}': vars.sector || '',
    '{{shop}}': vars.shop || '',
  };
  let out = String(template || '');
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}

function buildWaMeUrl(phone, text) {
  const d = toWhatsAppE164Digits(phone);
  if (!d) return '';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${d}${q}`;
}

const DEFAULT_TEMPLATES = {
  created:
    'Olá {{client}}! Seu pedido {{code}} foi registrado em {{shop}}. Acompanhe: {{link}}',
  moved: 'Olá {{client}}! Seu pedido {{code}} avançou para {{sector}}. Acompanhe: {{link}}',
  ready: 'Olá {{client}}! Seu pedido {{code}} está pronto para retirada. {{link}}',
  publicLink: 'Olá {{client}}! Consulte o pedido {{code}} aqui: {{link}}',
};

/**
 * Build a WhatsApp suggest payload for an order event (created / moved / ready / publicLink).
 * @param {'created'|'moved'|'ready'|'publicLink'} templateKey
 */
async function buildOrderWhatsAppSuggest(shopId, order, { templateKey, sectorName } = {}) {
  const Shop = require('../models/Shop');
  const Client = require('../models/Client');

  const key = templateKey || 'publicLink';
  const shop = await Shop.findById(shopId).lean();
  const wa = shop?.notifications?.whatsapp;
  if (!wa?.enabled) return null;

  let client = null;
  if (order.clientId) {
    client = await Client.findOne({ _id: order.clientId, shopId }).lean();
  }

  const phone = client?.phone || order.clientPhone || wa.shopPhoneE164 || '';
  if (!phone) return null;

  const webBase = String(
    process.env.PUBLIC_WEB_URL || process.env.WORQERA_PublicWebUrl || 'https://worqera.com'
  ).replace(/\/$/, '');
  const code = order.code || '';
  const slug = shop?.slug || '';
  const link = slug ? `${webBase}/p/${slug}/${code}` : `${webBase}/p/${code}`;
  const shopName = shop?.branding?.displayName || shop?.name || 'Worqera';

  const templates = wa.templates || {};
  const tpl = templates[key] || DEFAULT_TEMPLATES[key] || DEFAULT_TEMPLATES.publicLink;

  const text = fillWaTemplate(tpl, {
    code: String(code),
    client: order.clientName || client?.name || '',
    link,
    sector: sectorName || '',
    shop: shopName,
  });
  const url = buildWaMeUrl(phone, text);
  if (!url) return null;

  return {
    url,
    text,
    phoneDigits: toWhatsAppE164Digits(phone),
    template: key,
    sectorName: sectorName || '',
    code: String(code),
  };
}

/**
 * Build a WhatsApp suggest payload after a kanban move (or null if not applicable).
 */
async function buildMoveWhatsAppSuggest(shopId, order, toSector) {
  const isReady = Boolean(toSector?.isTerminal) || order.status === 'ready';
  return buildOrderWhatsAppSuggest(shopId, order, {
    templateKey: isReady ? 'ready' : 'moved',
    sectorName: toSector?.name || '',
  });
}

module.exports = {
  digitsOnly,
  toWhatsAppE164Digits,
  fillWaTemplate,
  buildWaMeUrl,
  buildOrderWhatsAppSuggest,
  buildMoveWhatsAppSuggest,
  DEFAULT_TEMPLATES,
};
