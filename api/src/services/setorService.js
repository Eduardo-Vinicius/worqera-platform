const { SETORES_PADRAO } = require('../models/setorModel');
const pedidoService = require('./pedidoService');
const emailService = require('./emailService');
const { ORDER_STATUS, getStatusBySetor, isFinalStatus, normalizeStatus } = require('../utils/orderStatus');

/**
 * Retorna todos os setores padrão do sistema
 */
function listarSetores() {
  return SETORES_PADRAO.filter(setor => setor.ativo);
}

/**
 * Busca um setor por ID
 */
function getSetor(setorId) {
  return SETORES_PADRAO.find(setor => setor.id === setorId);
}

async function notificarClienteSobreMovimentacao(pedido, status, setorNome = null) {
  try {
    if (!pedido?.clienteId) {
      console.log('[SetorService] Pedido sem clienteId; email de movimentacao ignorado', {
        pedidoId: pedido?.id,
        status
      });
      return;
    }

    const clienteService = require('./clienteService');
    const cliente = await clienteService.getCliente(pedido.clienteId);

    if (!cliente?.email) {
      console.log('[SetorService] Cliente sem email cadastrado; envio de email ignorado', {
        pedidoId: pedido?.id,
        clienteId: pedido?.clienteId,
        status
      });
      return;
    }

    console.log('[SetorService] Enviando email de andamento do pedido...', {
      pedidoId: pedido.id,
      codigoPedido: pedido.codigo,
      emailCliente: cliente.email,
      status,
      setor: setorNome || pedido.departamento || pedido.setorAtual
    });

    await emailService.enviarStatusPedido(
      cliente.email,
      cliente.nome || 'Cliente',
      status,
      pedido.descricaoServicos || pedido.servicos?.map(s => s.nome).join(', ') || 'Serviços diversos',
      pedido.modeloTenis || 'Tênis',
      pedido.codigo,
      pedido.fotos || []
    );

    console.log('[SetorService] Email de andamento enviado com sucesso', {
      pedidoId: pedido.id,
      status,
      setor: setorNome || pedido.departamento || pedido.setorAtual
    });
  } catch (emailError) {
    console.error('[SetorService] Erro ao enviar email de andamento:', {
      pedidoId: pedido?.id,
      codigoPedido: pedido?.codigo,
      status,
      setor: setorNome || pedido?.departamento || pedido?.setorAtual,
      message: emailError.message,
      stack: emailError.stack
    });
  }
}

/**
 * Determina quais setores o pedido deve passar baseado nos serviços
 * @param {Array} servicos - Array de serviços do pedido
 * @returns {Array} Array de IDs de setores
 */
function determinarSetoresPorServicos(servicos) {
  const setoresNecessarios = new Set();
  
  // Atendimento inicial é sempre obrigatório
  setoresNecessarios.add('atendimento-inicial');
  
  // Analisa cada serviço para determinar setores necessários
  servicos.forEach(servico => {
    const nomeServico = servico.nome.toLowerCase();
    
    // Sapataria
    if (nomeServico.includes('cola') || 
        nomeServico.includes('solado') || 
        nomeServico.includes('salto') ||
        nomeServico.includes('reparo')) {
      setoresNecessarios.add('sapataria');
    }
    
    // Costura
    if (nomeServico.includes('costura') || 
        nomeServico.includes('rasgado') ||
        nomeServico.includes('ajuste')) {
      setoresNecessarios.add('costura');
    }
    
    // Lavagem
    if (nomeServico.includes('limpeza') || 
        nomeServico.includes('lavagem') ||
        nomeServico.includes('higienização')) {
      setoresNecessarios.add('lavagem');
    }
    
    // Pintura
    if (nomeServico.includes('pintura') || 
        nomeServico.includes('customização') ||
        nomeServico.includes('cor')) {
      setoresNecessarios.add('pintura');
    }
  });
  
  // Acabamento sempre entra se houver algum serviço além do atendimento
  if (setoresNecessarios.size > 1) {
    setoresNecessarios.add('acabamento');
  }
  
  // Atendimento final é sempre obrigatório
  setoresNecessarios.add('atendimento-final');
  
  // Converte para array e ordena pela ordem dos setores
  const setoresArray = Array.from(setoresNecessarios);
  setoresArray.sort((a, b) => {
    const setorA = getSetor(a);
    const setorB = getSetor(b);
    return setorA.ordem - setorB.ordem;
  });
  
  return setoresArray;
}

/**
 * Move um pedido para um novo setor
 * @param {String} pedidoId - ID do pedido
 * @param {String} novoSetorId - ID do setor de destino
 * @param {Object} usuario - Dados do usuário que está movendo
 * @param {String} funcionarioNome - Nome do funcionário que está movendo (opcional)
 * @param {String} observacao - Observação sobre a movimentação (opcional)
 * @param {String} statusOverride - Status explícito para quando a coluna é da mesma família do setor
 * @returns {Object} Pedido atualizado
 */
