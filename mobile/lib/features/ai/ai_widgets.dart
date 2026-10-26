import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../quotes/quote_kit.dart';
import '../quotes/quotes_screen.dart';

const _aiContact =
    'https://wa.me/5511985591053?text=Ol%C3%A1!%20Quero%20mais%20usos%20de%20IA%20no%20plano%20Business%20da%20minha%20empresa.';

String _resetLabel(dynamic iso) {
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  final d = DateTime.tryParse('$iso')?.toLocal();
  if (d == null) return 'o mês que vem';
  return '${d.day} de ${months[d.month - 1]}';
}

/// Diz com clareza quando os usos de IA do mês estão acabando ou acabaram.
class AiQuotaNotice extends StatelessWidget {
  const AiQuotaNotice({super.key, required this.quota, this.always = false});
  final Map? quota;
  final bool always;

  @override
  Widget build(BuildContext context) {
    final q = quota;
    if (q == null) return const SizedBox.shrink();
    final used = q['used'] ?? 0;
    final limit = q['limit'] ?? 0;
    if (q['blocked'] == true) {
      return Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Wq.warn.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Limite de IA do mês atingido', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text('A empresa usou os $limit usos de IA deste mês. Até ${_resetLabel(q['resetsAt'])}, os textos saem prontos, sem IA.',
              style: TextStyle(color: context.wqInk, fontSize: 13)),
          TextButton(
            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 32)),
            onPressed: () => openLink(_aiContact),
            child: const Text('Precisa de mais? Fale com a Worqera'),
          ),
        ]),
      );
    }
    if (q['nearLimit'] == true) {
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text('Restam ${q['left']} de $limit usos de IA este mês.', style: const TextStyle(color: Wq.warn, fontSize: 12)),
      );
    }
    if (!always) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text('IA: $used de $limit usos este mês · renova em ${_resetLabel(q['resetsAt'])}', style: TextStyle(color: context.wqMuted, fontSize: 12)),
    );
  }
}

/// Resumo do dia no Início: números ao vivo e a frase escrita pela IA no Business.
class DailyBriefCard extends StatefulWidget {
  const DailyBriefCard({super.key, required this.api, required this.session});
  final WorqeraApi api;
  final SessionStore session;

  @override
  State<DailyBriefCard> createState() => _DailyBriefCardState();
}

class _DailyBriefCardState extends State<DailyBriefCard> {
  Map<String, dynamic>? brief;
  Map? quota;
  bool busy = false;
  bool hidden = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool refresh = false}) async {
    setState(() => busy = true);
    try {
      final res = await widget.api.dio.get('/dashboard/brief', queryParameters: refresh ? {'refresh': '1'} : null);
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) {
        setState(() {
          brief = Map<String, dynamic>.from(body['brief'] as Map);
          quota = body['aiQuota'] is Map ? body['aiQuota'] as Map : null;
        });
      }
    } catch (_) {
      if (mounted) setState(() => hidden = true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void _openHref(String href) {
    if (href.startsWith('/orcamentos')) {
      final page = QuotesScreen(api: widget.api, session: widget.session);
      final scope = ShellScope.maybeOf(context);
      if (scope != null) {
        scope.openPage('quotes', page, stack: true);
      } else {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
      }
    } else if (href.startsWith('/pedidos')) {
      context.go('/orders');
    } else if (href.startsWith('/kanban')) {
      context.go('/kanban');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (hidden) return const SizedBox.shrink();
    final n = brief?['numbers'] is Map ? brief!['numbers'] as Map : const {};
    final chips = [
      ('Prontos', n['ready'] ?? 0, '/kanban', Wq.success),
      ('Ligar hoje', n['callToday'] ?? 0, null, Wq.brand),
      ('Atrasados', n['overdue'] ?? 0, '/kanban', const Color(0xFFE11D48)),
      ('Amanhã', n['dueTomorrow'] ?? 0, '/kanban', context.wqInk),
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.wqLine),
        gradient: LinearGradient(
          colors: [Wq.brand.withValues(alpha: context.wqDark ? 0.18 : 0.09), context.wqSurface],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 6, 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(color: Wq.brand, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('RESUMO DO DIA', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
                  if (brief?['ai'] == true) ...[const SizedBox(width: 6), const Pill('IA', color: Wq.brand, filled: true)],
                ]),
                const SizedBox(height: 4),
                if (((brief?['stake'] as num?) ?? 0) > 0)
                  Text.rich(TextSpan(children: [
                    TextSpan(text: brl(brief!['stake']), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: context.wqInk, letterSpacing: -0.5)),
                    TextSpan(text: '  em jogo hoje', style: TextStyle(fontSize: 14, color: context.wqMuted)),
                  ])),
                Text(
                  brief == null ? 'Lendo a operação…' : '${brief!['text'] ?? ''}',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk),
                ),
                if ('${brief?['tip'] ?? ''}'.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Icon(Icons.lightbulb_outline, size: 15, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 6),
                      Expanded(child: Text('${brief!['tip']}', style: TextStyle(fontSize: 13, color: context.wqMuted))),
                    ]),
                  ),
                AiQuotaNotice(quota: quota),
              ]),
            ),
            IconButton(
              tooltip: 'Atualizar',
              onPressed: busy ? null : () => load(refresh: true),
              icon: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.refresh, size: 20),
            ),
          ]),
        ),
        for (final entry in ((brief?['actions'] as List?) ?? const []).whereType<Map>().toList().asMap().entries)
          _BriefAction(index: entry.key, action: entry.value, onTap: () => _openHref('${entry.value['href'] ?? ''}')),
        if (((brief?['actions'] as List?) ?? const []).isNotEmpty) const SizedBox(height: 8),
        Divider(height: 1, color: context.wqLine),
        Row(children: [
          for (final c in chips)
            Expanded(
              child: InkWell(
                onTap: () {
                  if (c.$3 != null) {
                    context.go(c.$3!);
                    return;
                  }
                  final page = QuotesScreen(api: widget.api, session: widget.session);
                  final scope = ShellScope.maybeOf(context);
                  if (scope != null) {
                    scope.openPage('quotes', page, stack: true);
                  } else {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Column(children: [
                    Text('${c.$2}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: (c.$2 is num && c.$2 > 0) ? c.$4 : context.wqMuted)),
                    Text(c.$1, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                  ]),
                ),
              ),
            ),
        ]),
      ]),
    );
  }
}

