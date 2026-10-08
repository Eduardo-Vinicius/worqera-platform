import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../config/app_config.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../brand/theme_store.dart';
import '../../brand/tokens.dart';
import '../../design/flow.dart';
import '../../design/sheet.dart';
import '../../design/ui.dart';
import '../admin/admin_screens.dart';
import '../auth/privacy_screen.dart';
import '../lookup/simple_lists.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';
import '../ops/ops_screens.dart';
import '../settings/settings_screens.dart';
import '../settings/tv_boards.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.session, required this.api, required this.theme, required this.navigationShell});
  final SessionStore session;
  final WorqeraApi api;
  final ThemeStore theme;
  final StatefulNavigationShell navigationShell;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final scaffoldKey = GlobalKey<ScaffoldState>();
  final flags = ModuleFlags();
  String? banner;
  int readyCount = 0;
  final List<_Pane> pages = [];

  void openPage(String id, Widget page, {bool stack = false}) {
    setState(() {
      if (!stack) pages.clear();
      pages.add(_Pane(id, page));
    });
  }

  void popPage() {
    if (pages.isEmpty) return;
    setState(() => pages.removeLast());
  }

  void clearPages() {
    if (pages.isEmpty) return;
    setState(() => pages.clear());
  }

  @override
  void initState() {
    super.initState();
    loadChrome();
  }

  Future<void> loadChrome() async {
    try {
      final config = await widget.api.dio.get('/runtime/config', queryParameters: {'platform': 'ios'});
      flags.apply(Map<String, dynamic>.from(config.data as Map));
    } catch (_) {}
    try {
      final sub = await widget.api.dio.get('/billing/subscription');
      final body = Map<String, dynamic>.from(sub.data as Map);
      final row = body['subscription'] is Map ? body['subscription'] as Map : body;
      final status = '${row['status'] ?? ''}';
      final end = DateTime.tryParse('${row['trialEndsAt'] ?? ''}');
      final left = end?.difference(DateTime.now()).inDays;
      final local = AppConfig.apiBase.contains('127.0.0.1') || AppConfig.apiBase.contains('localhost') || AppConfig.apiBase.contains('10.0.2.2');
      final enforced = body.containsKey('enforced') ? body['enforced'] == true : !local;
      if (!enforced) {
        banner = null;
      } else if (status == 'expired' || status == 'canceled' || status == 'past_due' || (status == 'trialing' && left != null && left <= 0)) {
        banner = 'Plano parado. Abra Plano no menu para regularizar.';
      } else if (status == 'trialing' && left != null && left <= 7) {
        banner = 'Trial acaba em $left dia${left == 1 ? '' : 's'}.';
      }
    } catch (_) {}
    if (widget.session.isAdmin) {
      try {
        final inbox = await widget.api.dio.get('/alerts/inbox');
        final body = Map<String, dynamic>.from(inbox.data as Map);
        final feedback = body['feedback'] is List ? (body['feedback'] as List).length : 0;
        final ready = int.tryParse('${body['readyCount'] ?? 0}') ?? 0;
        final reopened = int.tryParse('${body['reopenedCount'] ?? 0}') ?? 0;
        readyCount = ready + reopened + feedback;
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> jumpTo(String raw) async {
    final code = raw.trim();
    if (code.isEmpty) return;
    try {
      final res = await widget.api.dio.get('/orders', queryParameters: {'code': code});
      final rows = asMaps(res.data);
      if (!mounted) return;
      if (rows.isEmpty) {
        wqToast(context, 'Pedido não encontrado');
        return;
      }
      final id = '${rows.first['id'] ?? rows.first['_id']}';
      openPage(
        'order',
        OrderDetailScreen(
          api: widget.api,
          session: widget.session,
          orderId: id,
          onEdit: () => openPage('order-edit', OrderFormScreen(api: widget.api, session: widget.session, orderId: id), stack: true),
        ),
        stack: true,
      );
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final sector = widget.session.isSector;
    final branches = sector ? const [1] : const [0, 1, -1, 3];
    final items = sector
        ? const <(IconData, String)>[(Icons.view_kanban_outlined, 'Kanban')]
        : const <(IconData, String)>[
            (Icons.home_rounded, 'Início'),
            (Icons.view_kanban_outlined, 'Kanban'),
            (Icons.add_rounded, 'Novo pedido'),
            (Icons.qr_code_scanner_rounded, 'Ler QR'),
          ];
    final selected = branches.indexOf(widget.navigationShell.currentIndex);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final line = dark ? WqTokens.darkBorder : Wq.line;
    final surface = dark ? WqTokens.darkSurface : Wq.surface;
    return ShellScope(
      openMenu: () => scaffoldKey.currentState?.openDrawer(),
      openPage: openPage,
      popPage: popPage,
      depth: pages.length,
      child: Scaffold(
        key: scaffoldKey,
        drawer: _Drawer(
          session: widget.session,
          api: widget.api,
          theme: widget.theme,
          flags: flags,
          pageId: pages.isEmpty ? null : pages.last.id,
          onOpen: (id, page) {
            Navigator.pop(context);
            openPage(id, page);
          },
          onStack: (id, page) => openPage(id, page, stack: true),
          onGo: (path) {
            Navigator.pop(context);
            clearPages();
            context.go(path);
          },
        ),
        body: SafeArea(
          bottom: false,
          child: Column(children: [
          if (banner != null)
            Material(
              color: Wq.warn.withValues(alpha: 0.16),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Text(banner!, style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          Material(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
              child: Row(children: [
                Material(
                  color: surface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: line)),
                  child: IconButton(tooltip: 'Menu', onPressed: () => scaffoldKey.currentState?.openDrawer(), icon: const Icon(Icons.menu_rounded)),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Text('Worqera', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, letterSpacing: -0.3))),
                IconButton(
                  tooltip: 'Código do pedido',
                  onPressed: () async {
                    final code = await showWqSheet<String>(
                      context,
                      title: 'Código do pedido',
                      child: (sheet) => WqSheetFields(
                        create: () => [TextEditingController()],
                        builder: (_, fields) => Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextField(controller: fields[0], autofocus: true, decoration: const InputDecoration(hintText: 'Ex.: 1042'), onSubmitted: (value) => Navigator.pop(sheet, value.trim())),
                            const SizedBox(height: 8),
                            FilledButton(onPressed: () => Navigator.pop(sheet, fields[0].text.trim()), child: const Text('Abrir')),
                          ],
                        ),
                      ),
                    );
                    if (code != null && code.isNotEmpty) jumpTo(code);
                  },
                  icon: const Icon(Icons.search),
                ),
                if (widget.session.isAdmin)
                  IconButton(
                    tooltip: 'Avisos',
                    onPressed: () async {
                      Map<String, dynamic> body = {};
                      try {
                        final inbox = await widget.api.dio.get('/alerts/inbox');
                        body = Map<String, dynamic>.from(inbox.data as Map);
                      } catch (e) {
                        if (!context.mounted) return;
                        wqToast(context, widget.api.message(e));
                        return;
                      }
                      if (!context.mounted) return;
                      final ready = int.tryParse('${body['readyCount'] ?? 0}') ?? 0;
                      final reopened = int.tryParse('${body['reopenedCount'] ?? 0}') ?? 0;
                      final readyRows = body['ready'] is List ? body['ready'] as List : const [];
                      final feedback = body['feedback'] is List ? body['feedback'] as List : const [];
                      try {
                        await widget.api.dio.post('/alerts/inbox/read');
                        if (mounted) setState(() => readyCount = 0);
                      } catch (e) {
                        if (!context.mounted) return;
                        wqToast(context, widget.api.message(e));
                        return;
                      }
                      if (!context.mounted) return;
                      await showModalBottomSheet<void>(
                        context: context,
                        showDragHandle: true,
                        isScrollControlled: true,
                        builder: (ctx) => Padding(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                            const Text('Avisos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                            const SizedBox(height: 4),
                            Text(
                              ready == 0 && reopened == 0 && feedback.isEmpty ? 'Nada novo desde a última leitura.' : 'Lidos agora. Só volta o que chegar depois.',
                              style: const TextStyle(color: Wq.muted),
                            ),
                            if (ready > 0) ...[
                              const SizedBox(height: 12),
                              Text('$ready pedido${ready == 1 ? '' : 's'} pronto${ready == 1 ? '' : 's'}.', style: const TextStyle(fontWeight: FontWeight.w700)),
                              for (final row in readyRows.take(8))
                                if (row is Map) Text('${row['code'] ?? ''} · ${row['clientName'] ?? ''}'.trim(), style: const TextStyle(height: 1.4)),
                            ],
                            if (reopened > 0) Padding(padding: const EdgeInsets.only(top: 8), child: Text('$reopened reaberto${reopened == 1 ? '' : 's'} no fluxo.')),
                            for (final row in feedback.take(8))
                              if (row is Map)
                                Padding(
                                  padding: const EdgeInsets.only(top: 10),
                                  child: Text('${row['code'] ?? ''} · ${row['score'] ?? ''}/5 ${row['comment'] ?? ''}'.trim()),
                                ),
                          ]),
                        ),
                      );
                    },
                    icon: Badge(isLabelVisible: readyCount > 0, label: Text('$readyCount'), child: const Icon(Icons.notifications_none)),
                  ),
                IconButton(tooltip: widget.theme.dark ? 'Tema claro' : 'Tema escuro', onPressed: widget.theme.toggle, icon: Icon(widget.theme.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined)),
              ]),
            ),
          ),
          Expanded(child: pages.isEmpty ? widget.navigationShell : pages.last.page),
        ]),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: WqDock(
            items: items,
            selected: selected,
            actionIndex: sector ? null : 2,
            onTap: (index) {
              clearPages();
              if (!sector && index == 2) {
                context.push('/orders/new');
                return;
              }
              final branch = branches[index];
              widget.navigationShell.goBranch(branch, initialLocation: branch == widget.navigationShell.currentIndex);
            },
          ),
        ),
      ),
    );
  }
}

