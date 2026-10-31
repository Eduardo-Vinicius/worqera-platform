import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

const _periods = <(String, String)>[('7d', '7 dias'), ('30d', '30 dias'), ('90d', '90 dias'), ('1y', '1 ano')];
const _statusLabel = {'open': 'Aberto', 'in_progress': 'Em andamento', 'ready': 'Pronto'};

/// Gestão → Atendimento (dono/admin): quem abriu cada pedido, quanto vendeu, a nota do cliente e o que falta marcar.
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key, required this.api});
  final WorqeraApi api;

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  String period = '30d';
  Map<String, dynamic>? report;
  List<Map<String, dynamic>> attendants = [];
  final Map<String, String> pick = {};
  String saving = '';
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
    widget.api.dio.get('/employees', queryParameters: {'active': 'true', 'attends': 'true'}).then((res) {
      final raw = res.data is Map ? (res.data as Map)['employees'] : null;
      if (!mounted) return;
      setState(() {
        attendants = [
          for (final row in (raw is List ? raw : const []).whereType<Map>()) {'id': '${row['id'] ?? row['_id'] ?? ''}', 'name': '${row['name'] ?? ''}'},
        ];
      });
    }).catchError((_) {});
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/metrics/attendance', queryParameters: {'periodo': period});
      if (mounted) {
        setState(() {
          report = Map<String, dynamic>.from(res.data as Map);
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List<Map> get _rows => ((report?['rows'] as List?) ?? const []).whereType<Map>().toList();

  String _dec(dynamic v) => '$v'.replaceAll('.', ',');

  Future<void> copyCsv() async {
    String cell(dynamic v) {
      final s = v == null ? '' : '$v';
      return RegExp(r'[";\n,]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
    }

    String money(dynamic v) => (num.tryParse('$v') ?? 0).toStringAsFixed(2).replaceAll('.', ',');
    final lines = [
      'Quem;Pedidos;Entregues;Recusados;Vendido;Ticket médio;Nota atendimento;Avaliações;Recuperou',
      for (final r in _rows)
        [
          r['name'],
          r['orders'],
          r['delivered'],
          r['cancelled'],
          money(r['sold']),
          money(r['ticket']),
          r['serviceScore'] == null ? '' : _dec(r['serviceScore']),
          r['serviceScoreCount'],
          r['recoveries'],
        ].map(cell).join(';'),
    ];
    await Clipboard.setData(ClipboardData(text: lines.join('\n')));
    if (mounted) wqToast(context, 'Relatório copiado. Cole numa planilha.');
  }

  Future<void> assign(Map m) async {
    final id = '${m['id']}';
    final employeeId = pick[id];
    if (employeeId == null || employeeId.isEmpty) return;
    setState(() => saving = id);
    try {
      await widget.api.dio.patch('/orders/$id', data: {'openedByEmployeeId': employeeId});
      final name = attendants.firstWhere((a) => a['id'] == employeeId, orElse: () => const {'name': ''})['name'];
      if (!mounted) return;
      setState(() {
        final missing = ((report?['missing'] as List?) ?? const []).where((row) => row is Map && '${row['id']}' != id).toList();
        report = {...?report, 'missing': missing};
      });
      wqToast(context, 'Marcado: aberto por $name');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => saving = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = report?['totals'] is Map ? report!['totals'] as Map : const {};
    final people = _rows.where((r) => r['employeeId'] != null).toList();
    final unknown = _rows.where((r) => r['employeeId'] == null && (num.tryParse('${r['orders']}') ?? 0) > 0).toList();
    final maxOrders = people.fold<num>(1, (m, r) {
      final n = num.tryParse('${r['orders']}') ?? 0;
      return n > m ? n : m;
    });
    final best = ([...people]..sort((a, b) => (num.tryParse('${b['sold']}') ?? 0).compareTo(num.tryParse('${a['sold']}') ?? 0))).firstOrNull;
    final missing = ((report?['missing'] as List?) ?? const []).whereType<Map>().toList();
    final coverage = num.tryParse('${t['coverage'] ?? 0}') ?? 0;
    final orders = num.tryParse('${t['orders'] ?? 0}') ?? 0;
    final score = t['serviceScore'];
    final scoreCount = num.tryParse('${t['serviceScoreCount'] ?? 0}') ?? 0;

    final kpis = <(String, String, String, Color?)>[
      ('Pedidos no período', '${t['orders'] ?? '—'}', '${t['attendants'] ?? 0} atendendo', null),
      ('Com Aberto por', '$coverage%', '${t['informed'] ?? 0} de $orders pedidos', orders > 0 && coverage < 90 ? const Color(0xFFD97706) : null),
      ('Nota do atendimento', score == null ? '—' : '${_dec(score)}★', scoreCount > 0 ? '$scoreCount avaliaç${scoreCount == 1 ? 'ão' : 'ões'}' : 'Ainda sem notas', null),
      ('Recuperados', '${t['recoveries'] ?? 0}', best == null ? '' : 'Quem mais vendeu: ${best['name']}', null),
    ];

    return WqPage(
      title: 'Atendimento',
      subtitle: 'Quem abriu cada pedido, quanto vendeu e a nota',
      actions: [
        IconButton(tooltip: 'Copiar para planilha', onPressed: report == null ? null : copyCsv, icon: const Icon(Icons.table_view_outlined)),
      ],
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            SegmentedButton<String>(
              showSelectedIcon: false,
              segments: [for (final p in _periods) ButtonSegment(value: p.$1, label: Text(p.$2))],
              selected: {period},
              onSelectionChanged: (v) {
                period = v.first;
                load();
              },
            ),
            const SizedBox(height: 12),
            if (error != null)
              Padding(padding: const EdgeInsets.only(top: 24), child: Text(error!, textAlign: TextAlign.center))
            else if (loading && report == null)
              const Padding(padding: EdgeInsets.only(top: 48), child: Center(child: CircularProgressIndicator()))
            else ...[
              LayoutBuilder(builder: (context, box) {
                final w = (box.maxWidth - 8) / 2;
                return Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final k in kpis)
                    SizedBox(
                      width: w,
                      child: WqCard(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(k.$1.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: context.wqMuted)),
                          const SizedBox(height: 4),
                          Text(k.$2, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: k.$4 ?? context.wqInk)),
                          Text(k.$3, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                        ]),
                      ),
                    ),
                ]);
              }),
              const SizedBox(height: 16),
              if ((num.tryParse('${t['attendants'] ?? 0}') ?? 0) == 0)
                WqCard(
                  child: Text(
                    'Ninguém marcado como "Atende no balcão". Marque em Funcionários ou use o "+ Cadastrar" no topo do Novo pedido.',
                    style: TextStyle(color: context.wqMuted),
                  ),
                )
              else ...[
                const WqSectionTitle('Por pessoa'),
                for (final r in [...people, ...unknown]) _personCard(context, r, maxOrders),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Vendido e ticket contam pedidos abertos no período, menos os recusados. A nota vem de "Como foi o atendimento?" na página do cliente.',
                    style: TextStyle(fontSize: 12, color: context.wqMuted),
                  ),
                ),
              ],
              if (missing.isNotEmpty && attendants.isNotEmpty) ...[
                const SizedBox(height: 16),
                const WqSectionTitle('Em andamento sem "Aberto por"'),
                Text('Escolha quem atendeu e salve: entra na conta da pessoa na hora.', style: TextStyle(fontSize: 12, color: context.wqMuted)),
                const SizedBox(height: 8),
                for (final m in missing) _missingRow(context, m),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _personCard(BuildContext context, Map r, num maxOrders) {
    final known = r['employeeId'] != null;
    final orders = num.tryParse('${r['orders']}') ?? 0;
    final ticket = num.tryParse('${r['ticket'] ?? 0}') ?? 0;
    final line = [
      '${r['delivered'] ?? 0} entregues',
      'vendido ${brl(r['sold'] ?? 0)}',
      if (ticket > 0) 'ticket ${brl(ticket)}',
      if (r['serviceScore'] != null) '${_dec(r['serviceScore'])}★ (${r['serviceScoreCount']})',
      if ((num.tryParse('${r['recoveries'] ?? 0}') ?? 0) > 0) 'recuperou ${r['recoveries']}',
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text('${r['name']}', style: TextStyle(fontWeight: FontWeight.w800, color: known ? context.wqInk : context.wqMuted))),
            Text('$orders pedido${orders == 1 ? '' : 's'}', style: const TextStyle(fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              minHeight: 5,
              value: (orders / maxOrders).clamp(0, 1).toDouble(),
              backgroundColor: context.wqPaper,
              color: known ? Wq.brand : context.wqLine,
            ),
          ),
          const SizedBox(height: 6),
          Text(line, style: TextStyle(fontSize: 12, color: context.wqMuted)),
        ]),
      ),
    );
  }

  Widget _missingRow(BuildContext context, Map m) {
    final id = '${m['id']}';
    final when = DateTime.tryParse('${m['createdAt'] ?? ''}')?.toLocal();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('#${m['code']} · ${m['clientName'] ?? 'Cliente'}', style: const TextStyle(fontWeight: FontWeight.w700)),
          Text(
            [_statusLabel['${m['status']}'] ?? '${m['status']}', if (when != null) '${when.day.toString().padLeft(2, '0')}/${when.month.toString().padLeft(2, '0')}'].join(' · '),
            style: TextStyle(fontSize: 12, color: context.wqMuted),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: pick[id],
                isExpanded: true,
                decoration: const InputDecoration(isDense: true, hintText: 'Quem abriu?'),
                items: [for (final a in attendants) DropdownMenuItem(value: '${a['id']}', child: Text('${a['name']}'))],
                onChanged: (v) => setState(() => pick[id] = v ?? ''),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Wq.action),
              onPressed: (pick[id] ?? '').isEmpty || saving == id ? null : () => assign(m),
              child: saving == id ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Salvar'),
            ),
          ]),
        ]),
      ),
    );
  }
}
