import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/motion.dart';
import '../../design/sheet.dart';

/// Excluir a conta pelo app (exigência da App Store e da Play Store).
Future<void> confirmDeleteAccount(BuildContext context, WorqeraApi api) async {
  final ok = await showWqSheet<bool>(
    context,
    title: 'Excluir minha conta',
    hint: 'Não dá para desfazer.',
    child: (sheet) => WqSheetFields(
      create: () => [TextEditingController()],
      builder: (ctx, fields) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final typed = fields[0].text.trim().toUpperCase() == 'EXCLUIR';
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final line in const [
              'Seu nome, e-mail e senha são apagados e você sai de todos os aparelhos.',
              'Se você for o único dono, a loja é suspensa e a assinatura é cancelada.',
              'Pedidos e clientes ficam com a loja (registro do negócio).',
            ])
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Padding(padding: EdgeInsets.only(top: 2), child: Icon(Icons.circle, size: 6, color: Wq.danger)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(line, style: TextStyle(color: ctx.wqInk, height: 1.35))),
                ]),
              ),
            const SizedBox(height: 10),
            TextField(
              controller: fields[0],
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'Digite EXCLUIR para confirmar'),
              onChanged: (_) => setLocal(() {}),
            ),
            const SizedBox(height: 12),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Wq.danger),
              onPressed: typed ? () => Navigator.pop(sheet, true) : null,
              child: const Text('Excluir conta'),
            ),
          ]);
        },
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  try {
    await api.deleteAccount();
    successHaptic();
  } catch (e) {
    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(api.message(e))));
  }
}
