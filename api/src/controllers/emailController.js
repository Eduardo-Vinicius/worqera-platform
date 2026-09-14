const emailLogModel = require('../models/emailLogModel');

/**
 * GET /emails/logs - Buscar logs de email com filtros
 * Query params:
 *   - email: filtrar por email do cliente
 *   - pedidoId: filtrar por ID do pedido
 *   - codigoPedido: filtrar por código do pedido
 *   - status: filtrar por status (sucesso, erro, falha_config)
 *   - tipo: filtrar por tipo (novo_pedido, status_update, finalizacao, outras)
 *   - dataInicio: filtrar por data início (ISO format)
 *   - dataFim: filtrar por data fim (ISO format)
 *   - limit: número de resultados (padrão 50, máximo 100)
 *   - lastKey: cursor para paginação
 */
exports.buscarLogsEmail = async (req, res) => {
  try {
    const {
      email,
      pedidoId,
      codigoPedido,
      status,
      tipo,
      dataInicio,
      dataFim,
      limit,
      lastKey
    } = req.query;

    // Decodificar lastKey se fornecido (base64)
    let exclusiveStartKey = null;
    if (lastKey) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(String(lastKey), 'base64').toString('utf8'));
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'lastKey inválido'
        });
      }
    }

    const resultado = await emailLogModel.buscarLogsEmail({
      emailCliente: email,
      pedidoId,
      codigoPedido,
      status,
      tipo,
      dataInicio,
      dataFim,
      limit: Number(limit) || 50,
      exclusiveStartKey
    });

    // Codificar lastKey em base64 para paginação
    const encodedLastKey = resultado.lastKey 
      ? Buffer.from(JSON.stringify(resultado.lastKey)).toString('base64')
      : null;

    res.status(200).json({
      success: true,
      data: resultado.items,
      pagination: {
        count: resultado.count,
        scannedCount: resultado.scannedCount,
        lastKey: encodedLastKey
      }
    });
  } catch (error) {
    console.error('[EmailController] Erro ao buscar logs de email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /emails/logs/ultimos/:emailCliente - Últimos emails de um cliente
 * Path params:
 *   - emailCliente: email do cliente
 * Query params:
 *   - limit: número de resultados (padrão 10, máximo 50)
 */
exports.obterUltimosEmails = async (req, res) => {
  try {
    const { emailCliente } = req.params;
    const { limit } = req.query;

    if (!emailCliente || !emailCliente.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Email do cliente inválido'
      });
    }

    const logs = await emailLogModel.obterUltimosEmailsCliente(
      emailCliente,
      Number(limit) || 10
    );

    res.status(200).json({
      success: true,
      email: emailCliente,
      total: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('[EmailController] Erro ao buscar últimos emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /emails/logs/pedido/:pedidoId - Emails relacionados a um pedido
 * Path params:
 *   - pedidoId: ID do pedido
 */
exports.obterEmailsPorPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;

    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        error: 'ID do pedido é obrigatório'
      });
    }

    const resultado = await emailLogModel.buscarLogsEmail({
      pedidoId,
      limit: 100
    });

    res.status(200).json({
      success: true,
      pedidoId,
      total: resultado.items.length,
      data: resultado.items
    });
  } catch (error) {
    console.error('[EmailController] Erro ao buscar emails do pedido:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /emails/estatisticas - Estatísticas gerais de emails
 * Query params:
 *   - dataInicio: data início (ISO format)
 *   - dataFim: data fim (ISO format)
 */
exports.obterEstatisticas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const stats = await emailLogModel.obterEstatisticasEmails({
      dataInicio,
      dataFim
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[EmailController] Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /emails/logs/resumo - Resumo rápido dos últimos emails
 */
exports.obterResumoEmails = async (req, res) => {
  try {
    const stats = await emailLogModel.obterEstatisticasEmails();
    const recentResult = await emailLogModel.buscarLogsEmail({
      limit: 20
    });

    // Calcular estatísticas dos últimos 20
    const recent = recentResult.items || [];
    const recentStats = {
      total: recent.length,
      sucesso: recent.filter(i => i.status === 'sucesso').length,
      erro: recent.filter(i => i.status === 'erro').length,
      taxaSucesso: recent.length > 0 
        ? ((recent.filter(i => i.status === 'sucesso').length / recent.length) * 100).toFixed(2)
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        geral: stats,
        ultimosEmails: recentStats,
        emails: recent
      }
    });
  } catch (error) {
    console.error('[EmailController] Erro ao obter resumo de emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
