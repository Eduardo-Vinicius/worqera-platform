import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../ai/ai_widgets.dart';
import 'quote_kit.dart';

/// Orçamentos: quem ligar hoje, o funil e o histórico de cada cliente que não fechou.
class QuotesScreen extends StatefulWidget {
  const QuotesScreen({super.key, required this.api, required this.session, this.openId});
  final WorqeraApi api;
  final SessionStore session;
  final String? openId;

  @override
  State<QuotesScreen> createState() => _QuotesScreenState();
}

class _QuotesScreenState extends State<QuotesScreen> {
  String view = 'today';
  String stage = 'new';
  String query = '';
  List<Map<String, dynamic>> quotes = [];
  Map<String, dynamic> summary = {};
  bool loading = true;
  String? error;
  String busy = '';
  Timer? debounce;
  final search = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
    final id = widget.openId;
    if (id != null && id.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => openQuote(id));
    }
  }

  @override
  void dispose() {
    debounce?.cancel();
    search.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/quotes', queryParameters: {
        'view': view == 'board' ? 'board' : view,
        if (query.trim().isNotEmpty) 'q': query.trim(),
      });
      final body = Map<String, dynamic>.from(res.data as Map);
      if (!mounted) return;
      setState(() {
        quotes = ((body['quotes'] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        summary = body['summary'] is Map ? Map<String, dynamic>.from(body['summary'] as Map) : {};
        loading = false;
        error = null;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          loading = false;
          error = widget.api.message(e);
        });
      }
    }
  }

  void setView(String next) {
    setState(() {
      view = next;
      loading = true;
    });
    load();
  }

  void onSearch(String value) {
    query = value;
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 300), load);
  }

  void openQuote(String id) {
    final page = QuoteDetailScreen(api: widget.api, session: widget.session, quoteId: id, onChanged: load);
    final scope = ShellScope.maybeOf(context);
    if (scope != null) {
      scope.openPage('quote', page, stack: true);
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    }
  }

  Future<void> quick(Map q, String key, Future<void> Function() run) async {
    setState(() => busy = '${q['id']}:$key');
    try {
      await run();
      await load();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = '');
    }
  }

  Future<void> whatsapp(Map q) => quick(q, 'wa', () async {
        final res = await widget.api.dio.post('/quotes/${q['id']}/suggest', data: {});
        final options = ((res.data as Map)['options'] as List? ?? const []).whereType<Map>().toList();
        final text = options.isEmpty ? '' : '${options.first['text'] ?? ''}';
        final url = options.isEmpty ? '' : '${options.first['waUrl'] ?? ''}';
        final link = url.isNotEmpty && url != 'null' ? url : waMeUrl('${q['phone'] ?? ''}', text);
        if (link.isEmpty) throw 'Cliente sem WhatsApp válido';
        await openLink(link);
        await widget.api.dio.post('/quotes/${q['id']}/activity', data: {'kind': 'whatsapp', 'text': 'Mensagem pelo WhatsApp'});
      });

  Future<void> call(Map q) => quick(q, 'call', () async {
        final digits = '${q['phoneDigits'] ?? q['phone'] ?? ''}'.replaceAll(RegExp(r'\D'), '');
        if (digits.isEmpty) throw 'Cliente sem telefone';
        await openLink('tel:$digits');
        await widget.api.dio.post('/quotes/${q['id']}/activity', data: {'kind': 'call', 'text': 'Ligação'});
      });

  Future<void> snooze(Map q, int days) => quick(q, 'snooze', () async {
        await widget.api.dio.patch('/quotes/${q['id']}', data: {'followUpAt': followUpIso(days)});
        if (mounted) wqToast(context, days == 1 ? 'Volta amanhã' : 'Volta em $days dias');
      });

  Future<void> win(Map q) async {
    final body = await showRecoverySheet(context, api: widget.api, quote: q);
    if (body == null) return;
    await quick(q, 'win', () async {
        final res = await widget.api.dio.post('/quotes/${q['id']}/win', data: body);
        final order = (res.data as Map)['order'];
        if (!mounted) return;
        wqToast(context, order is Map ? 'Recuperado! #${order['code']} voltou para a fila' : 'Recuperado! Abra o pedido pelo Novo pedido');
      });
  }

  Future<void> move(Map q, String next) async {
    if (next == 'won') return win(q);
    await quick(q, 'stage', () => widget.api.dio.patch('/quotes/${q['id']}', data: {'stage': next}));
  }

  Future<void> create() async {
    final created = await showNewQuoteSheet(context, api: widget.api);
    if (created != null) {
      await load();
      if (mounted) openQuote(created);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = view == 'board' ? quotes.where((q) => q['stage'] == stage).toList() : quotes;
    final byStage = (summary['byStage'] is Map) ? summary['byStage'] as Map : const {};
    return WqPage(
      title: 'Orçamentos',
      subtitle: 'Quem não fechou e quem ligar hoje',
      floating: FloatingActionButton.extended(
        onPressed: create,
        backgroundColor: Wq.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Novo', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      child: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
          children: [
            _summary(context),
            const SizedBox(height: 14),
            SegmentedButton<String>(
              showSelectedIcon: false,
              segments: [
                ButtonSegment(value: 'today', icon: const Icon(Icons.phone_in_talk_outlined, size: 18), label: Text('Hoje${(summary['todayCount'] ?? 0) > 0 ? ' ${summary['todayCount']}' : ''}')),
                const ButtonSegment(value: 'board', icon: Icon(Icons.view_kanban_outlined, size: 18), label: Text('Quadro')),
                const ButtonSegment(value: 'all', icon: Icon(Icons.list, size: 18), label: Text('Todos')),
              ],
              selected: {view},
              onSelectionChanged: (s) => setView(s.first),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: search,
              onChanged: onSearch,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Nome, telefone ou código'),
            ),
            if (view == 'board') ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 40,
                child: ListView(scrollDirection: Axis.horizontal, children: [
                  for (final s in quoteStages)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text('${s.$2} ${byStage[s.$1] ?? 0}'),
                        selected: stage == s.$1,
                        selectedColor: stageColor(s.$1).withValues(alpha: 0.16),
                        onSelected: (_) => setState(() => stage = s.$1),
                      ),
                    ),
                ]),
              ),
            ],
            const SizedBox(height: 12),
            if (loading)
              const Padding(padding: EdgeInsets.only(top: 48), child: Center(child: CircularProgressIndicator()))
            else if (error != null)
              Padding(padding: const EdgeInsets.only(top: 32), child: Text(error!, textAlign: TextAlign.center))
            else if (visible.isEmpty)
              _empty(context)
            else
              for (final q in visible) _row(context, q),
          ],
        ),
      ),
    );
  }

  Widget _summary(BuildContext context) {
    final overdue = summary['overdueCount'] ?? 0;
    final cards = [
      ('Ligar hoje', '${summary['todayCount'] ?? 0}', overdue > 0 ? '$overdue atrasados' : 'Nada atrasado', overdue > 0 ? const Color(0xFFE11D48) : Wq.brand),
      ('Na mesa', money0(summary['openValue'] ?? 0), '${summary['openCount'] ?? 0} em aberto', context.wqInk),
      ('Recuperado 30d', money0(summary['wonValue30d'] ?? 0), '${summary['wonCount30d'] ?? 0} voltaram', Wq.success),
      ('Recuperação', '${summary['recoveryRate'] ?? 0}%', 'últimos 30 dias', Wq.action),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 1.9,
      children: [
        for (final c in cards)
          WqCard(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            onTap: c.$1 == 'Ligar hoje' ? () => setView('today') : null,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(c.$1.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: context.wqMuted)),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(c.$2, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.6, color: c.$4)),
              ),
              Text(c.$3, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11, color: context.wqMuted)),
            ]),
          ),
      ],
    );
  }

  Widget _empty(BuildContext context) {
    final today = view == 'today' && query.isEmpty;
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: Column(children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(color: Wq.brand.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(18)),
          child: Icon(today ? Icons.check_rounded : Icons.search, color: Wq.brand, size: 28),
        ),
        const SizedBox(height: 12),
        Text(
          query.isNotEmpty ? 'Ninguém com esse nome' : today ? 'Nada para ligar hoje' : 'Nenhum orçamento aqui',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: context.wqInk),
        ),
        const SizedBox(height: 4),
        Text(
          'Quando o cliente não fechar, use “Cliente não fechou” no pedido, ou registre aqui pelo Novo.',
          textAlign: TextAlign.center,
          style: TextStyle(color: context.wqMuted),
        ),
      ]),
    );
  }

  Widget _row(BuildContext context, Map<String, dynamic> q) {
    final open = quoteOpen(q);
    final busyKey = busy.startsWith('${q['id']}:') ? busy.split(':').last : '';
    final hint = q['priority'] is Map ? '${(q['priority'] as Map)['hint'] ?? ''}' : '';
    final phone = '${q['phoneDigits'] ?? ''}'.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: WqCard(
        onTap: () => openQuote('${q['id']}'),
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            QuoteAvatar(quote: q),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text('${q['name'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: context.wqInk))),
                  if ('${q['orderCode'] ?? ''}'.isNotEmpty)
                    Padding(padding: const EdgeInsets.only(left: 6), child: Text('#${q['orderCode']}', style: monoStyle(size: 11, color: context.wqMuted))),
                ]),
                const SizedBox(height: 2),
                Text(
                  [if ('${q['what'] ?? ''}'.isNotEmpty) '${q['what']}', if ('${q['reasonLabel'] ?? ''}'.isNotEmpty) '${q['reasonLabel']}'].join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: context.wqMuted, fontSize: 13),
                ),
                if (open && hint.isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 2), child: Text(hint, style: TextStyle(color: context.wqMuted, fontSize: 11))),
              ]),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text((q['value'] ?? 0) > 0 ? money0(q['value']) : '—', style: TextStyle(fontWeight: FontWeight.w800, color: context.wqInk)),
              const SizedBox(height: 4),
              if (open) Pill(followUpText(q), color: followUpColor(q)) else Pill(stageLabel(q['stage']), color: stageColor('${q['stage']}')),
            ]),
          ]),
          if (open) ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018), minimumSize: const Size(0, 40)),
                  onPressed: !phone || busyKey == 'wa' ? null : () => whatsapp(q),
                  icon: busyKey == 'wa' ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.chat, size: 18),
                  label: const Text('WhatsApp', style: TextStyle(fontSize: 14)),
                ),
              ),
              const SizedBox(width: 6),
              IconButton.outlined(tooltip: 'Ligar', onPressed: phone ? () => call(q) : null, icon: const Icon(Icons.call_outlined, size: 20)),
              PopupMenuButton<int>(
                tooltip: 'Ligar outro dia',
                onSelected: (days) => snooze(q, days),
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 1, child: Text('Amanhã')),
                  PopupMenuItem(value: 3, child: Text('Em 3 dias')),
                  PopupMenuItem(value: 7, child: Text('Em 1 semana')),
                  PopupMenuItem(value: 30, child: Text('Em 1 mês')),
                ],
                child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.event_repeat_outlined, size: 22)),
              ),
              if (view == 'board')
                PopupMenuButton<String>(
                  tooltip: 'Mudar etapa',
                  onSelected: (next) => move(q, next),
                  itemBuilder: (_) => [
                    for (final s in quoteStages)
                      if (s.$1 != q['stage']) PopupMenuItem(value: s.$1, child: Text(s.$2)),
                  ],
                  child: const Padding(padding: EdgeInsets.all(8), child: Icon(Icons.swap_horiz, size: 22)),
                ),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Wq.action, minimumSize: const Size(0, 40), padding: const EdgeInsets.symmetric(horizontal: 12)),
                onPressed: busyKey == 'win' ? null : () => win(q),
                child: const Icon(Icons.check_rounded, size: 20),
              ),
            ]),
          ],
        ]),
      ),
    );
  }
}

