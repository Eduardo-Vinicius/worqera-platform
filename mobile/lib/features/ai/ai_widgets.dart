import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../home/shelf_card.dart';
import '../lookup/simple_lists.dart';
import '../products/products_screen.dart';
import '../quotes/quote_kit.dart';
import '../quotes/quotes_screen.dart';

const _aiContact =
    'https://wa.me/5511985591053?text=Ol%C3%A1!%20Quero%20mais%20usos%20de%20IA%20na%20minha%20empresa.';

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

/// Visão geral → "Operação de hoje": o único bloco sobre a operação.
/// Frase da IA, os quatro números (cada um abre a tela certa), por onde começar e a fila por setor.
class DailyBriefCard extends StatefulWidget {
  const DailyBriefCard({super.key, required this.api, required this.session, this.open = 0, this.overdue = 0, this.sectors = const []});
  final WorqeraApi api;
  final SessionStore session;
  final int open;
  final int overdue;
  final List<Map> sectors;

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

  void _push(String id, Widget page) {
    final scope = ShellScope.maybeOf(context);
    if (scope != null) {
      scope.openPage(id, page, stack: true);
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    }
  }

  /// Links do resumo vêm no formato do site (`/clientes?tab=aniversariantes`); aqui viram a tela certa do app.
  void _openHref(String href) {
    final uri = Uri.tryParse(href) ?? Uri();
    final path = uri.path;
    final tab = uri.queryParameters['tab'];
    if (path.startsWith('/orcamentos')) {
      _push('quotes', QuotesScreen(api: widget.api, session: widget.session));
    } else if (path.startsWith('/admin/produtos')) {
      _push('produtos', ProductsScreen(api: widget.api));
    } else if (path.startsWith('/clientes')) {
      const webTabs = {'aniversariantes': 'birthdays', 'sumidos': 'inactive', 'recorrentes': 'recurring', 'novos': 'new', 'todos': 'all'};
      _push(
        'clients',
        ClientsScreen(
          api: widget.api,
          session: widget.session,
          initialTab: webTabs[tab] ?? tab,
          openClient: (id) => _push('client', ClientDetailScreen(api: widget.api, clientId: id, session: widget.session)),
        ),
      );
    } else if (href.contains('prateleira')) {
      _push('shelf', ShelfPage(api: widget.api, session: widget.session));
    } else if (path.startsWith('/pedidos')) {
      context.go(tab == null ? '/orders' : '/orders?tab=$tab');
    } else if (path.startsWith('/kanban')) {
      context.go('/kanban');
    }
  }

  void _openQuotes() => _openHref('/orcamentos');

