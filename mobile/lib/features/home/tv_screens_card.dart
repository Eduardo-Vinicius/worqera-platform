import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';

const _web = 'https://worqera.com';

/// Visão geral: ícone discreto das TVs da loja no topo. No celular o útil é copiar o link para abrir no navegador da TV.
class TvScreensButton extends StatelessWidget {
  const TvScreensButton({super.key, required this.session});
  final SessionStore session;

  @override
  Widget build(BuildContext context) {
    if (session.isSector) return const SizedBox.shrink();
    return IconButton(tooltip: 'Telas da loja (TVs)', icon: const Icon(Icons.tv_outlined), onPressed: () => _open(context));
  }

  void _open(BuildContext context) {
    final screens = <(String, String, IconData)>[
      ('/tv', 'TV Cliente', Icons.tv),
      ('/tv-dashboard', 'TV Oficina', Icons.monitor),
      if (session.isAdmin) ('/tv-financeiro', 'TV Financeiro', Icons.account_balance_wallet_outlined),
    ];
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text('Toque para copiar o link e abra no navegador da TV.', style: TextStyle(color: sheet.wqMuted, fontSize: 13)),
          ),
          for (final s in screens)
            ListTile(
              leading: Icon(s.$3, color: Wq.brand),
              title: Text(s.$2, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('$_web${s.$1}'),
              trailing: const Icon(Icons.copy, size: 18),
              onTap: () async {
                await Clipboard.setData(ClipboardData(text: '$_web${s.$1}'));
                if (sheet.mounted) Navigator.of(sheet).pop();
                if (context.mounted) wqToast(context, 'Link da ${s.$2} copiado');
              },
            ),
          ListTile(
            leading: const Icon(Icons.play_circle_outline),
            title: const Text('Ver demonstração'),
            onTap: () => openLink('$_web/tv?demo=1'),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
