const { jsPDF } = require('jspdf');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Shop = require('../models/Shop');
const Sector = require('../models/Sector');
const storageService = require('./storageService');

const MAX_FOTOS_PDF = Number(process.env.PDF_MAX_EMBEDDED_FOTOS || 6);

function formatDate(dateString) {
  if (!dateString) return 'Nao informado';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Data invalida';
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
  if (address.bairro || address.neighborhood) parts.push(address.bairro || address.neighborhood);
  if (address.cidade || address.city) parts.push(address.cidade || address.city);
  if (address.estado || address.state) parts.push(address.estado || address.state);
  if (address.cep || address.zip) parts.push(`CEP: ${address.cep || address.zip}`);
  return parts.length ? parts.join(', ') : 'Nao informado';
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
    order.currentSectorId ? Sector.findById(order.currentSectorId).lean() : null,
  ]);

  const brand =
    shop?.branding?.displayName ||
    shop?.name ||
    'Worqera';

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(44, 90, 160);
  doc.text(String(brand).slice(0, 40), pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Ordem de Servico', pageWidth / 2, y, { align: 'center' });
  y += 15;
  doc.setDrawColor(44, 90, 160);
  doc.setLineWidth(1);
  doc.line(20, y, pageWidth - 20, y);
  y += 12;

  doc.setFontSize(14);
  doc.setTextColor(44, 90, 160);
  doc.text('Informacoes do Pedido', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const pedidoInfo = [
    `Codigo: ${order.code}`,
    `Data de Criacao: ${formatDate(order.createdAt)}`,
    `Data Prevista: ${formatDate(order.dueAt)}`,
    `Status: ${order.status || 'Nao informado'}`,
    `Setor: ${sector?.name || 'Nao informado'}`,
  ];
  pedidoInfo.forEach((line) => {
    doc.text(line, 25, y);
    y += 6;
  });
  y += 8;

  doc.setFontSize(14);
  doc.setTextColor(44, 90, 160);
  doc.text('Dados do Cliente', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const clienteInfo = [
    `Nome: ${client?.name || order.clientName || 'Nao informado'}`,
    `CPF: ${client?.cpf || 'Nao informado'}`,
    `Telefone: ${client?.phone || order.clientPhone || 'Nao informado'}`,
    `Email: ${client?.email || order.clientEmail || 'Nao informado'}`,
    `Endereco: ${formatAddress(client?.address || {})}`,
  ];
  clienteInfo.forEach((line) => {
    doc.text(line, 25, y);
    y += 6;
  });
  y += 8;

  doc.setFontSize(14);
  doc.setTextColor(44, 90, 160);
  doc.text('Detalhes do Servico', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Modelo: ${order.shoeModel || 'Nao informado'}`, 25, y);
  y += 8;
  doc.text('Servicos:', 25, y);
  y += 6;

  const services = Array.isArray(order.services) ? order.services : [];
  if (services.length) {
    services.forEach((s) => {
      doc.text(`- ${s.name || 'Servico'} - ${formatCurrency(s.price)}`, 30, y);
      y += 6;
    });
  } else {
    doc.text('- Nenhum servico', 30, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const total = order.pricing?.total || 0;
  doc.text(`Total: ${formatCurrency(total)}`, pageWidth - 20, y, { align: 'right' });
  y += 12;

  if (order.notes) {
    doc.setFontSize(12);
    doc.setTextColor(44, 90, 160);
    doc.text('Observacoes:', 20, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const split = doc.splitTextToSize(String(order.notes), pageWidth - 40);
    doc.text(split, 25, y);
    y += split.length * 5 + 8;
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento gerado em ${formatDate(new Date())}`, 20, pageHeight - 20);
  doc.text('Worqera', pageWidth - 20, pageHeight - 20, { align: 'right' });

  const photos = (Array.isArray(order.photos) ? order.photos : []).slice(0, MAX_FOTOS_PDF);
  if (photos.length) {
    doc.addPage();
    let fotoY = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 90, 160);
    doc.text('Fotos do Pedido', 20, fotoY);
    fotoY += 12;

    let rendered = 0;
    for (let i = 0; i < photos.length; i += 1) {
      const loaded = await loadPhotoForPdf(photos[i]);
      if (!loaded) continue;
      try {
        const props = doc.getImageProperties(loaded.dataUrl);
        const maxWidth = pageWidth - 40;
        const maxHeight = 75;
        const scale = Math.min(maxWidth / props.width, maxHeight / props.height);
        const width = props.width * scale;
        const height = props.height * scale;
        if (fotoY + height + 12 > pageHeight - 20) {
          doc.addPage();
          fotoY = 20;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Foto ${i + 1}`, 20, fotoY);
        fotoY += 4;
        const posX = (pageWidth - width) / 2;
        doc.addImage(loaded.dataUrl, loaded.formato, posX, fotoY, width, height);
        fotoY += height + 10;
        rendered += 1;
      } catch (_err) {
        // skip bad image
      }
    }
    if (rendered === 0) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Nenhuma foto disponivel para exibicao no PDF.', 20, fotoY);
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${storageService.pdfsPrefix(shopId, orderId)}pedido-${order.code}-${timestamp}.pdf`;
  const saved = await storageService.putBuffer(key, pdfBuffer, 'application/pdf');

  await Order.updateOne({ _id: orderId, shopId }, { $set: { pdfUrl: saved.url } });

  return {
    buffer: pdfBuffer,
    key: saved.key,
    url: saved.url,
    filename: `pedido-${order.code}.pdf`,
  };
}

async function listOrderPdfs(shopId, orderId) {
  const prefix = storageService.pdfsPrefix(shopId, orderId);
  return storageService.list(prefix);
}

module.exports = {
  generateOrderPdf,
  listOrderPdfs,
};