async function moverPedidoParaSetor(pedidoId, novoSetorId, usuario, funcionarioNome = null, observacao = '', statusOverride = null) {
  console.log('[SetorService] Movendo pedido para setor:', {
    pedidoId,
    novoSetorId,
    usuario: usuario.email,
    funcionarioNome
  });
  
  // Validar setor existe
  const setor = getSetor(novoSetorId);
  if (!setor) {
    throw new Error(`Setor ${novoSetorId} não encontrado`);
  }
  
  // Buscar pedido atual
  const pedido = await pedidoService.getPedido(pedidoId);
  if (!pedido) {
    throw new Error('Pedido não encontrado');
  }

  const appendObservacaoFluxo = (observacaoTexto, basePedido, setorDestino) => {
    if (!observacaoTexto) return basePedido.observacoesFluxo || [];
    const lista = Array.isArray(basePedido.observacoesFluxo) ? [...basePedido.observacoesFluxo] : [];
    lista.push({
      setorId: setorDestino.id,
      setorNome: setorDestino.nome,
      observacao: observacaoTexto,
      usuario: usuario.email,
      usuarioNome: usuario.name || usuario.email,
      timestamp: new Date().toISOString()
    });
    return lista;
  };

  if (pedido.setorAtual === novoSetorId) {
    // Permitir atualização de status ou apenas registrar observação dentro do mesmo setor
    const agora = new Date().toISOString();
    const statusNormalizado = statusOverride
      ? normalizeStatus(statusOverride, { strict: false, fallback: pedido.status })
      : pedido.status;

    const observacoesFluxo = appendObservacaoFluxo(observacao, pedido, setor);

    if (statusNormalizado === pedido.status && observacoesFluxo === (pedido.observacoesFluxo || [])) {
      console.log('[SetorService] Pedido já está no setor e status alvo é o mesmo. Ignorando movimentação repetida:', {
        pedidoId,
        setorId: novoSetorId,
        status: statusNormalizado
      });

      return {
        ...pedido,
        observacoesFluxo,
        _noMovement: true
      };
    }

    const statusHistory = pedido.statusHistory || [];
    if (statusNormalizado !== pedido.status) {
      statusHistory.push({
        status: statusNormalizado,
        date: agora.split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        userId: usuario.sub || usuario.email,
        userName: usuario.name || usuario.email,
        timestamp: agora
      });
    }

    const updates = {
      status: statusNormalizado,
      statusHistory,
      updatedAt: agora,
      updatedBy: usuario.email,
      funcionarioAtual: funcionarioNome || usuario.name || usuario.email,
      observacoesFluxo
    };

    const pedidoAtualizadoMesmoSetor = await pedidoService.updatePedido(pedidoId, updates);

    console.log('[SetorService] Status/observação atualizados dentro do mesmo setor:', {
      pedidoId,
      setorId: novoSetorId,
      status: statusNormalizado
    });

    if (statusNormalizado !== pedido.status) {
      await notificarClienteSobreMovimentacao(
        pedidoAtualizadoMesmoSetor,
        statusNormalizado,
        setor.nome
      );
    }

    return pedidoAtualizadoMesmoSetor;
  }

  // Fluxo agora é dinâmico: garante que o setor de destino esteja listado, mesmo que não estivesse no fluxo original
  const fluxoAtual = Array.isArray(pedido.setoresFluxo) ? [...pedido.setoresFluxo] : [];
  if (!fluxoAtual.includes(novoSetorId)) {
    fluxoAtual.push(novoSetorId);
    fluxoAtual.sort((a, b) => {
      const setorA = getSetor(a);
      const setorB = getSetor(b);
      const ordemA = setorA?.ordem || 0;
      const ordemB = setorB?.ordem || 0;
      return ordemA - ordemB;
    });
  }

  const agora = new Date().toISOString();
  const setoresHistorico = pedido.setoresHistorico || [];
  const observacoesFluxo = appendObservacaoFluxo(observacao, pedido, setor);
  
  // Fechar setor anterior (se houver)
  if (pedido.setorAtual) {
    const historicoAberto = setoresHistorico.find(
      h => h.setorId === pedido.setorAtual && !h.saidaEm
    );
    
    if (historicoAberto) {
      historicoAberto.saidaEm = agora;
      historicoAberto.usuarioSaida = usuario.email;
      historicoAberto.usuarioSaidaNome = funcionarioNome || usuario.name || usuario.email;
      historicoAberto.funcionarioSaida = funcionarioNome || '';
      
      console.log('[SetorService] Fechando setor anterior:', {
        setor: historicoAberto.setorNome,
        tempoNoSetor: calcularTempoNoSetor(historicoAberto),
        funcionario: funcionarioNome
      });
    }
  }
  
  // Abrir novo setor
  setoresHistorico.push({
    setorId: novoSetorId,
    setorNome: setor.nome,
    entradaEm: agora,
    saidaEm: null,
    usuarioEntrada: usuario.email,
    usuarioEntradaNome: usuario.name || usuario.email,
    funcionarioEntrada: funcionarioNome || '',
    usuarioSaida: null,
    usuarioSaidaNome: null,
    funcionarioSaida: '',
    observacoes: observacao || ''
  });
  
  console.log('[SetorService] Abrindo novo setor:', setor.nome);
  
  // Atualizar status legível (ou usa override quando coluna representa um status específico)
  const statusLegivel = statusOverride
    ? normalizeStatus(statusOverride, { strict: false, fallback: getStatusBySetor(setor) })
    : getStatusBySetor(setor);

  const novoHistoricoStatus = {
    status: statusLegivel,
    date: agora.split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    userId: usuario.sub || usuario.email,
    userName: usuario.name || usuario.email,
    timestamp: agora
  };
  
  // Preparar atualizações
  const updates = {
    setorAtual: novoSetorId,
    observacoesFluxo,
    setoresFluxo: fluxoAtual,
    setoresHistorico,
    status: statusLegivel,
    departamento: setor.nome,
    funcionarioAtual: funcionarioNome || usuario.name || usuario.email,
    updatedAt: agora,
    updatedBy: usuario.email,
    statusHistory: [...(pedido.statusHistory || []), novoHistoricoStatus]
  };
  
  // Se chegou no atendimento final, marcar como finalizado
  if (novoSetorId === 'atendimento-final') {
    updates.dataEntregaReal = agora.split('T')[0];
  }
  
  // Atualizar pedido
  const pedidoAtualizado = await pedidoService.updatePedido(pedidoId, updates);

  await notificarClienteSobreMovimentacao(pedidoAtualizado, statusLegivel, setor.nome);
  
  console.log('[SetorService] Pedido movido com sucesso para:', setor.nome);
  
  return pedidoAtualizado;
}

