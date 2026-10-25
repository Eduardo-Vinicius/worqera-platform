import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';

/// Etapas, motivos e cores do funil de Orçamentos — o mesmo do site.
const quoteStages = <(String, String)>[
  ('new', 'Novo'),
  ('contact', 'Em contato'),
  ('followup', 'Retorno'),
  ('won', 'Recuperado'),
  ('lost', 'Perdido'),
];

const quoteReasons = <(String, String)>[
  ('price', 'Preço'),
  ('thinking', 'Vai pensar'),
  ('deadline', 'Prazo'),
  ('other_shop', 'Foi em outro lugar'),
  ('no_need', 'Não precisa mais'),
  ('other', 'Outro'),
];

const followUpPresets = <(String, int?)>[
  ('Hoje', 0),
  ('Amanhã', 1),
  ('3 dias', 3),
  ('1 semana', 7),
  ('15 dias', 15),
  ('1 mês', 30),
  ('Sem data', null),
];

String stageLabel(dynamic stage) {
  for (final s in quoteStages) {
    if (s.$1 == '$stage') return s.$2;
  }
  return '$stage';
}

bool quoteOpen(Map q) => q['stage'] != 'won' && q['stage'] != 'lost';

/// 10h do dia escolhido — horário de ligar.
String? followUpIso(int? days) {
  if (days == null) return null;
  final now = DateTime.now();
  var d = DateTime(now.year, now.month, now.day + days, 10);
  if (days == 0 && d.isBefore(now)) d = now.add(const Duration(minutes: 1));
  return d.toUtc().toIso8601String();
}

String money0(dynamic value) {
  final n = value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
  final whole = n.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) buf.write('.');
    buf.write(whole[i]);
  }
  return 'R\$ $buf';
}

String followUpText(Map q) {
  final f = q['followUp'] is Map ? q['followUp'] as Map : const {};
  final state = '${f['state'] ?? 'none'}';
  final days = int.tryParse('${f['days'] ?? 0}') ?? 0;
  if (state == 'overdue') return days == 1 ? 'Atrasado 1 dia' : 'Atrasado $days dias';
  if (state == 'today') return 'Ligar hoje';
  if (state == 'later') {
    if (days == 1) return 'Amanhã';
    final at = DateTime.tryParse('${q['followUpAt'] ?? ''}')?.toLocal();
    if (at == null) return 'Em $days dias';
    return '${at.day.toString().padLeft(2, '0')}/${at.month.toString().padLeft(2, '0')}';
  }
  return 'Sem data';
}

Color followUpColor(Map q) {
  final f = q['followUp'] is Map ? q['followUp'] as Map : const {};
  switch ('${f['state']}') {
    case 'overdue':
      return const Color(0xFFE11D48);
    case 'today':
      return Wq.warn;
    default:
      return Wq.muted;
  }
}

Color priorityColor(Map q) {
  final p = q['priority'] is Map ? q['priority'] as Map : const {};
  switch ('${p['level']}') {
    case 'high':
      return const Color(0xFFF43F5E);
    case 'medium':
      return const Color(0xFFFBBF24);
    case 'low':
      return const Color(0xFFCBD5E1);
    default:
      return Colors.transparent;
  }
}

Color stageColor(String stage) {
  switch (stage) {
    case 'won':
      return Wq.success;
    case 'lost':
      return Wq.muted;
    case 'followup':
      return const Color(0xFF0284C7);
    case 'contact':
      return const Color(0xFF7C3AED);
    default:
      return Wq.brand;
  }
}

String initialsOf(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  final first = parts.first.substring(0, 1);
  final last = parts.length > 1 ? parts.last.substring(0, 1) : '';
  return '$first$last'.toUpperCase();
}

