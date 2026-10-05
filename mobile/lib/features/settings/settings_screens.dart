import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class EmpresaScreen extends StatefulWidget {
  const EmpresaScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<EmpresaScreen> createState() => _EmpresaScreenState();
}

class _EmpresaScreenState extends State<EmpresaScreen> {
  final name = TextEditingController();
  final slug = TextEditingController();
  final display = TextEditingController();
  final phone = TextEditingController();
  final address = TextEditingController();
  final singular = TextEditingController(text: 'peça');
  final plural = TextEditingController(text: 'peças');
  final primary = TextEditingController(text: '#7D26DE');
  final accent = TextEditingController(text: '#0D9488');
  bool emailOn = true;
  bool waOn = false;
  String? info;
  String? error;

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/shops/current').then((res) {
      final shop = Map<String, dynamic>.from(res.data as Map);
      final doc = shop['shop'] is Map ? Map<String, dynamic>.from(shop['shop'] as Map) : shop;
      final branding = doc['branding'] is Map ? Map<String, dynamic>.from(doc['branding'] as Map) : {};
      final notes = doc['notifications'] is Map ? Map<String, dynamic>.from(doc['notifications'] as Map) : {};
      name.text = '${doc['name'] ?? ''}';
      slug.text = '${doc['slug'] ?? ''}';
      display.text = '${branding['displayName'] ?? doc['name'] ?? ''}';
      phone.text = '${branding['phone'] ?? ''}';
      address.text = '${branding['address'] ?? ''}';
      singular.text = '${branding['itemLabel'] ?? 'peça'}';
      plural.text = '${branding['itemLabelPlural'] ?? 'peças'}';
      primary.text = '${branding['primaryColor'] ?? '#7D26DE'}';
      accent.text = '${branding['accentColor'] ?? '#0D9488'}';
      emailOn = notes['email']?['enabled'] != false;
      waOn = notes['whatsapp']?['enabled'] == true;
      if (mounted) setState(() {});
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  Future<void> save() async {
    try {
      await widget.api.dio.patch('/shops/current', data: {
        'name': name.text.trim(),
        'slug': slug.text.trim(),
        'branding': {
          'displayName': display.text.trim(),
          'phone': phone.text.trim(),
          'address': address.text.trim(),
          'primaryColor': primary.text.trim(),
          'accentColor': accent.text.trim(),
          'itemLabel': singular.text.trim(),
          'itemLabelPlural': plural.text.trim(),
        },
        'notifications': {
          'email': {'enabled': emailOn},
          'whatsapp': {'enabled': waOn},
        },
      });
      setState(() => info = 'Empresa salva.');
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Empresa',
      subtitle: 'Marca da operação, item e contato',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          if (info != null) Text(info!, style: const TextStyle(color: Wq.success)),
          WqCard(
            child: Column(children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(controller: display, decoration: const InputDecoration(labelText: 'Nome de exibição')),
              TextField(controller: slug, decoration: const InputDecoration(labelText: 'Link público (slug)')),
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
              TextField(controller: address, decoration: const InputDecoration(labelText: 'Endereço')),
              TextField(controller: singular, decoration: const InputDecoration(labelText: 'Nome do item (singular)')),
              TextField(controller: plural, decoration: const InputDecoration(labelText: 'Nome do item (plural)')),
              TextField(controller: primary, decoration: const InputDecoration(labelText: 'Cor principal')),
              TextField(controller: accent, decoration: const InputDecoration(labelText: 'Cor de ação')),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: emailOn, onChanged: (v) => setState(() => emailOn = v), title: const Text('E-mail do laudo')),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: waOn, onChanged: (v) => setState(() => waOn = v), title: const Text('WhatsApp')),
              const SizedBox(height: 8),
              FilledButton(onPressed: save, child: const Text('Salvar')),
            ]),
          ),
        ],
      ),
    );
  }
}

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({
    super.key,
    required this.api,
    required this.title,
    required this.subtitle,
    required this.path,
    this.price = false,
    this.sector = false,
  });
  final WorqeraApi api;
  final String title;
  final String subtitle;
  final String path;
  final bool price;
  final bool sector;

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final name = TextEditingController();
  final extra = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  String? error;
  bool terminal = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get(widget.path);
      setState(() {
        rows = asMaps(res.data);
        error = null;
      });
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> add() async {
    if (name.text.trim().isEmpty) return;
    final body = <String, dynamic>{'name': name.text.trim()};
    if (widget.price) body['price'] = double.tryParse(extra.text.replaceAll(',', '.')) ?? 0;
    if (widget.sector) {
      body['color'] = extra.text.trim().isEmpty ? '#7D26DE' : extra.text.trim();
      body['isTerminal'] = terminal;
      body['order'] = rows.length + 1;
    }
    if (widget.path.endsWith('employees') && extra.text.trim().isNotEmpty) body['phone'] = extra.text.trim();
    await widget.api.dio.post(widget.path, data: body);
    name.clear();
    await load();
  }

  Future<void> remove(Map row) async {
    final id = '${row['id'] ?? row['_id']}';
    await widget.api.dio.delete('${widget.path}/$id');
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: widget.title,
      subtitle: widget.subtitle,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          WqCard(
            child: Column(children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
              if (widget.price) TextField(controller: extra, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Preço (R\$)')),
              if (widget.sector) TextField(controller: extra, decoration: const InputDecoration(labelText: 'Cor (#RRGGBB)')),
              if (widget.path.endsWith('employees')) TextField(controller: extra, decoration: const InputDecoration(labelText: 'Telefone')),
              if (widget.sector) SwitchListTile(contentPadding: EdgeInsets.zero, value: terminal, onChanged: (v) => setState(() => terminal = v), title: const Text('Coluna final')),
              Align(alignment: Alignment.centerRight, child: FilledButton(onPressed: add, child: const Text('Adicionar'))),
            ]),
          ),
          const SizedBox(height: 12),
          for (final row in rows) ...[
            WqCard(
              child: Row(children: [
                if (widget.sector)
                  Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: _hex(row['color']), shape: BoxShape.circle)),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${row['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (widget.price) Text(brl(row['price']), style: const TextStyle(color: Wq.muted)),
                    if (row['phone'] != null) Text('${row['phone']}', style: const TextStyle(color: Wq.muted)),
                    if (row['isTerminal'] == true) const Text('Final', style: TextStyle(color: Wq.success, fontSize: 12)),
                    if (row['active'] == false) const Text('Oculta', style: TextStyle(color: Wq.muted, fontSize: 12)),
                  ]),
                ),
                IconButton(
                  onPressed: () async {
                    final next = TextEditingController(text: '${row['name'] ?? ''}');
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Alterar nome'),
                        content: TextField(controller: next, decoration: const InputDecoration(labelText: 'Nome')),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar')),
                        ],
                      ),
                    );
                    if (ok == true && next.text.trim().isNotEmpty) {
                      await widget.api.dio.patch('${widget.path}/${row['id'] ?? row['_id']}', data: {'name': next.text.trim()});
                      await load();
                    }
                  },
                  icon: const Icon(Icons.edit_outlined),
                ),
                IconButton(onPressed: () => remove(row), icon: const Icon(Icons.delete_outline, color: Wq.danger)),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }

  Color _hex(dynamic raw) {
    final text = '$raw'.replaceAll('#', '');
    if (text.length != 6) return Wq.brand;
    return Color(int.parse('FF$text', radix: 16));
  }
}

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  String role = 'atendimento';
  List<Map<String, dynamic>> rows = [];
  String? info;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final res = await widget.api.dio.get('/shops/current/members');
    setState(() => rows = asMaps(res.data));
  }

  Future<void> add() async {
    await widget.api.dio.post('/shops/current/members', data: {
      'name': name.text.trim(),
      'email': email.text.trim(),
      'password': password.text,
      'role': role,
    });
    name.clear();
    email.clear();
    password.clear();
    setState(() => info = 'Pessoa adicionada.');
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Equipe',
      subtitle: 'Logins da empresa',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WqCard(
            child: Column(children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
              TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'Papel'),
                items: const [
                  DropdownMenuItem(value: 'admin', child: Text('Admin')),
                  DropdownMenuItem(value: 'atendimento', child: Text('Atendimento')),
                  DropdownMenuItem(value: 'sector', child: Text('Setor')),
                ],
                onChanged: (v) => setState(() => role = v ?? role),
              ),
              const SizedBox(height: 8),
              FilledButton(onPressed: add, child: const Text('Adicionar')),
              if (info != null) Text(info!, style: const TextStyle(color: Wq.success)),
            ]),
          ),
          const SizedBox(height: 12),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${row['name'] ?? row['user']?['name'] ?? row['email'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('${row['email'] ?? row['user']?['email'] ?? ''} · ${row['role'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                  TextButton(
                    onPressed: () async {
                      final password = TextEditingController();
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Nova senha'),
                          content: TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salvar')),
                          ],
                        ),
                      );
                      if (ok == true) {
                        await widget.api.dio.post('/shops/current/members/${row['id'] ?? row['_id']}/reset-password', data: {'password': password.text});
                        setState(() => info = 'Senha atualizada.');
                      }
                    },
                    child: const Text('Redefinir senha'),
                  ),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class TvScreen extends StatelessWidget {
  const TvScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'TVs',
      subtitle: 'Painéis da oficina e do cliente',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _tile(context, 'TV Cliente', 'http://127.0.0.1:3000/tv'),
          const SizedBox(height: 8),
          _tile(context, 'TV Oficina', 'http://127.0.0.1:3000/tv-dashboard'),
          const SizedBox(height: 8),
          _tile(context, 'TV Financeiro', 'http://127.0.0.1:3000/tv-financeiro'),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, String title, String url) {
    return WqCard(
      onTap: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          Text(url, style: const TextStyle(color: Wq.muted, fontSize: 12)),
        ])),
        const Icon(Icons.open_in_new, color: Wq.brand),
      ]),
    );
  }
}
