const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function qtyOf(n) {
  const q = Math.floor(Number(n) || 0);
  return q > 0 ? q : 0;
}

function availableOf(onHand, reserved) {
  return (Number(onHand) || 0) - (Number(reserved) || 0);
}

function presentVariant(variant) {
  const onHand = Number(variant.onHand) || 0;
  const reserved = Number(variant.reserved) || 0;
  return {
    id: String(variant._id),
    name: variant.name || '',
    sku: variant.sku || '',
    price: variant.price == null ? null : money(variant.price),
    onHand,
    reserved,
    available: availableOf(onHand, reserved),
  };
}

function presentProduct(doc) {
  const variants = (doc.variants || []).map(presentVariant);
  const trackedOnVariants = variants.length > 0;
  const onHand = trackedOnVariants
    ? variants.reduce((sum, row) => sum + row.onHand, 0)
    : Number(doc.onHand) || 0;
  const reserved = trackedOnVariants
    ? variants.reduce((sum, row) => sum + row.reserved, 0)
    : Number(doc.reserved) || 0;
  return {
    id: String(doc._id),
    name: doc.name || '',
    sku: doc.sku || '',
    description: doc.description || '',
    price: money(doc.price),
    trackStock: doc.trackStock !== false,
    minQty: Number(doc.minQty) || 0,
    active: doc.active !== false,
    onHand,
    reserved,
    available: availableOf(onHand, reserved),
    low: doc.trackStock !== false && availableOf(onHand, reserved) <= (Number(doc.minQty) || 0),
    variants,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function cleanVariants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      name: String(row?.name || '').trim(),
      sku: String(row?.sku || '').trim(),
      price: row?.price == null || row.price === '' ? null : money(row.price),
      onHand: Math.max(0, Math.floor(Number(row?.onHand) || 0)),
      reserved: 0,
    }))
    .filter((row) => row.name);
}

function fail(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code || (status === 409 ? 'CONFLICT' : 'VALIDATION_ERROR');
  return err;
}

async function listProducts(shopId) {
  const rows = await Product.find({ shopId }).sort({ name: 1 }).lean();
  return rows.map(presentProduct);
}

async function getProduct(shopId, id) {
  const doc = await Product.findOne({ _id: id, shopId }).lean();
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  return presentProduct(doc);
}

async function createProduct(shopId, body) {
  const name = String(body.name || '').trim();
  if (!name) throw fail(400, 'Nome do produto é obrigatório');
  const variants = cleanVariants(body.variants);
  const doc = await Product.create({
    shopId,
    name,
    sku: String(body.sku || '').trim(),
    description: String(body.description || '').trim(),
    price: money(body.price),
    trackStock: body.trackStock !== false,
    minQty: Math.max(0, Math.floor(Number(body.minQty) || 0)),
    active: body.active !== false,
    onHand: variants.length ? 0 : Math.max(0, Math.floor(Number(body.onHand) || 0)),
    reserved: 0,
    variants,
  });
  if ((doc.onHand || 0) > 0 || variants.some((row) => row.onHand > 0)) {
    await StockMovement.create({
      shopId,
      productId: doc._id,
      productName: doc.name,
      type: 'adjust',
      quantity: variants.length
        ? variants.reduce((sum, row) => sum + row.onHand, 0)
        : doc.onHand,
      reason: 'Saldo inicial',
    });
  }
  return presentProduct(doc.toObject());
}

async function patchProduct(shopId, id, body) {
  const doc = await Product.findOne({ _id: id, shopId });
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) throw fail(400, 'Nome do produto é obrigatório');
    doc.name = name;
  }
  if (body.sku != null) doc.sku = String(body.sku).trim();
  if (body.description != null) doc.description = String(body.description).trim();
  if (body.price != null) doc.price = money(body.price);
  if (body.trackStock != null) doc.trackStock = Boolean(body.trackStock);
  if (body.minQty != null) doc.minQty = Math.max(0, Math.floor(Number(body.minQty) || 0));
  if (body.active != null) doc.active = Boolean(body.active);
  if (Array.isArray(body.variants)) {
    const reserved = (doc.variants || []).some((row) => (row.reserved || 0) > 0) || (doc.reserved || 0) > 0;
    if (reserved) throw fail(409, 'Ainda tem pedido reservando este produto', 'IN_USE');
    doc.variants = cleanVariants(body.variants);
    doc.onHand = 0;
    doc.reserved = 0;
    doc.markModified('variants');
  }
  await doc.save();
  return presentProduct(doc.toObject());
}

