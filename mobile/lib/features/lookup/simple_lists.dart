import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key, required this.api, this.openClient});
  final WorqeraApi api;
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
    final name = TextEditingController();
    final phone = TextEditingController();
    final email = TextEditingController();
    final cpf = TextEditingController();
    final notes = TextEditingController();
    final cep = TextEditingController();
    final address = TextEditingController();
    final ok = await showWqSheet<bool>(
      context,
      title: 'Novo cliente',
      child: (sheet) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
          TextField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'Telefone'),
            onChanged: (value) {
              final next = maskPhone(value);
              if (next != value) phone.value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: next.length));
            },
          ),
          TextField(
            controller: cep,
            decoration: const InputDecoration(labelText: 'CEP'),
            onSubmitted: (_) async {
              final digits = cep.text.replaceAll(RegExp(r'\D'), '');
              if (digits.length != 8) return;
              try {
                final res = await widget.api.dio.get('https://viacep.com.br/ws/$digits/json/');
                final body = Map<String, dynamic>.from(res.data as Map);
                if (body['erro'] == true) return;
                address.text = '${body['logradouro'] ?? ''}, ${body['bairro'] ?? ''} · ${body['localidade'] ?? ''}';
              } catch (e) {
                if (!sheet.mounted) return;
                wqToast(sheet, widget.api.message(e));
              }
            },
          ),
          TextField(controller: address, decoration: const InputDecoration(labelText: 'Endereço')),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
          TextField(controller: cpf, decoration: const InputDecoration(labelText: 'CPF')),
          TextField(controller: notes, decoration: const InputDecoration(labelText: 'Observações')),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Cadastrar')),
        ],
      ),
    );
    final payload = {
      'name': name.text.trim(),
      'phone': phone.text.trim(),
      'email': email.text.trim(),
      'cpf': cpf.text.trim(),
      'notes': notes.text.trim(),
      'address': address.text.trim(),
      'zip': cep.text.trim(),
    };
    for (final ctrl in [name, phone, email, cpf, notes, cep, address]) {
      ctrl.dispose();
    }
    if (ok != true || payload['name']!.isEmpty) return;
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
                  onTap: widget.openClient == null ? null : () => widget.openClient!('${row['id'] ?? row['_id']}'),
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
  const ClientDetailScreen({super.key, required this.api, required this.clientId});
  final WorqeraApi api;
  final String clientId;

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
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        final name = TextEditingController(text: '${client!['name'] ?? client!['nomeCompleto'] ?? ''}');
                        final phone = TextEditingController(text: maskPhone('${client!['phone'] ?? client!['telefone'] ?? ''}'));
                        final email = TextEditingController(text: '${client!['email'] ?? ''}');
                        final cpf = TextEditingController(text: '${client!['cpf'] ?? ''}');
                        final ok = await showWqSheet<bool>(
                          context,
                          title: 'Editar cliente',
                          child: (sheet) => Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
                              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
                              TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
                              TextField(controller: cpf, decoration: const InputDecoration(labelText: 'CPF')),
                              const SizedBox(height: 8),
                              FilledButton(onPressed: () => Navigator.pop(sheet, true), child: const Text('Salvar')),
                            ],
                          ),
                        );
                        final payload = {'name': name.text.trim(), 'phone': phone.text.trim(), 'email': email.text.trim(), 'cpf': cpf.text.trim()};
                        name.dispose();
                        phone.dispose();
                        email.dispose();
                        cpf.dispose();
                        if (ok != true) return;
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
                  ),
                if (orders.isEmpty) const Text('Sem pedidos ligados a esta ficha.', style: TextStyle(color: Wq.muted)),
              ],
            ),
    );
  }
}

class ConsultasScreen extends StatefulWidget {
  const ConsultasScreen({super.key, required this.api, required this.openOrder, this.openClient});
  final WorqeraApi api;
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
                            if (mode == 'clientes') {
                              widget.openClient?.call(id);
                            } else {
                              widget.openOrder(id);
                            }
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
