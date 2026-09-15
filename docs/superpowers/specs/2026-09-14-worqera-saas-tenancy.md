# Worqera SaaS — Tenancy, trial, roles e go-to-market

**Atualizado:** 2026-09-14  
**Objetivo:** explicar, de forma linear, como controlar empresas no Worqera, logins no contexto de cada oficina, permissões por role/setor, e a melhor forma de crescer (trial vs subdomínio).

---

## Em uma frase

Cada oficina é um **Shop**. Pessoas entram com **User + Membership**. Elas usam **7 dias grátis** e depois pagam. Você controla tudo por `shopId` + billing + (depois) um painel super-admin — **sem** precisar de subdomínio por empresa no início.

---

## 1. Conceitos (ler primeiro)

| Conceito | O que é | Exemplo |
|----------|---------|---------|
| **Shop** | A empresa/oficina (tenant) | “Oficina do João”, Casa do Tênis |
| **User** | Pessoa com login (e-mail/senha) | joao@oficina.com |
| **Membership** | Vínculo user ↔ shop + role | João é `owner` da oficina |
| **Sector** | Coluna do kanban / “departamento” | Pintura, Lavagem |
| **Employee** | Nome operacional no chão (sem login) | “Carlos – pintura” |
| **Subscription** | Trial / pago / bloqueado | `trialing` → `active` |

**Regra de ouro:**  
- Quem **entra no sistema** = Membership.  
- Quem **aparece no card** = Employee (pode ser a mesma pessoa no futuro, mas são coisas diferentes hoje).

Isolamento de dados = campo **`shopId`** em tudo (Mongo compartilhado). Não é um banco por empresa.

---

## 2. Decisão de produto (já recomendada)

| Tema | Decisão | Por quê |
|------|---------|---------|
| Como empresas entram | **Self-serve** em `/signup` | Escala sozinho |
| Trial | **7 dias** (`trialing`) | Já está no design e no código |
| Depois do trial | **Pagar (AbacatePay)** ou fica só auth + billing | Evita uso eterno de graça |
| URL | **Um app** (`app.worqera.com`) + `shop.slug` interno | Simples de operar |
| Subdomínio por oficina | **Não** no lançamento | DNS/SSL/cookies sem ganho real agora |
| Seu controle | Super-admin + suspender/estender trial + billing | Controle sem matar aquisição |

### O que *não* fazer agora

- Banco separado por empresa  
- Subdomínio obrigatório (`oficina.worqera.com`) como base  
- Misturar funcionário de chão com conta de login  
- Dezenas de roles (`pintura`, `costura`…) — use `sector` + lista de setores  
- Trial infinito sem gate

---

## 3. Como uma empresa entra no Worqera

### Porta A — Self-serve (principal)

```
1. Dono acessa /signup
2. Informa: nome, e-mail, senha, nome da oficina
3. Sistema cria:
   - User
   - Shop (slug único)
   - Membership role = owner
   - Subscription status = trialing (7 dias)
4. Entra no app no contexto daquela oficina
5. No dia 8 sem pagamento → bloqueio (só billing/login)
6. Paga via AbacatePay → status = active → ops liberadas
```

### Porta B — Parceria / convite (você controla)

- Você gera um **invite** ou cria o Shop manualmente.  
- Bom para Casa do Tênis, influenciadores, “fechamos parceria”.  
- Mesmo modelo de dados; só muda *quem* dispara a criação.

### Porta C — Super-admin Worqera (vocês)

Painel interno (só time Worqera):

- Listar shops  
- Ver trial / status de pagamento  
- Estender trial  
- Suspender oficina  
- (depois) impersonar com cuidado  

---

## 4. Login “dentro da empresa”

Não precisa de login diferente por oficina.

1. Pessoa faz login com e-mail/senha.  
2. API resolve as **memberships** dela.  
3. Request operacional carrega o **shop ativo** (`X-Worqera-Shop` ou membership padrão).  
4. Se só tem 1 oficina → some o seletor.  
5. Se tem N (raro) → “Trocar oficina”.

