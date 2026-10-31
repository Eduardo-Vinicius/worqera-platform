import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';

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

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key, required this.api, this.stock = false});
  final WorqeraApi api;
  final bool stock;
  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  Map? data;
  List<Map<String, dynamic>> sectors = [];
  Map<String, dynamic>? stock;
  String? error;
  String period = '30d';

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/metrics/finance', queryParameters: {'period': period});
      final body = Map<String, dynamic>.from(res.data as Map);
      final inner = body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : body;
      List<Map<String, dynamic>> loaded = [];
      try {
        final sectorsRes = await widget.api.dio.get('/metrics/departments', queryParameters: {'period': period});
        final sectorBody = Map<String, dynamic>.from(sectorsRes.data as Map);
        loaded = asMaps(sectorBody['data'] is Map ? sectorBody['data'] : sectorBody);
      } catch (_) {}
      if (mounted) {
        setState(() {
          data = inner;
          sectors = loaded;
        });
      }
      if (widget.stock) {
        try {
          final res = await widget.api.dio.get('/products/summary');
          final body = res.data;
          final summary = body is Map && body['summary'] is Map ? Map<String, dynamic>.from(body['summary'] as Map) : null;
          if (mounted) setState(() => stock = summary);
        } catch (_) {}
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final top = asMaps({'data': data?['topServices']});
    final days = asMaps({'data': data?['dailyEvolution']});
    final byStatus = asMaps({'data': data?['revenueByStatus']});
    final maxService = top.fold<double>(1, (max, row) {
      final value = double.tryParse('${row['revenue'] ?? 0}') ?? 0;
      return value > max ? value : max;
    });
    final maxDay = days.fold<double>(1, (max, row) {
      final value = double.tryParse('${row['receivedRevenue'] ?? 0}') ?? 0;
      return value > max ? value : max;
    });
    final maxStatus = byStatus.fold<double>(1, (max, row) {
      final value = double.tryParse('${row['receivedRevenue'] ?? 0}') ?? 0;
      return value > max ? value : max;
    });
    return WqPage(
      title: 'Financeiro',
      subtitle: 'Receita, pendente e ticket',
      child: data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ReceivablesCard(api: widget.api),
                if (stock != null) ...[
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text('PRODUTOS', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.muted, fontWeight: FontWeight.w800)),
                  ),
                  _money('Vendido', stock!['salesTotal']),
                  _money('Reservado', stock!['reservedValue']),
                  _money('Estoque', stock!['stockValue']),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: WqCard(
                      child: Row(children: [
                        const Expanded(child: Text('Unidades disponíveis', style: TextStyle(color: Wq.muted))),
                        Text('${stock!['availableUnits'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Wrap(spacing: 8, children: [
                  for (final item in ['today', '7d', '15d', '30d', '90d', '1y'])
                    ChoiceChip(
                      label: Text(item),
                      selected: period == item,
                      onSelected: (_) {
                        setState(() {
                          period = item;
                          data = null;
                        });
                        load();
                      },
                    ),
                ]),
                const SizedBox(height: 12),
                _money('Previsto', summary['expectedRevenue']),
                _money('Recebido', summary['receivedRevenue']),
                _money('Pendente', summary['pendingRevenue']),
                _money('Ticket médio', summary['averageTicket']),
                _money('Despesas', summary['expenses']),
                _money('Lucro', summary['realizedProfit']),
                const SizedBox(height: 8),
                const WqSectionTitle('Por dia'),
                for (final row in days)
                  _bar('${row['date'] ?? ''}'.toString().substring('${row['date'] ?? ''}'.length > 5 ? 5 : 0), double.tryParse('${row['receivedRevenue'] ?? 0}') ?? 0, maxDay, Wq.action),
                const WqSectionTitle('Setores'),
                for (final row in sectors)
                  _bar('${row['name'] ?? row['sector'] ?? ''}', double.tryParse('${row['revenue'] ?? row['expectedRevenue'] ?? row['count'] ?? 0}') ?? 0, sectors.fold<double>(1, (max, item) {
                    final value = double.tryParse('${item['revenue'] ?? item['expectedRevenue'] ?? item['count'] ?? 0}') ?? 0;
                    return value > max ? value : max;
                  }), Wq.action),
                Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: export, child: const Text('Exportar resumo'))),
                const WqSectionTitle('Por status'),
                for (final row in byStatus)
                  _bar('${row['status'] ?? ''}', double.tryParse('${row['receivedRevenue'] ?? 0}') ?? 0, maxStatus, Wq.brand),
                const WqSectionTitle('Serviços'),
                for (final row in top)
                  _bar('${row['name'] ?? row['service'] ?? ''}', double.tryParse('${row['revenue'] ?? row['total'] ?? 0}') ?? 0, maxService, Wq.brand),
              ],
            ),
    );
  }

  Widget _bar(String label, double value, double max, Color color) {
    final factor = max <= 0 ? 0.0 : (value / max).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)),
          Text(brl(value), style: const TextStyle(fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(value: factor, minHeight: 8, color: color, backgroundColor: color.withValues(alpha: 0.15)),
        ),
      ]),
    );
  }

  Future<void> export() async {
    final summary = data?['summary'] as Map? ?? {};
    final doc = pw.Document();
    doc.addPage(pw.Page(build: (_) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
      pw.Text('Financeiro $period', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
      pw.SizedBox(height: 12),
      pw.Text('Previsto ${brl(summary['expectedRevenue'])}'),
      pw.Text('Recebido ${brl(summary['receivedRevenue'])}'),
      pw.Text('Pendente ${brl(summary['pendingRevenue'])}'),
      pw.Text('Lucro ${brl(summary['realizedProfit'])}'),
    ])));
    await Printing.sharePdf(bytes: await doc.save(), filename: 'financeiro-$period.pdf');
  }

  Widget _money(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(color: Wq.muted))),
          Text(brl(value), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        ]),
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

