import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/motion.dart';
import '../../design/ui.dart';

/// Label sizes (mm). Same ids as the site and the API (`Shop.labelSettings.size`).
const labelSizes = <String, (String, String, double, double)>{
  '60x40': ('Térmica 60 × 40 mm', 'A mais comum. Elgin, Zebra, Argox.', 60, 40),
  '50x30': ('Térmica 50 × 30 mm', 'Pequena: código, cliente e QR.', 50, 30),
  '100x50': ('Térmica 100 × 50 mm', 'Grande, letra maior.', 100, 50),
  '62x40': ('Brother QL · rolo 62 mm', 'QL-820NWB imprime pelo iPhone (AirPrint).', 62, 40),
  'a4': ('Folha A4', 'Impressora comum. Até 8 por folha, para recortar.', 90, 55),
};

class LabelSettings {
  const LabelSettings({required this.size, required this.perItem});
  final String size;
  final bool perItem;

  factory LabelSettings.fromShop(Map? shop) {
    final raw = shop?['labelSettings'] is Map ? shop!['labelSettings'] as Map : const {};
    final size = labelSizes.containsKey('${raw['size']}') ? '${raw['size']}' : 'a4';
    return LabelSettings(size: size, perItem: raw['perItem'] == true);
  }
}

/// ask | auto | off. Per device: the counter phone prints, the owner's does not need to.
class LabelAfterCreate {
  static const _box = FlutterSecureStorage();
  static const _key = 'wq-label-after-create';

  static Future<String> read() async {
    final v = await _box.read(key: _key);
    return v == 'auto' || v == 'off' ? v! : 'ask';
  }

  static Future<void> write(String value) => _box.write(key: _key, value: value);
}

class LabelJob {
  const LabelJob({required this.brand, required this.code, required this.client, required this.detail, required this.url, this.services = '', this.due = ''});
  final String brand;
  final String code;
  final String client;
  /// Item brand + model (or "2 tênis · …" for the whole order).
  final String detail;
  final String url;
  /// "Higienização + Pintura da sola".
  final String services;
  /// "Entrega 12/11".
  final String due;
}