### Convidar o time

Owner/admin adiciona membros:

| Campo | Exemplo |
|-------|---------|
| E-mail + senha (ou convite) | maria@oficina.com |
| Role | `admin`, `atendimento` ou `sector` |
| Se `sector` | quais `sectorIds` ela vê |

API já tem base: `POST /shops/current/members` (add/patch). Falta polir a UI “Equipe”.

---

## 5. Permissionamento (roles)

### Tabela de roles

| Role | Vê no kanban | Pode mover | Configura oficina | Billing |
|------|--------------|------------|-------------------|---------|
| **owner** | Tudo | Qualquer setor | Sim (tudo) | Sim |
| **admin** | Tudo | Qualquer setor | Sim (quase tudo) | Sim |
| **atendimento** | Tudo operacional | Livre | Não settings críticos | Não |
| **sector** | Só filas em `sectorIds` | Encaminhar às cegas* | Não | Não |

\*Conta `sector`: **vê** só a própria fila; no **detalhe do pedido** pode **encaminhar** para qualquer setor ativo (lista de nomes, sem ver cards lá). Origem deve ser um setor permitido. Histórico grava quem/quando/`action: forward`. Spec: [sector-blind-forward](./2026-09-14-worqera-sector-blind-forward.md).

### “Departamento” = Sector

No Worqera, departamento de chão **é a coluna do kanban** (`Sector`), não um organograma paralelo.

```
Membership.role = "sector"
Membership.sectorIds = [costuraId]
→ kanban mostra só Costura (+ cards)
→ GET /kanban.forwardTargets = nomes de todos os setores (sem filas)
→ encaminhar Costura → Pintura = OK (action: forward + auditoria)
→ tentar mover pedido que não está em Costura = 403
```

### O que a API já tem vs o que falta

| Já existe | Próximo |
|-----------|---------|
| `Membership` + UI Equipe | Invite branding |
| Kanban filtrado + blind forward | AbacatePay produção |
| Nav/middleware para sector | — |

---

## 6. Trial 7 dias vs subdomínio — comparação

| Abordagem | Prós | Contras | Usar agora? |
|-----------|------|---------|-------------|
| Self-serve + trial + pagar | Cresce sozinho; padrão SaaS | Precisa anti-spam e gate | **Sim — padrão** |
| Só você cria shops | Controle total | Você vira gargalo | Só partners |
| Subdomínio por shop | “Parece white-label” | Complexo (DNS, cookie, SSL) | **Depois**, opcional |
| App único + slug | 1 deploy, simples | Branding no UI do shop | **Sim — default** |

**Resumo:** subdomínio não isola dado. Isolamento = `shopId`. Subdomínio é só “pele” (branding).

---

## 7. Como *você* controla as empresas

Checklist de controle (do mais barato ao mais sofisticado):

1. **Subscription** `trialing | active | expired | suspended`  
2. **Gate** em rotas ops (já existe `subscriptionGate`)  
3. **Banner trial** no front (já existe base)  
4. **1 shop por e-mail** no início (anti-abuso)  
5. **Rate-limit** no signup  
6. **Super-admin:** listar / estender / suspender  
7. **Billing** AbacatePay + webhook idempotente  
8. (Depois) e-mail verificado no signup  

---

## 8. Passos — roadmap prático

Leia de cima para baixo. Cada fase entrega valor sozinha.

### Fase 0 — Base (já em grande parte feita)

- [x] Signup cria User + Shop + Membership(owner)  
- [x] Subscription `trialing` 7 dias  
- [x] Isolamento por `shopId`  
- [x] Gate de subscription nas rotas ops  
- [ ] Conferir UX: pós-trial só billing (fechar gaps)

### Fase 1 — Controle Worqera + dinheiro (próximo)

1. **AbacatePay produção** — checkout + webhook → `active`  
2. **Bloqueio pós-trial** claro no web (mensagem + CTA pagar)  
3. **Super-admin mínimo** (só time Worqera):  
   - lista de shops  
   - status / trialEndsAt  
   - botão estender 7d  
   - suspender  