class _BriefAction extends StatelessWidget {
  const _BriefAction({required this.index, required this.action, required this.onTap});
  final int index;
  final Map action;
  final VoidCallback onTap;

  static const _icons = <String, IconData>{
    'call': Icons.phone_in_talk_outlined,
    'ready': Icons.inventory_2_outlined,
    'unpaid': Icons.payments_outlined,
    'shelf': Icons.warehouse_outlined,
    'late': Icons.alarm_outlined,
    'price': Icons.sell_outlined,
    'tomorrow': Icons.event_outlined,
  };

  Color _tone(BuildContext context) {
    switch ('${action['tone']}') {
      case 'ok':
        return Wq.success;
      case 'warn':
        return const Color(0xFFF59E0B);
      case 'danger':
        return const Color(0xFFE11D48);
      case 'brand':
        return Wq.brand;
      default:
        return context.wqMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tone = _tone(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
      child: Material(
        color: context.wqSurface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border(left: BorderSide(color: tone, width: 3), top: BorderSide(color: context.wqLine), right: BorderSide(color: context.wqLine), bottom: BorderSide(color: context.wqLine)),
            ),
            padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
            child: Row(children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(color: tone.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: Icon(_icons['${action['id']}'] ?? Icons.arrow_forward, size: 16, color: tone),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${index + 1}. ${action['title'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w700, color: context.wqInk)),
                  Text('${action['detail'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: context.wqMuted)),
                ]),
              ),
              Icon(Icons.chevron_right, color: context.wqMuted),
            ]),
          ),
        ),
      ),
    );
  }
}

/// "Sugerir resposta" para uma avaliação.
class ReviewReplyButton extends StatefulWidget {
  const ReviewReplyButton({super.key, required this.api, required this.orderId, this.phone = ''});
  final WorqeraApi api;
  final String orderId;
  final String phone;

  @override
  State<ReviewReplyButton> createState() => _ReviewReplyButtonState();
}

class _ReviewReplyButtonState extends State<ReviewReplyButton> {
  bool busy = false;
  bool ai = false;
  Map? quota;
  List<Map<String, dynamic>> options = [];

  Future<void> load() async {
    setState(() => busy = true);
    try {
      final res = await widget.api.dio.post('/orders/${widget.orderId}/feedback/reply-suggest', data: {});
      final body = Map<String, dynamic>.from(res.data as Map);
      if (!mounted) return;
      setState(() {
        ai = body['ai'] == true;
        quota = body['aiQuota'] is Map ? body['aiQuota'] as Map : null;
        options = ((body['options'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      });
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) {
      return Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          onPressed: busy ? null : load,
          icon: busy ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome_outlined, size: 16),
          label: const Text('Sugerir resposta'),
        ),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      AiQuotaNotice(quota: quota),
      if (ai) const Padding(padding: EdgeInsets.only(top: 8), child: Align(alignment: Alignment.centerLeft, child: Pill('IA', color: Wq.brand, filled: true))),
      for (final opt in options)
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: context.wqPaper, borderRadius: BorderRadius.circular(10), border: Border.all(color: context.wqLine)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${opt['label'] ?? ''}'.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: context.wqMuted)),
            const SizedBox(height: 4),
            Text('${opt['text'] ?? ''}', style: TextStyle(height: 1.4, color: context.wqInk)),
            Row(children: [
              if (waMeUrl(widget.phone, '${opt['text'] ?? ''}').isNotEmpty)
                TextButton.icon(
                  onPressed: () => openLink(waMeUrl(widget.phone, '${opt['text'] ?? ''}')),
                  icon: const Icon(Icons.send, size: 16),
                  label: const Text('Enviar'),
                ),
              TextButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: '${opt['text'] ?? ''}'));
                  wqToast(context, 'Resposta copiada');
                },
                icon: const Icon(Icons.copy, size: 16),
                label: const Text('Copiar'),
              ),
            ]),
          ]),
        ),
    ]);
  }
}
