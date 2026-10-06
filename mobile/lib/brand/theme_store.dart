import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemeStore extends ChangeNotifier {
  ThemeStore() {
    _load();
  }

  final _box = const FlutterSecureStorage();
  static const _key = 'wq-theme';
  ThemeMode mode = ThemeMode.light;

  bool get dark => mode == ThemeMode.dark;

  Future<void> _load() async {
    final value = await _box.read(key: _key);
    mode = value == 'dark' ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  Future<void> toggle() async {
    mode = dark ? ThemeMode.light : ThemeMode.dark;
    await _box.write(key: _key, value: dark ? 'dark' : 'light');
    notifyListeners();
  }
}
