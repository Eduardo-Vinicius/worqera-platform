import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';

/// Ready-made message for the order's current moment. Send by WhatsApp, e-mail or copy.
Future<void> showNotifyClientSheet(
  BuildContext context, {
  required String clientName,
  required String phone,
  required String email,
  required String code,
  required String link,
  required String shopName,
  required String status,
  String? dueAt,
  num remaining = 0,
}) async {
  final first = clientName.trim().split(RegExp(r'\s+')).first;
  final hi = first.isEmpty ? 'Oi!' : 'Oi, $first!';
  final due = DateTime.tryParse(dueAt ?? '');
  final late = due != null && due.isBefore(DateTime.now()) && status != 'ready';
  final balance = remaining > 0.009 ? ' O saldo para retirada é ${brl(remaining)}.' : '';
  final options = <(String, String)>[
    if (status == 'ready') ('Pronto para retirar', '$hi Seu pedido #$code está pronto para retirada aqui na $shopName.$balance Te esperamos! $link'),
    if (late) ('Vai atrasar', '$hi Passando para avisar que o pedido #$code precisa de mais um pouquinho de tempo aqui na $shopName. Assim que ficar pronto, te aviso. Acompanhe: $link'),
    if (status != 'ready' && status != 'delivered') ('Andamento', '$hi Seu pedido #$code está andando por aqui na $shopName. Acompanhe: $link'),
    ('Link do pedido', '$hi Acompanhe o pedido #$code aqui: $link'),
    ('Agradecer', '$hi Obrigado por escolher a $shopName! Se puder, conta como foi o serviço do pedido #$code: $link'),
  ];
  final text = TextEditingController(text: options.first.$2);
  var picked = 0;
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setSheet) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Avisar ${first.isEmpty ? 'o cliente' : first}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (var i = 0; i < options.length; i++)
                ChoiceChip(
                  label: Text(options[i].$1),
                  selected: picked == i,
                  onSelected: (_) => setSheet(() {
                    picked = i;
                    text.text = options[i].$2;
                  }),
                ),
            ]),
            const SizedBox(height: 8),
            TextField(controller: text, maxLines: 6, minLines: 4, decoration: const InputDecoration(border: OutlineInputBorder())),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018), minimumSize: const Size.fromHeight(46)),
                  onPressed: phone.isEmpty
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          openLink(waMeUrl(phone, text.text));
                        },
                  icon: const Icon(Icons.chat_outlined, size: 18),
                  label: const Text('WhatsApp'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                  onPressed: email.isEmpty
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          openLink(Uri(scheme: 'mailto', path: email, queryParameters: {'subject': 'Pedido #$code · $shopName', 'body': text.text}).toString());
                        },
                  icon: const Icon(Icons.mail_outline, size: 18),
                  label: const Text('E-mail'),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.outlined(
                tooltip: 'Copiar',
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: text.text));
                  if (ctx.mounted) wqToast(ctx, 'Mensagem copiada');
                },
                icon: const Icon(Icons.copy, size: 18),
              ),
            ]),
            if (phone.isEmpty || email.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  [if (phone.isEmpty) 'Sem telefone no pedido.', if (email.isEmpty) 'Sem e-mail no pedido.'].join(' '),
                  style: TextStyle(color: ctx.wqMuted, fontSize: 12),
                ),
              ),
          ]),
        ),
      ),
    ),
  );
  text.dispose();
}
