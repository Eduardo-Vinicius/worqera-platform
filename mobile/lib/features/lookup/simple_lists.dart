import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key, required this.api, this.openClient, this.session});
  final WorqeraApi api;
  final SessionStore? session;
  final void Function(String id)? openClient;

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final q = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/clients', queryParameters: {'q': q.text.trim()});
      setState(() {
        rows = asMaps(res.data);
        error = null;
      });
    } catch (e) {
      setState(() => error = widget.api.message(e));
    }
  }

  Future<void> create() async {
    final payload = await showWqSheet<Map<String, String>>(
      context,
      title: 'Novo cliente',
      child: (sheet) => WqSheetFields(
        create: () => List.generate(7, (_) => TextEditingController()),
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
              }),
              child: const Text('Cadastrar'),
            ),
          ],
        ),
      ),
    );
    if (payload == null || payload['name']!.isEmpty || !mounted) return;
    await widget.api.dio.post('/clients', data: payload);
    await load();
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Clientes',
      subtitle: 'Quem deixa pedido na empresa',
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(controller: q, decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Nome ou telefone'), onSubmitted: (_) => load()),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            children: [
              if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
              FilledButton(onPressed: create, child: const Text('Novo cliente')),
              const SizedBox(height: 12),
              for (final row in rows) ...[
                WqCard(
                  onTap: () {
                    final id = '${row['id'] ?? row['_id']}';
                    final scope = ShellScope.maybeOf(context);
                    if (scope != null) {
                      scope.openPage('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session), stack: true);
                      return;
                    }
                    widget.openClient?.call(id);
                  },
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${row['name'] ?? row['nomeCompleto'] ?? 'Cliente'}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(
                      [
                        '${row['phone'] ?? row['telefone'] ?? row['email'] ?? ''}',
                        maskCpf('${row['cpf'] ?? ''}'),
                      ].where((part) => part.isNotEmpty).join(' · '),
                      style: const TextStyle(color: Wq.muted),
                    ),
                  ]),
                ),
                const SizedBox(height: 8),
              ],
              if (rows.isEmpty) const Text('Nenhum cliente.', style: TextStyle(color: Wq.muted)),
            ],
          ),
        ),
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
                    if ('${client!['notes'] ?? ''}'.isNotEmpty) Text('${client!['notes']}', style: const TextStyle(color: Wq.muted)),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        final initialName = '${client!['name'] ?? client!['nomeCompleto'] ?? ''}';
                        final initialPhone = maskPhone('${client!['phone'] ?? client!['telefone'] ?? ''}');
                        final initialEmail = '${client!['email'] ?? ''}';
                        final initialCpf = '${client!['cpf'] ?? ''}';
                        final payload = await showWqSheet<Map<String, String>>(
                          context,
                          title: 'Editar cliente',
                          child: (sheet) => WqSheetFields(
                            create: () => [
                              TextEditingController(text: initialName),
                              TextEditingController(text: initialPhone),
                              TextEditingController(text: initialEmail),
                              TextEditingController(text: initialCpf),
                            ],
                            builder: (_, fields) => Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome')),
                                TextField(controller: fields[1], decoration: const InputDecoration(labelText: 'Telefone')),
                                TextField(controller: fields[2], decoration: const InputDecoration(labelText: 'E-mail')),
                                TextField(controller: fields[3], decoration: const InputDecoration(labelText: 'CPF')),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: () => Navigator.pop(sheet, {
                                    'name': fields[0].text.trim(),
                                    'phone': fields[1].text.trim(),
                                    'email': fields[2].text.trim(),
                                    'cpf': fields[3].text.trim(),
                                  }),
                                  child: const Text('Salvar'),
                                ),
                              ],
                            ),
                          ),
                        );
                        if (payload == null || !context.mounted) return;
                        await widget.api.dio.patch('/clients/${widget.clientId}', data: payload);
                        final res = await widget.api.dio.get('/clients/${widget.clientId}');
                        if (!context.mounted) return;
                        setState(() => client = Map<String, dynamic>.from(res.data as Map));
                        wqToast(context, 'Cliente atualizado');
                      },
                      child: const Text('Editar'),
                    ),
                  ]),
                ),
                const SizedBox(height: 12),
                const WqSectionTitle('Pedidos'),
                for (final order in orders)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${order['code'] ?? ''}'),
                    trailing: StatusChip(order['status']),
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

  Future<void> find() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (mode == 'clientes') {
        final res = await widget.api.dio.get('/clients', queryParameters: {'q': q.text.trim()});
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
      if (mounted) setState(() => loading = false);
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
                    if (rows.isEmpty) const Text('Busque para ver a lista.', style: TextStyle(color: Wq.muted)),
                  ],
                ),
        ),
      ]),
    );
  }
}
