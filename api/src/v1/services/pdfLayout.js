/**
 * Laudo / ordem de serviço (A4). Pure layout: receives the data already loaded
 * and returns the jsPDF document. Brand logo and colours come from the shop.
 */
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];
const SOFT = [248, 250, 252];
const WHITE = [255, 255, 255];

const M = 16;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_Y = PAGE_H - 12;
const BOTTOM = FOOTER_Y - 8;

const STATUS_PT = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  ready: 'Pronto para retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) return hexToRgb(h.split('').map((c) => c + c).join(''));
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

/** Towards white (t = 1 → white). */
function tint(rgb, t) {
  return rgb.map((c) => Math.round(c + (255 - c) * t));
}

function shade(rgb, t) {
  return rgb.map((c) => Math.round(c * (1 - t)));
}

/** Brand colour readable as text on white (light brand colours get darker). */
function readable(rgb) {
  let out = rgb;
  for (let i = 0; i < 6 && relLuma(out) > 0.3; i += 1) out = shade(out, 0.18);
  return out;
}

function inkOn(rgb) {
  return relLuma(rgb) > 0.45 ? INK : WHITE;
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n).replace(/\u00a0/g, ' ');
}

function dateBR(value, timeZone) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: timeZone || 'America/Sao_Paulo' });
}

