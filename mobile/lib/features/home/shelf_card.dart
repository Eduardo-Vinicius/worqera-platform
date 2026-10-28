import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

/// Owner only: ready orders nobody picked up, and the money waiting on them.
class ShelfCard extends StatefulWidget {
  const ShelfCard({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;

  @override
  State<ShelfCard> createState() => _ShelfCardState();
}

class _ShelfCardState extends State<ShelfCard> {
  Map<String, dynamic>? shelf;
  bool open = false;

  @override
  void initState() {
    super.initState();
    if (widget.session.role == 'owner') load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/orders/shelf');
      if (mounted) setState(() => shelf = Map<String, dynamic>.from(res.data as Map));
    } catch (_) {}
  }

  Future<void> remind(Map item) async {
    final wa = item['whatsapp'];
    if (wa is! Map) return;
    await openLink('${wa['url']}');
    try {
      final res = await widget.api.dio.post('/orders/${item['id']}/shelf-remind');
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) {
        setState(() {
          item['reminders'] = body['reminders'];
          item['lastReminderAt'] = body['lastReminderAt'];
        });
      }
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> toggleCheck(Map item) async {
    final on = item['check'] == null;
    try {
      final res = await widget.api.dio.post('/orders/${item['id']}/shelf-check', data: {'on': on});
      final body = Map<String, dynamic>.from(res.data as Map);
      if (!mounted) return;
      setState(() => item['check'] = body['check']);
      wqToast(context, on ? '#${item['code']} marcado para conferir no balcão' : '#${item['code']} conferido: segue aqui');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> deliver(Map item) async {
    final due = ((item['toCollect'] as num?) ?? 0).toDouble();
    final choice = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('#${item['code']} já foi entregue?'),
        content: Text(due > 0 ? 'Faltava receber ${brl(due)}. O cliente pagou?' : 'O pedido sai da prateleira e vai para Entregues.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Ainda está aqui')),
          if (due > 0) TextButton(onPressed: () => Navigator.pop(ctx, 'unpaid'), child: const Text('Sem pagar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, 'paid'), child: Text(due > 0 ? 'Recebi' : 'Finalizar')),
        ],
      ),
    );
    if (choice == null) return;
    try {
      await widget.api.dio.patch('/orders/${item['id']}', data: {
        'status': 'delivered',
        'deliveredAt': DateTime.now().toUtc().toIso8601String(),
        if (choice == 'paid' && due > 0) 'pricing': {'deposit': item['total'], 'remaining': 0},
      });
      if (!mounted) return;
      wqToast(context, choice == 'paid' ? '#${item['code']} finalizado como entregue' : '#${item['code']} entregue · ${brl(due)} em Entregue sem pagar');
      await load();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  String daysLabel(int days) {
    if (days <= 0) return 'pronto hoje';
    if (days == 1) return 'há 1 dia';
    return 'há $days dias';
  }

  @override
  Widget build(BuildContext context) {
    final data = shelf;
    final summary = data?['summary'] is Map ? data!['summary'] as Map : const {};
    final count = (summary['count'] as num?)?.toInt() ?? 0;
    if (data == null || count == 0) return const SizedBox.shrink();
    final staleDays = data['staleDays'] ?? 3;
    final staleCount = (summary['staleCount'] as num?)?.toInt() ?? 0;
    final items = (data['items'] as List? ?? const []).whereType<Map>().toList();
    final visible = open ? items : items.take(3).toList();
    final tone = staleCount > 0 ? const Color(0xFFF59E0B) : Wq.success;
    final headline = staleCount > 0
        ? '$staleCount ${staleCount == 1 ? 'pedido pronto parado' : 'pedidos prontos parados'} há $staleDays+ dias, com ${brl(summary['staleToCollect'])} para receber.'
        : '$count ${count == 1 ? 'pedido pronto' : 'pedidos prontos'} esperando o cliente buscar.';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: context.wqSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.wqLine),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: tone, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.inventory_2_outlined, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('NA PRATELEIRA · SÓ VOCÊ VÊ', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
                const SizedBox(height: 4),
                Text(headline, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk)),
                if (((summary['checkCount'] as num?) ?? 0) > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(children: [
                      const Icon(Icons.flag_outlined, size: 15, color: Color(0xFF0284C7)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text('${summary['checkCount']} para conferir: talvez já tenham saído',
                            style: const TextStyle(color: Color(0xFF0369A1), fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ]),
                  ),
              ]),
            ),
          ]),
        ),
        Divider(height: 1, color: context.wqLine),
        Row(children: [
          for (final c in [
            ('Prontos', '$count', context.wqInk),
            ('Parados $staleDays+', '$staleCount', staleCount > 0 ? tone : context.wqMuted),
            ('A receber', brl(summary['toCollect']), context.wqInk),
          ])
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Column(children: [
                  Text(c.$2, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: c.$3)),
                  Text(c.$1, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                ]),
              ),
            ),
        ]),
        Divider(height: 1, color: context.wqLine),
        for (final item in visible)
          ListTile(
            dense: true,
            title: Row(children: [
              Expanded(
                child: Text('#${item['code']} · ${'${item['clientName'] ?? ''}'.isEmpty ? 'Cliente' : item['clientName']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              if (item['check'] != null) const Icon(Icons.flag, size: 15, color: Color(0xFF0284C7)),
            ]),
            subtitle: Text(
              [
                daysLabel((item['days'] as num?)?.toInt() ?? 0),
                ((item['toCollect'] as num?) ?? 0) > 0 ? brl(item['toCollect']) : 'pago',
                if (((item['reminders'] as num?) ?? 0) > 0) 'lembrado ${item['reminders']}x',
              ].join(' · '),
              style: TextStyle(color: item['stale'] == true ? const Color(0xFFB45309) : context.wqMuted, fontSize: 12),
            ),
            trailing: PopupMenuButton<String>(
              tooltip: 'Ações',
              onSelected: (value) {
                if (value == 'remind') remind(item);
                if (value == 'check') toggleCheck(item);
                if (value == 'deliver') deliver(item);
              },
              itemBuilder: (_) => [
                if (item['whatsapp'] is Map)
                  PopupMenuItem(value: 'remind', child: Text(((item['reminders'] as num?) ?? 0) > 0 ? 'Lembrar de novo' : 'Lembrar no WhatsApp')),
                PopupMenuItem(value: 'check', child: Text(item['check'] == null ? 'Conferir: será que já saiu?' : 'Conferido, ainda está aqui')),
                const PopupMenuItem(value: 'deliver', child: Text('Já entregue')),
              ],
            ),
          ),
        if (items.length > 3)
          TextButton(
            onPressed: () => setState(() => open = !open),
            child: Text(open ? 'Mostrar menos' : 'Ver todos os ${items.length}'),
          ),
      ]),
    );
  }
}
