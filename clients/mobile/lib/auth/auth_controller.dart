import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import 'session.dart';

enum AuthStatus { loading, signedOut, signedIn }

class AuthController extends ChangeNotifier {
  AuthController({required this.api, required SessionStore store})
      : _store = store;

  final ApiClient api;
  final SessionStore _store;

  AuthStatus _status = AuthStatus.loading;
  Session? _session;
  String? _message;
  Future<void>? _restoreFuture;
  bool _disposed = false;

  AuthStatus get status => _status;
  Session? get session => _session;
  String? get message => _message;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> restore() => _restoreFuture ??= _restore();

  Future<void> _restore() async {
    try {
      final saved = await _store.read();
      if (saved != null && saved.isExpired) {
        await _store.clear();
        _message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        _session = null;
        _status = AuthStatus.signedOut;
      } else {
        _session = saved;
        _status = saved == null ? AuthStatus.signedOut : AuthStatus.signedIn;
      }
    } catch (e) {
      debugPrint('Không thể khôi phục phiên đăng nhập: $e');
      _message = 'Không thể đọc phiên đăng nhập trên thiết bị.';
      _session = null;
      _status = AuthStatus.signedOut;
    }
    _notify();
  }

  Future<void> register(
      {required String name,
      required String email,
      required String password}) async {
    await api.post('/api/identity/auth/register', body: {
      'name': name.trim(),
      'email': email.trim(),
      'password': password,
    });
    await login(email, password);
  }

  Future<void> login(String email, String password) async {
    _message = null;
    _notify();
    final result = await api.post('/api/identity/auth/login', body: {
      'email': email.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    final token = result['accessToken'] as String;
    final role = result['role'] as String;
    if (role != 'CUSTOMER') {
      throw const AuthException(
          'Tài khoản nhân viên vui lòng dùng trang web quản trị để đăng nhập.');
    }
    final session = Session(
      token: token,
      role: role,
      name: result['name'] as String? ?? '',
      expiresAt: _tokenExpiry(token) ??
          DateTime.now().add(
              Duration(seconds: (result['expiresIn'] as num?)?.toInt() ?? 0)),
    );
    await _store.write(session);
    _session = session;
    _message = null;
    _status = AuthStatus.signedIn;
    _notify();
  }

  Future<void> logout() async {
    await _store.clear();
    _session = null;
    _message = null;
    _status = AuthStatus.signedOut;
    _notify();
  }

  void expire() {
    if (_status == AuthStatus.signedOut && _session == null) return;
    _session = null;
    _message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    _status = AuthStatus.signedOut;
    _notify();
    unawaited(_clearAfterExpiry());
  }

  Future<void> _clearAfterExpiry() async {
    try {
      await _store.clear();
    } catch (e) {
      debugPrint('Không thể xóa phiên đăng nhập hết hạn: $e');
    }
  }

  void checkExpiry() {
    if (_session?.isExpired == true) expire();
  }

  DateTime? _tokenExpiry(String token) {
    try {
      final payload = token.split('.')[1];
      final normalized = base64Url.normalize(payload);
      final json = jsonDecode(utf8.decode(base64Url.decode(normalized)));
      final exp = json is Map<String, dynamic> ? json['exp'] : null;
      if (exp is num) {
        return DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000);
      }
    } on FormatException {
      return null;
    } on RangeError {
      return null;
    }
    return null;
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