  @override
  Widget build(BuildContext context) {
    final n = brief?['numbers'] is Map ? brief!['numbers'] as Map : const {};
    // A API já decide o que cada papel vê: dono/admin com valores, atendimento sem valores, setor só a própria fila.
    final audience = '${brief?['audience'] ?? 'owner'}';
    const late = Color(0xFFE11D48);
    final stake = audience == 'owner' ? ((brief?['stake'] as num?) ?? 0) : 0;
    final actions = ((brief?['actions'] as List?) ?? const []).whereType<Map>().toList();
    final List<(String, dynamic, VoidCallback, Color)> kpis = audience == 'sector'
        ? [
            ('Na fila', n['queue'] ?? 0, () => context.go('/kanban'), context.wqInk),
            ('Atrasados', n['overdue'] ?? 0, () => context.go('/kanban'), late),
            ('Vencem hoje', n['dueToday'] ?? 0, () => context.go('/kanban'), Wq.brand),
            ('Amanhã', n['dueTomorrow'] ?? 0, () => context.go('/kanban'), context.wqInk),
          ]
        : [
            ('Em andamento', widget.open, () => context.go('/kanban'), context.wqInk),
            ('Atrasados', widget.overdue, () => context.go('/kanban'), late),
            ('Prontos', n['ready'] ?? 0, () => context.go('/kanban'), Wq.success),
            ('Ligar hoje', n['callToday'] ?? 0, _openQuotes, Wq.brand),
          ];
    final sectors = [...widget.sectors]..sort((a, b) => (num.tryParse('${b['count']}') ?? 0).compareTo(num.tryParse('${a['count']}') ?? 0));
    final shown = sectors.take(5).toList();
    final maxCount = shown.fold<num>(1, (max, row) {
      final count = num.tryParse('${row['count']}') ?? 0;
      return count > max ? count : max;
    });
    final fallback = '${widget.open} pedido${widget.open == 1 ? '' : 's'} em andamento'
        '${widget.overdue > 0 ? ', ${widget.overdue} atrasado${widget.overdue == 1 ? '' : 's'}' : ', fila em dia'}.';
    final label = TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: context.wqSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.wqLine)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 6, 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(color: Wq.brand, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  Text('OPERAÇÃO DE HOJE', style: label),
                  if (brief?['ai'] == true) const Pill('IA', color: Wq.brand, filled: true),
                  if (stake > 0) Pill('${brl(stake)} em jogo', color: Wq.brand),
                ]),
                const SizedBox(height: 4),
                Text(
                  brief != null ? '${brief!['text'] ?? ''}' : (hidden ? fallback : 'Lendo a operação…'),
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk),
                ),
                if ('${brief?['tip'] ?? ''}'.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('${brief!['tip']}', style: TextStyle(fontSize: 13, color: context.wqMuted)),
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
        Divider(height: 1, color: context.wqLine),
        Row(children: [
          for (final k in kpis)
            Expanded(
              child: InkWell(
                onTap: k.$3,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                  child: Column(children: [
                    Text('${k.$2}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: (k.$2 is num && k.$2 > 0) ? k.$4 : context.wqMuted)),
                    Text(k.$1, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                  ]),
                ),
              ),
            ),
        ]),
        Divider(height: 1, color: context.wqLine),
        Padding(padding: const EdgeInsets.fromLTRB(14, 10, 14, 6), child: Text('COMECE POR AQUI', style: label)),
        if (actions.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: Text(brief != null || hidden ? 'Nada urgente agora. Bom momento para adiantar a fila.' : 'Carregando…', style: TextStyle(color: context.wqMuted, fontSize: 13)),
          )
        else ...[
          for (final entry in actions.asMap().entries)
            _BriefAction(index: entry.key, action: entry.value, onTap: () => _openHref('${entry.value['href'] ?? ''}')),
          const SizedBox(height: 6),
        ],
        if (shown.isNotEmpty) ...[
          Divider(height: 1, color: context.wqLine),
          InkWell(
            onTap: () => context.go('/kanban'),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  Expanded(child: Text('FILA POR SETOR', style: label)),
                  if (sectors.length > shown.length) Text('+${sectors.length - shown.length} setores', style: TextStyle(fontSize: 11, color: context.wqMuted)),
                ]),
                const SizedBox(height: 8),
                for (final s in shown)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(children: [
                      SizedBox(width: 96, child: Text('${s['name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: context.wqInk))),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            minHeight: 6,
                            value: ((num.tryParse('${s['count']}') ?? 0) / maxCount).clamp(0.04, 1).toDouble(),
                            backgroundColor: context.wqPaper,
                            color: Wq.brand,
                          ),
                        ),
                      ),
                      SizedBox(width: 32, child: Text('${s['count'] ?? 0}', textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w800))),
                    ]),
                  ),
              ]),
            ),
          ),
        ],
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
    'today': Icons.timer_outlined,
    'urgent': Icons.local_fire_department_outlined,
    'check': Icons.flag_outlined,
    'restock': Icons.local_shipping_outlined,
    'birthday': Icons.cake_outlined,
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

/// Ficha do cliente: quem é esse cliente numa olhada e o próximo passo com ele (`/ai/clients/:id/insight`).
class ClientInsightCard extends StatefulWidget {
  const ClientInsightCard({super.key, required this.api, required this.clientId});
  final WorqeraApi api;
  final String clientId;

