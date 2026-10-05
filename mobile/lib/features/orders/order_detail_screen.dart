import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.api, required this.session, required this.orderId, required this.onEdit});
  final WorqeraApi api;
  final SessionStore session;
  final String orderId;
  final VoidCallback onEdit;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map? order;
  List<Map> targets = [];
  String? error;
  final comment = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/orders/${widget.orderId}');
      final board = await widget.api.dio.get('/kanban');
      final fwd = ((board.data as Map)['forwardTargets'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      if (mounted) {
        setState(() {
          order = Map<String, dynamic>.from(res.data as Map);
          targets = fwd;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  Future<void> settle() async {
    final pricing = order?['pricing'] as Map?;
    await widget.api.dio.patch('/orders/${widget.orderId}', data: {
      'pricing': {'deposit': pricing?['total'] ?? 0, 'remaining': 0},
    });
    await load();
  }

  Future<void> deliver({required bool paid}) async {
    final pricing = order?['pricing'] as Map?;
    final total = pricing?['total'] ?? 0;
    final remaining = num.tryParse('${pricing?['remaining'] ?? 0}') ?? 0;
    if (remaining > 0.009 && widget.session.seesMoney && !paid) {
      final choice = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ainda falta pagar'),
          content: Text('Falta ${brl(remaining)} neste pedido.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Voltar')),
            TextButton(onPressed: () => Navigator.pop(ctx, 'anyway'), child: const Text('Entregar mesmo assim')),
            FilledButton(onPressed: () => Navigator.pop(ctx, 'paid'), child: const Text('Cliente já pagou')),
          ],
        ),
      );
      if (choice == null) return;
      if (choice == 'paid') return deliver(paid: true);
    }
    await widget.api.dio.patch('/orders/${widget.orderId}', data: {
      'status': 'delivered',
      'deliveredAt': DateTime.now().toUtc().toIso8601String(),
      if (paid) 'pricing': {'deposit': total, 'remaining': 0},
    });
    await load();
  }

  Future<void> reopen() async {
    if (targets.isEmpty) return;
    final first = targets.firstWhere((t) => t['isTerminal'] != true, orElse: () => targets.first);
    await widget.api.dio.post('/orders/${widget.orderId}/reopen', data: {'sectorId': first['id']});
    await load();
  }

  Future<void> trash() async {
    await widget.api.dio.delete('/orders/${widget.orderId}');
    if (mounted) Navigator.of(context).pop();
  }

  Future<void> sendComment() async {
    if (comment.text.trim().isEmpty) return;
    await widget.api.dio.post('/orders/${widget.orderId}/comments', data: {'text': comment.text.trim()});
    comment.clear();
    await load();
  }

  Future<void> moveTo(Map target) async {
    final items = (order?['items'] as List? ?? const []);
    final itemId = items.isEmpty ? '' : '${(items.first as Map)['_id'] ?? (items.first as Map)['id'] ?? ''}';
    if (itemId.isNotEmpty) {
      await widget.api.dio.post('/kanban/orders/${widget.orderId}/items/$itemId/move', data: {'toSectorId': target['id']});
    } else {
      await widget.api.dio.post('/kanban/orders/${widget.orderId}/move', data: {'toSectorId': target['id']});
    }
    await load();
  }

  @override
  Widget build(BuildContext context) {
    if (order == null) {
      return WqPage(title: 'Pedido', child: Center(child: error == null ? const CircularProgressIndicator() : Text(error!)));
    }
    final pricing = order!['pricing'] as Map?;
    final items = ((order!['items'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    final history = ((order!['sectorHistory'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList().reversed.toList();
    final comments = ((order!['comments'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList().reversed.toList();
    final warranty = order!['warranty'] ?? order!['garantia'];
    final delivered = order!['status'] == 'delivered';
    return WqPage(
      title: '${order!['code'] ?? 'Pedido'}',
      subtitle: '${order!['clientName'] ?? ''}',
      actions: [
        if (!widget.session.isSector) TextButton(onPressed: widget.onEdit, child: const Text('Editar')),
      ],
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [StatusChip(order!['status']), const SizedBox(width: 8), if ('${order!['clientPhone'] ?? ''}'.isNotEmpty) Text('${order!['clientPhone']}', style: const TextStyle(color: Wq.muted))]),
              if (dayLabel(order!['dueAt']).isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Prazo ${dayLabel(order!['dueAt'])}')),
              if ('${order!['observacoes'] ?? order!['notes'] ?? ''}'.isNotEmpty)
                Padding(padding: const EdgeInsets.only(top: 6), child: Text('${order!['observacoes'] ?? order!['notes']}')),
            ]),
          ),
          if (widget.session.seesMoney && pricing != null) ...[
            const SizedBox(height: 10),
            WqCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Total ${brl(pricing['total'])}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                Text('Sinal ${brl(pricing['deposit'])} · falta ${brl(pricing['remaining'])}', style: const TextStyle(color: Wq.muted)),
                if ((num.tryParse('${pricing['discount'] ?? 0}') ?? 0) > 0) Text('Desconto ${brl(pricing['discount'])}'),
                if ((num.tryParse('${pricing['remaining'] ?? 0}') ?? 0) > 0.009)
                  TextButton(onPressed: settle, child: const Text('Cliente já pagou o restante')),
              ]),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (!delivered) FilledButton(style: FilledButton.styleFrom(backgroundColor: Wq.success), onPressed: () => deliver(paid: false), child: const Text('Marcar entregue')),
            if (delivered) OutlinedButton(onPressed: reopen, child: const Text('Reabrir')),
            if (!widget.session.isSector) TextButton(onPressed: trash, child: const Text('Lixeira', style: TextStyle(color: Wq.danger))),
          ]),
          const SizedBox(height: 16),
          const WqSectionTitle('Encaminhar'),
          Wrap(spacing: 8, children: [
            for (final target in targets)
              OutlinedButton(
                onPressed: '${order!['currentSectorId']}' == '${target['id']}' ? null : () => moveTo(target),
                child: Text('${target['name']}${target['isTerminal'] == true ? ' · fim' : ''}'),
              ),
          ]),
          const SizedBox(height: 16),
          const WqSectionTitle('Itens'),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${item['brand'] ?? ''} ${item['shoeModel'] ?? ''}'.trim(), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(((item['services'] as List?) ?? const []).whereType<Map>().map((s) => s['name']).join(', '), style: const TextStyle(color: Wq.muted)),
                  if ('${item['notes'] ?? ''}'.isNotEmpty) Text('${item['notes']}'),
                  if (((item['photos'] as List?) ?? const []).isEmpty) const Text('Sem foto', style: TextStyle(color: Wq.warn, fontSize: 12)),
                ]),
              ),
            ),
          if (warranty is Map && warranty['ativa'] == true) Text('Garantia ${warranty['duracao'] ?? '3 meses'} · ${brl(warranty['preco'])}'),
          const SizedBox(height: 12),
          const WqSectionTitle('Histórico'),
          if (history.isEmpty) const Text('Sem movimentação ainda.', style: TextStyle(color: Wq.muted)),
          for (final entry in history)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${entry['toSectorName'] ?? entry['sectorName'] ?? 'Setor'}'),
              subtitle: Text('${entry['movedByName'] ?? ''} ${dayLabel(entry['createdAt'] ?? entry['at'])}'.trim()),
            ),
          const WqSectionTitle('Comentários'),
          for (final entry in comments)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text('${entry['authorName'] ?? entry['movedByName'] ?? ''} ${entry['text'] ?? ''}'),
            ),
          TextField(controller: comment, decoration: const InputDecoration(labelText: 'Comentário')),
          Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: sendComment, child: const Text('Publicar'))),
        ],
      ),
    );
  }
}
