import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';
import 'success_screen.dart';

const _maxPhotos = 10;

double _money(String raw) {
  var text = raw.trim();
  if (text.contains(',') && text.contains('.')) {
    text = text.replaceAll('.', '').replaceAll(',', '.');
  } else if (text.contains(',')) {
    text = text.replaceAll(',', '.');
  }
  return double.tryParse(text) ?? 0;
}

String _iso(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

DateTime _plusDays(int days) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day).add(Duration(days: days));
}

class _ServicePick {
  _ServicePick({required this.id, required this.name, required this.price})
      : priceField = TextEditingController(text: price.toStringAsFixed(2)),
        noteField = TextEditingController();
  final String id;
  final String name;
  double price;
  final TextEditingController priceField;
  final TextEditingController noteField;

  void dispose() {
    priceField.dispose();
    noteField.dispose();
  }
}

class _PhotoPick {
  _PhotoPick.file(this.file) : url = null, serverPhotoIndex = null;
  _PhotoPick.url(this.url, this.serverPhotoIndex) : file = null;
  final XFile? file;
  final String? url;
  final int? serverPhotoIndex;
  bool cover = false;
}

class _ItemDraft {
  _ItemDraft() {
    flow.add('atendimento');
  }

  final brand = TextEditingController();
  final model = TextEditingController();
  final notes = TextEditingController();
  final services = <_ServicePick>[];
  final flow = <String>[];
  final photos = <_PhotoPick>[];
  final removedPhotos = <int>[];
  int? serverIndex;

  bool get touched =>
      brand.text.trim().isNotEmpty || model.text.trim().isNotEmpty || notes.text.trim().isNotEmpty || services.isNotEmpty || photos.isNotEmpty;

  bool get filled => model.text.trim().isNotEmpty && services.isNotEmpty;

  void dispose() {
    brand.dispose();
    model.dispose();
    notes.dispose();
    for (final service in services) {
      service.dispose();
    }
  }
}

class OrderFormScreen extends StatefulWidget {
  const OrderFormScreen({super.key, required this.api, required this.session, this.orderId});
  final WorqeraApi api;
  final SessionStore session;
  final String? orderId;

