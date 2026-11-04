import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../brand/theme.dart';

/// Durações e curvas do app. Curto e com desaceleração = sensação de fluidez.
abstract final class Motion {
  static const fast = Duration(milliseconds: 160);
  static const medium = Duration(milliseconds: 280);
  static const slow = Duration(milliseconds: 420);
  static const curve = Curves.easeOutCubic;

  /// Itens além deste índice entram sem animação (já fora da primeira tela).
  static const maxStaggered = 8;
  static const staggerStep = Duration(milliseconds: 45);

  static bool reduced(BuildContext context) => MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

/// Vibração leve de confirmação (toque em abas, abrir menus).
void tapHaptic() => HapticFeedback.selectionClick();

/// Vibração de sucesso (salvou, enviou, moveu).
void successHaptic() => HapticFeedback.lightImpact();

/// Entrada suave (fade + sobe 14 px), em cascata pelo [index].
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({super.key, required this.child, this.index = 0, this.offset = 14});

  final Widget child;
  final int index;
  final double offset;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  Animation<double>? _progress;

  @override
  void initState() {
    super.initState();
    if (widget.index > Motion.maxStaggered) return;
    final delay = Motion.staggerStep * widget.index;
    final total = delay + Motion.slow;
    final controller = AnimationController(vsync: this, duration: total);
    _controller = controller;
    _progress = CurvedAnimation(
      parent: controller,
      curve: Interval(delay.inMicroseconds / total.inMicroseconds, 1, curve: Motion.curve),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final controller = _controller;
    if (controller == null || controller.isAnimating || controller.isCompleted) return;
    if (Motion.reduced(context)) {
      controller.value = 1;
    } else {
      controller.forward();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _progress;
    if (progress == null) return widget.child;
    return AnimatedBuilder(
      animation: progress,
      child: widget.child,
      builder: (context, child) {
        final v = progress.value;
        return Opacity(opacity: v, child: Transform.translate(offset: Offset(0, (1 - v) * widget.offset), child: child));
      },
    );
  }
}

/// Envolve cada bloco de uma lista em [FadeSlideIn], em cascata. Espaçadores vazios não contam.
List<Widget> staggered(List<Widget> children) {
  var index = 0;
  return [
    for (final child in children)
      if (child is SizedBox && child.child == null) child else FadeSlideIn(index: index++, child: child),
  ];
}

/// `itemBuilder` de listas com entrada em cascata.
IndexedWidgetBuilder staggeredBuilder(IndexedWidgetBuilder builder) =>
    (context, index) => FadeSlideIn(index: index, child: builder(context, index));

/// Encolhe levemente enquanto o dedo está sobre o cartão.
class PressableScale extends StatefulWidget {
  const PressableScale({super.key, required this.child, this.scale = 0.97});

  final Widget child;
  final double scale;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _down = false;

  void _set(bool value) {
    if (_down != value) setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => _set(true),
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: AnimatedScale(scale: _down ? widget.scale : 1, duration: Motion.fast, curve: Motion.curve, child: widget.child),
    );
  }
}

/// Troca animada entre carregando / erro / conteúdo.
class FadeSwitcher extends StatelessWidget {
  const FadeSwitcher({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: Motion.medium,
      switchInCurve: Motion.curve,
      switchOutCurve: Curves.easeIn,
      layoutBuilder: (current, previous) => Stack(alignment: Alignment.topCenter, children: [...previous, ?current]),
      child: child,
    );
  }
}

/// Bloco de carregamento que pulsa suavemente.
class SkeletonBox extends StatefulWidget {
  const SkeletonBox({super.key, this.height = 16, this.width, this.radius = 10});

  final double height;
  final double? width;
  final double radius;

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (Motion.reduced(context)) {
      _pulse.value = 0.5;
    } else if (!_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paper = context.wqPaper;
    final line = context.wqLine;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(color: Color.lerp(paper, line, 0.35 + _pulse.value * 0.45), borderRadius: BorderRadius.circular(widget.radius)),
      ),
    );
  }
}

/// Lista de cartões-esqueleto enquanto a tela carrega.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.count = 5, this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 24)});

  final int count;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding,
      itemCount: count,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, _) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: context.wqSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.wqLine),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [SkeletonBox(height: 16, width: 180), SizedBox(height: 10), SkeletonBox(height: 12, width: 120)],
        ),
      ),
    );
  }
}
