# Worqera — Produto aberto + Fase 3 + casa da empresa

**Data:** 2026-09-14  
**Status:** approved / implementing
**Marca plataforma:** Worqera (principal)  
**Marca tenant:** Empresa (nome + slug) — “em casa” no produto e nos e-mails

---

## 1. Objetivo

Fechar o que ainda está aberto no produto SaaS e a **Fase 3** (white-label leve), com:

1. Empresa sentindo-se em casa (nome/slug em UI, e-mails, TVs, etiqueta)
2. Tokens visuais alinhados a [worqera.com](https://worqera.com)
3. Dashboard profissional + tema claro/escuro
4. TOP-10 TV settings, TOP-06 WhatsApp (`wa.me` only), partner code
5. E-mail via **Gmail App Password** em prod (estilo Procedy)
6. **AbacatePay desligado** em prod por ora (billing manual / platform extend)

**Fora deste ciclo:** Cloud API Meta, CNAME `slug.worqera.app`, impersonate, multi-shop, AbacatePay real.

---

## 2. Decisões de produto

| Tema | Decisão |
|------|---------|
| Hierarquia de marca | **Worqera** = plataforma; **Empresa** = protagonista no dia a dia |
| Nome da empresa | `Shop.name` + `branding.displayName` (fallback `name`) |
| Slug | frase/URL da empresa (`Shop.slug`); editável em Empresa com unicidade |
| E-mails | From: `"{displayName} via Worqera" <gmail>`; Subject começa com `[displayName]` |
| Pagamento | `WORQERA_AbacatePay__Enabled=false` → UX “fale conosco / trial estendido”; sem 503 agressivo |
| WhatsApp | Opt-in + templates + `wa.me` (sem Meta) |
| Tema | Claro / escuro / sistema; toggle no header; `next-themes` já no repo |
| Subdomínio | Não neste ciclo |

---

## 3. Brand tokens (worqera.com → app)

Extraído do CSS de produção do site:

| Token | Site | Uso no app |
|-------|------|------------|
| Deep | `#4F0FA0` / `#4F0FA6` | Gradientes, chart |
| Brand | `#7D26DE` | Primary / logo / nav active |
| Accent | `#AE50FD` | Highlights, dark primary soft |
| Ink dark | `#110F17` | Dark `--background` |
| Card dark | `#161222` | Dark surfaces |
| Border dark | `#2B2142` | Dark borders |
| Success | `#00C758` | KPIs positivos |
| Font | **Inter** (+ Geist Mono opcional) | UI app-wide |
| Light paper | `#F7F7F7` / `#FAFAFA` | Light background (alinhar `--wq-paper`) |

**Nota:** o app hoje usa lilac `#7C6CF0` + teal `#0D9488`. Neste ciclo:

- Primary → `#7D26DE` (site)
- Teal operacional pode permanecer como **action** secundário **ou** migrar para verde `#00C758` em KPIs — preferência: manter teal só em CTAs de chão se já habituados; primary = roxo site
- Dark mode deixa de ser “baseline morto”: tokens `--wq-*` espelhados em `.dark`

---

## 4. Modelo de dados (`Shop`)

```text
Shop {
  name, slug, status
  branding: {
    displayName, emailFromName, legacyBrand,
    phone, address, logoUrl?,
    primaryColor?   // default #7D26DE; opcional override leve
  }
  tvSettings: {
    client: { title?, showLogo?, tilesPerPage?, refreshMs?, carouselMs? }
    floor:  { title?, sectorIds?[], hotOnlyDefault?, overdueHours?, refreshMs? }
  }
  notifications: {
    whatsapp: {
      enabled: boolean
      shopPhoneE164?: string
      templates?: { ready?, moved?, created?, publicLink? }  // strings com {{code}} {{client}} {{link}} {{sector}}
    }
  }
  partnerCode?: string  // unique sparse; signup ?ref=
  onboarding, timezone  // existentes
}
```

`Client`: `whatsappOptIn: boolean` (default false).

---

## 5. Superfícies

### 5.1 Empresa (`/settings/empresa`)

- Nome da empresa, **slug** (preview `worqera…/p/{slug}/…`), displayName, telefone, endereço
- Logo upload → `branding.logoUrl`
- Partner code (mostrar / regenerar)
- Copy: “Isso aparece nos e-mails e nas TVs — o cliente vê **sua** empresa”

### 5.2 E-mails (mailer)

- Preferência: Gmail SMTP quando `WORQERA_Email__Enabled=true` + user/password
- From name: `branding.emailFromName || branding.displayName || shop.name` + sufixo ` via Worqera` no rodapé
- Subject: `[NomeEmpresa] …`
- HTML: header com nome/logo da empresa; footer “Enviado pela Worqera”
- Fluxos: reset, invite, recibo billing (stub), digest atraso

### 5.3 TOP-10 — `/settings/tv`

- Config Cliente / Chão persistida em `tvSettings`
- TVs leem shop atual + branding (logo + displayName); sem hardcode “Worqera” como título principal (Worqera fica discreto no rodapé)

### 5.4 TOP-06 — Comunicação

- Toggle shop WhatsApp + telefone + templates editáveis
- Opt-in no cliente (e no formulário de pedido se possível)
- Botão “WhatsApp” no detalhe do pedido → `https://wa.me/{phone}?text=…`

### 5.5 Partner code

- Gerado no signup (ou sob demanda)
- `POST /auth/signup` aceita `partnerCode` / query `ref` → grava atribuição (campo `Shop.referredByPartnerCode` ou similar)
- Não cria shop pelo código; só atribuição / analytics leve

### 5.6 Onboarding

- Botão “Aplicar catálogo padrão” (serviços seed) além de setores já criados no signup

### 5.7 Billing sem Abacate

- Env `WORQERA_AbacatePay__Enabled=false` (default prod example)
- Checkout retorna `{ provider: 'manual', configured: false }` + mensagem amigável
- `/billing`: CTA “Falar com a Worqera” / WhatsApp suporte; platform admin continua estendendo trial

### 5.8 Dashboard

Hoje: KPIs + lista fraca. Alvo:

- Hero com **nome da empresa** + saudação + trial chip
- Grade de KPIs com contraste/tema (abertos, atrasados, prontos, por setor)
- Fila quente (atrasados / próximos do prazo) com deep-link kanban/pedido
- Atalhos densos: Novo pedido, Kanban, Consultas, TVs, Equipe
- Distribuição por setor (barras simples)
- Empty states úteis (não página em branco)

### 5.9 Tema claro / escuro

- `ThemeProvider` no root layout (`attribute="class"`, `defaultTheme="system"`, `enableSystem`)
- Toggle no `AppHeader` (Sol / Lua / Sistema)
- Completar variáveis `--wq-*` em `.dark` alinhadas ao site (`#110F17`, `#161222`, `#AE50FD`)
- Persistência via `next-themes` (localStorage)

---

## 6. Env (estilo Procedy)

Arquivos:

- `api/.env.example` — local (Gmail opcional comentado)
- `api/.env.prod.example` — prod (chmod 600, não commitar `.env.prod`)
- Opcional `web/.env.prod.example` — `NEXT_PUBLIC_API_URL`, etc.

Variáveis e-mail (alinhar mailer):

```bash
WORQERA_Email__Enabled=true
WORQERA_Email__FromName=Worqera
WORQERA_Email__FromAddress=seu@gmail.com
WORQERA_Email__Smtp__Host=smtp.gmail.com
WORQERA_Email__Smtp__Port=587
WORQERA_Email__Smtp__Username=seu@gmail.com
WORQERA_Email__Smtp__Password=xxxx-xxxx-xxxx-xxxx   # App Password
# aliases aceitos: GMAIL_USER / GMAIL_APP_PASSWORD
```

AbacatePay:

```bash
WORQERA_AbacatePay__Enabled=false
# ApiKey/ProductId só quando reativar
```

### Como gerar App Password (Gmail)

1. [myaccount.google.com/security](https://myaccount.google.com/security) → 2FA on  
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)  
3. Mail → Outro → `Worqera` → copiar 16 chars sem espaços  
4. Colar em `.env.prod` → `chmod 600` → restart API  

Preferir conta dedicada `noreply@…` / Workspace a médio prazo.

---

## 7. Ordem de implementação

1. Env + mailer Gmail-first + Abacate disabled soft UX  
2. Shop branding (schema + Empresa + e-mails com nome empresa)  
3. Tokens CSS site + tema claro/escuro + toggle  
4. Dashboard profissional + empresa no shell  
5. TOP-10 TV settings  
6. TOP-06 wa.me + opt-in  
7. Partner code + seed catálogo onboarding  
8. Specs roadmap/backlog/change-log  

---

## 8. Critérios de aceite

- [ ] Prod sobe com `.env.prod` só Gmail + Abacate off; e-mails saem com subject `[Empresa]`
- [ ] Empresa edita nome/slug; slug aparece em links públicos e e-mails
- [ ] Logo (se houver) em TV / etiqueta / e-mail
- [ ] Toggle tema funciona e persiste; dark alinhado ao site
- [ ] Dashboard não parece vazio: KPIs + fila + atalhos + setores
- [ ] `/settings/tv` altera TV Cliente/Chão
- [ ] WhatsApp abre `wa.me` com template; respeita opt-in
- [ ] Partner code no signup `?ref=`
- [ ] Sem checkout Abacate real; billing explica caminho manual

---

## 9. Self-review

- Sem placeholders TBD críticos  
- Escopo Phase 4 (impersonate, CNAME) explicitamente fora  
- Contradictions: primary color shop override é opcional — se ausente, usa token Worqera  
- Ambiguity: “espalhar nome no site” = app autenticado + e-mails + TVs + etiqueta + `/p/{slug}`; **não** rebrand do marketing worqera.com  
