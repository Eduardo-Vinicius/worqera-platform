import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';
import '../../design/motion.dart';

export 'finance_screen.dart' show FinanceScreen;

class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  String score = 'all';
  String period = '90d';
  int page = 1;
  int total = 0;
  Map? data;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final query = <String, dynamic>{'period': period, 'page': page, 'limit': 30};
      if (score != 'all') query['score'] = score;
      final res = await widget.api.dio.get('/alerts/feedback', queryParameters: query);
      final body = Map<String, dynamic>.from(res.data as Map);
      setState(() {
        data = body;
        total = int.tryParse('${body['total'] ?? 0}') ?? 0;
        error = null;
      });
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> exportCsv() async {
    try {
      final query = <String, dynamic>{'period': period};
      if (score != 'all') query['score'] = score;
      final res = await widget.api.dio.get('/alerts/feedback/export.csv', queryParameters: query, options: Options(responseType: ResponseType.plain));
      await Clipboard.setData(ClipboardData(text: '${res.data}'));
      if (mounted) wqToast(context, 'CSV copiado. Cole numa planilha.');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final rows = asMaps(data);
    return WqPage(
      title: 'Avaliações',
      subtitle: 'Notas dos clientes',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          WqCard(
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('MÉDIA', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.muted, fontWeight: FontWeight.w700)),
                Text('${summary['avg'] ?? summary['average'] ?? '—'}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
              ])),
              Text('${summary['count'] ?? rows.length} notas', style: const TextStyle(color: Wq.muted)),
              if (summary['distribution'] is Map)
                Text(
                  [
                    for (final star in ['5', '4', '3', '2', '1']) '$star★ ${(summary['distribution'] as Map)[star] ?? 0}',
                  ].join('  '),
                  style: const TextStyle(color: Wq.muted, fontSize: 12),
                ),
            ]),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final item in [('30d', '30 dias'), ('90d', '90 dias'), ('all', 'Tudo')])
              ChoiceChip(
                label: Text(item.$2),
                selected: period == item.$1,
                onSelected: (_) {
                  setState(() {
                    period = item.$1;
                    page = 1;
                  });
                  load();
                },
              ),
            ActionChip(label: const Text('CSV'), onPressed: exportCsv),
          ]),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final item in ['all', '1,2,3', '5', '4', '3', '2', '1'])
              ChoiceChip(
                label: Text(item == 'all' ? 'Todas' : item == '1,2,3' ? 'Críticas' : item),
                selected: score == item,
                onSelected: (_) {
                  setState(() {
                    score = item;
                    page = 1;
                  });
                  load();
                },
              ),
          ]),
          const SizedBox(height: 12),
          for (final row in rows) ...[
            WqCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('${row['score'] ?? ''}/5', style: const TextStyle(fontWeight: FontWeight.w800, color: Wq.brand)),
                  const SizedBox(width: 8),
                  Text('${row['clientName'] ?? 'Cliente'}'),
                ]),
                if ('${row['comment'] ?? ''}'.isNotEmpty) Text('“${row['comment']}”', style: const TextStyle(color: Wq.muted)),
                if (row['tags'] is List && (row['tags'] as List).isNotEmpty) Text((row['tags'] as List).join(' · '), style: const TextStyle(color: Wq.muted, fontSize: 12)),
                if ('${row['code'] ?? ''}'.isNotEmpty) Text('${row['code']}', style: const TextStyle(fontSize: 12, color: Wq.muted)),
                if ('${row['id'] ?? ''}'.isNotEmpty)
                  ReviewReplyButton(api: widget.api, orderId: '${row['id']}', phone: '${row['clientPhone'] ?? ''}'),
              ]),
            ),
            const SizedBox(height: 8),
          ],
          if (page * 30 < total)
            TextButton(
              onPressed: () {
                setState(() => page += 1);
                load();
              },
              child: const Text('Próxima página'),
            ),
        ],
      ),
    );
  }
}

class MetricsScreen extends StatefulWidget {
  const MetricsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<MetricsScreen> createState() => _MetricsScreenState();
}

/// How the shop did in the period, in plain words — same blocks as the site.
class _MetricsScreenState extends State<MetricsScreen> {
  Map? data;
  List<Map<String, dynamic>> sectors = [];
  String? error;
  String period = '30d';

