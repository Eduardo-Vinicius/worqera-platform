import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import 'tv_boards.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';

class EmpresaScreen extends StatefulWidget {
  const EmpresaScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<EmpresaScreen> createState() => _EmpresaScreenState();
}

class _EmpresaScreenState extends State<EmpresaScreen> {
  static const _verticals = <String, String>{
    'general': 'Geral / serviços',
    'footwear': 'Calçados / tênis',
    'laundry': 'Lavanderia',
    'repair': 'Assistência / reparo',
    'custom': 'Personalizado',
  };
  static const _presetNoun = <String, List<String>>{
    'general': ['peça', 'peças'],
    'footwear': ['tênis', 'tênis'],
    'laundry': ['roupa', 'roupas'],
    'repair': ['equipamento', 'equipamentos'],
  };

  final name = TextEditingController();
  final slug = TextEditingController();
  final display = TextEditingController();
  final emailFrom = TextEditingController();
  final phone = TextEditingController();
  final address = TextEditingController();
  final singular = TextEditingController(text: 'peça');
  final plural = TextEditingController(text: 'peças');
  final primary = TextEditingController(text: '#7D26DE');
  final accent = TextEditingController(text: '#0D9488');
  final waPhone = TextEditingController();
  final tplReady = TextEditingController(text: 'Olá {{client}}! Seu pedido {{code}} está pronto para retirada. {{link}}');
  final tplMoved = TextEditingController(text: 'Olá {{client}}! Seu pedido {{code}} avançou para {{sector}}. Acompanhe: {{link}}');
  final tplCreated = TextEditingController(text: 'Olá {{client}}! Seu pedido {{code}} foi registrado em {{shop}}. Acompanhe: {{link}}');
  final tplLink = TextEditingController(text: 'Olá {{client}}! Consulte o pedido {{code}} aqui: {{link}}');
  bool emailOn = true;
  bool waOn = false;
  String vertical = 'general';
  String logoUrl = '';
  String partnerCode = '';
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
      final wa = notes['whatsapp'] is Map ? Map<String, dynamic>.from(notes['whatsapp'] as Map) : {};
      final tpl = wa['templates'] is Map ? Map<String, dynamic>.from(wa['templates'] as Map) : {};
      name.text = '${doc['name'] ?? ''}';
      slug.text = '${doc['slug'] ?? ''}';
      display.text = '${branding['displayName'] ?? doc['name'] ?? ''}';
      emailFrom.text = '${branding['emailFromName'] ?? branding['displayName'] ?? doc['name'] ?? ''}';
      phone.text = '${branding['phone'] ?? ''}';
      address.text = '${branding['address'] ?? ''}';
      singular.text = '${branding['itemLabel'] ?? 'peça'}';
      plural.text = '${branding['itemLabelPlural'] ?? 'peças'}';
      primary.text = '${branding['primaryColor'] ?? '#7D26DE'}';
      accent.text = '${branding['accentColor'] ?? '#0D9488'}';
      logoUrl = '${branding['logoUrl'] ?? ''}';
      vertical = '${doc['vertical'] ?? 'general'}';
      if (!_verticals.containsKey(vertical)) vertical = 'general';
      partnerCode = '${doc['partnerCode'] ?? ''}';
      emailOn = notes['email']?['enabled'] != false;
      waOn = wa['enabled'] == true;
      waPhone.text = '${wa['shopPhoneE164'] ?? branding['phone'] ?? ''}';
      if ('${tpl['ready'] ?? ''}'.isNotEmpty) tplReady.text = '${tpl['ready']}';
      if ('${tpl['moved'] ?? ''}'.isNotEmpty) tplMoved.text = '${tpl['moved']}';
      if ('${tpl['created'] ?? ''}'.isNotEmpty) tplCreated.text = '${tpl['created']}';
      if ('${tpl['publicLink'] ?? ''}'.isNotEmpty) tplLink.text = '${tpl['publicLink']}';
      if (mounted) setState(() {});
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  bool _hexOk(String raw) => RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(raw.trim());

