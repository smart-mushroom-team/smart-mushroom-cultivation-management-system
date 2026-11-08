import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mushroom_mobile/app.dart';
import 'package:mushroom_mobile/auth/session.dart';
import 'package:mushroom_mobile/push/push_service.dart';
import 'package:mushroom_mobile/screens/account_tab.dart';

import 'helpers.dart';

final nowIso = DateTime.now()
    .toUtc()
    .subtract(const Duration(minutes: 5))
    .toIso8601String();

Map<String, dynamic> note(String id,
        {String type = 'CYCLE_STAGE',
        bool read = false,
        Map<String, dynamic>? data,
        String title = 'Khay A-01: Ủ tơ'}) =>
    {
      'id': id,
      'type': type,
      'title': title,
      'content': 'Khay A-01 đã chuyển sang giai đoạn Ủ tơ',
      'data': data ?? {'cycleId': 'c1'},
      'created_at': nowIso,
      'read': read
    };

Map<String, dynamic> cycle() => {
      'id': 'c1',
      'rental_id': 'r1',
      'tray_id': 't1',
      'stage': 'INCUBATING',
      'status': 'GROWING',
      'variety': 'Nấm bào ngư',
      'variety_status': 'APPROVED',
      'start_date': '2026-10-20',
      'expected_harvest_date': null,
      'tray_code': 'A-01',
      'room_id': 'room1',
      'rental_status': 'ACTIVE',
      'rental_end_date': '2026-11-19',
      'logs': <Map<String, dynamic>>[],
    };

Session customer() => Session(
    token: makeJwt(),
    role: 'CUSTOMER',
    name: 'Khách',
    expiresAt: DateTime.now().add(const Duration(hours: 8)));

Future<http.Response> server(http.Request r,
    {required List<Map<String, dynamic>> Function() notes,
    Map<String, dynamic>? testPush}) async {
  final p = r.url.path;
  if (p == '/api/core/notifications' && r.method == 'GET') {
    return jsonResponse(notes());
  }
  if (p.endsWith('/read')) return jsonResponse({'ok': true});
  if (p == '/api/core/notifications/test-push') {
    return jsonResponse(
        testPush ?? {'registeredTokens': 1, 'sent': 1, 'dryRun': false});
  }
  if (p.contains('/device-tokens')) return jsonResponse({'ok': true});
  if (p == '/api/core/my-trays') return jsonResponse([]);
  if (p == '/api/core/rooms') {
    return jsonResponse([
      {'id': 'room1', 'name': 'Phòng Ủ 1', 'status': 'ACTIVE'}
    ]);
  }
  if (p == '/api/core/cycles/c1') return jsonResponse(cycle());
  if (p.endsWith('/chart')) return jsonResponse([]);
  if (p.endsWith('/latest')) {
    return jsonResponse({'snapshot': null, 'deviceOnline': false});
  }
  return errorResponse(404, 'NOT_FOUND', 'Không có');
}

Future<Harness> open(
    WidgetTester tester, Future<http.Response> Function(http.Request) handler,
    {PushService? push}) async {
  tester.view.physicalSize = const Size(800, 2000);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final h = Harness(handler, saved: customer());
  await tester.pumpWidget(
      MushroomApp(auth: h.auth, push: push ?? const NoPushService()));
  await h.auth.restore();
  await tester.pumpAndSettle();
  return h;
}

Future<void> goNotifications(WidgetTester tester) async {
  await tester.tap(find.text('Thông báo').last);
  await tester.pumpAndSettle();
}

