import 'dart:async';

import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';
import '../crm/crm_views.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';
import '../quotes/quotes_screen.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key, required this.api, this.openClient, this.session, this.initialTab});
  final WorqeraApi api;
  final String? initialTab;
  final SessionStore? session;
  final void Function(String id)? openClient;

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final q = TextEditingController();
  List<Map<String, dynamic>> all = [];
  List<Map<String, dynamic>>? found;
  String foundTerm = '';
  String? error;
  bool loading = true;
  bool searching = false;
  Timer? searchTimer;
  /// base | birthdays | inactive | recurring | new | all
  String tab = 'base';

  static const _tabs = <(String, String)>[
    ('base', 'Base'),
    ('birthdays', 'Aniversariantes'),
    ('inactive', 'Sumidos'),
    ('recurring', 'Recorrentes'),
    ('new', 'Novos'),
    ('all', 'Todos'),
  ];

  @override
  void initState() {
    super.initState();
    final start = widget.initialTab;
    if (start != null && _tabs.any((t) => t.$1 == start)) tab = start;
    load();
  }

  void openClient(String id) {
    final scope = ShellScope.maybeOf(context);
    if (scope != null) {
      scope.openPage('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true);
      return;
    }
    widget.openClient?.call(id);
  }

  void setTab(String next) => setState(() => tab = next == 'vip' ? 'recurring' : next);

  Widget _tabBar(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: _tabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (_, i) {
          final t = _tabs[i];
          return ChoiceChip(
            label: Text(t.$2, style: TextStyle(fontWeight: FontWeight.w700, color: tab == t.$1 ? Colors.white : context.wqInk)),
            selected: tab == t.$1,
            selectedColor: Wq.brand,
            showCheckmark: false,
            onSelected: (_) => setTab(t.$1),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    searchTimer?.cancel();
    q.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/clients', queryParameters: {'limit': 200});
      if (!mounted) return;
      setState(() {
        all = asMaps(res.data);
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

  void onQuery(String raw) {
    searchTimer?.cancel();
    final term = raw.trim();
    if (term.length < 2) {
      setState(() {
        found = null;
        foundTerm = '';
        searching = false;
      });
      return;
    }
    setState(() => searching = true);
    searchTimer = Timer(const Duration(milliseconds: 280), () async {
      try {
        final res = await widget.api.dio.get('/clients', queryParameters: {'q': term, 'limit': 40});
        if (!mounted || q.text.trim() != term) return;
        setState(() {
          foundTerm = term.toLowerCase();
          found = asMaps(res.data);
          searching = false;
          error = null;
        });
      } catch (e) {
        if (!mounted || q.text.trim() != term) return;
        setState(() {
          searching = false;
          error = widget.api.message(e);
        });
      }
    });
  }

  List<Map<String, dynamic>> get visible {
    final term = q.text.trim().toLowerCase();
    if (found != null && foundTerm == term) return found!;
    if (term.isEmpty) return all;
    return all.where((row) => clientMatches(row, term)).toList();
  }

  Future<void> create() async {
    final payload = await showWqSheet<Map<String, String>>(
      context,
      title: 'Novo cliente',
      child: (sheet) => WqSheetFields(
        create: () => List.generate(8, (_) => TextEditingController()),
        builder: (_, fields) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
            TextField(
              controller: fields[1],
              decoration: const InputDecoration(labelText: 'Telefone'),
              onChanged: (value) {
                final next = maskPhone(value);
                if (next != value) fields[1].value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: next.length));
              },
            ),
            TextField(
              controller: fields[2],
              decoration: const InputDecoration(labelText: 'CEP'),
              onSubmitted: (_) async {
                final digits = fields[2].text.replaceAll(RegExp(r'\D'), '');
                if (digits.length != 8) return;
                try {
                  final res = await widget.api.dio.get('https://viacep.com.br/ws/$digits/json/');
                  final body = Map<String, dynamic>.from(res.data as Map);
                  if (body['erro'] == true) return;
                  fields[3].text = '${body['logradouro'] ?? ''}, ${body['bairro'] ?? ''} · ${body['localidade'] ?? ''}';
                } catch (e) {
                  if (!sheet.mounted) return;
                  wqToast(sheet, widget.api.message(e));
                }
              },
            ),
            TextField(controller: fields[3], decoration: const InputDecoration(labelText: 'Endereço')),
            TextField(controller: fields[4], decoration: const InputDecoration(labelText: 'E-mail')),
            TextField(controller: fields[5], decoration: const InputDecoration(labelText: 'CPF')),
            TextField(
              controller: fields[7],
              keyboardType: TextInputType.datetime,
              decoration: const InputDecoration(labelText: 'Aniversário (opcional)', hintText: 'DD/MM ou DD/MM/AAAA'),
            ),
            TextField(controller: fields[6], decoration: const InputDecoration(labelText: 'Observações')),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => Navigator.pop(sheet, {
                'name': fields[0].text.trim(),
                'phone': fields[1].text.trim(),
                'zip': fields[2].text.trim(),
                'address': fields[3].text.trim(),
                'email': fields[4].text.trim(),
                'cpf': fields[5].text.trim(),
                'notes': fields[6].text.trim(),
                if (fields[7].text.trim().isNotEmpty) 'birthday': fields[7].text.trim(),
              }),
              child: const Text('Cadastrar'),
            ),
          ],
        ),
      ),
    );
    if (payload == null || payload['name']!.isEmpty || !mounted) return;
    try {
      await widget.api.dio.post('/clients', data: payload);
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
      return;
    }
    q.clear();
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Clientes',
      subtitle: 'Base, aniversariantes, sumidos e recorrentes',
      child: Column(children: [
        _tabBar(context),
        const SizedBox(height: 8),
        if (tab == 'base') Expanded(child: CrmHomeView(api: widget.api, onSegment: setTab)),
        if (tab != 'base' && tab != 'all') Expanded(child: CrmSegmentView(api: widget.api, segment: tab, onOpen: openClient)),
        if (tab == 'all') ...[
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(
            controller: q,
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Buscar por nome, telefone, CPF ou e-mail'),
            onChanged: onQuery,
          ),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : Builder(builder: (context) {
                  final rows = visible;
                  // Builder list: only the rows on screen are built (smooth with hundreds of clients).
                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                    itemCount: rows.length + 1,
                    itemBuilder: (context, i) {
                      if (i == 0) {
                        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
                          if (searching) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('Buscando na lista inteira…', style: TextStyle(color: context.wqMuted, fontSize: 12))),
                          FilledButton(onPressed: create, child: const Text('Novo cliente')),
                          const SizedBox(height: 12),
                          Text('${rows.length} ${rows.length == 1 ? 'cliente' : 'clientes'}', style: TextStyle(color: context.wqMuted, fontSize: 13)),
                          const SizedBox(height: 8),
                          if (rows.isEmpty)
                            Text(all.isEmpty ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.', style: const TextStyle(color: Wq.muted)),
                        ]);
                      }
                      final row = rows[i - 1];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: WqCard(
                          onTap: () => openClient('${row['id'] ?? row['_id']}'),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${row['name'] ?? row['nomeCompleto'] ?? 'Cliente'}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(
                              [
                                '${row['phone'] ?? row['telefone'] ?? row['email'] ?? ''}',
                                maskCpf('${row['cpf'] ?? ''}'),
                                if (row['birthday'] is Map) 'aniv. ${birthdayLabel(row['birthday'])}',
                              ].where((part) => part.isNotEmpty).join(' · '),
                              style: const TextStyle(color: Wq.muted),
                            ),
                          ]),
                        ),
                      );
                    },
                  );
                }),
        ),
        ],
      ]),
    );
  }
}

