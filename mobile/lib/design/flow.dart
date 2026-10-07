import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';

void wqToast(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

String publicOrderUrl({required String slug, required String code, String? token, int? item}) {
  final secret = (token ?? '').trim();
  if (secret.isEmpty) return '';
  final query = item == null ? '' : '?item=$item';
  return 'https://worqera.com/p/o/${Uri.encodeComponent(secret)}$query';
}

String fileUrl(String raw) {
  if (raw.isEmpty || raw == 'null') return '';
  if (raw.startsWith('http')) return raw;
  final origin = AppConfig.apiBase.replaceFirst(RegExp(r'/api/v1/?$'), '');
  if (raw.startsWith('/')) return '$origin$raw';
  return '${AppConfig.apiBase}/$raw';
}

/// Lista: só os dois últimos dígitos. A ficha de edição continua com o número inteiro.
String maskCpf(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 2) return '';
  return 'CPF •••${digits.substring(digits.length - 2)}';
}

String foldText(String raw) {
  const from = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
  const to = 'aaaaaeeeeiiiiooooouuuucn';
  final buffer = StringBuffer();
  for (final rune in raw.toLowerCase().runes) {
    final char = String.fromCharCode(rune);
    final index = from.indexOf(char);
    buffer.write(index >= 0 ? to[index] : char);
  }
  return buffer.toString();
}

bool clientMatches(Map row, String query) {
  final term = query.trim().toLowerCase();
  if (term.isEmpty) return true;
  final name = foldText('${row['nomeCompleto'] ?? row['name'] ?? ''}');
  final email = '${row['email'] ?? ''}'.toLowerCase();
  final phone = '${row['telefone'] ?? row['phone'] ?? ''}';
  final cpf = '${row['cpf'] ?? ''}';
  final digits = term.replaceAll(RegExp(r'\D'), '');
  final phoneDigits = phone.replaceAll(RegExp(r'\D'), '');
  final cpfDigits = cpf.replaceAll(RegExp(r'\D'), '');
  return name.contains(foldText(term)) ||
      email.contains(term) ||
      phone.toLowerCase().contains(term) ||
      cpf.toLowerCase().contains(term) ||
      (digits.isNotEmpty && (phoneDigits.contains(digits) || cpfDigits.contains(digits)));
}

String maskPhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return '(${digits.substring(0, 2)}) ${digits.substring(2)}';
  if (digits.length <= 10) return '(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}';
  final cut = digits.substring(0, 11);
  return '(${cut.substring(0, 2)}) ${cut.substring(2, 7)}-${cut.substring(7)}';
}

String waMeUrl(String phone, String text) {
  var digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 10 || digits.length == 11) digits = '55$digits';
  if (digits.length < 12) return '';
  return 'https://wa.me/$digits?text=${Uri.encodeComponent(text)}';
}

Future<void> openLink(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

TextStyle monoStyle({double size = 16, FontWeight weight = FontWeight.w700, Color? color}) {
  return GoogleFonts.jetBrainsMono(fontSize: size, fontWeight: weight, color: color);
}

int pairCount(Map row) {
  final listed = row['itemCount'] ?? row['items'];
  if (listed is List) return listed.length;
  return int.tryParse('$listed') ?? 0;
}

class ModuleFlags extends ChangeNotifier {
  Map<String, bool> services = {};

  bool on(String key) => services.isEmpty || services[key] != false;

  void apply(Map body) {
    final raw = body['services'];
    if (raw is Map) {
      services = raw.map((key, value) => MapEntry('$key', value == true));
      notifyListeners();
    }
  }
}
