const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Shop = require('../models/Shop');
const Sector = require('../models/Sector');
const storageService = require('./storageService');
const { effectiveItems } = require('./orderItems');
const { buildPublicOrderUrl, ensureOrderPublicToken } = require('../utils/publicOrderToken');

const MAX_FOTOS_PER_PAIR = Number(process.env.PDF_MAX_EMBEDDED_FOTOS || 10);
const BRAND_RGB = [15, 23, 42]; // slate-900
const ACCENT_RGB = [37, 99, 235]; // blue-600
const MUTED_RGB = [100, 116, 139];

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return 'R$ 0,00';
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function formatAddress(address = {}) {
  const parts = [];
  if (address.logradouro || address.street) parts.push(address.logradouro || address.street);
  if (address.numero || address.number) parts.push(`nº ${address.numero || address.number}`);
  if (address.complemento || address.complement) {
    parts.push(address.complemento || address.complement);
  }
  if (address.bairro || address.neighborhood) parts.push(address.bairro || address.neighborhood);
  if (address.cidade || address.city) parts.push(address.cidade || address.city);
  if (address.estado || address.state) parts.push(address.estado || address.state);
  if (address.cep || address.zip) parts.push(`CEP ${address.cep || address.zip}`);
  return parts.length ? parts.join(', ') : null;
}

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

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) {
    return hexToRgb(h.split('').map((c) => c + c).join(''));
  }
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuma(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relLuma(rgb) {
  return 0.2126 * channelLuma(rgb[0]) + 0.7152 * channelLuma(rgb[1]) + 0.0722 * channelLuma(rgb[2]);
}

function inkOn(rgb) {
  return relLuma(rgb) > 0.45 ? BRAND_RGB : [255, 255, 255];
}

function metaOn(rgb) {
  return relLuma(rgb) > 0.45 ? MUTED_RGB : [226, 232, 240];
}

const STATUS_PT = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  ready: 'Pronto para retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function statusLabel(status) {
  const key = String(status || '').trim();
  return STATUS_PT[key] || key;
}

function publicWebBase() {
  return (process.env.PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || 'https://worqera.com').replace(
    /\/+$/,
    ''
  );
}

function withItemQuery(url, itemNumber) {
  if (!url || !itemNumber) return url || '';
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}item=${itemNumber}`;
}

async function qrPngDataUrl(text) {
  return QRCode.toDataURL(String(text), {
    margin: 1,
    width: 144,
    errorCorrectionLevel: 'M',
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

function fitInBox(props, maxW, maxH) {
  const scale = Math.min(maxW / props.width, maxH / props.height);
  return { w: props.width * scale, h: props.height * scale };
}

function paintContinuation(doc, ctx) {
  doc.setFillColor(...ctx.primary);
  doc.rect(0, 0, ctx.pageWidth, 8, 'F');
  const ink = inkOn(ctx.primary);
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(String(ctx.brand || '').slice(0, 42), 16, 5.3);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${ctx.code || ''}`, ctx.pageWidth - 16, 5.3, { align: 'right' });
}

function ensureSpace(doc, y, need, pageHeight, ctx) {
  if (y + need <= pageHeight - 16) return y;
  doc.addPage();
  if (ctx) paintContinuation(doc, ctx);
  return ctx ? 16 : 18;
}

function sectionTitle(doc, title, y, pageWidth, accent) {
  doc.setFillColor(...accent);
  doc.rect(20, y - 4, 3, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_RGB);
  doc.text(title, 28, y + 2);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(28, y + 5, pageWidth - 20, y + 5);
  return y + 12;
}

