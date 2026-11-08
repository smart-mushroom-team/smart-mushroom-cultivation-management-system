import 'package:flutter/foundation.dart';

import '../core/api_client.dart';

class AppNotification {
  const AppNotification(
      {required this.id,
      required this.type,
      required this.title,
      required this.content,
      required this.createdAt,
      required this.read,
      this.data = const {}});

  final String id;
  final String type;
  final String title;
  final String content;
  final String createdAt;
  final bool read;
  final Map<String, dynamic> data;

  String? get cycleId => data['cycleId'] as String?;
  String? get rentalId => data['rentalId'] as String?;
  String? get roomId => data['roomId'] as String?;

  AppNotification asRead() => AppNotification(
      id: id,
      type: type,
      title: title,
      content: content,
      createdAt: createdAt,
      read: true,
      data: data);

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        type: (j['type'] as String?) ?? '',
        title: (j['title'] as String?) ?? '',
        content: (j['content'] as String?) ?? '',
        createdAt: (j['created_at'] as String?) ?? '',
        read: j['read'] == true,
        data: (j['data'] as Map<String, dynamic>?) ?? const {},
      );
}

/// Danh sách thông báo của khách, dùng chung cho tab Thông báo và chấm số chưa đọc ở thanh điều hướng.
class NotificationController extends ChangeNotifier {
  NotificationController(this._api);

  final ApiClient _api;

  List<AppNotification> _items = const [];
  Object? _error;
  bool _loading = false;
  bool _loaded = false;
  bool _disposed = false;

  List<AppNotification> get items => _items;
  Object? get error => _error;
  bool get loading => _loading;

  /// Đã tải thành công ít nhất một lần.
  bool get loaded => _loaded;
  int get unread => _items.where((n) => !n.read).length;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  /// Tải lại danh sách. Gọi chồng thì bỏ qua lần sau.
  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    _error = null;
    _notify();
    try {
      final raw = await _api.get('/api/core/notifications') as List<dynamic>;
      _items = [
        for (final j in raw) AppNotification.fromJson(j as Map<String, dynamic>)
      ];
      _loaded = true;
    } catch (e) {
      _error = e;
    } finally {
      _loading = false;
      _notify();
    }
  }

  /// Đánh dấu đã đọc ngay trên giao diện; nếu server từ chối thì hoàn lại.
  Future<void> markRead(AppNotification n) async {
    if (n.read) return;
    _replace(n.id, (x) => x.asRead());
    try {
      await _api.post('/api/core/notifications/${n.id}/read');
    } catch (_) {
      _replace(n.id, (x) => n);
    }
  }

  Future<void> markAllRead() async {
    final unread = _items.where((n) => !n.read).toList();
    if (unread.isEmpty) return;
    for (final n in unread) {
      _replace(n.id, (x) => x.asRead());
    }
    final results = await Future.wait([
      for (final n in unread)
        _api
            .post('/api/core/notifications/${n.id}/read')
            .then((_) => true)
            .catchError((_) => false),
    ]);
    if (results.contains(false)) {
      await load(); // có cái không lưu được: lấy lại trạng thái thật từ server
    }
  }

  void _replace(String id, AppNotification Function(AppNotification) f) {
    _items = [for (final x in _items) x.id == id ? f(x) : x];
    _notify();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