  @override
  State<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends State<OrderFormScreen> {
  final clientQuery = TextEditingController();
  final newName = TextEditingController();
  final newPhone = TextEditingController();
  final newCpf = TextEditingController();
  final newEmail = TextEditingController();
  final observations = TextEditingController();
  final discountField = TextEditingController(text: '0');
  final warrantyField = TextEditingController(text: '0');
  final signalField = TextEditingController(text: '0');
  final accessoryDraft = TextEditingController();

  bool boot = true;
  bool saving = false;
  bool savingClient = false;
  String? error;
  String orderStatus = 'open';
  String priority = '2';
  String signalKind = '50';
  bool warranty = false;
  DateTime due = _plusDays(15);

  Map<String, dynamic>? client;
  List<Map<String, dynamic>> clients = [];
  List<Map<String, dynamic>>? remoteClients;
  String remoteTerm = '';
  bool searchingClients = false;
  Timer? clientSearchTimer;
  List<Map<String, dynamic>> brands = [];
  List<Map<String, dynamic>> services = [];
  List<Map<String, dynamic>> sectors = [];
  List<String> accessoryCatalog = [];
  final accessories = <String>[];
  final items = <_ItemDraft>[_ItemDraft()];
  int itemIndex = 0;
  int serverItemCount = 0;

  bool get editing => widget.orderId != null && widget.orderId!.isNotEmpty;
  _ItemDraft get current => items[itemIndex.clamp(0, items.length - 1)];

  @override
  void initState() {
    super.initState();
    bootstrap();
  }

  @override
  void dispose() {
    clientSearchTimer?.cancel();
    clientQuery.dispose();
    newName.dispose();
    newPhone.dispose();
    newCpf.dispose();
    newEmail.dispose();
    observations.dispose();
    discountField.dispose();
    warrantyField.dispose();
    signalField.dispose();
    accessoryDraft.dispose();
    for (final item in items) {
      item.dispose();
    }
    super.dispose();
  }

  Future<void> bootstrap() async {
    try {
      final results = await Future.wait([
        widget.api.dio.get('/brands'),
        widget.api.dio.get('/services'),
        widget.api.dio.get('/sectors'),
        widget.api.dio.get('/accessories'),
        widget.api.dio.get('/clients', queryParameters: {'limit': 200}),
      ]);
      brands = _maps(results[0].data, const ['brands', 'data']);
      services = _maps(results[1].data, const ['services', 'data']).where((row) => row['active'] != false).toList();
      sectors = _maps(results[2].data, const ['sectors', 'data']).where((row) => row['active'] != false).toList()
        ..sort((a, b) => (int.tryParse('${a['order'] ?? 0}') ?? 0).compareTo(int.tryParse('${b['order'] ?? 0}') ?? 0));
      accessoryCatalog = _maps(results[3].data, const ['accessories', 'data'])
          .where((row) => row['active'] != false && '${row['name'] ?? ''}'.trim().isNotEmpty)
          .map((row) => '${row['name']}'.trim())
          .toList();
      clients = _maps(results[4].data, const ['clients', 'data', 'items']).map(_client).toList();
      if (services.isEmpty) {
        services = [
          {'id': 'limpeza-simples', 'name': 'Limpeza Simples', 'defaultPrice': 30},
          {'id': 'limpeza-completa', 'name': 'Limpeza Completa', 'defaultPrice': 50},
          {'id': 'restauracao', 'name': 'Restauração', 'defaultPrice': 80},
          {'id': 'reparo', 'name': 'Reparo', 'defaultPrice': 40},
          {'id': 'customizacao', 'name': 'Customização', 'defaultPrice': 120},
          {'id': 'pintura', 'name': 'Pintura', 'defaultPrice': 60},
          {'id': 'troca-sola', 'name': 'Troca de Sola', 'defaultPrice': 70},
          {'id': 'costura', 'name': 'Costura', 'defaultPrice': 35},
        ];
      }
      if (sectors.isEmpty) {
        sectors = [
          {'id': 'atendimento', 'name': 'Atendimento', 'slug': 'atendimento', 'isTerminal': false},
          {'id': 'sapataria', 'name': 'Sapataria', 'slug': 'sapataria', 'isTerminal': false},
          {'id': 'costura', 'name': 'Costura', 'slug': 'costura', 'isTerminal': false},
          {'id': 'lavagem', 'name': 'Lavagem', 'slug': 'lavagem', 'isTerminal': false},
          {'id': 'acabamento', 'name': 'Acabamento', 'slug': 'acabamento', 'isTerminal': false},
          {'id': 'pintura', 'name': 'Pintura', 'slug': 'pintura', 'isTerminal': false},
        ];
      }
      _applyDefaultFlow();
      if (editing) await _loadOrder();
    } catch (e) {
      error = widget.api.message(e);
    } finally {
      if (mounted) setState(() => boot = false);
    }
  }

  void searchClients(String raw) {
    clientSearchTimer?.cancel();
    final term = raw.trim();
    if (term.length < 2) {
      setState(() {
        remoteClients = null;
        remoteTerm = '';
        searchingClients = false;
      });
      return;
    }
    setState(() => searchingClients = true);
    clientSearchTimer = Timer(const Duration(milliseconds: 280), () async {
      try {
        final res = await widget.api.dio.get('/clients', queryParameters: {'q': term, 'limit': 40});
        if (!mounted || clientQuery.text.trim() != term) return;
        setState(() {
          remoteTerm = term.toLowerCase();
          remoteClients = _maps(res.data, const ['clients', 'data', 'items']).map(_client).toList();
          searchingClients = false;
        });
      } catch (_) {
        if (!mounted || clientQuery.text.trim() != term) return;
        setState(() {
          remoteClients = null;
          searchingClients = false;
        });
      }
    });
  }

  Map<String, dynamic> _client(Map raw) {
    return {
      'id': '${raw['id'] ?? raw['_id'] ?? ''}',
      'name': '${raw['nomeCompleto'] ?? raw['name'] ?? ''}',
      'phone': '${raw['telefone'] ?? raw['phone'] ?? ''}',
      'email': '${raw['email'] ?? ''}',
      'cpf': '${raw['cpf'] ?? ''}',
    };
  }

  List<Map<String, dynamic>> _maps(dynamic body, List<String> keys) {
    dynamic raw = body;
    if (body is Map) {
      for (final key in keys) {
        if (body[key] is List) {
          raw = body[key];
          break;
        }
      }
    }
    if (raw is! List) return [];
    return raw.whereType<Map>().map((row) => Map<String, dynamic>.from(row)).toList();
  }

  void _applyDefaultFlow() {
    final open = sectors.where((row) => row['isTerminal'] != true).toList();
    final start = open.isEmpty ? (sectors.isEmpty ? null : sectors.first) : open.first;
    final key = start == null ? 'atendimento' : '${start['slug'] ?? start['id']}';
    for (final item in items) {
      if (item.serverIndex != null && item.flow.isNotEmpty) continue;
      final known = item.flow.where((id) => sectors.any((row) => '${row['id']}' == id || '${row['slug']}' == id)).toList();
      item.flow
        ..clear()
        ..addAll(known.isEmpty ? [key] : known);
    }
  }

  Future<void> _loadOrder() async {
    final res = await widget.api.dio.get('/orders/${widget.orderId}');
    final order = Map<String, dynamic>.from(res.data as Map);
    orderStatus = '${order['status'] ?? 'open'}';
    final loadedClient = _client(order);
    if ('${loadedClient['id']}'.isEmpty && '${order['clientId'] ?? ''}'.isNotEmpty) {
      loadedClient['id'] = '${order['clientId']}';
    }
    loadedClient['name'] = '${order['clientName'] ?? loadedClient['name']}';
    loadedClient['phone'] = '${order['clientPhone'] ?? loadedClient['phone']}';
    loadedClient['email'] = '${order['clientEmail'] ?? loadedClient['email']}';
    client = loadedClient['name'].toString().isEmpty ? null : loadedClient;
    observations.text = '${order['observacoes'] ?? order['notes'] ?? ''}';
    priority = '${order['priority'] ?? order['prioridade'] ?? 2}';
    final dueRaw = DateTime.tryParse('${order['dueAt'] ?? order['dataPrevistaEntrega'] ?? ''}');
    if (dueRaw != null) due = DateTime(dueRaw.year, dueRaw.month, dueRaw.day);
    final pricing = order['pricing'] is Map ? Map<String, dynamic>.from(order['pricing'] as Map) : const <String, dynamic>{};
    final warrantyMap = order['warranty'] is Map
        ? Map<String, dynamic>.from(order['warranty'] as Map)
        : (order['garantia'] is Map ? Map<String, dynamic>.from(order['garantia'] as Map) : const <String, dynamic>{});
    warranty = warrantyMap['active'] == true || warrantyMap['ativa'] == true;
    warrantyField.text = '${warrantyMap['preco'] ?? warrantyMap['price'] ?? 0}';
    discountField.text = '${pricing['discount'] ?? 0}';
    final deposit = double.tryParse('${pricing['deposit'] ?? 0}') ?? 0;
    final total = double.tryParse('${pricing['total'] ?? 0}') ?? 0;
    if (total > 0 && deposit >= total) {
      signalKind = '100';
    } else if (total > 0 && (deposit - total * 0.5).abs() < 0.01) {
      signalKind = '50';
    } else {
      signalKind = 'custom';
      signalField.text = deposit.toStringAsFixed(2);
    }
    final rawAccessories = order['accessories'] ?? order['acessorios'];
    accessories
      ..clear()
      ..addAll(rawAccessories is List ? rawAccessories.map((row) => row is Map ? '${row['name'] ?? row}' : '$row').where((name) => name.isNotEmpty) : const []);
    final rawItems = order['items'] is List ? order['items'] as List : const [];
    if (rawItems.isNotEmpty) {
      for (final item in items) {
        item.dispose();
      }
      items
        ..clear()
        ..addAll(rawItems.asMap().entries.map((entry) {
          final raw = Map<String, dynamic>.from(entry.value as Map);
          final draft = _ItemDraft()
            ..serverIndex = entry.key
            ..brand.text = '${raw['brand'] ?? ''}'
            ..model.text = '${raw['shoeModel'] ?? ''}'
            ..notes.text = '${raw['notes'] ?? ''}';
          draft.flow
            ..clear()
            ..addAll(((raw['flowOptionIds'] as List?) ?? const []).map((id) => '$id'));
          if (draft.flow.isEmpty) draft.flow.add('atendimento');
          for (final service in (raw['services'] as List? ?? const [])) {
            final row = Map<String, dynamic>.from(service as Map);
            draft.services.add(_ServicePick(
              id: '${row['id'] ?? row['name']}',
              name: '${row['name'] ?? ''}',
              price: double.tryParse('${row['price'] ?? 0}') ?? 0,
            ));
          }
          for (var photoIndex = 0; photoIndex < (raw['photos'] as List? ?? const []).length; photoIndex++) {
            final photo = (raw['photos'] as List)[photoIndex];
            if (photo is! Map) continue;
            final url = '${photo['url'] ?? photo['key'] ?? ''}';
            if (url.isEmpty) continue;
            draft.photos.add(_PhotoPick.url(url, photoIndex)..cover = photo['isCover'] == true);
          }
          return draft;
        }));
      serverItemCount = items.length;
      itemIndex = 0;
    }
  }

  double get servicesSum {
    var sum = 0.0;
    for (final item in items) {
      for (final service in item.services) {
        sum += service.price;
      }
    }
    return sum;
  }

  double get warrantyPrice => warranty ? _money(warrantyField.text) : 0;

  double get subtotal => servicesSum + warrantyPrice;

  double get discount {
    final raw = _money(discountField.text);
    if (raw < 0) return 0;
    return raw > subtotal ? subtotal : raw;
  }

  double get total => (subtotal - discount).clamp(0, double.infinity);

  double get deposit {
    if (signalKind == '100') return total;
    if (signalKind == '50') return total / 2;
    final raw = _money(signalField.text);
    if (raw < 0) return 0;
    return raw > total ? total : raw;
  }

  double get remaining => (total - deposit).clamp(0, double.infinity);

  List<_ItemDraft> get filledItems => items.where((item) => item.filled).toList();

  String? validate() {
    if (editing && orderStatus == 'delivered') {
      return 'Pedido entregue: reabra no kanban antes de alterar.';
    }
    if (client == null || '${client!['name'] ?? ''}'.trim().isEmpty) return 'Cliente é obrigatório';
    if (!editing && '${client!['id'] ?? ''}'.isEmpty) return 'Cliente é obrigatório';
    final touched = items.where((item) => item.touched).toList();
    if (touched.isEmpty || filledItems.isEmpty) return 'Informe ao menos um item com modelo e serviços';
    if (touched.any((item) => !item.filled)) return 'Cada item preenchido deve ter modelo e ao menos um serviço';
    if (touched.any((item) => item.services.any((service) => service.price <= 0))) return 'Todos os serviços devem ter preços válidos';
    if (items.any((item) => item.photos.length > _maxPhotos)) return 'Máximo de $_maxPhotos fotos por item';
    if (deposit < 0 || deposit > total + 0.001) return 'O sinal precisa ficar entre zero e o total';
    return null;
  }

  Future<bool> saveClient() async {
    final name = newName.text.trim();
    final phone = newPhone.text.trim();
    if (name.isEmpty || phone.isEmpty) {
      wqToast(context, 'Nome e telefone são obrigatórios');
      return false;
    }
    setState(() => savingClient = true);
    try {
      final created = await widget.api.dio.post('/clients', data: {
        'nomeCompleto': name,
        'telefone': phone,
        'cpf': newCpf.text.trim(),
        'email': newEmail.text.trim(),
      });
      final body = created.data is Map ? Map<String, dynamic>.from(created.data as Map) : <String, dynamic>{};
      final row = body['client'] is Map ? Map<String, dynamic>.from(body['client'] as Map) : body;
      final saved = _client({...row, 'nomeCompleto': name, 'telefone': phone, 'cpf': newCpf.text.trim(), 'email': newEmail.text.trim()});
      if (!clients.any((item) => item['id'] == saved['id'])) clients.insert(0, saved);
      setState(() {
        client = saved;
        clientQuery.clear();
        newName.clear();
        newPhone.clear();
        newCpf.clear();
        newEmail.clear();
      });
      if (mounted) wqToast(context, 'Cliente cadastrado');
      return true;
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
      return false;
    } finally {
      if (mounted) setState(() => savingClient = false);
    }
  }

  Future<void> openNewClient() async {
    final draft = await showWqSheet<Map<String, String>>(
      context,
      title: 'Novo cliente',
      hint: 'Nome e telefone. E-mail só se for enviar o laudo.',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController(), TextEditingController(), TextEditingController(), TextEditingController()],
        builder: (_, fields) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: fields[0], textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Nome *'), autofocus: true),
            const SizedBox(height: 8),
            TextField(
              controller: fields[1],
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefone *'),
              onChanged: (value) {
                final next = maskPhone(value);
                if (next != value) fields[1].value = TextEditingValue(text: next, selection: TextSelection.collapsed(offset: next.length));
              },
            ),
            const SizedBox(height: 8),
            TextField(controller: fields[2], decoration: const InputDecoration(labelText: 'CPF')),
            const SizedBox(height: 8),
            TextField(controller: fields[3], keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail (PDF + link do pedido)')),
            const SizedBox(height: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Wq.action),
              onPressed: () => Navigator.pop(sheet, {
                'name': fields[0].text.trim(),
                'phone': fields[1].text.trim(),
                'cpf': fields[2].text.trim(),
                'email': fields[3].text.trim(),
              }),
              child: const Text('Salvar cliente'),
            ),
          ],
        ),
      ),
    );
    if (draft == null || !mounted) return;
    newName.text = draft['name'] ?? '';
    newPhone.text = draft['phone'] ?? '';
    newCpf.text = draft['cpf'] ?? '';
    newEmail.text = draft['email'] ?? '';
    await saveClient();
  }

  Future<void> openBrand(_ItemDraft item) async {
    final next = await showWqSheet<String>(
      context,
      title: 'Cadastrar marca',
      hint: 'Entra no catálogo da empresa.',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController(text: item.brand.text.trim())],
        builder: (_, fields) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(sheet, fields[0].text.trim()), child: const Text('Salvar')),
          ],
        ),
      ),
    );
    if (next == null || next.isEmpty || !mounted) return;
    item.brand.text = next;
    await commitBrand(item);
  }

  Future<void> commitBrand(_ItemDraft item) async {
    final name = item.brand.text.trim();
    if (name.isEmpty) return;
    final known = brands.cast<Map<String, dynamic>?>().cast<Map<String, dynamic>>().where((row) => '${row['name']}'.toLowerCase() == name.toLowerCase());
    if (known.isNotEmpty) {
      item.brand.text = '${known.first['name']}';
      return;
    }
    try {
      final created = await widget.api.dio.post('/brands', data: {'name': name});
      final body = created.data is Map ? Map<String, dynamic>.from(created.data as Map) : <String, dynamic>{'name': name};
      final saved = '${body['name'] ?? name}';
      brands.add({'name': saved});
      item.brand.text = saved;
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  Future<void> addAccessory() async {
    final name = accessoryDraft.text.trim();
    if (name.isEmpty) return;
    final known = accessoryCatalog.cast<String?>().where((item) => item!.toLowerCase() == name.toLowerCase());
    if (known.isNotEmpty) {
      setState(() {
        if (!accessories.contains(known.first)) accessories.add(known.first!);
        accessoryDraft.clear();
      });
      return;
    }
    final savedName = await showWqSheet<String>(
      context,
      title: 'Cadastrar acessório',
      hint: 'Entra no catálogo da empresa.',
      child: (sheet) => WqSheetFields(
        create: () => [TextEditingController(text: name)],
        builder: (_, fields) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: fields[0], decoration: const InputDecoration(labelText: 'Nome'), autofocus: true),
            const SizedBox(height: 8),
            FilledButton(onPressed: () => Navigator.pop(sheet, fields[0].text.trim()), child: const Text('Salvar')),
          ],
        ),
      ),
    );
    if (savedName == null || savedName.isEmpty || !mounted) return;
    try {
      final created = await widget.api.dio.post('/accessories', data: {'name': savedName});
      final body = created.data is Map ? Map<String, dynamic>.from(created.data as Map) : <String, dynamic>{};
      final saved = '${body['name'] ?? savedName}'.trim();
      setState(() {
        if (!accessoryCatalog.any((item) => item.toLowerCase() == saved.toLowerCase())) accessoryCatalog.add(saved);
        if (!accessories.contains(saved)) accessories.add(saved);
        accessoryDraft.clear();
      });
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  void toggleService(_ItemDraft item, Map<String, dynamic> service, bool on) {
    final id = '${service['id'] ?? service['_id'] ?? service['name']}';
    setState(() {
      if (!on) {
        for (final pick in item.services.where((pick) => pick.id == id)) {
          pick.dispose();
        }
        item.services.removeWhere((pick) => pick.id == id);
        return;
      }
      if (item.services.any((pick) => pick.id == id)) return;
      final price = double.tryParse('${service['defaultPrice'] ?? service['price'] ?? service['suggestedPrice'] ?? 0}') ?? 0;
      item.services.add(_ServicePick(id: id, name: '${service['name'] ?? ''}', price: price));
      final hints = service['sectorPathHint'];
      if (hints is List) {
        for (final hint in hints) {
          final sector = sectors.cast<Map<String, dynamic>?>().where((row) => '${row!['id']}' == '$hint' || '${row['slug']}' == '$hint');
          final key = sector.isEmpty ? '$hint' : '${sector.first!['slug'] ?? sector.first!['id']}';
          if (key.isNotEmpty && !item.flow.contains(key)) item.flow.add(key);
        }
      }
    });
  }

  void toggleFlow(_ItemDraft item, Map<String, dynamic> sector) {
    final key = '${sector['slug'] ?? sector['id']}';
    final id = '${sector['id']}';
    setState(() {
      final on = item.flow.contains(key) || item.flow.contains(id);
      if (on) {
        item.flow.removeWhere((value) => value == key || value == id);
        if (item.flow.isEmpty) {
          final open = sectors.where((row) => row['isTerminal'] != true);
          item.flow.add(open.isEmpty ? 'atendimento' : '${open.first['slug'] ?? open.first['id']}');
        }
      } else {
        item.flow.add(key);
      }
    });
  }

  Future<void> addPhotos(_ItemDraft item, ImageSource source) async {
    final picker = ImagePicker();
    final picked = source == ImageSource.camera ? [await picker.pickImage(source: source)].whereType<XFile>() : await picker.pickMultiImage();
    if (picked.isEmpty) return;
    final room = _maxPhotos - item.photos.length;
    if (room <= 0) {
      if (mounted) wqToast(context, 'Máximo de $_maxPhotos fotos por item');
      return;
    }
    setState(() {
      for (final file in picked.take(room)) {
        item.photos.add(_PhotoPick.file(file));
      }
      if (!item.photos.any((photo) => photo.cover) && item.photos.isNotEmpty) item.photos.first.cover = true;
    });
    if (picked.length > room && mounted) wqToast(context, 'Máximo de $_maxPhotos fotos por item');
  }

  void addItem() {
    setState(() {
      final draft = _ItemDraft();
      items.add(draft);
      itemIndex = items.length - 1;
      _applyDefaultFlow();
    });
    wqToast(context, 'Novo item — preencha modelo, serviços e fotos');
  }

  void removeItem(int index) {
    if (items.length <= 1) {
      wqToast(context, 'Pedido precisa de ao menos um item');
      return;
    }
    setState(() {
      items.removeAt(index).dispose();
      if (itemIndex >= items.length) itemIndex = items.length - 1;
    });
  }

  Map<String, dynamic> _header() {
    final selected = client ?? const <String, dynamic>{};
    return {
      'clienteId': selected['id'],
      'clientId': selected['id'],
      'clientName': selected['name'] ?? '',
      'clientPhone': selected['phone'] ?? '',
      'clientEmail': selected['email'] ?? '',
      'observacoes': observations.text.trim(),
      'prioridade': int.tryParse(priority) ?? 2,
      'dataPrevistaEntrega': _iso(due),
      'dueAt': _iso(due),
      'departamento': 'atendimento',
      'acessorios': accessories,
      'garantia': {'ativa': warranty, 'preco': warrantyPrice, 'duracao': warranty ? '3 meses' : ''},
      'pricing': {
        'subtotal': subtotal,
        'discount': discount,
        'total': total,
        'deposit': deposit,
        'remaining': remaining,
      },
      'precoTotal': total,
      'valorSinal': deposit,
      'valorRestante': remaining,
      'status': 'open',
    };
  }

  Map<String, dynamic> _itemPayload(_ItemDraft item) {
    return {
      'shoeModel': item.model.text.trim(),
      'brand': item.brand.text.trim(),
      'services': [
        for (final service in item.services) {'id': service.id, 'name': service.name, 'price': service.price},
      ],
      'notes': _notesFor(item),
      'flowOptionIds': item.flow,
    };
  }

  Future<void> _upload(String id, int index, _ItemDraft item) async {
    final files = item.photos.where((photo) => photo.file != null).toList();
    if (files.isEmpty) return;
    files.sort((a, b) => (b.cover ? 1 : 0).compareTo(a.cover ? 1 : 0));
    final form = FormData();
    for (final photo in files) {
      form.files.add(MapEntry('photos', await MultipartFile.fromFile(photo.file!.path, filename: photo.file!.name)));
    }
    await widget.api.dio.post('/orders/$id/items/$index/photos', data: form);
  }

  String _notesFor(_ItemDraft item) {
    final base = item.notes.text.trim();
    final extras = [
      for (final service in item.services)
        if (service.noteField.text.trim().isNotEmpty) '${service.name}: ${service.noteField.text.trim()}',
    ];
    if (extras.isEmpty) return base;
    final block = extras.join(' · ');
    if (base.contains(block)) return base;
    return [base, block].where((part) => part.isNotEmpty).join('\n');
  }

  Future<void> _saveEdit(String id) async {
    await widget.api.dio.patch('/orders/$id', data: _header());
    final filled = filledItems;
    final known = filled.map((item) => item.serverIndex).whereType<int>().toSet();
    final remove = [for (var index = 0; index < serverItemCount; index++) if (!known.contains(index)) index]..sort((a, b) => b.compareTo(a));
    for (final index in remove) {
      await widget.api.dio.delete('/orders/$id/items/$index');
    }
    int shift(int original) => original - remove.where((index) => index < original).length;
    for (final item in filled) {
      var index = item.serverIndex == null ? -1 : shift(item.serverIndex!);
      if (index < 0) {
        final added = await widget.api.dio.post('/orders/$id/items', data: _itemPayload(item));
        final body = added.data is Map ? Map<String, dynamic>.from(added.data as Map) : <String, dynamic>{};
        final list = body['items'] is List ? body['items'] as List : const [];
        index = list.isEmpty ? 0 : list.length - 1;
      } else {
        await widget.api.dio.patch('/orders/$id/items/$index', data: _itemPayload(item));
        final doomed = item.removedPhotos.toList()..sort((a, b) => b.compareTo(a));
        for (final photoIndex in doomed) {
          await widget.api.dio.delete('/orders/$id/items/$index/photos/$photoIndex');
        }
      }
      if (item.photos.any((photo) => photo.file != null)) await _upload(id, index, item);
    }
  }

  Future<void> save({bool confirmed = false}) async {
    for (final item in items) {
      await commitBrand(item);
    }
    if (!mounted) return;
    final problem = validate();
    if (problem != null) {
      setState(() => error = problem);
      wqToast(context, problem);
      return;
    }
    if (!editing && !confirmed) {
      await _openConfirm();
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      late final String id;
      if (editing) {
        id = widget.orderId!;
        await _saveEdit(id);
      } else {
        final created = await widget.api.dio.post('/orders', data: {
          ..._header(),
          'items': [for (final item in filledItems) _itemPayload(item)],
          'photoCounts': [
            for (final item in filledItems) item.photos.where((photo) => photo.file != null).length,
          ],
        });
        final body = Map<String, dynamic>.from(created.data as Map);
        id = '${body['id'] ?? body['_id']}';
        final withPhotos = filledItems.asMap().entries.where((entry) => entry.value.photos.any((photo) => photo.file != null)).toList();
        if (withPhotos.isNotEmpty) {
          final api = widget.api;
          unawaited(() async {
            await Future.wait(withPhotos.map((entry) async {
              try {
                await _upload(id, entry.key, entry.value);
              } catch (_) {
                try {
                  await _upload(id, entry.key, entry.value);
                } catch (err) {
                  debugPrint('photo upload ${entry.key}: $err');
                }
              }
            }));
            try {
              await api.dio.post('/orders/$id/notify-created', data: {});
            } catch (err) {
              debugPrint('notify-created: $err');
            }
          }());
        }
      }
      if (!mounted) return;
      if (editing) {
        wqToast(context, 'Pedido atualizado');
        Navigator.of(context).pop(true);
      } else {
        final hasEmail = '${client?['email'] ?? ''}'.trim().isNotEmpty;
        final waitingPhotos = filledItems.any((item) => item.photos.any((photo) => photo.file != null));
        wqToast(
          context,
          waitingPhotos
              ? (hasEmail
                  ? 'Pedido criado. As fotos sobem agora e o e-mail sai em seguida.'
                  : 'Pedido criado. As fotos sobem agora.')
              : hasEmail
                  ? 'Pedido criado — e-mail a caminho'
                  : 'Pedido criado',
        );
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => SuccessScreen(api: widget.api, session: widget.session, orderId: id)));
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> _openConfirm() async {
    final missingPhoto = filledItems.any((item) => item.photos.isEmpty);
    final go = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Confirmar pedido', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('O pedido só entra no kanban depois desta confirmação.', style: TextStyle(color: ctx.wqMuted)),
            const SizedBox(height: 12),
            Text('${client?['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
            if ('${client?['phone'] ?? ''}'.isNotEmpty) Text('${client?['phone']}', style: TextStyle(color: ctx.wqMuted)),
            const SizedBox(height: 8),
            for (final entry in filledItems.asMap().entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _box(ctx, [
                  Text(filledItems.length > 1 ? 'Item ${entry.key + 1}' : 'Item', style: TextStyle(color: ctx.wqMuted, fontSize: 12)),
                  Text([entry.value.brand.text.trim(), entry.value.model.text.trim()].where((part) => part.isNotEmpty).join(' · '), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(entry.value.services.map((service) => service.name).join(', '), style: TextStyle(color: ctx.wqMuted)),
                  Text(
                    entry.value.photos.isEmpty ? 'Sem foto' : '${entry.value.photos.length} foto${entry.value.photos.length == 1 ? '' : 's'}',
                    style: TextStyle(color: entry.value.photos.isEmpty ? Wq.warn : ctx.wqMuted),
                  ),
                ]),
              ),
            Text('Prazo ${dayLabel(due.toIso8601String())}'),
            Text('Total ${brl(total)}', style: const TextStyle(fontWeight: FontWeight.w800)),
            if (missingPhoto)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Tem item sem foto. Pode criar assim e anexar depois.', style: TextStyle(color: Wq.warn)),
              ),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Wq.action, minimumSize: const Size.fromHeight(48)),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirmar e criar'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Voltar')),
          ]),
        ),
      ),
    );
    if (go == true && mounted) await save(confirmed: true);
  }

  void clearDraft() {
    for (final item in items) {
      item.dispose();
    }
    setState(() {
      client = null;
      clientQuery.clear();
      observations.clear();
      discountField.text = '0';
      warrantyField.text = '0';
      signalField.text = '0';
      warranty = false;
      signalKind = '50';
      priority = '2';
      due = _plusDays(15);
      accessories.clear();
      items
        ..clear()
        ..add(_ItemDraft());
      itemIndex = 0;
      error = null;
      _applyDefaultFlow();
    });
  }

  @override
  Widget build(BuildContext context) {
    final item = current;
    final query = clientQuery.text.trim().toLowerCase();
    final matches = query.isEmpty
        ? const <Map<String, dynamic>>[]
        : (remoteClients != null && remoteTerm == query
                ? remoteClients!
                : clients.where((row) => clientMatches(row, query)).toList())
            .take(8)
            .toList();
    final openSectors = sectors.where((row) => row['isTerminal'] != true).toList();
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(editing ? 'Editar pedido' : 'Novo pedido'),
          Text(editing ? 'Cliente, itens e pagamento' : '1 Cliente · 2 Item · 3 Pagamento', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ]),
        actions: [
          if (!editing) TextButton(onPressed: clearDraft, child: const Text('Limpar')),
        ],
      ),
      bottomNavigationBar: Material(
        color: context.wqSurface,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Total ${brl(total)} · Sinal ${brl(deposit)}', style: const TextStyle(fontWeight: FontWeight.w800)),
              Text('Falta ${brl(remaining)} · ${filledItems.isEmpty ? items.length : filledItems.length} ${filledItems.length == 1 ? 'item' : 'itens'}', style: TextStyle(color: context.wqMuted, fontSize: 12)),
              const SizedBox(height: 8),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Wq.action, minimumSize: const Size.fromHeight(48)),
                onPressed: saving || boot ? null : () => save(),
                child: Text(saving ? (editing ? 'Salvando…' : 'Criando…') : (editing ? 'Salvar alterações' : 'Criar pedido')),
              ),
            ]),
          ),
        ),
      ),
      body: boot
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(error!, style: const TextStyle(color: Wq.danger, fontWeight: FontWeight.w700))),
                _section(context, '1', 'Cliente', 'Nome e telefone. E-mail só se for enviar o laudo.', trailing: TextButton(onPressed: openNewClient, child: const Text('+ Novo'))),
                if (client != null)
                  _box(context, [
                    Row(children: [
                      Expanded(child: Text('${client!['name']}', style: const TextStyle(fontWeight: FontWeight.w800))),
                      TextButton(
                        onPressed: () => setState(() {
                          client = null;
                          clientQuery.clear();
                        }),
                        child: const Text('Trocar'),
                      ),
                    ]),
                    Text([client!['phone'], client!['email'], maskCpf('${client!['cpf']}')].where((part) => '$part'.isNotEmpty).join(' · '), style: TextStyle(color: context.wqMuted)),
                    if ('${client!['email']}'.isEmpty) Text('Sem e-mail — o laudo não sai sozinho.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                  ])
                else ...[
                  TextField(
                    controller: clientQuery,
                    decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Buscar por nome, telefone ou CPF'),
                    onChanged: (value) {
                      setState(() {});
                      searchClients(value);
                    },
                  ),
                  if (searchingClients) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Buscando na lista inteira…', style: TextStyle(color: context.wqMuted, fontSize: 12))),
                  if (query.isNotEmpty && matches.isEmpty && !searchingClients) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Nenhum cliente encontrado', style: TextStyle(color: context.wqMuted))),
                  for (final row in matches)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${row['name']}'),
                      subtitle: Text([row['phone'], maskCpf('${row['cpf']}')].where((part) => '$part'.isNotEmpty).join(' · ')),
                      onTap: () => setState(() {
                        client = row;
                        clientQuery.clear();
                      }),
                    ),
                ],
                const SizedBox(height: 18),
                _section(context, '2', 'Item', 'Marca, modelo, serviços, setores e fotos.', trailing: OutlinedButton.icon(onPressed: addItem, icon: const Icon(Icons.add), label: const Text('Item'))),
                if (items.length > 1)
                  SizedBox(
                    height: 42,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (_, index) {
                        final label = [items[index].brand.text.trim(), items[index].model.text.trim()].where((part) => part.isNotEmpty).join(' · ');
                        final selected = index == itemIndex;
                        return ChoiceChip(
                          label: Text(label.isEmpty ? 'Item ${index + 1}' : label),
                          selected: selected,
                          onSelected: (_) => setState(() => itemIndex = index),
                        );
                      },
                    ),
                  ),
                _box(context, [
                  Row(children: [
                    Expanded(child: Text('Item ${itemIndex + 1}${_itemTitle(item)}', style: const TextStyle(fontWeight: FontWeight.w800))),
                    if (items.length > 1) TextButton(onPressed: () => removeItem(itemIndex), child: const Text('Remover', style: TextStyle(color: Wq.danger))),
                  ]),
                  const SizedBox(height: 8),
                  TextField(
                    key: ValueKey('brand-$itemIndex'),
                    controller: item.brand,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Marca'),
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) => commitBrand(item),
                  ),
                  ..._brandSuggestions(item),
                  const SizedBox(height: 8),
                  TextField(key: ValueKey('model-$itemIndex'), controller: item.model, decoration: const InputDecoration(labelText: 'Modelo *')),
                  const SizedBox(height: 8),
                  TextField(key: ValueKey('notes-$itemIndex'), controller: item.notes, decoration: const InputDecoration(labelText: 'Observação')),
                  const SizedBox(height: 12),
                  const Text('Serviços', style: TextStyle(fontWeight: FontWeight.w700)),
                  if (services.isEmpty) Text('Nenhum serviço no catálogo.', style: TextStyle(color: context.wqMuted)),
                  for (final service in services) _serviceTile(item, service),
                  for (final pick in item.services) ...[
                    const SizedBox(height: 8),
                    _box(context, [
                      Text(pick.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      TextField(
                        controller: pick.noteField,
                        decoration: const InputDecoration(labelText: 'Obs. do serviço'),
                      ),
                      TextField(
                        key: ValueKey('price-${pick.id}-$itemIndex'),
                        controller: pick.priceField,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Preço'),
                        onChanged: (value) => setState(() => pick.price = _money(value)),
                      ),
                    ]),
                  ],
                  const SizedBox(height: 12),
                  Text('PARTIDA DESTE ITEM', style: TextStyle(color: Wq.brand, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
                  Text('Setores só deste item. O setor final entra sozinho.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final sector in openSectors)
                      FilterChip(
                        label: Text('${sector['name']}${_hinted(item, sector) && !_onFlow(item, sector) ? ' · sug.' : ''}'),
                        selected: _onFlow(item, sector),
                        onSelected: (_) => toggleFlow(item, sector),
                      ),
                  ]),
                  const SizedBox(height: 12),
                  Text('Fotos deste item', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('Só deste modelo · máx. $_maxPhotos', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(onPressed: () => addPhotos(item, ImageSource.camera), icon: const Icon(Icons.photo_camera_outlined), label: const Text('Tirar foto')),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(onPressed: () => addPhotos(item, ImageSource.gallery), icon: const Icon(Icons.photo_library_outlined), label: const Text('Adicionar da galeria')),
                  if (item.photos.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8),
                      itemCount: item.photos.length,
                      itemBuilder: (_, index) => _photoTile(item, index),
                    ),
                  ],
                ]),
                const SizedBox(height: 18),
                _section(context, '', 'Acessórios', 'O que veio junto. Pode pular.'),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final name in {...accessoryCatalog, ...accessories})
                    FilterChip(label: Text(name), selected: accessories.contains(name), onSelected: (on) => setState(() => on ? accessories.add(name) : accessories.remove(name))),
                ]),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: TextField(controller: accessoryDraft, decoration: const InputDecoration(labelText: 'Outro acessório'), onSubmitted: (_) => addAccessory())),
                  const SizedBox(width: 8),
                  OutlinedButton(onPressed: addAccessory, child: const Text('Adicionar')),
                ]),
                const SizedBox(height: 18),
                _section(context, '3', 'Pagamento', 'Prazo, sinal e garantia. O total sai dos serviços.'),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: warranty,
                  onChanged: (value) => setState(() => warranty = value),
                  title: const Text('Garantia de 3 meses'),
                  subtitle: const Text('Opcional'),
                ),
                if (warranty) TextField(controller: warrantyField, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Preço da garantia (R\$)'), onChanged: (_) => setState(() {})),
                const SizedBox(height: 8),
                TextField(controller: discountField, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Desconto (R\$)'), onChanged: (_) => setState(() {})),
                const SizedBox(height: 8),
                _box(context, [
                  Text('Soma dos serviços: ${brl(servicesSum)}', style: TextStyle(color: context.wqMuted)),
                  if (warranty) Text('Garantia (3 meses): ${brl(warrantyPrice)}', style: TextStyle(color: context.wqMuted)),
                  Text('Subtotal: ${brl(subtotal)}', style: TextStyle(color: context.wqMuted)),
                  if (discount > 0) Text('Desconto: − ${brl(discount)}', style: TextStyle(color: context.wqMuted)),
                  Text('Total: ${brl(total)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                ]),
                const SizedBox(height: 8),
                const Text('Valor de sinal', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(spacing: 8, children: [
                  ChoiceChip(label: const Text('50% do total'), selected: signalKind == '50', onSelected: (_) => setState(() => signalKind = '50')),
                  ChoiceChip(label: const Text('100% à vista'), selected: signalKind == '100', onSelected: (_) => setState(() => signalKind = '100')),
                  ChoiceChip(label: const Text('Outro valor'), selected: signalKind == 'custom', onSelected: (_) => setState(() => signalKind = 'custom')),
                ]),
                const SizedBox(height: 8),
                if (signalKind == 'custom')
                  TextField(controller: signalField, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Sinal (R\$)'), onChanged: (_) => setState(() {}))
                else
                  Text('Sinal ${brl(deposit)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                _box(context, [
                  Text(brl(remaining), textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  Text(total > 0 && deposit >= total ? 'Pago' : 'Na entrega', textAlign: TextAlign.center, style: TextStyle(color: context.wqMuted)),
                ]),
                const SizedBox(height: 12),
                Text('Data prevista *', style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () async {
                    final picked = await showDatePicker(context: context, initialDate: due, firstDate: DateTime.now().subtract(const Duration(days: 1)), lastDate: DateTime.now().add(const Duration(days: 365)));
                    if (picked != null) setState(() => due = DateTime(picked.year, picked.month, picked.day));
                  },
                  child: Text(dayLabel(due.toIso8601String())),
                ),
                const SizedBox(height: 8),
                Wrap(spacing: 8, children: [
                  for (final days in const [15, 30, 40])
                    ChoiceChip(
                      label: Text('+$days dias'),
                      selected: _iso(due) == _iso(_plusDays(days)),
                      onSelected: (_) => setState(() => due = _plusDays(days)),
                    ),
                ]),
                const SizedBox(height: 12),
                const Text('Prioridade', style: TextStyle(fontWeight: FontWeight.w700)),
                Text('Se não informar, fica Média (II).', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  ChoiceChip(label: const Text('Alta · urgente'), selected: priority == '1', onSelected: (_) => setState(() => priority = '1')),
                  ChoiceChip(label: const Text('Média · normal'), selected: priority == '2', onSelected: (_) => setState(() => priority = '2')),
                  ChoiceChip(label: const Text('Baixa · sem pressa'), selected: priority == '3', onSelected: (_) => setState(() => priority = '3')),
                ]),
                const SizedBox(height: 12),
                TextField(controller: observations, maxLines: 3, decoration: const InputDecoration(labelText: 'Observações gerais')),
              ],
            ),
    );
  }

  String _itemTitle(_ItemDraft item) {
    final title = [item.brand.text.trim(), item.model.text.trim()].where((part) => part.isNotEmpty).join(' · ');
    return title.isEmpty ? '' : ' · $title';
  }

  bool _onFlow(_ItemDraft item, Map<String, dynamic> sector) {
    final key = '${sector['slug'] ?? ''}';
    final id = '${sector['id'] ?? ''}';
    return item.flow.contains(key) || item.flow.contains(id);
  }

  bool _hinted(_ItemDraft item, Map<String, dynamic> sector) {
    for (final pick in item.services) {
      final service = services.cast<Map<String, dynamic>?>().where((row) => '${row!['id'] ?? row['_id'] ?? row['name']}' == pick.id);
      if (service.isEmpty) continue;
      final hints = service.first!['sectorPathHint'];
      if (hints is List && hints.any((hint) => '$hint' == '${sector['id']}' || '$hint' == '${sector['slug']}')) return true;
    }
    return false;
  }

  List<Widget> _brandSuggestions(_ItemDraft item) {
    final query = item.brand.text.trim().toLowerCase();
    if (query.isEmpty) return const [];
    final matches = brands.where((row) => '${row['name']}'.toLowerCase().contains(query)).take(6).toList();
    final exact = brands.any((row) => '${row['name']}'.toLowerCase() == query);
    return [
      for (final row in matches)
        ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          title: Text('${row['name']}'),
          onTap: () => setState(() => item.brand.text = '${row['name']}'),
        ),
      if (!exact)
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(onPressed: () => openBrand(item), child: Text('Cadastrar “${item.brand.text.trim()}”')),
        ),
    ];
  }

  Widget _serviceTile(_ItemDraft item, Map<String, dynamic> service) {
    final id = '${service['id'] ?? service['_id'] ?? service['name']}';
    final selected = item.services.any((pick) => pick.id == id);
    final price = double.tryParse('${service['defaultPrice'] ?? service['price'] ?? 0}') ?? 0;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Material(
        color: selected ? Wq.brand.withValues(alpha: 0.12) : context.wqPaper,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: selected ? Wq.brand : context.wqLine)),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => toggleService(item, service, !selected),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(children: [
              Icon(selected ? Icons.check_box : Icons.check_box_outline_blank, color: selected ? Wq.brand : context.wqMuted),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${service['name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(brl(price), style: TextStyle(color: context.wqMuted, fontSize: 12)),
              ])),
            ]),
          ),
        ),
      ),
    );
  }

  void _removePhoto(_ItemDraft item, int index) {
    final photo = item.photos[index];
    if (photo.serverPhotoIndex != null) item.removedPhotos.add(photo.serverPhotoIndex!);
    setState(() => item.photos.removeAt(index));
  }

  Widget _photoButton(IconData icon, VoidCallback onTap, {bool on = false}) {
    return Material(
      color: on ? Wq.brand : const Color(0xCC0F172A),
      shape: const CircleBorder(),
      child: InkWell(customBorder: const CircleBorder(), onTap: onTap, child: Padding(padding: const EdgeInsets.all(4), child: Icon(icon, size: 16, color: Colors.white))),
    );
  }

  Widget _photoTile(_ItemDraft item, int index) {
    final photo = item.photos[index];
    final image = photo.file != null
        ? Image.file(File(photo.file!.path), fit: BoxFit.cover)
        : Image.network(fileUrl(photo.url ?? ''), fit: BoxFit.cover);
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Stack(fit: StackFit.expand, children: [
        image,
        Positioned(
          left: 4,
          top: 4,
          child: index == 0
              ? const SizedBox.shrink()
              : _photoButton(Icons.chevron_left, () => setState(() {
                    final moved = item.photos.removeAt(index);
                    item.photos.insert(index - 1, moved);
                  })),
        ),
        Positioned(
          right: 4,
          top: 4,
          child: _photoButton(Icons.close, () => _removePhoto(item, index)),
        ),
        Positioned(
          left: 4,
          bottom: 4,
          child: _photoButton(photo.cover ? Icons.star : Icons.star_border, () => setState(() {
                for (final other in item.photos) {
                  other.cover = false;
                }
                photo.cover = true;
              }), on: photo.cover),
        ),
      ]),
    );
  }

  Widget _section(BuildContext context, String step, String title, String hint, {Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (step.isNotEmpty)
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: Wq.brand, shape: BoxShape.circle),
            child: Text(step, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
          ),
        if (step.isNotEmpty) const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.wqInk)),
          Text(hint, style: TextStyle(color: context.wqMuted, fontSize: 12)),
        ])),
        ?trailing,
      ]),
    );
  }

  Widget _box(BuildContext context, List<Widget> children) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: context.wqPaper, borderRadius: BorderRadius.circular(10), border: Border.all(color: context.wqLine)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
    );
  }
}
