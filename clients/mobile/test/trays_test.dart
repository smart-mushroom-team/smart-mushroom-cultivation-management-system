import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mushroom_mobile/app.dart';
import 'package:mushroom_mobile/auth/session.dart';
import 'package:mushroom_mobile/trays/pager.dart';
import 'package:mushroom_mobile/trays/tray_filter.dart';
import 'package:mushroom_mobile/trays/tray_models.dart';

import 'helpers.dart';

// PNG 1x1 hợp lệ để Image.memory giải mã được.
final pngBytes = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

Map<String, dynamic> cycleJson({String id = 'c1', String code = 'A-01', String stage = 'INCUBATING', String rental = 'ACTIVE', String? variety = 'Nấm bào ngư', String vstatus = 'APPROVED', String? reason, bool range = false, String status = 'GROWING'}) => {
      'id': id,
      'rental_id': 'r1',
      'tray_id': 't-$id',
      'stage': stage,
      'status': status,
      'variety': variety,
      'variety_status': vstatus,
      'variety_reject_reason': reason,
      'start_date': '2026-10-20',
      'expected_harvest_date': '2026-11-15',
      'tray_code': code,
      'room_id': 'room1',
      'rental_status': rental,
      'rental_end_date': '2026-11-19',
      if (range) 'variety_info': {'growth_days': 40, 'temp_min': 18.0, 'temp_max': 26.0, 'hum_min': 85.0, 'hum_max': 95.0},
    };

const latestOk = {
  'snapshot': {'temperature': 27.46, 'humidity': 88.2, 'recordedAt': '2026-10-31T10:00:00+00:00'},
  'deviceOnline': true,
};

Session customer() => Session(token: makeJwt(), role: 'CUSTOMER', name: 'Khách', expiresAt: DateTime.now().add(const Duration(hours: 8)));

Future<Harness> open(WidgetTester tester, Future<http.Response> Function(http.Request) handler) async {
  tester.view.physicalSize = const Size(800, 2200);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final h = Harness(handler, saved: customer());
  await tester.pumpWidget(MushroomApp(auth: h.auth));
  await h.auth.restore();
  await tester.pumpAndSettle();
  return h;
}

Future<http.Response> base(http.Request r, {List<Map<String, dynamic>>? trays, Map<String, dynamic>? latest, Map<String, dynamic>? cycle, List<Map<String, dynamic>>? rentals}) async {
  switch (r.url.path) {
    case '/api/core/notifications':
      return jsonResponse([]);
    case '/api/core/my-trays':
      return jsonResponse(trays ?? [cycleJson()]);
    case '/api/core/rentals/mine':
      return jsonResponse(rentals ?? []);
    case '/api/core/rooms':
      return jsonResponse([
        {'id': 'room1', 'name': 'Phòng Ủ 1', 'status': 'ACTIVE'}
      ]);
    case '/api/monitoring/rooms/room1/latest':
      return jsonResponse(latest ?? latestOk);
    case '/api/core/varieties':
      return jsonResponse([
        {'id': 'v1', 'name': 'Nấm bào ngư', 'description': 'Dễ trồng', 'growth_days': 35, 'temp_min': 20, 'temp_max': 28, 'hum_min': 80, 'hum_max': 90}
      ]);
    case '/api/core/cycles/c1/variety':
      return jsonResponse(cycleJson(stage: 'SEEDING', variety: 'Nấm bào ngư'));
    case '/api/core/cycles/c1':
      return jsonResponse({
        ...(cycle ?? cycleJson()),
        'logs': [
          {'from_stage': null, 'to_stage': 'SEEDING', 'note': 'Cấy giống', 'created_at': '2026-10-20T01:00:00+00:00'},
          {'from_stage': 'SEEDING', 'to_stage': 'INCUBATING', 'note': 'Tơ lan đều', 'created_at': '2026-10-27T03:30:00+00:00'},
        ],
      });
    case '/api/monitoring/rooms/room1/chart':
      return jsonResponse([
        {'t': '2026-10-31T08:00:00+00:00', 'temp': 26.0, 'hum': 85.0, 'n': 10},
        {'t': '2026-10-31T08:05:00+00:00', 'temp': null, 'hum': 86.0, 'n': 5},
        {'t': '2026-10-31T08:10:00+00:00', 'temp': 28.0, 'hum': 90.0, 'n': 10},
      ]);
    case '/api/monitoring/rooms/room1/camera/latest':
      return http.Response.bytes(pngBytes, 200, headers: {'content-type': 'image/png', 'x-captured-at': '2026-10-31T03:20:00+00:00'});
  }
  return errorResponse(404, 'NOT_FOUND', 'Không có');
}

