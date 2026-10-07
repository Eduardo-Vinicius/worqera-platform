import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';
import '../lookup/simple_lists.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map? data;
  String? error;
  String trialLabel = '';
  int clientCount = 0;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/dashboard');
      String trial = '';
      var clients = 0;
      try {
        final sub = await widget.api.dio.get('/billing/subscription');
        final body = Map<String, dynamic>.from(sub.data as Map);
        final row = body['subscription'] is Map ? body['subscription'] as Map : body;
        if ('${row['status']}' == 'trialing' && row['trialEndsAt'] != null) {
          trial = 'Trial até ${dayLabel(row['trialEndsAt'])}';
        }
      } catch (_) {}
      try {
        final listed = await widget.api.dio.get('/clients', queryParameters: {'limit': 1});
        final body = listed.data;
        clients = body is Map ? int.tryParse('${body['count'] ?? body['total'] ?? ''}') ?? asMaps(body).length : 0;
      } catch (_) {}
      if (mounted) {
        setState(() {
          data = Map<String, dynamic>.from(res.data as Map);
          trialLabel = trial;
          clientCount = clients;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = data?['stats'] as Map? ?? {};
    final open = stats['openOrders'] ?? stats['activeOrders'] ?? 0;
    final overdue = num.tryParse('${stats['overdue'] ?? 0}') ?? 0;
    final first = '${data?['user']?['name'] ?? widget.session.userName}'.split(' ').first;
    final shop = widget.session.shopName;
    final recent = asMaps({'data': data?['recentOrders']});
    final sectors = asMaps({'data': data?['bySector']});
    final maxCount = sectors.fold<num>(1, (m, s) => (num.tryParse('${s['count']}') ?? 0) > m ? (num.tryParse('${s['count']}') ?? 0) : m);

    return WqPage(
      title: first.isEmpty ? 'Início' : 'Olá, $first',
      subtitle: shop.isEmpty ? 'O que fazer agora' : shop,
      actions: [
        if (widget.session.role == 'owner')
          IconButton(
            tooltip: 'Digest aos owners',
            onPressed: () async {
              await widget.api.dio.post('/alerts/weekly-digest');
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Resumo semanal enviado.')));
              }
            },
            icon: const Icon(Icons.mail_outline),
          ),
        IconButton(onPressed: load, icon: const Icon(Icons.refresh)),
      ],
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                children: [
                  if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF4F0FA6), Color(0xFF7D26DE)]),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('HOJE', style: TextStyle(fontSize: 11, letterSpacing: 1.6, color: Color(0xFFE9D5FF), fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(shop.isEmpty ? 'Sua empresa' : shop, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                      Text('$open abertos${overdue > 0 ? ' · $overdue atrasados' : ' · fila em dia'}${trialLabel.isEmpty ? '' : ' · $trialLabel'}', style: const TextStyle(color: Color(0xFFE9D5FF), fontSize: 13)),
                      const SizedBox(height: 14),
                      Row(children: [
                        _heroStat('$open', 'Abertos'),
                        _heroStat('$overdue', 'Atrasados'),
                        _heroStat('${stats['completedToday'] ?? 0}', 'Prontos hoje'),
                        _heroStat('${stats['pendingOrders'] ?? 0}', 'Pendentes'),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  if (overdue > 0 || (stats['pendingOrders'] ?? 0) != 0)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Wrap(spacing: 8, runSpacing: 8, children: [
                        if (overdue > 0) ActionChip(label: Text('$overdue atrasados'), onPressed: () => context.go('/kanban')),
                        ActionChip(label: const Text('Pedidos'), onPressed: () => context.go('/orders')),
                      ]),
                    ),
                  WqCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Para começar', style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(shop.isEmpty ? 'Empresa ainda sem nome' : 'Empresa ok', style: TextStyle(color: shop.isEmpty ? Wq.warn : Wq.success)),
                      Text(sectors.isEmpty ? 'Falta criar setores' : 'Setores ok', style: TextStyle(color: sectors.isEmpty ? Wq.warn : Wq.success)),
                      Text(clientCount == 0 && recent.isEmpty ? 'Ainda sem clientes' : 'Clientes ok', style: TextStyle(color: clientCount == 0 && recent.isEmpty ? Wq.warn : Wq.success)),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  Row(children: [
                    Expanded(child: _shortcut(context, 'Pedidos', Icons.receipt_long_outlined, () => context.go('/orders'))),
                    const SizedBox(width: 8),
                    Expanded(child: _shortcut(context, 'Clientes', Icons.people_outline, () => ShellScope.maybeOf(context)?.openPage('clients', ClientsScreen(api: widget.api, session: widget.session, openClient: (id) => ShellScope.maybeOf(context)?.openPage('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true))))),
                    const SizedBox(width: 8),
                    Expanded(child: _shortcut(context, 'Consultas', Icons.search, () => ShellScope.maybeOf(context)?.openPage('consultas', ConsultasScreen(api: widget.api, session: widget.session, openOrder: (_) {})))),
                  ]),
                  const SizedBox(height: 16),
                  WqSectionTitle('Fila recente', trailing: TextButton(onPressed: () => context.go('/kanban'), child: const Text('Kanban'))),
                  WqCard(
                    padding: EdgeInsets.zero,
                    child: recent.isEmpty
                        ? const Padding(padding: EdgeInsets.all(20), child: Text('Nenhum pedido ainda.', style: TextStyle(color: Wq.muted)))
                        : Column(children: [
                            for (final order in recent.take(8))
                              ListTile(
                                title: Text('${order['code'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text('${order['clientName'] ?? order['client']?['name'] ?? 'Cliente'}'),
                                trailing: StatusChip(order['status']),
                                onTap: () {
                                  final id = '${order['id'] ?? order['_id']}';
                                  final scope = ShellScope.maybeOf(context);
                                  if (scope == null) {
                                    context.push('/orders/$id');
                                    return;
                                  }
                                  scope.openPage(
                                    'order',
                                    OrderDetailScreen(
                                      api: widget.api,
                                      session: widget.session,
                                      orderId: id,
                                      onEdit: () => scope.openPage('order-edit', OrderFormScreen(api: widget.api, session: widget.session, orderId: id), stack: true),
                                    ),
                                    stack: true,
                                  );
                                },
                              ),
                          ]),
                  ),
                  const SizedBox(height: 16),
                  const WqSectionTitle('Carga por setor'),
                  WqCard(
                    child: sectors.isEmpty
                        ? const Text('Sem setores ativos.', style: TextStyle(color: Wq.muted))
                        : Column(children: [
                            for (final sector in sectors) ...[
                              Row(children: [
                                Expanded(child: Text('${sector['name']}', style: const TextStyle(fontWeight: FontWeight.w600))),
                                Text('${sector['count'] ?? 0}', style: const TextStyle(color: Wq.brand, fontWeight: FontWeight.w700)),
                              ]),
                              const SizedBox(height: 4),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(99),
                                child: LinearProgressIndicator(
                                  minHeight: 4,
                                  value: ((num.tryParse('${sector['count']}') ?? 0) / maxCount).clamp(0, 1).toDouble(),
                                  backgroundColor: context.wqPaper,
                                  color: Wq.brand,
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                          ]),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _heroStat(String value, String label) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
          Text(label, style: const TextStyle(color: Color(0xFFE9D5FF), fontSize: 11, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Widget _shortcut(BuildContext context, String label, IconData icon, VoidCallback onTap) {
    return WqCard(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      onTap: onTap,
      child: Column(children: [
        Icon(icon, size: 18, color: Wq.brand),
        const SizedBox(height: 6),
        Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
      ]),
    );
  }
}
