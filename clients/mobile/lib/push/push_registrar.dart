import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import 'push_service.dart';

enum PushStatus { off, starting, registered, unavailable, denied, error }

/// Đăng ký FCM token của máy này với server sau khi đăng nhập, cập nhật khi token đổi và hủy khi đăng xuất.
class PushRegistrar extends ChangeNotifier {
  PushRegistrar({required this.api, required this.push});

  static const _path = '/api/core/notifications/device-tokens';

  final ApiClient api;
  final PushService push;

  PushStatus _status = PushStatus.off;
  String? _token;
  StreamSubscription<String>? _refreshSub;
  bool _disposed = false;

  PushStatus get status => _status;

  /// Token đang đăng ký (để test và chẩn đoán).
  String? get token => _token;

  void _set(PushStatus s) {
    if (_disposed || _status == s) return;
    _status = s;
    notifyListeners();
  }

  /// Gọi sau khi đăng nhập. Gọi lại khi đang `registered` hoặc `starting` thì bỏ qua.
  Future<void> start() async {
    if (_status == PushStatus.registered || _status == PushStatus.starting) {
      return;
    }
    if (!push.available) {
      _set(PushStatus.unavailable);
      return;
    }
    _set(PushStatus.starting);
    try {
      final permission = await push.requestPermission();
      if (permission != PushPermission.granted) {
        _set(permission == PushPermission.denied
            ? PushStatus.denied
            : PushStatus.unavailable);
        return;
      }
      _refreshSub ??= push.onTokenRefresh.listen((t) => _register(t));
      final token = await push.getToken();
      if (token == null || token.isEmpty) {
        _set(PushStatus.error);
        return;
      }
      await _register(token);
    } catch (e) {
      debugPrint('Đăng ký thông báo đẩy thất bại: $e');
      _set(PushStatus.error);
    }
  }

  Future<void> _register(String token) async {
    try {
      await api.post(_path, body: {'token': token, 'platform': 'android'});
      _token = token;
      _set(PushStatus.registered);
    } catch (e) {
      debugPrint('Server từ chối hoặc không nhận token FCM: $e');
      _set(PushStatus.error);
    }
  }

  /// Hủy đăng ký trên server (cố gắng hết sức, không chặn đăng xuất quá 5 giây) rồi về trạng thái tắt.
  Future<void> stop() async {
    final token = _token;
    final cancellation = _refreshSub?.cancel();
    _refreshSub = null;
    _token = null;
    if (token != null) {
      try {
        await api
            .delete('$_path/${Uri.encodeComponent(token)}')
            .timeout(const Duration(seconds: 5));
      } catch (e) {
        debugPrint('Không thể hủy token thông báo đẩy trên máy chủ: $e');
        // Token mồ côi trên server sẽ tự chuyển sang người dùng kế tiếp đăng nhập trên máy này.
      }
    }
    if (cancellation != null) {
      unawaited(cancellation.catchError((Object error) {
        debugPrint('Không thể dừng theo dõi token thông báo đẩy: $error');
      }));
    }
    _set(PushStatus.off);
  }

  /// Phiên kết thúc mà không đi qua đăng xuất chủ động (hết hạn): không gọi server được nữa, chỉ dọn trạng thái.
  void reset() {
    unawaited(_refreshSub?.cancel());
    _refreshSub = null;
    _token = null;
    _set(PushStatus.off);
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_refreshSub?.cancel());
    super.dispose();
  }
}
