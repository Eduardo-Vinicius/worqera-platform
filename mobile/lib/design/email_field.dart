import 'package:flutter/material.dart';

import '../brand/theme.dart';

final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

bool isEmail(String value) => emailPattern.hasMatch(value.trim().toLowerCase());

const _known = [
  'gmail.com',
  'hotmail.com',
  'hotmail.com.br',
  'outlook.com',
  'outlook.com.br',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.com.br',
  'icloud.com',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
  'globo.com',
  'ig.com.br',
];

const _direct = {
  'gmail.com.br': 'gmail.com',
  'gmail.br': 'gmail.com',
  'icloud.com.br': 'icloud.com',
  'uol.com': 'uol.com.br',
  'bol.com': 'bol.com.br',
};

int _distance(String a, String b) {
  final row = List<int>.generate(b.length + 1, (i) => i);
  for (var i = 1; i <= a.length; i++) {
    var prev = row[0];
    row[0] = i;
    for (var j = 1; j <= b.length; j++) {
      final keep = row[j];
      final cost = a[i - 1] == b[j - 1] ? 0 : 1;
      row[j] = [row[j] + 1, row[j - 1] + 1, prev + cost].reduce((x, y) => x < y ? x : y);
      prev = keep;
    }
  }
  return row[b.length];
}

/// "ana@gmial.con" → "ana@gmail.com" (same rule as the site). Null when the domain looks right or is unknown.
String? suggestEmail(String value) {
  final email = value.trim().toLowerCase();
  final at = email.lastIndexOf('@');
  if (at < 1 || at == email.length - 1) return null;
  final local = email.substring(0, at);
  final domain = email.substring(at + 1);
  if (_known.contains(domain)) return null;
  final direct = _direct[domain];
  if (direct != null) return '$local@$direct';
  String? best;
  var bestDistance = 3;
  for (final known in _known) {
    final d = _distance(domain, known);
    if (d < bestDistance) {
      best = known;
      bestDistance = d;
    }
  }
  return best == null ? null : '$local@$best';
}

/// E-mail field that warns about a missing @/domain and offers the fix for common typos.
class EmailField extends StatefulWidget {
  const EmailField({super.key, required this.controller, this.label = 'E-mail', this.autofocus = false, this.onChanged});
  final TextEditingController controller;
  final String label;
  final bool autofocus;
  final VoidCallback? onChanged;
  @override
  State<EmailField> createState() => _EmailFieldState();
}

class _EmailFieldState extends State<EmailField> {
  @override
  Widget build(BuildContext context) {
    final typed = widget.controller.text.trim();
    final fix = typed.isEmpty ? null : suggestEmail(typed);
    final invalid = typed.isNotEmpty && fix == null && !isEmail(typed);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      TextField(
        controller: widget.controller,
        autofocus: widget.autofocus,
        keyboardType: TextInputType.emailAddress,
        autocorrect: false,
        textCapitalization: TextCapitalization.none,
        decoration: InputDecoration(labelText: widget.label, errorText: invalid ? 'Falta o @ ou o domínio (ex.: nome@gmail.com)' : null),
        onChanged: (_) {
          setState(() {});
          widget.onChanged?.call();
        },
      ),
      if (fix != null)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: [
            Text('Você quis dizer $fix?', style: const TextStyle(fontSize: 12, color: Wq.warn)),
            TextButton(
              onPressed: () {
                widget.controller.text = fix;
                setState(() {});
                widget.onChanged?.call();
              },
              child: const Text('Usar este'),
            ),
          ]),
        ),
    ]);
  }
}
