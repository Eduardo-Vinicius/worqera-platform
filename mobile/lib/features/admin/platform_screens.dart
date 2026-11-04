import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

// Worqera platform panel — same routes and blocks as the site (`/admin/plataforma`, métricas, análises,
// operação, contas, e-mails). Platform admins only; the API refuses everyone else.

String nf(dynamic value) {
  final v = value is num ? value : num.tryParse('$value') ?? 0;
  final s = v.round().abs().toString();
  final out = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) out.write('.');
    out.write(s[i]);
  }
  return v < 0 ? '-$out' : out.toString();
}

String brl0(dynamic value) => 'R\$ ${nf(value)}';

String _hours(dynamic value) {
  final h = value is num ? value : num.tryParse('$value');
  if (h == null) return '—';
  return h < 48 ? '${nf(h)} h' : '${nf(h / 24)} dias';
}

String _when(dynamic iso) {
  final d = DateTime.tryParse('$iso')?.toLocal();
  if (d == null) return '—';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)} ${two(d.hour)}:${two(d.minute)}';
}

Map<String, dynamic> _map(dynamic v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};
List<Map<String, dynamic>> _list(dynamic v) => v is List ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
num _n(dynamic v) => v is num ? v : num.tryParse('$v') ?? 0;

const _clientLabel = {'web': 'Site', 'android': 'App Android', 'ios': 'App iOS', 'admin': 'Admin', 'api': 'API'};
const _planLabel = {'WORQERA_BASIC': 'Basic', 'WORQERA_PRO': 'Pro', 'WORQERA_BUSINESS': 'Business'};
const _subLabel = {'trialing': 'Em teste', 'active': 'Ativa', 'past_due': 'Em atraso', 'canceled': 'Cancelada', 'expired': 'Teste encerrado'};

void _push(BuildContext context, String id, Widget page) {
  final scope = ShellScope.maybeOf(context);
  if (scope != null) {
    scope.openPage(id, page, stack: true);
  } else {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }
}

Future<void> _enterShop(BuildContext context, WorqeraApi api, String id, String name) async {
  await api.session.enterShop(id: id, name: name);
  if (context.mounted) context.go('/home');
}

/// Loads once per key (change the key to reload with new filters).
class _Loaded extends StatefulWidget {
  const _Loaded({super.key, required this.api, required this.load, required this.builder});
  final WorqeraApi api;
  final Future<dynamic> Function() load;
  final Widget Function(BuildContext context, Map<String, dynamic> data, Future<void> Function() reload) builder;
  @override
  State<_Loaded> createState() => _LoadedState();
}

class _LoadedState extends State<_Loaded> {
  Map<String, dynamic>? data;
  String? error;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    try {
      final next = _map(await widget.load());
      if (!mounted) return;
      setState(() {
        data = next;
        error = null;
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (data == null) {
      return Center(
        child: error == null
            ? const Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Text(error!, style: const TextStyle(color: Wq.danger)),
              ),
      );
    }
    return widget.builder(context, data!, reload);
  }
}

class _Chips<T> extends StatelessWidget {
  const _Chips({required this.value, required this.options, required this.onChanged});
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;
  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [for (final o in options) ChoiceChip(label: Text(o.$2), selected: value == o.$1, onSelected: (_) => onChanged(o.$1))],
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value, {this.delta, this.hint, this.invert = false, this.tone});
  final String label;
  final String value;
  final dynamic delta;
  final String? hint;
  final bool invert;
  final Color? tone;
  @override
  Widget build(BuildContext context) {
    final pct = delta is Map ? delta['pct'] : null;
    final p = pct is num ? pct : null;
    final good = p == null ? null : (invert ? p <= 0 : p >= 0);
    return WqCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: context.wqMuted),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: tone ?? context.wqInk),
            ),
          ),
          if (p != null)
            Text(
              '${p > 0 ? '+' : ''}${p.toStringAsFixed(p.abs() < 10 ? 1 : 0)}% vs anterior',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: good! ? Wq.success : Wq.danger),
            )
          else if (hint != null)
            Text(
              hint!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, color: context.wqMuted),
            ),
        ],
      ),
    );
  }
}

Widget _kpiGrid(List<Widget> tiles) => GridView.count(
  crossAxisCount: 2,
  shrinkWrap: true,
  physics: const NeverScrollableScrollPhysics(),
  mainAxisSpacing: 8,
  crossAxisSpacing: 8,
  childAspectRatio: 1.7,
  children: tiles,
);

