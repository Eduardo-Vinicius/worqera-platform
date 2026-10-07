import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  String? dataInicio;
  String? dataFim;
  String? nextToken;
  List<Map<String, dynamic>> rows = [];
  bool loading = true;
  bool loadingMore = false;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Map<String, dynamic> query({String? cursor}) {
    final query = <String, dynamic>{'limit': 50};
    if (q.text.trim().isNotEmpty) query['q'] = q.text.trim();
    if (dataInicio != null) query['dataInicio'] = dataInicio;
    if (dataFim != null) query['dataFim'] = dataFim;
    if (cursor != null) query['cursor'] = cursor;
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
    return query;
  }

  List<Map<String, dynamic>> filterRows(List<Map<String, dynamic>> list) {
    if (tab != 'garantia') return list;
    return list.where((row) {
      final warranty = row['warranty'] ?? row['garantia'];
      return warranty is Map && (warranty['ativa'] == true || warranty['active'] == true);
    }).toList();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final res = await widget.api.dio.get('/orders', queryParameters: query());
      if (mounted) {
        final body = res.data;
        setState(() {
          rows = filterRows(asMaps(body));
          nextToken = body is Map && body['nextToken'] != null ? '${body['nextToken']}' : null;
          if (nextToken != null && nextToken!.isEmpty) nextToken = null;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadMore() async {
    final cursor = nextToken;
    if (cursor == null || loadingMore) return;
    setState(() => loadingMore = true);
    try {
      final res = await widget.api.dio.get('/orders', queryParameters: query(cursor: cursor));
      if (!mounted) return;
      final body = res.data;
      setState(() {
        rows = [...rows, ...filterRows(asMaps(body))];
        nextToken = body is Map && body['nextToken'] != null ? '${body['nextToken']}' : null;
        if (nextToken != null && nextToken!.isEmpty) nextToken = null;
      });
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => loadingMore = false);
    }
  }

  Future<void> exportCsv() async {
    try {
      final res = await widget.api.dio.get('/orders/export.csv', options: Options(responseType: ResponseType.plain));
      await Clipboard.setData(ClipboardData(text: '${res.data}'));
      if (mounted) wqToast(context, 'CSV copiado. Cole numa planilha.');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> demoOrder() async {
    try {
      await widget.api.dio.post('/orders/demo');
      if (mounted) wqToast(context, 'Pedido de exemplo criado.');
      await load();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> pickDate(bool start) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1),
    );
    if (picked == null || !mounted) return;
    final iso = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    setState(() {
      if (start) {
        dataInicio = iso;
      } else {
        dataFim = iso;
      }
    });
    await load();
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
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Wrap(spacing: 8, runSpacing: 8, children: [
            ActionChip(label: Text(dataInicio == null ? 'De' : 'De $dataInicio'), onPressed: () => pickDate(true)),
            ActionChip(label: Text(dataFim == null ? 'Até' : 'Até $dataFim'), onPressed: () => pickDate(false)),
            if (dataInicio != null || dataFim != null)
              ActionChip(
                label: const Text('Limpar datas'),
                onPressed: () {
                  setState(() {
                    dataInicio = null;
                    dataFim = null;
                  });
                  load();
                },
              ),
            if (widget.session.role == 'owner') ActionChip(label: const Text('CSV'), onPressed: exportCsv),
            if (!widget.session.isSector) ActionChip(label: const Text('Exemplo'), onPressed: demoOrder),
          ]),
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
                        itemCount: rows.isEmpty ? 1 : rows.length + (nextToken != null ? 1 : 0),
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          if (rows.isEmpty) return const Text('Nenhum pedido neste filtro.', style: TextStyle(color: Wq.muted));
                          if (i >= rows.length) {
                            return TextButton(onPressed: loadingMore ? null : loadMore, child: Text(loadingMore ? 'Carregando…' : 'Carregar mais'));
                          }
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
