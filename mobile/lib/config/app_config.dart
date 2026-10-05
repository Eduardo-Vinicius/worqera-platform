import 'dart:io';

/// iOS Simulator reaches the Mac API on 127.0.0.1. Android emulator uses 10.0.2.2.
class AppConfig {
  static const String override = String.fromEnvironment('WORQERA_API_BASE');

  static String get apiBase {
    if (override.isNotEmpty) return override;
    if (Platform.isAndroid) return 'http://10.0.2.2:3001/api/v1';
    return 'http://127.0.0.1:3001/api/v1';
  }
}
