import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class Session {
  const Session({
    required this.token,
    required this.role,
    required this.name,
    required this.expiresAt,
  });

  final String token;
  final String role;
  final String name;
  final DateTime expiresAt;

  bool get isExpired => !expiresAt.isAfter(DateTime.now());

  Map<String, Object> toJson() => {
        'token': token,
        'role': role,
        'name': name,
        'expiresAt': expiresAt.toIso8601String(),
      };

  factory Session.fromJson(Map<String, dynamic> json) => Session(
        token: json['token'] as String,
        role: json['role'] as String,
        name: json['name'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
}

abstract interface class SessionStore {
  Future<Session?> read();
  Future<void> write(Session session);
  Future<void> clear();
}

class MemorySessionStore implements SessionStore {
  MemorySessionStore([this.session]);

  Session? session;

  @override
  Future<Session?> read() async => session;

  @override
  Future<void> write(Session value) async {
    session = value;
  }

  @override
  Future<void> clear() async {
    session = null;
  }
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore(
      {FlutterSecureStorage storage = const FlutterSecureStorage()})
      : _storage = storage;

  static const _key = 'mushroom.session';
  final FlutterSecureStorage _storage;

  @override
  Future<Session?> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map<String, dynamic>) {
        throw const FormatException('Invalid session');
      }
      return Session.fromJson(value);
    } on FormatException {
      await clear();
      return null;
    } on TypeError {
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(Session session) =>
      _storage.write(key: _key, value: jsonEncode(session.toJson()));

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