/**
 * Calcula o tempo que o pedido ficou em um setor (em horas)
 */
function calcularTempoNoSetor(historicoSetor) {
  if (!historicoSetor.saidaEm) {
    // Ainda está no setor
    const entrada = new Date(historicoSetor.entradaEm);
    const agora = new Date();
    return Math.floor((agora - entrada) / (1000 * 60 * 60)); // horas
  }
  
  const entrada = new Date(historicoSetor.entradaEm);
  const saida = new Date(historicoSetor.saidaEm);
  return Math.floor((saida - entrada) / (1000 * 60 * 60)); // horas
}

/**
 * Retorna o próximo setor no fluxo
 */
function getProximoSetor(pedido) {
  if (!pedido.setorAtual || !pedido.setoresFluxo) {
    return null;
  }
  
  const indexAtual = pedido.setoresFluxo.indexOf(pedido.setorAtual);
  if (indexAtual === -1 || indexAtual === pedido.setoresFluxo.length - 1) {
    return null; // Já está no último setor
  }
  
  const proximoSetorId = pedido.setoresFluxo[indexAtual + 1];
  return getSetor(proximoSetorId);
}

/**
 * Retorna o setor anterior no fluxo
 */
function getSetorAnterior(pedido) {
  if (!pedido.setorAtual || !pedido.setoresFluxo) {
    return null;
  }
  
  const indexAtual = pedido.setoresFluxo.indexOf(pedido.setorAtual);
  if (indexAtual <= 0) {
    return null; // Já está no primeiro setor
  }
  
  const anteriorSetorId = pedido.setoresFluxo[indexAtual - 1];
  return getSetor(anteriorSetorId);
}

/**
 * Verifica se o usuário tem permissão para mover o pedido para o setor
 * Por enquanto, todos podem mover para qualquer setor (conforme solicitado)
 */
function validarPermissaoMover(usuario, setorAtual, novoSetor) {
  // Implementação futura: adicionar regras por role se necessário
  // Por enquanto, qualquer usuário autenticado pode mover
  return true;
}

/**
 * Retorna estatísticas de setores
 */
async function getEstatisticasSetores() {
  const todosPs = await pedidoService.listPedidos();
  
  const estatisticas = {};
  
  SETORES_PADRAO.forEach(setor => {
    const pedidosNoSetor = todosPs.filter(p => p.setorAtual === setor.id);
    
    estatisticas[setor.id] = {
      nome: setor.nome,
      cor: setor.cor,
      quantidade: pedidosNoSetor.length,
      pedidos: pedidosNoSetor.map(p => ({
        id: p.id,
        codigo: p.codigo,
        cliente: p.clientName,
        tempoNoSetor: calcularTempoAtualNoSetor(p)
      }))
    };
  });
  
  return estatisticas;
}

/**
 * Calcula quanto tempo o pedido está no setor atual
 */
function calcularTempoAtualNoSetor(pedido) {
  if (!pedido.setoresHistorico || pedido.setoresHistorico.length === 0) {
    return 0;
  }
  
  const historicoAtual = pedido.setoresHistorico.find(
    h => h.setorId === pedido.setorAtual && !h.saidaEm
  );
  
  if (!historicoAtual) {
    return 0;
  }
  
  return calcularTempoNoSetor(historicoAtual);
}

module.exports = {
  listarSetores,
  getSetor,
  determinarSetoresPorServicos,
  moverPedidoParaSetor,
  getProximoSetor,
  getSetorAnterior,
  validarPermissaoMover,
  getEstatisticasSetores,
  calcularTempoNoSetor,
  calcularTempoAtualNoSetor
};
