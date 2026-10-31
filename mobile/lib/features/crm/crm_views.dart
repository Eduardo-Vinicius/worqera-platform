import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../quotes/quote_kit.dart' show Pill;

String brl0(dynamic v) {
  final n = v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  final whole = n.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) buf.write('.');
    buf.write(whole[i]);
  }
  return 'R\$ $buf';
}

String birthdayLabel(dynamic b) {
  if (b is! Map) return '';
  return '${'${b['day']}'.padLeft(2, '0')}/${'${b['month']}'.padLeft(2, '0')}';
}

String sinceLabel(dynamic days) {
  if (days == null) return 'Nunca pediu';
  final d = days is num ? days.toInt() : int.tryParse('$days') ?? 0;
  if (d == 0) return 'Pediu hoje';
  if (d == 1) return 'Último pedido ontem';
  if (d < 60) return 'Último pedido há $d dias';
  return 'Último pedido há ${(d / 30).round()} meses';
}

/// CRM → Base: leitura da base (IA dentro da cota do plano), números e o que fazer.
class CrmHomeView extends StatefulWidget {
  const CrmHomeView({super.key, required this.api, required this.onSegment});
  final WorqeraApi api;
  final ValueChanged<String> onSegment;

  @override
  State<CrmHomeView> createState() => _CrmHomeViewState();
}

class _CrmHomeViewState extends State<CrmHomeView> {
  Map<String, dynamic>? data;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool refresh = false}) async {
    try {
      final res = await widget.api.dio.get('/crm/insight', queryParameters: refresh ? {'refresh': '1'} : null);
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) setState(() => data = Map<String, dynamic>.from(body['insight'] as Map));
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = data;
    if (d == null) {
      return Padding(
        padding: const EdgeInsets.only(top: 40),
        child: Center(child: error == null ? const CircularProgressIndicator() : Text(error!, textAlign: TextAlign.center)),
      );
    }
    final s = Map<String, dynamic>.from(d['summary'] as Map);
    final c = Map<String, dynamic>.from(s['counts'] as Map);
    final rates = Map<String, dynamic>.from(s['rates'] as Map);
    final bdays = Map<String, dynamic>.from(s['birthdays'] as Map);
    final money = s['money'] is Map ? Map<String, dynamic>.from(s['money'] as Map) : null;
    final cards = <(String, String, String, Color, String)>[
      ('Clientes', '${c['clients']}', '${c['active90']} ativos em 90 dias', context.wqInk, 'all'),
      ('Recorrentes', '${c['recurring']}', '${rates['repeat']}% voltaram', Wq.success, 'recurring'),
      ('Sumidos', '${c['inactive']}', 'sem pedido há ${s['inactiveDays']}+ dias', const Color(0xFFD97706), 'inactive'),
      ('Novos', '${c['new30']}', 'primeiro pedido em 30 dias', Wq.brand, 'new'),
      ('Aniversariantes', '${bdays['today']}', '${bdays['week']} na semana', const Color(0xFFE11D48), 'birthdays'),
      if (money != null) ('Ticket médio', brl0(money['avgTicket']), 'gasto/cliente ${brl0(money['perClient'])}', context.wqInk, ''),
    ];
    return RefreshIndicator(
      onRefresh: () => load(refresh: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
        children: [
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('LEITURA DA BASE', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
                if (d['ai'] == true) ...[const SizedBox(width: 6), const Pill('IA', color: Wq.brand, filled: true)],
              ]),
              const SizedBox(height: 6),
              Text('${d['headline'] ?? ''}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk)),
              if ('${d['tip'] ?? ''}'.isNotEmpty)
                Padding(padding: const EdgeInsets.only(top: 6), child: Text('${d['tip']}', style: TextStyle(color: context.wqMuted, fontSize: 13))),
              for (final m in ((d['moves'] as List?) ?? const []).whereType<Map>())
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44), alignment: Alignment.centerLeft),
                    onPressed: () => widget.onSegment('${m['segment']}'),
                    child: Row(children: [
                      Expanded(child: Text('${m['title']}', style: const TextStyle(fontWeight: FontWeight.w700))),
                      const Icon(Icons.chevron_right),
                    ]),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 10),
          LayoutBuilder(builder: (context, box) {
            final w = (box.maxWidth - 8) / 2;
            return Wrap(spacing: 8, runSpacing: 8, children: [
              for (final card in cards)
                SizedBox(
                  width: w,
                  child: WqCard(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    onTap: card.$5.isEmpty ? null : () => widget.onSegment(card.$5),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(card.$1.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10, letterSpacing: 0.8, fontWeight: FontWeight.w800, color: context.wqMuted)),
                      const SizedBox(height: 4),
                      FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(card.$2, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: card.$4))),
                      Text(card.$3, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                    ]),
                  ),
                ),
            ]);
          }),
        ],
      ),
    );
  }
}

/// One CRM segment with the WhatsApp message ready for each client.
class CrmSegmentView extends StatefulWidget {
  const CrmSegmentView({super.key, required this.api, required this.segment, required this.onOpen});
  final WorqeraApi api;
  final String segment;
  final ValueChanged<String> onOpen;

