/** Map English API payloads to the PT-shaped objects the current UI still expects. */

export function adaptClient(raw: any) {
  if (!raw) return raw;
  const name = raw.name || raw.nome || raw.nomeCompleto || "";
  const phone = raw.phone || raw.telefone || null;
  const address = raw.address && typeof raw.address === "object" ? raw.address : {};
  return {
    ...raw,
    id: String(raw.id || raw._id || ""),
    name,
    phone,
    nome: name,
    telefone: phone,
    nomeCompleto: name,
    cpf: raw.cpf || null,
    email: raw.email || null,
    cep: raw.cep || address.cep || "",
    logradouro: raw.logradouro || address.logradouro || "",
    numero: raw.numero || address.numero || "",
    bairro: raw.bairro || address.bairro || "",
    cidade: raw.cidade || address.cidade || "",
    estado: raw.estado || address.estado || "",
    complemento: raw.complemento || address.complemento || "",
    observacoes: raw.notes || raw.observacoes || "",
  };
}

function adaptPhotoUrls(rawPhotos: any): string[] {
  if (!Array.isArray(rawPhotos)) return [];
  return rawPhotos.map((p: any) => (typeof p === "string" ? p : p?.url)).filter(Boolean);
}

function adaptSectorHistory(raw: any[]) {
  if (!Array.isArray(raw)) return [];
  return raw.map((h: any) => ({
    ...h,
    setorId: String(h.setorId || h.sectorId?._id || h.sectorId || ""),
    setorNome: h.setorNome || h.sectorName || undefined,
    entradaEm: h.entradaEm || h.enteredAt || h.createdAt || "",
    saidaEm: h.saidaEm ?? h.leftAt ?? null,
    note: h.note || null,
    action: h.action || null,
    movedByName: h.movedByName || null,
  }));
}

function adaptStatusHistory(raw: any, sectorHistory: any[]) {
  if (Array.isArray(raw) && raw.length) {
    return raw.map((h: any) => ({
      status: h.status || h.action || "update",
      date:
        h.date ||
        (h.entradaEm || h.enteredAt
          ? new Date(h.entradaEm || h.enteredAt).toLocaleDateString("pt-BR")
          : ""),
      time:
        h.time ||
        (h.entradaEm || h.enteredAt
          ? new Date(h.entradaEm || h.enteredAt).toLocaleTimeString("pt-BR")
          : ""),
    }));
  }
  return sectorHistory.map((h) => {
    const when = h.entradaEm ? new Date(h.entradaEm) : null;
    const label = [h.action, h.note, h.movedByName].filter(Boolean).join(" · ") || "movimento";
    return {
      status: label,
      date: when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString("pt-BR") : "",
      time: when && !Number.isNaN(when.getTime()) ? when.toLocaleTimeString("pt-BR") : "",
    };
  });
}

