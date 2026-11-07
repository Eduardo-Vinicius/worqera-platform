# Web × app

Atualizado em 07/11/2026. O app chama a mesma API, então números, regras por papel (dono, admin, atendimento, setor) e textos da IA são os mesmos do site.

| Web | App | Nota |
| --- | --- | --- |
| Login, cadastro, esqueci a senha | Iguais | O link de redefinir senha do e-mail abre no site. No iPhone tem também "Continuar com a Apple" |
| Visão geral ("Operação de hoje", prateleira, pedidos recentes) | Igual | Toque nas ações do resumo abre a tela certa (pedidos, orçamentos, clientes/aniversariantes, prateleira, estoque) |
| Kanban | Kanban | Chips, uma coluna, setas, entregar com saldo |
| Pedidos (abas, Aberto por, recuperados) | Pedidos | `/orders?tab=` abre direto na aba. Abas Recusados e Recuperados; Finalizados = entregues |
| Novo / editar pedido | Três passos | Cliente, item, pagamento; modo "eu produzo" |
| Avisar cliente + Melhorar com IA | Igual | Folha "Avisar" no pedido |
| Orçamentos (tela única) | Igual | No celular o funil filtra por etapa em vez de arrastar. Esfriando, tempo até recuperar, por que perdemos e valor por etapa; Recuperados com "Depois da recuperação" e "O que mais funciona" |
| Clientes e CRM (abas, carregar mais, Voltaram, Quem volta) | Igual | Aba Voltaram (voltou após N dias, voltou depois de sumir) e painel Quem volta na Base |
| Ficha do cliente + Raio-X (IA) | Igual | Relacionamento (voltas, nota, orçamentos, saldo, serviços que mais faz) e Jornada (voltou após N dias, 1ª visita, recuperado) |
| Avaliações + resposta com IA | Igual | CSV vai para a área de transferência |
| WhatsApp e e-mail (Comunicação) | Igual, numa tela só | Conectar o WhatsApp oficial abre o cadastro da Meta no navegador |
| Financeiro + cobrança com IA | Igual | Só dono e admin. Líquido, gráfico recebido × vendido, serviços com fatia, dinheiro em cada setor, maiores pedidos, melhores clientes, quem mais vendeu, leitura da semana |
| Métricas, Atendimento (quem abriu) | Iguais | Atendimento: CSV para a área de transferência |
| Produtos e estoque, repor estoque | Igual | |
| Configuração (empresa, ramo e kits, marcas, serviços, acessórios, setores, equipe, funcionários) | Mais | |
| Plano | Mais | Pagamento abre o navegador. No iPhone não aparece (regra da Apple) |
| Portal da plataforma | Mais | Só admin da plataforma |
| QR da etiqueta | Aba QR | `/p/o/{token}` e `/p/{slug}/{code}`; lanterna; pausa depois de ler |
| Excluir conta (`/excluir-conta`) | Mais › Excluir minha conta | Exigência da App Store e da Play Store |
| Telas da loja (TVs) | Ícone de TV no topo | O app copia o link; a TV abre no navegador da TV |
| Landing, etiqueta para imprimir, página pública do pedido | — | Ficam no site |

## Publicação nas lojas

O que já está no código: exclusão de conta no app e no site, manifesto de privacidade, URL de produção, ícone e splash, Apple Sign In, compras escondidas no iPhone e assinatura do Android por `key.properties`.

O que falta fazer fora do código:

- **Apple Developer:** ligar "Sign in with Apple" no App ID `com.worqera.worqeraMobile` e baixar de novo os perfis. Se o app usar outro bundle, colocar em `WORQERA_Apple__ClientIds` na API.
- **App Store Connect:** URL de privacidade `https://worqera.com/privacidade`; conta de teste para a revisão com uma loja de exemplo.
- **Play Console:** URL de exclusão de dados `https://worqera.com/excluir-conta`; formulário de segurança dos dados (e-mail, nome, fotos e conteúdo do pedido; nada para anúncios).
- **Android:** gerar a chave de upload e criar `mobile/android/key.properties` (`keyAlias`, `keyPassword`, `storeFile`, `storePassword`). Esse arquivo e a chave não vão para o git.
- **Ícone:** regerar com `python3 tool/render_icons.py && dart run flutter_launcher_icons && dart run flutter_native_splash:create`.
