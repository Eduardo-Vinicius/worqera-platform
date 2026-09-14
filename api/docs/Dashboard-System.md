# 📊 Sistema de Dashboard

## Visão Geral

Módulo de dashboard que fornece métricas, relatórios e análises em tempo real para gestão do negócio de reparos de calçados.

## Características Principais

- ✅ **Métricas em Tempo Real** - Vendas, pedidos, status
- ✅ **Gráficos Interativos** - Visualização de dados
- ✅ **Filtros Personalizáveis** - Por período, status, funcionário
- ✅ **Relatórios Automáticos** - PDF e Excel
- ✅ **Alertas e Notificações** - Pedidos atrasados, metas
- ✅ **Controle por Role** - Diferentes visões por permissão
- ✅ **Cache Otimizado** - Performance de consultas

## Estrutura de Permissões

### 👑 Admin
- Todas as métricas financeiras
- Relatórios completos de funcionários
- Configurações do sistema
- Dados históricos ilimitados

### 👨‍💼 Atendimento
- Métricas de pedidos e clientes
- Relatórios de atendimento
- Status de produção
- Dados dos últimos 6 meses

### 🧽 Lavagem / 🎨 Pintura
- Apenas métricas da própria área
- Pedidos atribuídos
- Metas pessoais
- Dados do mês atual

## Endpoints

### 📈 Dashboard Principal

#### `GET /dashboard`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Query Parameters:**
```
?periodo=30d         # 7d, 15d, 30d, 90d, 180d, 1y
&dataInicio=2024-01-01
&dataFim=2024-12-31
&funcionario=user-123  # Filtrar por funcionário (admin only)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2024-09-03",
      "fim": "2024-10-03",
      "dias": 30
    },
    "metricas": {
      "pedidos": {
        "total": 145,
        "novos": 23,
        "emAndamento": 87,
        "concluidos": 35,
        "crescimento": "+12.5%"
      },
      "receita": {
        "total": 18750.50,
        "media": 129.32,
        "meta": 20000.00,
        "percentualMeta": 93.8,
        "crescimento": "+8.7%"
      },
      "clientes": {
        "total": 89,
        "novos": 15,
        "retorno": 74,
        "taxa_retorno": 83.1,
        "crescimento": "+5.2%"
      },
      "produtividade": {
        "tempoMedioAtendimento": "6.5h",
        "pedidosNoPrazo": 92.3,
        "satisfacaoCliente": 4.7,
        "eficiencia": "+3.1%"
      }
    },
    "alertas": [
      {
        "tipo": "atraso",
        "titulo": "Pedidos Atrasados",
        "descricao": "5 pedidos com atraso na entrega",
        "prioridade": "alta",
        "link": "/pedidos?status=atrasado"
      },
      {
        "tipo": "meta",
        "titulo": "Meta Mensal",
        "descricao": "Faltam R$ 1.249,50 para atingir a meta",
        "prioridade": "media",
        "progresso": 93.8
      }
    ],
    "graficos": {
      "vendasDiarias": {
        "labels": ["2024-09-27", "2024-09-28", "..."],
        "datasets": [{
          "label": "Vendas (R$)",
          "data": [450.50, 720.30, 890.75, "..."],
          "backgroundColor": "#3B82F6"
        }]
      },
      "statusPedidos": {
        "labels": ["Em Atendimento", "Lavagem", "Pintura", "Entregue"],
        "datasets": [{
          "data": [23, 35, 19, 68],
          "backgroundColor": ["#F59E0B", "#3B82F6", "#8B5CF6", "#10B981"]
        }]
      }
    }
  }
}
```

### 💰 Métricas Financeiras

#### `GET /dashboard/financeiro`

**Autenticação:** Requerida  
**Permissões:** `admin`

**Query Parameters:**
```
?periodo=30d
&agruparPor=dia      # dia, semana, mes
&categoria=servico   # servico, funcionario, cliente
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resumo": {
      "receitaTotal": 18750.50,
      "receitaLiquida": 16875.45,
      "custos": 1875.05,
      "lucroLiquido": 15000.40,
      "margemLucro": 80.0,
      "ticketMedio": 129.32
    },
    "receitaPorServico": [
      {
        "servico": "Lavagem Completa",
        "quantidade": 45,
        "receita": 6750.00,
        "percentual": 36.0,
        "ticketMedio": 150.00
      },
      {
        "servico": "Pintura Personalizada",
        "quantidade": 28,
        "receita": 8400.00,
        "percentual": 44.8,
        "ticketMedio": 300.00
      },
      {
        "servico": "Lavagem Básica",
        "quantidade": 72,
        "receita": 3600.50,
        "percentual": 19.2,
        "ticketMedio": 50.00
      }
    ],
    "receitaPorFuncionario": [
      {
        "funcionario": "Maria Silva",
        "id": "user-123",
        "pedidos": 32,
        "receita": 4800.75,
        "comissao": 480.08,
        "percentual": 25.6
      },
      {
        "funcionario": "João Santos",
        "id": "user-456",
        "pedidos": 28,
        "receita": 4200.30,
        "comissao": 420.03,
        "percentual": 22.4
      }
    ],
    "evolucaoMensal": [
      {
        "mes": "2024-07",
        "receita": 15200.30,
        "pedidos": 98,
        "crescimento": 0
      },
      {
        "mes": "2024-08",
        "receita": 17450.75,
        "pedidos": 125,
        "crescimento": 14.8
      },
      {
        "mes": "2024-09",
        "receita": 18750.50,
        "pedidos": 145,
        "crescimento": 7.5
      }
    ]
  }
}
```

