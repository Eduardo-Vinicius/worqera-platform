# Admin Worqera espelhando o console do Procedy

Referência: `procedy-platform/web/src/features/admin/*` e `api/src/Procedy.Application/Admin/*`. A camada de coleta, métricas, insights, filas, análises e conta 360° já existe no Worqera (mesmo roteiro do Procedy). Este plano fecha a parte de console e operação.

## Mapa

| Procedy | Worqera | Situação |
|---|---|---|
| Menu do console em grupos + contador das filas | Menu Worqera com Visão geral · Métricas · Análises · Operação · Configuração e contador em Operação | feito |
| Visão geral: KPIs com link e série, saúde com componentes, insights com categoria/filtro/variação, pendências com SLA e atrasados, painel de assinaturas | `/admin/plataforma` | feito |
| Ações rápidas (liga/desliga no app, aviso rápido, erros e rotas lentas, selo rápido) | `/admin/acoes`: módulos e recursos, aviso rápido, entrar/estender teste, erros e rotas | feito |
| Painel de métricas (Tecnologia, Negócio, Veículos) | `/admin/metricas` (Tecnologia, Negócio, Produto) | existe |
| Erros e rotas (busca nos erros, todas as rotas) | `/admin/erros` com filtro por sistema | feito |
| Métricas do piloto (ritual de sexta) | `/admin/ritual` (7/30 dias: lojas, pedidos, laudos, avaliações, recuperados, testes e assinaturas) | feito |
| Produto / Mercado / Parceiros | `/admin/analises` Produto / Transações / Lojas | feito (Lojas com sinais, filtros, ordenação e detalhe) |
| Selos, Denúncias, Moderação | Filas de Operação (teste acabando, inadimplentes, onboarding, erros, avaliações ruins) | existe (o Worqera não tem selos por pedido nem denúncias públicas) |
| Contas + 360° + transferir e-mail | `/admin/contas` + 360° com atividade de 30 dias e **transferir e-mail** | feito |
| Empresas (CRM leve) | Oficinas (`/admin/shops`) | existe |
| Assinaturas (ativar manual) | `/admin/assinaturas`: lista, filtros, MRR e ações (plano, ativar manual, estender teste, cancelar) | feito |
| Parâmetros, Notícias | iguais | existe |
| RBAC | Admin por `PLATFORM_ADMIN_EMAILS` (o Procedy também não aplica permissões finas) | fora |
| Auditoria (só segurança no Procedy) | `/admin/auditoria`: toda ação de admin (loja, assinatura, parâmetros, aviso, transferência) | feito (vai além do Procedy) |

## Regras novas

- **Saúde 0–100** (igual ao Procedy):
  - Erro 5xx, com 20 ou mais chamadas: ≥5% −40, ≥2% −25, ≥1% −15, ≥0,5% −5.
  - p95: >2,5 s −25, >1 s −15, >500 ms −8.
  - Fora do ar −100. Degradado −10 por motivo, até −30.
  - Faixas: ≥90 Excelente, ≥75 Bom, ≥50 Atenção, abaixo disso Crítico.
- **Insights** ganham categoria: Crescimento, Confiabilidade, Ativação, Operação, Retenção, App, Regiões.
- **Filas** mostram `slaHours`, `overdueCount` e o item mais antigo.
- **Auditoria** em `platformaudits` (365 dias): quem, quando, ação, alvo, antes e depois.
- **Transferir e-mail:**
  - Precisa ser e-mail válido e não pode estar em uso.
  - Marca o e-mail como não confirmado e encerra todas as sessões.
  - Manda o link de criar senha e registra evento de segurança e auditoria.
