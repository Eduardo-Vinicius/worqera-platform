import 'dart:async';

import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../brand/tokens.dart';
import '../../design/ui.dart';

class TvClientScreen extends StatefulWidget {
  const TvClientScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<TvClientScreen> createState() => _TvClientScreenState();
}

class _TvClientScreenState extends State<TvClientScreen> {
  List<Map<String, dynamic>> rows = [];
  Timer? timer;
  final page = PageController();
  int tiles = 4;
  String title = 'TV Cliente';

  @override
  void initState() {
    super.initState();
    load();
    widget.api.dio.get('/shops/current').then((res) {
      final body = Map<String, dynamic>.from(res.data as Map);
      final shop = body['shop'] is Map ? body['shop'] as Map : body;
      final client = shop['tvSettings'] is Map ? (shop['tvSettings'] as Map)['client'] : null;
      final ms = client is Map ? int.tryParse('${client['carouselMs'] ?? 8000}') ?? 8000 : 8000;
      final count = client is Map ? int.tryParse('${client['tilesPerPage'] ?? 4}') ?? 4 : 4;
      final label = client is Map ? '${client['title'] ?? ''}' : '';
      if (!mounted) return;
      setState(() {
        tiles = count.clamp(1, 8);
        if (label.isNotEmpty) title = label;
      });
      timer?.cancel();
      timer = Timer.periodic(Duration(milliseconds: ms), (_) {
        load();
        if (!page.hasClients || rows.isEmpty) return;
        final next = ((page.page ?? 0).round() + 1) % ((rows.length / tiles).ceil().clamp(1, 99));
        page.animateToPage(next, duration: const Duration(milliseconds: 500), curve: Curves.easeOut);
      });
    }).catchError((_) {});
  }

  @override
  void dispose() {
    timer?.cancel();
    page.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/orders', queryParameters: {'limit': 40});
      final all = asMaps(res.data);
      final open = all.where((row) => row['status'] != 'delivered' && row['status'] != 'cancelled').toList();
      if (mounted) setState(() => rows = open);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WqTokens.ink,
      appBar: AppBar(backgroundColor: WqTokens.ink, foregroundColor: Colors.white, title: Text(title)),
      body: PageView.builder(
        controller: page,
        itemCount: rows.isEmpty ? 1 : (rows.length / tiles).ceil(),
        itemBuilder: (_, pageIndex) {
          final slice = rows.skip(pageIndex * tiles).take(tiles).toList();
          return GridView.count(
            crossAxisCount: 2,
            padding: const EdgeInsets.all(12),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              for (final row in slice)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: WqTokens.ink2, borderRadius: BorderRadius.circular(16)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text('${row['code'] ?? ''}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text('${row['clientName'] ?? ''}', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 16)),
                    Text(statusLabel(row['status']), style: const TextStyle(color: Wq.action, fontWeight: FontWeight.w700)),
                  ]),
                ),
            ],
          );
        },
      ),
    );
  }
}

class TvFloorScreen extends StatefulWidget {
  const TvFloorScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<TvFloorScreen> createState() => _TvFloorScreenState();
}

class _TvFloorScreenState extends State<TvFloorScreen> {
  List<Map<String, dynamic>> sectors = [];
  Timer? timer;

  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 15), (_) => load());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/sectors/stats');
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) setState(() => sectors = asMaps({'data': body['sectors'] ?? body['data']}));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WqTokens.ink,
      appBar: AppBar(backgroundColor: WqTokens.ink, foregroundColor: Colors.white, title: const Text('TV Oficina')),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(12),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        children: [
          for (final sector in sectors)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: WqTokens.ink2,
                borderRadius: BorderRadius.circular(16),
                border: (int.tryParse('${sector['count'] ?? 0}') ?? 0) > 3 ? const Border.fromBorderSide(BorderSide(color: Wq.warn, width: 2)) : null,
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('${sector['count'] ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w800)),
                Text('${sector['name'] ?? ''}', textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 16)),
              ]),
            ),
        ],
      ),
    );
  }
}

class TvFinanceBoard extends StatefulWidget {
  const TvFinanceBoard({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<TvFinanceBoard> createState() => _TvFinanceBoardState();
}

class _TvFinanceBoardState extends State<TvFinanceBoard> {
  Map? summary;

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/metrics/finance', queryParameters: {'period': '30d'}).then((res) {
      final body = Map<String, dynamic>.from(res.data as Map);
      final inner = body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : body;
      if (mounted) setState(() => summary = inner['summary'] as Map?);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WqTokens.ink,
      appBar: AppBar(backgroundColor: WqTokens.ink, foregroundColor: Colors.white, title: const Text('TV Financeiro')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _big('Recebido', summary?['receivedRevenue']),
          _big('Previsto', summary?['expectedRevenue']),
          _big('Pendente', summary?['pendingRevenue']),
          _big('Ticket', summary?['averageTicket']),
          _big('Lucro', summary?['realizedProfit']),
          const SizedBox(height: 8),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: () {
              final expected = double.tryParse('${summary?['expectedRevenue'] ?? 0}') ?? 0;
              final received = double.tryParse('${summary?['receivedRevenue'] ?? 0}') ?? 0;
              if (expected <= 0) return 0.0;
              return (received / expected).clamp(0, 1).toDouble();
            }()),
            duration: const Duration(milliseconds: 500),
            builder: (_, value, _) => LinearProgressIndicator(value: value, minHeight: 10, color: Wq.action),
          ),
        ],
      ),
    );
  }

  Widget _big(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Color(0xFF94A3B8), letterSpacing: 1.4)),
        Text(brl(value), style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800)),
      ]),
    );
  }
}