async function deleteProduct(shopId, id) {
  const doc = await Product.findOne({ _id: id, shopId });
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  const reserved =
    (doc.reserved || 0) > 0 || (doc.variants || []).some((row) => (row.reserved || 0) > 0);
  if (reserved) throw fail(409, 'Ainda tem pedido em aberto com este produto', 'IN_USE');
  await doc.deleteOne();
  return { ok: true };
}

async function logMove(entry) {
  await StockMovement.create(entry);
}

async function adjustProduct(shopId, id, body, userId) {
  const delta = Math.trunc(Number(body.quantity));
  if (!Number.isFinite(delta) || delta === 0) throw fail(400, 'Informe a quantidade do ajuste');
  const reason = String(body.reason || '').trim();
  if (!reason) throw fail(400, 'Motivo do ajuste é obrigatório');
  const variantId = body.variantId ? String(body.variantId) : '';
  const doc = await Product.findOne({ _id: id, shopId });
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  if (variantId) {
    const variant = (doc.variants || []).find((row) => String(row._id) === variantId);
    if (!variant) throw fail(404, 'Variação não encontrada', 'NOT_FOUND');
    const next = (Number(variant.onHand) || 0) + delta;
    if (next < (Number(variant.reserved) || 0)) {
      throw fail(409, 'O ajuste deixaria o saldo menor que o reservado', 'INSUFFICIENT');
    }
    variant.onHand = next;
    doc.markModified('variants');
    await doc.save();
    await logMove({
      shopId,
      productId: doc._id,
      variantId: variant._id,
      productName: doc.name,
      variantName: variant.name,
      type: 'adjust',
      quantity: delta,
      reason,
      userId: userId || null,
    });
  } else {
    if ((doc.variants || []).length) throw fail(400, 'Ajuste a variação, não o produto pai');
    const next = (Number(doc.onHand) || 0) + delta;
    if (next < (Number(doc.reserved) || 0)) {
      throw fail(409, 'O ajuste deixaria o saldo menor que o reservado', 'INSUFFICIENT');
    }
    doc.onHand = next;
    await doc.save();
    await logMove({
      shopId,
      productId: doc._id,
      productName: doc.name,
      type: 'adjust',
      quantity: delta,
      reason,
      userId: userId || null,
    });
  }
  return presentProduct(doc.toObject());
}

async function listMovements(shopId, productId, limit = 40) {
  const filter = { shopId };
  if (productId) filter.productId = productId;
  const rows = await StockMovement.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(80, Math.max(1, Number(limit) || 40)))
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    productId: String(row.productId),
    variantId: row.variantId ? String(row.variantId) : null,
    productName: row.productName || '',
    variantName: row.variantName || '',
    type: row.type,
    quantity: row.quantity,
    reason: row.reason || '',
    orderId: row.orderId ? String(row.orderId) : null,
    orderCode: row.orderCode || '',
    createdAt: row.createdAt,
  }));
}

function bucket(doc, variantId) {
  if (!variantId) {
    return {
      onHand: Number(doc.onHand) || 0,
      reserved: Number(doc.reserved) || 0,
      set(onHand, reserved) {
        doc.onHand = onHand;
        doc.reserved = reserved;
      },
    };
  }
  const variant = (doc.variants || []).find((row) => String(row._id) === String(variantId));
  if (!variant) return null;
  return {
    onHand: Number(variant.onHand) || 0,
    reserved: Number(variant.reserved) || 0,
    set(onHand, reserved) {
      variant.onHand = onHand;
      variant.reserved = reserved;
      doc.markModified('variants');
    },
  };
}

