import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final name = TextEditingController();
  final shop = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String plan = 'pro';
  String? error;

  static const _plans = {
    'basic': ('Basic', 'R\$ 97', 'WORQERA_BASIC', 'A fila no ar esta semana.', 'Até 100 pedidos criados no mês.', ['Kanban por setores', 'Cliente consulta sozinho', 'TV da oficina']),
    'pro': ('Pro', 'R\$ 197', 'WORQERA_PRO', 'A oficina inteira, sem teto.', 'Pedidos sem limite neste plano.', ['Financeiro e métricas', 'TV financeiro', 'Marca, produtos e estoque']),
  };

  @override
  void initState() {
    super.initState();
    for (final field in [name, shop]) {
      field.addListener(() {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    name.dispose();
    shop.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  String get person {
    final raw = name.text.trim();
    if (raw.isEmpty) return '';
    return raw.split(RegExp(r'\s+')).first;
  }

  String get shopLabel => shop.text.trim().isEmpty ? 'sua empresa' : shop.text.trim();

  Future<void> submit() async {
    setState(() { loading = true; error = null; });
    try {
      final chosen = _plans[plan]!;
      final res = await widget.api.dio.post('/auth/signup', data: {
        'name': name.text.trim(),
        'shopName': shop.text.trim(),
        'email': email.text.trim(),
        'password': password.text,
        'planCode': chosen.$3,
      });
      final body = Map<String, dynamic>.from(res.data as Map);
      if (body['requiresEmailVerification'] == true || (body['token'] == null && body['accessToken'] == null)) {
        setState(() => error = '${body['message'] ?? 'Conta criada. Confira o e-mail para entrar.'}');
        return;
      }
      await widget.session.apply(body);
      final me = await widget.api.dio.get('/auth/me');
      await widget.session.apply(Map<String, dynamic>.from(me.data as Map), keep: widget.session);
      if (mounted) context.go('/onboarding');
    } catch (e) {
      setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chosen = _plans[plan]!;
    return WqPage(
      title: person.isEmpty ? 'A sua operação entra hoje.' : '$person, a sua operação entra hoje.',
      subtitle: '7 dias no ${chosen.$1}. Nada é cobrado para entrar.',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(error!, style: const TextStyle(color: Wq.danger))),
          Row(children: [
            for (final id in ['basic', 'pro'])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: id == 'basic' ? 8 : 0),
                  child: WqCard(
                    onTap: () => setState(() => plan = id),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_plans[id]!.$1, style: TextStyle(fontWeight: FontWeight.w800, color: plan == id ? Wq.brand : null)),
                      Text(_plans[id]!.$2, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      Text(id == 'pro' ? 'Recomendado' : 'Começar', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                    ]),
                  ),
                ),
              ),
          ]),
          const SizedBox(height: 12),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$shopLabel fica no ${chosen.$1}.', style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(chosen.$4, style: const TextStyle(color: Wq.muted)),
              const SizedBox(height: 8),
              Text(chosen.$5),
              const SizedBox(height: 8),
              for (final item in chosen.$6) Text('· $item'),
              const SizedBox(height: 12),
              const Text('Hoje a conta abre. Na semana a fila anda. No 7º dia você continua ou cancela.', style: TextStyle(color: Wq.muted)),
            ]),
          ),
          const SizedBox(height: 12),
          TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Seu nome')),
          TextField(controller: shop, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nome da empresa')),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail')),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: loading ? null : submit,
            child: Text(loading ? 'Abrindo…' : 'Abrir $shopLabel no ${chosen.$1}'),
          ),
          const SizedBox(height: 8),
          const Text('Sem cartão. Cancele quando quiser. O endereço da empresa a gente cria.', style: TextStyle(color: Wq.muted, fontSize: 12)),
        ],
      ),
    );
  }
}

class InviteScreen extends StatefulWidget {
  const InviteScreen({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;
  @override
  State<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends State<InviteScreen> {
  final token = TextEditingController();
  final name = TextEditingController();
  final password = TextEditingController();
  String? error;

  Future<void> submit() async {
    try {
      final res = await widget.api.dio.post('/invites/${token.text.trim()}/accept', data: {'name': name.text.trim(), 'password': password.text});
      await widget.session.apply(Map<String, dynamic>.from(res.data as Map));
      if (mounted) context.go('/kanban');
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Convite',
      subtitle: 'Entre na equipe',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          TextField(controller: token, decoration: const InputDecoration(labelText: 'Código do convite')),
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Seu nome')),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
          const SizedBox(height: 12),
          FilledButton(onPressed: submit, child: const Text('Criar acesso')),
        ],
      ),
    );
  }
}

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key, required this.api});
  final WorqeraApi api;

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Primeiros passos',
      subtitle: 'Um pedido de exemplo deixa o kanban pronto',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FilledButton(
            onPressed: () async {
              try {
                await api.dio.post('/shops/current/apply-starter-kit');
                if (context.mounted) {
                  wqToast(context, 'Exemplo criado');
                  context.go('/kanban');
                }
              } catch (e) {
                if (context.mounted) wqToast(context, api.message(e));
              }
            },
            child: const Text('Pedido exemplo + kanban'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => context.go('/home'), child: const Text('Ir ao painel')),
        ],
      ),
    );
  }
}