class QuoteDetailScreen extends StatefulWidget {
  const QuoteDetailScreen({super.key, required this.api, required this.session, required this.quoteId, this.onChanged});
  final WorqeraApi api;
  final SessionStore session;
  final String quoteId;
  final VoidCallback? onChanged;

  @override
  State<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends State<QuoteDetailScreen> {
  Map<String, dynamic>? quote;
  String? error;
  bool busy = false;
  bool suggesting = false;
  bool ai = false;
  bool official = false;
  Map? quota;
  List<Map<String, dynamic>> options = [];
  final note = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    note.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final res = await widget.api.dio.get('/quotes/${widget.quoteId}');
      final body = res.data as Map;
      if (mounted) {
        setState(() {
          quote = Map<String, dynamic>.from(body['quote'] as Map);
          official = (body['channels'] as Map?)?['whatsappOfficial'] == true;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    }
  }

  void apply(dynamic body) {
    final next = body is Map ? body['quote'] : null;
    if (next is Map && mounted) setState(() => quote = Map<String, dynamic>.from(next));
    widget.onChanged?.call();
  }

  Future<void> run(Future<void> Function() fn) async {
    setState(() => busy = true);
    try {
      await fn();
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> patch(Map<String, dynamic> body) => run(() async {
        final res = await widget.api.dio.patch('/quotes/${widget.quoteId}', data: body);
        apply(res.data);
      });

  Future<void> win() async {
    final current = quote;
    if (current == null) return;
    final body = await showRecoverySheet(context, api: widget.api, quote: current);
    if (body == null) return;
    await run(() async {
        final res = await widget.api.dio.post('/quotes/${widget.quoteId}/win', data: body);
        apply(res.data);
        final order = (res.data as Map)['order'];
        if (mounted) wqToast(context, order is Map ? 'Recuperado! #${order['code']} voltou para a fila' : 'Recuperado! Abra o pedido pelo Novo pedido');
      });
  }

  Future<void> sendOfficial() => run(() async {
        final res = await widget.api.dio.post('/quotes/${widget.quoteId}/whatsapp', data: {});
        final body = Map<String, dynamic>.from(res.data as Map);
        if (!mounted) return;
        wqToast(context, body['ok'] == true ? 'Retomada enviada pelo WhatsApp oficial' : '${body['message'] ?? 'Não enviou'}');
        await load();
        widget.onChanged?.call();
      });

  Future<void> logContact(String kind, String text) async {
    final res = await widget.api.dio.post('/quotes/${widget.quoteId}/activity', data: {'kind': kind, 'text': text});
    apply(res.data);
  }

  Future<void> suggest() async {
    setState(() => suggesting = true);
    try {
      final res = await widget.api.dio.post('/quotes/${widget.quoteId}/suggest', data: {});
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
      if (mounted) setState(() => suggesting = false);
    }
  }

  Future<void> send(Map option) async {
    final url = '${option['waUrl'] ?? ''}';
    final link = url.isNotEmpty && url != 'null' ? url : waMeUrl('${quote?['phone'] ?? ''}', '${option['text'] ?? ''}');
    if (link.isEmpty) {
      wqToast(context, 'Cliente sem WhatsApp válido');
      return;
    }
    await openLink(link);
    await logContact('whatsapp', 'Mensagem pelo WhatsApp');
  }

  @override
  Widget build(BuildContext context) {
    final q = quote;
    if (q == null) {
      return WqPage(title: 'Orçamento', child: Center(child: error == null ? const CircularProgressIndicator() : Text(error!)));
    }
    final open = quoteOpen(q);
    final activity = ((q['activity'] as List?) ?? const []).whereType<Map>().toList();
    final digits = '${q['phoneDigits'] ?? ''}';
    final hint = q['priority'] is Map ? '${(q['priority'] as Map)['hint'] ?? ''}' : '';
    return WqPage(
      title: '${q['name'] ?? 'Orçamento'}',
      subtitle: [if ('${q['phone'] ?? ''}'.isNotEmpty) maskPhone('${q['phone']}'), if ('${q['orderCode'] ?? ''}'.isNotEmpty) '#${q['orderCode']}'].join(' · '),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                QuoteAvatar(quote: q, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('ORÇADO', style: TextStyle(fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w800, color: context.wqMuted)),
                    Text((q['value'] ?? 0) > 0 ? brl(q['value']) : '—', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.8, color: context.wqInk)),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Pill(stageLabel(q['stage']), color: stageColor('${q['stage']}')),
                  if (open) ...[const SizedBox(height: 6), Pill(followUpText(q), color: followUpColor(q))],
                ]),
              ]),
              if (open && hint.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: priorityColor(q), shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(hint, style: TextStyle(color: context.wqMuted, fontSize: 12))),
                ]),
              ],
              const SizedBox(height: 14),
              Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018)),
                    onPressed: digits.isEmpty ? null : () => options.isEmpty ? suggest() : send(options.first),
                    icon: const Icon(Icons.chat, size: 18),
                    label: const Text('WhatsApp'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed: digits.isEmpty
                        ? null
                        : () async {
                            await openLink('tel:$digits');
                            await logContact('call', 'Ligação');
                          },
                    icon: const Icon(Icons.call_outlined, size: 18),
                    label: const Text('Ligar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Wq.action),
                    onPressed: busy || q['stage'] == 'won' ? null : win,
                    icon: const Icon(Icons.emoji_events_outlined, size: 18),
                    label: const Text('Fechou'),
                  ),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          const WqSectionTitle('Etapa'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final s in quoteStages)
              ChoiceChip(
                label: Text(s.$2),
                selected: q['stage'] == s.$1,
                selectedColor: stageColor(s.$1).withValues(alpha: 0.16),
                onSelected: busy || q['stage'] == s.$1 ? null : (_) => s.$1 == 'won' ? win() : patch({'stage': s.$1}),
              ),
          ]),
          if (open) ...[
            const SizedBox(height: 16),
            const WqSectionTitle('Ligar de novo'),
            FollowUpChips(selected: -1, onChanged: (days) => patch({'followUpAt': followUpIso(days)})),
          ],
          const SizedBox(height: 16),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                const Icon(Icons.auto_awesome, color: Wq.brand, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Mensagem para retomar', style: TextStyle(fontWeight: FontWeight.w800, color: context.wqInk))),
                if (ai) const Pill('IA', color: Wq.brand, filled: true),
              ]),
              const SizedBox(height: 10),
              if (official && open && digits.isNotEmpty) ...[
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: const Color(0xFF073018)),
                  onPressed: busy ? null : sendOfficial,
                  icon: const Icon(Icons.chat, size: 18),
                  label: const Text('Retomar pelo WhatsApp oficial'),
                ),
                const SizedBox(height: 8),
              ],
              AiQuotaNotice(quota: quota),
              if (options.isEmpty)
                OutlinedButton.icon(
                  onPressed: suggesting ? null : suggest,
                  icon: suggesting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome_outlined, size: 18),
                  label: const Text('Sugerir texto'),
                )
              else
                for (final opt in options)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: context.wqPaper, borderRadius: BorderRadius.circular(10), border: Border.all(color: context.wqLine)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${opt['label'] ?? ''}'.toUpperCase(), style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800, color: context.wqMuted)),
                      const SizedBox(height: 4),
                      Text('${opt['text'] ?? ''}', style: TextStyle(height: 1.4, color: context.wqInk)),
                      const SizedBox(height: 6),
                      Row(children: [
                        TextButton.icon(onPressed: digits.isEmpty ? null : () => send(opt), icon: const Icon(Icons.send, size: 16), label: const Text('Enviar')),
                        TextButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: '${opt['text'] ?? ''}'));
                            wqToast(context, 'Texto copiado');
                          },
                          icon: const Icon(Icons.copy, size: 16),
                          label: const Text('Copiar'),
                        ),
                      ]),
                    ]),
                  ),
            ]),
          ),
          const SizedBox(height: 16),
          const WqSectionTitle('O orçamento'),
          WqCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _line(context, 'Queria', '${q['what'] ?? ''}'.isEmpty ? '—' : '${q['what']}'),
              _line(context, 'Motivo', '${q['reasonLabel'] ?? ''}'.isEmpty ? '—' : '${q['reasonLabel']}${'${q['reasonNote'] ?? ''}'.isEmpty ? '' : ' · ${q['reasonNote']}'}'),
              _line(context, 'Contatos', '${q['contactCount'] ?? 0}${q['lastContactAt'] != null ? ' · último ${agoText(q['lastContactAt'])}' : ''}'),
              const SizedBox(height: 8),
              ReasonChips(value: q['reason'] as String?, onChanged: (r) => patch({'reason': r})),
            ]),
          ),
          const SizedBox(height: 16),
          const WqSectionTitle('Histórico'),
          Row(children: [
            Expanded(child: TextField(controller: note, decoration: const InputDecoration(hintText: 'Anotar: pediu para chamar dia 5…'))),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: () => run(() async {
                if (note.text.trim().isEmpty) return;
                final res = await widget.api.dio.post('/quotes/${widget.quoteId}/activity', data: {'kind': 'note', 'text': note.text.trim()});
                note.clear();
                apply(res.data);
              }),
              icon: const Icon(Icons.check),
            ),
          ]),
          const SizedBox(height: 8),
          for (final a in activity)
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: CircleAvatar(radius: 16, backgroundColor: context.wqPaper, child: Icon(_activityIcon('${a['kind']}'), size: 16, color: context.wqMuted)),
              title: Text('${a['text'] ?? ''}', style: TextStyle(color: context.wqInk)),
              subtitle: Text([if ('${a['byName'] ?? ''}'.isNotEmpty) '${a['byName']}', agoText(a['at'])].join(' · ')),
            ),
          if (open) ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: busy ? null : () => patch({'stage': 'lost'}),
              icon: const Icon(Icons.cancel_outlined, color: Wq.muted),
              label: const Text('Desistiu de vez', style: TextStyle(color: Wq.muted)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 80, child: Text(label, style: TextStyle(color: context.wqMuted))),
        Expanded(child: Text(value, style: TextStyle(color: context.wqInk))),
      ]),
    );
  }

  IconData _activityIcon(String kind) {
    switch (kind) {
      case 'call':
        return Icons.call_outlined;
      case 'whatsapp':
        return Icons.chat_outlined;
      case 'won':
        return Icons.emoji_events_outlined;
      case 'lost':
      case 'refused':
        return Icons.cancel_outlined;
      case 'stage':
        return Icons.swap_horiz;
      default:
        return Icons.edit_note;
    }
  }
}

