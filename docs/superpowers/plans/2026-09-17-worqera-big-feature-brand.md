# Worqera — feature grande (com QWs em paralelo)

**Data:** 2026-09-17  
**Decisão:** enquanto as 3 lojas fecham/usam, **não** abrir Meta Cloud nem ERP.  
**Ataque:** **Branding da loja na experiência do cliente** (= white-label leve).

---

## Por quê esta (e não outra)

| Candidata | Veredito |
|-----------|----------|
| **Branding (logo + nome na consulta / TV / etiqueta)** | **Sim** — vira “meu sistema”, cliente final vê a marca, loja mostra no Zap → indicação |
| Convites equipe + onboarding self-serve | Já 70% feito (checklist); polish = QW, não épico |
| Financeiro / fechamento do mês | Digest + CSV já cobrem; tela extra só se **as 3** pedirem |
| WhatsApp Cloud (envio sozinho) | Adiar até ≥10 lojas pedirem “sem abrir o Zap” |
| App nativo / NF-e / estoque | Fora do norte |

Kanban já é o carro-chefe. Branding **amplifica** o que já existe na face do cliente (consulta + TV + etiqueta) sem reinventar o core.

---

## Como roda com QWs

```
Agora (você / ops)     │  Código (quando sobrar 1 sprint)
───────────────────────┼──────────────────────────────────
Deploy PRD + crons     │  Spec branding (este doc)
Msgs D-3/D-1 + PIX     │
Check-ins + 20 leads   │
Descoberta 3 lojas*    │  Se 2/3 confirmarem dor → build
                       │  Se pedirem outra dor #1 → pivota
```

\*Se nas calls a dor #1 for outra (ex.: impressão etiqueta / status no Zap), **pivota** — mas o plano de branding fica pronto e barato de retomar.

---

## Escopo da feature (entregue)

### In

1. **Empresa** — upload logo + URL + primary/accent + presets + preview live  
2. **Consulta pública** `/p/[shop]/[codigo]` — header brand + cores + WhatsApp  
3. **TV Cliente / TV Oficina** — logo + cor principal  
4. **Etiqueta** — logo + tinta QR/borda da marca  
5. **Shell SaaS** — logo na sidebar + CSS vars da loja  
6. **API** — `accentColor`, upload `/shops/current/logo`, arquivos públicos `shops/*/branding/`  
7. **QW** — `adminNote` em `/admin/shops`; checklist “logo e cores”

### Out (mantido)

- Temas/cores custom CSS livre  
- Domínio custom  
- App do cliente final  


---

## QWs que continuam (não param por causa do épico)

| QW | Dono |
|----|------|
| Deploy + crons + UptimeRobot | Ops |
| Converter 3 Early (PIX / Abacate) | Você |
| Early seats env a cada fechamento | Deploy web |
| Indicação `?ref=` + check-ins D7/D21 | Você |
| Nota interna em `/admin/shops` | Código curto se precisar |
| Loom 3 min no pós-signup | Você |

---

## Sequência

| Dia | Foco |
|-----|------|
| 0–2 | Deploy + crons + msgs conversão (QW) |
| 1–3 | Calls 30 min × 3 lojas (perguntas do plano 3-clients) |
| 4 | Go/no-go branding vs dor #1 real |
| 5–8 | Build branding (se go) **ou** a dor #1 |
| 9 | Case LP com print real da consulta brandada |

---

## Mensagem

Feature grande ≠ Meta API.  
Feature grande = **a loja se reconhece no produto que o cliente dela vê**.  
Isso vende renovação e indicação; QWs vendem o Early agora.
