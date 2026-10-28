import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:printing/printing.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../quotes/quote_kit.dart';
import 'label_screen.dart';
import 'notify_client_sheet.dart';
import 'public_order_screen.dart';

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

  Future<void> resendEmail() async {
    try {
      final res = await widget.api.dio.post('/orders/${widget.orderId}/resend-email', data: {'kind': 'created'});
      final body = Map<String, dynamic>.from(res.data as Map);
      final notify = body['emailNotify'] is Map ? Map<String, dynamic>.from(body['emailNotify'] as Map) : body;
      if (!mounted) return;
      final queued = notify['queued'] == true;
      final ok = notify['ok'] == true;
      wqToast(context, queued || ok ? 'Laudo a caminho' : 'Não enviou o laudo');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.api.message(e))));
    }
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
    if (mounted) wqToast(context, 'Encaminhado');
  }

  Future<void> sharePdf() async {
    try {
      final res = await widget.api.dio.post('/orders/${widget.orderId}/pdf', options: Options(responseType: ResponseType.bytes));
      final bytes = res.data;
      if (bytes is List<int>) await Printing.sharePdf(bytes: Uint8List.fromList(bytes), filename: 'laudo-${order?['code'] ?? 'pedido'}.pdf');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> whatsApp() async {
    final phone = '${order?['clientPhone'] ?? ''}';
    final url = publicOrderUrl(slug: widget.session.shopSlug, code: '${order?['code'] ?? ''}', token: '${order?['publicToken'] ?? ''}');
    final link = waMeUrl(phone, 'Pedido ${order?['code'] ?? ''} · ${order?['clientName'] ?? ''}\n$url');
    if (link.isEmpty) {
      wqToast(context, 'Sem telefone para o WhatsApp.');
      return;
    }
    await openLink(link);
  }

  String _id(dynamic raw) => raw is Map ? '${raw['_id'] ?? raw['id'] ?? ''}' : '${raw ?? ''}';

  String get _currentSector => _id(order?['currentSectorId']);

  bool get _atFinal =>
      order?['status'] == 'ready' || targets.any((t) => '${t['id']}' == _currentSector && t['isTerminal'] == true);

  Map? get _nextTarget {
    final planned = ((order?['plannedSectorIds'] as List?) ?? const []).map(_id).toList();
    final idx = planned.indexOf(_currentSector);
    if (idx < 0 || idx + 1 >= planned.length) return null;
    for (final t in targets) {
      if ('${t['id']}' == planned[idx + 1]) return t;
    }
    return null;
  }

  Future<void> notifyClient() async {
    final pricing = order?['pricing'] as Map?;
    await showNotifyClientSheet(
      context,
      clientName: '${order?['clientName'] ?? ''}',
      phone: '${order?['clientPhone'] ?? ''}',
      email: '${order?['clientEmail'] ?? ''}',
      code: '${order?['code'] ?? ''}',
      link: publicOrderUrl(slug: widget.session.shopSlug, code: '${order?['code'] ?? ''}', token: '${order?['publicToken'] ?? ''}'),
      shopName: widget.session.shopName,
      status: '${order?['status'] ?? ''}',
      dueAt: '${order?['dueAt'] ?? ''}',
      remaining: num.tryParse('${pricing?['remaining'] ?? 0}') ?? 0,
    );
  }

  Widget _header(BuildContext context, {required Map? pricing, required bool delivered, required bool canRefuse}) {
    final name = '${order!['clientName'] ?? ''}'.trim();
    final phone = '${order!['clientPhone'] ?? ''}';
    final email = '${order!['clientEmail'] ?? ''}'.trim();
    final initials = name.isEmpty ? '?' : name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2).map((p) => p[0].toUpperCase()).join();
    final due = DateTime.tryParse('${order!['dueAt'] ?? ''}');
    final late = due != null && due.isBefore(DateTime.now()) && !delivered;
    final total = num.tryParse('${pricing?['total'] ?? 0}') ?? 0;
    final remaining = num.tryParse('${pricing?['remaining'] ?? 0}') ?? 0;
    final next = _nextTarget;
    final sectorName = targets.where((t) => '${t['id']}' == _currentSector).map((t) => '${t['name']}').firstOrNull;
    return WqCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Container(
            width: 46,
            height: 46,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: Wq.brand.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
            child: Text(initials, style: const TextStyle(fontWeight: FontWeight.w800, color: Wq.brand)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name.isEmpty ? 'Cliente' : name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              Text('#${order!['code'] ?? ''}', style: TextStyle(color: context.wqMuted, fontFamily: 'monospace')),
              if ('${order!['openedByName'] ?? ''}'.isNotEmpty)
                Text('Aberto por ${order!['openedByName']}', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              if (order!['recovered'] is Map)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Wq.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                    child: const Text('Recuperado', style: TextStyle(color: Wq.success, fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
                ),
            ]),
          ),
          StatusChip(order!['status']),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 6, runSpacing: 6, children: [
          ActionChip(
            avatar: const Icon(Icons.phone_outlined, size: 16),
            label: Text(phone.isEmpty ? 'Sem telefone' : maskPhone(phone)),
            onPressed: phone.isEmpty ? null : () => openLink('tel:${phone.replaceAll(RegExp(r'\D'), '')}'),
          ),
          ActionChip(
            avatar: const Icon(Icons.mail_outline, size: 16),
            label: Text(email.isEmpty ? 'Sem e-mail' : email, overflow: TextOverflow.ellipsis),
            onPressed: email.isEmpty ? null : () => openLink('mailto:$email'),
          ),
          if (sectorName != null) Chip(label: Text(sectorName), visualDensity: VisualDensity.compact),
          if (due != null)
            Chip(
              label: Text('${late ? 'Atrasado · ' : 'Prazo '}${dayLabel(order!['dueAt'])}', style: TextStyle(color: late ? Wq.danger : null)),
              visualDensity: VisualDensity.compact,
            ),
        ]),
        if (widget.session.seesMoney && pricing != null) ...[
          const SizedBox(height: 10),
          Text(total <= 0.009 ? 'VALOR' : remaining > 0.009 ? 'FALTA RECEBER' : 'TOTAL', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
          Text(
            total <= 0.009 ? 'Pendente' : brl(remaining > 0.009 ? remaining : total),
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5, color: total > 0.009 && remaining > 0.009 ? const Color(0xFFB45309) : context.wqInk),
          ),
          if (total > 0.009) Text(remaining > 0.009 ? 'de ${brl(total)}' : 'Pago', style: TextStyle(color: context.wqMuted, fontSize: 12)),
        ],
        const SizedBox(height: 12),
        Row(children: [
          if (!delivered && (_atFinal ? !widget.session.isSector : next != null)) ...[
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: Wq.action, minimumSize: const Size.fromHeight(46)),
                onPressed: _atFinal ? () => deliver(paid: false) : () => moveTo(next!),
                icon: Icon(_atFinal ? Icons.inventory_2_outlined : Icons.arrow_forward, size: 18),
                label: Text(_atFinal ? 'Entregar' : '${next!['name']}', overflow: TextOverflow.ellipsis),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018), minimumSize: const Size.fromHeight(46)),
              onPressed: notifyClient,
              icon: const Icon(Icons.chat_outlined, size: 18),
              label: const Text('Avisar'),
            ),
          ),
          if (canRefuse) ...[
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: Wq.brand, minimumSize: const Size.fromHeight(46)),
                onPressed: () async {
                  final ok = await showRefuseQuoteSheet(
                    context,
                    api: widget.api,
                    orderId: widget.orderId,
                    code: '${order!['code'] ?? ''}',
                    clientName: name,
                  );
                  if (ok) await load();
                },
                icon: const Icon(Icons.phone_disabled_outlined, size: 18),
                label: const Text('Não fechou'),
              ),
            ),
          ],
        ]),
      ]),
    );
  }

  String _photo(dynamic photo) {
    if (photo is Map) return fileUrl('${photo['url'] ?? photo['src'] ?? photo['key'] ?? ''}');
    return fileUrl('$photo');
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
    final refused = order!['quoteRefusal'] is Map && (order!['quoteRefusal'] as Map)['refusedAt'] != null;
    final canRefuse = !widget.session.isSector && !delivered && order!['status'] != 'cancelled';
    return WqPage(
      title: '${order!['code'] ?? 'Pedido'}',
      subtitle: '${order!['clientName'] ?? ''}',
      actions: [
        if (!widget.session.isSector) TextButton(onPressed: widget.onEdit, child: const Text('Editar')),
      ],
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (refused) ...[
            WqCard(
              child: Row(children: [
                const Icon(Icons.request_quote_outlined, color: Wq.brand),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Orçamento não fechado', style: TextStyle(fontWeight: FontWeight.w800)),
                    Text('Está em Orçamentos para ligar de novo.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 10),
          ],
          _header(context, pricing: pricing, delivered: delivered, canRefuse: canRefuse),
          if ('${order!['observacoes'] ?? order!['notes'] ?? ''}'.isNotEmpty) ...[
            const SizedBox(height: 10),
            WqCard(child: Text('${order!['observacoes'] ?? order!['notes']}')),
          ],
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
            if (!widget.session.isSector && '${order!['clientEmail'] ?? ''}'.trim().isNotEmpty)
              OutlinedButton(onPressed: resendEmail, child: const Text('Reenviar laudo')),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LabelScreen(api: widget.api, session: widget.session, order: order!))),
              child: const Text('Etiqueta'),
            ),
            if (items.length > 1)
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LabelScreen(api: widget.api, session: widget.session, order: order!, pairs: true))),
                child: const Text('Etiqueta por par'),
              ),
            OutlinedButton(onPressed: sharePdf, child: const Text('Laudo PDF')),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => PublicOrderScreen(api: widget.api, slug: widget.session.shopSlug, code: '${order!['code'] ?? ''}', token: '${order!['publicToken'] ?? ''}'))),
              child: const Text('Ver como cliente'),
            ),
            if (!delivered && !_atFinal) OutlinedButton(onPressed: () => deliver(paid: false), child: const Text('Marcar entregue')),
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
                  if ('${item['notes'] ?? ''}'.isNotEmpty) Text('Obs. do par: ${item['notes']}'),
                  for (final service in ((item['services'] as List?) ?? const []).whereType<Map>())
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${service['name'] ?? 'Serviço'}${(num.tryParse('${service['price'] ?? 0}') ?? 0) <= 0.009 ? ' · Pendente valor' : ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                        if ('${service['note'] ?? ''}'.isNotEmpty) Text('${service['note']}', style: const TextStyle(color: Wq.muted)),
                      ]),
                    ),
                  if (((item['photos'] as List?) ?? const []).isEmpty)
                    const Text('Sem foto', style: TextStyle(color: Wq.warn, fontSize: 12))
                  else
                    SizedBox(
                      height: 72,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          for (final photo in (item['photos'] as List))
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: Image.network(_photo(photo), width: 72, height: 72, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox(width: 72, child: Icon(Icons.image_not_supported_outlined))),
                            ),
                        ],
                      ),
                    ),
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
