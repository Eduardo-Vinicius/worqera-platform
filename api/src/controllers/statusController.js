const { getAllStatusColumns, getStatusColumnsByRole } = require('../utils/orderStatus');

exports.getStatusColumns = async (req, res) => {
  try {
    // Rota aberta para autenticados: sempre retorna todas as colunas, sem filtro por departamento/cargo
    const columns = getAllStatusColumns();

    res.status(200).json({
      success: true,
      data: columns
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

  /**
   * Retorna apenas as colunas visíveis para a role do usuário
   */
exports.getStatusColumnsFiltered = async (req, res) => {
  try {
    const { role } = req.user || {};

    // Mesmo comportamento do principal: admin vê tudo, demais apenas o próprio setor
    const columns = role === 'admin'
      ? getAllStatusColumns()
      : getStatusColumnsByRole(role);

    if (!columns) {
      return res.status(403).json({
        success: false,
        error: 'Role do usuário não encontrada ou sem colunas configuradas.'
      });
    }

    res.status(200).json({
      success: true,
      data: columns
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};