  static const _periods = [('7d', '7 dias'), ('30d', '30 dias'), ('90d', '90 dias'), ('1y', '1 ano')];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/metrics/overview', queryParameters: {'period': period});
      final body = Map<String, dynamic>.from(res.data as Map);
      final inner = body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : body;
      List<Map<String, dynamic>> bySector = [];
      try {
        final dep = await widget.api.dio.get('/metrics/departments', queryParameters: {'period': period});
        bySector = asMaps(dep.data)..sort((a, b) => (num.tryParse('${b['total']}') ?? 0).compareTo(num.tryParse('${a['total']}') ?? 0));
      } catch (_) {}
      if (mounted) {
        setState(() {
          data = inner;
          sectors = bySector;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;

  String _duration(num ms) {
    final hours = ms / 3600000;
    if (hours < 24) return '${hours.toStringAsFixed(1)} h';
    return '${(hours / 24).toStringAsFixed(1)} dias';
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final delays = data?['delays'] as Map? ?? {};
    final fin = (data?['finance'] as Map?)?['summary'] as Map? ?? {};
    final people = asMaps({'data': (data?['employees'] as Map?)?['topByOrders']});
    final total = _n(summary['total']);
    final late = _n(summary['delayed']);
    final onTimePct = total > 0 ? ((total - late) / total * 100) : 0;
    final lateItems = asMaps({'data': delays['items']});
    final maxSector = sectors.fold<num>(1, (m, r) => _n(r['total']) > m ? _n(r['total']) : m);
    return WqPage(
      title: 'Métricas',
      subtitle: 'Como a loja foi no período',
      child: data == null
          ? (error == null ? const SkeletonList() : Center(child: Text(error!)))
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Wrap(spacing: 8, children: [
                    for (final item in _periods)
                      ChoiceChip(
                        label: Text(item.$2),
                        selected: period == item.$1,
                        onSelected: (_) {
                          setState(() => period = item.$1);
                          load();
                        },
                      ),
                  ]),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.55,
                    children: [
                      _kpi('Pedidos', '${total.toInt()}', '${_n(summary['open']).toInt()} em aberto · ${_n(summary['completed']).toInt()} finalizados'),
                      _kpi('No prazo', '${onTimePct.toStringAsFixed(0)}%', '${(total - late).toInt()} de ${total.toInt()} sem atraso'),
                      _kpi('Atrasados', '${late.toInt()}', late > 0 ? 'atraso médio ${_duration(_n(delays['averageDelayMs']))}' : 'nenhum agora', warn: late > 0),
                      _kpi('Recebido', brl(fin['receivedRevenue']), 'ticket médio ${brl(fin['averageTicket'])}'),
                    ],
                  ),
                  if (lateItems.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const WqSectionTitle('Atrasados para resolver'),
                    for (final o in lateItems.take(10))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: WqCard(
                          onTap: () => context.push('/orders/${o['id']}'),
                          child: Row(children: [
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('#${o['code'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                Text(statusLabel(o['status']), style: TextStyle(fontSize: 12, color: context.wqMuted)),
                              ]),
                            ),
                            Text('${_n(o['daysLate']).toInt()} dia(s)', style: const TextStyle(color: Wq.danger, fontWeight: FontWeight.w800)),
                          ]),
                        ),
                      ),
                  ],
                  if (sectors.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const WqSectionTitle('Onde estão os pedidos'),
                    for (final row in sectors) _bar('${row['sectorName'] ?? ''}', _n(row['total']), maxSector, Wq.brand),
                  ],
                  const SizedBox(height: 16),
                  const WqSectionTitle('Dinheiro'),
                  WqCard(
                    child: Column(children: [
                      for (final row in [
                        ('A receber', fin['pendingRevenue']),
                        ('Previsto no total', fin['expectedRevenue']),
                        ('Despesas', fin['expenses']),
                        ('Lucro', fin['realizedProfit']),
                      ])
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(children: [
                            Expanded(child: Text(row.$1, style: TextStyle(color: context.wqMuted))),
                            Text(brl(row.$2), style: const TextStyle(fontWeight: FontWeight.w800)),
                          ]),
                        ),
                    ]),
                  ),
                  if (people.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const WqSectionTitle('Quem mais trabalhou nos pedidos'),
                    for (final row in people)
                      _bar('${row['employeeName'] ?? ''}', _n(row['ordersParticipated']), _n(people.first['ordersParticipated']), Wq.action),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _bar(String label, num value, num max, Color color) {
    final factor = max <= 0 ? 0.0 : (value / max).clamp(0.0, 1.0).toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Expanded(child: Text(label)), Text('${value.toInt()}', style: const TextStyle(fontWeight: FontWeight.w700))]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(value: factor, minHeight: 8, color: color, backgroundColor: color.withValues(alpha: 0.15)),
        ),
      ]),
    );
  }

  Widget _kpi(String label, String value, String hint, {bool warn = false}) {
    return WqCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(label, style: TextStyle(fontSize: 12, color: context.wqMuted)),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: warn ? Wq.warn : context.wqInk)),
        ),
        const SizedBox(height: 2),
        Text(hint, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
      ]),
    );
  }
}

