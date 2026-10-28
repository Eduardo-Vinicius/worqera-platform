import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import 'restock_card.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, required this.api});
  final WorqeraApi api;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final name = TextEditingController();
  final price = TextEditingController(text: '0');
  final sku = TextEditingController();
  final description = TextEditingController();
  final onHand = TextEditingController(text: '0');
  final minQty = TextEditingController(text: '0');
  final leadTime = TextEditingController();
  int restockKey = 0;
  final variantsText = TextEditingController();
  final delta = TextEditingController(text: '1');
  final reason = TextEditingController();

  bool loading = true;
  bool saving = false;
  bool trackStock = true;
  String? error;
  String? openId;
  String variantId = '';
  List<Map<String, dynamic>> products = [];
  List<Map<String, dynamic>> moves = [];

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    name.dispose();
    price.dispose();
    sku.dispose();
    description.dispose();
    onHand.dispose();
    minQty.dispose();
    leadTime.dispose();
    variantsText.dispose();
    delta.dispose();
    reason.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _rows(dynamic data, String key) {
    if (data is Map && data[key] is List) {
      return [
        for (final row in data[key] as List)
          if (row is Map) Map<String, dynamic>.from(row),
      ];
    }
    return [];
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/products');
      if (!mounted) return;
      setState(() {
        products = _rows(res.data, 'products');
        error = null;
        loading = false;
        restockKey++;
      });
    } catch (err) {
      if (!mounted) return;
      setState(() {
        error = widget.api.message(err);
        loading = false;
      });
    }
  }

  Future<void> create() async {
    if (name.text.trim().isEmpty) {
      wqToast(context, 'Dê um nome ao produto');
      return;
    }
    setState(() => saving = true);
    try {
      final variants = variantsText.text
          .split('\n')
          .map((line) => line.trim())
          .where((line) => line.isNotEmpty)
          .map((line) {
        final parts = line.split('|').map((part) => part.trim()).toList();
        return {
          'name': parts.first,
          'onHand': parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
          'price': parts.length > 2 ? double.tryParse(parts[2].replaceAll(',', '.')) : null,
        };
      }).toList();
      await widget.api.dio.post('/products', data: {
        'name': name.text.trim(),
        'sku': sku.text.trim(),
        'description': description.text.trim(),
        'price': double.tryParse(price.text.replaceAll(',', '.')) ?? 0,
        'trackStock': trackStock,
        'onHand': trackStock ? int.tryParse(onHand.text) ?? 0 : 0,
        'minQty': int.tryParse(minQty.text) ?? 0,
        'leadTimeDays': int.tryParse(leadTime.text) ?? 0,
        'variants': variants,
      });
      name.clear();
      sku.clear();
      description.clear();
      price.text = '0';
      onHand.text = '0';
      variantsText.clear();
      leadTime.clear();
      await load();
      if (mounted) wqToast(context, 'Produto cadastrado');
    } catch (err) {
      if (mounted) wqToast(context, widget.api.message(err));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> openMoves(String id) async {
    setState(() {
      openId = id;
      variantId = '';
    });
    try {
      final res = await widget.api.dio.get('/products/$id/movements');
      if (!mounted) return;
      setState(() => moves = _rows(res.data, 'movements'));
    } catch (err) {
      if (mounted) wqToast(context, widget.api.message(err));
    }
  }

  Future<void> adjust(String id) async {
    final quantity = int.tryParse(delta.text.trim()) ?? 0;
    if (quantity == 0) {
      wqToast(context, 'Informe a quantidade, positiva ou negativa');
      return;
    }
    if (reason.text.trim().isEmpty) {
      wqToast(context, 'Escreva o motivo');
      return;
    }
    try {
      await widget.api.dio.post('/products/$id/adjust', data: {
        'quantity': quantity,
        'reason': reason.text.trim(),
        if (variantId.isNotEmpty) 'variantId': variantId,
      });
      reason.clear();
      await load();
      await openMoves(id);
      if (mounted) wqToast(context, 'Estoque ajustado');
    } catch (err) {
      if (mounted) wqToast(context, widget.api.message(err));
    }
  }

  Future<void> remove(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Apagar produto?'),
        content: const Text('Ele sai do catálogo. Pedidos já feitos continuam.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Apagar')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await widget.api.dio.delete('/products/$id');
      await load();
    } catch (err) {
      if (mounted) wqToast(context, widget.api.message(err));
    }
  }

  String _moveLabel(String type) {
    switch (type) {
      case 'adjust':
        return 'Ajuste';
      case 'reserve':
        return 'Reserva';
      case 'release':
        return 'Estorno';
      case 'commit':
        return 'Baixa';
      case 'reopen':
        return 'Reabertura';
      default:
        return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Produtos',
      subtitle: 'O que a loja vende. No pedido, em Produtos da loja: reserva e a entrega baixa.',
      child: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (error != null) Text(error!, style: const TextStyle(color: Wq.danger)),
                RestockCard(api: widget.api, refreshKey: restockKey, onChanged: () async {
                  final res = await widget.api.dio.get('/products');
                  if (mounted) setState(() => products = _rows(res.data, 'products'));
                }),
                WqCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const Text('Novo produto', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    const Text(
                      'Com estoque, a venda reserva ao abrir o pedido e baixa na entrega. Sem estoque, entra no kanban sob encomenda.',
                      style: TextStyle(color: Wq.muted, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
                    TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Preço')),
                    TextField(controller: sku, decoration: const InputDecoration(labelText: 'SKU')),
                    TextField(controller: minQty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Mínimo')),
                    TextField(
                      controller: leadTime,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Prazo do fornecedor (dias)', helperText: 'Ex.: solado 35. Avisa a hora de pedir antes de acabar.'),
                    ),
                    TextField(controller: description, decoration: const InputDecoration(labelText: 'Descrição')),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Controla estoque'),
                      value: trackStock,
                      onChanged: (value) => setState(() => trackStock = value),
                    ),
                    if (trackStock && variantsText.text.trim().isEmpty)
                      TextField(controller: onHand, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Saldo inicial')),
                    TextField(
                      controller: variantsText,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Variações',
                        helperText: 'Uma por linha: nome | saldo | preço',
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: saving ? null : create,
                      child: Text(saving ? 'Gravando…' : 'Cadastrar'),
                    ),
                  ]),
                ),
                const SizedBox(height: 16),
                if (products.isEmpty)
                  const Text(
                    'Nenhum produto. Pedido de algo que o cliente trouxe não precisa daqui.',
                    style: TextStyle(color: Wq.muted),
                  ),
                for (final product in products) ...[
                  WqCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${product['name']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text(
                              product['trackStock'] == false
                                  ? '${brl(product['price'])} · sob encomenda'
                                  : '${brl(product['price'])} · ${product['available'] ?? 0} disponível · ${product['reserved'] ?? 0} reservado${product['low'] == true ? ' · abaixo do mínimo' : ''}${(product['leadTimeDays'] ?? 0) != 0 ? ' · fornecedor ${product['leadTimeDays']} dias' : ''}${product['restock'] is Map ? ' · a caminho' : ''}',
                              style: const TextStyle(color: Wq.muted, fontSize: 12),
                            ),
                          ]),
                        ),
                        IconButton(onPressed: () => remove('${product['id']}'), icon: const Icon(Icons.delete_outline, color: Wq.danger)),
                      ]),
                      if (product['trackStock'] != false) ...[
                        if (openId == '${product['id']}') ...[
                          if (product['variants'] is List && (product['variants'] as List).isNotEmpty)
                            DropdownButtonFormField<String>(
                              key: ValueKey('adj-${product['id']}-$variantId'),
                              initialValue: variantId.isNotEmpty ? variantId : null,
                              decoration: const InputDecoration(labelText: 'Variação'),
                              items: [
                                for (final row in product['variants'] as List)
                                  if (row is Map)
                                    DropdownMenuItem(
                                      value: '${row['id']}',
                                      child: Text('${row['name']} · ${row['available'] ?? 0} disp.'),
                                    ),
                              ],
                              onChanged: (value) => setState(() => variantId = value ?? ''),
                            ),
                          TextField(
                            controller: delta,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Quantidade (+ ou −)'),
                          ),
                          TextField(
                            controller: reason,
                            decoration: const InputDecoration(labelText: 'Motivo'),
                          ),
                          const SizedBox(height: 8),
                          Row(children: [
                            Expanded(child: OutlinedButton(onPressed: () => adjust('${product['id']}'), child: const Text('Ajustar'))),
                            const SizedBox(width: 8),
                            Expanded(child: OutlinedButton(onPressed: () => openMoves('${product['id']}'), child: const Text('Histórico'))),
                          ]),
                        ] else
                          OutlinedButton(
                            onPressed: () => setState(() {
                              openId = '${product['id']}';
                              variantId = '';
                              moves = [];
                            }),
                            child: const Text('Ajustar estoque'),
                          ),
                      ],
                      if (openId == '${product['id']}' && moves.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        for (final move in moves)
                          Text(
                            '${_moveLabel('${move['type']}')} ${move['quantity']} ${move['variantName'] ?? ''} ${move['reason'] ?? ''} ${move['orderCode'] == null || '${move['orderCode']}'.isEmpty ? '' : '#${move['orderCode']}'}'.replaceAll(RegExp(r'\s+'), ' ').trim(),
                            style: const TextStyle(color: Wq.muted, fontSize: 12),
                          ),
                      ],
                    ]),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
    );
  }
}
