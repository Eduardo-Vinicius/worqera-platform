import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../api/worqera_api.dart';
import '../../auth/session.dart';
import '../../brand/theme.dart';
import '../../design/motion.dart';
import '../../design/ui.dart';

class QrScreen extends StatefulWidget {
  const QrScreen({super.key, required this.api, required this.session, required this.openOrder});
  final WorqeraApi api;
  final SessionStore session;
  final void Function(String id) openOrder;

  @override
  State<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends State<QrScreen> with WidgetsBindingObserver {
  final code = TextEditingController();
  final scanner = MobileScannerController(
    autoStart: false,
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool busy = false;
  String? error;

  bool visible = false;
  bool foreground = true;
  bool held = false;
  Future<void> camera = Future.value();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Tab hidden (IndexedStack) or covered by another page → TickerMode off → camera off.
    final now = TickerMode.valuesOf(context).enabled;
    if (now != visible) {
      visible = now;
      if (visible) held = false;
      syncCamera();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    syncCamera();
  }

  void syncCamera() {
    final want = visible && foreground && !held;
    camera = camera.then((_) async {
      if (!mounted) return;
      try {
        if (want && !scanner.value.isRunning) {
          await scanner.start();
        } else if (!want && scanner.value.isRunning) {
          await scanner.stop();
        }
      } catch (_) {
        // Errors surface through the scanner state (errorBuilder).
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(scanner.dispose());
    code.dispose();
    super.dispose();
  }

  void onDetect(BarcodeCapture capture) {
    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    if (raw == null || busy || held) return;
    successHaptic();
    held = true;
    syncCamera();
    lookup(raw, fromCamera: true);
  }

  Future<void> lookup(String raw, {bool fromCamera = false}) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    var found = false;
    try {
      var value = raw.trim();
      final opaque = RegExp(r'/p/o/([^/?#]+)').firstMatch(value);
      if (opaque != null) {
        final token = Uri.decodeComponent(opaque.group(1)!);
        final pub = await widget.api.dio.get('/public/track/$token');
        final body = Map<String, dynamic>.from(pub.data as Map);
        final shop = body['shop'] is Map ? Map<String, dynamic>.from(body['shop'] as Map) : const <String, dynamic>{};
        final slug = '${shop['slug'] ?? ''}';
        if (widget.session.shopSlug.isNotEmpty && slug.isNotEmpty && slug != widget.session.shopSlug) {
          throw Exception('Este QR é de outra empresa.');
        }
        value = '${body['code'] ?? ''}';
      } else {
        final match = RegExp(r'/p/([^/]+)/([^/?#]+)').firstMatch(value);
        if (match != null) {
          final slug = match.group(1)!;
          value = Uri.decodeComponent(match.group(2)!);
          if (widget.session.shopSlug.isNotEmpty && slug != widget.session.shopSlug) {
            throw Exception('Este QR é de outra empresa.');
          }
        }
      }
      final res = await widget.api.dio.get('/orders', queryParameters: {'code': value});
      final body = res.data;
      final list = body is Map ? (body['data'] ?? body['orders'] ?? []) : body;
      if (list is! List || list.isEmpty) throw Exception('Pedido não encontrado.');
      final id = '${(list.first as Map)['id'] ?? (list.first as Map)['_id']}';
      found = true;
      widget.openOrder(id);
    } catch (e) {
      if (mounted) setState(() => error = widget.api.message(e));
    } finally {
      if (mounted) setState(() => busy = false);
      // Wrong label: let the camera try again after the message is readable.
      if (fromCamera && !found) {
        Future.delayed(const Duration(milliseconds: 1400), () {
          if (!mounted) return;
          held = false;
          syncCamera();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return WqPage(
      title: 'Ler QR',
      subtitle: 'Etiqueta do pedido',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: staggered([
          ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: AspectRatio(
              aspectRatio: 1,
              child: Stack(fit: StackFit.expand, children: [
                MobileScanner(
                  controller: scanner,
                  onDetect: onDetect,
                  errorBuilder: (context, e) => _CameraProblem(error: e),
                  placeholderBuilder: (_) => const ColoredBox(color: Colors.black),
                ),
                const IgnorePointer(child: _Viewfinder()),
                if (busy)
                  const ColoredBox(
                    color: Color(0x66000000),
                    child: Center(child: CircularProgressIndicator(color: Colors.white)),
                  ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: ValueListenableBuilder<MobileScannerState>(
                    valueListenable: scanner,
                    builder: (context, state, _) {
                      if (!state.isRunning || state.torchState == TorchState.unavailable) return const SizedBox.shrink();
                      final on = state.torchState == TorchState.on;
                      return IconButton.filled(
                        tooltip: on ? 'Desligar lanterna' : 'Ligar lanterna',
                        style: IconButton.styleFrom(backgroundColor: on ? Colors.white : const Color(0x88000000)),
                        color: on ? Colors.black : Colors.white,
                        icon: Icon(on ? Icons.flashlight_on_rounded : Icons.flashlight_off_rounded),
                        onPressed: () {
                          tapHaptic();
                          scanner.toggleTorch();
                        },
                      );
                    },
                  ),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          const Text('Aponte para o QR da etiqueta. O pedido abre sozinho.', textAlign: TextAlign.center, style: TextStyle(color: Wq.muted)),
          if (kDebugMode) const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('O simulador não lê etiqueta de verdade. Digite o código.', textAlign: TextAlign.center, style: TextStyle(color: Wq.muted)),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: code,
            textInputAction: TextInputAction.search,
            onSubmitted: (v) => lookup(v),
            decoration: const InputDecoration(labelText: 'Ou digite o código do pedido', prefixIcon: Icon(Icons.tag_rounded)),
          ),
          FadeSwitcher(
            child: error == null
                ? const SizedBox(key: ValueKey('ok'), height: 0)
                : Padding(
                    key: ValueKey(error),
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(error!, style: const TextStyle(color: Wq.danger)),
                  ),
          ),
          const SizedBox(height: 12),
          FilledButton(onPressed: busy ? null : () => lookup(code.text), child: const Text('Buscar')),
        ]),
      ),
    );
  }
}

class _Viewfinder extends StatelessWidget {
  const _Viewfinder();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FractionallySizedBox(
        widthFactor: 0.62,
        heightFactor: 0.62,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.9), width: 3),
          ),
        ),
      ),
    );
  }
}

class _CameraProblem extends StatelessWidget {
  const _CameraProblem({required this.error});
  final MobileScannerException error;

  @override
  Widget build(BuildContext context) {
    final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
    return ColoredBox(
      color: Colors.black,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(denied ? Icons.no_photography_rounded : Icons.videocam_off_rounded, color: Colors.white70, size: 40),
          const SizedBox(height: 12),
          Text(
            denied ? 'Sem acesso à câmera.' : 'A câmera não abriu.',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            denied ? 'Libere em Ajustes › Worqera › Câmera, ou digite o código abaixo.' : 'Digite o código do pedido abaixo.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70),
          ),
        ]),
      ),
    );
  }
}
