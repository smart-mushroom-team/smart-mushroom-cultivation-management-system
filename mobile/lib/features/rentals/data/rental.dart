import '../../../core/utils/formatters.dart';

/// Khớp enum `RentalStatus` (core.yaml). Vòng đời: PAID → ACTIVE → EXPIRED → COMPLETED, hoặc PAID → REJECTED.
enum RentalStatus {
  paid('PAID', 'Chờ xác nhận'),
  active('ACTIVE', 'Đang thuê'),
  expired('EXPIRED', 'Đã hết hạn'),
  completed('COMPLETED', 'Đã hoàn tất'),
  rejected('REJECTED', 'Bị từ chối'),
  unknown('', 'Không rõ');

  const RentalStatus(this.code, this.label);
  final String code;
  final String label;

  static RentalStatus parse(Object? code) =>
      RentalStatus.values.firstWhere((s) => s.code == code, orElse: () => RentalStatus.unknown);
}

/// Khớp schema `Rental` (core.yaml). Chỉ giữ các trường màn hình thuê khay cần.
class Rental {
  const Rental({
    required this.id,
    required this.durationDays,
    required this.pricePerTray,
    required this.trayCount,
    required this.totalAmount,
    required this.status,
    this.packageName,
    this.createdAt,
  });

  factory Rental.fromJson(Map<String, dynamic> json) => Rental(
        id: json['id'] as String,
        packageName: json['packageName'] as String?,
        durationDays: json['durationDays'] as int,
        pricePerTray: json['pricePerTray'] as int,
        trayCount: json['trayCount'] as int,
        totalAmount: json['totalAmount'] as int,
        status: RentalStatus.parse(json['status']),
        createdAt: parseDate(json['createdAt']),
      );

  final String id;
  final String? packageName;

  /// Giá và thời hạn đã chụp lại lúc đặt (đổi gói sau đó không ảnh hưởng).
  final int durationDays;
  final int pricePerTray;
  final int trayCount;
  final int totalAmount;
  final RentalStatus status;
  final DateTime? createdAt;
}
