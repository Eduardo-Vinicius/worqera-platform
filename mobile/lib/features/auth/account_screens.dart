import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../ops/ops_screens.dart' show pendingCheckoutPlan;

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
  bool payNow = false;
  String? error;

  static const _plans = {
    'basic': ('Basic', 'R\$ 147', 'WORQERA_BASIC', 'Um orçamento recuperado no mês já paga o plano.', 'Até 150 pedidos criados no mês.', ['Kanban por setores e TVs', 'CRM de orçamentos', 'IA no resumo do dia']),
    'pro': ('Pro', 'R\$ 297', 'WORQERA_PRO', 'O caixa, a prateleira e o estoque na sua mão.', 'Pedidos sem limite neste plano.', ['Financeiro e métricas', 'Produtos, estoque e marca', 'IA em orçamentos e cobrança']),
    'business': ('Business', 'R\$ 597', 'WORQERA_BUSINESS', 'O WhatsApp avisa sozinho e a IA escreve com você.', 'O WhatsApp oficial liga quando a assinatura começar.', ['Tudo do Pro', 'WhatsApp oficial automático', 'IA com 1.500 usos']),
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
      pendingCheckoutPlan = payNow ? chosen.$3 : null;
      final res = await widget.api.dio.post('/auth/signup', data: {
        'name': name.text.trim(),
        'shopName': shop.text.trim(),
        'email': email.text.trim(),
        'password': password.text,
        'planCode': chosen.$3,
      });
      final body = Map<String, dynamic>.from(res.data as Map);
      if (body['requiresEmailVerification'] == true || (body['token'] == null && body['accessToken'] == null)) {
        if (mounted) context.go('/verify?email=${Uri.encodeQueryComponent(email.text.trim())}');
        return;
      }
      await widget.session.apply(body);
      final me = await widget.api.dio.get('/auth/me');
      await widget.session.apply(Map<String, dynamic>.from(me.data as Map), keep: widget.session);
      if (mounted) context.go(payNow ? '/plano?plan=${chosen.$3}' : '/onboarding');
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
            for (final id in ['basic', 'pro', 'business'])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: id == 'business' ? 0 : 8),
                  child: WqCard(
                    onTap: () => setState(() => plan = id),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_plans[id]!.$1, style: TextStyle(fontWeight: FontWeight.w800, color: plan == id ? Wq.brand : null)),
                      FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(_plans[id]!.$2, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
                      Text(id == 'pro' ? 'Recomendado' : id == 'basic' ? 'Começar' : 'Automático', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Wq.muted, fontSize: 12)),
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
          const Text('Como quer começar?', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: false, label: Text('Testar 7 dias grátis')),
              ButtonSegment(value: true, label: Text('Assinar agora')),
            ],
            selected: {payNow},
            onSelectionChanged: (v) => setState(() => payNow = v.first),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 8),
            child: Text(
              payNow ? 'Pix, boleto ou cartão. Os 7 dias continuam valendo: a cobrança vence no fim deles.' : 'Sem cartão. Decide no fim do teste.',
              style: const TextStyle(color: Wq.muted, fontSize: 12),
            ),
          ),
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

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, required this.api, required this.session, required this.email});
  final WorqeraApi api;
  final SessionStore session;
  final String email;
  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  late final email = TextEditingController(text: widget.email);
  final code = TextEditingController();
  bool busy = false;
  int cooldown = 0;
  String? error;
  String? info;

  @override
  void dispose() {
    email.dispose();
    code.dispose();
    super.dispose();
  }

  void tick() {
    if (!mounted || cooldown <= 0) return;
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() => cooldown -= 1);
      tick();
    });
  }

  Future<void> confirm() async {
    final digits = code.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 6) {
      setState(() => error = 'O código tem 6 números.');
      return;
    }
    setState(() { busy = true; error = null; info = null; });
    try {
      final res = await widget.api.dio.post('/auth/verify-email', data: {'email': email.text.trim(), 'code': digits});
      await widget.session.apply(Map<String, dynamic>.from(res.data as Map));
      final me = await widget.api.dio.get('/auth/me');
      await widget.session.apply(Map<String, dynamic>.from(me.data as Map), keep: widget.session);
      if (mounted) context.go(pendingCheckoutPlan != null ? '/plano?plan=$pendingCheckoutPlan' : '/onboarding');
    } catch (e) {
      code.clear();
      setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> resend() async {
    setState(() { error = null; info = null; });
    try {
      final res = await widget.api.dio.post('/auth/resend-verification', data: {'email': email.text.trim()});
      final body = Map<String, dynamic>.from(res.data as Map);
      if (body['alreadyVerified'] == true) {
        widget.session.notice = 'Esse e-mail já está confirmado. Entre com a sua senha.';
        if (mounted) context.go('/login');
        return;
      }
      setState(() {
        cooldown = (body['retryIn'] as num?)?.toInt() ?? 60;
        info = body['throttled'] == true ? 'Aguarde para pedir outro código.' : 'Enviamos um código novo.';
        if (body['devCode'] != null) info = '$info Código (dev): ${body['devCode']}';
      });
      tick();
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Confirme seu e-mail',
      subtitle: 'Último passo para abrir a conta',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WqCard(
            child: Text(
              'Enviamos um código de 6 números para ${email.text.isEmpty ? 'o seu e-mail' : email.text}. Não chegou? Olhe o spam.',
              style: const TextStyle(height: 1.35),
            ),
          ),
          const SizedBox(height: 12),
          if (widget.email.isEmpty)
            TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail do cadastro')),
          TextField(
            controller: code,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            autofillHints: const [AutofillHints.oneTimeCode],
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.w800),
            decoration: const InputDecoration(labelText: 'Código', counterText: ''),
            onChanged: (value) {
              if (value.replaceAll(RegExp(r'\D'), '').length == 6 && !busy) confirm();
            },
          ),
          if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error!, style: const TextStyle(color: Wq.danger))),
          if (info != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(info!, style: const TextStyle(color: Wq.action))),
          const SizedBox(height: 12),
          FilledButton(onPressed: busy ? null : confirm, child: Text(busy ? 'Confirmando…' : 'Confirmar e entrar')),
          TextButton(
            onPressed: cooldown > 0 ? null : resend,
            child: Text(cooldown > 0 ? 'Reenviar em ${cooldown}s' : 'Reenviar código'),
          ),
          TextButton(onPressed: () => context.go('/login'), child: const Text('Voltar ao login')),
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
