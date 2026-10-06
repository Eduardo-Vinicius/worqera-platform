import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key, required this.api, required this.session, required this.openOrder, required this.openNew});
  final WorqeraApi api;
  final SessionStore session;
  final void Function(String id) openOrder;
  final VoidCallback openNew;

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String tab = 'ativos';
  final q = TextEditingController();
  List<Map<String, dynamic>> rows = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    final query = <String, dynamic>{};
    if (q.text.trim().isNotEmpty) query['q'] = q.text.trim();
    if (tab == 'ativos') query['status'] = 'open,in_progress,ready';
    if (tab == 'a_pagar') {
      query['status'] = 'open,in_progress,ready,delivered';
      query['payment'] = 'due';
    }
    if (tab == 'entregue_aberto') {
      query['status'] = 'delivered';
      query['payment'] = 'due';
    }
    if (tab == 'finalizados' || tab == 'garantia') query['status'] = 'delivered,open,in_progress,ready';
    if (tab == 'lixeira') query['deleted'] = '1';
    try {
      final res = await widget.api.dio.get('/orders', queryParameters: query);
      if (mounted) {
        setState(() {
          rows = asMaps(res.data);
          if (tab == 'garantia') {
            rows = rows.where((row) {
              final warranty = row['warranty'] ?? row['garantia'];
              return warranty is Map && (warranty['ativa'] == true || warranty['active'] == true);
            }).toList();
          }
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = <(String, String)>[
      ('ativos', 'Ativos'),
      if (widget.session.seesMoney) ('a_pagar', 'Falta pagar'),
      if (widget.session.seesMoney) ('entregue_aberto', 'Entregue sem pagar'),
      ('finalizados', 'Finalizados'),
      ('garantia', 'Garantia'),
      ('todos', 'Todos'),
      ('lixeira', 'Lixeira'),
    ];
    return WqPage(
      title: 'Pedidos',
      subtitle: 'Fila, pagamento e histórico',
      floating: FloatingActionButton.extended(
        backgroundColor: Wq.brand,
        foregroundColor: Colors.white,
        onPressed: widget.openNew,
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(
            controller: q,
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Cliente, código ou modelo'),
            onSubmitted: (_) => load(),
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              for (final item in tabs)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(item.$2),
                    selected: tab == item.$1,
                    selectedColor: Wq.brand.withValues(alpha: 0.16),
                    onSelected: (_) {
                      setState(() => tab = item.$1);
                      load();
                    },
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : error != null
                  ? Center(child: Text(error!, style: const TextStyle(color: Wq.danger)))
                  : RefreshIndicator(
                      onRefresh: load,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                        itemCount: rows.isEmpty ? 1 : rows.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          if (rows.isEmpty) return const Text('Nenhum pedido neste filtro.', style: TextStyle(color: Wq.muted));
                          final row = rows[i];
                          final pricing = row['pricing'] as Map?;
                          final due = dayLabel(row['dueAt']);
                          return WqCard(
                            onTap: () => widget.openOrder('${row['id'] ?? row['_id']}'),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Text('${row['code'] ?? ''}', style: monoStyle(size: 16)),
                                if (pairCount(row) > 1) Padding(padding: const EdgeInsets.only(left: 8), child: Text('${pairCount(row)} pares', style: const TextStyle(color: Wq.brand, fontSize: 12, fontWeight: FontWeight.w700))),
                                const SizedBox(width: 8),
                                StatusChip(row['status']),
                                const Spacer(),
                                const Icon(Icons.chevron_right, color: Wq.muted),
                              ]),
                              const SizedBox(height: 4),
                              Text('${row['clientName'] ?? 'Cliente'}', style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(
                                [
                                  if ('${row['brand'] ?? ''}'.isNotEmpty || '${row['shoeModel'] ?? ''}'.isNotEmpty) '${row['brand'] ?? ''} ${row['shoeModel'] ?? ''}'.trim(),
                                  if (due.isNotEmpty) 'Prazo $due',
                                  if (widget.session.seesMoney && pricing != null) 'Falta ${brl(pricing['remaining'])}',
                                ].where((e) => e.isNotEmpty).join(' · '),
                                style: const TextStyle(color: Wq.muted, fontSize: 13),
                              ),
                              if (tab == 'lixeira')
                                Row(children: [
                                  TextButton(onPressed: () async {
                                    await widget.api.dio.post('/orders/${row['id'] ?? row['_id']}/restore');
                                    await load();
                                  }, child: const Text('Recuperar')),
                                  if (widget.session.isAdmin)
                                    TextButton(onPressed: () async {
                                      await widget.api.dio.delete('/orders/${row['id'] ?? row['_id']}/purge');
                                      await load();
                                    }, child: const Text('Apagar de vez', style: TextStyle(color: Wq.danger))),
                                ]),
                            ]),
                          );
                        },
                      ),
                    ),
        ),
      ]),
    );
  }
}
