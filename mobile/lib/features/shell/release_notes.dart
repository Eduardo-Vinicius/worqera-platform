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
  final href = await showGeneralDialog<String>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Fechar',
    barrierColor: Colors.black.withValues(alpha: 0.5),
    transitionDuration: const Duration(milliseconds: 380),
    pageBuilder: (_, _, _) => _ReleaseNotesDialog(notice: notice!),
    transitionBuilder: (_, animation, _, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutBack, reverseCurve: Curves.easeIn);
      return FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
        child: ScaleTransition(scale: Tween(begin: 0.9, end: 1.0).animate(curved), child: child),
      );
    },
  );
  if (href != null && href.isNotEmpty) onOpen(href);
}

class _ReleaseNotesDialog extends StatefulWidget {
  const _ReleaseNotesDialog({required this.notice});
  final Map notice;

  @override
  State<_ReleaseNotesDialog> createState() => _ReleaseNotesDialogState();
}

class _ReleaseNotesDialogState extends State<_ReleaseNotesDialog> with SingleTickerProviderStateMixin {
  int step = 0;
  late final AnimationController _glow = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat(reverse: true);

  @override
  void dispose() {
    _glow.dispose();
    super.dispose();
  }

  Widget _swap(Widget child) => AnimatedSwitcher(
        duration: const Duration(milliseconds: 280),
        transitionBuilder: (c, a) => FadeTransition(
          opacity: a,
          child: SlideTransition(position: Tween(begin: const Offset(0.06, 0), end: Offset.zero).animate(a), child: c),
        ),
        child: child,
      );

  @override
  Widget build(BuildContext context) {
    final steps = ((widget.notice['steps'] as List?) ?? const []).whereType<Map>().toList();
    final current = step > 0 ? steps[step - 1] : null;
    final title = '${current?['title'] ?? widget.notice['title'] ?? 'Novidades'}';
    final body = '${current?['body'] ?? widget.notice['body'] ?? ''}';
    final href = '${current?['href'] ?? ''}';
    final last = steps.isNotEmpty && step == steps.length;
    final progress = steps.isEmpty ? 1.0 : step / steps.length;
    return Dialog(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AnimatedBuilder(
          animation: _glow,
          builder: (context, child) => Container(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: const [WqTokens.brandDeep, WqTokens.brand, WqTokens.action],
                begin: Alignment(-1 + _glow.value, -1),
                end: Alignment(1, 1 - _glow.value),
              ),
            ),
            child: child,
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(999)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(last ? Icons.celebration : Icons.auto_awesome, size: 13, color: Colors.white),
                const SizedBox(width: 6),
                Text(
                  steps.isEmpty ? 'NOVIDADES' : step == 0 ? 'NOVIDADES · INÍCIO' : 'NOVIDADES · $step DE ${steps.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800),
                ),
              ]),
            ),
            const SizedBox(height: 10),
            _swap(Text(title, key: ValueKey('t$step'), style: const TextStyle(color: Colors.white, fontSize: 22, height: 1.15, fontWeight: FontWeight.w800, letterSpacing: -0.4))),
            if (steps.isNotEmpty) ...[
              const SizedBox(height: 12),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress),
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeOut,
                builder: (_, value, _) => ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(value: value, minHeight: 4, backgroundColor: Colors.white.withValues(alpha: 0.25), color: Colors.white),
                ),
              ),
            ],
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _swap(Text(body, key: ValueKey('b$step'), style: TextStyle(fontSize: 15, height: 1.45, color: context.wqInk))),
            if (last)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: Wq.success.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                  child: const Row(children: [
                    Icon(Icons.check_circle, size: 16, color: Wq.success),
                    SizedBox(width: 8),
                    Expanded(child: Text('Tudo pronto. Já está no ar para a sua equipe.', style: TextStyle(fontWeight: FontWeight.w700, color: Wq.success))),
                  ]),
                ),
              ),
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
                child: const Text('Bora usar'),
              ),
          ]),
        ),
      ]),
    );
  }
}
