import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'api/worqera_api.dart';
import 'auth/session.dart';
import 'brand/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';
import 'features/kanban/kanban_screen.dart';
import 'features/lookup/qr_screen.dart';
import 'features/more/more_screen.dart';
import 'features/orders/order_detail_screen.dart';
import 'features/orders/order_form_screen.dart';
import 'features/orders/orders_screen.dart';
import 'features/shell/app_shell.dart';

class WorqeraApp extends StatefulWidget {
  const WorqeraApp({super.key});

  @override
  State<WorqeraApp> createState() => _WorqeraAppState();
}

class _WorqeraAppState extends State<WorqeraApp> {
  final session = SessionStore();
  late final WorqeraApi api = WorqeraApi(session);
  late final GoRouter router = GoRouter(
    navigatorKey: _root,
    refreshListenable: session,
    initialLocation: '/kanban',
    redirect: (context, state) {
      if (!session.ready) return null;
      final loc = state.matchedLocation;
      if (!session.loggedIn) return loc == '/login' ? null : '/login';
      if (loc == '/login') {
        if (session.platformAdmin && session.shopId.isEmpty) return '/more';
        return session.isSector ? '/kanban' : '/home';
      }
      if (session.isSector && (loc == '/home' || loc == '/orders' || loc == '/orders/new')) return '/kanban';
      if (session.platformAdmin && session.shopId.isEmpty && loc != '/more') return '/more';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => LoginScreen(api: api)),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(session: session, api: api, navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (_, _) => HomeScreen(api: api, session: session)),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/kanban',
              builder: (context, _) => KanbanScreen(api: api, session: session, openOrder: (id) => context.push('/orders/$id')),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/orders',
              builder: (context, _) => OrdersScreen(
                api: api,
                session: session,
                openOrder: (id) => context.push('/orders/$id'),
                openNew: () => context.push('/orders/new'),
              ),
              routes: [
                GoRoute(path: 'new', parentNavigatorKey: _root, builder: (_, _) => OrderFormScreen(api: api)),
                GoRoute(
                  path: ':id',
                  parentNavigatorKey: _root,
                  builder: (context, state) => OrderDetailScreen(
                    api: api,
                    session: session,
                    orderId: state.pathParameters['id']!,
                    onEdit: () => context.push('/orders/${state.pathParameters['id']}/edit'),
                  ),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      parentNavigatorKey: _root,
                      builder: (context, state) => OrderFormScreen(api: api, orderId: state.pathParameters['id']),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/qr',
              builder: (context, _) => QrScreen(api: api, session: session, openOrder: (id) => context.push('/orders/$id')),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/more',
              builder: (context, _) => MoreScreen(api: api, session: session, open: (page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page))),
            ),
          ]),
        ],
      ),
    ],
  );

  static final _root = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Worqera',
      theme: buildWorqeraTheme(),
      routerConfig: router,
    );
  }
}

