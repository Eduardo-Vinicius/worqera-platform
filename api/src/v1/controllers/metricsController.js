const metricsService = require('../services/metricsService');
const { wrap } = require('./helpers');

function buildFilters(query = {}) {
  return {
    periodo: query.periodo,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    limitServicos: query.limitServicos,
    limit: query.limit,
  };
}

exports.departamentos = wrap(async (req, res) => {
  const data = await metricsService.getDistribuicaoDepartamentos(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.funcionarios = wrap(async (req, res) => {
  const data = await metricsService.getDistribuicaoFuncionarios(
    req.shopId,
    req.query.limit,
    buildFilters(req.query)
  );
  res.status(200).json({ success: true, data });
});

exports.atrasos = wrap(async (req, res) => {
  const data = await metricsService.getAtrasos(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.resumo = wrap(async (req, res) => {
  const data = await metricsService.getResumo(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.financeiro = wrap(async (req, res) => {
  const data = await metricsService.getFinanceiro(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.desempenho = wrap(async (req, res) => {
  const data = await metricsService.getDesempenhoFuncionarios(
    req.shopId,
    req.query.limit,
    buildFilters(req.query)
  );
  res.status(200).json({ success: true, data });
});

exports.overview = wrap(async (req, res) => {
  const data = await metricsService.getOverview(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});
