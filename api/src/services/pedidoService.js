const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { enviarEmail, enviarEmailComPdfNovorecebimento } = require("./emailService");
const pdfService = require("./pdfService");
const { getCliente } = require('./clienteService');
const { ORDER_STATUS } = require('../utils/orderStatus');
const tableName = process.env.DYNAMODB_PEDIDO_TABLE || 'shoeRepairPedidos';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

/**
 * Gera um código sequencial ULTRA-CURTO e LEGÍVEL para o pedido
 * Estratégia: Contador por dia com sharding para escalabilidade
 * Formato: DDMMYY-XXX (ex: 160126-001)
 *
 * Vantagens:
 * - MUITO curto (9 caracteres) - fácil de digitar e lembrar
 * - Sequencial diário (001, 002, 003...)
 * - Baixa contenção (sharding por dia)
 * - Perfeito para uso em balcão de loja
 * - Escala bem: até 999 pedidos por dia
 */
async function gerarCodigoPedido() {
  const now = new Date();
  // Formato: DDMMYY (ex: 160126)
  const dia = now.getDate().toString().padStart(2, '0');
  const mes = (now.getMonth() + 1).toString().padStart(2, '0');
  const ano = now.getFullYear().toString().slice(-2);
  const dataKey = `${dia}${mes}${ano}`;

  // Sharding por dia: cada dia tem seu próprio contador
  const counterId = `pedido-${dataKey}`;

  try {
    // Tenta incrementar o contador atômico para o dia atual
    const params = {
      TableName: 'ShoeRepairCounters',
      Key: { id: counterId },
      UpdateExpression: 'ADD #count :incr',
      ExpressionAttributeNames: {
        '#count': 'count'
      },
      ExpressionAttributeValues: {
        ':incr': 1
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(params).promise();
    const sequencial = result.Attributes.count;

    // Formato ultra-curto legível: 160126-001
    const codigo = `${dataKey}-${String(sequencial).padStart(3, '0')}`;

    console.log(`[PedidoService] Código gerado: ${codigo}`, {
      data: dataKey,
      sequencial: sequencial,
      formato: 'DDMMYY-SEQ'
    });

    return codigo;

  } catch (error) {
    // Se a tabela não existe ou erro, fallback para timestamp curto
    console.warn('[PedidoService] Fallback para timestamp curto devido a erro:', error.message);

    // Fallback simples: DDMMYY + últimos 3 dígitos do timestamp
    const timestamp = Date.now();
    const shortSeq = timestamp.toString().slice(-3);
    const codigo = `${dataKey}-${shortSeq}`;

    console.log(`[PedidoService] Código fallback gerado: ${codigo}`);
    return codigo;
  }
}

exports.listPedidos = async () => {
  const params = { TableName: tableName };
  const data = await dynamoDb.scan(params).promise();
  return data.Items;
};

exports.getPedido = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  return data.Item;
};

exports.createPedido = async (pedido) => {
  // Gera um código sequencial para o pedido
  const codigoPedido = await gerarCodigoPedido();

  const novoPedido = { 
    id: uuidv4(), // Mantém o UUID como chave primária interna
    codigo: codigoPedido, // Novo campo com código sequencial legível
    clienteId: pedido.clienteId,
    clientName: pedido.clientName,
    modeloTenis: pedido.modeloTenis,
    servicos: pedido.servicos || [],
    fotos: pedido.fotos || [],
    precoTotal: pedido.precoTotal,
    valorSinal: pedido.valorSinal || 0,
    valorRestante: pedido.valorRestante || 0,
    dataPrevistaEntrega: pedido.dataPrevistaEntrega,
    departamento: pedido.departamento || 'Atendimento',
    observacoes: pedido.observacoes || '',
    garantia: pedido.garantia || {
      ativa: false,
      preco: 0,
      duracao: '',
      data: ''
    },
    acessorios: pedido.acessorios || [],
    status: pedido.status || ORDER_STATUS.ATENDIMENTO_RECEBIDO,
    dataCriacao: pedido.dataCriacao || new Date().toISOString(),
    createdAt: pedido.createdAt || new Date().toISOString(),
    updatedAt: pedido.updatedAt || new Date().toISOString(),
    statusHistory: pedido.statusHistory || [],
    // Persistir dados do criador do pedido
    createdBy: pedido.createdBy || null,
    // Persistir campos do sistema de setores
    setoresFluxo: Array.isArray(pedido.setoresFluxo) ? pedido.setoresFluxo : [],
    observacoesFluxo: Array.isArray(pedido.observacoesFluxo) ? pedido.observacoesFluxo : [],
    departamentosSelecionados: Array.isArray(pedido.departamentosSelecionados) ? pedido.departamentosSelecionados : [],
    setorAtual: pedido.setorAtual || null,
    setoresHistorico: Array.isArray(pedido.setoresHistorico) ? pedido.setoresHistorico : [],
    // Manter compatibilidade com campos antigos se existirem
    tipoServico: pedido.tipoServico,
    descricaoServicos: pedido.descricaoServicos,
    preco: pedido.preco
  };

  const params = { TableName: tableName, Item: novoPedido };
  await dynamoDb.put(params).promise();

  // Enviar e-mail com PDF após criar o pedido
  try {
    const cliente = await getCliente(novoPedido.clienteId);
    const emailCliente = (cliente && cliente.email) ? String(cliente.email).trim() : null;

    if (!emailCliente) {
      console.warn('[PedidoService] Nenhum e-mail encontrado no cadastro do cliente. E-mail não enviado.', {
        clienteId: novoPedido.clienteId,
        codigo: codigoPedido
      });
    } else {
      // Gerar PDF do pedido
      let pdfBuffer = null;
      try {
        console.log('[PedidoService] Gerando PDF do pedido para anexo:', codigoPedido);
        const pdfResult = await pdfService.generatePedidoPdf(novoPedido.id);
        pdfBuffer = pdfResult?.buffer || null;
        
        if (pdfBuffer) {
          console.log('[PedidoService] ✅ PDF gerado com sucesso, tamanho:', pdfBuffer.length, 'bytes');
        } else {
          console.warn('[PedidoService] ⚠️ PDF não foi gerado (retornou vazio)');
        }
      } catch (pdfError) {
        console.error('[PedidoService] ❌ Erro ao gerar PDF (continuando sem PDF):', pdfError.message);
        // Não falha - vai enviar email sem PDF
      }

      // Enviar email com PDF (se disponível)
      const nomeClienteFormatado = cliente?.nome || cliente?.nomeCliente || novoPedido.clientName || 'Cliente';
      await enviarEmailComPdfNovorecebimento(emailCliente, nomeClienteFormatado, novoPedido, pdfBuffer);
      
      console.log(`[PedidoService] ✅ E-mail de novo pedido enviado para ${emailCliente}${pdfBuffer ? ' COM PDF' : ' SEM PDF'}.`);
    }
  } catch (error) {
    console.error('[PedidoService] ❌ Erro ao buscar cliente e/ou enviar e-mail de confirmação:', error.message);
    // Não falha - o pedido foi criado com sucesso
  }

    return novoPedido;
};

exports.updatePedido = async (id, updates) => {
  let updateExp = 'set ';
  const attrNames = {};
  const attrValues = {};
  let prefix = '';
  for (const key in updates) {
    if (key === 'id') continue;
    updateExp += `${prefix}#${key} = :${key}`;
    attrNames[`#${key}`] = key;
    attrValues[`:${key}`] = updates[key];
    prefix = ', ';
  }
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};

exports.deletePedido = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  await dynamoDb.delete(params).promise();
  return true;
};

