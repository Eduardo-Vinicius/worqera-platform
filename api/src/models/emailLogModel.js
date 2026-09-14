const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_EMAIL_LOG_TABLE || 'shoeRepairEmailLogs';

/**
 * Schema do documento de log de email:
 * {
 *   "id": "uuid",                    // Chave primária
 *   "timestamp": "ISO string",       // Quando foi enviado
 *   "pedidoId": "uuid",              // ID do pedido relacionado
 *   "codigoPedido": "string",        // Código do pedido (ex: 310326-001)
 *   "emailCliente": "string",        // Email do destinatário
 *   "nomeCliente": "string",         // Nome do cliente
 *   "assunto": "string",             // Subject do email
 *   "tipo": "enum",                  // "novo_pedido" | "status_update" | "finalizacao" | "outras"
 *   "status": "enum",                // "sucesso" | "erro" | "falha_config"
 *   "mensagem": "string",            // Mensagem de sucesso ou erro
 *   "errorCode": "string",           // Código do erro (se houver)
 *   "duracaoMs": "number",           // Quanto tempo levou (ms)
 *   "temPdf": "boolean",             // Se tinha PDF anexado
 *   "tamanhoPdf": "number",          // Tamanho do PDF em bytes
 *   "messageId": "string",           // ID da mensagem (se sucesso)
 *   "tentativas": "number",          // Número de tentativas
 *   "usuarioId": "string",           // Quem causou o disparo do email
 *   "gsi1pk": "string",              // GSI para buscar por email (gsi1pk = emailCliente)
 *   "gsi1sk": "string"               // GSI para ordenar por timestamp (gsi1sk = timestamp)
 * }
 */

/**
 * Log de envio de email para auditoria
 */
async function criarLogEmail(dados) {
  const { v4: uuidv4 } = require('uuid');

  const logEmail = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    pedidoId: dados.pedidoId || null,
    codigoPedido: dados.codigoPedido || null,
    emailCliente: String(dados.emailCliente || '').toLowerCase(),
    nomeCliente: dados.nomeCliente || 'Desconhecido',
    assunto: dados.assunto || 'Sem assunto',
    tipo: dados.tipo || 'outras', // novo_pedido, status_update, finalizacao
    status: dados.status || 'pendente', // sucesso, erro, falha_config
    mensagem: dados.mensagem || 'Sem mensagem',
    errorCode: dados.errorCode || null,
    duracaoMs: dados.duracaoMs || 0,
    temPdf: dados.temPdf || false,
    tamanhoPdf: dados.tamanhoPdf || 0,
    messageId: dados.messageId || null,
    tentativas: 1,
    usuarioId: dados.usuarioId || 'sistema',
    // GSI para queries eficientes
    gsi1pk: `EMAIL#${String(dados.emailCliente || '').toLowerCase()}`,
    gsi1sk: new Date().toISOString(),
    gsi2pk: `PEDIDO#${dados.pedidoId || 'N/A'}`,
    gsi2sk: new Date().toISOString(),
    gsi3pk: `STATUS#${dados.status}`,
    gsi3sk: new Date().toISOString()
  };

  try {
    const params = {
      TableName: tableName,
      Item: logEmail
    };

    await dynamoDb.put(params).promise();
    console.log('[EmailLogModel] ✅ Log de email salvo com sucesso:', {
      id: logEmail.id,
      emailCliente: logEmail.emailCliente,
      status: logEmail.status,
      codigoPedido: logEmail.codigoPedido
    });

    return logEmail;
  } catch (error) {
    console.error('[EmailLogModel] ❌ Erro ao salvar log de email:', error.message);
    // Não falha - logging é não-crítico
    return null;
  }
}

/**
 * Buscar logs de email com filtros
 */
