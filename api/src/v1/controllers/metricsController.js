const metricsService = require('../services/metricsService');
const { wrap } = require('./helpers');

function buildFilters(query = {}) {
  return {
    period: query.period || query.periodo,
    startDate: query.startDate || query.dataInicio,
    endDate: query.endDate || query.dataFim,
    servicesLimit: query.servicesLimit || query.limitServicos,
    limit: query.limit,
    // legacy aliases still accepted once
    periodo: query.periodo || query.period,
    dataInicio: query.dataInicio || query.startDate,
    dataFim: query.dataFim || query.endDate,
    limitServicos: query.limitServicos || query.servicesLimit,
  };
}

exports.departments = wrap(async (req, res) => {
  const data = await metricsService.getDepartmentDistribution(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.employees = wrap(async (req, res) => {
  const data = await metricsService.getEmployeeDistribution(
    req.shopId,
    req.query.limit,
    buildFilters(req.query)
  );
  res.status(200).json({ success: true, data });
});

exports.delays = wrap(async (req, res) => {
  const data = await metricsService.getDelays(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.summary = wrap(async (req, res) => {
  const data = await metricsService.getSummary(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.finance = wrap(async (req, res) => {
  const data = await metricsService.getFinance(req.shopId, buildFilters(req.query));
  res.status(200).json({ success: true, data });
});

exports.employeePerformance = wrap(async (req, res) => {
  const data = await metricsService.getEmployeePerformance(
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
