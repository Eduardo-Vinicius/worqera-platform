import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';
import '../settings/settings_screens.dart';
import 'shelf_card.dart';
import 'tv_screens_card.dart';

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
      try {
        final sub = await widget.api.dio.get('/billing/subscription');
        final body = Map<String, dynamic>.from(sub.data as Map);
        final row = body['subscription'] is Map ? body['subscription'] as Map : body;
        final status = '${row['status'] ?? ''}';
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
    final userName = '${data?['user']?['name'] ?? widget.session.userName}';
    final first = userName.trim().isEmpty ? '' : userName.trim().split(' ').first;
    final recent = asMaps({'data': data?['recentOrders']});
    final sectors = asMaps({'data': data?['bySector']});
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
      subtitle: [shopLabel.isEmpty ? 'O que fazer agora na operação' : shopLabel, if (first.isNotEmpty) 'Olá, $first', if (trialLabel.isNotEmpty) trialLabel].join(' · '),
      actions: [
        TvScreensButton(session: widget.session),
        if (widget.session.role == 'owner')
          IconButton(
            tooltip: 'Enviar resumo semanal por e-mail',
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
                  DailyBriefCard(api: widget.api, session: widget.session, open: open, overdue: overdue, sectors: sectors),
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
                  if (widget.session.role == 'owner') ShelfCard(api: widget.api, session: widget.session),
                  WqSectionTitle('Pedidos recentes', trailing: TextButton(onPressed: () => context.go('/orders'), child: const Text('Ver todos'))),
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
                ],
              ),
            ),
    );
  }
}
