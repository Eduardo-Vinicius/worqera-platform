import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.api});
  final WorqeraApi api;

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
      backgroundColor: Wq.paper,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 36),
            const Text('WORQERA', style: TextStyle(letterSpacing: 3, fontSize: 12, fontWeight: FontWeight.w800, color: Wq.brand)),
            const SizedBox(height: 8),
            Text('A fila da empresa.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, color: Wq.ink)),
            const SizedBox(height: 6),
            const Text('Gestão de pedidos, do recebido ao pronto.', style: TextStyle(color: Wq.muted)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Wq.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: Wq.line)),
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
          ],
        ),
      ),
    );
  }
}
