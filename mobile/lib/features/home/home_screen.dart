import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

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
      if (mounted) {
        setState(() {
          data = Map<String, dynamic>.from(res.data as Map);
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
      title: 'Visão geral',
      subtitle: shop.isEmpty ? 'O que fazer agora na operação' : '$shop${first.isEmpty ? '' : ' · Olá, $first'}',
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
      floating: widget.session.isSector
          ? null
          : FloatingActionButton.extended(
              backgroundColor: Wq.brand,
              foregroundColor: Colors.white,
              onPressed: () => context.push('/orders/new'),
              icon: const Icon(Icons.add),
              label: const Text('Novo pedido'),
            ),
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                children: [
                  if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
                  WqCard(
                    padding: EdgeInsets.zero,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('HOJE', style: TextStyle(fontSize: 11, letterSpacing: 1.4, color: Wq.muted, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(shop.isEmpty ? 'Sua empresa' : shop, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                          Text('$open abertos${overdue > 0 ? ' · $overdue atrasados' : ' · fila em dia'}', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                        ]),
                      ),
                      const Divider(height: 1, color: Wq.line),
                      Row(children: [
                        _kpi('Pedidos abertos', '$open', 'Em andamento'),
                        _kpi('Atrasados', '$overdue', overdue > 0 ? 'Priorize no kanban' : 'Fila em dia', warn: overdue > 0),
                      ]),
                      const Divider(height: 1, color: Wq.line),
                      Row(children: [
                        _kpi('Prontos hoje', '${stats['completedToday'] ?? 0}', 'Finalizados no dia'),
                        _kpi('Pendentes', '${stats['pendingOrders'] ?? 0}', 'Aguardando avanço'),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    _shortcut(context, 'Novo pedido', Icons.add, () => context.push('/orders/new'), primary: true),
                    _shortcut(context, 'Kanban', Icons.view_kanban_outlined, () => context.go('/kanban')),
                    _shortcut(context, 'Pedidos', Icons.receipt_long_outlined, () => context.go('/orders')),
                    _shortcut(context, 'Consultas', Icons.search, () => context.push('/consultas')),
                    _shortcut(context, 'Clientes', Icons.people_outline, () => context.push('/clients')),
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
                                onTap: () => context.push('/orders/${order['id'] ?? order['_id']}'),
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
                                  backgroundColor: Wq.paper,
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

  Widget _kpi(String label, String value, String hint, {bool warn = false}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, letterSpacing: 0.8, color: Wq.muted, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: warn ? Wq.warn : Wq.ink)),
          Text(hint, style: const TextStyle(fontSize: 11, color: Wq.muted)),
        ]),
      ),
    );
  }

  Widget _shortcut(BuildContext context, String label, IconData icon, VoidCallback onTap, {bool primary = false}) {
    return Material(
      color: primary ? Wq.brand.withValues(alpha: 0.14) : Wq.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: primary ? Wq.brand.withValues(alpha: 0.4) : Wq.line)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 16, color: primary ? Wq.brand : Wq.muted),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}