void main() {
  test('mô tả trạng thái push và kết quả gửi thử', () {
    expect(testPushResult({'registeredTokens': 0, 'sent': 0, 'dryRun': false}),
        contains('chưa đăng ký'));
    expect(testPushResult({'registeredTokens': 1, 'sent': 1, 'dryRun': true}),
        contains('FCM_DRY_RUN'));
    expect(testPushResult({'registeredTokens': 1, 'sent': 1, 'dryRun': false}),
        contains('Đã gửi'));
    expect(testPushResult({'registeredTokens': 1, 'sent': 0, 'dryRun': false}),
        contains('chưa gửi được'));
  });

  testWidgets(
      'danh sách thông báo, chấm chưa đọc ở thanh dưới và dấu chưa đọc từng dòng',
      (tester) async {
    await open(
        tester,
        (r) => server(r,
            notes: () => [
                  note('n1'),
                  note('n2',
                      read: true,
                      title: 'Thuê khay thành công',
                      type: 'RENTAL_CREATED',
                      data: {'rentalId': 'r1'})
                ]));
    expect(find.text('1'), findsOneWidget); // huy hiệu số chưa đọc
    await goNotifications(tester);
    expect(find.text('Khay A-01: Ủ tơ'), findsOneWidget);
    expect(find.text('Thuê khay thành công'), findsOneWidget);
    expect(find.text('5 phút trước'), findsNWidgets(2));
    expect(find.byKey(const Key('mark-all')), findsOneWidget);
    expect(find.text('Đánh dấu đã đọc cả 1'), findsOneWidget);
  });

  testWidgets('bấm thông báo về khay: đánh dấu đã đọc và mở chi tiết khay',
      (tester) async {
    final h = await open(tester, (r) => server(r, notes: () => [note('n1')]));
    await goNotifications(tester);
    await tester.tap(find.byKey(const Key('notification-n1')));
    await tester.pumpAndSettle();
    expect(
        h.requests.any((r) =>
            r.method == 'POST' &&
            r.url.path == '/api/core/notifications/n1/read'),
        isTrue);
    expect(find.text('Khay A-01'), findsWidgets); // tiêu đề màn chi tiết khay
    expect(find.byKey(const Key('cycle-stage')), findsOneWidget);
    expect(find.text('Phòng Phòng Ủ 1'), findsOneWidget);
  });

  testWidgets('bấm thông báo đơn thuê thì về tab Khay của tôi', (tester) async {
    await open(
        tester,
        (r) => server(r,
            notes: () => [
                  note('n2',
                      type: 'RENTAL_CREATED',
                      data: {'rentalId': 'r1'},
                      title: 'Thuê khay thành công')
                ]));
    await goNotifications(tester);
    await tester.tap(find.byKey(const Key('notification-n2')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('trays-empty')), findsOneWidget);
  });

  testWidgets('khay trong thông báo không còn: báo nhẹ nhàng, không sập',
      (tester) async {
    await open(
        tester,
        (r) async => r.url.path == '/api/core/cycles/c1'
            ? errorResponse(404, 'CYCLE_NOT_FOUND', 'Đợt nuôi không tồn tại')
            : await server(r, notes: () => [note('n1')]));
    await goNotifications(tester);
    await tester.tap(find.byKey(const Key('notification-n1')));
    await tester.pumpAndSettle();
    expect(find.text('Khay này không còn trong danh sách của bạn.'),
        findsOneWidget);
  });

  testWidgets('đánh dấu đã đọc tất cả gọi API cho từng thông báo chưa đọc',
      (tester) async {
    final h = await open(
        tester,
        (r) => server(r,
            notes: () => [note('n1'), note('n2'), note('n3', read: true)]));
    await goNotifications(tester);
    await tester.tap(find.byKey(const Key('mark-all')));
    await tester.pumpAndSettle();
    final reads = h.requests
        .where((r) => r.url.path.endsWith('/read'))
        .map((r) => r.url.path)
        .toSet();
    expect(reads,
        {'/api/core/notifications/n1/read', '/api/core/notifications/n2/read'});
    expect(find.byKey(const Key('mark-all')), findsNothing);
  });

  testWidgets(
      'chưa có thông báo: hiện trạng thái trống; lỗi tải có nút Thử lại',
      (tester) async {
    var fail = true;
    await open(tester, (r) async {
      if (r.url.path == '/api/core/notifications' && fail) {
        return errorResponse(500, 'INTERNAL', 'Máy chủ bận');
      }
      return server(r, notes: () => []);
    });
    await goNotifications(tester);
    expect(find.textContaining('Máy chủ bận'), findsOneWidget);
    fail = false;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('notifications-empty')), findsOneWidget);
  });

  testWidgets(
      'push đến khi app đang mở: tải lại số chưa đọc và hiện thanh báo ngắn',
      (tester) async {
    var list = <Map<String, dynamic>>[];
    final push = FakePush();
    await open(tester, (r) => server(r, notes: () => list), push: push);
    expect(find.text('1'), findsNothing);
    list = [note('n1')];
    push.foreground.add(const PushMessage(
        title: 'Khay A-01: Ủ tơ',
        body: 'Khay đã sang Ủ tơ',
        data: {'cycleId': 'c1'}));
    await tester.pumpAndSettle();
    expect(find.text('1'), findsOneWidget);
    expect(find.text('Khay A-01: Ủ tơ: Khay đã sang Ủ tơ'), findsOneWidget);
    await tester.tap(find.text('Xem'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('notification-n1')), findsOneWidget);
  });

  testWidgets(
      'bấm thông báo đẩy từ thanh trạng thái: mở tab Thông báo và khay liên quan',
      (tester) async {
    final push = FakePush();
    await open(tester, (r) => server(r, notes: () => [note('n1')]), push: push);
    push.opened
        .add(const PushMessage(title: 't', body: 'b', data: {'cycleId': 'c1'}));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('cycle-stage')), findsOneWidget);
  });

  testWidgets('app mở từ thông báo khi đã tắt hẳn: vào thẳng tab Thông báo',
      (tester) async {
    final push = FakePush(
        initial:
            const PushMessage(title: 't', body: 'b', data: {'type': 'NEW'}));
    await open(tester, (r) => server(r, notes: () => [note('n1')]), push: push);
    expect(find.byKey(const Key('notification-n1')), findsOneWidget);
  });

  testWidgets(
      'tab Tài khoản: trạng thái push, gửi thử, và đăng xuất hủy token trước',
      (tester) async {
    final h =
        await open(tester, (r) => server(r, notes: () => []), push: FakePush());
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    expect(find.text('Thông báo đẩy: đã bật trên máy này.'), findsOneWidget);
    await tester.tap(find.byKey(const Key('test-push')));
    await tester.pumpAndSettle();
    expect(
        find.text('Đã gửi. Thông báo sẽ hiện trong vài giây.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('logout')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Đăng xuất'));
    await tester.pumpAndSettle();
    final del = h.requests.where((r) => r.method == 'DELETE').single;
    expect(del.url.path, startsWith('/api/core/notifications/device-tokens/'));
    expect(del.headers['Authorization'],
        isNotNull); // gọi khi vẫn còn token đăng nhập
    expect(find.text('Đăng nhập để xem khay nấm của bạn.'), findsOneWidget);
  });

  testWidgets(
      'bản cài chưa có Firebase: nói rõ ở tab Tài khoản và gửi thử báo chưa đăng ký',
      (tester) async {
    await open(
        tester,
        (r) => server(r,
            notes: () => [],
            testPush: {'registeredTokens': 0, 'sent': 0, 'dryRun': true}));
    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('chưa cấu hình Firebase'), findsOneWidget);
    await tester.tap(find.byKey(const Key('test-push')));
    await tester.pumpAndSettle();
    expect(
        find.textContaining('chưa đăng ký nhận thông báo đẩy'), findsOneWidget);
  });
}
