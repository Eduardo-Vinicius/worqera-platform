import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/flow.dart';

const _box = FlutterSecureStorage();
String _lastKey(SessionStore session) => 'wq-opened-by:${session.shopId}';

/// Lembra quem atendeu por último neste aparelho, para o próximo pedido já vir marcado.
Future<void> rememberOpenedBy(SessionStore session, String? id) async {
  if (id == null || id.isEmpty) return;
  try {
    await _box.write(key: _lastKey(session), value: id);
  } catch (_) {}
}

/// "Aberto por": um toque no nome de quem está atendendo. Fica no topo do pedido.
class OpenedByBar extends StatefulWidget {
  const OpenedByBar({
    super.key,
    required this.api,
    required this.session,
    required this.value,
    required this.onChanged,
    this.currentName = '',
    this.preselect = false,
    this.error,
    this.onLoaded,
  });

  final WorqeraApi api;
  final SessionStore session;
  final String? value;
  final void Function(String? id, String name) onChanged;
  final String currentName;
  final bool preselect;
  final String? error;
  final ValueChanged<int>? onLoaded;

  @override
  State<OpenedByBar> createState() => _OpenedByBarState();
}

class _OpenedByBarState extends State<OpenedByBar> {
  List<Map<String, String>>? list;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await widget.api.dio.get('/employees', queryParameters: {'active': 'true', 'attends': 'true'});
      final raw = res.data is Map ? (res.data as Map)['employees'] : null;
      final rows = <Map<String, String>>[
        for (final row in (raw is List ? raw : const []).whereType<Map>())
          {'id': '${row['id'] ?? row['_id'] ?? ''}', 'name': '${row['name'] ?? ''}'},
      ];
      if (!mounted) return;
      setState(() => list = rows);
      widget.onLoaded?.call(rows.length);
      if (widget.preselect && (widget.value == null || widget.value!.isEmpty)) {
        String? last;
        try {
          last = await _box.read(key: _lastKey(widget.session));
        } catch (_) {}
        final hit = rows.where((r) => r['id'] == last).firstOrNull ?? (rows.length == 1 ? rows.first : null);
        if (hit != null && mounted) widget.onChanged(hit['id'], hit['name'] ?? '');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => list = []);
      widget.onLoaded?.call(0);
    }
  }

  Future<void> _add() async {
    final field = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Quem atende no balcão?'),
        content: TextField(
          controller: field,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Nome'),
          onSubmitted: (v) => Navigator.pop(ctx, v),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, field.text), child: const Text('Salvar')),
        ],
      ),
    );
    field.dispose();
    final clean = (name ?? '').trim();
    if (clean.length < 2 || !mounted) return;
    try {
      final res = await widget.api.dio.post('/employees', data: {'name': clean, 'attends': true, 'active': true});
      final body = Map<String, dynamic>.from(res.data as Map);
      final row = {'id': '${body['id'] ?? body['_id'] ?? ''}', 'name': '${body['name'] ?? clean}'};
      final next = [...?list, row]..sort((a, b) => a['name']!.compareTo(b['name']!));
      setState(() => list = next);
      widget.onLoaded?.call(next.length);
      widget.onChanged(row['id'], row['name']!);
      if (mounted) wqToast(context, '${row['name']} cadastrado para atender');
    } catch (e) {
      if (mounted) wqToast(context, widget.api.message(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = list;
    final canManage = widget.session.isAdmin;
    final missing = widget.currentName.isNotEmpty && widget.value != null && rows != null && !rows.any((r) => r['id'] == widget.value);
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: context.wqSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: widget.error != null ? Wq.danger : context.wqLine),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.person_outline, size: 16, color: context.wqMuted),
          const SizedBox(width: 6),
          Text('ABERTO POR', style: TextStyle(fontSize: 11, letterSpacing: 1.1, fontWeight: FontWeight.w800, color: context.wqMuted)),
          const Spacer(),
          if (canManage && rows != null)
            TextButton.icon(
              style: TextButton.styleFrom(minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: 8)),
              onPressed: _add,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Cadastrar'),
            ),
        ]),
        const SizedBox(height: 6),
        if (rows == null)
          const SizedBox(height: 32, child: Align(alignment: Alignment.centerLeft, child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))))
        else if (rows.isEmpty && !missing)
          Text(
            canManage ? 'Cadastre quem atende para medir o atendimento.' : 'Peça ao dono para cadastrar quem atende no balcão.',
            style: TextStyle(color: context.wqMuted, fontSize: 13),
          )
        else
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (missing) ChoiceChip(label: Text(widget.currentName), selected: true, onSelected: (_) {}),
            for (final row in rows)
              ChoiceChip(
                label: Text(row['name'] ?? ''),
                selected: row['id'] == widget.value,
                selectedColor: Wq.brand,
                labelStyle: TextStyle(
                  color: row['id'] == widget.value ? Colors.white : context.wqInk,
                  fontWeight: row['id'] == widget.value ? FontWeight.w800 : FontWeight.w500,
                ),
                onSelected: (_) => widget.onChanged(row['id'], row['name'] ?? ''),
              ),
          ]),
        if (widget.error != null)
          Padding(padding: const EdgeInsets.only(top: 6), child: Text(widget.error!, style: const TextStyle(color: Wq.danger, fontSize: 12))),
      ]),
    );
  }
}
