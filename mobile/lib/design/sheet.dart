import 'package:flutter/material.dart';

import '../brand/theme.dart';
import 'motion.dart';

/// Campos que morrem junto com a folha, depois do TextField sair da árvore.
class WqSheetFields extends StatefulWidget {
  const WqSheetFields({super.key, required this.create, required this.builder});
  final List<TextEditingController> Function() create;
  final Widget Function(BuildContext context, List<TextEditingController> fields) builder;

  @override
  State<WqSheetFields> createState() => _WqSheetFieldsState();
}

class _WqSheetFieldsState extends State<WqSheetFields> {
  late final List<TextEditingController> fields = widget.create();

  @override
  void dispose() {
    for (final field in fields) {
      field.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(context, fields);
}

/// Folha que sobe de baixo. Use para cadastrar ou editar uma coisa curta.
Future<T?> showWqSheet<T>(
  BuildContext context, {
  required String title,
  String? hint,
  required Widget Function(BuildContext sheet) child,
}) {
  tapHaptic();
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: context.wqSurface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) {
      final inset = MediaQuery.viewInsetsOf(ctx).bottom;
      return AnimatedPadding(
        duration: Motion.fast,
        curve: Motion.curve,
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + inset),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: ctx.wqInk)),
              if (hint != null) ...[
                const SizedBox(height: 4),
                Text(hint, style: TextStyle(color: ctx.wqMuted, fontSize: 13)),
              ],
              const SizedBox(height: 12),
              child(ctx),
            ],
          ),
        ),
      );
    },
  );
}

/// Uma ação do menu que sobe de baixo.
class WqAction {
  const WqAction(this.icon, this.label, this.onTap, {this.hint, this.danger = false});
  final IconData icon;
  final String label;
  final String? hint;
  final bool danger;
  final VoidCallback onTap;
}

/// Menu de ações (o "mais opções"): sobe de baixo, fecha e executa a ação tocada.
Future<void> showWqActions(BuildContext context, {String? title, required List<WqAction> actions}) {
  tapHaptic();
  return showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: context.wqSurface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: ctx.wqInk)),
              ),
            for (final (i, a) in actions.indexed)
              FadeSlideIn(
                index: i,
                offset: 8,
                child: ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  leading: Icon(a.icon, color: a.danger ? Wq.danger : ctx.wqInk),
                  title: Text(a.label, style: TextStyle(fontWeight: FontWeight.w700, color: a.danger ? Wq.danger : ctx.wqInk)),
                  subtitle: a.hint == null ? null : Text(a.hint!, style: TextStyle(color: ctx.wqMuted, fontSize: 12)),
                  onTap: () {
                    Navigator.pop(ctx);
                    a.onTap();
                  },
                ),
              ),
          ],
        ),
      ),
    ),
  );
}
