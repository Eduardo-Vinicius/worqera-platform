import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';
import '../admin/admin_screens.dart';
import '../admin/platform_screens.dart';
import '../ops/attendance_screen.dart';
import '../ops/ops_screens.dart';
import '../products/products_screen.dart';
import '../settings/settings_screens.dart';

typedef HubEntry = (String id, String label, IconData icon, Widget Function() build);

/// A small page that lists a few related screens (ex.: Marcas e acessórios).
class HubScreen extends StatelessWidget {
  const HubScreen({super.key, required this.title, required this.subtitle, required this.entries});
  final String title;
  final String subtitle;
  final List<HubEntry> entries;

  void _open(BuildContext context, HubEntry entry) {
    final page = entry.$4();
    final scope = ShellScope.maybeOf(context);
    if (scope != null) {
      scope.openPage(entry.$1, page, stack: true);
    } else {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: title,
      subtitle: subtitle,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          for (final entry in entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: WqCard(
                onTap: () => _open(context, entry),
                child: Row(children: [
                  Icon(entry.$3, color: Wq.brand),
                  const SizedBox(width: 12),
                  Expanded(child: Text(entry.$2, style: const TextStyle(fontWeight: FontWeight.w700))),
                  Icon(Icons.chevron_right, color: context.wqMuted),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

/// Menu shortcuts shared by "Mais" and the side drawer — same items as the site menu.
List<HubEntry> catalogShortcuts(WorqeraApi api, SessionStore session) => [
      ('servicos', 'Serviços', Icons.build_outlined, () => CatalogScreen(api: api, title: 'Serviços', subtitle: 'O que entra no pedido', path: '/services', price: true)),
      if (session.isAdmin) ('produtos', 'Produtos e estoque', Icons.shopping_bag_outlined, () => ProductsScreen(api: api)),
      ('setores', 'Setores do kanban', Icons.view_column_outlined, () => CatalogScreen(api: api, title: 'Setores', subtitle: 'Colunas do kanban', path: '/sectors', sector: true)),
      (
        'marcas-acessorios',
        'Marcas e acessórios',
        Icons.sell_outlined,
        () => HubScreen(title: 'Marcas e acessórios', subtitle: 'Catálogos usados no pedido', entries: [
              ('marcas', 'Marcas', Icons.sell_outlined, () => CatalogScreen(api: api, title: 'Marcas', subtitle: 'Catálogo usado no pedido', path: '/brands')),
              ('acessorios', 'Acessórios', Icons.inventory_2_outlined, () => CatalogScreen(api: api, title: 'Acessórios', subtitle: 'Itens que acompanham o pedido', path: '/accessories')),
            ]),
      ),
    ];

List<HubEntry> reportShortcuts(WorqeraApi api) => [
      ('metricas', 'Métricas', Icons.bar_chart, () => MetricsScreen(api: api)),
      ('atendimento', 'Desempenho da equipe', Icons.how_to_reg_outlined, () => AttendanceScreen(api: api)),
    ];

List<HubEntry> teamShortcuts(WorqeraApi api) => [
      ('equipe', 'Equipe e acessos', Icons.group_outlined, () => TeamScreen(api: api)),
      ('funcionarios', 'Funcionários', Icons.badge_outlined, () => EmployeesScreen(api: api)),
    ];

List<HubEntry> platformShortcuts(WorqeraApi api) => [
      ('p-visao', 'Visão geral', Icons.insights_outlined, () => PlatformOverviewScreen(api: api)),
      ('p-metricas', 'Métricas', Icons.speed_outlined, () => PlatformMetricsScreen(api: api)),
      ('p-analises', 'Análises', Icons.trending_up, () => PlatformAnalysesScreen(api: api)),
      ('p-operacao', 'Operação', Icons.checklist_rtl, () => PlatformQueuesScreen(api: api)),
      ('oficinas', 'Oficinas', Icons.shield_outlined, () => ShopsScreen(api: api)),
      ('p-contas', 'Contas', Icons.contact_page_outlined, () => PlatformAccountsScreen(api: api)),
      ('p-emails', 'E-mails', Icons.mail_outline, () => PlatformEmailsScreen(api: api)),
      ('portal', 'Portal técnico', Icons.monitor_heart_outlined, () => PortalScreen(api: api)),
      ('parametros', 'Parâmetros', Icons.tune, () => ParamsScreen(api: api)),
      ('noticias', 'Notícias', Icons.campaign_outlined, () => NoticesScreen(api: api)),
    ];
