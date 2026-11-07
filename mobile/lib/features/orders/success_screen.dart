import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import 'label_screen.dart';
import 'label_print.dart';

class SuccessScreen extends StatefulWidget {
  const SuccessScreen({super.key, required this.api, required this.session, required this.orderId});
  final WorqeraApi api;
  final SessionStore session;
  final String orderId;

  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen> {
  Map? order;
  Map? shop;
  String? error;
  bool pdfBusy = false;
  int photoWaits = 0;
  bool labelFlowDone = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final orderRes = await widget.api.dio.get('/orders/${widget.orderId}');
      final shopRes = await widget.api.dio.get('/shops/current');
      if (!mounted) return;
      final next = Map<String, dynamic>.from(orderRes.data as Map);
      setState(() {
        order = next;
        final body = Map<String, dynamic>.from(shopRes.data as Map);
        shop = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
      });
      _labelFlow();
      if (next['photosPending'] == true && photoWaits < 40) {
        photoWaits += 1;
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) load();
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  /// After creating: ask (default), print straight away, or nothing. Chosen per device in Etiqueta e impressora.
  Future<void> _labelFlow() async {
    if (labelFlowDone || order == null || shop == null) return;
    labelFlowDone = true;
    final mode = await LabelAfterCreate.read();
    if (!mounted || mode == 'off') return;
    if (mode == 'auto') return printLabel();
    final settings = LabelSettings.fromShop(shop);
    final go = await showModalBottomSheet<bool>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Imprimir a etiqueta agora?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(labelSizes[settings.size]!.$1, style: TextStyle(color: sheet.wqMuted)),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: () => Navigator.pop(sheet, true), icon: const Icon(Icons.print_outlined), label: const Text('Imprimir etiqueta')),
            TextButton(onPressed: () => Navigator.pop(sheet, false), child: const Text('Agora não')),
          ]),
        ),
      ),
    );
    if (go == true) await printLabel();
  }

  Future<void> printLabel() async {
    final row = order;
    if (row == null) return;
    try {
      await printOrderLabels(widget.api, row, shop: shop, slug: widget.session.shopSlug);
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  String get url {
    final doc = shop;
    final row = order;
    if (doc == null || row == null) return '';
    return publicOrderUrl(slug: '${doc['slug'] ?? ''}', code: '${row['code'] ?? ''}', token: '${row['publicToken'] ?? ''}');
  }

  Future<void> pdf() async {
    setState(() => pdfBusy = true);
    try {
      final res = await widget.api.dio.post('/orders/${widget.orderId}/pdf', options: Options(responseType: ResponseType.bytes));
      final bytes = res.data;
      if (bytes is List<int>) {
        await Printing.sharePdf(bytes: Uint8List.fromList(bytes), filename: 'laudo-${order?['code'] ?? 'pedido'}.pdf');
      }
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => pdfBusy = false);
    }
  }

  Future<void> whatsApp() async {
    final row = order;
    final doc = shop;
    if (row == null || doc == null) return;
    final notes = doc['notifications'] is Map ? doc['notifications'] as Map : {};
    final wa = notes['whatsapp'] is Map ? notes['whatsapp'] as Map : {};
    if (wa['enabled'] != true) {
      wqToast(context, 'WhatsApp está desligado na empresa.');
      return;
    }
    final phone = '${row['clientPhone'] ?? ''}';
    final name = doc['branding'] is Map ? '${(doc['branding'] as Map)['displayName'] ?? doc['name'] ?? 'Worqera'}' : '${doc['name'] ?? 'Worqera'}';
    final link = waMeUrl(phone, 'Olá ${row['clientName'] ?? ''}, seu pedido ${row['code'] ?? ''} na $name: $url');
    if (link.isEmpty) {
      wqToast(context, 'Pedido sem telefone para o WhatsApp.');
      return;
    }
    await openLink(link);
  }

  @override
  Widget build(BuildContext context) {
    final row = order;
    return WqPage(
      title: 'Pedido criado',
      subtitle: row == null ? 'Preparando o laudo' : '${row['code'] ?? ''}',
      child: row == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                WqCard(
                  child: Column(children: [
                    Text('${row['code'] ?? ''}', style: monoStyle(size: 36, color: Wq.brand)),
                    const SizedBox(height: 6),
                    Text('${row['clientName'] ?? ''}'),
                    if (row['photosPending'] == true) ...[
                      const SizedBox(height: 8),
                      Text('As fotos estão subindo. O laudo e o e-mail saem com elas em seguida.', textAlign: TextAlign.center, style: TextStyle(color: context.wqMuted)),
                    ],
                    if (url.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      QrImageView(data: url, size: 180, backgroundColor: Colors.white),
                      TextButton(
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: url));
                          if (context.mounted) wqToast(context, 'Link copiado');
                        },
                        child: const Text('Copiar link público'),
                      ),
                    ],
                  ]),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: pdfBusy || row['photosPending'] == true ? null : pdf,
                  child: Text(row['photosPending'] == true ? 'Fotos subindo…' : pdfBusy ? 'Gerando laudo…' : 'Ver laudo em PDF'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: whatsApp, child: const Text('Avisar no WhatsApp')),
                const SizedBox(height: 8),
                OutlinedButton.icon(onPressed: printLabel, icon: const Icon(Icons.print_outlined), label: const Text('Imprimir etiqueta')),
                TextButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LabelScreen(api: widget.api, session: widget.session, order: row))),
                  child: const Text('Ver etiqueta'),
                ),
                const SizedBox(height: 8),
                TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Voltar ao kanban')),
              ],
            ),
    );
  }
}
