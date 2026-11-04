import 'package:flutter/material.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../auth/apple_sign_in_flow.dart';

/// Botão oficial "Continuar com a Apple"; só aparece no iOS com o recurso disponível.
class AppleContinueButton extends StatefulWidget {
  const AppleContinueButton({super.key, required this.onPressed, this.enabled = true, this.dark = false, this.divider = false});

  final VoidCallback onPressed;
  final bool enabled;
  final bool dark;

  /// Shows an "ou" line above the button (only when the button itself is shown).
  final bool divider;

  @override
  State<AppleContinueButton> createState() => _AppleContinueButtonState();
}

class _AppleContinueButtonState extends State<AppleContinueButton> {
  late final Future<bool> _available = AppleIdentitySource.isAvailable();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _available,
      builder: (context, snap) {
        if (snap.data != true) return const SizedBox.shrink();
        final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (widget.divider)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Row(children: [
                  const Expanded(child: Divider()),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child: Text('ou', style: TextStyle(color: muted, fontSize: 12))),
                  const Expanded(child: Divider()),
                ]),
              ),
            IgnorePointer(
            ignoring: !widget.enabled,
            child: Opacity(
              opacity: widget.enabled ? 1 : 0.5,
              child: SignInWithAppleButton(
                text: 'Continuar com a Apple',
                height: 48,
                style: widget.dark ? SignInWithAppleButtonStyle.white : SignInWithAppleButtonStyle.black,
                borderRadius: const BorderRadius.all(Radius.circular(12)),
                onPressed: widget.onPressed,
              ),
            ),
          ),
          ]),
        );
      },
    );
  }
}
