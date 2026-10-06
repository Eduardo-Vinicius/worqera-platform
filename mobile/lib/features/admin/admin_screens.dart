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
          for (final row in rows) ...[
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
                  Text('${row['slug'] ?? ''} · ${planLabel(planCode(row))} · ${row['status'] ?? ''}', style: const TextStyle(color: Wq.muted, fontSize: 13)),
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
                      OutlinedButton(onPressed: busyId == id ? null : () => patch(id, {'seal': 'verificado'}, 'Selo verificado'), child: const Text('Selo')),
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
  String? error;
  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/platform/ops').then((res) {
      if (mounted) setState(() => data = Map<String, dynamic>.from(res.data as Map));
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  @override
  Widget build(BuildContext context) {
    final shops = data?['shops'] as Map? ?? {};
    final calls = data?['calls'] as Map? ?? data?['windows'] as Map? ?? {};
    final errors = asMaps({'data': data?['errors'] ?? data?['recentErrors']});
    return WqPage(
      title: 'Portal',
      subtitle: 'Pulso da plataforma',
      child: data == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _kpi('Oficinas', '${shops['total'] ?? shops['count'] ?? '—'}'),
                _kpi('Em trial', '${shops['trialing'] ?? '—'}'),
                _kpi('Chamadas 24h', '${calls['h24'] ?? calls['day'] ?? data?['requests24h'] ?? '—'}'),
                const WqSectionTitle('Endpoints'),
                for (final row in asMaps({'data': data?['endpoints']}).take(12))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${row['method'] ?? ''} ${row['route'] ?? ''}', style: const TextStyle(fontSize: 13)),
                    trailing: Text('${row['clientErrorRate'] ?? 0}% 4xx', style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                const WqSectionTitle('Erros recentes'),
                for (final row in errors.take(12))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: WqCard(child: Text('${row['message'] ?? row['detail'] ?? row['path'] ?? row}', style: const TextStyle(fontSize: 13))),
                  ),
              ],
            ),
    );
  }

  Widget _kpi(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(child: Row(children: [Expanded(child: Text(label, style: const TextStyle(color: Wq.muted))), Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18))])),
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
    await widget.api.dio.post('/platform/notices', data: {'title': title.text.trim(), 'body': body.text.trim()});
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
              Align(alignment: Alignment.centerRight, child: FilledButton(onPressed: add, child: const Text('Publicar'))),
            ]),
          ),
          const SizedBox(height: 12),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${row['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text('${row['body'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}
