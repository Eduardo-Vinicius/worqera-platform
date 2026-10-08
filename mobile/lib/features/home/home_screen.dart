import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../lookup/simple_lists.dart';
import '../ops/ops_screens.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';
import '../settings/settings_screens.dart';

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
  String subscriptionStatus = '';
  String shopLabel = '';
  bool sectorsOk = false;
  bool brandOk = false;
  bool checklistOpen = false;
  bool checklistDismissed = false;
  bool loading = true;
  bool digestBusy = false;

  @override
  void initState() {
    super.initState();
    shopLabel = widget.session.shopName;
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/dashboard');
      String trial = '';
      String status = '';
      try {
        final sub = await widget.api.dio.get('/billing/subscription');
        final body = Map<String, dynamic>.from(sub.data as Map);
        final row = body['subscription'] is Map ? body['subscription'] as Map : body;
        status = '${row['status'] ?? ''}';
        if (status == 'trialing' && row['trialEndsAt'] != null) {
          trial = 'Trial até ${dayLabel(row['trialEndsAt'])}';
        }
      } catch (_) {}
      var nextSectorsOk = false;
      try {
        final listed = await widget.api.dio.get('/sectors');
        nextSectorsOk = asMaps(listed.data).where((row) => row['active'] != false).length >= 2;
      } catch (_) {}
      var nextBrandOk = false;
      var nextShop = widget.session.shopName;
      try {
        final shop = await widget.api.dio.get('/shops/current');
        final body = shop.data is Map ? Map<String, dynamic>.from(shop.data as Map) : <String, dynamic>{};
        final doc = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
        final branding = doc['branding'] is Map ? doc['branding'] as Map : const {};
        nextBrandOk = '${branding['logoUrl'] ?? ''}'.isNotEmpty || '${branding['displayName'] ?? ''}'.isNotEmpty;
        final label = '${branding['displayName'] ?? doc['name'] ?? ''}'.trim();
        if (label.isNotEmpty) nextShop = label;
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        data = Map<String, dynamic>.from(res.data as Map);
        trialLabel = trial;
        subscriptionStatus = status;
        sectorsOk = nextSectorsOk;
        brandOk = nextBrandOk;
        shopLabel = nextShop;
        error = null;
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _page(String id, Widget page, {bool stack = false}) {
    final scope = ShellScope.maybeOf(context);
    if (scope != null) {
      scope.openPage(id, page, stack: stack);
      return;
    }
  }

  void _openOrder(String id) {
    _page(
      'order',
      OrderDetailScreen(
        api: widget.api,
        session: widget.session,
        orderId: id,
        onEdit: () => _page('order-edit', OrderFormScreen(api: widget.api, session: widget.session, orderId: id), stack: true),
      ),
      stack: true,
    );
  }

  void _openNew() => context.go('/orders/new');

  void _openClients() {
    _page(
      'clients',
      ClientsScreen(
        api: widget.api,
        session: widget.session,
        openClient: (id) => _page('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true),
      ),
    );
  }

  void _openConsultas() {
    _page(
      'consultas',
      ConsultasScreen(api: widget.api, session: widget.session, openOrder: _openOrder, openClient: (id) => _page('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true)),
    );
  }

  Future<void> _digest() async {
    setState(() => digestBusy = true);
    try {
      await widget.api.dio.post('/alerts/weekly-digest');
      if (mounted) wqToast(context, 'Resumo semanal enviado.');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => digestBusy = false);
    }
  }

  String _clientName(Map order) {
    final client = order['client'];
    if (client is Map && '${client['name'] ?? ''}'.isNotEmpty) return '${client['name']}';
    final name = '${order['clientName'] ?? ''}';
    return name.isEmpty ? '—' : name;
  }

  String _sectorName(Map order) {
    final sector = order['currentSector'];
    if (sector is Map && '${sector['name'] ?? ''}'.isNotEmpty) return '${sector['name']}';
    final raw = '${order['setorAtual'] ?? order['currentSector'] ?? ''}';
    if (raw.isEmpty || raw == 'null' || RegExp(r'^[a-f0-9]{24}$').hasMatch(raw)) return '';
    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final stats = data?['stats'] as Map? ?? {};
    final open = int.tryParse('${stats['openOrders'] ?? stats['activeOrders'] ?? 0}') ?? 0;
    final overdue = int.tryParse('${stats['overdue'] ?? 0}') ?? 0;
    final readyToday = int.tryParse('${stats['completedToday'] ?? 0}') ?? 0;
    final pending = int.tryParse('${stats['pendingOrders'] ?? 0}') ?? 0;
    final userName = '${data?['user']?['name'] ?? widget.session.userName}';
    final first = userName.trim().isEmpty ? '' : userName.trim().split(' ').first;
    final recent = asMaps({'data': data?['recentOrders']});
    final sectors = asMaps({'data': data?['bySector']});
    final maxCount = sectors.fold<num>(1, (max, row) {
      final count = num.tryParse('${row['count']}') ?? 0;
      return count > max ? count : max;
    });
    final readyCount = recent.where((order) => '${order['status']}' == 'ready').length;
    final hasOrder = open > 0 || recent.isNotEmpty;
    final steps = [
      ('Conferir setores do kanban', sectorsOk, () => _page('setores', CatalogScreen(api: widget.api, title: 'Setores', subtitle: 'Colunas do kanban', path: '/sectors', sector: true))),
      ('Criar o primeiro pedido', hasOrder, _openNew),
      ('Marca da empresa (opcional)', brandOk, () => _page('empresa', EmpresaScreen(api: widget.api))),
    ];
    final doneSteps = steps.where((step) => step.$2).length;
    final showChecklist = !checklistDismissed && doneSteps < steps.length;

    return WqPage(
      title: 'Visão geral',
      subtitle: shopLabel.isEmpty ? 'O que fazer agora na operação' : (first.isEmpty ? shopLabel : '$shopLabel · Olá, $first'),
      actions: [
        if (widget.session.role == 'owner')
          IconButton(
            tooltip: 'Digest aos owners',
            onPressed: digestBusy ? null : _digest,
            icon: digestBusy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.mail_outline),
          ),
        IconButton(tooltip: 'Novo pedido', onPressed: _openNew, icon: const Icon(Icons.add)),
      ],
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                children: [
                  if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(error!, style: const TextStyle(color: Wq.danger, fontWeight: FontWeight.w700))),
                  if (showChecklist) ...[
                    WqCard(
                      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text('Começar · $doneSteps/${steps.length}', style: const TextStyle(fontWeight: FontWeight.w800))),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            tooltip: checklistOpen ? 'Recolher' : 'Expandir',
                            onPressed: () => setState(() => checklistOpen = !checklistOpen),
                            icon: Icon(checklistOpen ? Icons.expand_less : Icons.expand_more),
                          ),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            tooltip: 'Dispensar',
                            onPressed: () => setState(() => checklistDismissed = true),
                            icon: const Icon(Icons.close, size: 18),
                          ),
                        ]),
                        if (!checklistOpen)
                          TextButton(
                            onPressed: steps.firstWhere((step) => !step.$2).$3,
                            child: Text(steps.firstWhere((step) => !step.$2).$1),
                          )
                        else
                          for (final step in steps)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                              leading: Icon(step.$2 ? Icons.check_circle : Icons.circle_outlined, color: step.$2 ? Wq.success : context.wqMuted),
                              title: Text(step.$1),
                              onTap: step.$3,
                            ),
                      ]),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    if (overdue > 0) ActionChip(avatar: const Icon(Icons.warning_amber_rounded, size: 16), label: Text('$overdue atrasado${overdue == 1 ? '' : 's'}'), onPressed: () => context.go('/kanban')),
                    if (readyCount > 0) ActionChip(label: Text(readyCount == 1 ? '1 pronto na fila' : '$readyCount prontos na fila'), onPressed: () => context.go('/kanban')),
                    ActionChip(avatar: const Icon(Icons.add, size: 16), label: Text(open == 0 ? 'Criar primeiro pedido' : 'Novo pedido'), onPressed: _openNew),
                  ]),
                  const SizedBox(height: 12),
                  WqCard(
                    padding: EdgeInsets.zero,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('HOJE', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: context.wqMuted, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text(shopLabel.isEmpty ? 'Sua empresa' : shopLabel, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                          Text('$open aberto${open == 1 ? '' : 's'}${overdue > 0 ? ' · $overdue atrasado${overdue == 1 ? '' : 's'}' : ' · fila em dia'}${trialLabel.isEmpty ? '' : ' · $trialLabel'}', style: TextStyle(color: context.wqMuted, fontSize: 13)),
                          const SizedBox(height: 12),
                          Row(children: [
                            Expanded(child: FilledButton(onPressed: () => context.go('/kanban'), child: const Text('Kanban'))),
                            const SizedBox(width: 8),
                            Expanded(child: OutlinedButton(onPressed: () => context.go('/orders'), child: const Text('Pedidos'))),
                          ]),
                        ]),
                      ),
                      if (overdue > 0)
                        Material(
                          color: Wq.warn.withValues(alpha: 0.12),
                          child: ListTile(
                            dense: true,
                            leading: const Icon(Icons.warning_amber_rounded, color: Wq.warn),
                            title: Text('$overdue atrasado${overdue == 1 ? '' : 's'}'),
                            trailing: const Text('Priorizar'),
                            onTap: () => context.go('/kanban'),
                          ),
                        ),
                      const Divider(height: 1),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 1.7,
                        children: [
                          _kpi(context, 'Pedidos abertos', '$open', 'Em andamento'),
                          _kpi(context, 'Atrasados', '$overdue', overdue > 0 ? 'Priorize no kanban' : 'Fila em dia'),
                          _kpi(context, 'Prontos hoje', '$readyToday', 'Finalizados no dia'),
                          _kpi(context, 'Pendentes', '$pending', 'Aguardando avanço'),
                        ],
                      ),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.6,
                    children: [
                      _link(context, 'Novo pedido', Icons.add, _openNew, primary: true),
                      _link(context, 'Kanban', Icons.view_kanban_outlined, () => context.go('/kanban')),
                      _link(context, 'Consultas', Icons.search, _openConsultas),
                      _link(context, 'Clientes', Icons.people_outline, _openClients),
                    ],
                  ),
                  const SizedBox(height: 16),
                  WqSectionTitle('Fila recente', trailing: TextButton(onPressed: () => context.go('/kanban'), child: const Text('Kanban'))),
                  WqCard(
                    padding: EdgeInsets.zero,
                    child: recent.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(children: [
                              Text('Nenhum pedido ainda.', style: TextStyle(color: context.wqMuted)),
                              const SizedBox(height: 8),
                              FilledButton(onPressed: _openNew, child: const Text('Criar pedido')),
                            ]),
                          )
                        : Column(children: [
                            for (final order in recent.take(8))
                              ListTile(
                                title: Text('${order['code'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                subtitle: Text([
                                  _clientName(order),
                                  _sectorName(order),
                                  dayLabel(order['dueAt'] ?? order['dataPrevistaEntrega']),
                                ].where((part) => part.isNotEmpty).join(' · ')),
                                trailing: StatusChip(order['status']),
                                onTap: () {
                                  final id = '${order['id'] ?? order['_id']}';
                                  if (id.isEmpty) return;
                                  _openOrder(id);
                                },
                              ),
                          ]),
                  ),
                  const SizedBox(height: 16),
                  const WqSectionTitle('Carga por setor'),
                  WqCard(
                    child: sectors.isEmpty
                        ? Text('Sem setores ativos.', style: TextStyle(color: context.wqMuted))
                        : Column(children: [
                            for (final sector in sectors) ...[
                              InkWell(
                                onTap: () => context.go('/kanban'),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Column(children: [
                                    Row(children: [
                                      Expanded(child: Text('${sector['name']}', style: const TextStyle(fontWeight: FontWeight.w700))),
                                      Text('${sector['count'] ?? 0}', style: const TextStyle(color: Wq.brand, fontWeight: FontWeight.w800)),
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
                                  ]),
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                          ]),
                  ),
                  if (subscriptionStatus.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    WqCard(
                      onTap: () => _page('plano', BillingScreen(api: widget.api)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('ASSINATURA', style: TextStyle(fontSize: 11, letterSpacing: 1.1, color: context.wqMuted, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(subscriptionStatus, style: const TextStyle(fontWeight: FontWeight.w800)),
                        if (trialLabel.isNotEmpty) Text(trialLabel, style: TextStyle(color: context.wqMuted)),
                        const SizedBox(height: 6),
                        const Text('Ver plano', style: TextStyle(color: Wq.brand, fontWeight: FontWeight.w700)),
                      ]),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _kpi(BuildContext context, String label, String value, String hint) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10, letterSpacing: 0.6, color: context.wqMuted, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.6)),
        Text(hint, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
      ]),
    );
  }

  Widget _link(BuildContext context, String label, IconData icon, VoidCallback onTap, {bool primary = false}) {
    return WqCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(children: [
        Icon(icon, size: 18, color: primary ? Wq.brand : context.wqMuted),
        const SizedBox(width: 8),
        Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700))),
      ]),
    );
  }
}
