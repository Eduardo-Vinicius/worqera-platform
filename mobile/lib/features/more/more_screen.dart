import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';
import '../../design/ui.dart';
import '../admin/admin_screens.dart';
import '../auth/privacy_screen.dart';
import '../lookup/simple_lists.dart';
import 'hub_screen.dart';
import '../comms/comms_screen.dart';
import '../ops/ops_screens.dart';
import '../orders/order_detail_screen.dart';
import '../orders/order_form_screen.dart';
import '../quotes/quotes_screen.dart';
import '../settings/settings_screens.dart';
import '../settings/tv_boards.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({super.key, required this.api, required this.session, required this.open});
  final WorqeraApi api;
  final SessionStore session;
  final void Function(Widget page) open;

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  final flags = ModuleFlags();

  @override
  void initState() {
    super.initState();
    widget.api.dio.get('/runtime/config').then((res) {
      if (!mounted || res.data is! Map) return;
      flags.apply(Map<String, dynamic>.from(res.data as Map));
      setState(() {});
    }).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final api = widget.api;
    void open(Widget page, {String id = 'painel', bool stack = false}) {
      final scope = ShellScope.maybeOf(context);
      if (scope != null) {
        scope.openPage(id, page, stack: stack);
        return;
      }
      widget.open(page);
    }
    void openOrder(String id) {
      final page = OrderDetailScreen(
        api: api,
        session: session,
        orderId: id,
        onEdit: () => open(OrderFormScreen(api: api, session: session, orderId: id), id: 'order-edit', stack: true),
      );
      final scope = ShellScope.maybeOf(context);
      if (scope != null) {
        scope.openPage('order', page, stack: true);
        return;
      }
      context.push('/orders/$id');
    }
    final inShop = session.shopId.isNotEmpty;
    return WqPage(
      title: 'Mais',
      subtitle: session.shopName.isEmpty ? 'Worqera' : session.shopName,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          if (inShop) ...[
            const _Heading('Operação'),
            if (!session.isSector && flags.on('orders')) _row(context, 'Orçamentos', Icons.request_quote_outlined, () => open(QuotesScreen(api: api, session: session), id: 'quotes')),
            if (flags.on('consultas')) _row(context, 'Consultas', Icons.search, () => open(ConsultasScreen(api: api, session: session, openOrder: openOrder))),
            _row(context, 'Ler QR', Icons.qr_code_scanner, () => context.go('/qr')),
          ],
          if (inShop && !session.isSector) ...[
            const _Heading('Clientes'),
            if (flags.on('clients')) _row(context, 'Clientes e CRM', Icons.people_outline, () => open(ClientsScreen(api: api, session: session, openClient: (id) => open(ClientDetailScreen(api: api, clientId: id, session: session), id: 'client', stack: true)))),
            if (flags.on('reviews')) _row(context, 'Avaliações', Icons.star_outline, () => open(ReviewsScreen(api: api))),
            _row(context, 'WhatsApp e e-mail', Icons.forum_outlined, () => open(CommsScreen(api: api, session: session))),
          ],
          if (inShop && (session.isAdmin || (session.seesShopSetup && flags.on('tv')))) ...[
            const _Heading('Gestão'),
            if (session.isAdmin && flags.on('finance')) _row(context, 'Financeiro', Icons.account_balance_wallet_outlined, () => open(FinanceScreen(api: api, stock: true))),
            if (session.isAdmin && flags.on('metrics'))
              _row(context, 'Relatórios', Icons.bar_chart, () => open(HubScreen(title: 'Relatórios', subtitle: 'Métricas e desempenho da equipe', entries: reportEntries(api)))),
            if (session.seesShopSetup && flags.on('tv')) _row(context, 'Telas da loja', Icons.tv_outlined, () => open(TvScreen(api: api))),
            if (session.isAdmin && flags.on('finance')) _row(context, 'TV Financeiro', Icons.monitor, () => open(TvFinanceBoard(api: api))),
          ],
          if (inShop && session.seesShopSetup) ...[
            const _Heading('Configurações'),
            _row(context, 'Empresa', Icons.apartment_outlined, () => open(EmpresaScreen(api: api))),
            _row(context, 'Catálogo', Icons.inventory_2_outlined, () => open(HubScreen(title: 'Catálogo', subtitle: 'Serviços, produtos, setores, marcas e acessórios', entries: catalogEntries(api, session)))),
            if (session.isAdmin) _row(context, 'Equipe', Icons.group_outlined, () => open(HubScreen(title: 'Equipe', subtitle: 'Acessos e funcionários', entries: teamEntries(api)))),
            if (session.isAdmin) _row(context, 'Plano', Icons.credit_card, () => open(BillingScreen(api: api)), emphasize: true),
          ],
          if (session.visiting)
            _row(context, 'Voltar às oficinas', Icons.arrow_back, () {
              session.leaveShop().then((_) {
                if (context.mounted) context.go('/more');
              });
            }),
          if (session.platformAdmin) ...[
            const _Heading('Plataforma'),
            _row(context, 'Oficinas', Icons.shield_outlined, () => open(ShopsScreen(api: api))),
            _row(context, 'Portal', Icons.monitor_heart_outlined, () => open(PortalScreen(api: api))),
            _row(context, 'Parâmetros', Icons.tune, () => open(ParamsScreen(api: api))),
            _row(context, 'Notícias', Icons.campaign_outlined, () => open(NoticesScreen(api: api))),
          ],
          const SizedBox(height: 12),
          _row(context, 'Privacidade', Icons.privacy_tip_outlined, () => open(const PrivacyScreen())),
          ListTile(
            title: const Text('Sair', style: TextStyle(color: Wq.danger, fontWeight: FontWeight.w700)),
            leading: const Icon(Icons.logout, color: Wq.danger),
            onTap: () => api.logout(),
          ),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, String label, IconData icon, VoidCallback onTap, {bool emphasize = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: WqCard(
        onTap: onTap,
        child: Row(children: [
          Icon(icon, color: emphasize ? Wq.brand : context.wqInk),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: emphasize ? Wq.brand : context.wqInk))),
          const Icon(Icons.chevron_right, color: Wq.muted),
        ]),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 12, 4, 8),
      child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, letterSpacing: 1.3, color: Wq.muted, fontWeight: FontWeight.w800)),
    );
  }
}