  @override
  State<CrmSegmentView> createState() => _CrmSegmentViewState();
}

class _CrmSegmentViewState extends State<CrmSegmentView> {
  static const _page = 100;
  List<Map<String, dynamic>>? rows;
  String? error;
  String range = 'week';
  int days = 90;
  int total = 0;
  bool loadingMore = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(covariant CrmSegmentView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.segment != widget.segment) load();
  }

  Future<Map<String, dynamic>> _fetch(int offset) async {
    final res = await widget.api.dio.get('/crm/list', queryParameters: {
      'segment': widget.segment,
      if (widget.segment == 'birthdays') 'range': range,
      if (widget.segment == 'inactive') 'days': days,
      'limit': _page,
      if (offset > 0) 'offset': offset,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  List<Map<String, dynamic>> _items(Map body) =>
      ((body['items'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

  Future<void> load() async {
    setState(() => rows = null);
    try {
      final body = await _fetch(0);
      if (!mounted) return;
      setState(() {
        rows = _items(body);
        total = int.tryParse('${body['total'] ?? 0}') ?? 0;
        error = null;
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  Future<void> loadMore() async {
    final current = rows;
    if (current == null || loadingMore) return;
    setState(() => loadingMore = true);
    try {
      final body = await _fetch(current.length);
      final seen = current.map((r) => '${r['id']}').toSet();
      if (!mounted) return;
      setState(() {
        rows = [...current, ..._items(body).where((r) => !seen.contains('${r['id']}'))];
        total = int.tryParse('${body['total'] ?? total}') ?? total;
      });
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => loadingMore = false);
    }
  }

  Widget _filters() {
    if (widget.segment == 'birthdays') {
      return SegmentedButton<String>(
        showSelectedIcon: false,
        segments: const [
          ButtonSegment(value: 'today', label: Text('Hoje')),
          ButtonSegment(value: 'week', label: Text('7 dias')),
          ButtonSegment(value: 'month', label: Text('30 dias')),
        ],
        selected: {range},
        onSelectionChanged: (v) {
          range = v.first;
          load();
        },
      );
    }
    if (widget.segment == 'inactive') {
      return SegmentedButton<int>(
        showSelectedIcon: false,
        segments: const [
          ButtonSegment(value: 60, label: Text('60d')),
          ButtonSegment(value: 90, label: Text('90d')),
          ButtonSegment(value: 180, label: Text('180d')),
          ButtonSegment(value: 365, label: Text('1 ano')),
        ],
        selected: {days},
        onSelectionChanged: (v) {
          days = v.first;
          load();
        },
      );
    }
    return const SizedBox.shrink();
  }

  String _line(Map r) {
    final parts = <String>[
      if (widget.segment == 'birthdays')
        '${r['birthdayIn'] == 0 ? 'Hoje' : r['birthdayIn'] == 1 ? 'Amanhã' : 'Em ${r['birthdayIn']} dias'} · ${birthdayLabel(r['birthday'])}${r['age'] != null ? ' · faz ${r['age']} anos' : ''}'
      else
        sinceLabel(r['daysSince']),
      '${r['orders'] ?? 0} pedido${r['orders'] == 1 ? '' : 's'}',
      if (r['spent'] != null && (r['orders'] ?? 0) != 0) brl0(r['spent']),
    ];
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final list = rows;
    final action = widget.segment == 'birthdays'
        ? 'Parabéns'
        : widget.segment == 'inactive'
            ? 'Chamar'
            : 'Agradecer';
    return Column(children: [
      if (widget.segment == 'birthdays' || widget.segment == 'inactive')
        Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 8), child: SizedBox(width: double.infinity, child: _filters())),
      Expanded(
        child: list == null
            ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
            : list.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text('Ninguém aqui por enquanto.', textAlign: TextAlign.center, style: TextStyle(color: context.wqMuted)),
                  )
                : RefreshIndicator(
                    onRefresh: load,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                      itemCount: list.length + (list.length < total ? 1 : 0),
                      itemBuilder: (context, i) {
                        if (i == list.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Column(children: [
                              OutlinedButton(
                                onPressed: loadingMore ? null : loadMore,
                                child: loadingMore
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                    : const Text('Carregar mais'),
                              ),
                              Text('Mostrando ${list.length} de $total', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                            ]),
                          );
                        }
                        final r = list[i];
                        final wa = r['whatsapp'] is Map ? r['whatsapp'] as Map : null;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: WqCard(
                            onTap: () => widget.onOpen('${r['id']}'),
                            child: Row(children: [
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text('${r['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                                  Text(_line(r), style: TextStyle(color: context.wqMuted, fontSize: 12)),
                                ]),
                              ),
                              if (wa != null)
                                FilledButton.icon(
                                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018), padding: const EdgeInsets.symmetric(horizontal: 12)),
                                  onPressed: () => openLink('${wa['url']}'),
                                  icon: const Icon(Icons.chat, size: 16),
                                  label: Text(action),
                                ),
                            ]),
                          ),
                        );
                      },
                    ),
                  ),
      ),
    ]);
  }
}