/// Cadastro de orçamento do balcão (sem pedido). Devolve o id criado.
Future<String?> showNewQuoteSheet(BuildContext context, {required WorqeraApi api}) async {
  final name = TextEditingController();
  final phone = TextEditingController();
  final what = TextEditingController();
  final value = TextEditingController();
  String? reason;
  int? days = 1;
  var saving = false;
  final id = await showModalBottomSheet<String>(
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
              Text('Novo orçamento', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: sheet.wqInk)),
              const SizedBox(height: 4),
              Text('Quem pediu preço e não fechou. Não abre pedido.', style: TextStyle(color: sheet.wqMuted, fontSize: 13)),
              const SizedBox(height: 14),
              TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Cliente')),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: TextField(controller: phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'WhatsApp'))),
                const SizedBox(width: 10),
                Expanded(child: TextField(controller: value, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Valor orçado'))),
              ]),
              const SizedBox(height: 10),
              TextField(controller: what, decoration: const InputDecoration(labelText: 'O que queria', hintText: 'Ex.: pintura no Jordan 1')),
              const SizedBox(height: 14),
              const Text('Por que não fechou', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ReasonChips(value: reason, onChanged: (v) => setSheet(() => reason = v)),
              const SizedBox(height: 14),
              const Text('Ligar de novo', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              FollowUpChips(selected: days, onChanged: (v) => setSheet(() => days = v)),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        if (name.text.trim().isEmpty) {
                          wqToast(sheet, 'Informe o nome do cliente');
                          return;
                        }
                        setSheet(() => saving = true);
                        try {
                          final res = await api.dio.post('/quotes', data: {
                            'name': name.text.trim(),
                            'phone': phone.text.trim(),
                            'what': what.text.trim(),
                            'value': double.tryParse(value.text.replaceAll(',', '.')) ?? 0,
                            'reason': reason,
                            'followUpAt': followUpIso(days),
                          });
                          final created = (res.data as Map)['quote'];
                          if (sheet.mounted) Navigator.pop(sheet, created is Map ? '${created['id']}' : null);
                        } catch (e) {
                          setSheet(() => saving = false);
                          if (sheet.mounted) wqToast(sheet, api.message(e));
                        }
                      },
                child: Text(saving ? 'Salvando…' : 'Registrar orçamento'),
              ),
            ]),
          ),
        );
      },
    ),
  );
  Future.delayed(const Duration(milliseconds: 500), () {
    for (final c in [name, phone, what, value]) {
      c.dispose();
    }
  });
  return id;
}