export function adaptOrder(raw: any) {
  if (!raw) return raw;
  const code = raw.code || raw.codigo || "";
  const photos = Array.isArray(raw.photos)
    ? adaptPhotoUrls(raw.photos)
    : Array.isArray(raw.fotos)
    ? raw.fotos
    : [];
  const items = (
    Array.isArray(raw.items) && raw.items.length
      ? raw.items
      : [{
          shoeModel: raw.shoeModel || raw.modeloTenis || "",
          services: raw.services || raw.servicos || [],
          photos,
          notes: null,
        }]
  ).map((it: any) => {
    const itemPhotos = Array.isArray(it.photos)
      ? adaptPhotoUrls(it.photos)
      : Array.isArray(it.fotos)
        ? it.fotos
        : [];
    return {
      ...it,
      shoeModel: it.shoeModel || it.modeloTenis || "",
      photos: itemPhotos,
      notes: it.notes ?? null,
    };
  });
  const shoeModel = items[0]?.shoeModel || raw.shoeModel || raw.modeloTenis || "";
  const services = Array.isArray(raw.services) && raw.services.length
    ? raw.services
    : Array.isArray(raw.servicos) && raw.servicos.length
      ? raw.servicos
      : Array.isArray(items[0]?.services)
        ? items[0].services
        : [];
  const servicos = services.map((s: any) => ({
    id: s.id || "",
    nome: s.name || s.nome || "",
    name: s.name || s.nome || "",
    preco: Number(s.price != null ? s.price : s.preco) || 0,
    price: Number(s.price != null ? s.price : s.preco) || 0,
    descricao: s.description || s.descricao || "",
  }));
  const total = raw.pricing?.total ?? raw.precoTotal ?? 0;
  const clientId = raw.clientId
    ? String(typeof raw.clientId === "object" ? raw.clientId._id || raw.clientId.id : raw.clientId)
    : raw.clienteId || null;
  const currentSectorId = raw.currentSectorId
    ? String(typeof raw.currentSectorId === "object" ? raw.currentSectorId._id : raw.currentSectorId)
    : raw.setorAtual || null;

  const plannedSectorIds = Array.isArray(raw.plannedSectorIds)
    ? raw.plannedSectorIds.map((s: any) => String(s?._id || s))
    : Array.isArray(raw.setoresFluxo)
      ? raw.setoresFluxo.map((s: any) => String(s?._id || s))
      : [];
  const sectorHistoryRaw = Array.isArray(raw.sectorHistory)
    ? raw.sectorHistory
    : Array.isArray(raw.setoresHistorico)
      ? raw.setoresHistorico
      : [];
  const setoresHistorico = adaptSectorHistory(sectorHistoryRaw);
  const statusHistory = adaptStatusHistory(raw.statusHistory, setoresHistorico);
  const acessorios = Array.isArray(raw.accessories || raw.acessorios)
    ? (raw.accessories || raw.acessorios)
        .map((a: any) => (typeof a === "string" ? a : a?.name || a?.nome || String(a?.id || "")))
        .filter(Boolean)
    : [];

  return {
    ...raw,
    id: String(raw.id || raw._id || ""),
    code,
    codigo: code,
    shoeModel,
    modeloTenis: shoeModel,
    photos,
    fotos: photos,
    services,
    servicos,
    items,
    itemCount: raw.itemCount ?? items.length,
    pricing: raw.pricing || { total },
    precoTotal: total,
    clientId,
    clienteId: clientId,
    clientName: raw.clientName || raw.client?.name || "",
    currentSectorId,
    setorAtual: currentSectorId,
    plannedSectorIds,
    setoresFluxo: plannedSectorIds,
    sectorHistory: sectorHistoryRaw,
    setoresHistorico,
    statusHistory,
    sectorPath: Array.isArray(raw.sectorPath)
      ? raw.sectorPath.map((s: any) => String(s?._id || s))
      : [],
    dueAt: raw.dueAt || null,
    dataPrevistaEntrega: raw.dueAt || raw.dataPrevistaEntrega || null,
    dataCriacao: raw.createdAt || raw.dataCriacao || null,
    createdAt: raw.createdAt || raw.dataCriacao || null,
    acessorios,
    accessories: acessorios,
    observacoes: raw.notes || raw.observacoes || "",
    client: raw.client ? adaptClient(raw.client) : raw.client,
  };
}

export function adaptEmployee(raw: any) {
  if (!raw) return raw;
  return {
    ...raw,
    id: String(raw.id || raw._id || ""),
    name: raw.name || raw.nome || "",
    nome: raw.name || raw.nome || "",
    phone: raw.phone || raw.telefone || null,
    telefone: raw.phone || raw.telefone || null,
    active: raw.active !== false && raw.ativo !== false,
    ativo: raw.active !== false && raw.ativo !== false,
  };
}

export function adaptMetricsOverview(raw: any) {
  if (!raw) return raw;
  // New EN shape
  if (raw.summary || raw.delays || raw.finance) {
    return {
      resumo: adaptMetricsSummary(raw.summary),
      atrasos: adaptMetricsDelays(raw.delays),
      financeiro: adaptMetricsFinance(raw.finance),
      funcionarios: adaptMetricsEmployees(raw.employees),
      // also keep EN
      summary: raw.summary,
      delays: raw.delays,
      finance: raw.finance,
      employees: raw.employees,
    };
  }
  return raw;
}

export function adaptMetricsSummary(s: any) {
  if (!s) return s;
  return {
    ...s,
    total: s.total,
    abertos: s.open ?? s.abertos,
    finalizados: s.completed ?? s.finalizados,
    atrasados: s.delayed ?? s.atrasados,
    noPrazo: s.onTime ?? s.noPrazo,
    taxaAtraso: s.delayRate ?? s.taxaAtraso,
    periodo: s.period
      ? {
          inicio: s.period.start,
          fim: s.period.end,
          referencia: s.period.label,
        }
      : s.periodo,
  };
}

export function adaptMetricsDelays(d: any) {
  if (!d) return d;
  return {
    ...d,
    totalAtrasados: d.totalDelayed ?? d.totalAtrasados,
    atrasoMedioMs: d.averageDelayMs ?? d.atrasoMedioMs,
    atrasoMedioHoras: d.averageDelayHours ?? d.atrasoMedioHoras,
    itens: (d.items || d.itens || []).map((i: any) => ({
      ...i,
      codigo: i.code || i.codigo,
      funcionarioAtual: i.assigneeEmployeeId ?? i.funcionarioAtual,
      dataPrevistaEntrega: i.dueAt || i.dataPrevistaEntrega,
      diasAtraso: i.daysLate ?? i.diasAtraso,
    })),
  };
}