async function mutateBucket(shopId, productId, variantId, apply, meta) {
  const doc = await Product.findOne({ _id: productId, shopId });
  if (!doc) throw fail(404, 'Produto não encontrado', 'NOT_FOUND');
  const slot = bucket(doc, variantId);
  if (!slot) throw fail(404, 'Variação não encontrada', 'NOT_FOUND');
  const next = apply(slot.onHand, slot.reserved);
  if (next.onHand < 0 || next.reserved < 0) {
    throw fail(409, `${doc.name}: saldo insuficiente`, 'INSUFFICIENT');
  }
  if (next.reserved > next.onHand && meta.type !== 'release') {
    const available = availableOf(slot.onHand, slot.reserved);
    throw fail(409, `${doc.name}: só tem ${Math.max(0, available)} disponível`, 'INSUFFICIENT');
  }
  slot.set(next.onHand, next.reserved);
  await doc.save();
  const variant = variantId
    ? (doc.variants || []).find((row) => String(row._id) === String(variantId))
    : null;
  await logMove({
    shopId,
    productId: doc._id,
    variantId: variant ? variant._id : null,
    productName: doc.name,
    variantName: variant?.name || '',
    type: meta.type,
    quantity: meta.quantity,
    reason: meta.reason || '',
    orderId: meta.orderId || null,
    orderCode: meta.orderCode || '',
    userId: meta.userId || null,
  });
}

function stockItems(order) {
  return (order.items || []).filter((item) => item && item.origin === 'stock' && item.productId);
}

async function prepareStockItems(shopId, items, allowStock) {
  const list = items || [];
  for (const item of list) {
    if (!allowStock || item.origin !== 'stock') {
      item.origin = 'brought';
      item.productId = undefined;
      item.variantId = undefined;
      item.quantity = 1;
      item.unitPrice = undefined;
      item.snapshot = undefined;
      item.stockState = undefined;
      continue;
    }
    const product = await Product.findOne({ _id: item.productId, shopId, active: true });
    if (!product) throw fail(400, 'Produto da loja não encontrado ou inativo');
    const quantity = Math.max(1, qtyOf(item.quantity) || 1);
    let variant = null;
    if ((product.variants || []).length) {
      variant = (product.variants || []).find((row) => String(row._id) === String(item.variantId));
      if (!variant) throw fail(400, `${product.name}: escolha a variação`);
    }
    const unit =
      item.unitPrice != null && item.unitPrice !== ''
        ? money(item.unitPrice)
        : variant && variant.price != null
          ? money(variant.price)
          : money(product.price);
    if (product.trackStock !== false) {
      const onHand = variant ? variant.onHand : product.onHand;
      const reserved = variant ? variant.reserved : product.reserved;
      const available = availableOf(onHand, reserved);
      if (quantity > available) {
        throw fail(409, `${product.name}${variant ? ` ${variant.name}` : ''}: só tem ${Math.max(0, available)} disponível`, 'INSUFFICIENT');
      }
    }
    item.origin = 'stock';
    item.productId = product._id;
    item.variantId = variant ? variant._id : undefined;
    item.quantity = quantity;
    item.unitPrice = unit;
    item.snapshot = {
      name: product.name,
      variantName: variant?.name || '',
      sku: variant?.sku || product.sku || '',
      unitPrice: unit,
    };
    item.stockState = product.trackStock === false ? 'open' : undefined;
    const label = [product.name, variant?.name, quantity > 1 ? `${quantity} un` : '']
      .filter(Boolean)
      .join(' · ');
    item.shoeModel = label;
  }
  return list;
}

async function reserveOrder(shopId, order, userId) {
  for (const item of stockItems(order)) {
    if (item.stockState === 'reserved' || item.stockState === 'committed' || item.stockState === 'open') continue;
    const product = await Product.findOne({ _id: item.productId, shopId }).lean();
    if (!product || product.trackStock === false) {
      item.stockState = 'open';
      continue;
    }
    const quantity = Math.max(1, qtyOf(item.quantity) || 1);
    await mutateBucket(
      shopId,
      item.productId,
      item.variantId,
      (onHand, reserved) => {
        if (quantity > availableOf(onHand, reserved)) {
          throw fail(409, `${product.name}: só tem ${Math.max(0, availableOf(onHand, reserved))} disponível`, 'INSUFFICIENT');
        }
        return { onHand, reserved: reserved + quantity };
      },
      {
        type: 'reserve',
        quantity,
        reason: 'Pedido aberto',
        orderId: order._id,
        orderCode: order.code,
        userId,
      }
    );
    item.stockState = 'reserved';
  }
}

async function releaseBucket(shopId, order, item, userId, reason) {
  const quantity = Math.max(1, qtyOf(item.quantity) || 1);
  await mutateBucket(
    shopId,
    item.productId,
    item.variantId,
    (onHand, reserved) => ({ onHand, reserved: Math.max(0, reserved - quantity) }),
    {
      type: 'release',
      quantity: -quantity,
      reason: reason || 'Reserva cancelada',
      orderId: order._id,
      orderCode: order.code,
      userId,
    }
  );
}

