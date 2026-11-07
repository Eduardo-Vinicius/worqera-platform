import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import 'label_print.dart';

class LabelScreen extends StatelessWidget {
  const LabelScreen({super.key, required this.api, required this.session, required this.order, this.pairs = false});
  final WorqeraApi api;
  final SessionStore session;
  final Map order;
  final bool pairs;

  String _url({int? item}) => publicOrderUrl(slug: session.shopSlug, code: '${order['code'] ?? ''}', token: '${order['publicToken'] ?? ''}', item: item);

  Future<void> printNow(BuildContext context) async {
    try {
      await printOrderLabels(api, order, slug: session.shopSlug, perItem: pairs ? true : null);
    } catch (e) {
      if (context.mounted) wqToast(context, api.message(e));
    }
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
              FilledButton(onPressed: url.isEmpty ? null : () => printNow(context), child: const Text('Imprimir agora')),
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