  Future<void> save() async {
    if (!_hexOk(primary.text) || !_hexOk(accent.text)) {
      setState(() => error = 'Cor no formato #RRGGBB.');
      return;
    }
    try {
      final res = await widget.api.dio.patch('/shops/current', data: {
        'name': name.text.trim(),
        'slug': slug.text.trim(),
        'vertical': vertical,
        'branding': {
          'displayName': display.text.trim(),
          'emailFromName': emailFrom.text.trim().isEmpty ? display.text.trim() : emailFrom.text.trim(),
          'phone': phone.text.trim(),
          'address': address.text.trim(),
          'primaryColor': primary.text.trim(),
          'accentColor': accent.text.trim(),
          'itemLabel': singular.text.trim(),
          'itemLabelPlural': plural.text.trim(),
        },
        'notifications': {
          'email': {'enabled': emailOn},
          'whatsapp': {
            'enabled': waOn,
            'shopPhoneE164': waPhone.text.trim(),
            'templates': {
              'ready': tplReady.text.trim(),
              'moved': tplMoved.text.trim(),
              'created': tplCreated.text.trim(),
              'publicLink': tplLink.text.trim(),
            },
          },
        },
      });
      final body = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      final shop = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
      setState(() {
        error = null;
        info = 'Empresa salva.';
        partnerCode = '${shop['partnerCode'] ?? partnerCode}';
      });
      await widget.api.session.apply({
        'shop': {
          'name': display.text.trim().isEmpty ? name.text.trim() : display.text.trim(),
          'branding': {'logoUrl': logoUrl},
        },
      }, keep: widget.api.session);
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> regenPartner() async {
    try {
      final res = await widget.api.dio.patch('/shops/current', data: {'regeneratePartnerCode': true});
      final body = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      final shop = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
      setState(() => partnerCode = '${shop['partnerCode'] ?? partnerCode}');
      if (!mounted) return;
      wqToast(context, 'Código de parceiro novo');
    } catch (e) {
      if (!mounted) return;
      wqToast(context, widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final preview = _hexOk(primary.text) ? _hex(primary.text) : Wq.brand;
    return WqPage(
      title: 'Empresa',
      subtitle: 'Marca da operação, item e contato',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          if (info != null) Text(info!, style: const TextStyle(color: Wq.success)),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: preview, borderRadius: BorderRadius.circular(10)),
                child: Row(children: [
                  if (logoUrl.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(fileUrl(logoUrl), width: 36, height: 36, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox(width: 36, height: 36)),
                    )
                  else
                    const Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(display.text.isEmpty ? 'Sua oficina' : display.text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                ]),
              ),
              const SizedBox(height: 8),
              Text('Prévia da consulta pública. O endereço do cliente é /p/o/ e um código, sem o nome da empresa.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
              TextField(controller: display, decoration: const InputDecoration(labelText: 'Nome de exibição')),
              TextField(controller: emailFrom, decoration: const InputDecoration(labelText: 'Nome no e-mail')),
              TextField(controller: slug, decoration: const InputDecoration(labelText: 'Identificador interno', helperText: 'Não entra no link do cliente.')),
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
              TextField(controller: address, decoration: const InputDecoration(labelText: 'Endereço')),
              DropdownButtonFormField<String>(
                key: ValueKey('vertical-$vertical'),
                initialValue: vertical,
                decoration: const InputDecoration(labelText: 'Tipo de negócio'),
                items: [for (final entry in _verticals.entries) DropdownMenuItem(value: entry.key, child: Text(entry.value))],
                onChanged: (value) {
                  if (value == null) return;
                  setState(() {
                    vertical = value;
                    final preset = _presetNoun[value];
                    if (preset != null) {
                      singular.text = preset[0];
                      plural.text = preset[1];
                    }
                  });
                },
              ),
              TextField(
                controller: singular,
                decoration: const InputDecoration(labelText: 'Nome do item (singular)'),
                onChanged: (_) => setState(() => vertical = 'custom'),
              ),
              TextField(
                controller: plural,
                decoration: const InputDecoration(labelText: 'Nome do item (plural)'),
                onChanged: (_) => setState(() => vertical = 'custom'),
              ),
              if (logoUrl.isNotEmpty) Align(alignment: Alignment.centerLeft, child: Image.network(fileUrl(logoUrl), height: 64)),
              OutlinedButton(onPressed: _pickLogo, child: const Text('Enviar logo')),
              if (logoUrl.isNotEmpty)
                TextButton(
                  onPressed: () async {
                    await widget.api.dio.patch('/shops/current', data: {'branding': {'logoUrl': ''}});
                    setState(() => logoUrl = '');
                    await widget.api.session.apply({'shop': {'branding': {'logoUrl': ''}}}, keep: widget.api.session);
                  },
                  child: const Text('Remover logo'),
                ),
              TextField(controller: primary, decoration: const InputDecoration(labelText: 'Cor principal (#RRGGBB)')),
              TextField(controller: accent, decoration: const InputDecoration(labelText: 'Cor de ação (#RRGGBB)')),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: emailOn, onChanged: (v) => setState(() => emailOn = v), title: const Text('E-mail do laudo')),
              Text('Criado: PDF e link. Pronto: aviso de retirada. Precisa de e-mail no cliente.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              SwitchListTile(contentPadding: EdgeInsets.zero, value: waOn, onChanged: (v) => setState(() => waOn = v), title: const Text('WhatsApp da empresa')),
              if (waOn) ...[
                TextField(controller: waPhone, decoration: const InputDecoration(labelText: 'WhatsApp da oficina')),
                TextField(controller: tplCreated, decoration: const InputDecoration(labelText: 'Mensagem ao criar'), maxLines: 2),
                TextField(controller: tplMoved, decoration: const InputDecoration(labelText: 'Mensagem ao avançar'), maxLines: 2),
                TextField(controller: tplReady, decoration: const InputDecoration(labelText: 'Mensagem de pronto'), maxLines: 2),
                TextField(controller: tplLink, decoration: const InputDecoration(labelText: 'Mensagem do link'), maxLines: 2),
              ],
              const SizedBox(height: 8),
              FilledButton(onPressed: save, child: const Text('Salvar')),
            ]),
          ),
          const SizedBox(height: 12),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('CÓDIGO DE PARCEIRO', style: TextStyle(fontSize: 11, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: Wq.muted)),
              const SizedBox(height: 6),
              Text(partnerCode.isEmpty ? '—' : partnerCode, style: monoStyle(size: 18)),
              Text('Cadastro com /signup?ref=${partnerCode.isEmpty ? 'CODIGO' : partnerCode}. 1 mês grátis quando assinar.', style: const TextStyle(color: Wq.muted, fontSize: 12)),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: regenPartner, child: const Text('Gerar outro código')),
              TextButton(
                onPressed: partnerCode.isEmpty
                    ? null
                    : () async {
                        await Clipboard.setData(ClipboardData(text: 'https://worqera.com/signup?ref=$partnerCode'));
                        if (!context.mounted) return;
                        wqToast(context, 'Link de indicação copiado');
                      },
                child: const Text('Copiar link de indicação'),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Future<void> _pickLogo() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    final form = FormData();
    form.files.add(MapEntry('logo', await MultipartFile.fromFile(file.path, filename: file.name)));
    final res = await widget.api.dio.post('/shops/current/logo', data: form);
    final body = Map<String, dynamic>.from(res.data as Map);
    final shop = body['shop'] is Map ? body['shop'] as Map : body;
    final branding = shop['branding'] is Map ? shop['branding'] as Map : {};
    final nextLogo = '${branding['logoUrl'] ?? body['logoUrl'] ?? logoUrl}';
    setState(() => logoUrl = nextLogo);
    await widget.api.session.apply({'shop': {'branding': {'logoUrl': nextLogo}}}, keep: widget.api.session);
    if (!mounted) return;
    wqToast(context, 'Logo enviado');
  }

  Color _hex(dynamic raw) {
    final text = '$raw'.replaceAll('#', '');
    if (text.length != 6) return Wq.brand;
    return Color(int.parse('FF$text', radix: 16));
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
  List<Map<String, dynamic>> rows = [];
  String? error;

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

  Future<void> openEditor({Map<String, dynamic>? row}) async {
    final nameCtrl = TextEditingController(text: '${row?['name'] ?? ''}');
    final extraCtrl = TextEditingController(
      text: widget.price
          ? '${row?['price'] ?? ''}'
          : widget.sector
              ? '${row?['color'] ?? '#7D26DE'}'
              : '${row?['phone'] ?? ''}',
    );
    final terminal = <bool>[row?['isTerminal'] == true];
    final saved = await showWqSheet<bool>(
      context,
      title: row == null ? 'Novo' : 'Editar',
      hint: widget.title,
      child: (sheet) => StatefulBuilder(
        builder: (ctx, setLocal) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
            if (widget.price) TextField(controller: extraCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Preço (R\$)')),
            if (widget.sector) TextField(controller: extraCtrl, decoration: const InputDecoration(labelText: 'Cor (#RRGGBB)')),
            if (widget.path.endsWith('employees')) TextField(controller: extraCtrl, decoration: const InputDecoration(labelText: 'Telefone')),
            if (widget.sector)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: terminal[0],
                onChanged: (value) => setLocal(() => terminal[0] = value),
                title: const Text('Coluna final'),
              ),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Salvar')),
          ],
        ),
      ),
    );
    final label = nameCtrl.text.trim();
    final extra = extraCtrl.text.trim();
    nameCtrl.dispose();
    extraCtrl.dispose();
    if (saved != true || label.isEmpty) return;
    try {
    final body = <String, dynamic>{'name': label};
    if (widget.price) body['price'] = double.tryParse(extra.replaceAll(',', '.')) ?? 0;
    if (widget.sector) {
      body['color'] = extra.isEmpty ? '#7D26DE' : extra;
      body['isTerminal'] = terminal[0];
      if (row == null) body['order'] = rows.length + 1;
    }
    if (widget.path.endsWith('employees') && extra.isNotEmpty) body['phone'] = extra;
    if (row == null) {
      await widget.api.dio.post(widget.path, data: body);
    } else {
      await widget.api.dio.patch('${widget.path}/${row['id'] ?? row['_id']}', data: body);
    }
    await load();
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
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
          FilledButton(onPressed: () => openEditor(), child: const Text('Adicionar')),
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
                IconButton(onPressed: () => openEditor(row: row), icon: const Icon(Icons.edit_outlined)),
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
    final name = TextEditingController();
    final email = TextEditingController();
    final password = TextEditingController();
    final role = <String>['atendimento'];
    final ok = await showWqSheet<bool>(
      context,
      title: 'Nova pessoa',
      hint: 'Login da empresa',
      child: (sheet) => StatefulBuilder(
        builder: (ctx, setLocal) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
            TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail')),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
            DropdownButtonFormField<String>(
              initialValue: role[0],
              decoration: const InputDecoration(labelText: 'Papel'),
              items: const [
                DropdownMenuItem(value: 'admin', child: Text('Admin')),
                DropdownMenuItem(value: 'atendimento', child: Text('Atendimento')),
                DropdownMenuItem(value: 'sector', child: Text('Setor')),
              ],
              onChanged: (value) => setLocal(() => role[0] = value ?? role[0]),
            ),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Adicionar')),
          ],
        ),
      ),
    );
    final payload = {'name': name.text.trim(), 'email': email.text.trim(), 'password': password.text, 'role': role[0]};
    name.dispose();
    email.dispose();
    password.dispose();
    if (ok != true || payload['email']!.isEmpty) return;
    await widget.api.dio.post('/shops/current/members', data: payload);
    setState(() => info = 'Pessoa adicionada.');
    await load();
  }