### 👥 Métricas de Clientes

#### `GET /dashboard/clientes`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resumo": {
      "clientesAtivos": 89,
      "clientesNovos": 15,
      "taxaRetencao": 83.1,
      "valorMedioVida": 485.75,
      "frequenciaMedia": 28.5
    },
    "segmentacao": [
      {
        "segmento": "VIP (>R$ 1000)",
        "quantidade": 12,
        "receita": 9200.40,
        "percentualReceita": 49.1,
        "ticketMedio": 766.70
      },
      {
        "segmento": "Regulares (R$ 300-1000)",
        "quantidade": 31,
        "receita": 6750.30,
        "percentualReceita": 36.0,
        "ticketMedio": 217.75
      },
      {
        "segmento": "Ocasionais (<R$ 300)",
        "quantidade": 46,
        "receita": 2799.80,
        "percentualReceita": 14.9,
        "ticketMedio": 60.86
      }
    ],
    "geografico": [
      {
        "cidade": "São Paulo",
        "clientes": 52,
        "receita": 11200.75,
        "percentual": 58.4
      },
      {
        "cidade": "Guarulhos",
        "clientes": 18,
        "receita": 3800.25,
        "percentual": 20.3
      },
      {
        "cidade": "Osasco",
        "clientes": 12,
        "receita": 2400.50,
        "percentual": 12.8
      }
    ],
    "comportamento": {
      "horariosPreferidos": [
        { "hora": "09:00", "pedidos": 23 },
        { "hora": "14:00", "pedidos": 31 },
        { "hora": "18:00", "pedidos": 28 }
      ],
      "diasSemana": [
        { "dia": "Segunda", "pedidos": 18 },
        { "dia": "Terça", "pedidos": 22 },
        { "dia": "Quarta", "pedidos": 25 },
        { "dia": "Quinta", "pedidos": 21 },
        { "dia": "Sexta", "pedidos": 28 },
        { "dia": "Sábado", "pedidos": 31 }
      ]
    }
  }
}
```

### 🏭 Métricas de Produção

#### `GET /dashboard/producao`

**Autenticação:** Requerida  
**Permissões:** `admin`, `atendimento`

**Query Parameters:**
```
?area=lavagem        # lavagem, pintura, all
&funcionario=user-123
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resumo": {
      "pedidosEmAndamento": 87,
      "pedidosConcluidos": 35,
      "tempoMedioExecucao": "5.8h",
      "eficienciaGeral": 94.2,
      "pedidosNoPrazo": 92.3
    },
    "porArea": [
      {
        "area": "Lavagem",
        "pedidosAtivos": 42,
        "pedidosConcluidos": 18,
        "funcionarios": 3,
        "tempoMedio": "3.2h",
        "eficiencia": 96.1,
        "fila": 8,
        "capacidadeDisponivel": "15%"
      },
      {
        "area": "Pintura",
        "pedidosAtivos": 25,
        "pedidosConcluidos": 12,
        "funcionarios": 2,
        "tempoMedio": "8.5h",
        "eficiencia": 91.7,
        "fila": 15,
        "capacidadeDisponivel": "5%"
      },
      {
        "area": "Atendimento",
        "pedidosAtivos": 20,
        "pedidosConcluidos": 5,
        "funcionarios": 2,
        "tempoMedio": "0.8h",
        "eficiencia": 97.3,
        "fila": 3,
        "capacidadeDisponivel": "40%"
      }
    ],
    "funcionarios": [
      {
        "id": "user-123",
        "nome": "Carlos Silva",
        "area": "Lavagem",
        "pedidosAtivos": 8,
        "pedidosConcluidos": 12,
        "tempoMedio": "2.9h",
        "eficiencia": 98.5,
        "meta": 15,
        "percentualMeta": 80.0
      }
    ],
    "gargalos": [
      {
        "area": "Pintura",
        "problema": "Fila acima da capacidade",
        "impacto": "Alto",
        "sugestao": "Considerar terceirização ou hora extra",
        "pedidosAfetados": 15
      }
    ],
    "previsoes": {
      "conclusaoFila": "2024-10-08",
      "capacidadeProximaSemana": "87%",
      "pedidosPrevistos": 42
    }
  }
}
```

### 📊 Relatórios Customizados

#### `GET /dashboard/relatorio`

**Autenticação:** Requerida  
**Permissões:** Baseado no tipo de relatório

**Query Parameters:**
```
?tipo=vendas         # vendas, clientes, producao, funcionarios
&formato=json        # json, pdf, excel
&periodo=30d
&detalhado=true      # Incluir dados detalhados
&email=user@email.com  # Enviar por email
```

**Response para formato JSON (200):**
```json
{
  "success": true,
  "data": {
    "relatorio": {
      "titulo": "Relatório de Vendas - Últimos 30 dias",
      "periodo": "03/09/2024 a 03/10/2024",
      "geradoEm": "2024-10-03T16:30:00.000Z",
      "geradoPor": "admin@shoerepair.com"
    },
    "resumoExecutivo": {
      "receitaTotal": 18750.50,
      "pedidosTotal": 145,
      "clientesUnicos": 89,
      "ticketMedio": 129.32,
      "crescimentoVendas": "+8.7%",
      "metaMensal": 93.8
    },
    "dadosDetalhados": {
      "vendasDiarias": [...],
      "topServicos": [...],
      "topClientes": [...],
      "funcionarios": [...]
    },
    "analises": [
      "Crescimento consistente nas vendas do mês",
      "Serviços de pintura personalizada em alta demanda",
      "Taxa de retenção de clientes acima da média do setor",
      "Oportunidade de expansão nos finais de semana"
    ],
    "recomendacoes": [
      "Considerar promoção para serviços básicos",
      "Investir em capacitação da equipe de pintura",
      "Implementar programa de fidelidade para clientes VIP",
      "Ampliar horário de funcionamento aos sábados"
    ]
  }
}
```

**Response para PDF/Excel:**
```json
{
  "success": true,
  "data": {
    "arquivo": {
      "nome": "relatorio-vendas-20241003.pdf",
      "url": "https://s3.amazonaws.com/shoe-repair/reports/relatorio-vendas-20241003.pdf",
      "tamanho": "2.5MB",
      "validade": "2024-10-10T16:30:00.000Z"
    },
    "emailEnviado": true,
    "destinatario": "user@email.com"
  }
}
```

### 🔔 Alertas e Notificações

#### `GET /dashboard/alertas`

**Autenticação:** Requerida  
**Permissões:** Todas

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alertas": [
      {
        "id": "alert-001",
        "tipo": "atraso",
        "titulo": "Pedidos Atrasados",
        "descricao": "5 pedidos com atraso na entrega",
        "prioridade": "alta",
        "area": "producao",
        "dataCriacao": "2024-10-03T14:30:00.000Z",
        "visto": false,
        "link": "/pedidos?status=atrasado",
        "dados": {
          "pedidosAfetados": 5,
          "clientesAfetados": 4,
          "receitaEmRisco": 750.50
        }
      },
      {
        "id": "alert-002",
        "tipo": "meta",
        "titulo": "Meta Mensal",
        "descricao": "93.8% da meta mensal atingida",
        "prioridade": "media",
        "area": "vendas",
        "dataCriacao": "2024-10-03T09:00:00.000Z",
        "visto": true,
        "progresso": 93.8,
        "dados": {
          "metaTotal": 20000.00,
          "atingido": 18750.50,
          "faltante": 1249.50,
          "diasRestantes": 28
        }
      },
      {
        "id": "alert-003",
        "tipo": "capacidade",
        "titulo": "Área de Pintura Saturada",
        "descricao": "95% da capacidade utilizada",
        "prioridade": "alta",
        "area": "producao",
        "dataCriacao": "2024-10-03T11:15:00.000Z",
        "visto": false,
        "dados": {
          "capacidadeAtual": 95,
          "filaEspera": 15,
          "tempoEstimadoFila": "3 dias"
        }
      }
    ],
    "configuracoes": {
      "alertasAtivos": true,
      "emailNotificacoes": true,
      "whatsappNotificacoes": false,
      "frequenciaResumo": "diario"
    }
  }
}
```

