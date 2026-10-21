/// Cấu hình ứng dụng.
///
/// URL Gateway đổi khi chạy/build bằng `--dart-define`, không sửa code:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8080
///   flutter build apk --dart-define=API_BASE_URL=https://<gateway>.onrender.com
///
/// Mặc định `10.0.2.2` là địa chỉ máy host nhìn từ Android Emulator.
class AppConfig {
  const AppConfig._();

  static const String gatewayUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );

  // Tiền tố định tuyến của Gateway (SRS 7.3). Gateway bỏ tiền tố này khi chuyển tiếp.
  static const String identityPrefix = '/api/identity';
  static const String corePrefix = '/api/core';
  static const String monitoringPrefix = '/api/monitoring';

  // NFR-14 / FR-50: Gateway chờ tối đa 60 giây khi service khởi động nguội,
  // nên client cũng phải chờ ít nhất bằng đó.
  static const Duration connectTimeout = Duration(seconds: 60);
  static const Duration receiveTimeout = Duration(seconds: 60);

  /// Khoảng chờ giữa các lần tự thử lại khi service khởi động nguội (tối đa 3 lần).
  static const List<Duration> coldStartRetryDelays = [
    Duration(seconds: 2),
    Duration(seconds: 5),
    Duration(seconds: 10),
  ];

  /// Repository giả cho các API chưa xong, bật theo từng tính năng (không sửa code):
  ///   flutter run --dart-define=FAKE_REPOS=trays,packages,rentals
  ///   flutter run --dart-define=FAKE_REPOS=all
  /// Tên tính năng: `trays`, `packages`, `rentals`.
  static const String _fakeRepos = String.fromEnvironment('FAKE_REPOS');

  static bool useFake(String feature) {
    final names = _fakeRepos.split(',').map((s) => s.trim()).toSet();
    return names.contains('all') || names.contains(feature);
  }
}
