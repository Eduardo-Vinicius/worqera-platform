import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class QrScreen extends StatefulWidget {
  const QrScreen({super.key, required this.api, required this.session, required this.openOrder});
  final WorqeraApi api;
  final SessionStore session;
  final void Function(String id) openOrder;

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> {
  final code = TextEditingController();
  bool busy = false;
  String? error;

  Future<void> lookup(String raw) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      var value = raw.trim();
      final match = RegExp(r'/p/([^/]+)/([^/?#]+)').firstMatch(value);
      if (match != null) {
        final slug = match.group(1)!;
        value = Uri.decodeComponent(match.group(2)!);
        if (widget.session.shopSlug.isNotEmpty && slug != widget.session.shopSlug) {
          throw Exception('Este QR é de outra empresa.');
        }
      }
      final res = await widget.api.dio.get('/orders', queryParameters: {'code': value});
      final body = res.data;
      final list = body is Map ? (body['data'] ?? body['orders'] ?? []) : body;
      if (list is! List || list.isEmpty) throw Exception('Pedido não encontrado.');
      final id = '${(list.first as Map)['id'] ?? (list.first as Map)['_id']}';
      widget.openOrder(id);
    } catch (e) {
      setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(onPressed: () => ShellScope.maybeOf(context)?.openMenu(), icon: const Icon(Icons.menu)),
        title: const Text('Ler QR'),
      ),
      body: Column(children: [
        SizedBox(
          height: 280,
          child: MobileScanner(onDetect: (capture) {
            final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
            if (raw != null) lookup(raw);
          }),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            const Text('O simulador não lê etiqueta de verdade. Digite o código.', style: TextStyle(color: Wq.muted)),
            const SizedBox(height: 8),
            TextField(controller: code, decoration: const InputDecoration(labelText: 'Código do pedido')),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(error!, style: const TextStyle(color: Wq.danger))),
            const SizedBox(height: 8),
            FilledButton(onPressed: busy ? null : () => lookup(code.text), child: const Text('Buscar')),
          ]),
        ),
      ]),
    );
  }
}
