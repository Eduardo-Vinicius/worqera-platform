import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

/// Produtos → Repor estoque: hora de pedir, a caminho e atrasado.
class RestockCard extends StatefulWidget {
  const RestockCard({super.key, required this.api, required this.onChanged, this.refreshKey = 0});
  final WorqeraApi api;
  final VoidCallback onChanged;
  final int refreshKey;

  @override
  State<RestockCard> createState() => _RestockCardState();
}

class _RestockCardState extends State<RestockCard> {
  Map<String, dynamic>? report;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(covariant RestockCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey) load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/products/restock');
      if (mounted) setState(() => report = Map<String, dynamic>.from(res.data as Map));
    } catch (_) {
      if (mounted) setState(() => report = null);
    }
  }

  List<Map> _group(String key) => ((report?[key] as List?) ?? const []).whereType<Map>().toList();

  Future<void> _run(Future<void> Function() fn, String ok) async {
    setState(() => busy = true);
    try {
      await fn();
      if (mounted) wqToast(context, ok);
      await load();
      widget.onChanged();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _order(Map row) async {
    final lead = int.tryParse('${row['leadTimeDays'] ?? 0}') ?? 0;
    final available = int.tryParse('${row['available'] ?? 0}') ?? 0;
    final point = int.tryParse('${row['reorderPoint'] ?? 0}') ?? 0;
    final minQty = int.tryParse('${row['minQty'] ?? 0}') ?? 0;
    final qty = TextEditingController(text: '${[1, minQty, point * 2 - available].reduce((a, b) => a > b ? a : b)}');
    final days = TextEditingController(text: '${lead > 0 ? lead : 30}');
    final variants = ((row['variants'] as List?) ?? const []).whereType<Map>().toList();
    String variantId = variants.isEmpty ? '' : '${variants.first['id']}';
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialog) => AlertDialog(
          title: Text('Pedi ${row['name']} ao fornecedor'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            if (variants.isNotEmpty)
              DropdownButtonFormField<String>(
                initialValue: variantId,
                decoration: const InputDecoration(labelText: 'Variação'),
                items: [for (final v in variants) DropdownMenuItem(value: '${v['id']}', child: Text('${v['name']} · ${v['available'] ?? 0} disp.'))],
                onChanged: (v) => setDialog(() => variantId = v ?? ''),
              ),
            TextField(controller: qty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantidade')),
            TextField(controller: days, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Chega em quantos dias?')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );
    final q = int.tryParse(qty.text) ?? 0;
    final d = int.tryParse(days.text) ?? 0;
    qty.dispose();
    days.dispose();
    if (go != true || q <= 0) return;
    await _run(() async {
      await widget.api.dio.post('/products/${row['id']}/restock', data: {
        'qty': q,
        'expectedAt': DateTime.now().add(Duration(days: d)).toUtc().toIso8601String(),
        if (variantId.isNotEmpty) 'variantId': variantId,
      });
    }, 'Anotado: pedido ao fornecedor');
  }

  String _date(dynamic iso) {
    final d = DateTime.tryParse('$iso')?.toLocal();
    if (d == null) return '';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
  }

  Widget _row(Map row, String state) {
    final restock = row['restock'] is Map ? row['restock'] as Map : null;
    final detail = [
      '${row['available'] ?? 0} disponível',
      if (row['daysOfStock'] != null) 'dá ~${row['daysOfStock']} dias',
      if ((row['leadTimeDays'] ?? 0) != 0) 'fornecedor ${row['leadTimeDays']} dias',
      if (restock != null) 'pediu ${restock['qty']} em ${_date(restock['orderedAt'])}',
      if (restock?['expectedAt'] != null) state == 'late' ? 'era p/ ${_date(restock!['expectedAt'])}' : 'chega ${_date(restock!['expectedAt'])}',
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${row['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(detail, style: TextStyle(color: context.wqMuted, fontSize: 12)),
          ]),
        ),
        if (state == 'order')
          FilledButton(onPressed: busy ? null : () => _order(row), child: const Text('Pedi'))
        else ...[
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF059669)),
            onPressed: busy ? null : () => _run(() => widget.api.dio.post('/products/${row['id']}/restock/arrived', data: {}), '${row['name']}: estoque atualizado'),
            child: const Text('Chegou'),
          ),
          IconButton(
            tooltip: 'Cancelar pedido',
            onPressed: busy ? null : () => _run(() => widget.api.dio.delete('/products/${row['id']}/restock'), 'Pedido ao fornecedor cancelado'),
            icon: const Icon(Icons.close),
          ),
        ],
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final late = _group('late');
    final order = _group('order');
    final coming = _group('coming');
    if (late.isEmpty && order.isEmpty && coming.isEmpty) return const SizedBox.shrink();
    Widget title(String text, Color color) => Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Text(text, style: TextStyle(color: color, fontSize: 11, letterSpacing: 1.1, fontWeight: FontWeight.w800)),
        );
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Repor estoque', style: TextStyle(fontWeight: FontWeight.w800)),
          Text('Mínimo, prazo do fornecedor e o quanto sai por dia.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
          if (late.isNotEmpty) ...[title('ATRASADO', Wq.danger), for (final r in late) _row(r, 'late')],
          if (order.isNotEmpty) ...[title('HORA DE PEDIR', Wq.warn), for (final r in order) _row(r, 'order')],
          if (coming.isNotEmpty) ...[title('A CAMINHO', Wq.brand), for (final r in coming) _row(r, 'coming')],
        ]),
      ),
    );
  }
}