String _itemName(Map item) {
  final brand = '${item['brand'] ?? ''}'.trim();
  final model = '${item['shoeModel'] ?? ''}'.trim();
  if (brand.isNotEmpty && model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return [brand, model].where((s) => s.isNotEmpty).join(' ');
}

String _serviceNames(List<Map> items) {
  final names = <String>{};
  for (final item in items) {
    for (final s in ((item['services'] as List?) ?? const []).whereType<Map>()) {
      final name = '${s['name'] ?? s['nome'] ?? ''}'.trim();
      if (name.isNotEmpty) names.add(name);
    }
  }
  return names.join(' + ');
}

/// First + last name: fits the label and is enough to find the customer.
String _shortName(String full) {
  final parts = full.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  return parts.length > 2 ? '${parts.first} ${parts.last}' : parts.join(' ');
}

String _dueLabel(dynamic raw) {
  final d = DateTime.tryParse('${raw ?? ''}')?.toLocal();
  if (d == null) return '';
  String two(int n) => n.toString().padLeft(2, '0');
  return 'Entrega ${two(d.day)}/${two(d.month)}';
}

String _brandOf(Map? shop) {
  final branding = shop?['branding'] is Map ? shop!['branding'] as Map : const {};
  final name = '${branding['displayName'] ?? ''}'.trim();
  return name.isNotEmpty ? name : '${shop?['name'] ?? ''}'.trim();
}

List<LabelJob> buildLabelJobs(Map order, Map? shop, {required String slug, required bool perItem}) {
  final code = '${order['code'] ?? ''}';
  final token = '${order['publicToken'] ?? ''}';
  final url = publicOrderUrl(slug: slug, code: code, token: token);
  if (code.isEmpty || url.isEmpty) return const [];
  final brand = _brandOf(shop);
  final client = _shortName('${order['clientName'] ?? ''}');
  final due = _dueLabel(order['dueAt']);
  final branding = shop?['branding'] is Map ? shop!['branding'] as Map : const {};
  final singular = '${branding['itemLabel'] ?? ''}'.trim().isEmpty ? 'peça' : '${branding['itemLabel']}'.trim();
  final plural = '${branding['itemLabelPlural'] ?? ''}'.trim().isEmpty ? 'peças' : '${branding['itemLabelPlural']}'.trim();
  final items = ((order['items'] as List?) ?? const []).whereType<Map>().toList();
  final count = items.isEmpty ? 1 : items.length;
  if (!perItem || items.length < 2) {
    final names = items.map(_itemName).where((s) => s.isNotEmpty).toList();
    final head = '$count ${count == 1 ? singular : plural}';
    final detail = items.length == 1 ? (names.isEmpty ? head : names.first) : (names.isEmpty ? head : '$head · ${names.join(', ')}');
    return [LabelJob(brand: brand, code: code, client: client, detail: detail, services: _serviceNames(items), due: due, url: url)];
  }
  return [
    for (var i = 0; i < items.length; i++)
      LabelJob(
        brand: brand,
        code: '$code-${i + 1}',
        client: client,
        detail: _itemName(items[i]).isEmpty ? '${singular[0].toUpperCase()}${singular.substring(1)} ${i + 1}' : _itemName(items[i]),
        services: _serviceNames([items[i]]),
        due: due,
        url: publicOrderUrl(slug: slug, code: code, token: token, item: i + 1),
      ),
  ];
}

/// Black only (thermal), one page per label sized to the roll; A4 = grid for cutting.
pw.Document labelsPdf(List<LabelJob> jobs, String size) {
  final spec = labelSizes[size] ?? labelSizes['a4']!;
  final w = spec.$3, h = spec.$4;
  final sheet = size == 'a4';
  final pad = sheet ? 4.0 : 2.0;
  final qrMax = w * (sheet ? 0.45 : 0.4);
  final qr = (h - pad * 2) < qrMax ? (h - pad * 2) : qrMax;
  final roomy = size != '50x30';
  final textW = w - pad * 2 - qr - 2;
  final scale = h / 40;
  const mm = PdfPageFormat.mm;
  final mono = pw.Font.courierBold();

  pw.Widget card(LabelJob job) {
    final len = job.code.length < 4 ? 4 : job.code.length;
    final byWidth = textW * 2.835 / (len * 0.62);
    final codePt = byWidth < 22 * scale ? byWidth : 22 * scale;
    pw.Widget line(String text, double pt, {bool bold = false, int lines = 1}) => pw.Text(
          text,
          maxLines: lines,
          overflow: pw.TextOverflow.clip,
          style: pw.TextStyle(fontSize: pt, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal),
        );
    return pw.Container(
      width: w * mm,
      height: h * mm,
      padding: pw.EdgeInsets.all(pad * mm),
      decoration: sheet ? pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey600, width: 0.6, style: pw.BorderStyle.dashed)) : null,
      child: pw.Row(crossAxisAlignment: pw.CrossAxisAlignment.center, children: [
        pw.BarcodeWidget(barcode: pw.Barcode.qrCode(), data: job.url, width: qr * mm, height: qr * mm, drawText: false),
        pw.SizedBox(width: 2 * mm),
        pw.Expanded(
          child: pw.Column(mainAxisAlignment: pw.MainAxisAlignment.center, crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
            if (job.brand.isNotEmpty) line(job.brand.toUpperCase(), 6 * scale),
            pw.SizedBox(height: 0.6 * scale * mm),
            pw.Text(job.code, maxLines: 1, style: pw.TextStyle(font: mono, fontSize: codePt)),
            pw.SizedBox(height: 0.6 * scale * mm),
            if (job.client.isNotEmpty) line(job.client, 8.5 * scale, bold: true),
            if (job.detail.isNotEmpty) line(job.detail, 7.5 * scale, bold: true, lines: roomy ? 2 : 1),
            if (roomy && job.services.isNotEmpty) line(job.services, 6.5 * scale, lines: 2),
            if (job.due.isNotEmpty)
              pw.Container(
                margin: pw.EdgeInsets.only(top: 0.6 * scale * mm),
                padding: const pw.EdgeInsets.symmetric(horizontal: 1.2 * mm, vertical: 0.3 * mm),
                decoration: pw.BoxDecoration(border: pw.Border.all(width: 0.8), borderRadius: const pw.BorderRadius.all(pw.Radius.circular(0.8 * mm))),
                child: pw.Text(job.due, style: pw.TextStyle(fontSize: 7 * scale, fontWeight: pw.FontWeight.bold)),
              ),
          ]),
        ),
      ]),
    );
  }

  final doc = pw.Document();
  if (sheet) {
    doc.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4.copyWith(marginLeft: 10 * mm, marginRight: 10 * mm, marginTop: 10 * mm, marginBottom: 10 * mm),
      build: (_) => [pw.Wrap(spacing: 4 * mm, runSpacing: 4 * mm, children: jobs.map(card).toList())],
    ));
  } else {
    final format = PdfPageFormat(w * mm, h * mm, marginAll: 0);
    for (final job in jobs) {
      doc.addPage(pw.Page(pageFormat: format, build: (_) => card(job)));
    }
  }
  return doc;
}

Future<Map?> _currentShop(WorqeraApi api) async {
  final res = await api.dio.get('/shops/current');
  final body = Map<String, dynamic>.from(res.data as Map);
  return body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : body;
}

/// Order → labels in the shop's size, to the system print dialog (AirPrint / Android print service).
Future<void> printOrderLabels(WorqeraApi api, Map order, {Map? shop, required String slug, bool? perItem}) async {
  final doc = shop ?? await _currentShop(api);
  final settings = LabelSettings.fromShop(doc);
  final shopSlug = '${doc?['slug'] ?? ''}'.isNotEmpty ? '${doc!['slug']}' : slug;
  final jobs = buildLabelJobs(order, doc, slug: shopSlug, perItem: perItem ?? settings.perItem);
  if (jobs.isEmpty) throw Exception('Pedido sem código para a etiqueta.');
  final pdf = labelsPdf(jobs, settings.size);
  final format = settings.size == 'a4' ? PdfPageFormat.a4 : PdfPageFormat(labelSizes[settings.size]!.$3 * PdfPageFormat.mm, labelSizes[settings.size]!.$4 * PdfPageFormat.mm);
  await Printing.layoutPdf(onLayout: (_) => pdf.save(), name: 'etiqueta-${order['code'] ?? ''}.pdf', format: format);
}

