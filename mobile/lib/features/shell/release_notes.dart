import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../brand/theme.dart';
import '../../brand/tokens.dart';

const _box = FlutterSecureStorage();
const _seenKey = 'wq-release-seen';

/// Notícia com `display: modal`: quadro de Novidades com tour, uma vez por aparelho.
Future<void> showReleaseNotesIfAny(
  BuildContext context,
  List notices, {
  required void Function(String href) onOpen,
}) async {
  final seen = ((await _box.read(key: _seenKey)) ?? '').split(',').where((s) => s.isNotEmpty).toSet();
  Map? notice;
  for (final n in notices.whereType<Map>()) {
    if (n['display'] == 'modal' && !seen.contains('${n['id']}')) {
      notice = n;
      break;
    }
  }
  if (notice == null || !context.mounted) return;
  seen.add('${notice['id']}');
  await _box.write(key: _seenKey, value: seen.join(','));
  if (!context.mounted) return;
  final href = await showDialog<String>(
    context: context,
    builder: (_) => _ReleaseNotesDialog(notice: notice!),
  );
  if (href != null && href.isNotEmpty) onOpen(href);
}

class _ReleaseNotesDialog extends StatefulWidget {
  const _ReleaseNotesDialog({required this.notice});
  final Map notice;

  @override
  State<_ReleaseNotesDialog> createState() => _ReleaseNotesDialogState();
}

class _ReleaseNotesDialogState extends State<_ReleaseNotesDialog> {
  int step = 0;

  @override
  Widget build(BuildContext context) {
    final steps = ((widget.notice['steps'] as List?) ?? const []).whereType<Map>().toList();
    final current = step > 0 ? steps[step - 1] : null;
    final title = '${current?['title'] ?? widget.notice['title'] ?? 'Novidades'}';
    final body = '${current?['body'] ?? widget.notice['body'] ?? ''}';
    final href = '${current?['href'] ?? ''}';
    return Dialog(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(colors: [WqTokens.brandDeep, WqTokens.brand, WqTokens.action], begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(999)),
              child: Text(
                steps.isEmpty ? 'NOVIDADES' : step == 0 ? 'NOVIDADES · INÍCIO' : 'NOVIDADES · $step DE ${steps.length}',
                style: const TextStyle(color: Colors.white, fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 22, height: 1.15, fontWeight: FontWeight.w800, letterSpacing: -0.4)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(body, style: TextStyle(fontSize: 15, height: 1.45, color: context.wqInk)),
            if (step == 0 && steps.isNotEmpty) ...[
              const SizedBox(height: 12),
              for (var i = 0; i < steps.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: InkWell(
                    onTap: () => setState(() => step = i + 1),
                    borderRadius: BorderRadius.circular(10),
                    child: Row(children: [
                      CircleAvatar(radius: 12, backgroundColor: Wq.brand.withValues(alpha: 0.14), child: Text('${i + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Wq.brand))),
                      const SizedBox(width: 10),
                      Expanded(child: Text('${steps[i]['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600))),
                    ]),
                  ),
                ),
            ],
            if (href.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, href),
                  child: Text('${current?['cta'] ?? ''}'.isEmpty ? 'Ver agora' : '${current?['cta']}'),
                ),
              ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
          child: Row(children: [
            if (step > 0)
              TextButton(onPressed: () => setState(() => step -= 1), child: const Text('Voltar'))
            else
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Depois')),
            const Spacer(),
            if (step < steps.length)
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                onPressed: () => setState(() => step += 1),
                child: Text(step == 0 ? 'Fazer o tour' : 'Próximo'),
              )
            else
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Wq.action, minimumSize: const Size(0, 44)),
                onPressed: () => Navigator.pop(context),
                child: const Text('Entendi'),
              ),
          ]),
        ),
      ]),
    );
  }
}