/// Plan chosen on signup with "Assinar agora"; the verify screen reads it to send the owner to /plano.
String? pendingCheckoutPlan;

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key, required this.api, this.initialPlan, this.fromSignup = false});
  final WorqeraApi api;
  final String? initialPlan;
  final bool fromSignup;
  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

/// (código, nome, mensal, anual, frase de valor) — mesmo catálogo do site (`web/lib/plans.ts`).
const _billingPlans = <(String, String, int, int, String)>[
  ('WORQERA_BASIC', 'Basic', 147, 1470, 'Um orçamento recuperado no mês já paga o plano.'),
  ('WORQERA_PRO', 'Pro', 297, 2970, 'O caixa, a prateleira e o estoque na sua mão.'),
  ('WORQERA_BUSINESS', 'Business', 597, 5970, 'O WhatsApp avisa sozinho e a IA escreve com você.'),
];

const _statusLabel = {
  'trialing': 'Em teste',
  'active': 'Ativa',
  'past_due': 'Pagamento atrasado',
  'canceled': 'Cancelada',
  'expired': 'Teste encerrado',
};

class _BillingScreenState extends State<BillingScreen> {
  Map? sub;
  Map? aiQuota;
  String? error;
  String planCode = 'WORQERA_PRO';
  String cycle = 'monthly';
  String busy = '';
  List<Map>? payments;
  final doc = TextEditingController();

  @override
  void initState() {
    super.initState();
    final start = widget.initialPlan;
    if (start != null && _billingPlans.any((p) => p.$1 == start)) planCode = start;
    pendingCheckoutPlan = null;
    load();
  }

  @override
  void dispose() {
    doc.dispose();
    super.dispose();
  }

