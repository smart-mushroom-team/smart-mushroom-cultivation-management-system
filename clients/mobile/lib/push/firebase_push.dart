import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import '../firebase_options.dart';
import 'push_service.dart';

/// Cài đặt thật của [PushService] bằng Firebase Cloud Messaging.
/// File này là nơi DUY NHẤT import Firebase; chỉ `main.dart` dùng nó, nên test không cần Firebase.
class FirebasePushService implements PushService {
  FirebasePushService._(this._messaging);

  final FirebaseMessaging _messaging;

  /// Khởi tạo Firebase. Chưa có `google-services.json` (hoặc lỗi khác) thì trả [NoPushService] thay vì làm app sập.
  static Future<PushService> create() async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    debugPrint('Firebase initialized successfully');

    final messaging = FirebaseMessaging.instance;

    final token = await messaging.getToken();

    debugPrint(
      'FCM token status: ${token == null ? "NULL" : "OK"}',
    );

    return FirebasePushService._(messaging);
  } catch (e) {
    debugPrint('Không khởi tạo Firebase/FCM được: $e');

    return const NoPushService(
      'Không thể khởi tạo thông báo đẩy',
    );
  }
}

  @override
  bool get available => true;

  @override
  String? get unavailableReason => null;

  @override
  Future<PushPermission> requestPermission() async {
    final s = await _messaging.requestPermission();
    return switch (s.authorizationStatus) {
      AuthorizationStatus.authorized ||
      AuthorizationStatus.provisional =>
        PushPermission.granted,
      _ => PushPermission.denied,
    };
  }

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  @override
  Stream<PushMessage> get onForeground =>
      FirebaseMessaging.onMessage.map(_convert);

  @override
  Stream<PushMessage> get onOpened =>
      FirebaseMessaging.onMessageOpenedApp.map(_convert);

  @override
  Future<PushMessage?> initialMessage() async {
    final m = await _messaging.getInitialMessage();
    return m == null ? null : _convert(m);
  }

  static PushMessage _convert(RemoteMessage m) => PushMessage(
        title: m.notification?.title,
        body: m.notification?.body,
        data: {for (final e in m.data.entries) e.key: '${e.value}'},
      );
}
