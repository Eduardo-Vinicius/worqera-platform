import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';

const _web = 'https://worqera.com';

/// Início: as TVs da loja. No celular o útil é copiar o link para abrir no navegador da TV.
class TvScreensCard extends StatelessWidget {
  const TvScreensCard({super.key, required this.session});
  final SessionStore session;

  @override
  Widget build(BuildContext context) {
    if (session.isSector) return const SizedBox.shrink();
    final screens = <(String, String, IconData)>[
      ('/tv', 'TV Cliente', Icons.tv),
      ('/tv-dashboard', 'TV Oficina', Icons.monitor),
      if (session.isAdmin) ('/tv-financeiro', 'TV Financeiro', Icons.account_balance_wallet_outlined),
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(color: context.wqSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.wqLine)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Text('TELAS DA LOJA', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
          const Spacer(),
          TextButton.icon(
            style: TextButton.styleFrom(minimumSize: const Size(0, 30), padding: const EdgeInsets.symmetric(horizontal: 6)),
            onPressed: () => openLink('$_web/tv?demo=1'),
            icon: const Icon(Icons.play_circle_outline, size: 16),
            label: const Text('Demonstração', style: TextStyle(fontSize: 12)),
          ),
        ]),
        Text('Toque para copiar o link e abra no navegador da TV.', style: TextStyle(color: context.wqMuted, fontSize: 12)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final s in screens)
            ActionChip(
              avatar: Icon(s.$3, size: 18, color: Wq.brand),
              label: Text(s.$2, style: const TextStyle(fontWeight: FontWeight.w700)),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: '$_web${s.$1}'));
                if (context.mounted) wqToast(context, 'Link da ${s.$2} copiado: $_web${s.$1}');
              },
            ),
        ]),
      ]),
    );
  }
}