  Future<void> resetPassword(Map row) async {
    final password = TextEditingController();
    final ok = await showWqSheet<bool>(
      context,
      title: 'Nova senha',
      child: (sheet) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Salvar')),
        ],
      ),
    );
    final next = password.text;
    password.dispose();
    if (ok != true || next.isEmpty) return;
    await widget.api.dio.post('/shops/current/members/${row['id'] ?? row['_id']}/reset-password', data: {'password': next});
    setState(() => info = 'Senha atualizada.');
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Equipe',
      subtitle: 'Logins da empresa',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (info != null) Text(info!, style: const TextStyle(color: Wq.success)),
          FilledButton(onPressed: add, child: const Text('Adicionar')),
          const SizedBox(height: 12),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${row['name'] ?? row['user']?['name'] ?? row['email'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('${row['email'] ?? row['user']?['email'] ?? ''} · ${row['role'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                  TextButton(onPressed: () => resetPassword(row), child: const Text('Redefinir senha')),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class TvScreen extends StatelessWidget {
  const TvScreen({super.key, this.api});
  final WorqeraApi? api;

  @override
  Widget build(BuildContext context) {
    final client = api;
    return WqPage(
      title: 'TVs',
      subtitle: 'Painéis da oficina e do cliente',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (client == null)
            const Text('Abra as TVs pelo menu da empresa.', style: TextStyle(color: Wq.muted))
          else ...[
            _tile(context, 'TV Cliente', 'Códigos na fila', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TvClientScreen(api: client)))),
            const SizedBox(height: 8),
            _tile(context, 'TV Oficina', 'Contagem por setor', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TvFloorScreen(api: client)))),
            const SizedBox(height: 8),
            _tile(context, 'TV Financeiro', 'Recebido, previsto e pendente', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TvFinanceBoard(api: client)))),
            const SizedBox(height: 8),
            _tile(context, 'Ajustes das TVs', 'Título, páginas e atraso', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TvSettingsScreen(api: client)))),
          ],
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, String title, String subtitle, VoidCallback onTap) {
    return WqCard(
      onTap: onTap,
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          Text(subtitle, style: const TextStyle(color: Wq.muted, fontSize: 12)),
        ])),
        const Icon(Icons.chevron_right, color: Wq.brand),
      ]),
    );
  }
}

