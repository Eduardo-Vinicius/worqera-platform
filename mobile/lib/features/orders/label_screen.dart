import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

class LabelScreen extends StatelessWidget {
  const LabelScreen({super.key, required this.api, required this.session, required this.order, this.pairs = false});
  final WorqeraApi api;
  final SessionStore session;
  final Map order;
  final bool pairs;

  String _url({int? item}) => publicOrderUrl(slug: session.shopSlug, code: '${order['code'] ?? ''}', token: '${order['publicToken'] ?? ''}', item: item);

  Future<void> printNow() async {
    final url = _url();
    final code = '${order['code'] ?? ''}';
    final client = '${order['clientName'] ?? ''}';
    final shop = session.shopName.isEmpty ? 'Worqera' : session.shopName;
    final items = ((order['items'] as List?) ?? const []).whereType<Map>().toList();
    final doc = pw.Document();
    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a6,
        build: (_) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Text(shop.toUpperCase(), style: const pw.TextStyle(fontSize: 10, letterSpacing: 1.4)),
            pw.SizedBox(height: 8),
            pw.Text('Pedido', style: const pw.TextStyle(fontSize: 9)),
            pw.Text(code, style: pw.TextStyle(fontSize: 28, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 6),
            pw.Text(client, style: const pw.TextStyle(fontSize: 12)),
            if (items.isNotEmpty)
              pw.Text(items.map((item) => '${item['shoeModel'] ?? ''}'.trim()).where((s) => s.isNotEmpty).join(', '), style: const pw.TextStyle(fontSize: 9)),
            if (url.isNotEmpty) ...[
              pw.SizedBox(height: 12),
              pw.BarcodeWidget(barcode: pw.Barcode.qrCode(), data: url, width: 120, height: 120),
              pw.SizedBox(height: 6),
              pw.Text('Escaneie para acompanhar', style: const pw.TextStyle(fontSize: 8)),
            ],
          ],
        ),
      ),
    );
    await Printing.layoutPdf(onLayout: (_) => doc.save(), name: 'etiqueta-$code.pdf');
  }

  @override
  Widget build(BuildContext context) {
    final items = ((order['items'] as List?) ?? const []).whereType<Map>().toList();
    final url = _url();
    return WqPage(
      title: 'Etiqueta',
      subtitle: '${order['code'] ?? ''}',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WqCard(
            child: Column(children: [
              Text(session.shopName.isEmpty ? 'Worqera' : session.shopName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 8),
              Text('${order['code'] ?? ''}', style: monoStyle(size: 32, color: Wq.brand)),
              Text('${order['clientName'] ?? ''}', style: const TextStyle(fontSize: 16)),
              if (items.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(items.map((item) => '${item['brand'] ?? ''} ${item['shoeModel'] ?? ''}'.trim()).where((s) => s.isNotEmpty).join(' · '), textAlign: TextAlign.center),
                ),
              const SizedBox(height: 16),
              if (url.isEmpty)
                const Text('Sem código público para o QR.', style: TextStyle(color: Wq.muted))
              else
                QrImageView(data: url, size: 220, backgroundColor: Colors.white),
              const SizedBox(height: 8),
              Text('${items.length} ${items.length == 1 ? 'item' : 'itens'}', style: const TextStyle(color: Wq.muted)),
              const SizedBox(height: 16),
              FilledButton(onPressed: url.isEmpty ? null : () => printNow(), child: const Text('Imprimir agora')),
              if (items.length > 1)
                TextButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LabelScreen(api: api, session: session, order: order, pairs: !pairs))),
                  child: Text(pairs ? 'Só o pedido' : 'Imprimir pares'),
                ),
            ]),
          ),
          if (pairs)
            for (var i = 0; i < items.length; i++)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: WqCard(
                  child: Column(children: [
                    Text('Par ${i + 1}', style: const TextStyle(color: Wq.muted)),
                    Text('${order['code']}-${i + 1}', style: monoStyle(size: 28, color: Wq.brand)),
                    Text('${items[i]['shoeModel'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    QrImageView(data: _url(item: i + 1), size: 140, backgroundColor: Colors.white),
                  ]),
                ),
              ),
        ],
      ),
    );
  }
}