/// Horizontal bars: (label, value, note).
class _Bars extends StatelessWidget {
  const _Bars(this.title, this.rows, {this.format, this.hint});
  final String title;
  final String? hint;
  final List<(String, num, String?)> rows;
  final String Function(num)? format;
  @override
  Widget build(BuildContext context) {
    final max = rows.fold<num>(1, (m, r) => r.$2 > m ? r.$2 : m);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          WqSectionTitle(title),
          if (hint != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(hint!, style: TextStyle(fontSize: 12, color: context.wqMuted)),
            ),
          if (rows.isEmpty) Text('Sem dados no período.', style: TextStyle(color: context.wqMuted)),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(r.$1, maxLines: 1, overflow: TextOverflow.ellipsis)),
                      Text(format != null ? format!(r.$2) : nf(r.$2), style: const TextStyle(fontWeight: FontWeight.w800)),
                      if (r.$3 != null) Text('  ${r.$3}', style: TextStyle(fontSize: 11, color: context.wqMuted)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: max <= 0 ? 0 : (r.$2 / max).clamp(0, 1).toDouble(),
                      minHeight: 7,
                      color: Wq.brand,
                      backgroundColor: Wq.brand.withValues(alpha: 0.12),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

List<(String, num, String?)> _funnel(dynamic steps, {bool time = false}) => [
  for (final (i, s) in _list(steps).indexed)
    ('${s['label']}', _n(s['count']), i == 0 ? null : '${s['pctOfPrev']}%${time && s['medianHours'] != null ? ' · ${_hours(s['medianHours'])}' : ''}'),
];

Color _slaColor(String sla) => sla == 'late'
    ? Wq.danger
    : sla == 'warn'
    ? Wq.warn
    : Wq.success;

// ───────────────────────────── Visão geral

class PlatformOverviewScreen extends StatefulWidget {
  const PlatformOverviewScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformOverviewScreen> createState() => _PlatformOverviewScreenState();
}

class _PlatformOverviewScreenState extends State<PlatformOverviewScreen> {
  int days = 7;

  static const _severity = {
    'critical': (Wq.danger, 'Crítico'),
    'warn': (Wq.warn, 'Atenção'),
    'info': (Color(0xFF0284C7), 'Info'),
    'positive': (Wq.success, 'Bom sinal'),
  };

  @override
  Widget build(BuildContext context) {
    final api = widget.api;
    return WqPage(
      title: 'Visão geral',
      subtitle: 'Rede Worqera',
      child: _Loaded(
        api: api,
        key: ValueKey(days),
        load: () async => (await api.dio.get('/platform/overview', queryParameters: {'days': days})).data,
        builder: (context, d, reload) {
          final k = _map(d['kpis']);
          final h = _map(d['health']);
          return RefreshIndicator(
            onRefresh: reload,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Chips<int>(value: days, options: const [(7, '7d'), (14, '14d'), (30, '30d'), (90, '90d')], onChanged: (v) => setState(() => days = v)),
                const SizedBox(height: 12),
                _kpiGrid([
                  _Kpi('Usuários ativos 30d', nf(_map(k['activeUsers30'])['value']), delta: k['activeUsers30']),
                  _Kpi('Pedidos criados', nf(_map(k['ordersCreated'])['value']), delta: k['ordersCreated']),
                  _Kpi('Pedidos entregues', nf(_map(k['ordersDelivered'])['value']), delta: k['ordersDelivered']),
                  _Kpi('Lojas ativas 30d', nf(_map(k['activeShops30'])['value']), hint: 'com alguém usando'),
                  _Kpi('MRR', brl0(_map(k['mrr'])['value']), hint: '${nf(_map(k['mrr'])['paying'])} pagantes'),
                  _Kpi('Saúde do sistema', '${h['score'] ?? '—'}/100', hint: '${h['label'] ?? ''} · erro ${h['errorRate'] ?? 0}% · p95 ${nf(h['p95Ms'])} ms'),
                ]),
                const SizedBox(height: 16),
                const WqSectionTitle('O que está acontecendo'),
                if (_list(d['insights']).isEmpty) Text('Nada fora do normal no período.', style: TextStyle(color: context.wqMuted)),
                for (final ins in _list(d['insights']))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: WqCard(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 4,
                            height: 40,
                            decoration: BoxDecoration(color: (_severity[ins['severity']] ?? _severity['info']!).$1, borderRadius: BorderRadius.circular(2)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${ins['title']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                Text('${ins['detail']}', style: TextStyle(fontSize: 13, color: context.wqMuted)),
                              ],
                            ),
                          ),
                          Text(
                            (_severity[ins['severity']] ?? _severity['info']!).$2,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: (_severity[ins['severity']] ?? _severity['info']!).$1),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                WqSectionTitle(
                  'Pendências',
                  trailing: TextButton(
                    onPressed: () => _push(context, 'p-operacao', PlatformQueuesScreen(api: api)),
                    child: const Text('Abrir filas'),
                  ),
                ),
                for (final q in _list(d['queues']))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: WqCard(
                      onTap: () => _push(context, 'p-operacao', PlatformQueuesScreen(api: api)),
                      child: Row(
                        children: [
                          Icon(Icons.circle, size: 10, color: _n(q['count']) > 0 ? _slaColor('${q['sla']}') : context.wqLine),
                          const SizedBox(width: 10),
                          Expanded(child: Text('${q['label']}')),
                          Text(nf(q['count']), style: const TextStyle(fontWeight: FontWeight.w800)),
                          SizedBox(
                            width: 56,
                            child: Text(
                              _n(q['count']) > 0 ? '${nf(q['oldestHours'])} h' : '—',
                              textAlign: TextAlign.right,
                              style: TextStyle(fontSize: 12, color: context.wqMuted),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ───────────────────────────── Métricas

class PlatformMetricsScreen extends StatefulWidget {
  const PlatformMetricsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformMetricsScreen> createState() => _PlatformMetricsScreenState();
}

class _PlatformMetricsScreenState extends State<PlatformMetricsScreen> {
  String tab = 'tech';
  int days = 7;

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Métricas',
      subtitle: 'Tecnologia, negócio e produto',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Chips<String>(
                  value: tab,
                  options: const [('tech', 'Tecnologia'), ('business', 'Negócio'), ('product', 'Produto')],
                  onChanged: (v) => setState(() => tab = v),
                ),
                const SizedBox(height: 6),
                _Chips<int>(value: days, options: const [(1, 'Hoje'), (7, '7d'), (14, '14d'), (30, '30d')], onChanged: (v) => setState(() => days = v)),
              ],
            ),
          ),
          Expanded(
            child: _Loaded(
              api: widget.api,
              key: ValueKey('$tab$days'),
              load: () async => (await widget.api.dio.get('/platform/metrics/$tab', queryParameters: {'days': days})).data,
              builder: (context, d, reload) => RefreshIndicator(
                onRefresh: reload,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: tab == 'tech'
                      ? _tech(context, d)
                      : tab == 'business'
                      ? _business(context, d)
                      : _product(context, d),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _tech(BuildContext context, Map<String, dynamic> d) {
    final k = _map(d['kpis']);
    String v(String key) => nf(_map(k[key])['value']);
    final versions = _map(d['appVersions']);
    return [
      _kpiGrid([
        _Kpi('Requisições', v('requests'), delta: k['requests']),
        _Kpi('Usuários ativos', v('activeUsers'), delta: k['activeUsers']),
        _Kpi('Erros 5xx', v('errors5xx'), delta: k['errors5xx'], invert: true),
        _Kpi('Taxa de erro', '${_map(k['errorRate'])['value'] ?? 0}%', delta: k['errorRate'], invert: true),
        _Kpi('Latência média', '${v('avgMs')} ms', delta: k['avgMs'], invert: true),
        _Kpi('p95 (aprox.)', '${v('p95Ms')} ms', delta: k['p95Ms'], invert: true),
      ]),
      _Bars('Usuários por sistema', [for (final r in _list(d['byClient'])) (_clientLabel[r['client']] ?? '${r['client']}', _n(r['users']), null)]),
      _Bars('Usuários por UF da loja', [for (final r in _list(d['byRegion'])) ('${r['region']}', _n(r['users']), '${r['pct']}%')]),
      _Bars('Versões do app', [
        for (final r in _list(versions['rows']))
          ('v${r['version']}${r['version'] == versions['latest'] ? ' (mais nova)' : ''}', _n(r['users']), '${r['pct']}%'),
      ], hint: versions['latest'] == null ? null : '${versions['onLatestPct']}% na versão mais nova'),
      const SizedBox(height: 16),
      const WqSectionTitle('Endpoints mais chamados'),
      for (final e in _list(d['topEndpoints'])) _endpoint(context, e),
      if (_list(d['recentErrors']).isNotEmpty) ...[
        const SizedBox(height: 16),
        const WqSectionTitle('Erros recentes'),
        for (final e in _list(d['recentErrors']).take(10))
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: WqCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${e['status']} · ${e['method']} ${e['route']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  Text(
                    '${_when(e['at'])} · ${e['message'] ?? ''}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: context.wqMuted),
                  ),
                ],
              ),
            ),
          ),
      ],
    ];
  }

  Widget _endpoint(BuildContext context, Map<String, dynamic> e) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: WqCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${e['method']} ${e['route']}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ),
          Text('${nf(e['count'])} · p95 ${nf(e['p95Ms'])} ms', style: TextStyle(fontSize: 12, color: context.wqMuted)),
        ],
      ),
    ),
  );

  List<Widget> _business(BuildContext context, Map<String, dynamic> d) {
    final mrr = _map(d['mrr']);
    final subs = _map(d['subscriptions']);
    return [
      _kpiGrid([
        _Kpi('MRR', brl0(mrr['mrr']), hint: '${nf(mrr['paying'])} lojas pagantes'),
        for (final m in _list(d['metrics']).where((m) => ['shops', 'ordersCreated', 'ordersDelivered', 'payments', 'trials'].contains(m['key'])))
          _Kpi('${m['label']}', m['money'] == true ? brl0(_map(m['new'])['value']) : nf(_map(m['new'])['value']), delta: m['new']),
      ]),
      const SizedBox(height: 12),
      Wrap(spacing: 6, runSpacing: 6, children: [for (final e in subs.entries) Chip(label: Text('${_subLabel[e.key] ?? e.key}: ${nf(e.value)}'))]),
      const SizedBox(height: 12),
      const WqSectionTitle('Todas as métricas do período'),
      for (final m in _list(d['metrics']))
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: WqCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(child: Text('${m['label']}')),
                Text(m['money'] == true ? brl0(_map(m['new'])['value']) : nf(_map(m['new'])['value']), style: const TextStyle(fontWeight: FontWeight.w800)),
                if (m['total'] != null) Text('  de ${nf(m['total'])}', style: TextStyle(fontSize: 12, color: context.wqMuted)),
              ],
            ),
          ),
        ),
    ];
  }

  List<Widget> _product(BuildContext context, Map<String, dynamic> d) => [
    _kpiGrid([_Kpi('Lojas ativas', nf(d['activeShops']), hint: 'com alguém usando'), _Kpi('Ramos', nf(_list(d['verticals']).length))]),
    _Bars('Uso de recursos (% das lojas ativas)', [
      for (final c in _list(d['coverage'])) ('${c['label']}', _n(c['pct']), '${nf(c['shops'])} lojas'),
    ], format: (v) => '${nf(v)}%'),
    _Bars('Lojas por ramo', [for (final v in _list(d['verticals'])) ('${v['key']}', _n(v['count']), null)]),
    _Bars('Lojas por UF', [for (final v in _list(d['regions'])) ('${v['key']}', _n(v['count']), null)]),
    _Bars('Serviços mais pedidos', [for (final v in _list(d['topServices'])) ('${v['name']}', _n(v['count']), null)]),
  ];
}

// ───────────────────────────── Análises

class PlatformAnalysesScreen extends StatefulWidget {
  const PlatformAnalysesScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformAnalysesScreen> createState() => _PlatformAnalysesScreenState();
}

class _PlatformAnalysesScreenState extends State<PlatformAnalysesScreen> {
  String tab = 'produto';
  int days = 30;

