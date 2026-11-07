import 'package:flutter/material.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/motion.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';
import '../lookup/simple_lists.dart' show ClientDetailScreen;

/// Same blocks as the site's Financeiro: net, revenue chart, services share,
/// money in each sector and the rankings (orders, clients, who sold).
class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key, required this.api, this.stock = false});
  final WorqeraApi api;
  final bool stock;
  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

const _palette = [Color(0xFF7D26DE), Color(0xFFAE50FD), Color(0xFF4F0FA6), Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFF0EA5E9), Color(0xFFF43F5E), Color(0xFF64748B)];

double _num(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;

String brl0(dynamic v) {
  final n = _num(v).round();
  final s = n.abs().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.');
  return '${n < 0 ? '-' : ''}R\$ $s';
}

class _FinanceScreenState extends State<FinanceScreen> {
  Map<String, dynamic>? data;
  Map<String, dynamic>? stock;
  String? error;
  String period = '30d';

  static const _periods = [('today', 'Hoje'), ('7d', '7d'), ('15d', '15d'), ('30d', '30d'), ('90d', '90d'), ('1y', '1 ano')];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/metrics/finance', queryParameters: {'period': period, 'servicesLimit': 8});
      final body = Map<String, dynamic>.from(res.data as Map);
      final inner = body['data'] is Map ? Map<String, dynamic>.from(body['data'] as Map) : body;
      if (mounted) setState(() => data = inner);
      if (widget.stock) {
        try {
          final res = await widget.api.dio.get('/products/summary');
          final body = res.data;
          final summary = body is Map && body['summary'] is Map ? Map<String, dynamic>.from(body['summary'] as Map) : null;
          if (mounted) setState(() => stock = summary);
        } catch (_) {}
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  Future<void> export() async {
    final summary = data?['summary'] as Map? ?? {};
    final doc = pw.Document();
    doc.addPage(pw.Page(build: (_) => pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
          pw.Text('Financeiro $period', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 12),
          pw.Text('Previsto ${brl(summary['expectedRevenue'])}'),
          pw.Text('Recebido ${brl(summary['receivedRevenue'])}'),
          pw.Text('Pendente ${brl(summary['pendingRevenue'])}'),
          pw.Text('Líquido ${brl(summary['realizedProfit'])}'),
          pw.SizedBox(height: 12),
          for (final s in asMaps({'data': data?['topServices']})) pw.Text('${s['service']}: ${brl(s['revenue'])}'),
        ])));
    await Printing.sharePdf(bytes: await doc.save(), filename: 'financeiro-$period.pdf');
  }

  @override
  Widget build(BuildContext context) {
    final d = data;
    return WqPage(
      title: 'Financeiro',
      subtitle: 'Líquido, faturamento, serviços e setores',
      actions: [IconButton(tooltip: 'Exportar resumo', onPressed: d == null ? null : export, icon: const Icon(Icons.ios_share))],
      child: d == null
          ? (error == null ? const SkeletonList() : Center(child: Text(error!)))
          : RefreshIndicator(
              onRefresh: load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: staggered([
                  SizedBox(
                    height: 40,
                    child: ListView(scrollDirection: Axis.horizontal, children: [
                      for (final p in _periods)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(p.$2),
                            selected: period == p.$1,
                            onSelected: (_) {
                              tapHaptic();
                              setState(() {
                                period = p.$1;
                                data = null;
                              });
                              load();
                            },
                          ),
                        ),
                    ]),
                  ),
                  const SizedBox(height: 10),
                  _hero(context, d),
                  const SizedBox(height: 10),
                  _kpis(context, d),
                  const SizedBox(height: 16),
                  _panel(
                    context,
                    'Faturamento',
                    period == '90d' || period == '1y' ? 'Por mês · recebido e vendido' : 'Por dia · recebido e vendido',
                    _RevenueChart(points: _points(asMaps({'data': d['dailyEvolution']}), period == '90d' || period == '1y')),
                  ),
                  const SizedBox(height: 12),
                  _panel(context, 'Serviços que mais faturam', 'Fatia de cada serviço no período', _services(context, asMaps({'data': d['topServices']}))),
                  const SizedBox(height: 12),
                  _panel(context, 'Dinheiro em cada setor', 'Pedidos abertos agora, pelo setor do item', _sectors(context, asMaps({'data': d['sectorValue']}))),
                  const SizedBox(height: 12),
                  _panel(
                    context,
                    'Maiores pedidos',
                    'Valor e líquido (menos despesas)',
                    _rank(context, [
                      for (final o in asMaps({'data': d['topOrders']}))
                        _Rank('#${o['code']} · ${o['clientName'] ?? 'Cliente'}', _num(o['total']), 'líquido ${brl0(o['net'])}'),
                    ], 'Sem pedidos com valor no período.'),
                  ),
                  const SizedBox(height: 12),
                  _panel(
                    context,
                    'Melhores clientes',
                    'Quem mais comprou no período',
                    _rank(context, [
                      for (final c in asMaps({'data': d['topClients']}))
                        _Rank(
                          '${c['name']}',
                          _num(c['revenue']),
                          '${c['orders']} ${c['orders'] == 1 ? 'pedido' : 'pedidos'}',
                          onTap: '${c['clientId'] ?? ''}'.isEmpty
                              ? null
                              : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClientDetailScreen(api: widget.api, clientId: '${c['clientId']}'))),
                        ),
                    ], 'Sem clientes no período.'),
                  ),
                  const SizedBox(height: 12),
                  _panel(
                    context,
                    'Quem mais vendeu',
                    'Pelo "Aberto por" de cada pedido',
                    _rank(context, [
                      for (final a in asMaps({'data': d['byAttendant']}))
                        _Rank('${a['name']}', _num(a['revenue']), '${a['orders']} ${a['orders'] == 1 ? 'pedido' : 'pedidos'} · ticket ${brl0(a['averageTicket'])}'),
                    ], 'Os pedidos do período não têm "Aberto por".'),
                  ),
                  const SizedBox(height: 12),
                  ReceivablesCard(api: widget.api),
                  WeeklyInsightsCard(api: widget.api),
                  if (stock != null) ...[const SizedBox(height: 12), _stock(context, stock!)],
                ]),
              ),
            ),
    );
  }

  Widget _hero(BuildContext context, Map d) {
    final s = d['summary'] as Map? ?? {};
    final today = d['today'] as Map? ?? {};
    final recovered = d['recovered'] as Map? ?? {};
    Widget chip(String label, String value, {Color? tone}) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(color: context.wqSurface, borderRadius: BorderRadius.circular(12), border: Border.all(color: context.wqLine)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(label.toUpperCase(), style: TextStyle(fontSize: 9.5, letterSpacing: 0.8, color: context.wqMuted, fontWeight: FontWeight.w700)),
            Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: tone)),
          ]),
        );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.wqLine),
        gradient: LinearGradient(colors: [Wq.brand.withValues(alpha: 0.14), context.wqSurface], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('LÍQUIDO DO PERÍODO', style: TextStyle(fontSize: 11, letterSpacing: 1.4, color: context.wqMuted, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        FittedBox(fit: BoxFit.scaleDown, child: Text(brl(s['realizedProfit']), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800))),
        Text('Recebido − despesas · margem ${_num(s['expectedMargin']).toStringAsFixed(1).replaceAll('.', ',')}%', style: TextStyle(color: context.wqMuted)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          chip('Vendidos', '${s['completedOrders'] ?? 0}'),
          chip('Caixa hoje', brl0(today['cashInToday'])),
          chip('Prontos a receber', brl0(today['readyToCollect'])),
          chip('Recuperado', '${brl0(recovered['value'])} · ${recovered['count'] ?? 0}', tone: Wq.success),
        ]),
      ]),
    );
  }

  Widget _kpis(BuildContext context, Map d) {
    final s = d['summary'] as Map? ?? {};
    final cells = [
      ('Bruto recebido', brl0(s['receivedRevenue']), 'Entradas no período'),
      ('Bruto previsto', brl0(s['expectedRevenue']), '${s['totalOrders'] ?? 0} pedidos'),
      ('A receber', brl0(s['pendingRevenue']), '${s['openOrders'] ?? 0} em aberto'),
      ('Ticket médio', brl(s['averageTicket']), 'Despesas ${brl0(s['expenses'])}'),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 1.9,
      children: [
        for (final c in cells)
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(c.$1.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 0.8, color: context.wqMuted, fontWeight: FontWeight.w700)),
              FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(c.$2, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20))),
              Text(c.$3, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.wqMuted, fontSize: 11.5)),
            ]),
          ),
      ],
    );
  }

  Widget _panel(BuildContext context, String title, String hint, Widget child) => WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          Text(hint, style: TextStyle(color: context.wqMuted, fontSize: 12)),
          const SizedBox(height: 12),
          child,
        ]),
      );

  List<_Point> _points(List<Map<String, dynamic>> days, bool monthly) {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    final map = <String, _Point>{};
    for (final day in days) {
      final date = '${day['date'] ?? ''}';
      if (date.length < 10) continue;
      final key = monthly ? date.substring(0, 7) : date;
      final label = monthly ? '${months[(int.tryParse(date.substring(5, 7)) ?? 1) - 1]}/${date.substring(2, 4)}' : '${date.substring(8, 10)}/${date.substring(5, 7)}';
      final p = map.putIfAbsent(key, () => _Point(key, label));
      p.received += _num(day['receivedRevenue']);
      p.expected += _num(day['expectedRevenue']);
      p.orders += (_num(day['orders'])).round();
    }
    return map.values.toList()..sort((a, b) => a.key.compareTo(b.key));
  }

  Widget _services(BuildContext context, List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) return _empty(context, 'Sem serviços com valor no período.');
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          height: 14,
          child: Row(children: [
            for (var i = 0; i < rows.length; i++)
              Expanded(flex: (_num(rows[i]['share']) * 10).round().clamp(1, 1000), child: Container(color: _palette[i % _palette.length])),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      for (var i = 0; i < rows.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: _palette[i % _palette.length], shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${rows[i]['service']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: i == 0 ? FontWeight.w800 : FontWeight.w600)),
                Text(
                  '${_num(rows[i]['share']).toStringAsFixed(1).replaceAll('.', ',')}% · ${rows[i]['orders']}× · média ${brl0(rows[i]['averageTicket'])}',
                  style: TextStyle(color: context.wqMuted, fontSize: 11.5),
                ),
              ]),
            ),
            Text(brl0(rows[i]['revenue']), style: const TextStyle(fontWeight: FontWeight.w800)),
          ]),
        ),
    ]);
  }

  Widget _sectors(BuildContext context, List<Map<String, dynamic>> all) {
    final rows = all.where((r) => _num(r['items']) > 0).toList();
    if (rows.isEmpty) return _empty(context, 'Nenhum pedido aberto agora.');
    final max = rows.fold<double>(1, (m, r) => _num(r['value']) > m ? _num(r['value']) : m);
    final total = rows.fold<double>(0, (t, r) => t + _num(r['value']));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text.rich(TextSpan(children: [
        TextSpan(text: brl0(total), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        TextSpan(text: ' em pedidos abertos agora', style: TextStyle(color: context.wqMuted)),
      ])),
      const SizedBox(height: 10),
      for (final r in rows)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: Text('${r['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
              if (r['terminal'] == true)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Wq.success.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(99)),
                  child: const Text('pronto p/ receber', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Wq.success)),
                ),
              Text(brl0(r['value']), style: const TextStyle(fontWeight: FontWeight.w800)),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (_num(r['value']) / max).clamp(0.03, 1.0),
                    minHeight: 8,
                    color: r['terminal'] == true ? Wq.success : Wq.brand,
                    backgroundColor: context.wqLine,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text('${r['items']} ${r['items'] == 1 ? 'item' : 'itens'}', style: TextStyle(color: context.wqMuted, fontSize: 11.5)),
            ]),
          ]),
        ),
    ]);
  }

  Widget _rank(BuildContext context, List<_Rank> rows, String empty) {
    if (rows.isEmpty) return _empty(context, empty);
    final max = rows.fold<double>(1, (m, r) => r.value > m ? r.value : m);
    return Column(children: [
      for (var i = 0; i < rows.length; i++)
        InkWell(
          onTap: rows[i].onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(children: [
              CircleAvatar(
                radius: 13,
                backgroundColor: i == 0 ? Wq.brand : context.wqLine,
                child: Text('${i + 1}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: i == 0 ? Colors.white : context.wqMuted)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(rows[i].label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text(brl0(rows[i].value), style: const TextStyle(fontWeight: FontWeight.w800)),
                  ]),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: (rows[i].value / max).clamp(0.03, 1.0), minHeight: 4, color: const Color(0xFFAE50FD), backgroundColor: context.wqLine),
                  ),
                  const SizedBox(height: 2),
                  Text(rows[i].sub, style: TextStyle(color: context.wqMuted, fontSize: 11.5)),
                ]),
              ),
              if (rows[i].onTap != null) Icon(Icons.chevron_right, color: context.wqMuted),
            ]),
          ),
        ),
    ]);
  }

  Widget _stock(BuildContext context, Map s) => _panel(
        context,
        'Produtos',
        'Vendas e estoque',
        Column(children: [
          for (final row in [
            ('Vendido', brl(s['salesTotal'])),
            ('Reservado', brl(s['reservedValue'])),
            ('Estoque', brl(s['stockValue'])),
            ('Unidades disponíveis', '${s['availableUnits'] ?? 0}'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [Expanded(child: Text(row.$1, style: TextStyle(color: context.wqMuted))), Text(row.$2, style: const TextStyle(fontWeight: FontWeight.w800))]),
            ),
        ]),
      );

  Widget _empty(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(text, textAlign: TextAlign.center, style: TextStyle(color: context.wqMuted)),
      );
}

