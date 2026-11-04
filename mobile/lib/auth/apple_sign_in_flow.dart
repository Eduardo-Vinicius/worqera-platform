import 'package:flutter/foundation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

/// O usuário fechou a folha da Apple.
class AppleSignInCancelled implements Exception {
  const AppleSignInCancelled();
}

class AppleSignInFailure implements Exception {
  const AppleSignInFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class AppleIdentity {
  const AppleIdentity({required this.identityToken, this.givenName, this.familyName});

  final String identityToken;

  /// A Apple só envia o nome na primeira autorização.
  final String? givenName;
  final String? familyName;

  String get fullName => [givenName, familyName].where((p) => p != null && p.trim().isNotEmpty).join(' ').trim();
}

class AppleIdentitySource {
  /// Só no iOS (mesmo padrão do Procedy em produção).
  static Future<bool> isAvailable() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.iOS) return false;
    try {
      return await SignInWithApple.isAvailable();
    } catch (_) {
      return false;
    }
  }

  static Future<AppleIdentity> request() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [AppleIDAuthorizationScopes.email, AppleIDAuthorizationScopes.fullName],
      );
      final token = credential.identityToken;
      if (token == null || token.isEmpty) {
        throw const AppleSignInFailure('A Apple não devolveu a credencial da conta.');
      }
      return AppleIdentity(identityToken: token, givenName: credential.givenName, familyName: credential.familyName);
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) throw const AppleSignInCancelled();
      throw const AppleSignInFailure('Não foi possível entrar com a Apple. Tente de novo.');
    }
  }
}
