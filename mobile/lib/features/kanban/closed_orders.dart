import 'package:flutter/material.dart';

import '../../brand/theme.dart';
import '../../design/ui.dart';
import '../quotes/quote_kit.dart';

const closedKinds = ['delivered', 'refused'];

const _stageLabel = {
  'new': 'Novo',
  'contact': 'Em contato',
  'followup': 'Retorno',
  'won': 'Recuperado',
  'lost': 'Perdido',
};

Color closedTone(String kind) => kind == 'delivered' ? const Color(0xFF059669) : const Color(0xFFE11D48);
String closedTitle(String kind) => kind == 'delivered' ? 'Entregues' : 'Recusados';
IconData closedIcon(String kind) => kind == 'delivered' ? Icons.inventory_2_outlined : Icons.request_quote_outlined;

String _when(dynamic raw) {
  final d = DateTime.tryParse('${raw ?? ''}')?.toLocal();
  if (d == null) return '';
  final days = DateTime.now().difference(d).inDays;
  if (days <= 0) return 'hoje';
  if (days == 1) return 'ontem';
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
}

/// Delivered or refused orders of the last days, under the kanban chips.
class ClosedOrdersList extends StatelessWidget {
  const ClosedOrdersList({
    super.key,
    required this.kind,
    required this.cards,
    required this.days,
    required this.onDays,
    required this.onOpenOrder,
    required this.onOpenQuote,
    required this.onRefresh,
    this.showMoney = true,
  });

  final String kind;
  final List<Map> cards;
  final int days;
  final void Function(int days) onDays;
  final void Function(String orderId) onOpenOrder;
  final void Function(String quoteId) onOpenQuote;
  final Future<void> Function() onRefresh;
  final bool showMoney;

  @override
  Widget build(BuildContext context) {
    final tone = closedTone(kind);
    final money = cards.fold<num>(0, (s, c) => s + (num.tryParse('${c['total'] ?? 0}') ?? 0));
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
        child: Row(children: [
          for (final d in const [7, 14, 30])
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(label: Text('${d}d'), selected: days == d, onSelected: (_) => onDays(d), visualDensity: VisualDensity.compact),
            ),
          const Spacer(),
          if (showMoney && money > 0) Text(brl(money), style: const TextStyle(color: Wq.muted, fontSize: 12, fontWeight: FontWeight.w700)),
        ]),
      ),
      Expanded(
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: cards.isEmpty ? 1 : cards.length,
            itemBuilder: (_, i) {
              if (cards.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(kind == 'delivered' ? 'Nenhuma entrega no período.' : 'Ninguém recusou no período.', style: const TextStyle(color: Wq.muted)),
                );
              }
              final c = cards[i];
              final stage = '${c['quoteStage'] ?? ''}';
              final quoteId = '${c['quoteId'] ?? ''}';
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: context.wqSurface,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => onOpenOrder('${c['id']}'),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border(left: BorderSide(color: tone, width: 3), top: BorderSide(color: context.wqLine), right: BorderSide(color: context.wqLine), bottom: BorderSide(color: context.wqLine)),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Text('#${c['code'] ?? ''}', style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Wq.muted, fontWeight: FontWeight.w700)),
                          const Spacer(),
                          Text(_when(c['at']), style: const TextStyle(fontSize: 11, color: Wq.muted)),
                        ]),
                        const SizedBox(height: 2),
                        Text('${c['clientName'] ?? ''}'.isEmpty ? 'Cliente' : '${c['clientName']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                        if ('${c['summary'] ?? ''}'.isNotEmpty) Text('${c['summary']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Wq.muted)),
                        const SizedBox(height: 6),
                        Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                          if (kind == 'refused' && '${c['reasonLabel'] ?? ''}'.isNotEmpty) Pill('${c['reasonLabel']}', color: tone),
                          if (kind == 'refused' && stage.isNotEmpty) Pill(_stageLabel[stage] ?? stage, color: stage == 'won' ? const Color(0xFF059669) : Wq.brand),
                          if (kind == 'delivered' && c['feedbackScore'] != null) Pill('★ ${c['feedbackScore']}', color: const Color(0xFFB45309)),
                          if (showMoney && (num.tryParse('${c['total'] ?? 0}') ?? 0) > 0) Text(brl(c['total']), style: const TextStyle(fontSize: 12, color: Wq.muted)),
                        ]),
                        if (kind == 'refused' && quoteId.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(onPressed: () => onOpenQuote(quoteId), child: const Text('Abrir no Orçamentos')),
                          ),
                        ],
                      ]),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    ]);
  }
}