class _Rank {
  _Rank(this.label, this.value, this.sub, {this.onTap});
  final String label;
  final double value;
  final String sub;
  final VoidCallback? onTap;
}

class _Point {
  _Point(this.key, this.label);
  final String key;
  final String label;
  double received = 0;
  double expected = 0;
  int orders = 0;
}

class _RevenueChart extends StatefulWidget {
  const _RevenueChart({required this.points});
  final List<_Point> points;
  @override
  State<_RevenueChart> createState() => _RevenueChartState();
}

class _RevenueChartState extends State<_RevenueChart> {
  int? selected;

  @override
  Widget build(BuildContext context) {
    final points = widget.points;
    if (points.isEmpty) {
      return Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Text('Sem pedidos no período.', textAlign: TextAlign.center, style: TextStyle(color: context.wqMuted)));
    }
    final best = points.reduce((a, b) => b.expected > a.expected ? b : a);
    final focus = selected != null && selected! < points.length ? points[selected!] : null;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Container(width: 10, height: 10, decoration: const BoxDecoration(color: Wq.brand, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text('Recebido', style: TextStyle(color: context.wqMuted, fontSize: 12)),
        const SizedBox(width: 14),
        Container(width: 14, height: 2, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Text('Vendido', style: TextStyle(color: context.wqMuted, fontSize: 12)),
      ]),
      const SizedBox(height: 6),
      Text(
        focus != null
            ? '${focus.label}: recebido ${brl0(focus.received)} · vendido ${brl0(focus.expected)} · ${focus.orders} pedido(s)'
            : 'Melhor: ${best.label} · ${brl0(best.expected)}. Toque no gráfico para ver cada ponto.',
        style: TextStyle(fontSize: 12, color: focus != null ? null : context.wqMuted, fontWeight: focus != null ? FontWeight.w700 : FontWeight.normal),
      ),
      const SizedBox(height: 8),
      LayoutBuilder(
        builder: (context, box) => GestureDetector(
          onTapDown: (e) => _pick(e.localPosition.dx, box.maxWidth),
          onHorizontalDragUpdate: (e) => _pick(e.localPosition.dx, box.maxWidth),
          child: CustomPaint(
            size: Size(box.maxWidth, 170),
            painter: _RevenuePainter(points, selected: selected, grid: context.wqLine, muted: context.wqMuted),
          ),
        ),
      ),
      const SizedBox(height: 4),
      Row(children: [
        Text(points.first.label, style: TextStyle(color: context.wqMuted, fontSize: 11)),
        const Spacer(),
        if (points.length > 1) Text(points.last.label, style: TextStyle(color: context.wqMuted, fontSize: 11)),
      ]),
    ]);
  }

  void _pick(double x, double width) {
    final n = widget.points.length;
    if (n == 0) return;
    final i = n == 1 ? 0 : (x / width * (n - 1)).round().clamp(0, n - 1);
    if (i != selected) {
      tapHaptic();
      setState(() => selected = i);
    }
  }
}

