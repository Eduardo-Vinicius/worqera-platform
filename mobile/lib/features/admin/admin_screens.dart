import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class ShopsScreen extends StatefulWidget {
  const ShopsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<ShopsScreen> createState() => _ShopsScreenState();
}

class _ShopsScreenState extends State<ShopsScreen> {
  static const plans = [
    ('WORQERA_BASIC', 'Basic · R\$ 147'),
    ('WORQERA_PRO', 'Pro · R\$ 297'),
    ('WORQERA_BUSINESS', 'Business · R\$ 499'),
  ];

  List<Map<String, dynamic>> rows = [];
  String query = '';
  String shopFilter = 'todas';
  String? openId;
  String? busyId;
  String? error;
  final planDrafts = <String, String>{};

  @override
  void initState() {
    super.initState();
    load();
  }

  String shopId(Map row) => '${row['id'] ?? row['_id']}';

  String planCode(Map row) {
    final sub = row['subscription'];
    final raw = sub is Map ? '${sub['planCode'] ?? ''}' : '${row['planCode'] ?? ''}';
    if (raw == 'WORQERA_PREMIUM') return 'WORQERA_BUSINESS';
    if (raw == 'WORQERA_EARLY') return 'WORQERA_BASIC';
    if (raw == 'WORQERA_BASIC' || raw == 'WORQERA_PRO' || raw == 'WORQERA_BUSINESS') return raw;
    return 'WORQERA_PRO';
  }

