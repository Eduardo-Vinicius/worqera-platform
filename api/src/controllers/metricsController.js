const metricsService = require('../services/metricsService');

function buildFilters(query = {}) {
  return {
    periodo: query.periodo,
    dataInicio: query.dataInicio,
    dataFim: query.dataFim,
    limitServicos: query.limitServicos
  };
}

exports.getDistribuicaoDepartamentos = async (req, res) => {
  try {
    const data = await metricsService.getDistribuicaoDepartamentos(buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoDepartamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDistribuicaoFuncionarios = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await metricsService.getDistribuicaoFuncionarios(limit, buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoFuncionarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAtrasos = async (req, res) => {
  try {
    const data = await metricsService.getAtrasos(buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getAtrasos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getResumo = async (req, res) => {
  try {
    const data = await metricsService.getResumo(buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getResumo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFinanceiro = async (req, res) => {
  try {
    const data = await metricsService.getFinanceiro(buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getFinanceiro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDesempenhoFuncionarios = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await metricsService.getDesempenhoFuncionarios(limit, buildFilters(req.query));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDesempenhoFuncionarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOverview = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await metricsService.getOverview({
      ...buildFilters(req.query),
      limit
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getOverview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