class _RevenuePainter extends CustomPainter {
  _RevenuePainter(this.points, {required this.selected, required this.grid, required this.muted});
  final List<_Point> points;
  final int? selected;
  final Color grid;
  final Color muted;

  @override
  void paint(Canvas canvas, Size size) {
    final maxV = points.fold<double>(1, (m, p) => [m, p.received, p.expected].reduce((a, b) => a > b ? a : b));
    final h = size.height - 6;
    final gridPaint = Paint()
      ..color = grid
      ..strokeWidth = 1;
    for (var i = 0; i <= 3; i++) {
      final y = h - h * i / 3 + 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    Offset at(int i, double v) {
      final x = points.length == 1 ? size.width / 2 : size.width * i / (points.length - 1);
      return Offset(x, h - (v / maxV) * (h - 8) + 3);
    }

    Path line(double Function(_Point) value) {
      final path = Path();
      for (var i = 0; i < points.length; i++) {
        final p = at(i, value(points[i]));
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          final prev = at(i - 1, value(points[i - 1]));
          final mid = (prev.dx + p.dx) / 2;
          path.cubicTo(mid, prev.dy, mid, p.dy, p.dx, p.dy);
        }
      }
      return path;
    }

    final received = line((p) => p.received);
    final area = Path.from(received)
      ..lineTo(at(points.length - 1, 0).dx, h + 3)
      ..lineTo(at(0, 0).dx, h + 3)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Wq.brand.withValues(alpha: 0.32), Wq.brand.withValues(alpha: 0.02)])
            .createShader(Offset.zero & size),
    );
    final expected = line((p) => p.expected);
    final dash = Paint()
      ..color = const Color(0xFF94A3B8)
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke;
    for (final metric in expected.computeMetrics()) {
      var d = 0.0;
      while (d < metric.length) {
        canvas.drawPath(metric.extractPath(d, d + 5), dash);
        d += 9;
      }
    }
    canvas.drawPath(
      received,
      Paint()
        ..color = Wq.brand
        ..strokeWidth = 2.4
        ..style = PaintingStyle.stroke,
    );
    if (selected != null && selected! < points.length) {
      final p = at(selected!, points[selected!].received);
      canvas.drawLine(Offset(p.dx, 0), Offset(p.dx, h + 3), Paint()..color = Wq.brand.withValues(alpha: 0.25));
      canvas.drawCircle(p, 4.5, Paint()..color = Wq.brand);
      canvas.drawCircle(p, 2, Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(covariant _RevenuePainter old) => old.points != points || old.selected != selected || old.grid != grid;
}

/// Weekly reading of the numbers (Business). Hidden when locked.
class WeeklyInsightsCard extends StatefulWidget {
  const WeeklyInsightsCard({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<WeeklyInsightsCard> createState() => _WeeklyInsightsCardState();
}

class _WeeklyInsightsCardState extends State<WeeklyInsightsCard> {
  Map? insights;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool refresh = false}) async {
    setState(() => busy = true);
    try {
      final res = await widget.api.dio.get('/metrics/insights', queryParameters: refresh ? {'refresh': 1} : null);
      final body = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      if (mounted) setState(() => insights = body['locked'] == true ? null : (body['insights'] is Map ? body['insights'] as Map : null));
    } catch (_) {
      if (mounted) setState(() => insights = null);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bullets = ((insights?['bullets'] as List?) ?? const []).map((b) => '$b').where((b) => b.isNotEmpty).toList();
    if (bullets.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.auto_awesome, size: 18, color: Wq.brand),
            const SizedBox(width: 6),
            const Expanded(child: Text('Leitura da semana', style: TextStyle(fontWeight: FontWeight.w800))),
            IconButton(
              tooltip: 'Atualizar',
              visualDensity: VisualDensity.compact,
              onPressed: busy ? null : () => load(refresh: true),
              icon: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh, size: 18),
            ),
          ]),
          for (final b in bullets)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Padding(padding: EdgeInsets.only(top: 6), child: Icon(Icons.circle, size: 6, color: Wq.brand)),
                const SizedBox(width: 8),
                Expanded(child: Text(b)),
              ]),
            ),
        ]),
      ),
    );
  }
}