function formatAddress(address = {}) {
  const a = address || {};
  const parts = [
    a.logradouro || a.street,
    a.numero || a.number ? `nº ${a.numero || a.number}` : '',
    a.complemento || a.complement,
    a.bairro || a.neighborhood,
    [a.cidade || a.city, a.estado || a.state].filter(Boolean).join(' - '),
    a.cep || a.zip ? `CEP ${a.cep || a.zip}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || 'W').toUpperCase();
}

function capitalize(word) {
  const w = String(word || '');
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function withItemQuery(url, n) {
  if (!url || !n) return url || '';
  return `${url}${url.includes('?') ? '&' : '?'}item=${n}`;
}

async function qrPng(text) {
  return QRCode.toDataURL(String(text), { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } });
}

function fitBox(props, maxW, maxH) {
  const scale = Math.min(maxW / props.width, maxH / props.height);
  return { w: props.width * scale, h: props.height * scale };
}

/** Per-item price as the shop sees it (services + stock product; single unpriced item takes the order total). */
function itemMoney(item, onlyItem, orderTotal) {
  const services = Array.isArray(item.services) ? item.services : [];
  const serviceSum = services.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const stock =
    item.origin === 'stock' ? (Number(item.unitPrice ?? item.snapshot?.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1) : 0;
  const sum = serviceSum + stock;
  const unpriced = services.every((s) => (Number(s.price) || 0) <= 0.009);
  const shown = sum > 0.009 ? sum : onlyItem && unpriced && orderTotal > 0.009 ? orderTotal : 0;
  return { services, stock, sum, shown };
}

async function renderOrderPdf({ order, client, shop, sector, logo, publicUrl, summaryText, photosFor, loadPhoto, now = new Date() }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const tz = shop?.timezone || 'America/Sao_Paulo';
  const brand = String(shop?.branding?.displayName || shop?.name || 'Loja').trim();
  const primary = hexToRgb(shop?.branding?.primaryColor) || [79, 15, 166];
  const accent = hexToRgb(shop?.branding?.accentColor) || primary;
  const strong = readable(primary);
  const wash = tint(primary, 0.93);
  const noun = String(shop?.branding?.itemLabel || 'peça').trim() || 'peça';
  const nounPlural = String(shop?.branding?.itemLabelPlural || `${noun}s`).trim();
  const shopPhone = String(shop?.branding?.phone || '').trim();
  const shopAddress = String(shop?.branding?.address || '').trim();
  const code = String(order.code || '');
  const items = Array.isArray(order.items) && order.items.length ? order.items : [];

  const font = (style, size, color = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const clip = (text, maxW) => {
    let t = String(text || '');
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };
  const caps = (text, x, y, color = MUTED, opts = {}) => {
    font('bold', 6.8, color);
    doc.text(String(text).toUpperCase(), x, y, { charSpace: 0.35, ...opts });
  };

  let y = 0;
  const continuation = () => {
    doc.setFillColor(...primary);
    doc.rect(0, 0, PAGE_W, 2.2, 'F');
    font('bold', 8, INK);
    doc.text(clip(brand, 110), M, 10);
    font('normal', 8, MUTED);
    doc.text(`Ordem de serviço #${code}`, PAGE_W - M, 10, { align: 'right' });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(M, 13.5, PAGE_W - M, 13.5);
    y = 20;
  };
  const need = (h) => {
    if (y + h <= BOTTOM) return;
    doc.addPage();
    continuation();
  };
  const section = (title) => {
    need(14);
    caps(title, M, y + 3, strong);
    const w = doc.getTextWidth(String(title).toUpperCase()) + String(title).length * 0.35;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(M + w + 3, y + 2.2, PAGE_W - M, y + 2.2);
    y += 8;
  };

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, PAGE_W, 3.2, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 3.2, PAGE_W, 0.8, 'F');

  const logoBox = 22;
  let textX = M;
  let drewLogo = false;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo.dataUrl);
      const fit = fitBox(props, logoBox, logoBox);
      doc.addImage(logo.dataUrl, logo.formato, M, 12 + (logoBox - fit.h) / 2, fit.w, fit.h);
      textX = M + fit.w + 6;
      drewLogo = true;
    } catch (_err) {
      drewLogo = false;
    }
  }
  if (!drewLogo) {
    doc.setFillColor(...primary);
    doc.roundedRect(M, 12, logoBox, logoBox, 4, 4, 'F');
    font('bold', 15, inkOn(primary));
    doc.text(initials(brand), M + logoBox / 2, 12 + logoBox / 2 + 2, { align: 'center' });
    textX = M + logoBox + 6;
  }
  const rightW = 62;
  const brandW = PAGE_W - M - rightW - textX - 4;
  font('bold', 15, INK);
  const brandLines = doc.splitTextToSize(brand, brandW).slice(0, 2);
  doc.text(brandLines, textX, 19);
  let metaY = 19 + brandLines.length * 6;
  font('normal', 8, MUTED);
  for (const line of [shopPhone, shopAddress].filter(Boolean)) {
    const lines = doc.splitTextToSize(line, brandW).slice(0, 2);
    doc.text(lines, textX, metaY);
    metaY += lines.length * 3.8;
  }

  caps('Ordem de serviço', PAGE_W - M, 16, MUTED, { align: 'right' });
  font('bold', 24, strong);
  doc.text(`#${code}`, PAGE_W - M, 26, { align: 'right' });
  font('normal', 8, MUTED);
  doc.text(`Emitida em ${dateBR(now, tz)}`, PAGE_W - M, 32, { align: 'right' });

  y = Math.max(40, metaY + 2);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(M, y, PAGE_W - M, y);
  y += 6;

  // ── Key facts ─────────────────────────────────────────────
  const itemCount = items.length || 1;
  const facts = [
    { label: 'Entrada', value: dateBR(order.createdAt, tz) || '—' },
    { label: 'Previsão de entrega', value: dateBR(order.dueAt, tz) || 'A combinar', strong: true },
    { label: 'Situação', value: STATUS_PT[order.status] || 'Aberto' },
    { label: capitalize(nounPlural), value: `${itemCount} ${itemCount === 1 ? noun : nounPlural}` },
  ];
  const gap = 3;
  const cellW = (CONTENT_W - gap * (facts.length - 1)) / facts.length;
  facts.forEach((f, i) => {
    const x = M + i * (cellW + gap);
    const fill = f.strong ? primary : wash;
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, cellW, 17, 2.5, 2.5, 'F');
    const on = f.strong ? inkOn(primary) : INK;
    caps(f.label, x + 4, y + 6, f.strong ? on : MUTED);
    font('bold', 11, on);
    doc.text(clip(f.value, cellW - 8), x + 4, y + 13);
  });
  y += 17 + 7;

  // ── Cliente | Atendimento ─────────────────────────────────
  const colW = (CONTENT_W - 5) / 2;
  const clientRows = [
    ['Nome', client?.name || order.clientName],
    ['Telefone', client?.phone || order.clientPhone],
    ['E-mail', client?.email || order.clientEmail],
    ['CPF', client?.cpf],
    ['Endereço', formatAddress(client?.address)],
  ].filter(([, v]) => String(v || '').trim());
  const accessories = (Array.isArray(order.accessories) ? order.accessories : [])
    .map((a) => (typeof a === 'string' ? a : a?.name || a?.nome || ''))
    .filter(Boolean);
  const warranty = order.warranty || {};
  const warrantyText = warranty.ativa || warranty.active
    ? [warranty.duracao || warranty.duration, warranty.data || warranty.endsAt ? `até ${dateBR(warranty.data || warranty.endsAt, tz) || warranty.data || warranty.endsAt}` : '']
        .filter(Boolean)
        .join(' · ') || 'Inclusa'
    : '';
  const serviceRows = [
    ['Atendido por', String(order.openedByName || '').trim().split(/\s+/)[0]],
    ['Setor atual', sector?.name],
    ['Garantia', warrantyText],
    ['Acessórios', accessories.join(', ')],
  ].filter(([, v]) => String(v || '').trim());

  const labelW = 22;
  const measure = (rows) => {
    font('normal', 9);
    return rows.reduce((h, [, v]) => h + Math.max(1, doc.splitTextToSize(String(v), colW - labelW - 8).length) * 4.2 + 2, 0);
  };
  const cardH = Math.max(measure(clientRows), measure(serviceRows), 8) + 13;
  need(cardH + 6);
  const card = (x, title, rows) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.setFillColor(...WHITE);
    doc.roundedRect(x, y, colW, cardH, 2.5, 2.5, 'FD');
    caps(title, x + 4, y + 6.5, strong);
    let ry = y + 12.5;
    rows.forEach(([label, value], index) => {
      font('normal', 7.5, MUTED);
      doc.text(label, x + 4, ry);
      font(index === 0 && title === 'Cliente' ? 'bold' : 'normal', 9, INK);
      const lines = doc.splitTextToSize(String(value), colW - labelW - 8);
      doc.text(lines, x + 4 + labelW, ry);
      ry += Math.max(1, lines.length) * 4.2 + 2;
    });
    if (!rows.length) {
      font('normal', 8.5, MUTED);
      doc.text('—', x + 4, ry);
    }
  };
  card(M, 'Cliente', clientRows);
  card(M + colW + 5, 'Atendimento', serviceRows);
  y += cardH + 7;

  // ── What will be done (team text) ────────────────────────
  if (summaryText) {
    font('normal', 9.5);
    const lines = doc.splitTextToSize(summaryText, CONTENT_W - 14);
    const h = lines.length * 4.6 + 12;
    need(h + 4);
    doc.setFillColor(...wash);
    doc.roundedRect(M, y, CONTENT_W, h, 2.5, 2.5, 'F');
    doc.setFillColor(...primary);
    doc.rect(M, y + 2, 1.4, h - 4, 'F');
    caps('O que vamos fazer', M + 6, y + 6, strong);
    font('normal', 9.5, INK);
    doc.text(lines, M + 6, y + 11.5);
    y += h + 7;
  }

  // ── Items ─────────────────────────────────────────────────
  section(`${capitalize(nounPlural)} e serviços`);
  const orderTotal = Number(order.pricing?.total) || 0;
  let itemsTotal = 0;
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i] || {};
    const priced = itemMoney(it, items.length === 1, orderTotal);
    itemsTotal += priced.shown > 0.009 ? priced.shown : priced.sum;

    need(22);
    doc.setFillColor(...wash);
    doc.roundedRect(M, y, CONTENT_W, 10, 2, 2, 'F');
    const tag = `${capitalize(noun)} ${i + 1}`;
    font('bold', 7.5, inkOn(primary));
    const tagW = doc.getTextWidth(tag) + 6;
    doc.setFillColor(...primary);
    doc.roundedRect(M + 3, y + 2.2, tagW, 5.6, 1.6, 1.6, 'F');
    doc.text(tag, M + 3 + tagW / 2, y + 6, { align: 'center' });
    const title =
      it.origin === 'stock' && it.snapshot?.name
        ? [it.snapshot.name, it.snapshot.variantName].filter(Boolean).join(' · ')
        : [it.brand, it.shoeModel].filter((s) => String(s || '').trim()).join(' ') || capitalize(noun);
    font('bold', 10, INK);
    const priceText = priced.shown > 0.009 ? money(priced.shown) : 'A definir';
    doc.text(clip(title, CONTENT_W - tagW - 40), M + tagW + 7, y + 6.6);
    doc.text(priceText, PAGE_W - M - 4, y + 6.6, { align: 'right' });
    y += 13;

    const rows = priced.services.map((s) => ({
      name: s.name || s.nome || 'Serviço',
      note: String(s.note || s.description || s.descricao || '').trim(),
      price:
        (Number(s.price) || 0) > 0.009
          ? money(s.price)
          : priced.services.length === 1 && priced.stock <= 0.009 && priced.shown > 0.009
            ? money(priced.shown)
            : 'A definir',
    }));
    if (it.origin === 'stock') {
      rows.unshift({ name: `Produto · ${Math.max(1, Number(it.quantity) || 1)} un.`, note: it.snapshot?.sku ? `SKU ${it.snapshot.sku}` : '', price: money(priced.stock) });
    }
    if (!rows.length) rows.push({ name: 'Nenhum serviço listado', note: '', price: '' });
    rows.forEach((row, index) => {
      font('normal', 7.5);
      const noteLines = row.note ? doc.splitTextToSize(row.note, CONTENT_W - 50) : [];
      const h = 6 + noteLines.length * 3.6;
      need(h + 1);
      font('normal', 9.2, INK);
      doc.text(clip(row.name, CONTENT_W - 50), M + 4, y + 3);
      font('bold', 9.2, INK);
      doc.text(row.price, PAGE_W - M - 4, y + 3, { align: 'right' });
      if (noteLines.length) {
        font('normal', 7.5, MUTED);
        doc.text(noteLines, M + 4, y + 7);
      }
      y += h;
      if (index < rows.length - 1) {
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(M + 4, y - 1.2, PAGE_W - M - 4, y - 1.2);
      }
    });

    if (it.notes) {
      font('normal', 8.5);
      const lines = doc.splitTextToSize(String(it.notes), CONTENT_W - 30);
      need(lines.length * 4 + 6);
      font('bold', 7.5, MUTED);
      doc.text('Observações', M + 4, y + 3);
      font('normal', 8.5, INK);
      doc.text(lines, M + 26, y + 3);
      y += lines.length * 4 + 4;
    }

    const photos = photosFor(it, items.length);
    if (photos.length) {
      const cols = 4;
      const pGap = 3;
      const thumbW = (CONTENT_W - pGap * (cols - 1)) / cols;
      const thumbH = thumbW * 0.75;
      y += 1;
      let col = 0;
      for (const photo of photos) {
        const loaded = await loadPhoto(photo);
        if (!loaded) continue;
        try {
          if (col === 0) need(thumbH + 4);
          const x = M + col * (thumbW + pGap);
          doc.setFillColor(...SOFT);
          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.roundedRect(x, y, thumbW, thumbH, 1.8, 1.8, 'FD');
          const fit = fitBox(doc.getImageProperties(loaded.dataUrl), thumbW - 2, thumbH - 2);
          doc.addImage(loaded.dataUrl, loaded.formato, x + (thumbW - fit.w) / 2, y + (thumbH - fit.h) / 2, fit.w, fit.h);
          col += 1;
          if (col === cols) {
            col = 0;
            y += thumbH + pGap;
          }
        } catch (_err) {
          // a broken photo does not stop the laudo
        }
      }
      if (col !== 0) y += thumbH + pGap;
    }
    y += 5;
  }

  // ── Totals + QR ───────────────────────────────────────────
  const pricing = order.pricing || {};
  const total = pricing.total != null ? Number(pricing.total) : itemsTotal;
  const storedSubtotal = pricing.subtotal != null ? Number(pricing.subtotal) : null;
  let discount = Number(pricing.discount) || 0;
  if (discount <= 0 && storedSubtotal != null && storedSubtotal > total + 0.009) discount = Math.round((storedSubtotal - total) * 100) / 100;
  const subtotal = storedSubtotal != null ? storedSubtotal : total + discount;
  const deposit = Number(pricing.deposit) || 0;
  const remaining = pricing.remaining != null && Number(pricing.remaining) > 0 ? Number(pricing.remaining) : Math.max(0, total - deposit);

  const totalRows = [];
  if (discount > 0.009) {
    totalRows.push(['Subtotal', money(subtotal)]);
    totalRows.push(['Desconto', `- ${money(discount)}`]);
  }
  const payRows = [];
  if (deposit > 0.009) payRows.push(['Sinal pago', money(deposit)]);
  if (total > 0.009) payRows.push([deposit > 0.009 ? 'A receber na retirada' : 'A pagar', money(remaining)]);
  const totW = 84;
  const totH = 8 + totalRows.length * 6 + 14 + payRows.length * 6 + 2;
  const qrH = publicUrl ? 44 : 0;
  need(Math.max(totH, qrH) + 6);
  const blockY = y;

  if (publicUrl) {
    const qrW = CONTENT_W - totW - 6;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, blockY, qrW, Math.max(totH, qrH), 2.5, 2.5, 'S');
    try {
      doc.addImage(await qrPng(publicUrl), 'PNG', M + 5, blockY + 5, 32, 32);
    } catch (_err) {
      // QR opcional
    }
    const tx = M + 42;
    caps('Acompanhe pelo celular', tx, blockY + 9, strong);
    font('normal', 8.5, INK);
    doc.text(doc.splitTextToSize('Aponte a câmera para o QR e veja em que etapa está o seu pedido, a qualquer hora.', qrW - 47), tx, blockY + 15);
    font('normal', 7, MUTED);
    doc.text(clip(publicUrl.replace(/^https?:\/\//, ''), qrW - 47), tx, blockY + 33);
  }

  const tx = PAGE_W - M - totW;
  let ty = blockY + 2;
  totalRows.forEach(([label, value]) => {
    font('normal', 9, MUTED);
    doc.text(label, tx + 4, ty + 4);
    font('normal', 9, INK);
    doc.text(value, PAGE_W - M - 4, ty + 4, { align: 'right' });
    ty += 6;
  });
  doc.setFillColor(...primary);
  doc.roundedRect(tx, ty + 1, totW, 12, 2.5, 2.5, 'F');
  font('bold', 8, inkOn(primary));
  doc.text('TOTAL', tx + 4, ty + 8.5, { charSpace: 0.35 });
  font('bold', 14, inkOn(primary));
  doc.text(total > 0.009 ? money(total) : 'A definir', PAGE_W - M - 4, ty + 9.3, { align: 'right' });
  ty += 15;
  payRows.forEach(([label, value], index) => {
    const last = index === payRows.length - 1;
    font(last ? 'bold' : 'normal', 9, last ? INK : MUTED);
    doc.text(label, tx + 4, ty + 4);
    font(last ? 'bold' : 'normal', 9, INK);
    doc.text(value, PAGE_W - M - 4, ty + 4, { align: 'right' });
    ty += 6;
  });
  y = blockY + Math.max(totH, qrH) + 6;

  if (publicUrl && items.length > 1) {
    need(34);
    caps(`QR de cada ${noun}`, M, y + 3, MUTED);
    y += 6;
    const size = 20;
    const cell = 30;
    const perRow = Math.floor(CONTENT_W / cell);
    for (let i = 0; i < items.length; i += 1) {
      const col = i % perRow;
      if (col === 0 && i > 0) {
        y += size + 9;
        need(size + 9);
      }
      const x = M + col * cell;
      try {
        doc.addImage(await qrPng(withItemQuery(publicUrl, i + 1)), 'PNG', x, y, size, size);
      } catch (_err) {
        // QR opcional
      }
      font('bold', 7.5, INK);
      doc.text(`${code}-${i + 1}`, x + size / 2, y + size + 3.5, { align: 'center' });
      font('normal', 6.5, MUTED);
      doc.text(clip(String(items[i]?.shoeModel || ''), cell - 3), x + size / 2, y + size + 6.5, { align: 'center' });
    }
    y += size + 15;
  }

  // ── Notes ─────────────────────────────────────────────────
  if (order.notes) {
    font('normal', 9);
    const lines = doc.splitTextToSize(String(order.notes), CONTENT_W - 8);
    section('Observações gerais');
    need(lines.length * 4.4 + 4);
    font('normal', 9, INK);
    doc.text(lines, M, y + 2);
    y += lines.length * 4.4 + 6;
  }

  // ── Signatures ────────────────────────────────────────────
  need(32);
  y += 8;
  const sigW = (CONTENT_W - 12) / 2;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.25);
  doc.line(M, y + 12, M + sigW, y + 12);
  doc.line(M + sigW + 12, y + 12, PAGE_W - M, y + 12);
  font('normal', 7.5, MUTED);
  doc.text('Assinatura do cliente', M, y + 16);
  doc.text(clip(`Responsável · ${brand}`, sigW), M + sigW + 12, y + 16);
  doc.text('Retirado em ____/____/________', M, y + 22);
  y += 24;

  // ── Footer on every page ──────────────────────────────────
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(M, FOOTER_Y - 4, PAGE_W - M, FOOTER_Y - 4);
    font('normal', 7, MUTED);
    doc.text(clip([brand, shopPhone].filter(Boolean).join('  ·  '), 120), M, FOOTER_Y);
    doc.text(`OS #${code}  ·  Página ${p} de ${pages}`, PAGE_W - M, FOOTER_Y, { align: 'right' });
    font('normal', 6, tint(MUTED, 0.3));
    doc.text('Gerado pela Worqera', M, FOOTER_Y + 3.5);
  }

  return doc;
}

module.exports = { renderOrderPdf, hexToRgb, readable, tint };
