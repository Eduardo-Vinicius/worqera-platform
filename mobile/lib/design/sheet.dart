import 'package:flutter/material.dart';

import '../brand/theme.dart';

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
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) {
      final inset = MediaQuery.viewInsetsOf(ctx).bottom;
      return Padding(
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