  String _code(dynamic raw) => '$raw' == 'WORQERA_PREMIUM' ? 'WORQERA_BUSINESS' : '${raw ?? ''}';

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/billing/subscription');
      final body = res.data;
      final next = body is Map && body['subscription'] is Map ? Map<String, dynamic>.from(body['subscription'] as Map) : <String, dynamic>{};
      if (!mounted) return;
      setState(() {
        sub = next;
        final code = _code(next['planCode']);
        if (widget.initialPlan == null && _billingPlans.any((p) => p.$1 == code)) planCode = code;
        if (next['cycle'] == 'yearly') cycle = 'yearly';
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
    widget.api.dio.get('/ai/quota').then((res) {
      final body = res.data;
      if (mounted && body is Map && body['quota'] is Map) setState(() => aiQuota = body['quota'] as Map);
    }).catchError((_) {});
    widget.api.dio.get('/billing/payments').then((res) {
      final body = res.data;
      final list = body is Map && body['payments'] is List ? (body['payments'] as List).whereType<Map>().toList() : <Map>[];
      if (mounted) setState(() => payments = list);
    }).catchError((_) {
      if (mounted) setState(() => payments = []);
    });
  }

  bool get _founder => (sub?['price'] as Map?)?['founderUntil'] != null && cycle == 'monthly';

  static const _yearlyOff = 17;

  /// What the shop pays per month in the chosen cycle (yearly = 10 months spread over 12).
  num _perMonth((String, String, int, int, String) p) {
    if (cycle == 'yearly') return p.$4 / 12;
    if (p.$1 == 'WORQERA_BUSINESS' && _founder) return 499;
    return p.$3;
  }

  String _money(num v) {
    final whole = v == v.roundToDouble();
    final fixed = whole ? v.round().toString() : v.toStringAsFixed(2).replaceAll('.', ',');
    final parts = fixed.split(',');
    final reais = parts[0].replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]}.');
    return 'R\$ $reais${parts.length > 1 ? ',${parts[1]}' : ''}';
  }

  String _buttonPrice((String, String, int, int, String) p) => cycle == 'yearly' ? '${_money(p.$4)}/ano' : '${_money(_perMonth(p))}/mês';

  String _shortDay(dynamic iso) {
    final d = DateTime.tryParse('$iso');
    if (d == null) return '';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }

  Color _paymentColor(String status) {
    switch (status) {
      case 'paid':
        return Wq.success;
      case 'overdue':
        return Wq.danger;
      case 'refunded':
        return Wq.muted;
      default:
        return Wq.brand;
    }
  }

  Future<void> subscribe() async {
    setState(() => busy = 'checkout');
    try {
      final res = await widget.api.dio.post('/billing/checkout-sessions', data: {
        'planCode': planCode,
        'cycle': cycle,
        'cpfCnpj': doc.text.trim(),
      });
      final body = res.data is Map ? res.data as Map : const {};
      final url = '${body['url'] ?? ''}';
      if (url.startsWith('http')) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
        await load();
      } else if (mounted) {
        wqToast(context, '${body['message'] ?? 'Pagamento online desligado. Fale com a Worqera.'}');
      }
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = '');
    }
  }

  Future<void> cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar a assinatura?'),
        content: const Text('A empresa usa até o fim do período pago.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Voltar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cancelar assinatura')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => busy = 'cancel');
    try {
      await widget.api.dio.post('/billing/cancel', data: {});
      if (mounted) wqToast(context, 'Assinatura cancelada');
      await load();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = '${sub?['status'] ?? ''}';
    final code = _code(sub?['planCode']);
    final current = _billingPlans.where((p) => p.$1 == code).firstOrNull;
    final trialEnd = DateTime.tryParse('${sub?['trialEndsAt'] ?? ''}');
    final trialLeft = status == 'trialing' && trialEnd != null ? trialEnd.difference(DateTime.now()).inDays.clamp(0, 99) : null;
    final invoice = '${sub?['lastInvoiceUrl'] ?? ''}';
    final paidUntil = DateTime.tryParse('${sub?['currentPeriodEnd'] ?? ''}');
    final sameAsCurrent = status == 'active' && current?.$1 == planCode && '${sub?['cycle'] ?? 'monthly'}' == cycle;
    final chosen = _billingPlans.firstWhere((p) => p.$1 == planCode);

    return WqPage(
      title: 'Plano e assinatura',
      subtitle: 'Basic R\$ 147 · Pro R\$ 297 · Business R\$ 597',
      actions: [
        if (widget.fromSignup) TextButton(onPressed: () => context.go('/onboarding'), child: const Text('Entrar no app')),
      ],
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
            if (widget.fromSignup)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: WqCard(
                  child: const Text(
                    'Conta criada. Falta só o pagamento: confira o plano, informe o CPF ou CNPJ e toque em Assinar. Os 7 dias grátis continuam valendo.',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            WqCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('SEU PLANO', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.brand, fontWeight: FontWeight.w800)),
                Text(
                  sub == null && error == null ? 'Carregando…' : current == null ? 'Sem assinatura' : 'Worqera ${current.$2}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                Text(
                  [
                    if (status.isNotEmpty) _statusLabel[status] ?? status,
                    if (trialLeft != null) '$trialLeft dia${trialLeft == 1 ? '' : 's'} de teste',
                    if (status == 'active' && paidUntil != null) 'pago até ${dayLabel(paidUntil.toIso8601String())}',
                  ].join(' · '),
                  style: const TextStyle(color: Wq.muted),
                ),
                if (invoice.startsWith('http')) ...[
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Wq.action),
                    onPressed: () => launchUrl(Uri.parse(invoice), mode: LaunchMode.externalApplication),
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: const Text('Pagar fatura em aberto'),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: 'monthly', label: Text('Mensal')),
                ButtonSegment(value: 'yearly', label: Text('Anual · −$_yearlyOff%')),
              ],
              selected: {cycle},
              onSelectionChanged: (v) => setState(() => cycle = v.first),
            ),
            const SizedBox(height: 12),
            for (final p in _billingPlans)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: WqCard(
                  onTap: () => setState(() => planCode = p.$1),
                  child: Row(children: [
                    Icon(planCode == p.$1 ? Icons.radio_button_checked : Icons.radio_button_off, color: planCode == p.$1 ? Wq.brand : Wq.muted),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(
                          [p.$2, if (current?.$1 == p.$1) 'seu plano' else if (p.$1 == 'WORQERA_PRO') 'recomendado'].join(' · '),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        Text(p.$5, style: const TextStyle(color: Wq.muted, fontSize: 13)),
                        if (cycle == 'yearly') Text('${_money(p.$4)} por ano', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                      ]),
                    ),
                    const SizedBox(width: 8),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${_money(_perMonth(p))}/mês', style: const TextStyle(fontWeight: FontWeight.w800)),
                      if (cycle == 'yearly')
                        const Text('−$_yearlyOff%', style: TextStyle(color: Wq.success, fontWeight: FontWeight.w800, fontSize: 12)),
                    ]),
                  ]),
                ),
              ),
            const SizedBox(height: 4),
            TextField(
              controller: doc,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'CPF ou CNPJ de quem paga',
                helperText: 'O Asaas pede o documento para emitir a cobrança. Se já informou, pode deixar em branco.',
                helperMaxLines: 2,
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Wq.brand, minimumSize: const Size.fromHeight(48)),
              onPressed: busy.isNotEmpty || sameAsCurrent ? null : subscribe,
              child: busy == 'checkout'
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(sameAsCurrent
                      ? 'Este já é o seu plano'
                      : 'Assinar ${chosen.$2}${cycle == 'yearly' ? ' anual' : ''} · ${_buttonPrice(chosen)}'),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pagamento pelo Asaas: Pix, boleto ou cartão. Abre no navegador. Em teste, a primeira cobrança vence no último dia do teste.',
              style: TextStyle(color: Wq.muted, fontSize: 12),
            ),
            const SizedBox(height: 12),
            WqCard(
              onTap: () => openLink('https://wa.me/5511985591053?text=${Uri.encodeComponent('Olá! Quero a implantação da Worqera na minha empresa.')}'),
              child: const Text(
                'Implantação com a Worqera (setores, carga do histórico e treinamento): R\$ 497 uma vez. Toque para falar com a gente.',
                style: TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: 12),
            WqCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('ÚLTIMOS PAGAMENTOS', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.brand, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                if (payments == null)
                  const Padding(padding: EdgeInsets.all(8), child: Center(child: CircularProgressIndicator()))
                else if (payments!.isEmpty)
                  const Text('Os pagamentos aparecem aqui depois da primeira cobrança.', style: TextStyle(color: Wq.muted, fontSize: 13))
                else
                  for (final pay in payments!)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(_money(num.tryParse('${pay['value']}') ?? 0), style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(
                              [
                                pay['paidAt'] != null ? 'Pago em ${_shortDay(pay['paidAt'])}' : 'Vence em ${_shortDay(pay['dueDate'])}',
                                if ('${pay['method'] ?? ''}'.isNotEmpty) '${pay['method']}',
                              ].join(' · '),
                              style: const TextStyle(color: Wq.muted, fontSize: 12),
                            ),
                          ]),
                        ),
                        Text('${pay['statusLabel'] ?? ''}', style: TextStyle(color: _paymentColor('${pay['status']}'), fontWeight: FontWeight.w700, fontSize: 12)),
                        if ('${pay['receiptUrl'] ?? pay['invoiceUrl'] ?? ''}'.startsWith('http'))
                          IconButton(
                            tooltip: pay['receiptUrl'] != null ? 'Comprovante' : 'Fatura',
                            onPressed: () => launchUrl(Uri.parse('${pay['receiptUrl'] ?? pay['invoiceUrl']}'), mode: LaunchMode.externalApplication),
                            icon: const Icon(Icons.receipt_long_outlined, size: 20),
                          ),
                      ]),
                    ),
              ]),
            ),
            if (aiQuota != null) ...[
              const SizedBox(height: 12),
              WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('IA DO MÊS', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.brand, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  LinearProgressIndicator(
                    value: ((aiQuota!['percent'] ?? 0) as num) / 100,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                    color: aiQuota!['blocked'] == true ? Wq.danger : aiQuota!['nearLimit'] == true ? Wq.warn : Wq.brand,
                    backgroundColor: context.wqPaper,
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Cada texto que a IA escreve conta 1 uso. Acabou, os textos saem prontos até o mês virar.',
                    style: TextStyle(color: Wq.muted, fontSize: 12),
                  ),
                  AiQuotaNotice(quota: aiQuota, always: true),
                ]),
              ),
            ],
            if ('${sub?['provider'] ?? ''}' == 'Asaas' && ['active', 'past_due', 'trialing'].contains(status))
              Center(
                child: TextButton(
                  onPressed: busy.isNotEmpty ? null : cancel,
                  child: Text(busy == 'cancel' ? 'Cancelando…' : 'Cancelar assinatura', style: const TextStyle(color: Wq.muted)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
