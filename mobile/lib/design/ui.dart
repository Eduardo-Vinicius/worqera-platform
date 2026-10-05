import 'package:flutter/material.dart';

import '../brand/theme.dart';

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
    return Scaffold(
      backgroundColor: Wq.paper,
      floatingActionButton: floating,
      appBar: AppBar(
        backgroundColor: Wq.paper,
        leading: menu == null ? null : IconButton(onPressed: menu, icon: const Icon(Icons.menu)),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Wq.ink)),
            if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 12, color: Wq.muted, fontWeight: FontWeight.w500)),
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
    final box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Wq.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Wq.line),
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(color: Colors.transparent, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16), child: box));
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
        Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Wq.ink)),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
