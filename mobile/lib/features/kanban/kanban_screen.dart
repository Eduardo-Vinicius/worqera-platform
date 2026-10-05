import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class KanbanScreen extends StatefulWidget {
  const KanbanScreen({super.key, required this.api, required this.session, required this.openOrder});
  final WorqeraApi api;
  final SessionStore session;
  final void Function(String orderId) openOrder;

  @override
  State<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends State<KanbanScreen> {
  List<Map> columns = [];
  int index = 0;
  bool loading = true;
  bool lateOnly = false;
  String? error;
  final query = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/kanban');
      final body = Map<String, dynamic>.from(res.data as Map);
      final list = (body['columns'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      if (mounted) {
        setState(() {
          columns = list;
          if (index >= list.length) index = 0;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Map? get column => columns.isEmpty ? null : columns[index];
  Map? sectorOf(Map col) => col['sector'] is Map ? Map<String, dynamic>.from(col['sector'] as Map) : null;
  String sectorId(Map? col) => '${sectorOf(col ?? {})?['_id'] ?? sectorOf(col ?? {})?['id'] ?? ''}';

  List<Map> ordersOf(Map col) => (col['orders'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();

  Future<void> move(Map card, String toSectorId, {bool settle = false}) async {
    final orderId = '${card['orderId'] ?? card['id']}';
    final itemId = '${card['itemId'] ?? ''}';
    if (settle) {
      final total = num.tryParse('${card['paymentTotal'] ?? 0}') ?? 0;
      await widget.api.dio.patch('/orders/$orderId', data: {
        'status': 'delivered',
        'deliveredAt': DateTime.now().toUtc().toIso8601String(),
        'pricing': {'deposit': total, 'remaining': 0},
      });
    } else if (itemId.isNotEmpty && !itemId.startsWith('idx-')) {
      await widget.api.dio.post('/kanban/orders/$orderId/items/$itemId/move', data: {'toSectorId': toSectorId});
    } else {
      await widget.api.dio.post('/kanban/orders/$orderId/move', data: {'toSectorId': toSectorId});
    }
    await load();
  }

  Future<void> deliver(Map card) async {
    final remaining = num.tryParse('${card['paymentRemaining'] ?? 0}') ?? 0;
    if (remaining > 0.009 && widget.session.seesMoney) {
      final choice = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ainda falta pagar'),
          content: Text('Falta R\$ ${remaining.toStringAsFixed(2)} neste pedido.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Voltar')),
            TextButton(onPressed: () => Navigator.pop(ctx, 'anyway'), child: const Text('Entregar mesmo assim')),
            FilledButton(onPressed: () => Navigator.pop(ctx, 'paid'), child: const Text('Cliente já pagou')),
          ],
        ),
      );
      if (choice == null) return;
      if (choice == 'paid') {
        await move(card, '', settle: true);
      } else {
        await widget.api.dio.patch('/orders/${card['orderId'] ?? card['id']}', data: {
          'status': 'delivered',
          'deliveredAt': DateTime.now().toUtc().toIso8601String(),
        });
        await load();
      }
      return;
    }
    await widget.api.dio.patch('/orders/${card['orderId'] ?? card['id']}', data: {
      'status': 'delivered',
      'deliveredAt': DateTime.now().toUtc().toIso8601String(),
    });
    await load();
  }

  Future<void> shift(Map card, int delta) async {
    final next = index + delta;
    if (next < 0 || next >= columns.length) return;
    await move(card, sectorId(columns[next]));
    setState(() => index = next);
  }

  @override
  Widget build(BuildContext context) {
    final col = column;
    final term = query.text.trim().toLowerCase();
    final cards = (col == null ? <Map>[] : ordersOf(col)).where((card) {
      final late = card['dueAt'] != null && DateTime.tryParse('${card['dueAt']}')?.isBefore(DateTime.now()) == true;
      if (lateOnly && !late) return false;
      if (term.isEmpty) return true;
      final blob = '${card['pairLabel']} ${card['code']} ${card['clientName']} ${card['brand']} ${card['shoeModel']}'.toLowerCase();
      return blob.contains(term);
    }).toList();
    final terminal = col != null && sectorOf(col)?['isTerminal'] == true;
    final pending = cards.fold<num>(0, (sum, card) => sum + (num.tryParse('${card['linePending'] ?? 0}') ?? 0));
    final total = cards.fold<num>(0, (sum, card) => sum + (num.tryParse('${card['lineValue'] ?? 0}') ?? 0));
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(onPressed: () => ShellScope.maybeOf(context)?.openMenu(), icon: const Icon(Icons.menu)),
        title: const Text('Kanban'),
        actions: [IconButton(onPressed: load, icon: const Icon(Icons.refresh))],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(error!, textAlign: TextAlign.center)))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
                      child: Row(children: [
                        Expanded(child: TextField(controller: query, onChanged: (_) => setState(() {}), decoration: const InputDecoration(isDense: true, prefixIcon: Icon(Icons.search), hintText: 'Cliente, código ou modelo'))),
                        const SizedBox(width: 8),
                        FilterChip(label: const Text('Atrasados'), selected: lateOnly, onSelected: (v) => setState(() => lateOnly = v)),
                      ]),
                    ),
                    SizedBox(
                      height: 72,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: columns.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final sector = sectorOf(columns[i]) ?? {};
                          final selected = i == index;
                          final count = ordersOf(columns[i]).length;
                          final color = _hex(sector['color']);
                          return Material(
                            color: selected ? Wq.brand : Wq.surface,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: selected ? Wq.brand : Wq.line),
                            ),
                            child: InkWell(
                              onTap: () => setState(() => index = i),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Row(children: [
                                    Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                    const SizedBox(width: 6),
                                    Text('${sector['name']}', style: TextStyle(color: selected ? Colors.white : Wq.ink, fontWeight: FontWeight.w600)),
                                    const SizedBox(width: 6),
                                    Text('$count', style: TextStyle(color: selected ? Colors.white70 : Wq.muted, fontSize: 12)),
                                  ]),
                                  if (widget.session.seesColumnMoney)
                                    Text('A pagar R\$ ${ordersOf(columns[i]).fold<num>(0, (s, c) => s + (num.tryParse('${c['linePending'] ?? 0}') ?? 0)).toStringAsFixed(0)}',
                                        style: TextStyle(fontSize: 11, color: selected ? Colors.white70 : Wq.muted)),
                                ]),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    if (widget.session.seesColumnMoney)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Total R\$ ${total.toStringAsFixed(2)} · A pagar R\$ ${pending.toStringAsFixed(2)}', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                        ),
                      ),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: cards.isEmpty ? 1 : cards.length,
                          itemBuilder: (_, i) {
                            if (cards.isEmpty) {
                              return const Padding(padding: EdgeInsets.all(24), child: Text('Nenhum pedido nesta coluna.', style: TextStyle(color: Wq.muted)));
                            }
                            return _card(cards[i], terminal);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _card(Map card, bool terminal) {
    final late = card['dueAt'] != null && DateTime.tryParse('${card['dueAt']}')?.isBefore(DateTime.now()) == true;
    final pending = num.tryParse('${card['linePending'] ?? card['paymentRemaining'] ?? 0}') ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Wq.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: late ? const Color(0xFFFDA4AF) : Wq.line),
      ),
      child: InkWell(
        onTap: () => widget.openOrder('${card['orderId'] ?? card['id']}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('${card['pairLabel'] ?? card['code'] ?? 'Pedido'}', style: const TextStyle(fontWeight: FontWeight.w700)),
              if (late) const Padding(padding: EdgeInsets.only(left: 8), child: Text('Atrasado', style: TextStyle(color: Wq.danger, fontSize: 12))),
              if (card['hasPhotos'] != true) const Padding(padding: EdgeInsets.only(left: 8), child: Text('Sem foto', style: TextStyle(color: Wq.warn, fontSize: 12))),
            ]),
            Text('${card['clientName'] ?? ''}', style: const TextStyle(color: Wq.ink)),
            if ('${card['brand'] ?? card['shoeModel'] ?? ''}'.isNotEmpty)
              Text('${card['brand'] ?? ''} · ${card['shoeModel'] ?? ''}', style: const TextStyle(color: Wq.muted, fontSize: 13)),
            if (widget.session.seesColumnMoney && pending > 0.009)
              Text('A pagar R\$ ${pending.toStringAsFixed(2)}', style: const TextStyle(color: Wq.warn, fontSize: 13)),
            const SizedBox(height: 8),
            Row(children: [
              IconButton(onPressed: index <= 0 ? null : () => shift(card, -1), icon: const Icon(Icons.chevron_left)),
              const Spacer(),
              if (terminal && card['status'] == 'ready')
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Wq.success, minimumSize: const Size(0, 36)),
                  onPressed: () => deliver(card),
                  child: const Text('Marcar entregue'),
                ),
              const Spacer(),
              IconButton(onPressed: index >= columns.length - 1 ? null : () => shift(card, 1), icon: const Icon(Icons.chevron_right)),
            ]),
          ]),
        ),
      ),
    );
  }

  Color _hex(dynamic raw) {
    final text = '$raw'.replaceAll('#', '');
    if (text.length != 6) return Wq.brand;
    return Color(int.parse('FF$text', radix: 16));
  }
}
