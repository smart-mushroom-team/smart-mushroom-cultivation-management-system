/// Mô hình dữ liệu cho "Khay của tôi" và giám sát. Backend trộn camelCase (phòng, số đo) với snake_case (khay, đợt nuôi),
/// nên việc chuẩn hóa nằm hết ở đây.
library;

const stageOrder = ['SEEDING', 'INCUBATING', 'FRUITING', 'READY'];
const stageLabel = {
  'SEEDING': 'Cấy giống',
  'INCUBATING': 'Ủ tơ',
  'FRUITING': 'Ra quả thể',
  'READY': 'Sẵn sàng thu hoạch'
};

String stageText(String stage) => stageLabel[stage] ?? stage;

/// Vị trí 0..3 của giai đoạn (để vẽ thanh tiến độ); -1 nếu lạ.
int stageIndex(String stage) => stageOrder.indexOf(stage);

/// Khoảng nhiệt độ, độ ẩm phù hợp của giống trong danh mục (server trả `variety_info`; null nếu chưa có).
class VarietyRange {
  const VarietyRange(
      {required this.growthDays,
      required this.tempMin,
      required this.tempMax,
      required this.humMin,
      required this.humMax});

  final int growthDays;
  final double tempMin;
  final double tempMax;
  final double humMin;
  final double humMax;

  String get tempText => '${_n(tempMin)}–${_n(tempMax)} °C';
  String get humText => 'ẩm ${_n(humMin)}–${_n(humMax)} %';

  static String _n(double v) => v == v.roundToDouble()
      ? v.toInt().toString()
      : v.toString().replaceAll('.', ',');

  static VarietyRange? fromJson(Object? j) {
    if (j is! Map<String, dynamic>) return null;
    return VarietyRange(
      growthDays: (j['growth_days'] as num).toInt(),
      tempMin: (j['temp_min'] as num).toDouble(),
      tempMax: (j['temp_max'] as num).toDouble(),
      humMin: (j['hum_min'] as num).toDouble(),
      humMax: (j['hum_max'] as num).toDouble(),
    );
  }
}

class Cycle {
  const Cycle({
    required this.id,
    required this.trayCode,
    required this.roomId,
    required this.stage,
    required this.status,
    required this.variety,
    this.varietyStatus = 'NONE',
    this.varietyRejectReason,
    this.varietyRange,
    required this.startDate,
    required this.expectedHarvestDate,
    required this.rentalStatus,
    required this.rentalEndDate,
    this.note,
    this.logs = const [],
  });

  final String id;
  final String trayCode;
  final String roomId;
  final String stage;
  final String status;
  final String? variety;
  final String varietyStatus;
  final String? varietyRejectReason;
  final VarietyRange? varietyRange;
  final String startDate;
  final String? expectedHarvestDate;
  final String rentalStatus;
  final String rentalEndDate;
  final String? note;
  final List<CycleLog> logs;

  bool get rentalExpired => rentalStatus == 'EXPIRED';

  /// Khách đổi được giống khi khay còn ở Cấy giống (server cũng kiểm tra lại).
  bool get canChangeVariety => status == 'GROWING' && stage == 'SEEDING';

  Cycle copyWithVariety(
          {required String? variety,
          required String status,
          String? rejectReason,
          VarietyRange? range}) =>
      Cycle(
        id: id,
        trayCode: trayCode,
        roomId: roomId,
        stage: stage,
        status: this.status,
        variety: variety,
        varietyStatus: status,
        varietyRejectReason: rejectReason,
        varietyRange: range,
        startDate: startDate,
        expectedHarvestDate: expectedHarvestDate,
        rentalStatus: rentalStatus,
        rentalEndDate: rentalEndDate,
        note: note,
        logs: logs,
      );

  factory Cycle.fromJson(Map<String, dynamic> j) => Cycle(
        id: j['id'] as String,
        trayCode: j['tray_code'] as String,
        roomId: j['room_id'] as String,
        stage: j['stage'] as String,
        status: j['status'] as String,
        variety: j['variety'] as String?,
        varietyStatus: (j['variety_status'] as String?) ?? 'NONE',
        varietyRejectReason: j['variety_reject_reason'] as String?,
        varietyRange: VarietyRange.fromJson(j['variety_info']),
        startDate: j['start_date'] as String,
        expectedHarvestDate: j['expected_harvest_date'] as String?,
        rentalStatus: j['rental_status'] as String,
        rentalEndDate: j['rental_end_date'] as String,
        note: j['note'] as String?,
        logs: [
          for (final l in (j['logs'] as List<dynamic>? ?? const []))
            CycleLog.fromJson(l as Map<String, dynamic>)
        ],
      );
}

class CycleLog {
  const CycleLog(
      {required this.fromStage,
      required this.toStage,
      required this.note,
      required this.createdAt});

  final String? fromStage;
  final String toStage;
  final String? note;
  final String createdAt;

  factory CycleLog.fromJson(Map<String, dynamic> j) => CycleLog(
        fromStage: j['from_stage'] as String?,
        toStage: j['to_stage'] as String,
        note: j['note'] as String?,
        createdAt: j['created_at'] as String,
      );
}

class Reading {
  const Reading(
      {required this.temperature,
      required this.humidity,
      required this.recordedAt});

  final double? temperature;
  final double? humidity;
  final String recordedAt;
}

class LatestReading {
  const LatestReading({required this.reading, required this.deviceOnline});

  final Reading? reading;
  final bool deviceOnline;

  factory LatestReading.fromJson(Map<String, dynamic> j) {
    final s = j['snapshot'] as Map<String, dynamic>?;
    return LatestReading(
      reading: s == null
          ? null
          : Reading(
              temperature: (s['temperature'] as num?)?.toDouble(),
              humidity: (s['humidity'] as num?)?.toDouble(),
              recordedAt: s['recordedAt'] as String),
      deviceOnline: j['deviceOnline'] == true,
    );
  }
}

class ChartPoint {
  const ChartPoint({required this.t, required this.temp, required this.hum});

  final DateTime t;
  final double? temp;
  final double? hum;

  factory ChartPoint.fromJson(Map<String, dynamic> j) => ChartPoint(
      t: DateTime.parse(j['t'] as String),
      temp: (j['temp'] as num?)?.toDouble(),
      hum: (j['hum'] as num?)?.toDouble());
}

/// "27.4" -> "27,4 °C" (dấu phẩy kiểu Việt Nam, một chữ số thập phân); null -> "—".
String formatTemp(double? v) =>
    v == null ? '—' : '${v.toStringAsFixed(1).replaceAll('.', ',')} °C';

String formatHumidity(double? v) =>
    v == null ? '—' : '${v.toStringAsFixed(0)} %';

/// Mô tả độ tươi của số đo, ví dụ "vừa xong", "5 phút trước", "3 giờ trước".
String ago(String iso, DateTime now) {
  final t = DateTime.tryParse(iso);
  if (t == null) return '';
  final d = now.difference(t);
  if (d.inMinutes < 1) return 'vừa xong';
  if (d.inMinutes < 60) return '${d.inMinutes} phút trước';
  if (d.inHours < 24) return '${d.inHours} giờ trước';
  return '${d.inDays} ngày trước';
}
