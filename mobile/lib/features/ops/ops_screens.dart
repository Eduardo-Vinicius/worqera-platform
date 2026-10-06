import 'package:flutter/material.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  String score = 'all';
  Map? data;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final query = <String, dynamic>{'period': '30d'};
      if (score != 'all') query['score'] = score;
      final res = await widget.api.dio.get('/alerts/feedback', queryParameters: query);
      setState(() => data = Map<String, dynamic>.from(res.data as Map));
    } catch (e) {
      setState(() => error = widget.api.message(e));
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
            ]),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final item in ['all', '5', '4', '3', '2', '1'])
              ChoiceChip(
                label: Text(item == 'all' ? 'Todas' : item),
                selected: score == item,
                onSelected: (_) {
                  setState(() => score = item);
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
                if ('${row['code'] ?? ''}'.isNotEmpty) Text('${row['code']}', style: const TextStyle(fontSize: 12, color: Wq.muted)),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  Map? data;
  List<Map<String, dynamic>> sectors = [];
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
  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/metrics/overview', queryParameters: {'period': '30d'}).then((res) async {
      final body = Map<String, dynamic>.from(res.data as Map);
      final inner = body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : body;
      try {
        final delays = await widget.api.dio.get('/metrics/delays', queryParameters: {'period': '30d'});
        final delayBody = Map<String, dynamic>.from(delays.data as Map);
        inner['delays'] = delayBody['data'] is Map ? delayBody['data'] : delayBody;
      } catch (_) {}
      if (mounted) setState(() => data = inner);
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
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

class _BillingScreenState extends State<BillingScreen> {
  Map? sub;
  String? error;

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/billing/subscription').then((res) {
      final body = res.data;
      if (mounted) setState(() => sub = body is Map ? Map<String, dynamic>.from(body['subscription'] as Map? ?? body) : {});
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  Future<void> checkout(String plan) async {
    final res = await widget.api.dio.post('/billing/checkout-sessions', data: {'planCode': plan});
    final url = '${(res.data as Map)['url'] ?? ''}';
    if (url.isNotEmpty) await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Plano e assinatura',
      subtitle: 'Basic R\$ 147 · Pro R\$ 297 · Business R\$ 499',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('SEU PLANO', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: Wq.brand, fontWeight: FontWeight.w800)),
              Text('${sub?['planCode'] ?? sub?['status'] ?? 'Sem assinatura'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              Text('Status ${sub?['status'] ?? '—'}', style: const TextStyle(color: Wq.muted)),
            ]),
          ),
          const SizedBox(height: 12),
          for (final plan in [('WORQERA_BASIC', 'Basic', 'R\$ 147'), ('WORQERA_PRO', 'Pro', 'R\$ 297'), ('WORQERA_BUSINESS', 'Business', 'R\$ 499')])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                onTap: () => checkout(plan.$1),
                child: Row(children: [
                  Expanded(child: Text(plan.$2, style: const TextStyle(fontWeight: FontWeight.w700))),
                  Text(plan.$3, style: const TextStyle(fontWeight: FontWeight.w800)),
                ]),
              ),
            ),
          const Text('O pagamento abre no navegador.', style: TextStyle(color: Wq.muted)),
        ],
      ),
    );
  }
}