  Future<Map<String, dynamic>> _load() async {
    final dio = widget.api.dio;
    final q = {'days': days};
    if (tab == 'produto') {
      final res = await Future.wait([
        dio.get('/platform/analytics/funnel', queryParameters: q),
        dio.get('/platform/analytics/engagement', queryParameters: q),
        dio.get('/platform/analytics/cohorts'),
        dio.get('/platform/analytics/adoption', queryParameters: q),
      ]);
      return {'funnel': res[0].data, 'engagement': res[1].data, 'cohorts': res[2].data, 'adoption': res[3].data};
    }
    if (tab == 'transacoes') return _map((await dio.get('/platform/analytics/transactions', queryParameters: q)).data);
    return _map((await dio.get('/platform/shops-health', queryParameters: q)).data);
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Análises',
      subtitle: 'Ativação, retenção, transações e lojas',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Chips<String>(
                  value: tab,
                  options: const [('produto', 'Produto'), ('transacoes', 'Transações'), ('lojas', 'Lojas')],
                  onChanged: (v) => setState(() => tab = v),
                ),
                const SizedBox(height: 6),
                _Chips<int>(value: days, options: const [(7, '7d'), (14, '14d'), (30, '30d'), (90, '90d')], onChanged: (v) => setState(() => days = v)),
              ],
            ),
          ),
          Expanded(
            child: _Loaded(
              api: widget.api,
              key: ValueKey('$tab$days'),
              load: _load,
              builder: (context, d, reload) => RefreshIndicator(
                onRefresh: reload,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: tab == 'produto'
                      ? _produto(context, d)
                      : tab == 'transacoes'
                      ? _transacoes(context, d)
                      : _lojas(context, d),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _produto(BuildContext context, Map<String, dynamic> d) {
    final e = _map(d['engagement']);
    final f = _map(d['funnel']);
    final c = _map(d['cohorts']);
    final a = _map(d['adoption']);
    return [
      _kpiGrid([
        _Kpi('Ativos por dia (média)', nf(e['dau'])),
        _Kpi('Ativos 7 dias', nf(e['wau'])),
        _Kpi('Ativos 30 dias', nf(e['mau'])),
        _Kpi('Uso recorrente', '${e['stickiness'] ?? 0}%', hint: 'por dia ÷ 30 dias'),
      ]),
      _Bars('Ativação de lojas', _funnel(f['steps'], time: true), hint: '${nf(f['shops'])} lojas cadastradas no período'),
      _Bars('Usuários por canal', [for (final r in _list(e['byClient'])) (_clientLabel[r['client']] ?? '${r['client']}', _n(r['users']), null)]),
      const SizedBox(height: 16),
      const WqSectionTitle('Retenção por semana de cadastro'),
      if (c['lowHistory'] == true)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            'Coleta começou há ${nf(c['historyDays'])} dias — semanas antigas ficam vazias até ter histórico.',
            style: const TextStyle(fontSize: 12, color: Wq.warn),
          ),
        ),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Table(
          defaultColumnWidth: const FixedColumnWidth(40),
          columnWidths: const {0: FixedColumnWidth(52), 1: FixedColumnWidth(48)},
          children: [
            TableRow(
              children: [
                for (final h in ['Sem.', 'Contas', for (var i = 0; i < _n(c['weeks']).toInt(); i++) 'S$i'])
                  Padding(
                    padding: const EdgeInsets.all(2),
                    child: Text(h, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                  ),
              ],
            ),
            for (final row in _list(c['rows']))
              TableRow(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(2),
                    child: Text(
                      '${row['week']}'.length >= 10 ? '${'${row['week']}'.substring(8, 10)}/${'${row['week']}'.substring(5, 7)}' : '${row['week']}',
                      style: const TextStyle(fontSize: 11),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(2),
                    child: Text(nf(row['size']), style: const TextStyle(fontSize: 11)),
                  ),
                  for (var i = 0; i < _n(c['weeks']).toInt(); i++)
                    Padding(
                      padding: const EdgeInsets.all(2),
                      child: i < (row['cells'] as List? ?? const []).length && _n(row['size']) > 0
                          ? Container(
                              height: 22,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: Wq.brand.withValues(alpha: (0.08 + _n((row['cells'] as List)[i]) / 100 * 0.85).clamp(0, 1).toDouble()),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                nf((row['cells'] as List)[i]),
                                style: TextStyle(fontSize: 10, color: _n((row['cells'] as List)[i]) > 55 ? Colors.white : context.wqInk),
                              ),
                            )
                          : const SizedBox(height: 22),
                    ),
                ],
              ),
          ],
        ),
      ),
      _Bars(
        'Uso de recursos',
        [for (final r in _list(a['adoption'])) ('${r['label']}', _n(r['pct']), '${nf(r['shops'])} lojas')],
        format: (v) => '${nf(v)}%',
        hint: 'entre ${nf(a['activeShops'])} lojas ativas',
      ),
    ];
  }

  List<Widget> _transacoes(BuildContext context, Map<String, dynamic> d) {
    final o = _map(d['orders']);
    final q = _map(d['quotes']);
    return [
      _kpiGrid([
        _Kpi('Tempo até entregar', _hours(o['medianHoursToDeliver']), hint: 'mediana'),
        _Kpi('Cancelados', nf(o['cancelled']), tone: _n(o['cancelled']) > 0 ? Wq.warn : null),
        _Kpi('Valor recuperado', brl0(q['wonValue']), hint: 'de ${brl0(q['value'])} em orçamentos'),
        _Kpi('Primeiro contato', _hours(q['medianHoursToFirstContact']), hint: '${nf(q['lost'])} perdidos'),
      ]),
      _Bars('Pedidos: do cadastro ao pagamento', _funnel(o['steps']), hint: 'criados no período, pela etapa atual'),
      _Bars('Orçamentos: recuperação', _funnel(q['steps'])),
      _Bars('Pedidos por faixa de valor', [for (final b in _list(o['valueBands'])) ('${b['label']}', _n(b['count']), null)]),
      _Bars('Serviços mais pedidos', [for (final s in _list(o['topServices'])) ('${s['name']}', _n(s['count']), null)]),
    ];
  }

  List<Widget> _lojas(BuildContext context, Map<String, dynamic> d) {
    final shops = _list(d['shops'])..sort((a, b) => (b['atRisk'] == true ? 1 : 0) - (a['atRisk'] == true ? 1 : 0));
    return [
      _kpiGrid([
        for (final p in _list(d['pipeline'])) _Kpi('${p['label']}', nf(p['count'])),
        _Kpi('Em risco', nf(d['atRisk']), tone: _n(d['atRisk']) > 0 ? Wq.danger : Wq.success, hint: 'sem uso há 30 dias ou pedidos caindo'),
      ]),
      const SizedBox(height: 16),
      WqSectionTitle('Saúde das lojas · pedidos em ${nf(d['days'])}d'),
      for (final s in shops.take(150))
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: WqCard(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${s['name']}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        [
                          _planLabel[s['plan']] ?? (s['plan'] == null ? 'Sem plano' : '${s['plan']}'),
                          if (_n(s['mrr']) > 0) brl0(s['mrr']),
                          s['idleDays'] == null
                              ? 'nunca usou'
                              : _n(s['idleDays']) == 0
                              ? 'usou hoje'
                              : 'há ${nf(s['idleDays'])} dias',
                        ].join(' · '),
                        style: TextStyle(fontSize: 12, color: context.wqMuted),
                      ),
                      if (s['riskReason'] != null) Text('${s['riskReason']}', style: const TextStyle(fontSize: 12, color: Wq.danger)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(nf(s['orders']), style: const TextStyle(fontWeight: FontWeight.w800)),
                    if (s['change'] != null)
                      Text(
                        '${_n(s['change']) > 0 ? '+' : ''}${s['change']}%',
                        style: TextStyle(fontSize: 11, color: _n(s['change']) < 0 ? Wq.danger : Wq.success),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
    ];
  }
}

// ───────────────────────────── Operação

class PlatformQueuesScreen extends StatefulWidget {
  const PlatformQueuesScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformQueuesScreen> createState() => _PlatformQueuesScreenState();
}

class _PlatformQueuesScreenState extends State<PlatformQueuesScreen> {
  int version = 0;
  String? busy;

  static const _slaLabel = {'ok': 'No prazo', 'warn': 'Atenção', 'late': 'Atrasado'};

  Future<void> _extend(Map<String, dynamic> item) async {
    setState(() => busy = '${item['id']}');
    try {
      await widget.api.dio.patch('/platform/shops/${item['shopId']}', data: {'extendTrialDays': 7});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Teste de ${item['title']} estendido por 7 dias')));
      setState(() => version += 1);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.api.message(e))));
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;
    return WqPage(
      title: 'Operação',
      subtitle: 'Quem precisa de um toque do time',
      child: _Loaded(
        api: api,
        key: ValueKey(version),
        load: () async => (await api.dio.get('/platform/queues')).data,
        builder: (context, d, reload) => RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final q in _list(d['queues'])) ...[
                Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('${q['label']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                      Text(nf(q['count']), style: const TextStyle(fontWeight: FontWeight.w800)),
                      if (_n(q['count']) > 0) ...[
                        const SizedBox(width: 8),
                        Text(
                          _slaLabel[q['sla']] ?? '',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _slaColor('${q['sla']}')),
                        ),
                      ],
                    ],
                  ),
                ),
                Text('${q['hint']}', style: TextStyle(fontSize: 12, color: context.wqMuted)),
                const SizedBox(height: 6),
                if (_list(q['items']).isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text('Nada pendente.', style: TextStyle(color: context.wqMuted)),
                  ),
                for (final item in _list(q['items']))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: WqCard(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.circle, size: 9, color: _slaColor('${item['sla']}')),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${item['title']}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                              Text('há ${_hours(item['hours'])}', style: TextStyle(fontSize: 12, color: context.wqMuted)),
                            ],
                          ),
                          Text(
                            '${item['detail']}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: context.wqMuted),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 8,
                            children: [
                              if (item['action'] == 'metrics')
                                OutlinedButton(
                                  onPressed: () => _push(context, 'p-metricas', PlatformMetricsScreen(api: api)),
                                  child: const Text('Ver métricas'),
                                ),
                              if (item['action'] == 'extendTrial' && item['shopId'] != null)
                                OutlinedButton(
                                  onPressed: busy == '${item['id']}' ? null : () => _extend(item),
                                  child: Text(busy == '${item['id']}' ? 'Estendendo…' : '+7 dias'),
                                ),
                              if (item['shopId'] != null)
                                FilledButton(onPressed: () => _enterShop(context, api, '${item['shopId']}', '${item['title']}'), child: const Text('Entrar')),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ───────────────────────────── Contas

class PlatformAccountsScreen extends StatefulWidget {
  const PlatformAccountsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformAccountsScreen> createState() => _PlatformAccountsScreenState();
}

class _PlatformAccountsScreenState extends State<PlatformAccountsScreen> {
  static const _segments = [
    ('all', 'Todas'),
    ('active', 'Ativas 30d'),
    ('inactive', 'Inativas'),
    ('owners', 'Donos'),
    ('no_activation', 'Sem 1º pedido'),
    ('plan:WORQERA_BASIC', 'Basic'),
    ('plan:WORQERA_PRO', 'Pro'),
    ('plan:WORQERA_BUSINESS', 'Business'),
  ];
  String segment = 'all';
  String q = '';
  int page = 1;
  final search = TextEditingController();

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  String _lastSeen(dynamic iso) {
    final d = DateTime.tryParse('$iso');
    if (d == null) return 'nunca';
    final days = DateTime.now().difference(d).inDays;
    return days <= 0
        ? 'hoje'
        : days == 1
        ? 'ontem'
        : 'há $days dias';
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;
    return WqPage(
      title: 'Contas',
      subtitle: 'Pessoas com login no Worqera',
      child: _Loaded(
        api: api,
        key: ValueKey('$segment|$q|$page'),
        load: () async => (await api.dio.get('/platform/accounts', queryParameters: {'segment': segment, if (q.isNotEmpty) 'q': q, 'page': page})).data,
        builder: (context, d, reload) {
          final counts = _map(d['counts']);
          final pages = (_n(d['total']) / 50).ceil().clamp(1, 9999);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final s in _segments)
                    ChoiceChip(
                      label: Text(counts[s.$1] == null ? s.$2 : '${s.$2} ${nf(counts[s.$1])}'),
                      selected: segment == s.$1,
                      onSelected: (_) => setState(() {
                        segment = s.$1;
                        page = 1;
                      }),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: search,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Nome ou e-mail'),
                textInputAction: TextInputAction.search,
                onSubmitted: (v) => setState(() {
                  q = v.trim();
                  page = 1;
                }),
              ),
              const SizedBox(height: 12),
              if (_list(d['accounts']).isEmpty) Text('Nenhuma conta neste filtro.', style: TextStyle(color: context.wqMuted)),
              for (final a in _list(d['accounts']))
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: WqCard(
                    onTap: () => _push(context, 'p-conta', PlatformAccountScreen(api: api, id: '${a['id']}')),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${a['name'] ?? 'Sem nome'}', style: const TextStyle(fontWeight: FontWeight.w800)),
                              Text(
                                '${a['email']}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12, color: context.wqMuted),
                              ),
                              if (_list(a['shops']).isNotEmpty)
                                Text(
                                  _list(a['shops']).map((s) => s['name']).join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, color: context.wqMuted),
                                ),
                            ],
                          ),
                        ),
                        Text(_lastSeen(a['lastActivity']), style: TextStyle(fontSize: 12, color: context.wqMuted)),
                      ],
                    ),
                  ),
                ),
              if (pages > 1)
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('Página $page de $pages', style: TextStyle(color: context.wqMuted)),
                    IconButton(onPressed: page <= 1 ? null : () => setState(() => page -= 1), icon: const Icon(Icons.chevron_left)),
                    IconButton(onPressed: page >= pages ? null : () => setState(() => page += 1), icon: const Icon(Icons.chevron_right)),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}

