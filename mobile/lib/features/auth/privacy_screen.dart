import 'package:flutter/material.dart';

import '../../brand/theme.dart';
import '../../design/ui.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Privacidade',
      subtitle: 'O que o Worqera guarda',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('O Worqera é a ferramenta da empresa. Quem opera o app vê os dados da própria oficina.', style: TextStyle(color: context.wqInk, height: 1.4)),
          const SizedBox(height: 12),
          const _Block('Conta', 'Nome, e-mail e senha. A senha fica só como hash. Sair invalida a sessão neste aparelho e nos outros: o token de acesso e o de renovação deixam de valer.'),
          const _Block('Clientes da oficina', 'Nome, telefone, e-mail, CPF e endereço que a equipe cadastra para o pedido. Na lista, o CPF aparece só com os dois últimos dígitos.'),
          const _Block('Pedidos', 'Itens, valores, fotos do serviço e o andamento no kanban. As fotos ficam ligadas ao pedido da empresa.'),
          const _Block('Consulta do cliente', 'O link público é /p/o/ e um código opaco. Não leva o nome da empresa na barra de endereço. A página mostra o primeiro nome do cliente e o telefone da oficina, para ele saber com quem fala.'),
          const _Block('Localização', 'Este app não lê a localização do aparelho.'),
          const _Block('Apagar', 'A equipe remove cliente e pedido dentro da oficina. Para encerrar a conta de quem faz login, use Sair e peça ao dono da empresa.'),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block(this.title, this.body);
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(body, style: TextStyle(color: context.wqMuted, height: 1.35)),
        ]),
      ),
    );
  }
}
