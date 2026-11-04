import 'dart:io';

import 'package:flutter/foundation.dart';

/// Release builds talk to production. In debug, the iOS Simulator reaches the Mac API on
/// 127.0.0.1 and the Android emulator on 10.0.2.2. `--dart-define WORQERA_API_BASE` wins.
class AppConfig {
  static const String override = String.fromEnvironment('WORQERA_API_BASE');
  static const String production = 'https://api.worqera.com/api/v1';

  static String get apiBase {
    if (override.isNotEmpty) return override;
    if (kReleaseMode) return production;
    if (Platform.isAndroid) return 'http://10.0.2.2:3001/api/v1';
    return 'http://127.0.0.1:3001/api/v1';
  }
}