  @override
  State<ClientInsightCard> createState() => _ClientInsightCardState();
}

class _ClientInsightCardState extends State<ClientInsightCard> {
  Map<String, dynamic>? insight;

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/ai/clients/${widget.clientId}/insight').then((res) {
      final body = res.data is Map ? res.data as Map : const {};
      if (mounted && body['insight'] is Map) setState(() => insight = Map<String, dynamic>.from(body['insight'] as Map));
    }).catchError((_) {});
  }

  Color _tagColor(String tag) {
    if (RegExp(r'^Deve|reclamou|Sumido|Passou da hora', caseSensitive: false).hasMatch(tag)) return const Color(0xFFE11D48);
    if (RegExp(r'fiel|Ama', caseSensitive: false).hasMatch(tag)) return Wq.success;
    return context.wqMuted;
  }

  @override
  Widget build(BuildContext context) {
    final data = insight;
    if (data == null) return const SizedBox.shrink();
    final numbers = data['numbers'] is Map ? data['numbers'] as Map : const {};
    final tags = ((numbers['tags'] as List?) ?? const []).map((t) => '$t').where((t) => t.isNotEmpty).toList();
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(color: context.wqSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.wqLine)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(color: Wq.brand, borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.manage_search, color: Colors.white, size: 17),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('RAIO-X DO CLIENTE', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
              if (data['ai'] == true) ...[const SizedBox(width: 6), const Pill('IA', color: Wq.brand, filled: true)],
            ]),
            const SizedBox(height: 4),
            Text('${data['summary'] ?? ''}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk)),
            if ('${data['next'] ?? ''}'.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.arrow_forward, size: 16, color: Wq.brand),
                  const SizedBox(width: 6),
                  Expanded(child: Text('${data['next']}', style: const TextStyle(fontWeight: FontWeight.w700, color: Wq.brand))),
                ]),
              ),
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(spacing: 6, runSpacing: 6, children: [for (final t in tags) Pill(t, color: _tagColor(t))]),
            ],
          ]),
        ),
      ]),
    );
  }
}

/// Financeiro: quem deve, há quanto tempo e em que ordem cobrar (`/ai/receivables`). Só dono e admin; some para os outros.
class ReceivablesCard extends StatefulWidget {
  const ReceivablesCard({super.key, required this.api});
  final WorqeraApi api;

  @override
  State<ReceivablesCard> createState() => _ReceivablesCardState();
}

class _ReceivablesCardState extends State<ReceivablesCard> {
  Map<String, dynamic>? data;
  Map? quota;
  bool busy = false;
  bool hidden = false;
  bool all = false;