export function adaptMetricsFinance(f: any) {
  if (!f) return f;
  const summary = f.summary || f.resumo;
  const today = f.today || f.caixaHoje;
  return {
    ...f,
    periodo: f.period
      ? { inicio: f.period.start, fim: f.period.end, referencia: f.period.label }
      : f.periodo,
    resumo: summary
      ? {
          totalPedidos: summary.totalOrders ?? summary.totalPedidos,
          pedidosFinalizados: summary.completedOrders ?? summary.pedidosFinalizados,
          pedidosEmAberto: summary.openOrders ?? summary.pedidosEmAberto,
          receitaPrevista: summary.expectedRevenue ?? summary.receitaPrevista,
          receitaRecebida: summary.receivedRevenue ?? summary.receitaRecebida,
          receitaPendente: summary.pendingRevenue ?? summary.receitaPendente,
          despesas: summary.expenses ?? summary.despesas,
          lucroPrevisto: summary.expectedProfit ?? summary.lucroPrevisto,
          lucroRealizado: summary.realizedProfit ?? summary.lucroRealizado,
          margemPrevista: summary.expectedMargin ?? summary.margemPrevista,
          ticketMedio: summary.averageTicket ?? summary.ticketMedio,
        }
      : f.resumo,
    receitaPorStatus: (f.revenueByStatus || f.receitaPorStatus || []).map((r: any) => ({
      status: r.status,
      pedidos: r.orders ?? r.pedidos,
      receitaPrevista: r.expectedRevenue ?? r.receitaPrevista,
      receitaRecebida: r.receivedRevenue ?? r.receitaRecebida,
    })),
    topServicos: (f.topServices || f.topServicos || []).map((t: any) => ({
      servico: t.service || t.servico,
      pedidos: t.orders ?? t.pedidos,
      receita: t.revenue ?? t.receita,
    })),
    evolucaoDiaria: (f.dailyEvolution || f.evolucaoDiaria || []).map((e: any) => ({
      data: e.date || e.data,
      pedidos: e.orders ?? e.pedidos,
      receitaPrevista: e.expectedRevenue ?? e.receitaPrevista,
      receitaRecebida: e.receivedRevenue ?? e.receitaRecebida,
    })),
    caixaHoje: today
      ? {
          data: today.date || today.data,
          entregueHoje: today.deliveredToday ?? today.entregueHoje ?? 0,
          entreguesCount: today.deliveredCount ?? today.entreguesCount ?? 0,
          sinaisHoje: today.depositsToday ?? today.sinaisHoje ?? 0,
          sinaisCount: today.depositsCount ?? today.sinaisCount ?? 0,
          aReceberProntos: today.readyToCollect ?? today.aReceberProntos ?? 0,
          prontosCount: today.readyCount ?? today.prontosCount ?? 0,
          aReceberAbertos: today.openPipeline ?? today.aReceberAbertos ?? 0,
          abertosCount: today.openCount ?? today.abertosCount ?? 0,
          entradaHoje: today.cashInToday ?? today.entradaHoje ?? 0,
        }
      : f.caixaHoje,
  };
}

function adaptMetricsEmployees(e: any) {
  if (!e) return e;
  return {
    ...e,
    periodo: e.period
      ? { inicio: e.period.start, fim: e.period.end, referencia: e.period.label }
      : e.periodo,
    topFuncionariosPorPedidos: (e.topByOrders || e.topFuncionariosPorPedidos || []).map((t: any) => ({
      funcionarioNome: t.employeeName || t.funcionarioNome,
      pedidosComParticipacao: t.ordersParticipated ?? t.pedidosComParticipacao,
      pedidosFinalizados: t.ordersCompleted ?? t.pedidosFinalizados,
    })),
    topFuncionariosMaisRapidos: e.topBySpeed || e.topFuncionariosMaisRapidos || [],
  };
}

export function adaptDepartmentRow(r: any) {
  if (!r) return r;
  return {
    ...r,
    setorId: r.sectorId || r.setorId,
    setorNome: r.sectorName || r.setorNome,
    total: r.total,
  };
}

export function adaptEmployeeMetricRow(r: any) {
  if (!r) return r;
  return {
    ...r,
    funcionarioNome: r.employeeName || r.funcionarioNome,
    total: r.total,
  };
}
