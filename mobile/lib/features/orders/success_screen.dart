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
      setState(() {
        order = Map<String, dynamic>.from(orderRes.data as Map);
        final body = Map<String, dynamic>.from(shopRes.data as Map);
        shop = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
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
                FilledButton(onPressed: pdfBusy ? null : pdf, child: Text(pdfBusy ? 'Gerando laudo…' : 'Ver laudo em PDF')),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: whatsApp, child: const Text('Avisar no WhatsApp')),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LabelScreen(api: widget.api, session: widget.session, order: row))),
                  child: const Text('Etiqueta'),
                ),
                const SizedBox(height: 8),
                TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Voltar ao kanban')),
              ],
            ),
    );
  }
}
