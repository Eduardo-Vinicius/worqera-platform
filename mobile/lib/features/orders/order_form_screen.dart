import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';

class OrderFormScreen extends StatefulWidget {
  const OrderFormScreen({super.key, required this.api, this.orderId});
  final WorqeraApi api;
  final String? orderId;

  @override
  State<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends State<OrderFormScreen> {
  int step = 0;
  bool loading = false;
  String? error;

  final name = TextEditingController();
  final phone = TextEditingController();
  final email = TextEditingController();
  final model = TextEditingController();
  final notes = TextEditingController();
  final observations = TextEditingController();
  final due = TextEditingController();
  final signal = TextEditingController();
  final discount = TextEditingController(text: '0');
  final warrantyPrice = TextEditingController(text: '0');

  String brand = '';
  String signalKind = '50';
  String priority = '2';
  bool warranty = false;
  List<Map> brands = [];
  List<Map> services = [];
  List<Map> sectors = [];
  List<Map> accessories = [];
  final pickedServices = <String>{};
  final pickedSectors = <String>{};
  final pickedAccessories = <String>{};
  final photos = <XFile>[];

  bool get editing => widget.orderId != null && widget.orderId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    bootstrap();
  }

  Future<void> bootstrap() async {
    final results = await Future.wait([
      widget.api.dio.get('/brands'),
      widget.api.dio.get('/services'),
      widget.api.dio.get('/sectors'),
      widget.api.dio.get('/accessories'),
    ]);
    brands = _list(results[0].data);
    services = _list(results[1].data);
    sectors = _list(results[2].data);
    accessories = _list(results[3].data);
    if (editing) {
      final order = Map<String, dynamic>.from((await widget.api.dio.get('/orders/${widget.orderId}')).data as Map);
      name.text = '${order['clientName'] ?? ''}';
      phone.text = '${order['clientPhone'] ?? ''}';
      email.text = '${order['clientEmail'] ?? ''}';
      final items = (order['items'] as List?) ?? const [];
      if (items.isNotEmpty) {
        final item = Map<String, dynamic>.from(items.first as Map);
        brand = '${item['brand'] ?? ''}';
        model.text = '${item['shoeModel'] ?? ''}';
        for (final service in (item['services'] as List? ?? const [])) {
          pickedServices.add('${(service as Map)['id'] ?? service['name']}');
        }
        for (final id in (item['plannedSectorIds'] as List? ?? const [])) {
          pickedSectors.add('$id');
        }
      }
      final pricing = order['pricing'] as Map?;
      discount.text = '${pricing?['discount'] ?? 0}';
      signal.text = '${pricing?['deposit'] ?? 0}';
      signalKind = 'custom';
      due.text = '${order['dueAt'] ?? ''}'.split('T').first;
    }
    if (mounted) setState(() {});
  }