  String planLabel(String code) {
    for (final plan in plans) {
      if (plan.$1 == code) return plan.$2.split(' · ').first;
    }
    return code;
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/platform/shops');
      setState(() => rows = asMaps(res.data));
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> patch(String id, Map<String, dynamic> body, String ok) async {
    setState(() => busyId = id);
    try {
      await widget.api.dio.patch('/platform/shops/$id', data: body);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ok)));
      }
      await load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.api.message(e))));
      }
    } finally {
      if (mounted) setState(() => busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Oficinas',
      subtitle: 'Contas da plataforma',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Nome ou slug'),
            onChanged: (value) => setState(() => query = value.trim().toLowerCase()),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            for (final item in [('todas', 'Todas'), ('trial', 'Trial'), ('pagas', 'Pagas'), ('suspensas', 'Suspensas'), ('fim', 'Trial ≤ 7 dias')])
              ChoiceChip(label: Text(item.$2), selected: shopFilter == item.$1, onSelected: (_) => setState(() => shopFilter = item.$1)),
          ]),
          const SizedBox(height: 12),
          for (final row in rows.where((row) {
            final name = '${row['name'] ?? ''} ${row['slug'] ?? ''}'.toLowerCase();
            if (query.isNotEmpty && !name.contains(query)) return false;
            final sub = row['subscription'] is Map ? row['subscription'] as Map : const {};
            final trial = int.tryParse('${row['trialDaysLeft'] ?? ''}');
            if (shopFilter == 'suspensas') return row['status'] == 'suspended';
            if (shopFilter == 'trial') return '${sub['status']}' == 'trialing';
            if (shopFilter == 'pagas') return '${sub['status']}' == 'active' && row['status'] != 'suspended';
            if (shopFilter == 'fim') return trial != null && trial <= 7;
            return true;
          })) ...[
            Builder(builder: (context) {
              final id = shopId(row);
              final open = openId == id;
              final suspended = row['status'] == 'suspended';
              final draft = planDrafts[id] ?? planCode(row);
              final sub = row['subscription'] is Map ? row['subscription'] as Map : null;
              return WqCard(
                onTap: () => setState(() => openId = open ? null : id),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${row['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text(
                    [
                      '${row['slug'] ?? ''}',
                      planLabel(planCode(row)),
                      '${row['status'] ?? ''}',
                      '${row['openCount'] ?? 0} abertos',
                      '${row['memberCount'] ?? 0} pessoas',
                      if (row['trialDaysLeft'] != null) 'trial ${row['trialDaysLeft']}d',
                      if ('${row['lastOrderAt'] ?? ''}'.isNotEmpty) 'último ${dayLabel(row['lastOrderAt'])}',
                    ].where((part) => part.trim().isNotEmpty).join(' · '),
                    style: const TextStyle(color: Wq.muted, fontSize: 13),
                  ),
                  if (open) ...[
                    const SizedBox(height: 8),
                    Text('Assinatura ${sub?['status'] ?? '—'} · trial ${sub?['trialEndsAt'] ?? row['trialDaysLeft'] ?? '—'}', style: const TextStyle(fontSize: 12)),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Nota interna'),
                      onSubmitted: (value) => patch(id, {'adminNote': value}, 'Nota salva'),
                    ),
                    const SizedBox(height: 8),
                    DropdownButton<String>(
                      value: draft,
                      isExpanded: true,
                      items: [
                        for (final plan in plans) DropdownMenuItem(value: plan.$1, child: Text(plan.$2)),
                      ],
                      onChanged: busyId == id ? null : (value) => setState(() => planDrafts[id] = value ?? draft),
                    ),
                    Wrap(spacing: 8, children: [
                      OutlinedButton(
                        onPressed: busyId == id
                            ? null
                            : () => patch(id, {'status': suspended ? 'active' : 'suspended'}, suspended ? 'Oficina reativada' : 'Oficina suspensa'),
                        child: Text(suspended ? 'Reativar' : 'Suspender'),
                      ),
                      FilledButton(
                        onPressed: busyId == id
                            ? null
                            : () => patch(id, {
                                  'subscriptionStatus': 'active',
                                  'planCode': draft,
                                  'status': 'active',
                                }, 'Plano ${planLabel(draft)} aplicado'),
                        child: const Text('Aplicar plano'),
                      ),
                      OutlinedButton(onPressed: busyId == id ? null : () => patch(id, {'extendTrialDays': 7}, 'Trial estendido'), child: const Text('+7 dias')),
                      OutlinedButton(onPressed: busyId == id ? null : () => patch(id, {'subscriptionStatus': 'canceled'}, 'Assinatura revogada'), child: const Text('Revogar')),
                      for (final seal in [('verificado', 'Verificado'), ('destaque', 'Destaque'), ('parceiro', 'Parceiro'), ('', 'Sem selo')])
                        OutlinedButton(onPressed: busyId == id ? null : () => patch(id, {'seal': seal.$1}, seal.$2), child: Text(seal.$2)),
                    ]),
                  ],
                ]),
              );
            }),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class PortalScreen extends StatefulWidget {
  const PortalScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<PortalScreen> createState() => _PortalScreenState();
}

