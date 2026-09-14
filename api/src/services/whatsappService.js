const axios = require('axios');
const pdfService = require('./pdfService');
const { ORDER_STATUS, normalizeStatus, isFinalStatus } = require('../utils/orderStatus');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Token do Meta WhatsApp Cloud API
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // ID do número do WhatsApp Business

/**
 * Gera o payload do template personalizado para o cliente de acordo com o status do pedido.
 * @param {string} nomeCliente
 * @param {string} status
 * @param {string} descricaoServicos
 * @param {string} modeloTenis
 * @returns {object} Payload do template para envio
 */
function gerarTemplateStatusPedido(nomeCliente, status, descricaoServicos, modeloTenis) {
  console.log('[WhatsApp] Gerando template de status:', {
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis
  });

  const statusNormalizado = normalizeStatus(status, { strict: false, fallback: String(status || '') });
  const statusLower = String(statusNormalizado || status || '').toLowerCase();
  console.log('[WhatsApp] Status normalizado:', statusLower);

  if (statusLower === 'criado' || statusLower === 'created' || statusNormalizado === ORDER_STATUS.ATENDIMENTO_RECEBIDO) {
    console.log('[WhatsApp] Tipo de template: order_created');
    return {
      type: "template",
      template: {
        name: "order_created",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (isFinalStatus(statusNormalizado)) {
    console.log('[WhatsApp] Tipo de template: order_status_update_finish');
    return {
      type: "template",
      template: {
        name: "order_status_update_finish",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (statusLower === 'em_andamento' || statusLower === 'em andamento') {
    console.log('[WhatsApp] Tipo de template: update_status_in_progress');
    return {
      type: "template",
      template: {
        name: "update_status_in_progress",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (statusLower === 'cancelado' || statusLower === 'cancelada') {
    console.log('[WhatsApp] Tipo de mensagem: CANCELADO (usando texto simples)');
    return {
      type: "text",
      text: {
        body: `Olá, ${nomeCliente}.\n\n` +
              `Infelizmente, o pedido de *${descricaoServicos}* para o *${modeloTenis}* foi cancelado. Se precisar de mais informações ou quiser reabrir o pedido, estamos à disposição.`
      }
    };
  }

  // Mensagem padrão para outros status (usando texto simples)
  console.log('[WhatsApp] Tipo de mensagem: PADRÃO para status (usando texto simples):', status);
  return {
    type: "text",
    text: {
      body: `Olá, ${nomeCliente}! 😊\n\n` +
            `Temos novidades sobre o seu pedido de *${descricaoServicos}* para o *${modeloTenis}*.\n` +
            `O status agora é: *${status}*.\n\n` +
            `Se tiver dúvidas ou precisar de mais informações, estamos à disposição!\n\n` +
            `Obrigado por confiar no nosso serviço.`
    }
  };
}

/**
 * Envia mensagem de status do pedido para o cliente via WhatsApp.
 * @param {string} telefoneCliente - Telefone do cliente no formato internacional, ex: 5511999999999
 * @param {string} nomeCliente - Nome do cliente
 * @param {string} status - Novo status do pedido
 * @param {string} descricaoServicos - Descrição dos serviços do pedido
 * @param {string} modeloTenis - Modelo do tênis
 */
async function enviarStatusPedido(telefoneCliente, nomeCliente, status, descricaoServicos, modeloTenis) {
  console.log('[WhatsApp] Iniciando envio de status do pedido:', {
    telefoneCliente,
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis,
    timestamp: new Date().toISOString()
  });

  // Validação das configurações
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] API não configurada - variáveis de ambiente ausentes:', {
      hasToken: !!WHATSAPP_TOKEN,
      hasPhoneNumberId: !!WHATSAPP_PHONE_NUMBER_ID
    });
    return;
  }

  console.log('[WhatsApp] Configurações validadas:', {
    tokenLength: WHATSAPP_TOKEN ? WHATSAPP_TOKEN.length : 0,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID
  });

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  console.log('[WhatsApp] URL da API:', url);

  const templatePayload = gerarTemplateStatusPedido(nomeCliente, status, descricaoServicos, modeloTenis);
  console.log('[WhatsApp] Template/Mensagem gerada:', {
    tipo: templatePayload.type,
    templateName: templatePayload.template?.name || 'N/A',
    parametros: templatePayload.template?.components?.[0]?.parameters || 'N/A',
    payloadCompleto: JSON.stringify(templatePayload, null, 2)
  });

  const payload = {
    messaging_product: "whatsapp",
    to: telefoneCliente,
    ...templatePayload
  };

  console.log('[WhatsApp] Payload da requisição:', JSON.stringify(payload, null, 2));

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json"
  };

  console.log('[WhatsApp] Headers da requisição:', {
    authorization: `Bearer ${WHATSAPP_TOKEN.substring(0, 20)}...`,
    contentType: headers["Content-Type"]
  });

  try {
    console.log('[WhatsApp] Enviando requisição para WhatsApp API...');
    const startTime = Date.now();
    
    const response = await axios.post(url, payload, { headers });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('[WhatsApp] ✅ Mensagem enviada com sucesso!', {
      telefoneCliente,
      nomeCliente,
      status,
      duracaoMs: duration,
      statusCode: response.status,
      responseData: response.data,
      timestamp: new Date().toISOString()
    });

    console.log(`[WhatsApp] Mensagem WhatsApp enviada para ${telefoneCliente} em ${duration}ms`);
    
  } catch (err) {
    console.error('[WhatsApp] ❌ Erro ao enviar mensagem:', {
      telefoneCliente,
      nomeCliente,
      status,
      errorMessage: err.message,
      errorCode: err.code,
      statusCode: err.response?.status,
      statusText: err.response?.statusText,
      responseData: err.response?.data,
      requestConfig: {
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers ? { ...err.config.headers, Authorization: 'Bearer [HIDDEN]' } : undefined
      },
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Log adicional para erros específicos da API do WhatsApp
    if (err.response?.data?.error) {
      console.error('[WhatsApp] Detalhes do erro da API:', {
        errorType: err.response.data.error.type,
        errorCode: err.response.data.error.code,
        errorMessage: err.response.data.error.message,
        errorSubcode: err.response.data.error.error_subcode,
        fbtrace_id: err.response.data.error.fbtrace_id
      });
    }

    console.error('[WhatsApp] Erro ao enviar mensagem WhatsApp:', err.response?.data || err.message);
  }
}

/**
 * Formata os detalhes do pedido em uma mensagem legível para WhatsApp
 * @param {object} pedido - Objeto do pedido completo
 * @param {object} cliente - Objeto do cliente
 * @returns {string} Mensagem formatada
 */
function formatarDetalhePedidoParaMensagem(pedido, cliente) {
  const dataFormatada = new Date(pedido.dataCriacao).toLocaleDateString('pt-BR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const servicosTexto = pedido.servicos && pedido.servicos.length > 0
    ? pedido.servicos
        .map(s => `• ${s.nome} - R$ ${Number(s.preco).toFixed(2).replace('.', ',')}`)
        .join('\n')
    : `• ${pedido.tipoServico || 'Serviço geral'} - R$ ${Number(pedido.precoTotal || pedido.preco).toFixed(2).replace('.', ',')}`;

  const precoTotalFormatado = Number(pedido.precoTotal || pedido.preco).toFixed(2).replace('.', ',');
  const valorSinalFormatado = Number(pedido.valorSinal || 0).toFixed(2).replace('.', ',');
  const valorRestanteFormatado = Number(pedido.valorRestante || 0).toFixed(2).replace('.', ',');

  const dataPrevistaFormatada = new Date(pedido.dataPrevistaEntrega).toLocaleDateString('pt-BR');

  let mensagem = `*DETALHES DO PEDIDO* 📋\n\n`;
  mensagem += `🔢 *Número do Pedido:* ${pedido.codigo}\n`;
  mensagem += `📅 *Data do Pedido:* ${dataFormatada}\n`;
  mensagem += `👟 *Modelo:* ${pedido.modeloTenis || 'Não especificado'}\n`;
  mensagem += `🏪 *Status:* ${pedido.status}\n\n`;

  mensagem += `*SERVIÇOS SOLICITADOS* 🔧\n`;
  mensagem += `${servicosTexto}\n\n`;

  mensagem += `*VALORES* 💰\n`;
  mensagem += `Total: R$ ${precoTotalFormatado}\n`;
  if (pedido.valorSinal && pedido.valorSinal > 0) {
    mensagem += `Sinal Pago: R$ ${valorSinalFormatado}\n`;
    mensagem += `Restante: R$ ${valorRestanteFormatado}\n`;
  }
  mensagem += `\n`;

  mensagem += `📅 *Previsão de Entrega:* ${dataPrevistaFormatada}\n`;

  if (pedido.observacoes) {
    mensagem += `\n📝 *Observações:*\n${pedido.observacoes}\n`;
  }

  mensagem += `\n_Obrigado por confiar em nosso serviço! 😊_`;

  return mensagem;
}

/**
 * Envia um PDF do pedido para o cliente via WhatsApp
 * @param {string} telefoneCliente - Telefone do cliente (5511999999999)
 * @param {string} pedidoId - ID do pedido
 * @param {object} pedido - Objeto do pedido (opcional, para não refazer query)
 * @returns {object} Resultado do envio
 */
async function enviarPdfPedidoWhatsApp(telefoneCliente, pedidoId, pedido = null) {
  try {
    // Validação das configurações
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('[WhatsApp-PDF] API não configurada - variáveis de ambiente ausentes');
      return {
        success: false,
        error: 'WhatsApp não configurado'
      };
    }

    console.log('[WhatsApp-PDF] Iniciando envio de PDF do pedido', {
      telefoneCliente,
      pedidoId,
      timestamp: new Date().toISOString()
    });

    // Gerar PDF do pedido
    const { buffer, s3 } = await pdfService.generatePedidoPdf(pedidoId);

    if (!s3 || !s3.url) {
      console.warn('[WhatsApp-PDF] PDF não foi salvo no S3, usando buffer local');
      // Continuar mesmo sem URL S3
    }

    const pdfUrl = s3?.url;

    if (!pdfUrl) {
      console.error('[WhatsApp-PDF] Não foi possível obter URL do PDF');
      return {
        success: false,
        error: 'Falha ao gerar URL do PDF'
      };
    }

    // Payload para envio do PDF
    const payload = {
      messaging_product: 'whatsapp',
      to: telefoneCliente,
      type: 'document',
      document: {
        link: pdfUrl,
        filename: `pedido-${pedido?.codigo || pedidoId}.pdf`
      }
    };

    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const headers = {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    };

    console.log('[WhatsApp-PDF] Enviando PDF para', telefoneCliente);
    const response = await axios.post(url, payload, { headers });

    console.log('[WhatsApp-PDF] ✅ PDF enviado com sucesso!', {
      telefoneCliente,
      pedidoId,
      statusCode: response.status,
      messageId: response.data?.messages?.[0]?.id
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id,
      pdfUrl: pdfUrl
    };

  } catch (error) {
    console.error('[WhatsApp-PDF] ❌ Erro ao enviar PDF:', {
      telefoneCliente,
      pedidoId,
      errorMessage: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Envia uma mensagem formatada com detalhes do pedido para o cliente
 * @param {string} telefoneCliente - Telefone do cliente (5511999999999)
 * @param {object} pedido - Objeto do pedido completo
 * @param {object} cliente - Objeto do cliente
 * @returns {object} Resultado do envio
 */
async function enviarDetalhesPedidoWhatsApp(telefoneCliente, pedido, cliente) {
  try {
    // Validação das configurações
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('[WhatsApp-Detalhes] API não configurada - variáveis de ambiente ausentes');
      return {
        success: false,
        error: 'WhatsApp não configurado'
      };
    }

    console.log('[WhatsApp-Detalhes] Iniciando envio de detalhes do pedido', {
      telefoneCliente,
      codigoPedido: pedido.codigo,
      timestamp: new Date().toISOString()
    });

    // Formatar mensagem
    const mensagem = formatarDetalhePedidoParaMensagem(pedido, cliente);

    // Payload para envio
    const payload = {
      messaging_product: 'whatsapp',
      to: telefoneCliente,
      type: 'text',
      text: {
        body: mensagem
      }
    };

    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const headers = {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    };

    console.log('[WhatsApp-Detalhes] Enviando mensagem para', telefoneCliente);
    const response = await axios.post(url, payload, { headers });

    console.log('[WhatsApp-Detalhes] ✅ Detalhes enviados com sucesso!', {
      telefoneCliente,
      codigoPedido: pedido.codigo,
      statusCode: response.status,
      messageId: response.data?.messages?.[0]?.id
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id
    };

  } catch (error) {
    console.error('[WhatsApp-Detalhes] ❌ Erro ao enviar detalhes:', {
      telefoneCliente,
      codigoPedido: pedido.codigo,
      errorMessage: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

module.exports = { 
  enviarStatusPedido, 
  gerarTemplateStatusPedido,
  enviarPdfPedidoWhatsApp,
  enviarDetalhesPedidoWhatsApp,
  formatarDetalhePedidoParaMensagem
};