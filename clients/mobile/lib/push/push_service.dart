import 'dart:async';

/// Quyền hiển thị thông báo đẩy.
enum PushPermission { granted, denied, unavailable }

/// Một thông báo đẩy đến từ FCM. [data] lấy từ phần `data` của message (server gửi type, cycleId, rentalId...).
class PushMessage {
  const PushMessage({this.title, this.body, this.data = const {}});

  final String? title;
  final String? body;
  final Map<String, String> data;
}

/// Lớp mỏng bao quanh FCM để phần còn lại của app (và test) không phụ thuộc Firebase.
abstract class PushService {
  /// false khi bản cài này chưa được cấu hình Firebase: app vẫn dùng được, chỉ không có push.
  bool get available;

  /// Lý do không dùng được push (để hiển thị cho người cài đặt), null nếu available.
  String? get unavailableReason;

  Future<PushPermission> requestPermission();

  /// Token FCM của máy này, null nếu chưa lấy được.
  Future<String?> getToken();

  Stream<String> get onTokenRefresh;

  /// Push đến khi app đang mở (FCM không tự hiện thông báo trong trường hợp này).
  Stream<PushMessage> get onForeground;

  /// Người dùng bấm vào thông báo trên thanh trạng thái khi app đang ở nền.
  Stream<PushMessage> get onOpened;

  /// Thông báo đã mở app từ trạng thái tắt hẳn (nếu có).
  Future<PushMessage?> initialMessage();
}

/// Dùng khi chưa có Firebase: mọi thứ đều rỗng.
class NoPushService implements PushService {
  const NoPushService([this.reason = 'Chưa cấu hình Firebase']);

  final String reason;

  @override
  bool get available => false;

  @override
  String? get unavailableReason => reason;

  @override
  Future<PushPermission> requestPermission() async =>
      PushPermission.unavailable;

  @override
  Future<String?> getToken() async => null;

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  Stream<PushMessage> get onForeground => const Stream.empty();

  @override
  Stream<PushMessage> get onOpened => const Stream.empty();

  @override
  Future<PushMessage?> initialMessage() async => null;
}