class TvSettingsScreen extends StatefulWidget {
  const TvSettingsScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<TvSettingsScreen> createState() => _TvSettingsScreenState();
}

class _TvSettingsScreenState extends State<TvSettingsScreen> {
  final title = TextEditingController();
  final tiles = TextEditingController(text: '4');
  final carousel = TextEditingController(text: '8');
  final overdue = TextEditingController(text: '24');

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/shops/current').then((res) {
      final body = Map<String, dynamic>.from(res.data as Map);
      final shop = body['shop'] is Map ? body['shop'] as Map : body;
      final tv = shop['tvSettings'] is Map ? shop['tvSettings'] as Map : {};
      final client = tv['client'] is Map ? tv['client'] as Map : {};
      final floor = tv['floor'] is Map ? tv['floor'] as Map : {};
      title.text = '${client['title'] ?? ''}';
      tiles.text = '${client['tilesPerPage'] ?? 4}';
      carousel.text = '${((int.tryParse('${client['carouselMs'] ?? 8000}') ?? 8000) / 1000).round()}';
      overdue.text = '${floor['overdueHours'] ?? 24}';
      if (mounted) setState(() {});
    }).catchError((_) {});
  }

  Future<void> save() async {
    await widget.api.dio.patch('/shops/current', data: {
      'tvSettings': {
        'client': {
          'title': title.text.trim(),
          'tilesPerPage': int.tryParse(tiles.text) ?? 4,
          'carouselMs': (int.tryParse(carousel.text) ?? 8) * 1000,
        },
        'floor': {'overdueHours': int.tryParse(overdue.text) ?? 24},
      },
    });
    if (mounted) wqToast(context, 'TVs salvas');
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Ajustes das TVs',
      subtitle: 'O que a sala de espera mostra',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: title, decoration: const InputDecoration(labelText: 'Título da TV cliente')),
          TextField(controller: tiles, decoration: const InputDecoration(labelText: 'Códigos por página')),
          TextField(controller: carousel, decoration: const InputDecoration(labelText: 'Segundos do carrossel')),
          TextField(controller: overdue, decoration: const InputDecoration(labelText: 'Horas para marcar atraso')),
          const SizedBox(height: 12),
          FilledButton(onPressed: save, child: const Text('Salvar')),
        ],
      ),
    );
  }
}