class _PortalScreenState extends State<PortalScreen> {
  Map? data;
  List<Map<String, dynamic>> shops = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        widget.api.dio.get('/platform/ops'),
        widget.api.dio.get('/platform/shops', queryParameters: {'limit': 200}),
      ]);
      if (!mounted) return;
      setState(() {
        data = Map<String, dynamic>.from(results[0].data as Map);
        shops = asMaps(results[1].data);
        error = null;
      });
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = data?['shops'] as Map? ?? {};
    final windows = data?['windows'] is Map ? data!['windows'] as Map : const {};
    final day = windows['24h'] is Map ? windows['24h'] as Map : const {};
    final endpoints = asMaps({'data': day['endpoints'] ?? data?['endpoints']});
    final noisy = [...endpoints]..sort((a, b) {
        final ae = (int.tryParse('${a['errors'] ?? 0}') ?? 0) + (int.tryParse('${a['clientErrors'] ?? 0}') ?? 0);
        final be = (int.tryParse('${b['errors'] ?? 0}') ?? 0) + (int.tryParse('${b['clientErrors'] ?? 0}') ?? 0);
        if (be != ae) return be.compareTo(ae);
        return (int.tryParse('${b['count'] ?? 0}') ?? 0).compareTo(int.tryParse('${a['count'] ?? 0}') ?? 0);
      });
    final problems = noisy.where((row) {
      final bad = (int.tryParse('${row['errors'] ?? 0}') ?? 0) + (int.tryParse('${row['clientErrors'] ?? 0}') ?? 0);
      return bad > 0;
    }).take(8);
    final shownEndpoints = problems.isEmpty ? noisy.take(6) : problems;
    final errors = asMaps({'data': data?['errors']}).where((row) => (int.tryParse('${row['status'] ?? 0}') ?? 0) >= 500).take(8);
    final disabled = asMaps({'data': data?['disabled']});
    final attention = shops.where((row) {
      final suspended = row['status'] == 'suspended';
      final sub = row['subscription'] is Map ? row['subscription'] as Map : const {};
      final trial = int.tryParse('${row['trialDaysLeft'] ?? ''}');
      final status = '${sub['status'] ?? ''}';
      return suspended || status == 'past_due' || status == 'canceled' || (trial != null && trial <= 3);
    }).take(8);
    return WqPage(
      title: 'Portal',
      subtitle: 'Oficinas, plano e o que a API está fazendo',
      actions: [
        IconButton(tooltip: 'Atualizar', onPressed: loading ? null : load, icon: const Icon(Icons.refresh)),
      ],
      child: loading && data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
                if (data?['redis'] == 'down')
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text('Redis fora. Oficinas e erros continuam. Chamadas e usuários ativos ficam zerados.', style: TextStyle(color: Wq.warn, fontWeight: FontWeight.w600)),
                  ),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  _kpi('Oficinas', '${totals['total'] ?? shops.length}'),
                  _kpi('Trial', '${totals['trialing'] ?? '—'}'),
                  _kpi('Pagas', '${totals['active'] ?? '—'}'),
                  _kpi('Suspensas', '${totals['suspended'] ?? '—'}'),
                  _kpi('Pedidos abertos', '${totals['openOrders'] ?? '—'}'),
                  _kpi('Usuários 30 min', '${data?['activeUsers'] ?? 0}'),
                  _kpi('Chamadas 24h', '${day['calls'] ?? '—'}'),
                  _kpi('5xx 24h', '${day['errors'] ?? 0}'),
                ]),
                const SizedBox(height: 16),
                const WqSectionTitle('Precisa de olho'),
                if (attention.isEmpty)
                  const Text('Nenhuma oficina suspensa, vencida ou no fim do trial.', style: TextStyle(color: Wq.muted))
                else
                  for (final row in attention)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: WqCard(
                        onTap: () => ShellScope.maybeOf(context)?.openPage('oficinas', ShopsScreen(api: widget.api), stack: true),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${row['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          Text(_shopLine(row), style: const TextStyle(color: Wq.muted, fontSize: 13)),
                        ]),
                      ),
                    ),
                const SizedBox(height: 8),
                const WqSectionTitle('Endpoints em 24h'),
                if (shownEndpoints.isEmpty)
                  const Text('Sem chamadas nessa janela. O Redis guarda esse número.', style: TextStyle(color: Wq.muted))
                else
                  for (final row in shownEndpoints)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: WqCard(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${row['method'] ?? ''} ${row['route'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          Text(
                            '${row['count'] ?? 0} chamadas · ${row['avgMs'] ?? 0} ms · 4xx ${row['clientErrors'] ?? 0} · 5xx ${row['errors'] ?? 0}',
                            style: const TextStyle(color: Wq.muted, fontSize: 12),
                          ),
                        ]),
                      ),
                    ),
                const SizedBox(height: 8),
                const WqSectionTitle('Falhas do servidor'),
                if (errors.isEmpty)
                  const Text('Nenhum 5xx recente. Login recusado não entra aqui.', style: TextStyle(color: Wq.muted))
                else
                  for (final row in errors)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: WqCard(
                        child: Text(
                          '${row['status'] ?? ''} ${row['method'] ?? ''} ${row['route'] ?? ''}\n${row['message'] ?? ''} · ${row['count'] ?? 1}× ${row['shopName'] ?? ''}'.trim(),
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ),
                if (disabled.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const WqSectionTitle('Módulos desligados'),
                  Text(disabled.map((row) => '${row['label'] ?? row['key']}').join(' · '), style: const TextStyle(color: Wq.muted)),
                ],
              ],
            ),
    );
  }

  String _shopLine(Map row) {
    final sub = row['subscription'] is Map ? row['subscription'] as Map : const {};
    final bits = <String>[
      if (row['status'] == 'suspended') 'Suspensa',
      '${sub['status'] ?? 'sem plano'}',
      if (row['trialDaysLeft'] != null) 'trial ${row['trialDaysLeft']}d',
      '${row['openCount'] ?? 0} abertos',
    ];
    return bits.join(' · ');
  }

  Widget _kpi(String label, String value) {
    return SizedBox(
      width: 148,
      child: WqCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Wq.muted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        ]),
      ),
    );
  }
}