class LabelSettingsScreen extends StatefulWidget {
  const LabelSettingsScreen({super.key, required this.api});
  final WorqeraApi api;

  @override
  State<LabelSettingsScreen> createState() => _LabelSettingsScreenState();
}

class _LabelSettingsScreenState extends State<LabelSettingsScreen> {
  Map? shop;
  String size = 'a4';
  bool perItem = false;
  String afterCreate = 'ask';
  bool saving = false;
  String? error;

  @override
  void initState() {
    super.initState();
    LabelAfterCreate.read().then((v) {
      if (mounted) setState(() => afterCreate = v);
    });
    _currentShop(widget.api).then((doc) {
      if (!mounted) return;
      final s = LabelSettings.fromShop(doc);
      setState(() {
        shop = doc;
        size = s.size;
        perItem = s.perItem;
      });
    }).catchError((Object e) {
      if (mounted) setState(() => error = widget.api.message(e));
    });
  }

  Future<void> save({String? nextSize, bool? nextPerItem}) async {
    final prev = (size, perItem);
    setState(() {
      saving = true;
      if (nextSize != null) size = nextSize;
      if (nextPerItem != null) perItem = nextPerItem;
    });
    try {
      await widget.api.dio.patch('/shops/current', data: {'labelSettings': {'size': size, 'perItem': perItem}});
      shop = {...?shop, 'labelSettings': {'size': size, 'perItem': perItem}};
      successHaptic();
    } catch (e) {
      setState(() {
        size = prev.$1;
        perItem = prev.$2;
      });
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> test() async {
    final pdf = labelsPdf([
      LabelJob(
        brand: _brandOf(shop).isEmpty ? 'Sua empresa' : _brandOf(shop),
        code: '00042',
        client: 'Cliente teste',
        detail: 'Nike Air Force 1',
        services: 'Higienização + Pintura da sola',
        due: 'Entrega 12/11',
        url: 'https://worqera.com/p/o/teste',
      ),
    ], size);
    await Printing.layoutPdf(onLayout: (_) => pdf.save(), name: 'etiqueta-teste.pdf');
  }

  Widget choice(String title, String hint, bool selected, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: WqCard(
          onTap: onTap,
          child: Row(children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? Wq.brand : context.wqMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(hint, style: TextStyle(color: context.wqMuted, fontSize: 12)),
              ]),
            ),
          ]),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Etiqueta e impressora',
      subtitle: 'O QR colado no item',
      actions: [IconButton(tooltip: 'Imprimir teste', onPressed: test, icon: const Icon(Icons.print_outlined))],
      child: error != null
          ? Center(child: Text(error!))
          : shop == null
              ? const SkeletonList(count: 4)
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  children: [
                    const WqSectionTitle('Tamanho da etiqueta'),
                    for (final e in labelSizes.entries)
                      choice(e.key == '60x40' ? '${e.value.$1} · recomendada' : e.value.$1, e.value.$2, size == e.key, () {
                        if (!saving && size != e.key) save(nextSize: e.key);
                      }),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Uma etiqueta por item'),
                      subtitle: const Text('Cada item sai com o próprio código (código-1, código-2…) e QR.'),
                      value: perItem,
                      onChanged: saving ? null : (v) => save(nextPerItem: v),
                    ),
                    const SizedBox(height: 12),
                    const WqSectionTitle('Ao criar o pedido · neste aparelho'),
                    for (final opt in const [
                      ('ask', 'Perguntar', 'Aparece "Imprimir a etiqueta agora?".'),
                      ('auto', 'Imprimir direto', 'A impressão abre sozinha ao criar o pedido.'),
                      ('off', 'Não imprimir', 'Para aparelhos sem impressora.'),
                    ])
                      choice(opt.$2, opt.$3, afterCreate == opt.$1, () {
                        setState(() => afterCreate = opt.$1);
                        LabelAfterCreate.write(opt.$1);
                        tapHaptic();
                      }),
                    const SizedBox(height: 12),
                    WqCard(
                      child: Text(
                        'Qual impressora: térmica de etiqueta (sem tinta) com rolo adesivo 60 × 40 mm, como Elgin L42 Pro ou Zebra ZD220, '
                        'no computador do balcão. Para imprimir do celular, ela precisa aparecer na impressão do sistema: AirPrint no iPhone '
                        '(Brother QL-820NWB) ou o plugin de impressão do fabricante no Android. Mini impressoras Bluetooth só imprimem pelo app delas.',
                        style: TextStyle(color: context.wqMuted),
                      ),
                    ),
                  ],
                ),
    );
  }
}
