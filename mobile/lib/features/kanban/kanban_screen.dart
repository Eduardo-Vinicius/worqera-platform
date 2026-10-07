import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
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
  DateTime? entryDay;
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
    final planned = (card['plannedSectorIds'] as List?)?.map((e) => '$e').toList() ?? const <String>[];
    if (!settle && planned.isNotEmpty && toSectorId.isNotEmpty && !planned.contains(toSectorId)) {
      final note = TextEditingController();
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Fora do fluxo'),
          content: TextField(controller: note, decoration: const InputDecoration(labelText: 'Comentário obrigatório')),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, note.text.trim().isNotEmpty), child: const Text('Mover')),
          ],
        ),
      );
      if (ok != true) return;
      await widget.api.dio.post('/orders/$orderId/comments', data: {'text': note.text.trim()});
    }
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
    if (mounted) wqToast(context, settle ? 'Pago e entregue' : 'Movido');
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
    if (mounted) wqToast(context, 'Pedido marcado como entregue');
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
      if (entryDay != null) {
        final created = DateTime.tryParse('${card['createdAt']}')?.toLocal();
        if (created == null || created.year != entryDay!.year || created.month != entryDay!.month || created.day != entryDay!.day) {
          return false;
        }
      }
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
                        FilterChip(
                          label: Text(entryDay == null ? 'Data' : '${entryDay!.day.toString().padLeft(2, '0')}/${entryDay!.month.toString().padLeft(2, '0')}'),
                          selected: entryDay != null,
                          onSelected: (_) async {
                            if (entryDay != null) {
                              setState(() => entryDay = null);
                              return;
                            }
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate: DateTime.now().add(const Duration(days: 1)),
                              helpText: 'Data de entrada',
                            );
                            if (picked != null) setState(() => entryDay = picked);
                          },
                        ),
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
                            color: selected ? Wq.brand : context.wqSurface,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: selected ? Wq.brand : context.wqLine),
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
                                    Text('${sector['name']}', style: TextStyle(color: selected ? Colors.white : context.wqInk, fontWeight: FontWeight.w600)),
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
        color: context.wqSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: late ? const Color(0xFFFDA4AF) : context.wqLine),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: InkWell(
        onTap: () => showModalBottomSheet<void>(
          context: context,
          showDragHandle: true,
          builder: (ctx) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${card['pairLabel'] ?? card['code'] ?? 'Pedido'}', style: monoStyle(size: 22)),
                Text('${card['clientName'] ?? ''}'),
                const SizedBox(height: 12),
                FilledButton(onPressed: () {
                  Navigator.pop(ctx);
                  widget.openOrder('${card['orderId'] ?? card['id']}');
                }, child: const Text('Abrir ficha')),
              ]),
            ),
          ),
        ),
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('${card['pairLabel'] ?? card['code'] ?? 'Pedido'}', style: monoStyle(size: 15)),
              if (pairCount(card) > 1)
                Padding(padding: const EdgeInsets.only(left: 8), child: Text('${pairCount(card)} pares', style: const TextStyle(color: Wq.brand, fontSize: 12, fontWeight: FontWeight.w700))),
              if (late) const Padding(padding: EdgeInsets.only(left: 8), child: Text('Atrasado', style: TextStyle(color: Wq.danger, fontSize: 12))),
              if (card['hasPhotos'] != true) const Padding(padding: EdgeInsets.only(left: 8), child: Text('Sem foto', style: TextStyle(color: Wq.warn, fontSize: 12))),
            ]),
            Text('${card['clientName'] ?? ''}', style: TextStyle(color: context.wqInk)),
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
