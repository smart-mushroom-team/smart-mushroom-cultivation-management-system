import '../../../core/utils/formatters.dart';
import 'cycle_summary.dart';

/// Khớp schema `TrayLocation` (core.yaml): hàng / kệ / ô.
class TrayLocation {
  const TrayLocation({required this.row, required this.shelf, required this.slot});

  factory TrayLocation.fromJson(Map<String, dynamic> json) => TrayLocation(
        row: json['row'] as int,
        shelf: json['shelf'] as int,
        slot: json['slot'] as int,
      );

  final int row;
  final int shelf;
  final int slot;

  String get label => 'Hàng $row · Kệ $shelf · Ô $slot';
}

/// Khớp schema `MyTray` (core.yaml, GET /my-trays).
class MyTray {
  const MyTray({
    required this.trayId,
    required this.trayCode,
    required this.roomId,
    required this.rentalId,
    required this.rentalEndDate,
    this.roomName,
    this.location,
    this.daysRemaining,
    this.currentCycle,
  });

  factory MyTray.fromJson(Map<String, dynamic> json) => MyTray(
        trayId: json['trayId'] as String,
        trayCode: json['trayCode'] as String,
        roomId: json['roomId'] as String,
        roomName: json['roomName'] as String?,
        location: json['location'] is Map<String, dynamic>
            ? TrayLocation.fromJson(json['location'] as Map<String, dynamic>)
            : null,
        rentalId: json['rentalId'] as String,
        rentalEndDate: parseDate(json['rentalEndDate']),
        daysRemaining: json['daysRemaining'] as int?,
        currentCycle: json['currentCycle'] is Map<String, dynamic>
            ? CycleSummary.fromJson(json['currentCycle'] as Map<String, dynamic>)
            : null,
      );

  final String trayId;
  final String trayCode;

  /// Dùng để gọi Monitoring xem camera/môi trường (task khác).
  final String roomId;
  final String? roomName;
  final TrayLocation? location;
  final String rentalId;
  final DateTime? rentalEndDate;
  final int? daysRemaining;

  /// `null` khi khay chưa có đợt nuôi đang chạy.
  final CycleSummary? currentCycle;
}
