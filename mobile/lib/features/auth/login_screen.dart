import 'package:flutter/material.dart';

import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import 'privacy_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool forgot = false;
  bool loading = false;
  String? error;
  String? info;

  @override
  void initState() {
    super.initState();
    final notice = widget.session.notice;
    if (notice != null && notice.isNotEmpty) {
      info = notice;
      widget.session.notice = null;
    }
  }

  Future<void> submit() async {
    setState(() {
      loading = true;
      error = null;
      info = null;
    });
    try {
      if (forgot) {
        await widget.api.forgot(email.text.trim());
        setState(() => info = 'Se o e-mail existir, o link foi enviado.');
      } else {
        await widget.api.login(email.text.trim(), password.text);
      }
    } catch (e) {
      setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.wqPaper,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: const LinearGradient(colors: [Color(0xFF4F0FA6), Color(0xFF7D26DE)]),
              ),
              child: const Text('W', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 20),
            const Text('WORQERA', style: TextStyle(letterSpacing: 3.2, fontSize: 12, fontWeight: FontWeight.w800, color: Wq.brand)),
            const SizedBox(height: 8),
            Text('A fila da empresa.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.6, color: context.wqInk)),
            const SizedBox(height: 6),
            Text('Gestão de pedidos, do recebido ao pronto.', style: TextStyle(color: context.wqMuted, height: 1.35)),
            const SizedBox(height: 28),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: context.wqSurface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: context.wqLine),
                boxShadow: [BoxShadow(color: const Color(0xFF4F0FA6).withValues(alpha: 0.06), blurRadius: 24, offset: const Offset(0, 12))],
              ),
              child: Column(children: [
                TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail')),
                if (!forgot) ...[
                  const SizedBox(height: 12),
                  TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
                ],
                if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Wq.danger))),
                if (info != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(info!, style: const TextStyle(color: Wq.action))),
                const SizedBox(height: 16),
                FilledButton(onPressed: loading ? null : submit, child: Text(loading ? 'Entrando…' : forgot ? 'Enviar link' : 'Entrar')),
              ]),
            ),
            TextButton(onPressed: () => setState(() => forgot = !forgot), child: Text(forgot ? 'Voltar ao login' : 'Esqueci a senha')),
            TextButton(onPressed: () => context.go('/signup'), child: const Text('Criar empresa')),
            TextButton(onPressed: () => context.go('/invite'), child: const Text('Tenho um convite')),
            TextButton(onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyScreen())), child: const Text('Privacidade')),
          ],
        ),
      ),
    );
  }
}