### ⚙️ Configurações Dashboard

#### `PUT /dashboard/configuracoes`

**Autenticação:** Requerida  
**Permissões:** `admin`

**Body:**
```json
{
  "alertas": {
    "pedidosAtrasados": true,
    "metasVendas": true,
    "capacidadeProducao": true,
    "limiteAtraso": 24,
    "limiteSaturacao": 90
  },
  "notificacoes": {
    "email": true,
    "whatsapp": false,
    "frequencia": "diario",
    "horario": "09:00"
  },
  "relatorios": {
    "autoGerarMensal": true,
    "enviarPorEmail": true,
    "destinatarios": ["admin@shoerepair.com", "gerente@shoerepair.com"]
  },
  "cache": {
    "duracao": 300,
    "ativo": true
  }
}
```

## 🎯 Métricas por Role

### Dashboard Admin:

```javascript
const dashboardAdmin = {
  metricas: [
    'receita_total', 'lucro_liquido', 'margem_lucro',
    'pedidos_total', 'clientes_novos', 'taxa_retencao',
    'produtividade_funcionarios', 'custos_operacionais',
    'metas_vendas', 'comparativo_anual'
  ],
  alertas: [
    'pedidos_atrasados', 'metas_nao_atingidas',
    'capacidade_saturada', 'custos_elevados',
    'funcionarios_abaixo_meta'
  ],
  relatorios: [
    'vendas_completo', 'financeiro_completo',
    'funcionarios_completo', 'clientes_completo'
  ]
};
```

