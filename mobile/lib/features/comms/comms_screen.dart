import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../quotes/quote_kit.dart' show Pill;

const _web = 'https://worqera.com';

const _defaults = {
  'created': 'Olá {{client}}! Seu pedido {{code}} foi registrado em {{shop}}. Acompanhe: {{link}}',
  'moved': 'Olá {{client}}! Seu pedido {{code}} avançou para {{sector}}. Acompanhe: {{link}}',
  'ready': 'Olá {{client}}! Seu pedido {{code}} está pronto para retirada. {{link}}',
  'publicLink': 'Olá {{client}}! Consulte o pedido {{code}} aqui: {{link}}',
};

const _templateFields = <(String, String, String)>[
  ('created', 'Pedido criado', 'Sai quando o pedido entra'),
  ('moved', 'Mudou de etapa', 'Quando o pedido avança de setor'),
  ('ready', 'Pronto para retirar', 'O aviso mais importante'),
  ('publicLink', 'Link do pedido', 'Para mandar a consulta a qualquer hora'),
];

/// (chave, título, dica, risco) — mesma lista do site.
const _eventFields = <(String, String, String, String)>[
  ('ready', 'Pedido pronto', 'A mensagem que o cliente quer receber.', 'low'),
  ('created', 'Pedido criado', 'Útil quando o cliente não deixou e-mail.', 'mid'),
  ('moved', 'Cada mudança de setor', 'Gera muitas mensagens por pedido. Prefira o link e o e-mail.', 'high'),
];

const _sample = {'{{code}}': '0412', '{{client}}': 'Ana', '{{link}}': 'worqera.com/p/o/abc', '{{sector}}': 'Restauração', '{{shop}}': 'sua loja'};

String _fill(String template) {
  var out = template;
  _sample.forEach((k, v) => out = out.replaceAll(k, v));
  return out;
}

/// Clientes → WhatsApp e e-mail: o que a loja manda para o cliente, por onde e quando.
/// Conectar o WhatsApp oficial usa o cadastro da Meta, que só roda no navegador: o botão abre essa etapa no site.
class CommsScreen extends StatefulWidget {
  const CommsScreen({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;

  @override
  State<CommsScreen> createState() => _CommsScreenState();
}

class _CommsScreenState extends State<CommsScreen> {
  Map<String, dynamic>? wa;
  bool loading = true;
  bool saving = false;
  String busy = '';
  String? error;

  bool waEnabled = false;
  bool emailEnabled = true;
  final phone = TextEditingController();
  final Map<String, TextEditingController> templates = {for (final t in _templateFields) t.$1: TextEditingController()};
  Map<String, bool> events = {'created': true, 'moved': false, 'ready': true};
  String savedSnapshot = '';

  bool get canEdit => widget.session.isAdmin;

  @override
  void initState() {
    super.initState();
    load();
    for (final c in [phone, ...templates.values]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    phone.dispose();
    for (final c in templates.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _snapshot() => [waEnabled, emailEnabled, phone.text, for (final t in _templateFields) templates[t.$1]!.text, events['created'], events['moved'], events['ready']].join('|');

  bool get dirty => savedSnapshot.isNotEmpty && _snapshot() != savedSnapshot;

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/shops/current');
      final body = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      final doc = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
      final notifications = doc['notifications'] is Map ? doc['notifications'] as Map : const {};
      final w = notifications['whatsapp'] is Map ? notifications['whatsapp'] as Map : const {};
      final tpl = w['templates'] is Map ? w['templates'] as Map : const {};
      final ev = w['events'] is Map ? w['events'] as Map : const {};
      final email = notifications['email'] is Map ? notifications['email'] as Map : const {};
      final branding = doc['branding'] is Map ? doc['branding'] as Map : const {};
      if (!mounted) return;
      setState(() {
        waEnabled = w['enabled'] == true;
        emailEnabled = email['enabled'] != false;
        phone.text = '${w['shopPhoneE164'] ?? branding['phone'] ?? ''}';
        for (final t in _templateFields) {
          final v = '${tpl[t.$1] ?? ''}';
          templates[t.$1]!.text = v.isEmpty || v == 'null' ? _defaults[t.$1]! : v;
        }
        events = {'created': ev['created'] != false, 'moved': ev['moved'] == true, 'ready': ev['ready'] != false};
        savedSnapshot = _snapshot();
        loading = false;
        error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          loading = false;
          error = widget.api.message(e);
        });
      }
    }
    try {
      final res = await widget.api.dio.get('/whatsapp');
      if (mounted) setState(() => wa = Map<String, dynamic>.from(res.data as Map));
    } catch (_) {}
  }

  Future<void> save() async {
    setState(() => saving = true);
    try {
      await widget.api.dio.patch('/shops/current', data: {
        'notifications': {
          'email': {'enabled': emailEnabled},
          'whatsapp': {
            'enabled': waEnabled,
            'shopPhoneE164': phone.text.trim(),
            'templates': {for (final t in _templateFields) t.$1: templates[t.$1]!.text},
            'events': events,
          },
        },
      });
      if (!mounted) return;
      setState(() => savedSnapshot = _snapshot());
      wqToast(context, 'Comunicação salva');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> toggleCloud(String key, bool value) async {
    setState(() => busy = key);
    try {
      final res = await widget.api.dio.patch('/whatsapp', data: {key: value});
      if (mounted) setState(() => wa = Map<String, dynamic>.from(res.data as Map));
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = '');
    }
  }

  Future<void> disconnect() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desconectar o WhatsApp oficial?'),
        content: const Text('Os avisos automáticos param.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Desconectar')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => busy = 'disconnect');
    try {
      final res = await widget.api.dio.post('/whatsapp/disconnect', data: {});
      if (mounted) setState(() => wa = Map<String, dynamic>.from(res.data as Map));
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = '');
    }
  }