async function releaseOrder(shopId, order, userId) {
  for (const item of stockItems(order)) {
    if (item.stockState !== 'reserved') continue;
    await releaseBucket(shopId, order, item, userId, 'Reserva cancelada');
    item.stockState = undefined;
  }
}

async function syncItemStock(shopId, order, item, body, userId) {
  if (item.stockState === 'committed') {
    throw fail(409, 'Este item já saiu na entrega. Reabra o pedido para mudar o estoque.');
  }
  const previous = {
    origin: item.origin,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    snapshot: item.snapshot ? { ...item.snapshot } : undefined,
    stockState: item.stockState,
    shoeModel: item.shoeModel,
  };
  const held = previous.origin === 'stock' && previous.productId && previous.stockState === 'reserved';
  if (held) await releaseBucket(shopId, order, previous, userId, 'Troca no pedido');
  try {
    if (body.origin !== 'stock') {
      item.origin = 'brought';
      item.productId = undefined;
      item.variantId = undefined;
      item.quantity = 1;
      item.unitPrice = undefined;
      item.snapshot = undefined;
      item.stockState = undefined;
      return;
    }
    const draft = {
      shoeModel: body.shoeModel || item.shoeModel || '',
      origin: 'stock',
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
    };
    await prepareStockItems(shopId, [draft], true);
    item.origin = 'stock';
    item.productId = draft.productId;
    item.variantId = draft.variantId || undefined;
    item.quantity = draft.quantity;
    item.unitPrice = draft.unitPrice;
    item.snapshot = draft.snapshot;
    item.stockState = draft.stockState;
    if (draft.shoeModel) item.shoeModel = draft.shoeModel;
    await reserveOrder(shopId, { _id: order._id, code: order.code, items: [item] }, userId);
  } catch (err) {
    if (held) {
      const restore = {
        origin: 'stock',
        productId: previous.productId,
        variantId: previous.variantId,
        quantity: previous.quantity,
        snapshot: previous.snapshot,
        stockState: undefined,
      };
      try {
        await reserveOrder(shopId, { _id: order._id, code: order.code, items: [restore] }, userId);
      } catch (_) {
        /* the thrown error is the one the caller must see */
      }
    }
    throw err;
  }
}

async function commitOrder(shopId, order, userId) {
  for (const item of stockItems(order)) {
    if (item.stockState === 'committed' || item.stockState === 'open') continue;
    if (item.stockState !== 'reserved') continue;
    const quantity = Math.max(1, qtyOf(item.quantity) || 1);
    await mutateBucket(
      shopId,
      item.productId,
      item.variantId,
      (onHand, reserved) => ({
        onHand: onHand - quantity,
        reserved: Math.max(0, reserved - quantity),
      }),
      {
        type: 'commit',
        quantity: -quantity,
        reason: 'Pedido entregue',
        orderId: order._id,
        orderCode: order.code,
        userId,
      }
    );
    item.stockState = 'committed';
  }
}

async function reopenStock(shopId, order, userId) {
  for (const item of stockItems(order)) {
    if (item.stockState !== 'committed') continue;
    const quantity = Math.max(1, qtyOf(item.quantity) || 1);
    await mutateBucket(
      shopId,
      item.productId,
      item.variantId,
      (onHand, reserved) => ({ onHand: onHand + quantity, reserved: reserved + quantity }),
      {
        type: 'reopen',
        quantity,
        reason: 'Pedido reaberto',
        orderId: order._id,
        orderCode: order.code,
        userId,
      }
    );
    item.stockState = 'reserved';
  }
}

function stockValue(items) {
  return (items || []).reduce((sum, item) => {
    if (item.origin !== 'stock') return sum;
    const unit = Number(item.unitPrice ?? item.snapshot?.unitPrice) || 0;
    const quantity = Math.max(1, qtyOf(item.quantity) || 1);
    return sum + money(unit * quantity);
  }, 0);
}

