function mapService(s) {
  return {
    id: s.id || null,
    name: s.name || s.nome || '',
    price: Number(s.price != null ? s.price : s.preco) || 0,
  };
}

function normalizeItemsFromPayload(data) {
  const rawItems = Array.isArray(data.items) ? data.items : null;
  if (rawItems && rawItems.length) {
    const items = rawItems.map((it) => ({
      shoeModel: it.shoeModel || it.modeloTenis || '',
      services: (it.services || it.servicos || []).map(mapService),
      photos: it.photos || it.fotos || [],
      notes: it.notes || it.observacoes || null,
    }));
    const first = items[0];
    return {
      items,
      shoeModel: first.shoeModel,
      services: first.services,
      photos: first.photos,
    };
  }
  const services = (data.services || data.servicos || []).map(mapService);
  const shoeModel = data.shoeModel || data.modeloTenis || '';
  const photos = data.photos || data.fotos || [];
  const items =
    shoeModel || services.length || photos.length
      ? [{ shoeModel, services, photos, notes: null }]
      : [];
  return { items, shoeModel, services, photos };
}

function effectiveItems(order) {
  if (Array.isArray(order.items) && order.items.length) return order.items;
  return [
    {
      shoeModel: order.shoeModel || '',
      services: order.services || [],
      photos: order.photos || [],
      notes: null,
    },
  ];
}

function hydrateItemsIfEmpty(order) {
  if (!order.items?.length) {
    order.items = [
      {
        shoeModel: order.shoeModel,
        services: order.services,
        photos: order.photos,
        notes: null,
      },
    ];
  }
  return order.items;
}

function assertItemIndex(itemIndex, itemCount) {
  const idx = Number(itemIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= itemCount) {
    const err = new Error('Invalid item index');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }
  return idx;
}

function sumServices(items) {
  return (items || []).reduce(
    (acc, it) =>
      acc +
      (it.services || []).reduce((s, x) => s + (Number(x.price) || 0), 0),
    0
  );
}

module.exports = {
  normalizeItemsFromPayload,
  effectiveItems,
  hydrateItemsIfEmpty,
  assertItemIndex,
  sumServices,
  mapService,
};
