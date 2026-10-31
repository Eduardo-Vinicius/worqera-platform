// Números da landing (somatório de todas as lojas, sem expor nenhuma). Só lê.
// No servidor: docker exec -i worqera-mongodb mongosh worqera --quiet < api/scripts/site-numbers.mongo.js
// Cada comando fica numa linha só: lido por arquivo, o mongosh quebra encadeamentos que começam com "." na linha de baixo.
const live = { deletedAt: null, clientName: { $ne: 'Cliente demonstração' } };
const one = (c, p, d) => db[c].aggregate(p).toArray()[0] || d;
const money = one('orders', [{ $match: { ...live, status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$pricing.total', 0] } }, paid: { $sum: { $ifNull: ['$pricing.deposit', 0] } } } }], { total: 0, paid: 0 });
const onTime = one('orders', [{ $match: { ...live, status: 'delivered', dueAt: { $ne: null }, deliveredAt: { $ne: null } } }, { $group: { _id: null, n: { $sum: 1 }, ok: { $sum: { $cond: [{ $lte: ['$deliveredAt', { $add: ['$dueAt', 86400000] }] }, 1, 0] } } } }], { n: 0, ok: 0 });
const fb = one('orders', [{ $match: { ...live, 'feedback.score': { $gte: 1 } } }, { $group: { _id: null, n: { $sum: 1 }, avg: { $avg: '$feedback.score' } } }], { n: 0, avg: null });
const won = one('quotes', [{ $match: { stage: 'won' } }, { $group: { _id: null, n: { $sum: 1 }, v: { $sum: { $ifNull: ['$recovery.value', { $ifNull: ['$value', 0] }] } } } }], { n: 0, v: 0 });
printjson({
  lojas: db.shops.countDocuments({}),
  clientes: db.clients.countDocuments({}),
  pedidos: db.orders.countDocuments(live),
  valorPedidosBRL: Math.round(money.total),
  jaRecebidoBRL: Math.round(money.paid),
  entregues: db.orders.countDocuments({ ...live, status: 'delivered' }),
  noPrazoPct: onTime.n ? Math.round(onTime.ok / onTime.n * 100) : null,
  noPrazoBase: onTime.n,
  notaMedia: fb.avg ? Math.round(fb.avg * 10) / 10 : null,
  avaliacoes: fb.n,
  orcamentosRecuperados: won.n,
  orcamentosRecuperadosBRL: Math.round(won.v),
  emailsPorTipo: db.platformmaillogs.aggregate([{ $match: { ok: true } }, { $group: { _id: '$kind', n: { $sum: 1 } } }, { $sort: { n: -1 } }]).toArray(),
  whatsappEnviados: db.whatsappmessages.countDocuments({ direction: 'out' }),
});
