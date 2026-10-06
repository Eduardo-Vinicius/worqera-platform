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
import '../ops/ops_screens.dart';
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
    final open = widget.open;
    final inShop = session.shopId.isNotEmpty;
    return WqPage(
      title: 'Mais',
      subtitle: session.shopName.isEmpty ? 'Worqera' : session.shopName,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          if (inShop) ...[
            const _Heading('Operação'),
            if (!session.isSector && flags.on('clients')) _row(context, 'Clientes', Icons.people_outline, () => open(ClientsScreen(api: api, openClient: (id) => open(ClientDetailScreen(api: api, clientId: id))))),
            if (flags.on('consultas')) _row(context, 'Consultas', Icons.search, () => open(ConsultasScreen(api: api, openOrder: (id) => context.push('/orders/$id'), openClient: (id) => open(ClientDetailScreen(api: api, clientId: id))))),
            if (!session.isSector && flags.on('reviews')) _row(context, 'Avaliações', Icons.star_outline, () => open(ReviewsScreen(api: api))),
            _row(context, 'Ler QR', Icons.qr_code_scanner, () => context.go('/qr')),
          ],
          if (inShop && session.seesShopSetup) ...[
            const _Heading('Configuração'),
            _row(context, 'Empresa', Icons.apartment_outlined, () => open(EmpresaScreen(api: api))),
            _row(context, 'Setores', Icons.view_column_outlined, () => open(CatalogScreen(api: api, title: 'Setores', subtitle: 'Colunas do kanban', path: '/sectors', sector: true))),
            _row(context, 'Serviços', Icons.build_outlined, () => open(CatalogScreen(api: api, title: 'Serviços', subtitle: 'O que entra no pedido', path: '/services', price: true))),
            _row(context, 'Marcas', Icons.sell_outlined, () => open(CatalogScreen(api: api, title: 'Marcas', subtitle: 'Catálogo usado no pedido', path: '/brands'))),
            _row(context, 'Acessórios', Icons.inventory_2_outlined, () => open(CatalogScreen(api: api, title: 'Acessórios', subtitle: 'Itens que acompanham o pedido', path: '/accessories'))),
            _row(context, 'Equipe', Icons.group_outlined, () => open(TeamScreen(api: api))),
            _row(context, 'Funcionários', Icons.badge_outlined, () => open(CatalogScreen(api: api, title: 'Funcionários', subtitle: 'Quem executa, sem login', path: '/employees'))),
            if (flags.on('tv')) _row(context, 'TVs', Icons.tv_outlined, () => open(TvScreen(api: api))),
          ],
          if (inShop && session.isAdmin) ...[
            const _Heading('Gestão'),
            _row(context, 'Plano', Icons.credit_card, () => open(BillingScreen(api: api)), emphasize: true),
            if (flags.on('finance')) _row(context, 'Financeiro', Icons.account_balance_wallet_outlined, () => open(FinanceScreen(api: api))),
            if (flags.on('finance')) _row(context, 'TV Financeiro', Icons.monitor, () => open(TvFinanceBoard(api: api))),
            if (flags.on('metrics')) _row(context, 'Métricas', Icons.bar_chart, () => open(MetricsScreen(api: api))),
          ],
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
