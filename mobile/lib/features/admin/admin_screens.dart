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
  List<Map<String, dynamic>> rows = [];
  String? openId;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/platform/shops');
      setState(() => rows = asMaps(res.data));
    } catch (e) {
      setState(() => error = widget.api.message(e));
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
            WqCard(
              onTap: () => setState(() => openId = openId == '${row['id']}' ? null : '${row['id'] ?? row['_id']}'),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${row['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                Text('${row['slug'] ?? ''} · ${row['planCode'] ?? row['plan'] ?? 'Sem plano'} · ${row['status'] ?? ''}', style: const TextStyle(color: Wq.muted, fontSize: 13)),
                if (openId == '${row['id'] ?? row['_id']}')
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Trial ${row['trialEndsAt'] ?? '—'}', style: const TextStyle(fontSize: 12)),
                  ),
              ]),
            ),
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
