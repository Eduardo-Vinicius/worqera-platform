import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class PublicOrderScreen extends StatefulWidget {
  const PublicOrderScreen({super.key, required this.api, required this.slug, required this.code, this.token = ''});
  final WorqeraApi api;
  final String slug;
  final String code;
  final String token;

  @override
  State<PublicOrderScreen> createState() => _PublicOrderScreenState();
}

class _PublicOrderScreenState extends State<PublicOrderScreen> {
  Map? order;
  String? error;

  @override
  void initState() {
    super.initState();
    final path = widget.token.isNotEmpty
        ? '/public/track/${widget.token}'
        : (widget.slug.isEmpty ? '/public/orders/${widget.code}' : '/public/shops/${widget.slug}/orders/${widget.code}');
    widget.api.dio.get(path, queryParameters: {if (widget.token.isNotEmpty && !path.contains('/track/')) 't': widget.token}).then((res) {
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) setState(() => order = body['order'] is Map ? Map<String, dynamic>.from(body['order'] as Map) : body);
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Consulta do cliente',
      subtitle: widget.code,
      child: order == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                WqCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${order!['code'] ?? widget.code}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Wq.brand)),
                  Text('${order!['clientName'] ?? ''}'),
                  const SizedBox(height: 8),
                  StatusChip(order!['status']),
                  if ('${order!['dueAt'] ?? ''}'.isNotEmpty) Text('Previsão ${dayLabel(order!['dueAt'])}'),
                ])),
              ],
            ),
    );
  }
}
