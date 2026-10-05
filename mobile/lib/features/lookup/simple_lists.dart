import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
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
  final name = TextEditingController();
  final phone = TextEditingController();
  final email = TextEditingController();
  final cpf = TextEditingController();
  final notes = TextEditingController();
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
    if (name.text.trim().isEmpty) return;
    await widget.api.dio.post('/clients', data: {
      'name': name.text.trim(),
      'phone': phone.text.trim(),
      'email': email.text.trim(),
      'cpf': cpf.text.trim(),
      'notes': notes.text.trim(),
    });
    name.clear();
    phone.clear();
    email.clear();
    cpf.clear();
    notes.clear();
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
              WqCard(
                child: Column(children: [
                  TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
                  const SizedBox(height: 8),
                  TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
                  TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
                  TextField(controller: cpf, decoration: const InputDecoration(labelText: 'CPF')),
                  TextField(controller: notes, decoration: const InputDecoration(labelText: 'Observações')),
                  const SizedBox(height: 8),
                  Align(alignment: Alignment.centerRight, child: FilledButton(onPressed: create, child: const Text('Cadastrar'))),
                ]),
              ),
              const SizedBox(height: 12),
              for (final row in rows) ...[
                WqCard(
                  onTap: widget.openClient == null ? null : () => widget.openClient!('${row['id'] ?? row['_id']}'),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${row['name'] ?? row['nomeCompleto'] ?? 'Cliente'}', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('${row['phone'] ?? row['telefone'] ?? row['email'] ?? ''}', style: const TextStyle(color: Wq.muted)),
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
                WqCard(child: Text('${client!['email'] ?? 'Sem e-mail'}')),
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
  String mode = 'ativos';
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
      subtitle: 'Clientes, ativos e finalizados',
      child: Column(children: [
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
