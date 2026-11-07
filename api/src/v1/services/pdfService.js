const Order = require('../models/Order');
const Client = require('../models/Client');
const Shop = require('../models/Shop');
const Sector = require('../models/Sector');
const storageService = require('./storageService');
const { effectiveItems } = require('./orderItems');
const { buildPublicOrderUrl, ensureOrderPublicToken } = require('../utils/publicOrderToken');
const { publicCustomerSummary } = require('../lib/customerSummary');
const { renderOrderPdf } = require('./pdfLayout');

const MAX_FOTOS_PER_PAIR = Number(process.env.PDF_MAX_EMBEDDED_FOTOS || 10);

function getImageFormat(contentType = '', key = '') {
  const ct = String(contentType).toLowerCase();
  const k = String(key).toLowerCase().split('?')[0];
  if (ct.includes('png') || k.endsWith('.png')) return 'PNG';
  if (ct.includes('webp') || k.endsWith('.webp')) return 'WEBP';
  if (ct.includes('jpeg') || ct.includes('jpg') || k.endsWith('.jpg') || k.endsWith('.jpeg')) return 'JPEG';
  return null;
}

function mimeForFormat(formato) {
  if (formato === 'PNG') return 'image/png';
  if (formato === 'WEBP') return 'image/webp';
  return 'image/jpeg';
}

/** Storage key from {key}, a files URL, or a relative shops/... path. */
function photoStorageKey(photo) {
  if (!photo) return null;
  if (typeof photo === 'object' && photo.key) return String(photo.key);
  const raw = String(typeof photo === 'string' ? photo : photo.url || '').trim();
  if (!raw) return null;
  const markers = ['/api/v1/public/files/', '/api/v1/files/'];
  for (const marker of markers) {
    const idx = raw.indexOf(marker);
    if (idx < 0) continue;
    const rest = raw.slice(idx + marker.length).split('?')[0];
    try {
      return decodeURIComponent(rest);
    } catch (_err) {
      return rest;
    }
  }
  const shops = raw.indexOf('shops/');
  if (shops >= 0) {
    try {
      return decodeURIComponent(raw.slice(shops).split('?')[0]);
    } catch (_err) {
      return raw.slice(shops).split('?')[0];
    }
  }
  if (!/^https?:\/\//i.test(raw)) return raw.split('?')[0];
  return null;
}

async function loadPhotoForPdf(photo) {
  const key = photoStorageKey(photo);
  if (!key) return null;
  try {
    const { buffer, contentType } = await storageService.getBuffer(key);
    const formato = getImageFormat(contentType, key);
    if (!formato || !buffer || !buffer.length) return null;
    const dataUrl = `data:${mimeForFormat(formato)};base64,${buffer.toString('base64')}`;
    return { formato, dataUrl };
  } catch (_err) {
    return null;
  }
}

function photosForPair(item, order, itemCount) {
  const own = Array.isArray(item?.photos) ? item.photos : [];
  if (own.length) return own.slice(0, MAX_FOTOS_PER_PAIR);
  if (itemCount === 1 && Array.isArray(order?.photos) && order.photos.length) {
    return order.photos.slice(0, MAX_FOTOS_PER_PAIR);
  }
  return [];
}

function publicWebBase() {
  return (process.env.PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || 'https://worqera.com').replace(/\/+$/, '');
}

async function generateOrderPdf(shopId, orderId) {
  const order = await Order.findOne({ _id: orderId, shopId }).lean();
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const [client, shop, sector] = await Promise.all([
    order.clientId ? Client.findOne({ _id: order.clientId, shopId }).lean() : null,
    Shop.findById(shopId).lean(),
    order.currentSectorId
      ? Sector.findOne({ _id: order.currentSectorId, shopId }).lean()
      : null,
  ]);

  const items = effectiveItems(order);
  await ensureOrderPublicToken(order);
  const publicUrl = shop?.slug ? buildPublicOrderUrl(publicWebBase(), shop.slug, order.code, order.publicToken) : '';
  const logo = await loadPhotoForPdf(shop?.branding?.logoUrl);

  const doc = await renderOrderPdf({
    order: { ...order, items },
    client,
    shop,
    sector,
    logo,
    publicUrl,
    summaryText: publicCustomerSummary(order),
    photosFor: (item, count) => photosForPair(item, order, count),
    loadPhoto: loadPhotoForPdf,
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${storageService.pdfsPrefix(shopId, orderId)}laudo-${order.code}-${timestamp}.pdf`;
  const saved = await storageService.putBuffer(key, pdfBuffer, 'application/pdf');

  await Order.updateOne({ _id: orderId, shopId }, { $set: { pdfUrl: saved.url } });

  return {
    buffer: pdfBuffer,
    key: saved.key,
    url: saved.url,
    filename: `laudo-${order.code}.pdf`,
  };
}

async function listOrderPdfs(shopId, orderId) {
  const prefix = storageService.pdfsPrefix(shopId, orderId);
  return storageService.list(prefix);
}

/** Fire-and-forget safe wrapper for create/notify. */
function generateOrderPdfSafe(shopId, orderId) {
  generateOrderPdf(shopId, orderId).catch((err) => {
    console.warn('[pdfService] generate skipped', err?.message || err);
  });
}

module.exports = {
  generateOrderPdf,
  generateOrderPdfSafe,
  listOrderPdfs,
};
