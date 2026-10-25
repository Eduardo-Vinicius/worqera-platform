# Worqera Landing — premium multi-ramo (2026-09-22)

**Atualizado:** 2026-10-25. A face pública vende a Worqera como **orquestrador da fila de pedidos**: kanban por setor, consulta e avaliações, CRM de orçamentos, WhatsApp, financeiro e análise, IA, equipe e TVs, produtos e estoque. Cada recurso tem página em `/recursos/[slug]` e o índice `/recursos` compara os planos e mostra o que está chegando. Prova com empresas reais, ramos com uso e o que a fila substitui. Logo, papel, ink e fontes não mudam. O app logado continua dizendo oficina.

## Recursos (2026-10-25)

- `/recursos`: grupos (Operação · Cliente e vendas · Gestão e inteligência), tabela Basic/Pro/Business e bloco "Chegando" (WhatsApp oficial em ativação com a Meta, app nas lojas). Produtos e venda no pedido estão no ar desde 2026-10-25.
- `/recursos/{kanban|orcamentos|whatsapp|cliente|financeiro|ia|equipe|produtos}`: hero com mini tela feita de texto (sem print), dores, passo a passo, o que vem junto, aviso "em breve" quando parte ainda não está no ar, FAQ, outros recursos e CTA.
- Textos em `components/landing/features-data.ts` (pt e en). Nada é prometido como pronto se ainda não está no ar: o WhatsApp oficial aparece como "em ativação".
- Home: hero "O orquestrador da fila de pedidos", 8 pilares com link, seção "Novo na Worqera" (CRM, WhatsApp, IA), planos e FAQ atualizados. Páginas de ramo ganham a faixa de recursos. Menu com "Recursos" e rodapé em colunas.

## Em uma frase

Landing minimal/premium que vende a **operação inteira** (pedido + produto + estoque + venda + aviso) para **empresas de vários ramos** — não “software de tênis”.

## Posicionamento

- **Produto:** fila multi-setor + consulta pública
- **Pitch:** a operação da empresa sob controle; o item muda (calçado, roupa, aparelho, veículo, peça, encomenda), o fluxo não
- **Sem wa.me** no produto (comercial Worqera no footer ok)
- **Prova:** 1.000+ pedidos feitos na Worqera e R$ 200 mil+ gerados para os clientes
- **Parceiros:** Casa do Tênis, Sapataria Paulista, Axisbyte — empresas que operam, não a identidade do produto

## Estrutura

1. Header (Produto / Recursos / Quem usa / Ramos / Preço)
2. Hero — marca + operação inteira + CTA + filme do pedido
3. Prova — 1.000+ pedidos, R$ 200 mil+, vários ramos
4. Quem usa — relatos em rotação (Junior / Thiago / Eduardo) + cards
5. Ramos — cada card abre `/sapataria`, `/lavanderia`, `/assistencia`… com problema, passo a passo, setores e empresa
6. Substitui — caderno, grupo, planilha, ligação de status
7. Loop — Recebe → Fila → Cliente consulta
8. Na prática — mock kanban + consulta
9. Preço + FAQ curto + footer

## Visual

- Papel `#F6F4F0`, ink `#121212`, acento brand só em CTA
- Sem glow/gradient roxo
- Fontes: Instrument Sans + IBM Plex Sans

## Critérios

- Brand test no 1º viewport
- Multi-ramo se reconhece
- Zero grid de ícones / estrelas / browser chrome fake
