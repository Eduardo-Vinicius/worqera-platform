import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore extends ChangeNotifier {
  SessionStore() {
    _restore();
  }

  final _box = const FlutterSecureStorage();
  static const _key = 'wq-session';

  String? token;
  String? refreshToken;
  String role = '';
  String shopId = '';
  String shopName = '';
  String shopSlug = '';
  String userName = '';
  String email = '';
  bool platformAdmin = false;
  bool ready = false;

  bool get loggedIn => token != null && token!.isNotEmpty;
  bool get isSector => role == 'sector';
  bool get isAdmin => role == 'owner' || role == 'admin';
  bool get seesShopSetup => isAdmin || role == 'atendimento';
  bool get seesMoney => role == 'owner' || role == 'admin' || role == 'atendimento';
  // Soma da coluna fica oculta por ora, inclusive para admin e dono.
  bool get seesColumnMoney => false;

  Future<void> _restore() async {
    try {
      final raw = await _box.read(key: _key);
      if (raw != null) {
        final data = jsonDecode(raw) as Map<String, dynamic>;
        token = data['token'] as String?;
        refreshToken = data['refreshToken'] as String?;
        role = '${data['role'] ?? ''}';
        shopId = '${data['shopId'] ?? ''}';
        shopName = '${data['shopName'] ?? ''}';
        shopSlug = '${data['shopSlug'] ?? ''}';
        userName = '${data['userName'] ?? ''}';
        email = '${data['email'] ?? ''}';
        platformAdmin = data['platformAdmin'] == true;
      }
    } catch (_) {}
    ready = true;
    notifyListeners();
  }

  Future<void> apply(Map<String, dynamic> data, {SessionStore? keep}) async {
    final shop = (data['shop'] ?? (data['memberships'] is List && (data['memberships'] as List).isNotEmpty ? (data['memberships'] as List).first['shop'] : null)) as Map?;
    final membership = data['membership'] as Map?;
    final first = data['memberships'] is List && (data['memberships'] as List).isNotEmpty ? (data['memberships'] as List).first as Map : null;
    token = (data['token'] ?? data['accessToken'] ?? keep?.token ?? token) as String?;
    refreshToken = (data['refreshToken'] ?? keep?.refreshToken ?? refreshToken) as String?;
    role = '${data['role'] ?? membership?['role'] ?? first?['role'] ?? keep?.role ?? role}';
    shopId = '${shop?['id'] ?? membership?['shopId'] ?? first?['shopId'] ?? keep?.shopId ?? shopId}';
    shopName = '${shop?['name'] ?? keep?.shopName ?? shopName}';
    shopSlug = '${shop?['slug'] ?? keep?.shopSlug ?? shopSlug}';
    final user = data['user'] as Map?;
    userName = '${user?['name'] ?? keep?.userName ?? userName}';
    email = '${user?['email'] ?? keep?.email ?? email}';
    platformAdmin = data['platformAdmin'] == true || (keep?.platformAdmin ?? platformAdmin);
    if (platformAdmin && shopId.isEmpty) {
      role = role.isEmpty ? 'platform' : role;
      shopName = shopName.isEmpty ? 'Worqera' : shopName;
    }
    await _persist();
    notifyListeners();
  }

  Future<void> clear() async {
    token = null;
    refreshToken = null;
    role = '';
    shopId = '';
    shopName = '';
    shopSlug = '';
    userName = '';
    email = '';
    platformAdmin = false;
    await _box.delete(key: _key);
    notifyListeners();
  }

  Future<void> _persist() async {
    await _box.write(
      key: _key,
      value: jsonEncode({
        'token': token,
        'refreshToken': refreshToken,
        'role': role,
        'shopId': shopId,
        'shopName': shopName,
        'shopSlug': shopSlug,
        'userName': userName,
        'email': email,
        'platformAdmin': platformAdmin,
      }),
    );
  }
}

String idOf(dynamic row) {
  if (row is! Map) return '';
  return '${row['id'] ?? row['_id'] ?? ''}';
}