class _Pane {
  _Pane(this.id, this.page);
  final String id;
  final Widget page;
}

class _Drawer extends StatelessWidget {
  const _Drawer({
    required this.session,
    required this.api,
    required this.theme,
    required this.flags,
    required this.onOpen,
    required this.onGo,
    required this.onStack,
    this.pageId,
  });
  final SessionStore session;
  final WorqeraApi api;
  final ThemeStore theme;
  final ModuleFlags flags;
  final void Function(String id, Widget page) onOpen;
  final void Function(String path) onGo;
  final void Function(String id, Widget page) onStack;
  final String? pageId;

  void _go(BuildContext context, String path) => onGo(path);

  void _open(String id, Widget page) => onOpen(id, page);

  @override
  Widget build(BuildContext context) {
    final setup = session.seesShopSetup;
    final admin = session.isAdmin;
    final inShop = session.shopId.isNotEmpty;
    final markUrl = fileUrl(session.logoUrl);
    return Drawer(
      backgroundColor: WqTokens.sidebar,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
              child: Row(children: [
                markUrl.isEmpty
                    ? const _BrandMark()
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          markUrl,
                          width: 40,
                          height: 40,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const _BrandMark(),
                        ),
                      ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(session.shopName.isEmpty ? 'Worqera' : session.shopName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: WqTokens.sidebarForeground, fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(session.userName.isEmpty ? 'Worqera' : session.userName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ]),
                ),
              ]),
            ),
            if (inShop) ...[
            const _Section('Operação'),
            if (!session.isSector) _item(context, Icons.space_dashboard_outlined, 'Visão geral', () => _go(context, '/home')),
            if (flags.on('kanban')) _item(context, Icons.view_kanban_outlined, 'Kanban', () => _go(context, '/kanban')),
            if (!session.isSector && flags.on('orders')) _item(context, Icons.receipt_long_outlined, 'Pedidos', () => _go(context, '/orders')),
            if (!session.isSector && flags.on('clients')) _item(context, Icons.people_outline, 'Clientes', () => _open('clients', ClientsScreen(api: api, session: session, openClient: (id) => onStack('client', ClientDetailScreen(api: api, clientId: id, session: session))))),
            if (flags.on('consultas')) _item(context, Icons.search, 'Consultas', () => _open('consultas', ConsultasScreen(api: api, session: session, openOrder: (id) => onStack('order', OrderDetailScreen(api: api, session: session, orderId: id, onEdit: () => onStack('order-edit', OrderFormScreen(api: api, session: session, orderId: id))))))),
            if (!session.isSector && flags.on('reviews')) _item(context, Icons.star_outline, 'Avaliações', () => _open('reviews', ReviewsScreen(api: api))),
            _item(context, Icons.qr_code_scanner, 'Ler QR', () => _go(context, '/qr')),
            ],
            if (inShop && setup) ...[
              const _Section('Configuração'),
              _item(context, Icons.apartment_outlined, 'Empresa', () => _open('empresa', EmpresaScreen(api: api))),
              _item(context, Icons.view_column_outlined, 'Setores', () => _open('setores', CatalogScreen(api: api, title: 'Setores', subtitle: 'Colunas do kanban', path: '/sectors', sector: true))),
              _item(context, Icons.build_outlined, 'Serviços', () => _open('servicos', CatalogScreen(api: api, title: 'Serviços', subtitle: 'O que entra no pedido', path: '/services', price: true))),
              _item(context, Icons.sell_outlined, 'Marcas', () => _open('marcas', CatalogScreen(api: api, title: 'Marcas', subtitle: 'Catálogo usado no pedido', path: '/brands'))),
              _item(context, Icons.inventory_2_outlined, 'Acessórios', () => _open('acessorios', CatalogScreen(api: api, title: 'Acessórios', subtitle: 'Itens que acompanham o pedido', path: '/accessories'))),
              _item(context, Icons.group_outlined, 'Equipe', () => _open('equipe', TeamScreen(api: api))),
              _item(context, Icons.badge_outlined, 'Funcionários', () => _open('funcionarios', EmployeesScreen(api: api))),
              if (flags.on('tv')) _item(context, Icons.tv_outlined, 'TVs', () => _open('tvs', TvScreen(api: api))),
            ],
            if (inShop && admin) ...[
              const _Section('Gestão'),
              _item(context, Icons.credit_card, 'Plano', () => _open('plano', BillingScreen(api: api))),
              if (flags.on('finance')) _item(context, Icons.account_balance_wallet_outlined, 'Financeiro', () => _open('financeiro', FinanceScreen(api: api))),
              if (flags.on('finance')) _item(context, Icons.monitor, 'TV Financeiro', () => _open('tv-financeiro', TvFinanceBoard(api: api))),
              if (flags.on('metrics')) _item(context, Icons.bar_chart, 'Métricas', () => _open('metricas', MetricsScreen(api: api))),
            ],
            if (session.platformAdmin) ...[
              const _Section('Plataforma'),
              _item(context, Icons.shield_outlined, 'Oficinas', () => _open('oficinas', ShopsScreen(api: api))),
              _item(context, Icons.monitor_heart_outlined, 'Portal', () => _open('portal', PortalScreen(api: api))),
              _item(context, Icons.tune, 'Parâmetros', () => _open('parametros', ParamsScreen(api: api))),
              _item(context, Icons.campaign_outlined, 'Notícias', () => _open('noticias', NoticesScreen(api: api))),
            ],
            const SizedBox(height: 8),
            _item(context, Icons.privacy_tip_outlined, 'Privacidade', () => _open('privacidade', const PrivacyScreen())),
            _item(context, theme.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, theme.dark ? 'Tema claro' : 'Tema escuro', () => theme.toggle()),
            _item(context, Icons.logout, 'Sair', () {
              Navigator.pop(context);
              api.logout();
            }, danger: true),
          ],
        ),
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, String label, VoidCallback onTap, {bool danger = false}) {
    final color = danger ? const Color(0xFFFCA5A5) : const Color(0xFFCBD5E1);
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: ListTile(
        dense: true,
        visualDensity: VisualDensity.compact,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        leading: Icon(icon, color: color, size: 20),
        title: Text(label, style: TextStyle(color: danger ? color : Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
        onTap: onTap,
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(colors: [Color(0xFF4F0FA6), Color(0xFF7D26DE)]),
      ),
      child: const Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.label);
  final String label;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 4),
      child: Text(label.toUpperCase(), style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.4)),
    );
  }
}