4. **UI Equipe** — owner convida admin / atendimento  
5. Anti-abuso básico (rate-limit signup, 1 shop/e-mail)

**Resultado:** você vende e controla oficinas sem criar subdomínio.

### Fase 2 — Conta por setor (A3) — permissionamento de verdade

1. Owner cria membership `role: sector` + escolhe setores  
2. Kanban filtrado para essa conta  
3. Move respeita regras RF-SEC  
4. Nav esconde Empresa/Admin para role sector  
5. Atendimento separado de admin (se ainda misturado)

**Resultado:** chão usa Worqera sem ver financeiro nem outras colunas.

### Fase 3 — Parcerias e white-label leve

1. Invite link / código de parceiro  
2. Branding do shop (nome, logo nas TVs/e-mail/etiqueta)  
3. Opcional: `slug.worqera.app` → mesmo app (CNAME)  
4. Seed de setores/serviços no onboarding (“assistente de setup”)

### Fase 4 — Depois (não priorizar agora)

- Multi-shop por usuário (franquia)  
- Planos por volume / seats  
- SSO  
- Impersonate auditado  
- White-label domínio próprio da oficina  

---

## 9. Fluxo visual (fim a fim)

```
                    ┌─────────────┐
                    │  /signup    │
                    └──────┬──────┘
                           │
              User + Shop + owner + trial 7d
                           │
                           ▼
                 ┌───────────────────┐
                 │  App da oficina   │
                 │  (shopId no JWT)  │
                 └─────────┬─────────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     Convida time    Configura setores   Usa kanban
     (memberships)   serviços, etc.      pedidos, TVs
           │
           ▼
   roles: admin | atendimento | sector(+sectorIds)
           │
           ▼
   Dia 8: se não pagou → só /billing
           │
           ▼
   AbacatePay OK → Subscription.active
           │
           ▼
   Vocês (super-admin): ver / estender / suspender
```

---

## 10. Checklist “estou pronto para SaaS?”

| Pergunta | Resposta alvo |
|----------|----------------|
| Empresa nova entra sozinha? | Sim, `/signup` |
| Dados de A vazam para B? | Não — tudo filtrado por `shopId` |
| Trial acaba e bloqueia? | Sim |
| Como pagam? | AbacatePay → webhook |
| Como o chão usa sem ver tudo? | Role `sector` + `sectorIds` |
| Preciso de subdomínio? | Não no v1 |
| Como eu “desligo” uma oficina? | `shop.status = suspended` ou sub expirada |
| Funcionário sem login? | Continua em `employees` |

---

## 11. Ordem sugerida de execução (próximos PRs)

1. Fechar **billing AbacatePay** + bloqueio trial (fase 1)  
2. **Super-admin** mínimo (fase 1)  
3. **UI Equipe** + convites (fase 1)  
4. **Conta setor** kanban filtrado (fase 2 / A3)  
5. Onboarding assistido + branding (fase 3)  
6. Subdomínio opcional só se um cliente grande pedir (fase 3+)

---

## 12. Ligação com o que já está no repo

| Spec / código | Relação |
|---------------|---------|
| [worqera-platform-design.md](./2026-09-14-worqera-platform-design.md) | Decisões originais (trial, AbacatePay, role sector) |
| `api/src/v1/services/authService.js` | Signup + trial |
| `api/src/v1/middleware/subscriptionGate.js` | Bloqueio se não trialing/active |
| `api/src/v1/models/Membership.js` | Roles + `sectorIds` |
| `api/src/v1/services/shopService.js` | add/patch members |
| `api/specs/roadmap.md` | A5 billing → A3 sector accounts |

---

## Resumo final

1. **Tenant = Shop**, login = User, permissão = Membership.  
2. **Cresça com trial 7d + pagamento**, não com subdomínio.  
3. **Controle** com billing + super-admin + suspend.  
4. **Chão** com role `sector` (fase A3).  
5. Subdomínio/white-label = opcional depois.

Quando for implementar, comece pela **Fase 1** deste doc.