class PlatformAccountScreen extends StatelessWidget {
  const PlatformAccountScreen({super.key, required this.api, required this.id});
  final WorqeraApi api;
  final String id;

  static const _role = {'owner': 'Dono', 'admin': 'Admin', 'atendimento': 'Atendimento', 'sector': 'Setor'};
  static const _event = {
    'login': 'Entrou',
    'login_new_device': 'Entrou em aparelho novo',
    'login_failed': 'Senha errada',
    'logout': 'Saiu',
    'password_reset': 'Trocou a senha pelo e-mail',
    'password_set_by_admin': 'Senha definida pelo admin',
    'sessions_revoked': 'Encerrou todas as sessões',
  };

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Conta',
      subtitle: 'Quem é, onde usa, o que fez',
      child: _Loaded(
        api: api,
        load: () async => (await api.dio.get('/platform/accounts/$id')).data,
        builder: (context, d, reload) {
          final a = _map(d['account']);
          final c = _map(d['counters']);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('${a['name'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              Text('${a['email'] ?? ''} · e-mail ${a['verified'] == true ? 'confirmado' : 'não confirmado'}', style: TextStyle(color: context.wqMuted)),
              const SizedBox(height: 12),
              _kpiGrid([
                _Kpi('Último uso', d['lastActivity'] == null ? 'nunca' : _when(d['lastActivity'])),
                _Kpi('Dias ativos · 30d', nf(c['activeDays30'])),
                _Kpi('Logins · 30d', nf(c['logins30'])),
                _Kpi('Pedidos criados · 30d', nf(c['ordersCreated30'])),
              ]),
              const SizedBox(height: 16),
              const WqSectionTitle('Lojas'),
              if (_list(d['shops']).isEmpty) Text('Sem loja vinculada.', style: TextStyle(color: context.wqMuted)),
              for (final s in _list(d['shops']))
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: WqCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${s['name']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                              Text(
                                [
                                  _role[s['role']] ?? '${s['role']}',
                                  _planLabel[s['plan']] ?? 'Sem plano',
                                  if (s['subscription'] != null) _subLabel[s['subscription']] ?? '${s['subscription']}',
                                  if (s['active'] != true) 'acesso removido',
                                ].join(' · '),
                                style: TextStyle(fontSize: 12, color: context.wqMuted),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(onPressed: () => _enterShop(context, api, '${s['id']}', '${s['name']}'), child: const Text('Entrar')),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              const WqSectionTitle('Onde usa'),
              if (_list(d['activity']).isEmpty) Text('Sem uso registrado desde o início da coleta.', style: TextStyle(color: context.wqMuted)),
              for (final r in _list(d['activity']))
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Expanded(child: Text('${_clientLabel[r['client']] ?? r['client']}${r['appVersion'] != null ? ' v${r['appVersion']}' : ''}')),
                      Text('${nf(r['days'])} dias · ${_when(r['lastSeen'])}', style: TextStyle(fontSize: 12, color: context.wqMuted)),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              const WqSectionTitle('Segurança'),
              if (_list(d['security']).isEmpty) Text('Nenhum evento registrado ainda.', style: TextStyle(color: context.wqMuted)),
              for (final e in _list(d['security']))
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _event[e['kind']] ?? '${e['kind']}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: e['kind'] == 'login_failed'
                              ? Wq.danger
                              : e['kind'] == 'login_new_device'
                              ? Wq.warn
                              : context.wqInk,
                        ),
                      ),
                      Text(
                        '${_when(e['at'])} · ${'${e['device'] ?? ''}'.isEmpty ? _clientLabel[e['client']] ?? '' : e['device']}${'${e['ip'] ?? ''}'.isEmpty ? '' : ' · ${e['ip']}'}',
                        style: TextStyle(fontSize: 12, color: context.wqMuted),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ───────────────────────────── E-mails

class PlatformEmailsScreen extends StatefulWidget {
  const PlatformEmailsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PlatformEmailsScreen> createState() => _PlatformEmailsScreenState();
}

class _PlatformEmailsScreenState extends State<PlatformEmailsScreen> {
  int days = 7;
  String group = 'all';
  String status = 'all';
  String q = '';
  int page = 1;
  final search = TextEditingController();

  static const _reason = {
    'smtp-off': 'SMTP desligado (só no console)',
    'no-recipient': 'sem e-mail do cliente',
    'awaiting-price': 'esperando o preço',
    'awaiting-photos': 'esperando as fotos',
    'pdf-failed': 'PDF não gerou',
    'no-shop': 'loja não encontrada',
    'failed': 'erro no envio',
  };
  static const _status = {'sent': ('Enviado', Wq.success), 'skipped': ('Não enviado', Wq.muted), 'failed': ('Falhou', Wq.danger)};

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'E-mails',
      subtitle: 'Tudo que a Worqera enviou',
      child: _Loaded(
        api: widget.api,
        key: ValueKey('$days|$group|$status|$q|$page'),
        load: () async => (await widget.api.dio.get(
          '/platform/emails',
          queryParameters: {'days': days, if (group != 'all') 'group': group, if (status != 'all') 'status': status, if (q.isNotEmpty) 'q': q, 'page': page},
        )).data,
        builder: (context, d, reload) {
          final c = _map(d['counts']);
          final pages = (_n(d['total']) / 50).ceil().clamp(1, 9999);
          return RefreshIndicator(
            onRefresh: reload,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Chips<String>(
                  value: group,
                  options: const [('all', 'Todos'), ('orders', 'Pedidos'), ('account', 'Conta e convites'), ('billing', 'Assinatura'), ('alerts', 'Alertas')],
                  onChanged: (v) => setState(() {
                    group = v;
                    page = 1;
                  }),
                ),
                const SizedBox(height: 6),
                _Chips<int>(
                  value: days,
                  options: const [(1, '24h'), (7, '7d'), (14, '14d'), (30, '30d')],
                  onChanged: (v) => setState(() {
                    days = v;
                    page = 1;
                  }),
                ),
                const SizedBox(height: 12),
                _kpiGrid([
                  _Kpi('Enviados', nf(c['sent']), tone: Wq.success),
                  _Kpi('Falharam', nf(c['failed']), tone: _n(c['failed']) > 0 ? Wq.danger : null),
                  _Kpi('Não enviados', nf(c['skipped']), hint: 'sem destinatário, esperando ou SMTP off'),
                  _Kpi('Tentativas', nf(c['total'])),
                ]),
                const SizedBox(height: 12),
                _Chips<String>(
                  value: status,
                  options: const [('all', 'Qualquer situação'), ('sent', 'Enviados'), ('failed', 'Falharam'), ('skipped', 'Não enviados')],
                  onChanged: (v) => setState(() {
                    status = v;
                    page = 1;
                  }),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: search,
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'E-mail, código do pedido ou assunto'),
                  textInputAction: TextInputAction.search,
                  onSubmitted: (v) => setState(() {
                    q = v.trim();
                    page = 1;
                  }),
                ),
                const SizedBox(height: 12),
                if (_list(d['emails']).isEmpty) Text('Nenhum e-mail neste filtro.', style: TextStyle(color: context.wqMuted)),
                for (final m in _list(d['emails']))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: WqCard(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${m['kindLabel']}${'${m['code']}'.isEmpty ? '' : ' #${m['code']}'}',
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ),
                              Text(
                                (_status[m['status']] ?? _status['skipped']!).$1,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: (_status[m['status']] ?? _status['skipped']!).$2),
                              ),
                            ],
                          ),
                          Text(
                            '${m['to']}${m['shopName'] != null ? ' · ${m['shopName']}' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, color: context.wqMuted),
                          ),
                          Text(_when(m['at']), style: TextStyle(fontSize: 12, color: context.wqMuted)),
                          if ('${m['reason']}'.isNotEmpty || '${m['error']}'.isNotEmpty)
                            Text(
                              [
                                if ('${m['reason']}'.isNotEmpty) _reason[m['reason']] ?? '${m['reason']}',
                                if ('${m['error']}'.isNotEmpty) '${m['error']}',
                              ].join(' · '),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: m['status'] == 'failed' ? Wq.danger : context.wqMuted),
                            ),
                        ],
                      ),
                    ),
                  ),
                if (pages > 1)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('Página $page de $pages', style: TextStyle(color: context.wqMuted)),
                      IconButton(onPressed: page <= 1 ? null : () => setState(() => page -= 1), icon: const Icon(Icons.chevron_left)),
                      IconButton(onPressed: page >= pages ? null : () => setState(() => page += 1), icon: const Icon(Icons.chevron_right)),
                    ],
                  ),
                const SizedBox(height: 8),
                Text('Ficam guardados por 30 dias.', style: TextStyle(fontSize: 12, color: context.wqMuted)),
              ],
            ),
          );
        },
      ),
    );
  }
}
