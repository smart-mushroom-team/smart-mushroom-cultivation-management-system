/// Giống nấm trong danh mục, và lựa chọn giống của khách khi thuê hoặc đổi giống.
library;

String _num(num v) => v == v.roundToDouble()
    ? v.toInt().toString()
    : v.toString().replaceAll('.', ',');

class Variety {
  const Variety({
    required this.id,
    required this.name,
    required this.description,
    required this.growthDays,
    required this.tempMin,
    required this.tempMax,
    required this.humMin,
    required this.humMax,
  });

  final String id;
  final String name;
  final String description;
  final int growthDays;
  final num tempMin;
  final num tempMax;
  final num humMin;
  final num humMax;

  String get growthText => '$growthDays ngày';
  String get tempText => '${_num(tempMin)}–${_num(tempMax)} °C';
  String get humText => 'Ẩm ${_num(humMin)}–${_num(humMax)} %';

  factory Variety.fromJson(Map<String, dynamic> j) => Variety(
        id: j['id'] as String,
        name: j['name'] as String,
        description: (j['description'] as String?) ?? '',
        growthDays: (j['growth_days'] as num).toInt(),
        tempMin: j['temp_min'] as num,
        tempMax: j['temp_max'] as num,
        humMin: j['hum_min'] as num,
        humMax: j['hum_max'] as num,
      );
}

/// Kết quả của bảng chọn giống: một giống trong danh mục, một tên tự nhập (cần duyệt), hoặc "chọn sau".
class VarietyChoice {
  const VarietyChoice.catalog(Variety v)
      : catalog = v,
        custom = null;
  const VarietyChoice.custom(String name)
      : catalog = null,
        custom = name;
  const VarietyChoice.none()
      : catalog = null,
        custom = null;

  final Variety? catalog;
  final String? custom;

  bool get isNone => catalog == null && custom == null;
  bool get needsApproval => custom != null;
  String? get label => catalog?.name ?? custom;

  /// Phần thân gửi lên server; rỗng nếu chưa chọn.
  Map<String, dynamic> toBody() {
    if (catalog != null) return {'varietyId': catalog!.id};
    if (custom != null) return {'customVariety': custom};
    return {};
  }
}

/// Trạng thái giống của một đợt nuôi, theo server: NONE, APPROVED, PENDING, REJECTED.
String varietyStatusText(String status) => switch (status) {
      'PENDING' => 'chờ duyệt',
      'REJECTED' => 'bị từ chối',
      _ => '',
    };