  List<Map> _list(dynamic body) {
    final raw = body is Map ? (body['data'] ?? body['items'] ?? body['brands'] ?? body['services'] ?? body['sectors'] ?? body['accessories'] ?? []) : body;
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  double get subtotal {
    var sum = 0.0;
    for (final service in services) {
      if (pickedServices.contains('${service['id'] ?? service['_id']}')) {
        sum += double.tryParse('${service['price'] ?? 0}') ?? 0;
      }
    }
    if (warranty) sum += double.tryParse(warrantyPrice.text) ?? 0;
    return sum;
  }

  double get total => (subtotal - (double.tryParse(discount.text) ?? 0)).clamp(0, double.infinity);

  double get deposit {
    if (signalKind == '100') return total;
    if (signalKind == '50') return (total * 0.5);
    return (double.tryParse(signal.text) ?? 0).clamp(0, total);
  }

  Future<void> save() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (brand.trim().isNotEmpty && !brands.any((b) => '${b['name']}'.toLowerCase() == brand.trim().toLowerCase())) {
        await widget.api.dio.post('/brands', data: {'name': brand.trim()});
      }
      final chosen = services.where((s) => pickedServices.contains('${s['id'] ?? s['_id']}')).map((s) => {
            'id': s['id'] ?? s['_id'],
            'name': s['name'],
            'price': s['price'],
          }).toList();
      final payload = {
        'clientName': name.text.trim(),
        'clientPhone': phone.text.trim(),
        'clientEmail': email.text.trim(),
        'dueAt': due.text.trim().isEmpty ? null : due.text.trim(),
        'dataPrevistaEntrega': due.text.trim().isEmpty ? null : due.text.trim(),
        'status': 'open',
        'prioridade': int.tryParse(priority) ?? 2,
        'observacoes': observations.text.trim(),
        'acessorios': accessories.where((a) => pickedAccessories.contains('${a['id'] ?? a['_id']}')).map((a) => {'id': a['id'] ?? a['_id'], 'name': a['name']}).toList(),
        'pricing': {'subtotal': subtotal, 'discount': double.tryParse(discount.text) ?? 0, 'total': total, 'deposit': deposit, 'remaining': total - deposit},
        'warranty': {'ativa': warranty, 'preco': warranty ? double.tryParse(warrantyPrice.text) ?? 0 : 0, 'duracao': warranty ? '3 meses' : ''},
        'items': [
          {
            'brand': brand.trim(),
            'shoeModel': model.text.trim(),
            'services': chosen,
            'notes': notes.text.trim(),
            'plannedSectorIds': pickedSectors.toList(),
            'flowOptionIds': pickedSectors.toList(),
          }
        ],
      };
      late final String id;
      String? code;
      if (editing) {
        await widget.api.dio.patch('/orders/${widget.orderId}', data: payload);
        id = widget.orderId!;
      } else {
        final created = await widget.api.dio.post('/orders', data: payload);
        final body = Map<String, dynamic>.from(created.data as Map);
        id = '${body['id'] ?? body['_id']}';
        code = '${body['code'] ?? ''}';
      }
      if (photos.isNotEmpty) {
        final form = FormData();
        for (final photo in photos) {
          form.files.add(MapEntry('photos', await MultipartFile.fromFile(photo.path, filename: photo.name)));
        }
        await widget.api.dio.post('/orders/$id/items/0/photos', data: form);
      }
      if (!mounted) return;
      if (code != null && code.isNotEmpty) {
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text('Pedido $code'),
            content: const Text('Pedido criado. O QR da etiqueta usa esse código.'),
            actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Ok'))],
          ),
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Cliente', 'Item', 'Pagamento'];
    return Scaffold(
      appBar: AppBar(title: Text(editing ? 'Editar pedido' : 'Novo pedido')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Passo ${step + 1} de 3 · ${titles[step]}', style: const TextStyle(color: Wq.muted)),
          const SizedBox(height: 12),
          if (step == 0) ...[
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Cliente')),
            const SizedBox(height: 12),
            TextField(controller: phone, decoration: const InputDecoration(labelText: 'Telefone')),
            const SizedBox(height: 12),
            TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
            const SizedBox(height: 12),
            TextField(controller: observations, maxLines: 3, decoration: const InputDecoration(labelText: 'Observações do pedido')),
          ],
          if (step == 1) ...[
            DropdownMenu<String>(
              initialSelection: brand.isEmpty ? null : brand,
              label: const Text('Marca'),
              dropdownMenuEntries: [
                for (final item in brands) DropdownMenuEntry(value: '${item['name']}', label: '${item['name']}'),
              ],
              onSelected: (value) => setState(() => brand = value ?? ''),
            ),
            TextField(onChanged: (value) => brand = value, decoration: const InputDecoration(labelText: 'Ou nova marca')),
            const SizedBox(height: 12),
            TextField(controller: model, decoration: const InputDecoration(labelText: 'Modelo / peça')),
            const SizedBox(height: 12),
            TextField(controller: notes, decoration: const InputDecoration(labelText: 'Observação do item')),
            const SizedBox(height: 12),
            const Text('Serviços'),
            Wrap(spacing: 8, children: [
              for (final service in services)
                FilterChip(
                  label: Text('${service['name']} · R\$ ${service['price'] ?? 0}'),
                  selected: pickedServices.contains('${service['id'] ?? service['_id']}'),
                  onSelected: (on) => setState(() {
                    final id = '${service['id'] ?? service['_id']}';
                    if (on) {
                      pickedServices.add(id);
                    } else {
                      pickedServices.remove(id);
                    }
                  }),
                ),
            ]),
            const SizedBox(height: 12),
            const Text('Setores do fluxo'),
            Wrap(spacing: 8, children: [
              for (final sector in sectors)
                FilterChip(
                  label: Text('${sector['name']}'),
                  selected: pickedSectors.contains('${sector['_id'] ?? sector['id']}'),
                  onSelected: (on) => setState(() {
                    final id = '${sector['_id'] ?? sector['id']}';
                    if (on) {
                      pickedSectors.add(id);
                    } else {
                      pickedSectors.remove(id);
                    }
                  }),
                ),
            ]),
            if (accessories.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Acessórios'),
              Wrap(spacing: 8, children: [
                for (final item in accessories)
                  FilterChip(
                    label: Text('${item['name']}'),
                    selected: pickedAccessories.contains('${item['id'] ?? item['_id']}'),
                    onSelected: (on) => setState(() {
                      final id = '${item['id'] ?? item['_id']}';
                      if (on) {
                        pickedAccessories.add(id);
                      } else {
                        pickedAccessories.remove(id);
                      }
                    }),
                  ),
              ]),
            ],
            const SizedBox(height: 12),
            Row(children: [
              OutlinedButton(
                onPressed: () async {
                  final file = await ImagePicker().pickImage(source: ImageSource.camera);
                  if (file != null) setState(() => photos.add(file));
                },
                child: const Text('Câmera'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () async {
                  final file = await ImagePicker().pickImage(source: ImageSource.gallery);
                  if (file != null) setState(() => photos.add(file));
                },
                child: Text('Fotos (${photos.length})'),
              ),
            ]),
          ],
          if (step == 2) ...[
            TextField(controller: due, decoration: const InputDecoration(labelText: 'Prazo (AAAA-MM-DD)')),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '1', label: Text('Alta')),
                ButtonSegment(value: '2', label: Text('Normal')),
                ButtonSegment(value: '3', label: Text('Baixa')),
              ],
              selected: {priority},
              onSelectionChanged: (value) => setState(() => priority = value.first),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '50', label: Text('50%')),
                ButtonSegment(value: '100', label: Text('100%')),
                ButtonSegment(value: 'custom', label: Text('Outro')),
              ],
              selected: {signalKind},
              onSelectionChanged: (value) => setState(() => signalKind = value.first),
            ),
            if (signalKind == 'custom') TextField(controller: signal, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Sinal (R\$)')),
            TextField(controller: discount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Desconto (R\$)')),
            SwitchListTile(value: warranty, onChanged: (value) => setState(() => warranty = value), title: const Text('Garantia (3 meses)')),
            if (warranty) TextField(controller: warrantyPrice, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Preço da garantia')),
            const SizedBox(height: 8),
            Text('Total R\$ ${total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700)),
            Text('Sinal R\$ ${deposit.toStringAsFixed(2)} · falta R\$ ${(total - deposit).toStringAsFixed(2)}', style: const TextStyle(color: Wq.muted)),
          ],
          if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: Wq.danger))),
          const SizedBox(height: 16),
          Row(children: [
            if (step > 0) OutlinedButton(onPressed: () => setState(() => step -= 1), child: const Text('Voltar')),
            const Spacer(),
            FilledButton(
              onPressed: loading
                  ? null
                  : () {
                      if (step < 2) {
                        setState(() => step += 1);
                      } else {
                        save();
                      }
                    },
              child: Text(step < 2 ? 'Continuar' : loading ? 'Salvando…' : 'Salvar'),
            ),
          ]),
        ],
      ),
    );
  }
}