  static const _levels = <String, (String, Color)>{
    'ready': ('Pronto', Wq.success),
    'soft': ('Até 7 dias', Color(0xFF0284C7)),
    'firm': ('8 a 30 dias', Color(0xFFD97706)),
    'late': ('+30 dias', Color(0xFFE11D48)),
  };

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool refresh = false}) async {
    setState(() => busy = true);
    try {
      final res = await widget.api.dio.get('/ai/receivables', queryParameters: refresh ? {'refresh': '1'} : null);
      final body = Map<String, dynamic>.from(res.data as Map);
      if (mounted) {
        setState(() {
          data = body['receivables'] is Map ? Map<String, dynamic>.from(body['receivables'] as Map) : null;
          quota = body['aiQuota'] is Map ? body['aiQuota'] as Map : null;
        });
      }
    } catch (_) {
      if (mounted) setState(() => hidden = true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;

  @override
  Widget build(BuildContext context) {
    final d = data;
    if (hidden || d == null) return const SizedBox.shrink();
    final buckets = d['buckets'] is Map ? d['buckets'] as Map : const {};
    final aging = d['aging'] is Map ? d['aging'] as Map : const {};
    final items = ((d['items'] as List?) ?? const []).whereType<Map>().toList();
    final plan = ((d['plan'] as List?) ?? const []).map((p) => '$p').toList();
    final shown = all ? items : items.take(5).toList();
    final label = TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted);
    final up7 = _n(aging['upTo7']), up30 = _n(aging['upTo30']), over = _n(aging['over30']);
    final agingTotal = (up7 + up30 + over) == 0 ? 1 : up7 + up30 + over;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(color: context.wqSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.wqLine)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 6, 10),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.payments_outlined, color: Colors.white, size: 17),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('COBRANÇA INTELIGENTE', style: label),
                  if (d['ai'] == true) ...[const SizedBox(width: 6), const Pill('IA', color: Wq.brand, filled: true)],
                ]),
                const SizedBox(height: 4),
                Text('${d['headline'] ?? ''}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, height: 1.35, color: context.wqInk)),
                for (final entry in plan.asMap().entries)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text('${entry.key + 1}. ${entry.value}', style: TextStyle(fontSize: 13, color: context.wqMuted)),
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
        if (_n(d['total']) > 0.009) ...[
          Divider(height: 1, color: context.wqLine),
          Row(children: [
            for (final c in [
              ('A receber', _n(d['total']), false),
              ('Entregues sem pagar (${buckets['deliveredCount'] ?? 0})', _n(buckets['delivered']), true),
              ('Prontos com saldo (${buckets['readyCount'] ?? 0})', _n(buckets['ready']), false),
            ])
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(brl(c.$2), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: c.$3 && c.$2 > 0 ? const Color(0xFFD97706) : context.wqInk)),
                    ),
                    Text(c.$1, maxLines: 2, style: TextStyle(fontSize: 11, color: context.wqMuted)),
                  ]),
                ),
              ),
          ]),
          if (_n(d['atRisk']) > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 2, 14, 10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('IDADE DO QUE JÁ FOI ENTREGUE', style: label),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: SizedBox(
                    height: 8,
                    child: Row(children: [
                      if (up7 > 0) Expanded(flex: (up7 / agingTotal * 1000).round().clamp(1, 1000), child: Container(color: const Color(0xFF38BDF8))),
                      if (up30 > 0) Expanded(flex: (up30 / agingTotal * 1000).round().clamp(1, 1000), child: Container(color: const Color(0xFFFBBF24))),
                      if (over > 0) Expanded(flex: (over / agingTotal * 1000).round().clamp(1, 1000), child: Container(color: const Color(0xFFE11D48))),
                    ]),
                  ),
                ),
                const SizedBox(height: 4),
                Text('Até 7 dias ${brl(up7)} · 8–30 dias ${brl(up30)} · +30 dias ${brl(over)}', style: TextStyle(fontSize: 11, color: context.wqMuted)),
              ]),
            ),
          Divider(height: 1, color: context.wqLine),
          for (final item in shown)
            ListTile(
              dense: true,
              title: Text('#${item['code']} · ${item['clientName'] ?? 'Cliente'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Row(children: [
                Pill(_levels['${item['level']}']?.$1 ?? '', color: _levels['${item['level']}']?.$2 ?? context.wqMuted),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    item['stage'] == 'delivered' ? 'entregue há ${item['days']} dia${item['days'] == 1 ? '' : 's'}' : 'esperando retirada',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ]),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(brl(_n(item['value'])), style: const TextStyle(fontWeight: FontWeight.w800)),
                if ('${item['waUrl'] ?? ''}'.isNotEmpty)
                  IconButton(
                    tooltip: 'Cobrar pelo WhatsApp',
                    onPressed: () => openLink('${item['waUrl']}'),
                    icon: const Icon(Icons.chat, color: Color(0xFF25D366), size: 20),
                  ),
              ]),
            ),
          if (items.length > 5)
            TextButton(onPressed: () => setState(() => all = !all), child: Text(all ? 'Mostrar menos' : 'Ver todos os ${items.length}')),
        ],
      ]),
    );
  }
}
