import '../../../core/utils/formatters.dart';

/// Khớp enum `CycleStage` trong docs/openapi/core.yaml. Giá trị lạ từ server (thêm sau này) thành [unknown]
/// để app không vỡ.
enum CycleStage {
  seeding('SEEDING', 'Gieo giống'),
  incubating('INCUBATING', 'Ủ'),
  fruiting('FRUITING', 'Ra quả thể'),
  ready('READY', 'Sẵn sàng thu hoạch'),
  unknown('', 'Không rõ');

  const CycleStage(this.code, this.label);
  final String code;
  final String label;

  static CycleStage parse(Object? code) =>
      CycleStage.values.firstWhere((s) => s.code == code, orElse: () => CycleStage.unknown);
}

/// Khớp schema `CycleSummary` (core.yaml): đợt nuôi hiện tại của một khay.
class CycleSummary {
  const CycleSummary({
    required this.id,
    required this.stage,
    required this.status,
    this.variety,
    this.startDate,
    this.expectedHarvestDate,
  });

  factory CycleSummary.fromJson(Map<String, dynamic> json) => CycleSummary(
        id: json['id'] as String,
        stage: CycleStage.parse(json['stage']),
        status: json['status'] as String, // GROWING | HARVESTED | DISCARDED
        variety: json['variety'] as String?,
        startDate: parseDate(json['startDate']),
        expectedHarvestDate: parseDate(json['expectedHarvestDate']),
      );

  final String id;
  final CycleStage stage;
  final String status;
  final String? variety;
  final DateTime? startDate;
  final DateTime? expectedHarvestDate;
}