String agoText(dynamic iso) {
  final at = DateTime.tryParse('$iso')?.toLocal();
  if (at == null) return '';
  final diff = DateTime.now().difference(at);
  if (diff.inMinutes < 1) return 'agora';
  if (diff.inMinutes < 60) return 'há ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'há ${diff.inHours} h';
  if (diff.inDays == 1) return 'ontem';
  if (diff.inDays < 30) return 'há ${diff.inDays} dias';
  return '${at.day.toString().padLeft(2, '0')}/${at.month.toString().padLeft(2, '0')}';
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, required this.color, this.filled = false});
  final String text;
  final Color color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(text, style: TextStyle(color: filled ? Colors.white : color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}

class QuoteAvatar extends StatelessWidget {
  const QuoteAvatar({super.key, required this.quote, this.size = 44});
  final Map quote;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Stack(clipBehavior: Clip.none, children: [
      Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: Wq.brand.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(size * 0.3)),
        child: Text(initialsOf('${quote['name'] ?? ''}'), style: TextStyle(color: Wq.brand, fontWeight: FontWeight.w800, fontSize: size * 0.34)),
      ),
      if (quoteOpen(quote))
        Positioned(
          right: -2,
          top: -2,
          child: Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: priorityColor(quote), shape: BoxShape.circle, border: Border.all(color: context.wqSurface, width: 2)),
          ),
        ),
    ]);
  }
}

class ReasonChips extends StatelessWidget {
  const ReasonChips({super.key, required this.value, required this.onChanged});
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(spacing: 8, runSpacing: 8, children: [
      for (final r in quoteReasons)
        ChoiceChip(
          label: Text(r.$2),
          selected: value == r.$1,
          onSelected: (_) => onChanged(r.$1),
        ),
    ]);
  }
}

class FollowUpChips extends StatelessWidget {
  const FollowUpChips({super.key, required this.selected, required this.onChanged});
  final int? selected;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(spacing: 8, runSpacing: 8, children: [
      for (final p in followUpPresets)
        ChoiceChip(
          label: Text(p.$1),
          selected: selected == p.$2,
          selectedColor: Wq.action.withValues(alpha: 0.18),
          onSelected: (_) => onChanged(p.$2),
        ),
    ]);
  }
}

/// "Cliente não fechou": tira o pedido da fila e abre o card em Orçamentos.
Future<bool> showRefuseQuoteSheet(
  BuildContext context, {
  required WorqeraApi api,
  required String orderId,
  required String code,
  String clientName = '',
}) async {
  String? reason;
  int? days = 3;
  final note = TextEditingController();
  var saving = false;
  final done = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheet) => StatefulBuilder(
      builder: (sheet, setSheet) {
        final inset = MediaQuery.viewInsetsOf(sheet).bottom;
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + inset),
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
              Text('Cliente não fechou', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: sheet.wqInk)),
              const SizedBox(height: 4),
              Text(
                '#$code${clientName.isEmpty ? '' : ' · $clientName'}. Sai da fila de produção e vai para Orçamentos.',
                style: TextStyle(color: sheet.wqMuted, fontSize: 13),
              ),
              const SizedBox(height: 16),
              const Text('Por que não fechou?', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ReasonChips(value: reason, onChanged: (v) => setSheet(() => reason = v)),
              const SizedBox(height: 14),
              TextField(
                controller: note,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Detalhe', hintText: 'Ex.: achou caro a pintura'),
              ),
              const SizedBox(height: 14),
              const Text('Ligar de novo', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              FollowUpChips(selected: days, onChanged: (v) => setSheet(() => days = v)),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        if (reason == null) {
                          wqToast(sheet, 'Escolha o motivo');
                          return;
                        }
                        setSheet(() => saving = true);
                        try {
                          await api.dio.post('/orders/$orderId/refuse-quote', data: {
                            'reason': reason,
                            if (note.text.trim().isNotEmpty) 'reasonNote': note.text.trim(),
                            'followUpAt': followUpIso(days),
                          });
                          if (sheet.mounted) Navigator.pop(sheet, true);
                        } catch (e) {
                          setSheet(() => saving = false);
                          if (sheet.mounted) wqToast(sheet, api.message(e));
                        }
                      },
                child: Text(saving ? 'Salvando…' : 'Mover para Orçamentos'),
              ),
            ]),
          ),
        );
      },
    ),
  );
  Future.delayed(const Duration(milliseconds: 500), note.dispose);
  if (done == true && context.mounted) wqToast(context, '#$code foi para Orçamentos');
  return done == true;
}
