import 'package:flutter/material.dart';

/// Same feel on iOS and Android (as Procedy): elastic bounce, no Material glow,
/// and the keyboard closes when the list is dragged.
class WqScrollBehavior extends MaterialScrollBehavior {
  const WqScrollBehavior();

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) => child;

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) => const BouncingScrollPhysics(parent: RangeMaintainingScrollPhysics());

  @override
  ScrollViewKeyboardDismissBehavior getKeyboardDismissBehavior(BuildContext context) => ScrollViewKeyboardDismissBehavior.onDrag;
}
