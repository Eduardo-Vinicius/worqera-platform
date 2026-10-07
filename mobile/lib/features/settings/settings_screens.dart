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
      subtitle: 'Marca da operação — logo, tipo e link público',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          if (info != null) Text(info!, style: const TextStyle(color: Wq.success)),
          const _SectionLabel('Identidade'),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome da empresa')),
              TextField(controller: display, decoration: const InputDecoration(labelText: 'Nome de exibição', helperText: 'Consulta pública, e-mails e TVs')),
              TextField(controller: slug, decoration: const InputDecoration(labelText: 'Slug interno', helperText: 'Não aparece no link do cliente.')),
              TextField(controller: emailFrom, decoration: const InputDecoration(labelText: 'Remetente dos e-mails', helperText: 'Sua Empresa via Worqera')),
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
              Text('Define como o pedido chama o item. Os setores continuam livres.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              TextField(controller: singular, decoration: const InputDecoration(labelText: 'Nome do item (singular)'), onChanged: (_) => setState(() => vertical = 'custom')),
              TextField(controller: plural, decoration: const InputDecoration(labelText: 'Nome do item (plural)'), onChanged: (_) => setState(() => vertical = 'custom')),
              const SizedBox(height: 8),
              const Text('Kit inicial', style: TextStyle(fontWeight: FontWeight.w800)),
              Text('Aplica setores e serviços sugeridos. Os setores atuais são desativados.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final kit in const [('general', 'Geral'), ('footwear', 'Calçados'), ('laundry', 'Lavanderia'), ('repair', 'Assistência')])
                  OutlinedButton(onPressed: () => applyKit(kit.$1, kit.$2), child: Text(kit.$2)),
              ]),
              const SizedBox(height: 8),
              Text('Link do cliente: /p/o/ e um código por pedido.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
              TextField(controller: address, decoration: const InputDecoration(labelText: 'Endereço')),
            ]),
          ),
          const SizedBox(height: 12),
          const _SectionLabel('Marca visual'),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 96,
                  height: 96,
                  alignment: Alignment.center,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Wq.line),
                    boxShadow: [BoxShadow(color: preview.withValues(alpha: 0.35), blurRadius: 0, spreadRadius: 3)],
                  ),
                  child: logoUrl.isEmpty
                      ? Text((display.text.isEmpty ? 'W' : display.text).substring(0, 1).toUpperCase(), style: TextStyle(color: preview, fontSize: 32, fontWeight: FontWeight.w800))
                      : Image.network(fileUrl(logoUrl), width: 96, height: 96, fit: BoxFit.cover, errorBuilder: (_, _, _) => Text('W', style: TextStyle(color: preview, fontSize: 32, fontWeight: FontWeight.w800))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(display.text.isEmpty ? 'Sua oficina' : display.text, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text('Prévia da consulta pública.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                    const SizedBox(height: 8),
                    Container(
                      height: 28,
                      decoration: BoxDecoration(color: preview, borderRadius: BorderRadius.circular(8)),
                    ),
                  ]),
                ),
              ]),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final preset in const [
                  ('Worqera', '#7D26DE', '#0D9488'),
                  ('Azul', '#2563EB', '#0EA5E9'),
                  ('Verde', '#15803D', '#0D9488'),
                  ('Laranja', '#C2410C', '#EA580C'),
                  ('Ink', '#0F172A', '#334155'),
                  ('Rosa', '#BE185D', '#DB2777'),
                ])
                  ActionChip(
                    label: Text(preset.$1),
                    onPressed: () => setState(() {
                      primary.text = preset.$2;
                      accent.text = preset.$3;
                    }),
                  ),
              ]),
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
            ]),
          ),
          const SizedBox(height: 12),
          const _SectionLabel('Avisos'),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
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
          const SizedBox(height: 16),
          FilledButton(onPressed: save, child: const Text('Salvar empresa')),
        ],
      ),
    );
  }

  Future<void> applyKit(String kit, String label) async {
    final go = await showWqSheet<bool>(
      context,
      title: 'Kit $label',
      hint: 'Os setores atuais são desativados. Serviços que faltam entram.',
      child: (sheet) => FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Aplicar kit')),
    );
    if (go != true) return;
    try {
      final res = await widget.api.dio.post('/shops/current/apply-starter-kit', data: {'kit': kit});
      final body = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      if (!mounted) return;
      wqToast(context, 'Kit $label: ${body['sectorsCreated'] ?? 0} setores · +${body['servicesAdded'] ?? 0} serviços');
      final shop = await widget.api.dio.get('/shops/current');
      final doc = shop.data is Map ? Map<String, dynamic>.from(shop.data as Map) : <String, dynamic>{};
      final inner = doc['shop'] is Map ? Map<String, dynamic>.from(doc['shop'] as Map) : doc;
      final branding = inner['branding'] is Map ? Map<String, dynamic>.from(inner['branding'] as Map) : {};
      setState(() {
        vertical = '${inner['vertical'] ?? kit}';
        singular.text = '${branding['itemLabel'] ?? singular.text}';
        plural.text = '${branding['itemLabelPlural'] ?? plural.text}';
      });
    } catch (e) {
      if (!mounted) return;
      wqToast(context, widget.api.message(e));
    }
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 8),
      child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: Wq.muted)),
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
  List<Map<String, dynamic>> rows = [];
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get(widget.path, queryParameters: widget.sector ? {'includeInactive': 'true'} : null);
      setState(() {
        rows = asMaps(res.data);
        error = null;
      });
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> openEditor({Map<String, dynamic>? row}) async {
    final initialName = '${row?['name'] ?? ''}';
    final initialExtra = widget.price
        ? '${row?['defaultPrice'] ?? row?['price'] ?? ''}'
        : widget.sector
            ? '${row?['color'] ?? '#7D26DE'}'
            : '${row?['phone'] ?? ''}';
    final saved = await showWqSheet<Map<String, dynamic>>(
      context,
      title: row == null ? 'Novo' : 'Editar',
      hint: widget.title,
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController(text: initialName), TextEditingController(text: initialExtra)],
        builder: (_, fields) {
          final terminal = <bool>[row?['isTerminal'] == true];
          final active = <bool>[row?['active'] != false];
          final onPublic = <bool>[row?['showOnPublic'] != false];
          final mail = <bool>[row?['notifyEmailOnEnter'] == true];
          return StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
                if (widget.price) TextField(controller: fields[1], keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Preço (R\$)')),
                if (widget.sector) TextField(controller: fields[1], decoration: const InputDecoration(labelText: 'Cor (#RRGGBB)')),
                if (widget.path.endsWith('employees')) TextField(controller: fields[1], decoration: const InputDecoration(labelText: 'Telefone')),
                if (widget.sector) ...[
                  SwitchListTile(contentPadding: EdgeInsets.zero, value: terminal[0], onChanged: (value) => setLocal(() => terminal[0] = value), title: const Text('Coluna final')),
                  SwitchListTile(contentPadding: EdgeInsets.zero, value: onPublic[0], onChanged: (value) => setLocal(() => onPublic[0] = value), title: const Text('Aparece no QR do cliente')),
                  SwitchListTile(contentPadding: EdgeInsets.zero, value: mail[0], onChanged: (value) => setLocal(() => mail[0] = value), title: const Text('E-mail ao entrar')),
                ],
                SwitchListTile(contentPadding: EdgeInsets.zero, value: active[0], onChanged: (value) => setLocal(() => active[0] = value), title: const Text('Ativo no cadastro')),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => Navigator.pop(sheet, {
                    'name': fields[0].text.trim(),
                    'extra': fields[1].text.trim(),
                    'terminal': terminal[0],
                    'active': active[0],
                    'public': onPublic[0],
                    'mail': mail[0],
                  }),
                  child: const Text('Salvar'),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (saved == null) return;
    final label = '${saved['name'] ?? ''}'.trim();
    final extra = '${saved['extra'] ?? ''}'.trim();
    if (label.isEmpty) return;
    try {
    final body = <String, dynamic>{'name': label};
    if (widget.price) {
      final amount = double.tryParse(extra.replaceAll(',', '.')) ?? 0;
      body['price'] = amount;
      body['defaultPrice'] = amount;
    }
    body['active'] = saved['active'] == true;
    if (widget.sector) {
      body['color'] = extra.isEmpty ? '#7D26DE' : extra;
      body['isTerminal'] = saved['terminal'] == true;
      body['showOnPublic'] = saved['public'] == true;
      body['notifyEmailOnEnter'] = saved['mail'] == true;
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

  Future<void> moveSector(int index, int delta) async {
    final next = index + delta;
    if (next < 0 || next >= rows.length) return;
    final items = [
      for (var i = 0; i < rows.length; i++)
        {
          'id': '${rows[i]['id'] ?? rows[i]['_id']}',
          'order': i == index ? next + 1 : i == next ? index + 1 : i + 1,
        },
    ];
    await widget.api.dio.post('${widget.path}/reorder', data: items);
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
          FilledButton(onPressed: () => openEditor(), child: const Text('Adicionar')),
          const SizedBox(height: 12),
          for (var index = 0; index < rows.length; index++) ...[
            WqCard(
              child: Row(children: [
                if (widget.sector)
                  Container(width: 10, height: 10, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: _hex(rows[index]['color']), shape: BoxShape.circle)),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${rows[index]['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (widget.price) Text(brl(rows[index]['defaultPrice'] ?? rows[index]['price']), style: const TextStyle(color: Wq.muted)),
                    if (rows[index]['phone'] != null) Text('${rows[index]['phone']}', style: const TextStyle(color: Wq.muted)),
                    if (rows[index]['isTerminal'] == true) const Text('Final', style: TextStyle(color: Wq.success, fontSize: 12)),
                    if (rows[index]['showOnPublic'] == false) const Text('Sem QR', style: TextStyle(color: Wq.muted, fontSize: 12)),
                    if (rows[index]['active'] == false) const Text('Oculta', style: TextStyle(color: Wq.muted, fontSize: 12)),
                  ]),
                ),
                if (widget.sector) ...[
                  IconButton(onPressed: index == 0 ? null : () => moveSector(index, -1), icon: const Icon(Icons.arrow_upward, size: 18)),
                  IconButton(onPressed: index == rows.length - 1 ? null : () => moveSector(index, 1), icon: const Icon(Icons.arrow_downward, size: 18)),
                ],
                IconButton(onPressed: () => openEditor(row: rows[index]), icon: const Icon(Icons.edit_outlined)),
                IconButton(onPressed: () => remove(rows[index]), icon: const Icon(Icons.delete_outline, color: Wq.danger)),
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
  List<Map<String, dynamic>> sectors = [];
  String? info;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final results = await Future.wait([widget.api.dio.get('/shops/current/members'), widget.api.dio.get('/sectors')]);
    setState(() {
      rows = asMaps(results[0].data);
      sectors = asMaps(results[1].data).where((row) => row['active'] != false).toList();
    });
  }

  Future<void> add() async {
    final payload = await showWqSheet<Map<String, dynamic>>(
      context,
      title: 'Nova pessoa',
      hint: 'Login da empresa',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController(), TextEditingController(), TextEditingController()],
        builder: (_, fields) {
          final role = <String>['atendimento'];
          final picked = <String>[];
          return StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome')),
                TextField(controller: fields[1], keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail')),
                TextField(controller: fields[2], obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
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
                if (role[0] == 'sector') ...[
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final item in sectors)
                      FilterChip(
                        label: Text('${item['name']}'),
                        selected: picked.contains('${item['id'] ?? item['_id']}'),
                        onSelected: (on) => setLocal(() {
                          final id = '${item['id'] ?? item['_id']}';
                          if (on) {
                            picked.add(id);
                          } else {
                            picked.remove(id);
                          }
                        }),
                      ),
                  ]),
                ],
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => Navigator.pop(sheet, {
                    'name': fields[0].text.trim(),
                    'email': fields[1].text.trim(),
                    'password': fields[2].text,
                    'role': role[0],
                    'sectorIds': List<String>.from(picked),
                  }),
                  child: const Text('Adicionar'),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (payload == null || payload['email']!.isEmpty || !mounted) return;
    await widget.api.dio.post('/shops/current/members', data: payload);
    setState(() => info = 'Pessoa adicionada.');
    await load();
  }

  Future<void> invite() async {
    final payload = await showWqSheet<Map<String, dynamic>>(
      context,
      title: 'Convite',
      hint: 'Setor vê só a fila. Atendimento cuida dos pedidos. Admin configura a empresa.',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController()],
        builder: (_, fields) {
          final role = <String>['atendimento'];
          final picked = <String>[];
          return StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: fields[0], keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail'), autofocus: true),
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
                if (role[0] == 'sector') ...[
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final item in sectors)
                      FilterChip(
                        label: Text('${item['name']}'),
                        selected: picked.contains('${item['id'] ?? item['_id']}'),
                        onSelected: (on) => setLocal(() {
                          final id = '${item['id'] ?? item['_id']}';
                          if (on) {
                            picked.add(id);
                          } else {
                            picked.remove(id);
                          }
                        }),
                      ),
                  ]),
                ],
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => Navigator.pop(sheet, {
                    'email': fields[0].text.trim(),
                    'role': role[0],
                    'sectorIds': List<String>.from(picked),
                  }),
                  child: const Text('Enviar convite'),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (payload == null || '${payload['email']}'.isEmpty || !mounted) return;
    if (payload['role'] == 'sector' && (payload['sectorIds'] as List).isEmpty) {
      wqToast(context, 'Escolha ao menos um setor.');
      return;
    }
    try {
      await widget.api.dio.post('/shops/current/invites', data: payload);
      setState(() => info = 'Convite enviado.');
    } catch (e) {
      if (!mounted) return;
      wqToast(context, widget.api.message(e));
    }
  }

  Future<void> editMember(Map row) async {
    final current = '${row['role'] ?? 'atendimento'}';
    final saved = await showWqSheet<Map<String, dynamic>>(
      context,
      title: 'Papel',
      child: (sheet) {
        final role = <String>[current == 'owner' ? 'admin' : current];
        final picked = <String>[
          if (row['sectorIds'] is List) ...row['sectorIds'].map((id) => '$id'),
        ];
        return StatefulBuilder(
          builder: (ctx, setLocal) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
              if (role[0] == 'sector') ...[
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final item in sectors)
                    FilterChip(
                      label: Text('${item['name']}'),
                      selected: picked.contains('${item['id'] ?? item['_id']}'),
                      onSelected: (on) => setLocal(() {
                        final id = '${item['id'] ?? item['_id']}';
                        if (on) {
                          picked.add(id);
                        } else {
                          picked.remove(id);
                        }
                      }),
                    ),
                ]),
              ],
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () => Navigator.pop(sheet, {'role': role[0], 'sectorIds': List<String>.from(picked)}),
                child: const Text('Salvar'),
              ),
            ],
          ),
        );
      },
    );
    if (saved == null || !mounted) return;
    if (saved['role'] == 'sector' && (saved['sectorIds'] as List).isEmpty) {
      wqToast(context, 'Escolha ao menos um setor.');
      return;
    }
    await widget.api.dio.patch('/shops/current/members/${row['id'] ?? row['_id']}', data: {
      'role': saved['role'],
      'sectorIds': saved['role'] == 'sector' ? saved['sectorIds'] : <String>[],
    });
    await load();
  }

  Future<void> setActive(Map row, bool active) async {
    await widget.api.dio.patch('/shops/current/members/${row['id'] ?? row['_id']}', data: {'active': active});
    await load();
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'owner':
        return 'Dono';
      case 'admin':
        return 'Admin';
      case 'atendimento':
        return 'Atendimento';
      case 'sector':
        return 'Setor';
      default:
        return role;
    }
  }

  String _sectorNames(Map row) {
    final ids = row['sectorIds'];
    if (ids is! List || ids.isEmpty) return '';
    return ids.map((id) {
      final key = '$id';
      final match = sectors.where((item) => '${item['id'] ?? item['_id']}' == key);
      if (match.isEmpty) return '';
      return '${match.first['name'] ?? ''}';
    }).where((name) => name.isNotEmpty).join(', ');
  }

  Future<void> resetPassword(Map row) async {
    final next = await showWqSheet<String>(
      context,
      title: 'Nova senha',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController()],
        builder: (_, fields) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: fields[0], obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(sheet, fields[0].text), child: const Text('Salvar')),
          ],
        ),
      ),
    );
    if (next == null || next.isEmpty || !mounted) return;
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
          const SizedBox(height: 8),
          OutlinedButton(onPressed: invite, child: const Text('Convidar por e-mail')),
          const SizedBox(height: 12),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text('${row['name'] ?? row['user']?['name'] ?? row['email'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(99), border: Border.all(color: Wq.line)),
                      child: Text(_roleLabel('${row['role'] ?? ''}'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  Text('${row['email'] ?? row['user']?['email'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                  if (_sectorNames(row).isNotEmpty) Text('Setores: ${_sectorNames(row)}', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                  Text(row['active'] == false ? 'Inativo' : 'Ativo', style: const TextStyle(color: Wq.muted, fontSize: 12)),
                  if ('${row['role']}' != 'owner')
                    Wrap(spacing: 4, children: [
                      TextButton(onPressed: () => editMember(row), child: const Text('Editar')),
                      TextButton(onPressed: () => resetPassword(row), child: const Text('Senha')),
                      TextButton(onPressed: () => setActive(row, row['active'] == false), child: Text(row['active'] == false ? 'Reativar' : 'Desativar')),
                    ]),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key, required this.api});
  final WorqeraApi api;
  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  List<Map<String, dynamic>> rows = [];
  List<Map<String, dynamic>> sectors = [];
  String filterSector = 'all';
  String filterActive = 'todos';
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final results = await Future.wait([widget.api.dio.get('/employees'), widget.api.dio.get('/sectors')]);
      setState(() {
        rows = asMaps(results[0].data);
        sectors = asMaps(results[1].data).where((row) => row['active'] != false).toList();
        error = null;
      });
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  String sectorName(dynamic id) {
    final key = '$id';
    final match = sectors.where((row) => '${row['id'] ?? row['_id']}' == key);
    if (match.isEmpty) return '';
    return '${match.first['name'] ?? ''}';
  }

  Future<void> edit({Map<String, dynamic>? row}) async {
    final saved = await showWqSheet<Map<String, dynamic>>(
      context,
      title: row == null ? 'Novo funcionário' : 'Editar funcionário',
      hint: 'Quem executa, sem login',
      child: (sheet) => WqSheetFields(
        create: () => [
          TextEditingController(text: '${row?['name'] ?? ''}'),
          TextEditingController(text: '${row?['phone'] ?? ''}'),
          TextEditingController(text: '${row?['email'] ?? ''}'),
        ],
        builder: (_, fields) {
          final sector = <String>['${row?['sectorId'] ?? ''}'];
          final active = <bool>[row?['active'] != false];
          return StatefulBuilder(
            builder: (ctx, setLocal) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
                TextField(controller: fields[1], decoration: const InputDecoration(labelText: 'Telefone')),
                TextField(controller: fields[2], decoration: const InputDecoration(labelText: 'E-mail')),
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final item in sectors)
                    FilterChip(
                      label: Text('${item['name']}'),
                      selected: sector[0] == '${item['id'] ?? item['_id']}',
                      onSelected: (_) => setLocal(() => sector[0] = '${item['id'] ?? item['_id']}'),
                    ),
                ]),
                SwitchListTile(contentPadding: EdgeInsets.zero, value: active[0], onChanged: (value) => setLocal(() => active[0] = value), title: const Text('Ativo')),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () => Navigator.pop(sheet, {
                    'name': fields[0].text.trim(),
                    'phone': fields[1].text.trim(),
                    'email': fields[2].text.trim(),
                    'sectorId': sector[0],
                    'active': active[0],
                  }),
                  child: const Text('Salvar'),
                ),
              ],
            ),
          );
        },
      ),
    );
    if (saved == null || '${saved['name']}'.trim().isEmpty) return;
    final body = {
      'name': saved['name'],
      'phone': saved['phone'],
      'email': saved['email'],
      'sectorId': '${saved['sectorId']}'.isEmpty ? null : saved['sectorId'],
      'active': saved['active'] == true,
    };
    if (row == null) {
      await widget.api.dio.post('/employees', data: body);
    } else {
      await widget.api.dio.patch('/employees/${row['id'] ?? row['_id']}', data: body);
    }
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Funcionários',
      subtitle: 'Quem executa, sem login',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
          FilledButton(onPressed: () => edit(), child: const Text('Adicionar')),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            ChoiceChip(label: const Text('Todos'), selected: filterActive == 'todos', onSelected: (_) => setState(() => filterActive = 'todos')),
            ChoiceChip(label: const Text('Ativos'), selected: filterActive == 'ativos', onSelected: (_) => setState(() => filterActive = 'ativos')),
            ChoiceChip(label: const Text('Inativos'), selected: filterActive == 'inativos', onSelected: (_) => setState(() => filterActive = 'inativos')),
            ChoiceChip(label: const Text('Qualquer setor'), selected: filterSector == 'all', onSelected: (_) => setState(() => filterSector = 'all')),
            for (final item in sectors)
              ChoiceChip(
                label: Text('${item['name']}'),
                selected: filterSector == '${item['id'] ?? item['_id']}',
                onSelected: (_) => setState(() => filterSector = '${item['id'] ?? item['_id']}'),
              ),
          ]),
          const SizedBox(height: 12),
          for (final row in rows.where((row) {
            final sectorOk = filterSector == 'all' || '${row['sectorId']}' == filterSector;
            final activeOk = filterActive == 'todos' || (filterActive == 'ativos' ? row['active'] != false : row['active'] == false);
            return sectorOk && activeOk;
          })) ...[
            WqCard(
              child: Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${row['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(
                      [sectorName(row['sectorId']), '${row['phone'] ?? ''}', '${row['email'] ?? ''}'].where((part) => part.isNotEmpty && part != 'null').join(' · '),
                      style: const TextStyle(color: Wq.muted),
                    ),
                    if (row['active'] == false) const Text('Inativo', style: TextStyle(color: Wq.muted, fontSize: 12)),
                  ]),
                ),
                IconButton(onPressed: () => edit(row: row), icon: const Icon(Icons.edit_outlined)),
                IconButton(
                  onPressed: () async {
                    await widget.api.dio.delete('/employees/${row['id'] ?? row['_id']}');
                    await load();
                  },
                  icon: const Icon(Icons.delete_outline, color: Wq.danger),
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
            _tile(context, 'TV Cliente', 'Códigos na fila', () => ShellScope.maybeOf(context)?.openPage('tv-cliente', TvClientScreen(api: client), stack: true)),
            const SizedBox(height: 8),
            _tile(context, 'TV Oficina', 'Contagem por setor', () => ShellScope.maybeOf(context)?.openPage('tv-oficina', TvFloorScreen(api: client), stack: true)),
            const SizedBox(height: 8),
            _tile(context, 'TV Financeiro', 'Recebido, previsto e pendente', () => ShellScope.maybeOf(context)?.openPage('tv-fin', TvFinanceBoard(api: client), stack: true)),
            const SizedBox(height: 8),
            _tile(context, 'Ajustes das TVs', 'Título, páginas e atraso', () => ShellScope.maybeOf(context)?.openPage('tv-ajustes', TvSettingsScreen(api: client), stack: true)),
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