exports.updatePedidoStatus = async (id, status) => {
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: 'set #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};

/**
 * Consulta leve de pedidos com filtros e paginação opcional
 */
exports.searchPedidosLite = async ({
  codigo,
  cliente,
  status,
  setorAtual,
  funcionario,
  dataInicio,
  dataFim,
  limit = 50,
  exclusiveStartKey
}) => {
  const params = {
    TableName: tableName,
    Limit: Number(limit) || 50,
    ProjectionExpression: '#id, codigo, #clientName, clienteId, #status, setorAtual, funcionarioAtual, dataCriacao, dataPrevistaEntrega, updatedAt, prioridade, departamento',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#status': 'status',
      '#clientName': 'clientName'
    }
  };

  const filterExp = [];
  const exprNames = params.ExpressionAttributeNames;
  const exprValues = {};

  if (codigo) {
    exprNames['#codigo'] = 'codigo';
    exprValues[':codigo'] = codigo;
    filterExp.push('#codigo = :codigo');
  }

  if (status) {
    exprValues[':status'] = status;
    filterExp.push('#status = :status');
  }

  if (setorAtual) {
    exprNames['#setorAtual'] = 'setorAtual';
    exprValues[':setorAtual'] = setorAtual;
    filterExp.push('#setorAtual = :setorAtual');
  }

  if (funcionario) {
    exprNames['#funcionarioAtual'] = 'funcionarioAtual';
    exprValues[':funcionario'] = funcionario;
    filterExp.push('contains(#funcionarioAtual, :funcionario)');
  }

  if (cliente) {
    exprNames['#nomeCliente'] = 'nomeCliente';
    exprValues[':cliente'] = cliente;
    // Considera clientName e nomeCliente (legado)
    filterExp.push('(contains(#clientName, :cliente) OR contains(#nomeCliente, :cliente))');
  }

  if (dataInicio && dataFim) {
    exprNames['#dataCriacao'] = 'dataCriacao';
    exprValues[':dataInicio'] = dataInicio;
    exprValues[':dataFim'] = dataFim;
    filterExp.push('#dataCriacao BETWEEN :dataInicio AND :dataFim');
  } else if (dataInicio) {
    exprNames['#dataCriacao'] = 'dataCriacao';
    exprValues[':dataInicio'] = dataInicio;
    filterExp.push('#dataCriacao >= :dataInicio');
  } else if (dataFim) {
    exprNames['#dataCriacao'] = 'dataCriacao';
    exprValues[':dataFim'] = dataFim;
    filterExp.push('#dataCriacao <= :dataFim');
  }

  if (filterExp.length > 0) {
    params.FilterExpression = filterExp.join(' AND ');
    params.ExpressionAttributeValues = exprValues;
  }

  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }

  const data = await dynamoDb.scan(params).promise();

  return {
    items: data.Items || [],
    lastKey: data.LastEvaluatedKey || null
  };
};