class ClientDetailScreen extends StatefulWidget {
  const ClientDetailScreen({super.key, required this.api, required this.clientId, this.session});
  final WorqeraApi api;
  final String clientId;
  final SessionStore? session;

  @override
  State<ClientDetailScreen> createState() => _ClientDetailScreenState();
}

class _ClientDetailScreenState extends State<ClientDetailScreen> {
  Map? client;
  String? error;

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/clients/${widget.clientId}').then((res) {
      if (mounted) setState(() => client = Map<String, dynamic>.from(res.data as Map));
    }).catchError((e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  @override
  Widget build(BuildContext context) {
    final orders = asMaps({'data': client?['orders'] ?? client?['recentOrders']});
    return WqPage(
      title: '${client?['name'] ?? client?['nomeCompleto'] ?? 'Cliente'}',
      subtitle: '${client?['phone'] ?? client?['telefone'] ?? ''}',
      child: client == null
          ? Center(child: error == null ? const CircularProgressIndicator() : Text(error!))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                WqCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${client!['email'] ?? 'Sem e-mail'}'),
                    Text(maskPhone('${client!['phone'] ?? client!['telefone'] ?? ''}')),
                    if (maskCpf('${client!['cpf'] ?? ''}').isNotEmpty) Text(maskCpf('${client!['cpf'] ?? ''}')),
                    if (_address(client!).isNotEmpty) Text(_address(client!)),
                    if (client!['birthday'] is Map) Text('Aniversário: ${birthdayLabel(client!['birthday'])}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    if ((client!['tags'] as List?)?.isNotEmpty == true)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Wrap(spacing: 6, runSpacing: 4, children: [
                          for (final t in (client!['tags'] as List)) Chip(label: Text('$t'), visualDensity: VisualDensity.compact),
                        ]),
                      ),
                    if ('${client!['notes'] ?? ''}'.isNotEmpty) Text('${client!['notes']}', style: const TextStyle(color: Wq.muted)),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        final initialName = '${client!['name'] ?? client!['nomeCompleto'] ?? ''}';
                        final initialPhone = maskPhone('${client!['phone'] ?? client!['telefone'] ?? ''}');
                        final initialEmail = '${client!['email'] ?? ''}';
                        final initialCpf = '${client!['cpf'] ?? ''}';
                        final b = client!['birthday'];
                        final initialBirthday = b is Map ? '${birthdayLabel(b)}${b['year'] != null ? '/${b['year']}' : ''}' : '';
                        final initialTags = ((client!['tags'] as List?) ?? const []).join(', ');
                        final payload = await showWqSheet<Map<String, String>>(
                          context,
                          title: 'Editar cliente',
                          child: (sheet) => WqSheetFields(
                            create: () => [
                              TextEditingController(text: initialName),
                              TextEditingController(text: initialPhone),
                              TextEditingController(text: initialEmail),
                              TextEditingController(text: initialCpf),
                              TextEditingController(text: initialBirthday),
                              TextEditingController(text: initialTags),
                            ],
                            builder: (_, fields) => Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome')),
                                TextField(controller: fields[1], decoration: const InputDecoration(labelText: 'Telefone')),
                                TextField(controller: fields[2], decoration: const InputDecoration(labelText: 'E-mail')),
                                TextField(controller: fields[3], decoration: const InputDecoration(labelText: 'CPF')),
                                TextField(
                                  controller: fields[4],
                                  keyboardType: TextInputType.datetime,
                                  decoration: const InputDecoration(labelText: 'Aniversário', hintText: 'DD/MM ou DD/MM/AAAA'),
                                ),
                                TextField(controller: fields[5], decoration: const InputDecoration(labelText: 'Etiquetas', hintText: 'VIP, empresa… (separe por vírgula)')),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: () => Navigator.pop(sheet, {
                                    'name': fields[0].text.trim(),
                                    'phone': fields[1].text.trim(),
                                    'email': fields[2].text.trim(),
                                    'cpf': fields[3].text.trim(),
                                    'birthday': fields[4].text.trim(),
                                    'tags': fields[5].text.trim(),
                                  }),
                                  child: const Text('Salvar'),
                                ),
                              ],
                            ),
                          ),
                        );
                        if (payload == null || !context.mounted) return;
                        try {
                          await widget.api.dio.patch('/clients/${widget.clientId}', data: payload);
                        } catch (e) {
                          if (context.mounted) wqToast(context, widget.api.message(e));
                          return;
                        }
                        final res = await widget.api.dio.get('/clients/${widget.clientId}');
                        if (!context.mounted) return;
                        setState(() => client = Map<String, dynamic>.from(res.data as Map));
                        wqToast(context, 'Cliente atualizado');
                      },
                      child: const Text('Editar'),
                    ),
                  ]),
                ),
                if (client!['stats'] is Map) ...[
                  const SizedBox(height: 10),
                  _stats(context, Map<String, dynamic>.from(client!['stats'] as Map)),
                ],
                if (widget.session?.isSector != true) ClientInsightCard(api: widget.api, clientId: widget.clientId),
                if (widget.session != null)
                  ClientQuotesSection(api: widget.api, session: widget.session!, clientId: widget.clientId),
                const SizedBox(height: 12),
                const WqSectionTitle('Pedidos'),
                for (final order in orders)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('#${order['code'] ?? ''}${'${order['what'] ?? ''}'.isEmpty ? '' : ' · ${order['what']}'}', maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: order['createdAt'] == null
                        ? null
                        : Text([
                            dayLabel('${order['createdAt']}'),
                            if (order['total'] != null) brl0(order['total']),
                          ].join(' · ')),
                    trailing: order['status'] == 'refused' ? const Text('Não fechou', style: TextStyle(color: Wq.muted, fontSize: 12)) : StatusChip(order['status']),
                    onTap: widget.session == null
                        ? null
                        : () {
                            final id = '${order['id'] ?? order['_id']}';
                            final session = widget.session!;
                            ShellScope.maybeOf(context)?.openPage(
                              'order',
                              OrderDetailScreen(
                                api: widget.api,
                                session: session,
                                orderId: id,
                                onEdit: () => ShellScope.maybeOf(context)?.openPage('order-edit', OrderFormScreen(api: widget.api, session: session, orderId: id), stack: true),
                              ),
                              stack: true,
                            );
                          },
                  ),
                if (orders.isEmpty) const Text('Sem pedidos ligados a esta ficha.', style: TextStyle(color: Wq.muted)),
              ],
            ),
    );
  }

  Widget _stats(BuildContext context, Map<String, dynamic> s) {
    final cells = <(String, String)>[
      ('Pedidos', '${s['orders'] ?? 0}'),
      if (s['spent'] != null) ('Gasto total', brl0(s['spent'])),
      ('Volta a cada', s['avgGapDays'] != null ? '${s['avgGapDays']} dias' : '—'),
      ('Último', sinceLabel(s['daysSince']).replaceFirst('Último pedido ', '')),
    ];
    return LayoutBuilder(builder: (context, box) {
      final w = (box.maxWidth - 8) / 2;
      return Wrap(spacing: 8, runSpacing: 8, children: [
        for (final c in cells)
          SizedBox(
            width: w,
            child: WqCard(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.$1.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 0.8, fontWeight: FontWeight.w800, color: context.wqMuted)),
                const SizedBox(height: 2),
                FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(c.$2, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
              ]),
            ),
          ),
      ]);
    });
  }

  String _address(Map client) {
    final address = client['address'] is Map ? client['address'] as Map : client;
    return [
      address['logradouro'] ?? client['logradouro'],
      address['numero'] ?? client['numero'],
      address['bairro'] ?? client['bairro'],
      address['cidade'] ?? client['cidade'],
      address['estado'] ?? client['estado'],
      address['cep'] ?? client['cep'],
    ].map((part) => '$part').where((part) => part.isNotEmpty && part != 'null').join(', ');
  }
}

