import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';
import 'quote_kit.dart';

/// Orçamentos → Recuperados: quem voltou, qual era o problema, como reverteu e quem fez.
class RecoveredView extends StatefulWidget {
  const RecoveredView({super.key, required this.api, required this.onOpen});
  final WorqeraApi api;
  final void Function(String quoteId) onOpen;

  @override
  State<RecoveredView> createState() => _RecoveredViewState();
}

class _RecoveredViewState extends State<RecoveredView> {
  int days = 30;
  Map<String, dynamic>? report;
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/quotes/recovered', queryParameters: {'days': days});
      if (!mounted) return;
      setState(() {
        report = Map<String, dynamic>.from(res.data as Map);
        error = null;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = widget.api.message(e);
        loading = false;
      });
    }
  }

  List<Map> _list(String key) => ((report?[key] as List?) ?? const []).whereType<Map>().toList();

  String _dec(dynamic v) => '${v ?? 0}'.replaceAll('.', ',');

  @override
  Widget build(BuildContext context) {
    final s = report?['summary'] is Map ? report!['summary'] as Map : const {};
    final totals = report?['showsTotals'] != false;
    final items = _list('items');
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SegmentedButton<int>(
        showSelectedIcon: false,
        segments: const [
          ButtonSegment(value: 30, label: Text('30 dias')),
          ButtonSegment(value: 90, label: Text('90 dias')),
          ButtonSegment(value: 365, label: Text('1 ano')),
        ],
        selected: {days},
        onSelectionChanged: (v) {
          days = v.first;
          load();
        },
      ),
      const SizedBox(height: 12),
      if (loading && report == null)
        const Padding(padding: EdgeInsets.only(top: 40), child: Center(child: CircularProgressIndicator()))
      else if (error != null)
        Padding(padding: const EdgeInsets.only(top: 24), child: Text(error!, textAlign: TextAlign.center))
      else ...[
        LayoutBuilder(builder: (context, box) {
          final w = (box.maxWidth - 8) / 2;
          final cards = [
            ('Recuperados', '${s['count'] ?? 0}', totals ? money0(s['value'] ?? 0) : 'em $days dias', Wq.success),
            ('Taxa', '${s['rate'] ?? 0}%', '${s['lost'] ?? 0} desistiram', Wq.action),
            ('Contatos até fechar', _dec(s['avgContacts']), 'média por cliente', Wq.brand),
            ('Pessoas por lead', _dec(s['avgPeople']), 'quem atuou', context.wqInk),
          ];
          return Wrap(spacing: 8, runSpacing: 8, children: [
            for (final c in cards)
              SizedBox(
                width: w,
                child: WqCard(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(c.$1.toUpperCase(), maxLines: 2, style: TextStyle(fontSize: 10, letterSpacing: 0.8, fontWeight: FontWeight.w800, color: context.wqMuted)),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(c.$2, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: c.$4)),
                    ),
                    Text(c.$3, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                  ]),
                ),
              ),
          ]);
        }),
        const SizedBox(height: 12),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: Text(
              'Nenhum recuperado nesse período. Ao marcar Recuperado, conte como foi: aparece aqui.',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.wqMuted),
            ),
          )
        else ...[
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Problema → como reverteu', style: TextStyle(fontWeight: FontWeight.w800)),
              for (final r in _list('byReason')) ...[
                const SizedBox(height: 10),
                Text('${r['label']} · ${r['count']} recuperado${r['count'] == 1 ? '' : 's'}', style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final h in ((r['hows'] as List?) ?? const []).whereType<Map>()) Pill('${h['label']} · ${h['count']}', color: Wq.success),
                ]),
              ],
            ]),
          ),
          const SizedBox(height: 10),
          if (_list('byPerson').isNotEmpty)
            WqCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Quem recuperou', style: TextStyle(fontWeight: FontWeight.w800)),
                for (final p in _list('byPerson'))
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(children: [
                      Expanded(child: Text('${p['name']}', maxLines: 1, overflow: TextOverflow.ellipsis)),
                      Text('${p['count']}${totals && (p['value'] ?? 0) != 0 ? ' · ${money0(p['value'])}' : ''}', style: TextStyle(color: context.wqMuted)),
                    ]),
                  ),
              ]),
            ),
          const SizedBox(height: 10),
          for (final it in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                onTap: () => widget.onOpen('${it['id']}'),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text(
                        '${it['name']}${'${it['orderCode'] ?? ''}'.isEmpty ? '' : ' · #${it['orderCode']}'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    if ((it['value'] ?? 0) != 0) Text(money0(it['value']), style: const TextStyle(fontWeight: FontWeight.w800)),
                  ]),
                  const SizedBox(height: 4),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    if ('${it['reasonLabel'] ?? ''}'.isNotEmpty) Pill('${it['reasonLabel']}', color: context.wqMuted),
                    if ('${it['howLabel'] ?? ''}'.isNotEmpty) Pill('${it['howLabel']}', color: Wq.success),
                  ]),
                  const SizedBox(height: 4),
                  Text(
                    [
                      '${it['contacts'] ?? 0} contato${it['contacts'] == 1 ? '' : 's'}',
                      if ((it['people'] as List?)?.isNotEmpty == true) (it['people'] as List).join(', '),
                    ].join(' · '),
                    style: TextStyle(color: context.wqMuted, fontSize: 12),
                  ),
                  if ('${it['note'] ?? ''}'.isNotEmpty)
                    Text('${it['note']}', style: TextStyle(color: context.wqMuted, fontSize: 12, fontStyle: FontStyle.italic)),
                ]),
              ),
            ),
        ],
      ],
    ]);
  }
}