class ParamsScreen extends StatefulWidget {
  const ParamsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<ParamsScreen> createState() => _ParamsScreenState();
}

class _ParamsScreenState extends State<ParamsScreen> {
  List<Map<String, dynamic>> flags = [];
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/platform/config');
      final body = Map<String, dynamic>.from(res.data as Map);
      setState(() => flags = asMaps({'data': body['services'] ?? body['features'] ?? body['modules']}));
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> toggle(Map flag) async {
    final key = '${flag['key']}';
    final enabled = flag['enabled'] != false;
    await widget.api.dio.put('/platform/config', data: {
      'services': [
        {'key': key, 'enabled': !enabled},
      ],
    });
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Parâmetros',
      subtitle: 'O que aparece no menu das empresas',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          for (final flag in flags)
            SwitchListTile(
              title: Text('${flag['label'] ?? flag['key']}'),
              subtitle: Text('${flag['key']}'),
              value: flag['enabled'] != false,
              onChanged: (_) => toggle(flag),
            ),
        ],
      ),
    );
  }
}

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  final title = TextEditingController();
  final body = TextEditingController();
  String platform = 'all';
  List<Map<String, dynamic>> rows = [];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final res = await widget.api.dio.get('/platform/notices');
    setState(() => rows = asMaps(res.data));
  }

  Future<void> add() async {
    if (title.text.trim().isEmpty) return;
    await widget.api.dio.post('/platform/notices', data: {'title': title.text.trim(), 'body': body.text.trim(), 'platform': platform});
    title.clear();
    body.clear();
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Notícias',
      subtitle: 'Avisos para as empresas',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WqCard(
            child: Column(children: [
              TextField(controller: title, decoration: const InputDecoration(labelText: 'Título')),
              TextField(controller: body, maxLines: 3, decoration: const InputDecoration(labelText: 'Texto')),
              DropdownButtonFormField<String>(
                initialValue: platform,
                decoration: const InputDecoration(labelText: 'Onde aparece'),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('Todos')),
                  DropdownMenuItem(value: 'web', child: Text('Site')),
                  DropdownMenuItem(value: 'ios', child: Text('iPhone')),
                  DropdownMenuItem(value: 'android', child: Text('Android')),
                ],
                onChanged: (value) => setState(() => platform = value ?? 'all'),
              ),
              Align(alignment: Alignment.centerRight, child: FilledButton(onPressed: add, child: const Text('Publicar'))),
            ]),
          ),
          const SizedBox(height: 12),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text('${row['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800))),
                    IconButton(
                      onPressed: () async {
                        await widget.api.dio.delete('/platform/notices/${row['id'] ?? row['_id']}');
                        await load();
                      },
                      icon: const Icon(Icons.delete_outline, color: Wq.danger),
                    ),
                  ]),
                  Text('${row['body'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                  Text('${row['platform'] ?? 'all'}', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}