class ConsultasScreen extends StatefulWidget {
  const ConsultasScreen({super.key, required this.api, required this.openOrder, this.openClient, this.session});
  final WorqeraApi api;
  final SessionStore? session;
  final void Function(String id) openOrder;
  final void Function(String id)? openClient;

  @override
  State<ConsultasScreen> createState() => _ConsultasScreenState();
}

class _ConsultasScreenState extends State<ConsultasScreen> {
  bool hub = true;
  String mode = 'clientes';
  final q = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  String? error;
  bool loading = false;
  bool hasSearched = false;
  Timer? searchTimer;

  @override
  void dispose() {
    searchTimer?.cancel();
    q.dispose();
    super.dispose();
  }

  void onQuery(String raw) {
    searchTimer?.cancel();
    if (mode != 'clientes') return;
    final term = raw.trim();
    if (term.length < 2) return;
    searchTimer = Timer(const Duration(milliseconds: 320), () {
      if (q.text.trim() == term) find();
    });
  }

  Future<void> find() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (mode == 'clientes') {
        final term = q.text.trim();
        final res = await widget.api.dio.get('/clients', queryParameters: {
          if (term.isNotEmpty) 'q': term,
          'limit': term.isEmpty ? 40 : 40,
        });
        rows = asMaps(res.data);
      } else {
        final res = await widget.api.dio.get('/orders', queryParameters: {
          'q': q.text.trim(),
          if (mode == 'ativos') 'status': 'open,in_progress,ready',
          if (mode == 'finalizados') 'status': 'delivered',
        });
        rows = asMaps(res.data);
      }
    } catch (e) {
      error = widget.api.message(e);
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
          hasSearched = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Consultas',
      subtitle: hub ? 'Escolha o que buscar' : 'Clientes, ativos e finalizados',
      child: hub
          ? ListView(padding: const EdgeInsets.all(16), children: [
              WqCard(onTap: () => setState(() { hub = false; mode = 'clientes'; }), child: const ListTile(contentPadding: EdgeInsets.zero, title: Text('Clientes'), subtitle: Text('Nome, telefone ou e-mail'))),
              const SizedBox(height: 8),
              WqCard(onTap: () => setState(() { hub = false; mode = 'ativos'; }), child: const ListTile(contentPadding: EdgeInsets.zero, title: Text('Pedidos'), subtitle: Text('Código e cliente. A ficha abre laudo e etiqueta.'))),
            ])
          : Column(children: [
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              for (final item in [('clientes', 'Clientes'), ('ativos', 'Pedidos ativos'), ('finalizados', 'Finalizados')])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(label: Text(item.$2), selected: mode == item.$1, onSelected: (_) => setState(() => mode = item.$1)),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: TextField(
            controller: q,
            decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: mode == 'clientes' ? 'Nome, CPF, telefone ou e-mail' : 'Código, cliente ou modelo'),
            onChanged: onQuery,
            onSubmitted: (_) => find(),
          ),
        ),
        if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (final row in rows)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: WqCard(
                          onTap: () {
                            final id = '${row['id'] ?? row['_id']}';
                            final scope = ShellScope.maybeOf(context);
                            if (mode == 'clientes') {
                              if (scope != null) {
                                scope.openPage('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true);
                                return;
                              }
                              widget.openClient?.call(id);
                              return;
                            }
                            final session = widget.session;
                            if (scope != null && session != null) {
                              scope.openPage(
                                'order',
                                OrderDetailScreen(
                                  api: widget.api,
                                  session: session,
                                  orderId: id,
                                  onEdit: () => scope.openPage('order-edit', OrderFormScreen(api: widget.api, session: session, orderId: id), stack: true),
                                ),
                                stack: true,
                              );
                              return;
                            }
                            widget.openOrder(id);
                          },
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${row['code'] ?? row['name'] ?? row['nomeCompleto'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text('${row['clientName'] ?? row['phone'] ?? row['telefone'] ?? row['email'] ?? ''}', style: const TextStyle(color: Wq.muted)),
                          ]),
                        ),
                      ),
                    if (rows.isEmpty)
                      Text(
                        !hasSearched
                            ? 'Digite pelo menos 2 caracteres.'
                            : mode == 'clientes'
                                ? 'Nenhum cliente encontrado.'
                                : 'Nenhum pedido encontrado.',
                        style: const TextStyle(color: Wq.muted),
                      ),
                  ],
                ),
        ),
      ]),
    );
  }
}
