const { jsPDF } = require('jspdf');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Shop = require('../models/Shop');
const Sector = require('../models/Sector');
const storageService = require('./storageService');
const { effectiveItems } = require('./orderItems');

const MAX_FOTOS_PER_PAIR = Number(process.env.PDF_MAX_EMBEDDED_FOTOS || 4);
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
  const k = String(key).toLowerCase();
  if (ct.includes('png') || k.endsWith('.png')) return 'PNG';
  if (ct.includes('jpeg') || ct.includes('jpg') || k.endsWith('.jpg') || k.endsWith('.jpeg')) return 'JPEG';
  return null;
}

async function loadPhotoForPdf(photo) {
  const key = typeof photo === 'string' ? null : photo?.key;
  try {
    if (key) {
      const { buffer, contentType } = await storageService.getBuffer(key);
      const formato = getImageFormat(contentType, key);
      if (!formato) return null;
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      return { formato, dataUrl };
    }
  } catch (_err) {
    // fall through
  }
  return null;
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ensureSpace(doc, y, need, pageHeight, margin = 20) {
  if (y + need <= pageHeight - margin) return y;
  doc.addPage();
  return margin;
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

  const brand =
    shop?.branding?.displayName ||
    shop?.name ||
    'Worqera';
  const accent = hexToRgb(shop?.branding?.primaryColor) || ACCENT_RGB;
  const itemLabel = shop?.branding?.itemLabel || 'par';
  const items = effectiveItems(order);
  const pairWord = String(itemLabel).charAt(0).toUpperCase() + String(itemLabel).slice(1);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let y = 18;

  // Header band
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(brand).slice(0, 48), 20, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Laudo / Ordem de serviço', 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`#${order.code || ''}`, pageWidth - 20, 16, { align: 'right' });

  y = 38;

  y = sectionTitle(doc, 'Pedido', y, pageWidth, accent);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const created = formatDate(order.createdAt);
  const due = formatDate(order.dueAt);
  if (created) y = kvLine(doc, 'Criado em', created, y, pageWidth);
  if (due) y = kvLine(doc, 'Previsão', due, y, pageWidth);
  if (order.status) y = kvLine(doc, 'Status', String(order.status), y, pageWidth);
  if (sector?.name) y = kvLine(doc, 'Setor', sector.name, y, pageWidth);
  y += 4;

  y = ensureSpace(doc, y, 40, pageHeight);
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

    y = ensureSpace(doc, y, 36, pageHeight);
    y = sectionTitle(doc, `${pairWord} ${i + 1}`, y, pageWidth, accent);

    if (it.shoeModel) y = kvLine(doc, 'Modelo', it.shoeModel, y, pageWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_RGB);
    doc.text('Serviços', 25, y);
    y += 5;

    if (services.length) {
      for (const s of services) {
        y = ensureSpace(doc, y, 8, pageHeight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_RGB);
        const name = s.name || s.nome || 'Serviço';
        doc.text(`• ${name}`, 28, y);
        doc.text(formatCurrency(s.price), pageWidth - 20, y, { align: 'right' });
        y += 5.5;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
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
      y = ensureSpace(doc, y, 14, pageHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_RGB);
      doc.text('Observações do par', 25, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND_RGB);
      const split = doc.splitTextToSize(String(it.notes), pageWidth - 50);
      doc.text(split, 28, y);
      y += split.length * 4.5 + 4;
    }

    let photos = Array.isArray(it.photos) ? it.photos : [];
    if (!photos.length && i === 0 && Array.isArray(order.photos)) {
      photos = order.photos;
    }
    photos = photos.slice(0, MAX_FOTOS_PER_PAIR);
    if (photos.length) {
      y = ensureSpace(doc, y, 20, pageHeight);
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
          if (col === 0) y = ensureSpace(doc, y, thumbH + 10, pageHeight);
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
    }
  }

  y = ensureSpace(doc, y, 40, pageHeight);
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
  doc.setTextColor(...accent);
  doc.text('Total', 25, y + 2);
  doc.text(formatCurrency(total), pageWidth - 20, y + 2, { align: 'right' });
  y += 12;

  const accessories = Array.isArray(order.accessories) ? order.accessories.filter(Boolean) : [];
  if (accessories.length) {
    y = ensureSpace(doc, y, 20, pageHeight);
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
    y = ensureSpace(doc, y, 18, pageHeight);
    y = sectionTitle(doc, 'Garantia', y, pageWidth, accent);
    if (warranty.duracao || warranty.duration) {
      y = kvLine(doc, 'Duração', warranty.duracao || warranty.duration, y, pageWidth);
    }
    if (warranty.data || warranty.endsAt) {
      y = kvLine(doc, 'Até', warranty.data || warranty.endsAt, y, pageWidth);
    }
    if (warranty.preco != null || warranty.price != null) {
      y = kvLine(doc, 'Valor', formatCurrency(warranty.preco ?? warranty.price), y, pageWidth);
    }
  }

  if (order.notes) {
    y = ensureSpace(doc, y, 24, pageHeight);
    y = sectionTitle(doc, 'Observações gerais', y, pageWidth, accent);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_RGB);
    const split = doc.splitTextToSize(String(order.notes), pageWidth - 50);
    doc.text(split, 25, y);
    y += split.length * 4.5 + 6;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text(
      `Gerado em ${formatDate(new Date()) || ''} · ${brand} via Worqera`,
      20,
      pageHeight - 10
    );
    doc.text(`Pág. ${p}/${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
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
