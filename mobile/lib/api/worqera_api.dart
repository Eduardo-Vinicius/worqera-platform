import 'package:dio/dio.dart';

import '../auth/session.dart';
import '../config/app_config.dart';

class WorqeraApi {
  WorqeraApi(this.session) {
    dio = Dio(BaseOptions(baseUrl: AppConfig.apiBase, connectTimeout: const Duration(seconds: 20)));
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (session.token != null) options.headers['Authorization'] = 'Bearer ${session.token}';
        if (session.shopId.isNotEmpty) options.headers['X-Worqera-Shop'] = session.shopId;
        handler.next(options);
      },
      onError: (error, handler) async {
        final status = error.response?.statusCode;
        final path = error.requestOptions.path;
        final skipped = path == '/auth/refresh' || path == '/auth/login' || path == '/auth/logout';
        if (status == 401 && !skipped && error.requestOptions.extra['retried'] != true) {
          final renewed = await _renew();
          if (renewed) {
            final req = error.requestOptions;
            req.extra['retried'] = true;
            req.headers['Authorization'] = 'Bearer ${session.token}';
            try {
              final clone = await dio.fetch(req);
              return handler.resolve(clone);
            } on DioException catch (retryError) {
              if (retryError.response?.statusCode == 401) await _endSession();
              return handler.next(retryError);
            }
          }
          if (!session.loggedIn) return handler.next(error);
          final refreshMissing = session.refreshToken == null || session.refreshToken!.isEmpty;
          if (refreshMissing) await _endSession();
        }
        handler.next(error);
      },
    ));
  }

  Future<bool>? _renewing;

  Future<void> _endSession() {
    return session.clear(notice: 'Sua sessão acabou. Entre de novo.');
  }

  Future<bool> _renew() {
    final inflight = _renewing;
    if (inflight != null) return inflight;
    final run = _renewOnce();
    _renewing = run;
    return run.whenComplete(() {
      if (identical(_renewing, run)) _renewing = null;
    });
  }

  Future<bool> _renewOnce() async {
    final refreshToken = session.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final refreshed = await Dio(BaseOptions(baseUrl: AppConfig.apiBase)).post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      await session.apply(Map<String, dynamic>.from(refreshed.data as Map), keep: session);
      return session.token != null && session.token!.isNotEmpty;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) await _endSession();
      return false;
    }
  }

  final SessionStore session;
  late final Dio dio;

  String message(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final detail = '${data['detail'] ?? data['title'] ?? data['error'] ?? 'Falha na API'}';
        if (detail == 'Session revoked' || detail == 'Invalid or expired token') {
          return 'Sua sessão acabou. Entre de novo.';
        }
        return detail;
      }
      if (error.type == DioExceptionType.connectionError || error.type == DioExceptionType.connectionTimeout) {
        return 'A API não está no ar em ${AppConfig.apiBase}. Sobe com make api-dev.';
      }
      return error.message ?? 'Falha na API';
    }
    return '$error';
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await dio.post('/auth/login', data: {'email': email, 'password': password});
    final body = Map<String, dynamic>.from(res.data as Map);
    await session.apply(body);
    final me = await dio.get('/auth/me');
    await session.apply(Map<String, dynamic>.from(me.data as Map), keep: session);
    return body;
  }

  Future<void> forgot(String email) async {
    await dio.post('/auth/forgot-password', data: {'email': email});
  }

  Future<void> logout() async {
    try {
      await dio.post('/auth/logout', data: {'refreshToken': session.refreshToken});
    } catch (_) {}
    await session.clear();
  }
}