async function financeSnapshot(shopId) {
  const [products, movements] = await Promise.all([
    Product.find({ shopId }).lean(),
    StockMovement.find({ shopId }).sort({ createdAt: -1 }).limit(12).lean(),
  ]);
  const Order = require('../models/Order');
  const orders = await Order.find({
    shopId,
    deletedAt: null,
    'items.origin': 'stock',
  })
    .select('code status pricing items createdAt deliveredAt')
    .lean();
  let sold = 0;
  let soldQty = 0;
  let openReserved = 0;
  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.origin !== 'stock') continue;
      const line = money((Number(item.unitPrice ?? item.snapshot?.unitPrice) || 0) * (qtyOf(item.quantity) || 1));
      if (order.status === 'delivered') {
        sold += line;
        soldQty += qtyOf(item.quantity) || 1;
      } else if (order.status !== 'cancelled') {
        openReserved += line;
      }
    }
  }
  const catalog = products.map(presentProduct);
  const stockValueTotal = catalog
    .filter((row) => row.trackStock)
    .reduce((sum, row) => sum + money(row.price * row.onHand), 0);
  return {
    productCount: catalog.length,
    stockValue: money(stockValueTotal),
    availableUnits: catalog.reduce((sum, row) => sum + (row.trackStock ? row.available : 0), 0),
    salesTotal: money(sold),
    salesUnits: soldQty,
    reservedValue: money(openReserved),
    low: catalog.filter((row) => row.low && row.active).map((row) => ({
      id: row.id,
      name: row.name,
      available: row.available,
    })),
    movements: movements.map((row) => ({
      id: String(row._id),
      productName: row.productName || '',
      variantName: row.variantName || '',
      type: row.type,
      quantity: row.quantity,
      reason: row.reason || '',
      orderCode: row.orderCode || '',
      createdAt: row.createdAt,
    })),
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const MOVE_LABEL = {
  adjust: 'Ajuste',
  reserve: 'Reserva',
  release: 'Devolução',
  commit: 'Saída',
  reopen: 'Reabertura',
};

async function reportCsv(shopId) {
  const products = await listProducts(shopId);
  const movements = await StockMovement.find({ shopId }).sort({ createdAt: -1 }).limit(2000).lean();
  const Order = require('../models/Order');
  const orders = await Order.find({ shopId, deletedAt: null, 'items.origin': 'stock' })
    .select('code status items createdAt deliveredAt')
    .sort({ createdAt: -1 })
    .lean();
  const lines = ['Estoque'];
  lines.push(['Produto', 'Variação', 'Código', 'Preço', 'Em mãos', 'Reservado', 'Disponível'].join(';'));
  for (const product of products) {
    const variants = product.variants || [];
    if (variants.length) {
      for (const variant of variants) {
        lines.push([
          product.name,
          variant.name,
          variant.sku || product.sku || '',
          variant.price == null ? product.price : variant.price,
          variant.onHand,
          variant.reserved,
          variant.available,
        ].map(csvCell).join(';'));
      }
    } else {
      lines.push([
        product.name,
        '',
        product.sku || '',
        product.price,
        product.onHand,
        product.reserved,
        product.available,
      ].map(csvCell).join(';'));
    }
  }
  lines.push('');
  lines.push('Saídas');
  lines.push(['Data', 'Produto', 'Variação', 'Tipo', 'Quantidade', 'Pedido', 'Motivo'].join(';'));
  for (const row of movements) {
    lines.push([
      csvDate(row.createdAt),
      row.productName || '',
      row.variantName || '',
      MOVE_LABEL[row.type] || row.type,
      row.quantity,
      row.orderCode || '',
      row.reason || '',
    ].map(csvCell).join(';'));
  }
  lines.push('');
  lines.push('Vendas');
  lines.push(['Data', 'Pedido', 'Produto', 'Quantidade', 'Valor', 'Situação'].join(';'));
  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.origin !== 'stock') continue;
      const quantity = qtyOf(item.quantity) || 1;
      const unit = Number(item.unitPrice ?? item.snapshot?.unitPrice) || 0;
      const name = item.snapshot?.name || item.shoeModel || '';
      const situation = order.status === 'delivered'
        ? 'Entregue'
        : order.status === 'cancelled'
          ? 'Cancelado'
          : 'Em aberto';
      lines.push([
        csvDate(order.deliveredAt || order.createdAt),
        order.code || '',
        name,
        quantity,
        money(unit * quantity),
        situation,
      ].map(csvCell).join(';'));
    }
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  patchProduct,
  deleteProduct,
  adjustProduct,
  listMovements,
  prepareStockItems,
  reserveOrder,
  releaseOrder,
  syncItemStock,
  commitOrder,
  reopenStock,
  stockValue,
  financeSnapshot,
  presentProduct,
  reportCsv,
};
