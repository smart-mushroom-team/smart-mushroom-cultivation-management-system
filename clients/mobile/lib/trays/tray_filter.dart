import 'tray_models.dart';

/// Mục phân loại khay trong một phòng (tab Khay của tôi).
enum TrayFilter {
  all('Tất cả'),
  seeding('Cấy giống'),
  incubating('Ủ tơ'),
  fruiting('Ra quả thể'),
  harvested('Đã thu hoạch'),
  pendingVariety('Giống chờ duyệt');

  const TrayFilter(this.label);

  final String label;

  /// Các mục theo giai đoạn chỉ tính khay đang nuôi (khay đã thu hoạch giữ nguyên giai đoạn cuối nhưng không còn "ra quả thể").
  /// "Ra quả thể" gồm cả "Sẵn sàng thu hoạch": đó là phần cuối của giai đoạn này.
  bool matches(Cycle c) {
    final growing = c.status == 'GROWING';
    return switch (this) {
      TrayFilter.all => true,
      TrayFilter.seeding => growing && c.stage == 'SEEDING',
      TrayFilter.incubating => growing && c.stage == 'INCUBATING',
      TrayFilter.fruiting => growing && (c.stage == 'FRUITING' || c.stage == 'READY'),
      TrayFilter.harvested => c.status == 'HARVESTED',
      TrayFilter.pendingVariety => growing && c.varietyStatus == 'PENDING',
    };
  }
}

/// Chữ trạng thái ngắn của một khay trong danh sách đơn thuê: đã thu hoạch / loại bỏ / giai đoạn hiện tại.
String cycleStateText(Cycle c) => switch (c.status) {
      'HARVESTED' => 'Đã thu hoạch',
      'DISCARDED' => 'Đã loại bỏ',
      _ => stageText(c.stage),
    };
