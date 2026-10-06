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
  String? error;

  Future<void> submit() async {
    setState(() { loading = true; error = null; });
    try {
      final res = await widget.api.dio.post('/auth/signup', data: {
        'name': name.text.trim(),
        'shopName': shop.text.trim(),
        'email': email.text.trim(),
        'password': password.text,
      });
      await widget.session.apply(Map<String, dynamic>.from(res.data as Map));
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
    return WqPage(
      title: 'Criar empresa',
      subtitle: 'Trial de 7 dias',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Seu nome')),
          TextField(controller: shop, decoration: const InputDecoration(labelText: 'Nome da empresa')),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
          const SizedBox(height: 12),
          FilledButton(onPressed: loading ? null : submit, child: Text(loading ? 'Criando…' : 'Começar trial')),
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
