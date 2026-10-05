import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/ui.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.session, required this.api, required this.navigationShell});
  final SessionStore session;
  final WorqeraApi api;
  final StatefulNavigationShell navigationShell;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    final sector = widget.session.isSector;
    final branches = sector ? const [1, 3, 4] : const [0, 1, 2, 3, 4];
    final labels = sector ? const ['Kanban', 'QR', 'Mais'] : const ['Início', 'Kanban', 'Pedidos', 'QR', 'Mais'];
    final icons = sector
        ? const [Icons.view_kanban_outlined, Icons.qr_code_scanner, Icons.more_horiz]
        : const [Icons.home_outlined, Icons.view_kanban_outlined, Icons.receipt_long_outlined, Icons.qr_code_scanner, Icons.more_horiz];
    final selected = branches.indexOf(widget.navigationShell.currentIndex);
    return ShellScope(
      openMenu: () => scaffoldKey.currentState?.openDrawer(),
      child: Scaffold(
        key: scaffoldKey,
        drawer: _Drawer(session: widget.session, api: widget.api),
        body: widget.navigationShell,
        bottomNavigationBar: NavigationBar(
          backgroundColor: Wq.surface,
          selectedIndex: selected < 0 ? 0 : selected,
          onDestinationSelected: (index) {
            widget.navigationShell.goBranch(branches[index], initialLocation: branches[index] == widget.navigationShell.currentIndex);
          },
          destinations: [
            for (var i = 0; i < labels.length; i++) NavigationDestination(icon: Icon(icons[i]), label: labels[i]),
          ],
        ),
      ),
    );
  }
}

class _Drawer extends StatelessWidget {
  const _Drawer({required this.session, required this.api});
  final SessionStore session;
  final WorqeraApi api;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Wq.ink,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(session.shopName.isEmpty ? 'Worqera' : session.shopName, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                Text(session.userName.isEmpty ? 'Worqera' : session.userName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              ]),
            ),
            if (!session.isSector) _item(context, 'Visão geral', () => context.go('/home')),
            _item(context, 'Kanban', () => context.go('/kanban')),
            if (!session.isSector) _item(context, 'Pedidos', () => context.go('/orders')),
            _item(context, 'Mais', () => context.go('/more')),
            const Divider(color: Colors.white24),
            _item(context, 'Sair', () => api.logout(), danger: true),
          ],
        ),
      ),
    );
  }

  Widget _item(BuildContext context, String label, VoidCallback onTap, {bool danger = false}) {
    return ListTile(
      title: Text(label, style: TextStyle(color: danger ? const Color(0xFFFCA5A5) : Colors.white, fontWeight: FontWeight.w600)),
      onTap: () {
        Navigator.pop(context);
        onTap();
      },
    );
  }
}
