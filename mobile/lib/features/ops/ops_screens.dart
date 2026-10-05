import 'package:flutter/material.dart';
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
  String? error;
  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/metrics/finance').then((res) {
      if (mounted) setState(() => data = Map<String, dynamic>.from(res.data as Map));
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final top = asMaps({'data': data?['topServices']});
    return WqPage(
      title: 'Financeiro',
      subtitle: 'Receita, pendente e ticket',
      child: data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _money('Previsto', summary['expectedRevenue']),
                _money('Recebido', summary['receivedRevenue']),
                _money('Pendente', summary['pendingRevenue']),
                _money('Ticket médio', summary['averageTicket']),
                const SizedBox(height: 8),
                const WqSectionTitle('Serviços'),
                for (final row in top)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${row['name'] ?? row['service'] ?? ''}'),
                    trailing: Text(brl(row['revenue'] ?? row['total'] ?? 0)),
                  ),
              ],
            ),
    );
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
    widget.api.dio.get('/metrics/overview').then((res) {
      if (mounted) setState(() => data = Map<String, dynamic>.from(res.data as Map));
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = data?['summary'] as Map? ?? {};
    final people = asMaps({'data': (data?['employees'] as Map?)?['topByOrders']});
    return WqPage(
      title: 'Métricas',
      subtitle: 'Operação do período',
      child: data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _kpi('Pedidos', '${summary['total'] ?? 0}'),
                _kpi('Abertos', '${summary['open'] ?? 0}'),
                _kpi('Finalizados', '${summary['completed'] ?? 0}'),
                _kpi('Atrasados', '${summary['delayed'] ?? 0}'),
                const WqSectionTitle('Quem mais participou'),
                for (final row in people)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${row['employeeName'] ?? ''}'),
                    subtitle: Text('${row['ordersParticipated'] ?? 0} pedidos · ${row['ordersCompleted'] ?? 0} finalizados'),
                  ),
              ],
            ),
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