async function buscarLogsEmail({
  emailCliente = null,
  pedidoId = null,
  codigoPedido = null,
  status = null,
  tipo = null,
  dataInicio = null,
  dataFim = null,
  limit = 50,
  exclusiveStartKey = null
} = {}) {
  try {
    let params = {
      TableName: tableName,
      Limit: Math.min(Number(limit) || 50, 100),
      ScanIndexForward: false // Mais recentes primeiro
    };

    const filterExp = [];
    const exprNames = {};
    const exprValues = {};

    // Query por email (GSI)
    if (emailCliente) {
      params.IndexName = 'gsi1pk-gsi1sk-index';
      params.KeyConditionExpression = 'gsi1pk = :gsi1pk';
      exprValues[':gsi1pk'] = `EMAIL#${String(emailCliente).toLowerCase()}`;
    }
    // Query por pedido (GSI)
    else if (pedidoId) {
      params.IndexName = 'gsi2pk-gsi2sk-index';
      params.KeyConditionExpression = 'gsi2pk = :gsi2pk';
      exprValues[':gsi2pk'] = `PEDIDO#${pedidoId}`;
    }
    // Query por status (GSI)
    else if (status) {
      params.IndexName = 'gsi3pk-gsi3sk-index';
      params.KeyConditionExpression = 'gsi3pk = :gsi3pk';
      exprValues[':gsi3pk'] = `STATUS#${status}`;
    }
    // Fallback: Scan se nenhum índice puder ser usado
    else {
      // Para scan, adiciona filtros no FilterExpression
    }

    // Filtros adicionais
    if (codigoPedido && !pedidoId) {
      exprNames['#codigoPedido'] = 'codigoPedido';
      exprValues[':codigoPedido'] = codigoPedido;
      filterExp.push('#codigoPedido = :codigoPedido');
    }

    if (tipo) {
      exprNames['#tipo'] = 'tipo';
      exprValues[':tipo'] = tipo;
      filterExp.push('#tipo = :tipo');
    }

    if (dataInicio && dataFim) {
      exprNames['#timestamp'] = 'timestamp';
      exprValues[':dataInicio'] = dataInicio;
      exprValues[':dataFim'] = dataFim;
      filterExp.push('#timestamp BETWEEN :dataInicio AND :dataFim');
    } else if (dataInicio) {
      exprNames['#timestamp'] = 'timestamp';
      exprValues[':dataInicio'] = dataInicio;
      filterExp.push('#timestamp >= :dataInicio');
    } else if (dataFim) {
      exprNames['#timestamp'] = 'timestamp';
      exprValues[':dataFim'] = dataFim;
      filterExp.push('#timestamp <= :dataFim');
    }

    // Montar expressões
    if (filterExp.length > 0) {
      params.FilterExpression = filterExp.join(' AND ');
    }

    if (Object.keys(exprNames).length > 0) {
      params.ExpressionAttributeNames = exprNames;
    }

    if (Object.keys(exprValues).length > 0) {
      params.ExpressionAttributeValues = exprValues;
    }

    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }

    const data = await dynamoDb.query(params.IndexName ? params : { 
      ...params, 
      IndexName: undefined 
    }).promise();

    return {
      items: data.Items || [],
      lastKey: data.LastEvaluatedKey || null,
      count: data.Items?.length || 0,
      scannedCount: data.ScannedCount || 0
    };
  } catch (error) {
    console.error('[EmailLogModel] ❌ Erro ao buscar logs de email:', error.message);
    throw error;
  }
}

/**
 * Obter estatísticas de emails
 */
async function obterEstatisticasEmails({
  dataInicio = null,
  dataFim = null
} = {}) {
  try {
    const params = {
      TableName: tableName
    };

    const filterExp = [];
    const exprNames = {};
    const exprValues = {};

    if (dataInicio && dataFim) {
      exprNames['#timestamp'] = 'timestamp';
      exprValues[':dataInicio'] = dataInicio;
      exprValues[':dataFim'] = dataFim;
      filterExp.push('#timestamp BETWEEN :dataInicio AND :dataFim');
    }

    if (filterExp.length > 0) {
      params.FilterExpression = filterExp.join(' AND ');
      params.ExpressionAttributeNames = exprNames;
      params.ExpressionAttributeValues = exprValues;
    }

    const data = await dynamoDb.scan(params).promise();
    const items = data.Items || [];

    const stats = {
      total: items.length,
      sucesso: items.filter(i => i.status === 'sucesso').length,
      erro: items.filter(i => i.status === 'erro').length,
      falhaConfig: items.filter(i => i.status === 'falha_config').length,
      taxa_sucesso: items.length > 0 ? ((items.filter(i => i.status === 'sucesso').length / items.length) * 100).toFixed(2) : 0,
      temPdf: items.filter(i => i.temPdf === true).length,
      tipos: {
        novo_pedido: items.filter(i => i.tipo === 'novo_pedido').length,
        status_update: items.filter(i => i.tipo === 'status_update').length,
        finalizacao: items.filter(i => i.tipo === 'finalizacao').length,
        outras: items.filter(i => i.tipo === 'outras').length
      },
      tempoMedio: items.length > 0 ? (items.reduce((sum, i) => sum + (i.duracaoMs || 0), 0) / items.length).toFixed(0) : 0
    };

    return stats;
  } catch (error) {
    console.error('[EmailLogModel] ❌ Erro ao obter estatísticas:', error.message);
    throw error;
  }
}

/**
 * Obter últimos emails de um cliente
 */
async function obterUltimosEmailsCliente(emailCliente, limite = 10) {
  try {
    const params = {
      TableName: tableName,
      IndexName: 'gsi1pk-gsi1sk-index',
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `EMAIL#${String(emailCliente).toLowerCase()}`
      },
      ScanIndexForward: false,
      Limit: Math.min(Number(limite) || 10, 50)
    };

    const data = await dynamoDb.query(params).promise();
    return data.Items || [];
  } catch (error) {
    console.error('[EmailLogModel] ❌ Erro ao buscar últimos emails do cliente:', error.message);
    return [];
  }
}

module.exports = {
  criarLogEmail,
  buscarLogsEmail,
  obterEstatisticasEmails,
  obterUltimosEmailsCliente,
  tableName
};
