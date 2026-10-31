import 'package:flutter/material.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';
import '../ops/attendance_screen.dart';
import '../ops/ops_screens.dart';
import '../products/products_screen.dart';
import '../settings/settings_screens.dart';

typedef HubEntry = (String id, String label, IconData icon, Widget Function() build);

/// One menu item that holds several pages (Catálogo, Equipe, Relatórios) — same groups as the site.
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

List<HubEntry> catalogEntries(WorqeraApi api, SessionStore session) => [
      ('servicos', 'Serviços', Icons.build_outlined, () => CatalogScreen(api: api, title: 'Serviços', subtitle: 'O que entra no pedido', path: '/services', price: true)),
      if (session.isAdmin) ('produtos', 'Produtos e estoque', Icons.shopping_bag_outlined, () => ProductsScreen(api: api)),
      ('setores', 'Setores do kanban', Icons.view_column_outlined, () => CatalogScreen(api: api, title: 'Setores', subtitle: 'Colunas do kanban', path: '/sectors', sector: true)),
      ('marcas', 'Marcas', Icons.sell_outlined, () => CatalogScreen(api: api, title: 'Marcas', subtitle: 'Catálogo usado no pedido', path: '/brands')),
      ('acessorios', 'Acessórios', Icons.inventory_2_outlined, () => CatalogScreen(api: api, title: 'Acessórios', subtitle: 'Itens que acompanham o pedido', path: '/accessories')),
    ];

List<HubEntry> teamEntries(WorqeraApi api) => [
      ('equipe', 'Acessos', Icons.group_outlined, () => TeamScreen(api: api)),
      ('funcionarios', 'Funcionários', Icons.badge_outlined, () => EmployeesScreen(api: api)),
    ];

List<HubEntry> reportEntries(WorqeraApi api) => [
      ('metricas', 'Métricas', Icons.bar_chart, () => MetricsScreen(api: api)),
      ('atendimento', 'Desempenho da equipe', Icons.how_to_reg_outlined, () => AttendanceScreen(api: api)),
    ];