function kvLine(doc, label, value, y, pageWidth) {
  if (value == null || String(value).trim() === '') return y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_RGB);
  doc.text(String(label), 25, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND_RGB);
  const split = doc.splitTextToSize(String(value), pageWidth - 85);
  doc.text(split, 70, y);
  return y + Math.max(6, split.length * 4.5);
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

  const brand = shop?.branding?.displayName || shop?.name || 'Loja';
  const primary = hexToRgb(shop?.branding?.primaryColor) || BRAND_RGB;
  const accent = hexToRgb(shop?.branding?.accentColor) || primary;
  const itemLabel = shop?.branding?.itemLabel || 'par';
  const items = effectiveItems(order);
  const pairWord = String(itemLabel).charAt(0).toUpperCase() + String(itemLabel).slice(1);
  const shopPhone = String(shop?.branding?.phone || '').trim();
  const shopAddress = String(shop?.branding?.address || '').trim();

  await ensureOrderPublicToken(order);
  const publicUrl = shop?.slug
    ? buildPublicOrderUrl(publicWebBase(), shop.slug, order.code, order.publicToken)
    : '';

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const pageCtx = { brand, code: order.code || '', primary, pageWidth };

  const logo = await loadPhotoForPdf(shop?.branding?.logoUrl);
  const headerH = 36;
  const headerInk = inkOn(primary);
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  let nameX = 16;
  if (logo) {
    try {
      const plate = 20;
      if (relLuma(primary) <= 0.45) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, 8, plate, plate, 1.6, 1.6, 'F');
      }
      const props = doc.getImageProperties(logo.dataUrl);
      const fitted = fitInBox(props, 16, 16);
      const x = 14 + (plate - fitted.w) / 2;
      const imgY = 8 + (plate - fitted.h) / 2;
      doc.addImage(logo.dataUrl, logo.formato, x, imgY, fitted.w, fitted.h);
      nameX = 40;
    } catch (_err) {
      nameX = 16;
    }
  }

  const nameMax = pageWidth - nameX - 58;
  doc.setTextColor(...headerInk);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const nameLines = doc.splitTextToSize(String(brand), Math.max(40, nameMax)).slice(0, 2);
  doc.text(nameLines, nameX, nameLines.length > 1 ? 13 : 15);
  const meta = [shopPhone, shopAddress].filter(Boolean).join('  ·  ');
  if (meta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...metaOn(primary));
    const metaLines = doc.splitTextToSize(meta, Math.max(40, nameMax)).slice(0, 2);
    doc.text(metaLines, nameX, nameLines.length > 1 ? 23 : 22);
  }
  doc.setTextColor(...headerInk);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Ordem de serviço', pageWidth - 16, 13, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`#${order.code || ''}`, pageWidth - 16, 21, { align: 'right' });

  let y = headerH + 8;
  const due = formatDate(order.dueAt);
  if (due) {
    doc.setFillColor(248, 250, 252);
    doc.rect(16, y, pageWidth - 32, 14, 'F');
    doc.setFillColor(...accent);
    doc.rect(16, y, 2.4, 14, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text('PREVISÃO DE ENTREGA', 24, y + 5.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_RGB);
    doc.text(due, 24, y + 11);
    y += 20;
  }

  y = sectionTitle(doc, 'Pedido', y, pageWidth, accent);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const created = formatDate(order.createdAt);
  if (created) y = kvLine(doc, 'Criado em', created, y, pageWidth);
  if (order.status) y = kvLine(doc, 'Status', statusLabel(order.status), y, pageWidth);
  if (sector?.name) y = kvLine(doc, 'Setor', sector.name, y, pageWidth);
  y += 4;

  y = ensureSpace(doc, y, 40, pageHeight, pageCtx);
  y = sectionTitle(doc, 'Cliente', y, pageWidth, accent);
  const clientName = client?.name || order.clientName;
  const cpf = client?.cpf;
  const phone = client?.phone || order.clientPhone;
  const email = client?.email || order.clientEmail;
  const address = formatAddress(client?.address || {});
  if (clientName) y = kvLine(doc, 'Nome', clientName, y, pageWidth);
  if (cpf) y = kvLine(doc, 'CPF', cpf, y, pageWidth);
  if (phone) y = kvLine(doc, 'Telefone', phone, y, pageWidth);
  if (email) y = kvLine(doc, 'E-mail', email, y, pageWidth);
  if (address) y = kvLine(doc, 'Endereço', address, y, pageWidth);
  y += 6;

  let grandServices = 0;
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i] || {};
    const services = Array.isArray(it.services) ? it.services : [];
    const pairTotal = services.reduce((s, x) => s + (Number(x.price) || 0), 0);
    grandServices += pairTotal;

    y = ensureSpace(doc, y, 36, pageHeight, pageCtx);
    y = sectionTitle(doc, `${pairWord} ${i + 1}`, y, pageWidth, accent);

    if (it.shoeModel) y = kvLine(doc, 'Modelo', it.shoeModel, y, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_RGB);
    doc.text('Serviços', 25, y);
    y += 5;

    if (services.length) {
      for (const s of services) {
        y = ensureSpace(doc, y, 8, pageHeight, pageCtx);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_RGB);
        const name = s.name || s.nome || 'Serviço';
        const price = formatCurrency(s.price);
        doc.text(`• ${name}`, 28, y);
        doc.text(price, pageWidth - 20, y, { align: 'right' });
        y += 5.2;
        const desc = String(s.description || s.descricao || '').trim();
        if (desc) {
          y = ensureSpace(doc, y, 8, pageHeight, pageCtx);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...MUTED_RGB);
          const descLines = doc.splitTextToSize(desc, pageWidth - 70);
          doc.text(descLines, 32, y);
          y += descLines.length * 4 + 1.5;
        }
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_RGB);
      doc.text(`Subtotal ${pairWord.toLowerCase()} ${i + 1}`, 28, y);
      doc.text(formatCurrency(pairTotal), pageWidth - 20, y, { align: 'right' });
      y += 7;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_RGB);
      doc.text('Nenhum serviço listado', 28, y);
      y += 7;
    }

    if (it.notes) {
      y = ensureSpace(doc, y, 14, pageHeight, pageCtx);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_RGB);
      doc.text('Descrição', 25, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND_RGB);
      const split = doc.splitTextToSize(String(it.notes), pageWidth - 50);
      doc.text(split, 28, y);
      y += split.length * 4.5 + 4;
    }

    const photos = photosForPair(it, order, items.length);
    if (photos.length) {
      y = ensureSpace(doc, y, 20, pageHeight, pageCtx);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_RGB);
      doc.text('Fotos', 25, y);
      y += 6;

      const thumbW = (pageWidth - 50) / 2;
      const thumbH = 48;
      let col = 0;
      for (let p = 0; p < photos.length; p += 1) {
        const loaded = await loadPhotoForPdf(photos[p]);
        if (!loaded) continue;
        try {
          if (col === 0) y = ensureSpace(doc, y, thumbH + 10, pageHeight, pageCtx);
          const props = doc.getImageProperties(loaded.dataUrl);
          const scale = Math.min(thumbW / props.width, thumbH / props.height);
          const width = props.width * scale;
          const height = props.height * scale;
          const x = 25 + col * (thumbW + 5);
          doc.addImage(loaded.dataUrl, loaded.formato, x, y, width, height);
          col += 1;
          if (col >= 2) {
            col = 0;
            y += thumbH + 6;
          }
        } catch (_err) {
          // skip
        }
      }
      if (col !== 0) y += thumbH + 6;
      y += 2;
    } else {
      y = ensureSpace(doc, y, 12, pageHeight, pageCtx);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_RGB);
      doc.text('Sem fotos neste par', 25, y);
      y += 8;
    }
  }

  y = ensureSpace(doc, y, 40, pageHeight, pageCtx);
  y = sectionTitle(doc, 'Totais', y, pageWidth, accent);
  const pricing = order.pricing || {};
  const total = pricing.total != null ? Number(pricing.total) : grandServices;
  if (pricing.deposit != null && Number(pricing.deposit) > 0) {
    y = kvLine(doc, 'Sinal', formatCurrency(pricing.deposit), y, pageWidth);
  }
  if (pricing.remaining != null && Number(pricing.remaining) > 0) {
    y = kvLine(doc, 'Restante', formatCurrency(pricing.remaining), y, pageWidth);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_RGB);
  doc.text('Total', 25, y + 2);
  doc.text(formatCurrency(total), pageWidth - 20, y + 2, { align: 'right' });
  y += 12;

  const accessories = Array.isArray(order.accessories) ? order.accessories.filter(Boolean) : [];
  if (accessories.length) {
    y = ensureSpace(doc, y, 20, pageHeight, pageCtx);
    y = sectionTitle(doc, 'Acessórios', y, pageWidth, accent);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RGB);
    for (const a of accessories) {
      const label = typeof a === 'string' ? a : a?.name || a?.nome || '';
      if (!label) continue;
      doc.text(`• ${label}`, 28, y);
      y += 5;
    }
    y += 2;
  }

  const warranty = order.warranty || {};
  if (warranty.ativa || warranty.active) {
    y = ensureSpace(doc, y, 18, pageHeight, pageCtx);
    y = sectionTitle(doc, 'Garantia', y, pageWidth, accent);
    if (warranty.duracao || warranty.duration) {
      y = kvLine(doc, 'Duração', warranty.duracao || warranty.duration, y, pageWidth);
    }
    if (warranty.data || warranty.endsAt) {
      const until = warranty.data || warranty.endsAt;
      y = kvLine(doc, 'Até', formatDate(until) || until, y, pageWidth);
    }
    if (warranty.preco != null || warranty.price != null) {
      y = kvLine(doc, 'Valor', formatCurrency(warranty.preco ?? warranty.price), y, pageWidth);
    }
  }

  if (order.notes) {
    y = ensureSpace(doc, y, 24, pageHeight, pageCtx);
    y = sectionTitle(doc, 'Observações gerais', y, pageWidth, accent);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RGB);
    const split = doc.splitTextToSize(String(order.notes), pageWidth - 50);
    doc.text(split, 25, y);
    y += split.length * 4.5 + 6;
  }

  if (publicUrl) {
    const qrEntries = [{ label: 'Pedido', hint: 'Status geral', url: publicUrl }];
    items.forEach((it, index) => {
      qrEntries.push({
        label: `${pairWord} ${index + 1}`,
        hint: String(it?.shoeModel || '').trim(),
        url: withItemQuery(publicUrl, index + 1),
      });
    });
    const qrSize = 26;
    const cellW = 42;
    const cols = Math.max(1, Math.min(4, Math.floor((pageWidth - 32) / cellW)));
    const rowH = qrSize + 16;
    y = ensureSpace(doc, y, 22, pageHeight, pageCtx);
    y = sectionTitle(doc, 'Acompanhe pelo celular', y, pageWidth, accent);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text('Escaneie o pedido ou cada par para ver o status.', 25, y);
    y += 6;

    let rowY = y;
    for (let i = 0; i < qrEntries.length; i += 1) {
      const col = i % cols;
      if (col === 0) rowY = ensureSpace(doc, i === 0 ? y : rowY + rowH, rowH, pageHeight, pageCtx);
      const x = 20 + col * cellW;
      try {
        const png = await qrPngDataUrl(qrEntries[i].url);
        doc.addImage(png, 'PNG', x, rowY, qrSize, qrSize);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...BRAND_RGB);
        doc.text(qrEntries[i].label, x + qrSize / 2, rowY + qrSize + 4.5, { align: 'center' });
        if (qrEntries[i].hint) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_RGB);
          const hint = doc.splitTextToSize(qrEntries[i].hint, cellW - 4).slice(0, 1);
          doc.text(hint, x + qrSize / 2, rowY + qrSize + 8.5, { align: 'center' });
        }
      } catch (_err) {
        // QR opcional: o laudo segue sem esse código
      }
    }
    y = rowY + rowH;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text('Emitido via Worqera', 16, pageHeight - 8);
    doc.text(`Pág. ${p}/${pageCount}`, pageWidth - 16, pageHeight - 8, { align: 'right' });
  }

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