/// Orçamentos de um cliente, na ficha dele.
class ClientQuotesSection extends StatefulWidget {
  const ClientQuotesSection({super.key, required this.api, required this.session, required this.clientId});
  final WorqeraApi api;
  final SessionStore session;
  final String clientId;

  @override
  State<ClientQuotesSection> createState() => _ClientQuotesSectionState();
}

class _ClientQuotesSectionState extends State<ClientQuotesSection> {
  List<Map<String, dynamic>> quotes = [];

  @override
  void initState() {
    super.initState();
    if (widget.session.isSector) return;
    widget.api.dio.get('/quotes', queryParameters: {'view': 'all', 'clientId': widget.clientId}).then((res) {
      final list = ((res.data as Map)['quotes'] as List? ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      if (mounted) setState(() => quotes = list);
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    if (quotes.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 16),
      const WqSectionTitle('Orçamentos'),
      for (final q in quotes)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: WqCard(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => QuoteDetailScreen(api: widget.api, session: widget.session, quoteId: '${q['id']}'),
            )),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${q['what'] ?? ''}'.isEmpty ? 'Orçamento' : '${q['what']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('${q['reasonLabel'] ?? ''}'.isEmpty ? 'Sem motivo' : '${q['reasonLabel']}', style: TextStyle(color: context.wqMuted, fontSize: 12)),
                ]),
              ),
              if ((q['value'] ?? 0) > 0) Padding(padding: const EdgeInsets.only(right: 8), child: Text(money0(q['value']))),
              Pill(stageLabel(q['stage']), color: stageColor('${q['stage']}')),
            ]),
          ),
        ),
    ]);
  }
}