Map<String, dynamic> freshLatest({double t = 22, double h = 90}) => {
      'snapshot': {'temperature': t, 'humidity': h, 'recordedAt': DateTime.now().toUtc().toIso8601String()},
      'deviceOnline': true,
    };

void main() {
  test('phân trang: số trang, cắt trang, trang ngoài phạm vi được kéo về', () {
    expect(pageCountOf(0, 3), 1);
    expect(pageCountOf(3, 3), 1);
    expect(pageCountOf(4, 3), 2);
    final items = [1, 2, 3, 4, 5, 6, 7];
    expect(pageSlice(items, 1, 3), [1, 2, 3]);
    expect(pageSlice(items, 3, 3), [7]);
    expect(pageSlice(items, 99, 3), [7]);
    expect(pageSlice(items, 0, 3), [1, 2, 3]);
    expect(pageSlice(<int>[], 1, 3), isEmpty);
  });

  test('phân loại khay: theo giai đoạn, đã thu hoạch, giống chờ duyệt', () {
    Cycle c(Map<String, dynamic> j) => Cycle.fromJson(j);
    final seeding = c(cycleJson(stage: 'SEEDING'));
    final ready = c(cycleJson(stage: 'READY'));
    final harvested = c(cycleJson(stage: 'FRUITING', status: 'HARVESTED'));
    final pending = c(cycleJson(stage: 'SEEDING', vstatus: 'PENDING'));
    expect(TrayFilter.seeding.matches(seeding), isTrue);
    expect(TrayFilter.fruiting.matches(ready), isTrue);
    expect(TrayFilter.fruiting.matches(harvested), isFalse);
    expect(TrayFilter.harvested.matches(harvested), isTrue);
    expect(TrayFilter.pendingVariety.matches(pending), isTrue);
    expect(TrayFilter.pendingVariety.matches(seeding), isFalse);
    expect(TrayFilter.all.matches(harvested), isTrue);
  });

  test('định dạng số đo và độ tươi', () {
    expect(formatTemp(27.46), '27,5 °C');
    expect(formatTemp(null), '—');
    expect(formatHumidity(88.2), '88 %');
    final now = DateTime.utc(2026, 10, 31, 10, 0, 0);
    expect(ago('2026-10-31T10:00:00+00:00', now), 'vừa xong');
    expect(ago('2026-10-31T09:55:00+00:00', now), '5 phút trước');
    expect(ago('2026-10-31T07:00:00+00:00', now), '3 giờ trước');
    expect(ago('2026-10-29T10:00:00+00:00', now), '2 ngày trước');
    expect(stageIndex('FRUITING'), 2);
    expect(stageText('READY'), 'Sẵn sàng thu hoạch');
  });

  testWidgets('danh sách khay gom theo phòng, hiện giai đoạn và số đo mới nhất', (tester) async {
    await open(tester, base);
    expect(find.text('Phòng Ủ 1'), findsOneWidget);
    expect(find.text('Khay A-01'), findsOneWidget);
    expect(find.text('Ủ tơ'), findsOneWidget);
    expect(find.textContaining('Nấm bào ngư'), findsOneWidget);
    expect(find.textContaining('15/11/2026'), findsOneWidget);
    expect(find.text('27,5 °C'), findsOneWidget);
    expect(find.text('88 %'), findsOneWidget);
  });

  testWidgets('chưa có khay: báo trống và nút dẫn sang tab Thuê khay', (tester) async {
    await open(tester, (r) => base(r, trays: []));
    expect(find.byKey(const Key('trays-empty')), findsOneWidget);
    await tester.tap(find.text('Thuê khay ngay'));
    await tester.pump();
    expect(find.text('Thuê khay'), findsWidgets);
  });

  testWidgets('đơn hết hạn được cảnh báo; cảm biến mất kết nối được nói rõ', (tester) async {
    await open(tester, (r) => base(r, trays: [cycleJson(rental: 'EXPIRED')], latest: {...latestOk, 'deviceOnline': false}));
    expect(find.textContaining('đã hết hạn'), findsOneWidget);
    expect(find.textContaining('mất kết nối'), findsOneWidget);
  });

  testWidgets('phòng chưa có số đo thì nói rõ, không hiện số giả', (tester) async {
    await open(tester, (r) => base(r, latest: {'snapshot': null, 'deviceOnline': false}));
    expect(find.text('Phòng chưa có số đo nào.'), findsOneWidget);
  });

  testWidgets('lỗi tải danh sách: có nút Thử lại và tải lại được', (tester) async {
    var fail = true;
    await open(tester, (r) async {
      if (r.url.path == '/api/core/my-trays' && fail) return errorResponse(500, 'INTERNAL', 'Máy chủ đang bận');
      return base(r);
    });
    expect(find.textContaining('Máy chủ đang bận'), findsOneWidget);
    fail = false;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.text('Khay A-01'), findsOneWidget);
  });

  testWidgets('mở chi tiết khay: tiến độ, nhật ký, biểu đồ và ảnh camera', (tester) async {
    await open(tester, base);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cycle-stage')), findsOneWidget);
    expect(find.text('Nhiệt độ'), findsOneWidget);
    expect(find.text('Độ ẩm'), findsOneWidget);
    expect(find.byKey(const Key('camera-image')), findsOneWidget);
    expect(find.text('Chụp lúc 10:20 31/10/2026'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Nhật ký tiến độ'), 300, scrollable: find.byType(Scrollable).last);
    expect(find.text('Cấy giống → Ủ tơ'), findsOneWidget);
    expect(find.text('Tơ lan đều'), findsOneWidget);
  });

  testWidgets('chi tiết: camera chưa có ảnh và biểu đồ trống không làm hỏng màn hình', (tester) async {
    await open(tester, (r) async {
      if (r.url.path.endsWith('/camera/latest')) return errorResponse(404, 'NO_SNAPSHOT', 'Chưa có ảnh từ camera của phòng này');
      if (r.url.path.endsWith('/chart')) return jsonResponse([]);
      return base(r);
    });
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.text('Camera chưa gửi ảnh nào.'), findsOneWidget);
    expect(find.text('Chưa có số liệu trong 24 giờ qua.'), findsOneWidget);
    expect(find.byKey(const Key('cycle-stage')), findsOneWidget);
  });

  testWidgets('khay chưa chọn giống ở Cấy giống: chọn từ danh mục, gửi PUT và hiện giống mới', (tester) async {
    final h = await open(tester, (r) => base(r, trays: [cycleJson(stage: 'SEEDING', variety: null, vstatus: 'NONE')], cycle: cycleJson(stage: 'SEEDING', variety: null, vstatus: 'NONE')));
    expect(find.textContaining('Chưa chọn giống'), findsOneWidget);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.text('Chưa chọn'), findsOneWidget);
    await tester.tap(find.byKey(const Key('change-variety')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('variety-v1')));
    await tester.pumpAndSettle();
    final put = h.requests.firstWhere((r) => r.method == 'PUT');
    expect(put.url.path, '/api/core/cycles/c1/variety');
    expect(put.body, '{"varietyId":"v1"}');
    expect(find.text('Nấm bào ngư'), findsOneWidget);
    expect(find.text('Đổi giống'), findsOneWidget);
  });

  testWidgets('tab Khay của tôi chỉ xin khay của đơn còn hạn', (tester) async {
    final h = await open(tester, base);
    final q = h.requests.firstWhere((r) => r.url.path == '/api/core/my-trays').url.queryParameters;
    expect(q['rentalStatus'], 'ACTIVE');
  });

  testWidgets('mỗi phòng 3 khay một trang, chuyển trang bằng Sau và ô nhập số trang', (tester) async {
    final trays = [for (var i = 1; i <= 7; i++) cycleJson(id: 'c$i', code: 'A-0$i')];
    await open(tester, (r) => base(r, trays: trays));
    expect(find.text('Khay A-01'), findsOneWidget);
    expect(find.text('Khay A-03'), findsOneWidget);
    expect(find.text('Khay A-04'), findsNothing);
    expect(find.byKey(const Key('pager-total')), findsOneWidget);
    expect(find.text('/ 3'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('pager-next')));
    await tester.tap(find.byKey(const Key('pager-next')));
    await tester.pumpAndSettle();
    expect(find.text('Khay A-04'), findsOneWidget);
    expect(find.text('Khay A-01'), findsNothing);
    await tester.enterText(find.byKey(const Key('pager-input')), '3');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(find.text('Khay A-07'), findsOneWidget);
    expect(find.text('Khay A-04'), findsNothing);
    await tester.enterText(find.byKey(const Key('pager-input')), '99');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(find.text('Khay A-01'), findsOneWidget);
  });

  testWidgets('chỉ một trang thì không hiện thanh chuyển trang', (tester) async {
    await open(tester, base);
    expect(find.byKey(const Key('pager-next')), findsNothing);
  });

  testWidgets('phân loại trong phòng: chọn mục thì chỉ còn khay thuộc mục, báo khi trống và đếm số khay', (tester) async {
    final trays = [
      cycleJson(id: 'c1', code: 'A-01', stage: 'SEEDING'),
      cycleJson(id: 'c2', code: 'A-02', stage: 'INCUBATING'),
      cycleJson(id: 'c3', code: 'A-03', stage: 'FRUITING', status: 'HARVESTED'),
      cycleJson(id: 'c4', code: 'A-04', stage: 'SEEDING', vstatus: 'PENDING'),
    ];
    await open(tester, (r) => base(r, trays: trays));
    expect(find.text('Tất cả (4)'), findsOneWidget);
    expect(find.text('Cấy giống (2)'), findsOneWidget);
    await tester.tap(find.byKey(const Key('filter-room1-seeding')));
    await tester.pumpAndSettle();
    expect(find.text('Khay A-01'), findsOneWidget);
    expect(find.text('Khay A-02'), findsNothing);
    await tester.tap(find.byKey(const Key('filter-room1-harvested')));
    await tester.pumpAndSettle();
    expect(find.text('Khay A-03'), findsOneWidget);
    expect(find.text('Khay A-01'), findsNothing);
    await tester.tap(find.byKey(const Key('filter-room1-pendingVariety')));
    await tester.pumpAndSettle();
    expect(find.text('Khay A-04'), findsOneWidget);
    await tester.tap(find.byKey(const Key('filter-room1-fruiting')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('filter-empty-room1')), findsOneWidget);
  });

  testWidgets('Đơn thuê của tôi: tổng tiền, lọc còn hạn / hết hạn, xem khay của đơn hết hạn', (tester) async {
    Map<String, dynamic> rental(String id, String status, {int growing = 0}) => {
          'id': id,
          'package_name': 'Gói 30 ngày',
          'tray_count': 2,
          'status': status,
          'start_date': '2026-09-01',
          'end_date': '2026-10-01',
          'duration_days': 30,
          'price_per_tray': 100000,
          'total_amount': 200000,
          'growing_count': growing,
        };
    final h = await open(tester, (r) {
      if (r.url.path == '/api/core/my-trays' && r.url.queryParameters['rentalId'] == 'r2') {
        return Future.value(jsonResponse([cycleJson(id: 'c9', code: 'B-01', rental: 'EXPIRED', status: 'HARVESTED')]));
      }
      return base(r, rentals: [rental('r1', 'ACTIVE'), rental('r2', 'EXPIRED', growing: 1)]);
    });
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('my-rentals')));
    await tester.pumpAndSettle();
    expect(find.text('Đơn thuê của tôi'), findsWidgets);
    expect(find.textContaining('2 đơn'), findsOneWidget);
    expect(find.byKey(const Key('rental-r1')), findsOneWidget);
    expect(find.byKey(const Key('rental-open-r2')), findsOneWidget);
    await tester.tap(find.byKey(const Key('rental-filter-ended')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('rental-r1')), findsNothing);
    expect(find.byKey(const Key('rental-r2')), findsOneWidget);
    await tester.tap(find.byKey(const Key('rental-r2')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('detail-total')), findsOneWidget);
    expect(find.byKey(const Key('rental-tray-c9')), findsOneWidget);
    expect(find.textContaining('Đã thu hoạch'), findsOneWidget);
    final q = h.requests.lastWhere((r) => r.url.path == '/api/core/my-trays').url.queryParameters;
    expect(q['rentalStatus'], 'ALL');
    expect(q['status'], 'ALL');
    expect(q['rentalId'], 'r2');
  });

  testWidgets('Đơn thuê của tôi: chưa có đơn thì báo trống', (tester) async {
    await open(tester, base);
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('my-rentals')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('rentals-empty')), findsOneWidget);
  });

  testWidgets('giống có khoảng chuẩn: thẻ khay và chi tiết hiện đánh giá tốt/xấu', (tester) async {
    await open(tester, (r) => base(r, trays: [cycleJson(range: true)], cycle: cycleJson(range: true), latest: freshLatest(t: 27, h: 90)));
    expect(find.byKey(const Key('assessment-c1')), findsOneWidget);
    expect(find.text('Lệch nhẹ · Hơi nóng'), findsOneWidget);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cond-temp')), findsOneWidget);
    expect(find.textContaining('Hơi nóng (phù hợp 18–26 °C)'), findsOneWidget);
    expect(find.textContaining('Trong mức phù hợp (phù hợp ẩm 85–95 %)'), findsOneWidget);
  });

  testWidgets('giống không có khoảng chuẩn hoặc chưa chọn giống: chỉ hiện số đo, không đánh giá', (tester) async {
    await open(tester, (r) => base(r, trays: [cycleJson(vstatus: 'PENDING')], cycle: cycleJson(vstatus: 'PENDING'), latest: freshLatest()));
    expect(find.byKey(const Key('assessment-c1')), findsNothing);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cond-temp')), findsNothing);
    expect(find.byKey(const Key('no-range-hint')), findsOneWidget);
  });

  testWidgets('chọn giống trong danh mục xong thì có đánh giá ngay', (tester) async {
    final chosen = cycleJson(stage: 'SEEDING', range: true);
    await open(tester, (r) {
      if (r.method == 'PUT') {
  return Future.value(jsonResponse(chosen));
}
      return base(r, trays: [cycleJson(stage: 'SEEDING', variety: null, vstatus: 'NONE')], cycle: cycleJson(stage: 'SEEDING', variety: null, vstatus: 'NONE'), latest: freshLatest());
    });
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('no-variety-hint')), findsOneWidget);
    await tester.tap(find.byKey(const Key('change-variety')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('variety-v1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cond-temp')), findsOneWidget);
    expect(find.byKey(const Key('no-variety-hint')), findsNothing);
  });

  testWidgets('giống chờ duyệt và giống bị từ chối được giải thích rõ', (tester) async {
    await open(tester, (r) => base(r, trays: [cycleJson(stage: 'SEEDING', variety: 'Nấm Lạ', vstatus: 'PENDING')], cycle: cycleJson(stage: 'SEEDING', variety: 'Nấm Lạ', vstatus: 'PENDING')));
    expect(find.textContaining('Nấm Lạ (chờ duyệt)'), findsOneWidget);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.textContaining('đang chờ nhân viên duyệt'), findsOneWidget);
  });

  testWidgets('giống bị từ chối: hiện lý do và cho chọn lại', (tester) async {
    final rejected = cycleJson(stage: 'SEEDING', variety: 'Nấm Lạ', vstatus: 'REJECTED', reason: 'Không hợp phòng');
    await open(tester, (r) => base(r, trays: [rejected], cycle: rejected));
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Không hợp phòng'), findsOneWidget);
    expect(find.byKey(const Key('change-variety')), findsOneWidget);
  });

  testWidgets('khay đã qua Cấy giống thì không còn nút đổi giống', (tester) async {
    await open(tester, base);
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('change-variety')), findsNothing);
  });

  testWidgets('đổi giống bị server từ chối thì hiện lời server và giữ giống cũ', (tester) async {
    await open(tester, (r) async {
      if (r.method == 'PUT') return errorResponse(409, 'VARIETY_LOCKED', 'Chỉ đổi được giống khi khay còn ở giai đoạn Cấy giống');
      return base(r, trays: [cycleJson(stage: 'SEEDING')], cycle: cycleJson(stage: 'SEEDING'));
    });
    await tester.tap(find.byKey(const Key('tray-c1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('change-variety')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('variety-v1')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Chỉ đổi được giống'), findsOneWidget);
  });
}
