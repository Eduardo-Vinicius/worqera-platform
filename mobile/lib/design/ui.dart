import 'package:flutter/material.dart';

import '../brand/theme.dart';
import '../brand/tokens.dart';

String brl(dynamic value) {
  final n = value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
  final fixed = n.toStringAsFixed(2).replaceAll('.', ',');
  return 'R\$ $fixed';
}

String dayLabel(dynamic value) {
  final raw = '$value';
  if (raw.isEmpty || raw == 'null') return '';
  final date = DateTime.tryParse(raw);
  if (date == null) return '';
  final d = date.toLocal();
  final dd = d.day.toString().padLeft(2, '0');
  final mm = d.month.toString().padLeft(2, '0');
  return '$dd/$mm/${d.year}';
}

String statusLabel(dynamic status) {
  switch ('$status') {
    case 'delivered':
      return 'Finalizado';
    case 'ready':
      return 'Pronto';
    case 'in_progress':
      return 'Em andamento';
    case 'open':
      return 'Aberto';
    case 'cancelled':
      return 'Cancelado';
    default:
      return '$status';
  }
}

List<Map<String, dynamic>> asMaps(dynamic body) {
  dynamic raw = body;
  if (body is Map) {
    raw = body['data'] ??
        body['items'] ??
        body['orders'] ??
        body['clients'] ??
        body['sectors'] ??
        body['brands'] ??
        body['services'] ??
        body['accessories'] ??
        body['employees'] ??
        body['members'] ??
        body['feedback'] ??
        body['rows'] ??
        body['shops'] ??
        body['notices'] ??
        [];
  }
  if (raw is! List) return [];
  return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
}

class WqDock extends StatelessWidget {
  const WqDock({super.key, required this.items, required this.selected, required this.onTap, this.actionIndex});

  final List<(IconData, String)> items;
  final int selected;
  final ValueChanged<int> onTap;
  final int? actionIndex;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: EdgeInsets.zero,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: dark ? WqTokens.darkSurface.withValues(alpha: 0.96) : Colors.white.withValues(alpha: 0.96),
          border: Border(top: BorderSide(color: dark ? WqTokens.darkBorder : Wq.line)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++)
                Expanded(child: _item(context, i)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, int index) {
    final action = actionIndex == index;
    final on = selected == index;
    final color = action ? Wq.action : on ? Wq.brand : context.wqMuted;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => onTap(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: on && !action ? Wq.brand.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (action)
              Container(
                width: 36,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Wq.action, borderRadius: BorderRadius.circular(10)),
                child: Icon(items[index].$1, size: 18, color: Colors.white),
              )
            else
              Icon(items[index].$1, size: 22, color: color),
            const SizedBox(height: 3),
            Text(
              items[index].$2,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, fontWeight: on || action ? FontWeight.w800 : FontWeight.w600, color: color, letterSpacing: -0.1),
            ),
          ]),
        ),
      ),
    );
  }
}

class ShellScope extends InheritedWidget {
  const ShellScope({super.key, required this.openMenu, required super.child});
  final VoidCallback openMenu;

  static ShellScope? maybeOf(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ShellScope>();

  @override
  bool updateShouldNotify(ShellScope oldWidget) => false;
}

class WqPage extends StatelessWidget {
  const WqPage({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    required this.child,
    this.floating,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final Widget? floating;

  @override
  Widget build(BuildContext context) {
    final menu = ShellScope.maybeOf(context)?.openMenu;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final paper = dark ? WqTokens.darkPaper : Wq.paper;
    final ink = dark ? WqTokens.darkText : Wq.ink;
    final muted = dark ? WqTokens.darkMuted : Wq.muted;
    return Scaffold(
      backgroundColor: paper,
      floatingActionButton: floating,
      appBar: AppBar(
        backgroundColor: paper,
        foregroundColor: ink,
        toolbarHeight: subtitle == null ? 56 : 68,
        leading: menu == null
            ? null
            : IconButton(
                onPressed: menu,
                icon: const Icon(Icons.menu_rounded),
              ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 22, height: 1.1, fontWeight: FontWeight.w800, letterSpacing: -0.4, color: ink)),
            if (subtitle != null) Text(subtitle!, style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w500)),
          ],
        ),
        actions: actions,
      ),
      body: child,
    );
  }
}

class WqCard extends StatelessWidget {
  const WqCard({super.key, required this.child, this.onTap, this.padding = const EdgeInsets.all(14)});
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final radius = BorderRadius.circular(10);
    final surface = dark ? WqTokens.darkSurface : Wq.surface;
    final line = dark ? WqTokens.darkBorder : Wq.line;
    final box = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: dark ? 0.2 : 0.03), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Material(
        color: surface,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            width: double.infinity,
            padding: padding,
            decoration: BoxDecoration(borderRadius: radius, border: Border.all(color: line)),
            child: child,
          ),
        ),
      ),
    );
    return box;
  }
}

class WqSectionTitle extends StatelessWidget {
  const WqSectionTitle(this.text, {super.key, this.trailing});
  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(children: [
        Text(text, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, letterSpacing: -0.2, color: Theme.of(context).colorScheme.onSurface)),
        const Spacer(),
        ?trailing,
      ]),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final dynamic status;

  @override
  Widget build(BuildContext context) {
    final label = statusLabel(status);
    final color = switch ('$status') {
      'ready' => Wq.success,
      'delivered' => Wq.muted,
      'cancelled' => Wq.danger,
      _ => Wq.brand,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