  Widget _section(BuildContext context, String title, {String? hint, required List<Widget> children}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title.toUpperCase(), style: TextStyle(fontSize: 11, letterSpacing: 1.1, fontWeight: FontWeight.w800, color: context.wqMuted)),
          if (hint != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(hint, style: TextStyle(fontSize: 13, color: context.wqMuted))),
          const SizedBox(height: 10),
          ...children,
        ]),
      ),
    );
  }

  Widget _switch(String title, String? subtitle, bool value, ValueChanged<bool>? onChanged) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      subtitle: subtitle == null ? null : Text(subtitle, style: const TextStyle(fontSize: 12)),
      value: value,
      onChanged: canEdit ? onChanged : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'WhatsApp e e-mail',
      subtitle: 'O que a loja manda para o cliente',
      actions: [
        if (dirty && canEdit)
          TextButton(
            onPressed: saving ? null : save,
            child: saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Salvar'),
          ),
      ],
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                  children: [
                    if (!canEdit)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text('Só o dono ou o admin muda estas opções.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                      ),
                    _cloud(context),
                    _section(context, 'Pelo celular da loja',
                        hint: 'Funciona em todos os planos: o botão Avisar abre o WhatsApp da loja com a mensagem pronta. Sem risco de bloqueio.',
                        children: [
                          _switch('Mostrar WhatsApp com texto pronto nos pedidos', null, waEnabled, (v) => setState(() => waEnabled = v)),
                          TextField(
                            controller: phone,
                            enabled: canEdit,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(labelText: 'Telefone da loja', hintText: '(11) 98888-7777', helperText: 'Usado quando o pedido não tem telefone do cliente.'),
                          ),
                        ]),
                    _section(context, 'Proteção do número',
                        hint: 'O WhatsApp bloqueia número que manda muita mensagem parecida. Escolha quando a Worqera sugere mandar.',
                        children: [
                          for (final ev in _eventFields)
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Row(children: [
                                Flexible(child: Text(ev.$2, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                                const SizedBox(width: 6),
                                Pill(
                                  ev.$4 == 'low' ? 'Seguro' : ev.$4 == 'mid' ? 'Moderado' : 'Alto volume',
                                  color: ev.$4 == 'low' ? Wq.success : ev.$4 == 'mid' ? const Color(0xFFD97706) : const Color(0xFFE11D48),
                                ),
                              ]),
                              subtitle: Text(ev.$3, style: const TextStyle(fontSize: 12)),
                              value: events[ev.$1] == true,
                              onChanged: canEdit ? (v) => setState(() => events = {...events, ev.$1: v}) : null,
                            ),
                          Text('No balcão, peça para o cliente salvar o contato da loja: quem tem o número salvo quase nunca denuncia.', style: TextStyle(fontSize: 12, color: context.wqMuted)),
                        ]),
                    _section(context, 'E-mail ao cliente', hint: 'Sai pelo endereço da Worqera com o nome da sua loja como remetente.', children: [
                      _switch('Enviar e-mails de status para o cliente', 'Pedido criado (laudo em PDF), mudança de etapa nos setores marcados e pronto com pedido de avaliação.', emailEnabled,
                          (v) => setState(() => emailEnabled = v)),
                    ]),
                    _section(context, 'Mensagens do WhatsApp', hint: 'Use {{client}}, {{code}}, {{link}}, {{sector}} e {{shop}}. Embaixo, como o cliente lê.', children: [
                      for (final t in _templateFields) ...[
                        TextField(
                          controller: templates[t.$1],
                          enabled: canEdit,
                          minLines: 2,
                          maxLines: 5,
                          decoration: InputDecoration(labelText: t.$2, helperText: t.$3),
                        ),
                        Container(
                          margin: const EdgeInsets.only(top: 6, bottom: 14),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: context.wqDark ? const Color(0xFF0B3B2A) : const Color(0xFFE7FFDB),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(_fill(templates[t.$1]!.text), style: TextStyle(fontSize: 13, color: context.wqDark ? const Color(0xFFD1FAE5) : const Color(0xFF0B141A))),
                        ),
                      ],
                    ]),
                    _automations(context),
                    _guide(context),
                  ],
                ),
    );
  }

  Widget _cloud(BuildContext context) {
    final st = wa;
    if (st == null) return const SizedBox.shrink();
    final configured = st['configured'] == true;
    final business = st['business'] == true;
    final status = '${st['status'] ?? 'off'}';
    final canSend = st['canSend'] == true;
    final label = !configured
        ? 'Em breve'
        : status == 'connected'
            ? (canSend ? 'Ativo' : 'Conectado')
            : status == 'paused'
                ? 'Pausado'
                : 'Desligado';
    final color = status == 'connected' && canSend ? Wq.success : status == 'paused' ? const Color(0xFFE11D48) : context.wqMuted;
    final usage = st['usage'] is Map ? st['usage'] as Map : null;

    Widget meter(String name, String key) {
      final counts = usage?['counts'] is Map ? usage!['counts'] as Map : const {};
      final pack = usage?['pack'] is Map ? usage!['pack'] as Map : const {};
      final used = num.tryParse('${counts[key] ?? 0}') ?? 0;
      final total = num.tryParse('${pack[key] ?? 0}') ?? 0;
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$name · $used de $total', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(minHeight: 6, value: total > 0 ? (used / total).clamp(0, 1).toDouble() : 0, backgroundColor: context.wqPaper, color: const Color(0xFF25D366)),
          ),
        ]),
      );
    }

    return _section(context, 'WhatsApp oficial', hint: 'Aviso de pedido pronto e retomada de orçamento saem sozinhos, pelo número da loja.', children: [
      Align(alignment: Alignment.centerLeft, child: Pill(label, color: color)),
      const SizedBox(height: 8),
      if (!configured)
        Text('A Worqera está liberando o WhatsApp oficial com a Meta. Até lá, o botão WhatsApp abre o aplicativo da loja com o texto pronto.', style: TextStyle(color: context.wqMuted, fontSize: 13))
      else if (!business)
        Text('Faz parte do Business, com pacote de 1.000 avisos e 100 retomadas por mês.', style: TextStyle(color: context.wqMuted, fontSize: 13))
      else if (status == 'off') ...[
        Text('Incluído no Business: 1.000 avisos e 100 retomadas por mês. A loja pode continuar usando o WhatsApp Business no celular.', style: TextStyle(color: context.wqMuted, fontSize: 13)),
        const SizedBox(height: 10),
        if (canEdit)
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018)),
            onPressed: () => openLink('$_web/comunicacao?tab=whatsapp'),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: const Text('Conectar no site'),
          )
        else
          Text('Só o dono ou o admin conecta o número.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
        if (canEdit) Padding(padding: const EdgeInsets.only(top: 6), child: Text('A conexão usa o cadastro da Meta, que abre no navegador.', style: TextStyle(color: context.wqMuted, fontSize: 12))),
      ] else ...[
        Text(['${st['displayPhone'] ?? ''}'.isEmpty ? 'Número conectado' : '${st['displayPhone']}', if ('${st['verifiedName'] ?? ''}'.isNotEmpty) '${st['verifiedName']}'].join(' · '),
            style: const TextStyle(fontWeight: FontWeight.w700)),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(st['paymentOk'] == true ? 'Pagamento: Worqera' : 'Aguardando a Worqera ativar o pagamento',
              style: TextStyle(fontSize: 12, color: st['paymentOk'] == true ? Wq.success : const Color(0xFFD97706))),
        ),
        if (status == 'connected' && '${st['blockedText'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${st['blockedText']}', style: const TextStyle(color: Color(0xFFB45309)))),
        if (status == 'paused') Padding(padding: const EdgeInsets.only(top: 6), child: Text('${st['pausedReason'] ?? 'Envio pausado'}', style: const TextStyle(color: Color(0xFFE11D48)))),
        _switch('A loja pede autorização ao cliente no balcão', 'Obrigatório pela Meta. Quem responder PARAR deixa de receber.', st['consentAtCounter'] == true,
            busy.isEmpty ? (v) => toggleCloud('consentAtCounter', v) : null),
        _switch('Avisar sozinho quando o pedido ficar pronto', 'Sai quando todos os itens chegam no setor final, com o link de consulta e avaliação.', st['autoReady'] == true,
            busy.isEmpty ? (v) => toggleCloud('autoReady', v) : null),
        if (usage != null) ...[
          const SizedBox(height: 6),
          Text('ESTE MÊS', style: TextStyle(fontSize: 10, letterSpacing: 1.1, fontWeight: FontWeight.w800, color: context.wqMuted)),
          const SizedBox(height: 6),
          meter('Avisos (pronto)', 'utility'),
          meter('Retomadas de orçamento', 'marketing'),
          if ((num.tryParse('${usage['overageBrl'] ?? 0}') ?? 0) > 0)
            Text('Excedente até agora: ${brl(usage['overageBrl'])} (cobrado no mês seguinte)', style: const TextStyle(fontSize: 12, color: Color(0xFFB45309))),
        ],
        if (canEdit)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: busy == 'disconnect' ? null : disconnect,
              style: TextButton.styleFrom(foregroundColor: const Color(0xFFE11D48)),
              child: const Text('Desconectar'),
            ),
          ),
      ],
    ]);
  }

  Widget _automations(BuildContext context) {
    final st = wa ?? const {};
    final configured = st['configured'] == true;
    final official = configured && st['business'] == true && st['status'] == 'connected';
    final rows = <(String, String, String)>[
      ('Pedido pronto → WhatsApp automático', 'Avisa o cliente sozinho quando o pedido chega no setor final.', !configured ? 'soon' : official && st['autoReady'] == true && st['canSend'] == true ? 'on' : 'off'),
      ('Retomada de orçamento → WhatsApp', 'Até 2 mensagens para quem não fechou, no dia de retorno.', !configured ? 'soon' : official && st['canSend'] == true ? 'on' : 'off'),
      ('Pedido criado → e-mail com o laudo em PDF', 'Quando o cliente tem e-mail e o pedido tem valor.', emailEnabled ? 'on' : 'off'),
      ('Pedido pronto → e-mail com pedido de avaliação', 'Leva para a página do pedido, com nota e convite ao Google.', emailEnabled ? 'on' : 'off'),
      ('WhatsApp com texto pronto (um toque)', 'Botão Avisar no pedido e no kanban abre o WhatsApp da loja já escrito.', waEnabled ? 'on' : 'off'),
      ('Cliente respondeu PARAR → não envia mais', 'Vale para o WhatsApp oficial.', configured ? 'on' : 'soon'),
    ];
    return _section(context, 'O que sai sozinho', hint: 'Tudo que a Worqera manda para o cliente, e o que está ligado agora.', children: [
      for (final r in rows)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.smart_toy_outlined, size: 18, color: Wq.brand),
            const SizedBox(width: 8),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(r.$1, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                Text(r.$2, style: TextStyle(fontSize: 12, color: context.wqMuted)),
              ]),
            ),
            const SizedBox(width: 6),
            Pill(r.$3 == 'on' ? 'Ligado' : r.$3 == 'soon' ? 'Em breve' : 'Desligado', color: r.$3 == 'on' ? Wq.success : r.$3 == 'soon' ? Wq.brand : context.wqMuted),
          ]),
        ),
    ]);
  }

  Widget _guide(BuildContext context) {
    const rules = [
      'Mande só para quem pediu: cliente da loja que aceitou receber avisos.',
      'Mensagem útil primeiro (pronto, prazo, link). Promoção pouca e com espaço.',
      'Toda mensagem aceita PARAR ou SAIR, e a Worqera respeita na hora.',
      'Número com nome, foto e endereço no perfil: cliente que reconhece a loja não denuncia.',
      'Não use apps de disparo em massa nem extensões do WhatsApp Web.',
    ];
    return _section(context, 'Para não cair o número', hint: 'Número cai por denúncia, não por automação oficial.', children: [
      for (final r in rules)
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.check_circle_outline, size: 16, color: Wq.success),
            const SizedBox(width: 8),
            Expanded(child: Text(r, style: const TextStyle(fontSize: 13))),
          ]),
        ),
      Align(
        alignment: Alignment.centerLeft,
        child: TextButton(onPressed: () => openLink('$_web/comunicacao?tab=seguranca'), child: const Text('Ver o guia completo')),
      ),
    ]);
  }
}
