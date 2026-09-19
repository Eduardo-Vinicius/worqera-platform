# Worqera — Escala + alavanca de produto

**Data:** 2026-09-18  
**Status:** decisão de produto (execução contínua)

## Para onde escalar

O core não é “app de tênis”. É **fila operacional multi-setor + consulta pública + aviso ao cliente**. Escala por **mesmo loop, setores/itemLabel por empresa**.

### Camadas de escala (ordem)

| # | Camada | Como | Meta |
|---|--------|------|------|
| 1 | **Profundidade local** | Oficinas de calçados / sapataria / restauração (SP + ABC + Interior) | 50 lojas pagas ≈ R$10k MRR |
| 2 | **Adjacentes** | Lavanderia, costura/atelier, assistência técnica, bike, pet grooming | Mesmo kanban; só noun + setores |
| 3 | **Canal** | Atacadistas / fornecedores (cola, sola, químicos) indicam lojas | Indicação 1 mês |
| 4 | **Geo** | Repetir playbook cidade a cidade (não ads frio cedo) | Unidades por praça |
| 5 | **App** | Fases App-0…App-6 do AS-IS mirror | Paridade mobile |

Verticais candidatas: ver `2026-09-18-worqera-verticais-candidatas.md`.

### Starter Kits (feito)

Em Empresa → **Starter Kit**: Geral / Calçados / Lavanderia / Assistência. Aplica setores+serviços sugeridos; loja renomeia depois.

### O que **não** escalar agora

- ERP / NF-e / estoque  
- Cloud WhatsApp antes de 10+ lojas pedindo  
- App nativo antes do AS-IS espelhado (doc pronto)

---

## Feature diferenciadora (produtização)

### Nome de produto: **Worqera Status Pack** (“o cliente para de ligar”)

Não vender “kanban”. Vender um **pacote nomeado** que a loja liga em 1 tarde:

1. Setores dela (únicos)  
2. Etiqueta + QR  
3. Página pública brandada `/p/{slug}/{code}`  
4. Templates WhatsApp (criado / move / pronto)  
5. TV Cliente (opcional)  

**Pitch de 10s:** *“Seu cliente consulta o código e você avisa no Zap quando fica pronto — sem telefone o dia todo.”*

### Por que alavanca

| Problema de oficina | Status Pack |
|---------------------|-------------|
| Cliente liga o dia todo | Consulta + Zap |
| “Cadê meu pedido?” | TV + código |
| Cada loja é diferente | Setores 100% dela |
| Parece planilha | Produto com nome + onboarding |

### Como produtizar na UI (próximas entregas)

- Checklist/tour já aponta o Loop → renomear mentalmente para **Status Pack**  
- Em Empresa: toggle “Status Pack ativo” = WA enabled + link público copiável  
- LP: seção “Status Pack” com 3 prints (etiqueta, `/p`, Zap)  
- Pricing: Pro inclui Status Pack; Early = preço early

### Diferenciador #2 (fase seguinte)

**Starter Kits por vertical** (não trava setores): 1 clique aplica setores+serviços sugeridos (lavanderia / assistência / calçados), depois a loja edita tudo. Acelera onboarding sem matar unicidade.

---

## Métricas de alavanca (sexta)

- % lojas com WA enabled  
- % pedidos com pelo menos 1 clique Zap  
- % trials que imprimiram etiqueta  
- Trial → pago ≥ 40%  
- Indicações → trial  

---

## Relação com o app

O app nativo espelha o AS-IS web (doc `2026-09-18-worqera-app-asis-mirror.md`). O Status Pack no app = push + scanner + Avisar pronto com 1 polegar.