class _MetricsScreenState extends State<MetricsScreen> {
  Map? data;
  String? error;
  String period = '30d';

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
      try {
        final delays = await widget.api.dio.get('/metrics/delays', queryParameters: {'period': period});
        final delayBody = Map<String, dynamic>.from(delays.data as Map);
        inner['delays'] = delayBody['data'] is Map ? delayBody['data'] : delayBody;
      } catch (_) {}
      if (mounted) setState(() => data = inner);
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final people = asMaps({'data': (data?['employees'] as Map?)?['topByOrders']});
    final maxPeople = people.fold<double>(1, (max, row) {
      final value = double.tryParse('${row['ordersParticipated'] ?? 0}') ?? 0;
      return value > max ? value : max;
    });
    final bars = [
      ('Abertos', double.tryParse('${summary['open'] ?? 0}') ?? 0, Wq.brand),
      ('Finalizados', double.tryParse('${summary['completed'] ?? 0}') ?? 0, Wq.success),
      ('Atrasados', double.tryParse('${summary['delayed'] ?? 0}') ?? 0, Wq.warn),
    ];
    final maxBar = bars.fold<double>(1, (max, row) => row.$2 > max ? row.$2 : max);
    return WqPage(
      title: 'Métricas',
      subtitle: 'Operação do período',
      child: data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Wrap(spacing: 8, children: [
                  for (final item in [('7d', '7 dias'), ('30d', '30 dias'), ('90d', '90 dias')])
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
                _kpi('Pedidos', '${summary['total'] ?? 0}'),
                _kpi('Atraso médio', '${(data?['delays'] as Map?)?['averageDelayHours'] ?? 0} h'),
                for (final row in bars) _bar(row.$1, row.$2, maxBar, row.$3),
                const WqSectionTitle('Quem mais participou'),
                for (final row in people)
                  _bar('${row['employeeName'] ?? ''}', double.tryParse('${row['ordersParticipated'] ?? 0}') ?? 0, maxPeople, Wq.action),
              ],
            ),
    );
  }

  Widget _bar(String label, double value, double max, Color color) {
    final factor = max <= 0 ? 0.0 : (value / max).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Expanded(child: Text(label)), Text(value.toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w700))]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(value: factor, minHeight: 8, color: color, backgroundColor: color.withValues(alpha: 0.15)),
        ),
      ]),
    );
  }

  Widget _kpi(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(child: Row(children: [Expanded(child: Text(label, style: const TextStyle(color: Wq.muted))), Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))])),
    );
  }
}

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key, required this.api});
  final WorqeraApi api;
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
  final doc = TextEditingController();

  @override
  void initState() {
    super.initState();
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
        if (_billingPlans.any((p) => p.$1 == code)) planCode = code;
        if (next['cycle'] == 'yearly') cycle = 'yearly';
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
    widget.api.dio.get('/ai/quota').then((res) {
      final body = res.data;
      if (mounted && body is Map && body['quota'] is Map) setState(() => aiQuota = body['quota'] as Map);
    }).catchError((_) {});
  }

  bool get _founder => (sub?['price'] as Map?)?['founderUntil'] != null && cycle == 'monthly';

  int _price((String, String, int, int, String) p) {
    if (cycle == 'yearly') return p.$4;
    if (p.$1 == 'WORQERA_BUSINESS' && _founder) return 499;
    return p.$3;
  }

  String _money(int v) => 'R\$ ${v.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]}.')}';

  String _per() => cycle == 'yearly' ? '/ano' : '/mês';

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
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
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
                ButtonSegment(value: 'yearly', label: Text('Anual · 2 meses grátis')),
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
                      ]),
                    ),
                    const SizedBox(width: 8),
                    Text('${_money(_price(p))}${_per()}', style: const TextStyle(fontWeight: FontWeight.w800)),
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
                  : Text(sameAsCurrent ? 'Este já é o seu plano' : 'Assinar ${chosen.$2} · ${_money(_price(chosen))}${_per()}'),
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
