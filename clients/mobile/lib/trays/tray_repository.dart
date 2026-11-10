import 'dart:typed_data';

import '../core/api_client.dart';
import '../variety/variety_models.dart';
import 'tray_models.dart';

class TraysData {
  const TraysData({required this.cycles, required this.roomNames});

  final List<Cycle> cycles;
  final Map<String, String> roomNames;

  String roomName(String id) => roomNames[id] ?? 'Phòng nuôi';

  /// Các phòng có khay của khách, giữ thứ tự xuất hiện.
  List<String> get roomIds => {for (final c in cycles) c.roomId}.toList();
}

class CameraImage {
  const CameraImage({required this.bytes, required this.capturedAt});

  final Uint8List bytes;
  final String? capturedAt;
}

class TrayRepository {
  TrayRepository(this._api);

  final ApiClient _api;

  /// Mặc định là khay còn hạn (đơn ACTIVE), đang nuôi hoặc đã thu hoạch. Muốn xem khay của đơn hết hạn thì truyền [rentalStatus].
  Future<TraysData> myTrays({String status = 'GROWING,HARVESTED', String rentalStatus = 'ACTIVE', String? rentalId}) async {
    final raw = await _api.get('/api/core/my-trays', query: {'status': status, 'rentalStatus': rentalStatus, if (rentalId != null) 'rentalId': rentalId}) as List<dynamic>;
    final cycles = [for (final c in raw) Cycle.fromJson(c as Map<String, dynamic>)];
    return TraysData(cycles: cycles, roomNames: await roomNames());
  }

  /// id phòng -> tên phòng. Không lấy được thì trả rỗng: vẫn xem được khay, chỉ hiện tên chung.
  Future<Map<String, String>> roomNames() async {
    try {
      final rooms = await _api.get('/api/core/rooms') as List<dynamic>;
      return {for (final r in rooms) (r as Map<String, dynamic>)['id'] as String: r['name'] as String};
    } catch (_) {
      return {};
    }
  }

  Future<Cycle> cycle(String id) async => Cycle.fromJson(await _api.get('/api/core/cycles/$id') as Map<String, dynamic>);

  /// Khách chọn hoặc đổi giống của một khay (khi còn ở giai đoạn Cấy giống).
  Future<Cycle> setVariety(String cycleId, VarietyChoice choice) async =>
      Cycle.fromJson(await _api.put('/api/core/cycles/$cycleId/variety', body: choice.toBody()) as Map<String, dynamic>);

  Future<LatestReading> latest(String roomId) async =>
      LatestReading.fromJson(await _api.get('/api/monitoring/rooms/$roomId/latest') as Map<String, dynamic>);

  Future<List<ChartPoint>> chart(String roomId, {int hours = 24}) async {
    final raw = await _api.get('/api/monitoring/rooms/$roomId/chart', query: {'hours': '$hours'}) as List<dynamic>;
    return [for (final p in raw) ChartPoint.fromJson(p as Map<String, dynamic>)];
  }

  /// Ảnh camera theo đợt nuôi/khay, backend xác định slot và xác thực quyền thuê.
  Future<CameraImage> cameraForCycle(String roomId, String cycleId) async {
    final r = await _api.getBytes('/api/monitoring/rooms/$roomId/camera/cycles/$cycleId/latest');
    return CameraImage(bytes: Uint8List.fromList(r.bytes), capturedAt: r.capturedAt);
  }

  /// Ảnh camera mới nhất; ném ApiException NO_SNAPSHOT (404) nếu chưa có ảnh.
  Future<CameraImage> cameraLatest(String roomId) async {
    final r = await _api.getBytes('/api/monitoring/rooms/$roomId/camera/latest');
    return CameraImage(bytes: Uint8List.fromList(r.bytes), capturedAt: r.capturedAt);
  }
}