### Dashboard Atendimento:

```javascript
const dashboardAtendimento = {
  metricas: [
    'pedidos_total', 'pedidos_novos', 'pedidos_concluidos',
    'clientes_atendidos', 'tempo_medio_atendimento',
    'satisfacao_cliente', 'receita_gerada'
  ],
  alertas: [
    'pedidos_atrasados', 'clientes_insatisfeitos',
    'fila_atendimento_longa'
  ],
  relatorios: [
    'atendimento_diario', 'clientes_mes',
    'pedidos_status'
  ]
};
```

### Dashboard Produção:

```javascript
const dashboardProducao = {
  metricas: [
    'pedidos_area', 'tempo_medio_execucao',
    'pedidos_concluidos_dia', 'fila_trabalho',
    'eficiencia_pessoal', 'meta_diaria'
  ],
  alertas: [
    'pedidos_atrasados_area', 'meta_diaria_risco',
    'problemas_qualidade'
  ],
  relatorios: [
    'producao_diaria', 'eficiencia_pessoal',
    'pedidos_area'
  ]
};
```

## 📱 WebSocket para Tempo Real

### Implementação:

```javascript
// Cliente WebSocket
const socket = new WebSocket('wss://api.shoerepair.com/dashboard/ws');

socket.onmessage = (event) => {
  const dados = JSON.parse(event.data);
  
  switch(dados.tipo) {
    case 'novo_pedido':
      atualizarContadorPedidos(dados.data);
      exibirNotificacao('Novo pedido recebido!');
      break;
      
    case 'pedido_concluido':
      atualizarMetricasReceita(dados.data);
      break;
      
    case 'alerta_atraso':
      exibirAlerta(dados.data);
      break;
      
    case 'meta_atingida':
      exibirComemoracao(dados.data);
      break;
  }
};

// Inscrever em canais específicos
socket.send(JSON.stringify({
  action: 'subscribe',
  channels: ['pedidos', 'alertas', 'metas']
}));
```

### Eventos Disponíveis:

| Evento | Descrição | Dados |
|--------|-----------|-------|
| `novo_pedido` | Pedido criado | `{ pedidoId, valor, cliente }` |
| `pedido_concluido` | Pedido finalizado | `{ pedidoId, valor, tempo }` |
| `alerta_atraso` | Pedido atrasado | `{ pedidoId, diasAtraso }` |
| `meta_atingida` | Meta alcançada | `{ tipo, valor, percentual }` |
| `funcionario_login` | Funcionário entrou | `{ userId, area }` |
| `sistema_manutencao` | Manutenção programada | `{ inicio, fim, motivo }` |

## 🔧 Cache e Performance

### Estratégia de Cache:

```javascript
const cacheConfig = {
  dashboard_principal: {
    ttl: 300, // 5 minutos
    chaves: ['user_role', 'periodo', 'funcionario']
  },
  metricas_financeiras: {
    ttl: 900, // 15 minutos
    chaves: ['periodo', 'categoria']
  },
  relatorios: {
    ttl: 3600, // 1 hora
    chaves: ['tipo', 'periodo', 'parametros']
  }
};

// Invalidação automática
const invalidarCache = {
  eventos: [
    'novo_pedido', 'pedido_atualizado',
    'cliente_criado', 'funcionario_acao'
  ],
  areas: [
    'dashboard_principal', 'metricas_financeiras'
  ]
};
```

---

**Arquivos Relacionados:**
- `src/controllers/dashboardController.js`
- `src/services/dashboardService.js`
- `src/routes/dashboardRoutes.js`
- `src/services/analyticsService.js`
- `src/utils/cacheManager.js`
- `src/utils/reportGenerator.js`