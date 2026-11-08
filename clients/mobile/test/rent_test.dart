import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mushroom_mobile/app.dart';
import 'package:mushroom_mobile/auth/session.dart';
import 'package:mushroom_mobile/rent/rental_repository.dart';
import 'package:mushroom_mobile/variety/variety_models.dart';

import 'helpers.dart';

Map<String, dynamic> pkgs({int available = 12}) => {
      'availableTrays': available,
      'packages': [
        {
          'id': 'p7',
          'name': 'Gói 7 ngày',
          'duration_days': 7,
          'price_per_tray': 50000,
          'is_active': true
        },
        {
          'id': 'p30',
          'name': 'Gói 30 ngày',
          'duration_days': 30,
          'price_per_tray': 150000,
          'is_active': true
        },
      ],
    };

Map<String, dynamic> created() => {
      'id': 'r1',
      'status': 'ACTIVE',
      'startDate': '2026-11-01',
      'endDate': '2026-11-07',
      'totalAmount': 100000,
      'trayIds': ['t1', 't2'],
    };

Map<String, dynamic> varietyJson(String id, String name) => {
      'id': id,
      'name': name,
      'description': 'Dễ trồng',
      'growth_days': 35,
      'temp_min': 20.0,
      'temp_max': 28.5,
      'hum_min': 80.0,
      'hum_max': 90.0
    };

Session customer() => Session(
    token: makeJwt(),
    role: 'CUSTOMER',
    name: 'Khách',
    expiresAt: DateTime.now().add(const Duration(hours: 8)));

Future<Harness> open(WidgetTester tester,
    Future<http.Response> Function(http.Request) handler) async {
  tester.view.physicalSize = const Size(800, 1800);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final h = Harness(withHomeStubs(handler), saved: customer());
  await tester.pumpWidget(MushroomApp(auth: h.auth));
  await h.auth.restore();
  await tester.pumpAndSettle();
  await tester.tap(find.text('Thuê khay').last);
  await tester.pumpAndSettle();
  return h;
}

void main() {
  test('PackageList đọc snake_case và giới hạn số khay chọn được', () {
    final l = PackageList.fromJson(pkgs(available: 80));
    expect(l.packages.first.durationDays, 7);
    expect(l.packages.first.pricePerTray, 50000);
    expect(l.maxCount, 50);
    expect(PackageList.fromJson(pkgs(available: 3)).maxCount, 3);
    expect(PackageList.fromJson(pkgs(available: 0)).maxCount, 0);
  });

  test('RentalResult đếm khay từ trayIds', () {
    final r = RentalResult.fromJson(created());
    expect(r.trayCount, 2);
    expect(r.endDate, '2026-11-07');
  });

  testWidgets('chọn gói, tăng giảm số khay trong giới hạn, tổng tiền cập nhật',
      (tester) async {
    await open(tester, (req) async => jsonResponse(pkgs(available: 2)));
    expect(find.text('Còn 2 khay trống'), findsOneWidget);
    expect(find.text('50.000 đ'), findsOneWidget);
    await tester.tap(find.byKey(const Key('count-plus')));
    await tester.pumpAndSettle();
    expect(find.text('100.000 đ'), findsOneWidget);
    // đã hết khay trống: nút + bị khóa
    await tester.tap(find.byKey(const Key('count-plus')));
    await tester.pumpAndSettle();
    expect(tester.widget<Text>(find.byKey(const Key('count'))).data, '2');
    await tester.tap(find.byKey(const Key('package-p30')));
    await tester.pumpAndSettle();
    expect(find.text('300.000 đ'), findsOneWidget);
  });

  testWidgets('thuê thành công gửi đúng body, hiện kết quả', (tester) async {
    final h = await open(tester, (req) async {
      if (req.method == 'POST') return jsonResponse(created(), 201);
      return jsonResponse(pkgs());
    });
    await tester.tap(find.byKey(const Key('count-plus')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Xác nhận thuê khay'), findsOneWidget);
    await tester.tap(find.text('Thuê ngay'));
    await tester.pumpAndSettle();
    final post = h.requests.firstWhere((r) => r.method == 'POST');
    expect(post.url.path, '/api/core/rentals');
    expect(post.body, contains('"packageId":"p7"'));
    expect(post.body, contains('"trayCount":2'));
    expect(find.text('Thuê khay thành công'), findsOneWidget);
    expect(find.text('2 khay, dùng đến hết 07/11/2026'), findsOneWidget);
  });

  testWidgets('hủy ở hộp xác nhận thì không gọi API thuê', (tester) async {
    final h = await open(tester, (req) async => jsonResponse(pkgs()));
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hủy'));
    await tester.pumpAndSettle();
    expect(h.requests.where((r) => r.method == 'POST'), isEmpty);
  });

  testWidgets(
      'hết khay giữa chừng: báo lỗi của server và tải lại số khay trống',
      (tester) async {
    var gets = 0;
    await open(tester, (req) async {
      if (req.method == 'POST') {
        return errorResponse(409, 'NOT_ENOUGH_TRAYS', 'Không đủ khay trống');
      }
      gets++;
      return jsonResponse(pkgs(available: gets == 1 ? 5 : 1));
    });
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Thuê ngay'));
    await tester.pumpAndSettle();
    expect(find.text('Không đủ khay trống'), findsOneWidget);
    expect(find.text('Còn 1 khay trống'), findsOneWidget);
  });

  testWidgets('không còn khay trống thì báo và không có nút thuê',
      (tester) async {
    await open(tester, (req) async => jsonResponse(pkgs(available: 0)));
    expect(find.textContaining('chưa còn khay trống'), findsOneWidget);
    expect(find.byKey(const Key('rent-submit')), findsNothing);
  });

  testWidgets('lỗi mạng khi tải gói: có nút Thử lại', (tester) async {
    var fail = true;
    await open(tester, (req) async {
      if (fail) throw http.ClientException('down');
      return jsonResponse(pkgs());
    });
    expect(find.text('Thử lại'), findsOneWidget);
    fail = false;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('rent-submit')), findsOneWidget);
  });

  test('Variety đọc snake_case và định dạng thông tin kiểu Việt Nam', () {
    final v = Variety.fromJson(varietyJson('v1', 'Nấm bào ngư'));
    expect(v.growthText, '35 ngày');
    expect(v.tempText, '20–28,5 °C');
    expect(v.humText, 'Ẩm 80–90 %');
    expect(
        const VarietyChoice.catalog(Variety(
                id: 'v1',
                name: 'A',
                description: '',
                growthDays: 1,
                tempMin: 1,
                tempMax: 2,
                humMin: 1,
                humMax: 2))
            .toBody(),
        {'varietyId': 'v1'});
    expect(const VarietyChoice.custom('Nấm Lạ').toBody(),
        {'customVariety': 'Nấm Lạ'});
    expect(const VarietyChoice.none().toBody(), isEmpty);
  });

  testWidgets('chọn giống trong danh mục: hiện thông tin giống, gửi varietyId',
      (tester) async {
    final h = await open(tester, (req) async {
      if (req.url.path == '/api/core/varieties') {
        return jsonResponse(
            [varietyJson('v1', 'Nấm bào ngư'), varietyJson('v2', 'Nấm rơm')]);
      }
      if (req.method == 'POST') {
        return jsonResponse(
            {...created(), 'variety': 'Nấm rơm', 'varietyStatus': 'APPROVED'},
            201);
      }
      return jsonResponse(pkgs());
    });
    expect(find.text('Chưa chọn (có thể chọn sau)'), findsOneWidget);
    await tester.tap(find.byKey(const Key('variety-tile')));
    await tester.pumpAndSettle();
    expect(find.text('Nấm bào ngư'), findsOneWidget);
    expect(find.text('20–28,5 °C'), findsWidgets);
    await tester.tap(find.byKey(const Key('variety-v2')));
    await tester.pumpAndSettle();
    expect(tester.widget<Text>(find.byKey(const Key('variety-title'))).data,
        'Nấm rơm');
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Giống nấm: Nấm rơm'), findsOneWidget);
    await tester.tap(find.text('Thuê ngay'));
    await tester.pumpAndSettle();
    final post = h.requests.firstWhere((r) => r.method == 'POST');
    expect(post.body, contains('"varietyId":"v2"'));
    expect(post.body, isNot(contains('customVariety')));
    expect(find.byKey(const Key('result-variety')), findsOneWidget);
  });

  testWidgets('nhập giống ngoài danh mục: gửi customVariety và báo chờ duyệt',
      (tester) async {
    final h = await open(tester, (req) async {
      if (req.url.path == '/api/core/varieties') {
        return jsonResponse([varietyJson('v1', 'Nấm bào ngư')]);
      }
      if (req.method == 'POST') {
        return jsonResponse(
            {...created(), 'variety': 'Nấm Lạ', 'varietyStatus': 'PENDING'},
            201);
      }
      return jsonResponse(pkgs());
    });
    await tester.tap(find.byKey(const Key('variety-tile')));
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('custom-submit')))
            .onPressed,
        isNull); // chưa nhập thì khóa
    await tester.enterText(
        find.byKey(const Key('custom-variety')), '  Nấm   Lạ ');
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('custom-submit')));
    await tester.tap(find.byKey(const Key('custom-submit')));
    await tester.pumpAndSettle();
    expect(
        find.text('Giống ngoài danh mục: chờ nhân viên duyệt'), findsOneWidget);
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Thuê ngay'));
    await tester.pumpAndSettle();
    expect(h.requests.firstWhere((r) => r.method == 'POST').body,
        contains('"customVariety":"Nấm Lạ"'));
    expect(find.textContaining('cần nhân viên duyệt'), findsOneWidget);
  });

  testWidgets(
      'chọn sau thì không gửi trường giống; danh mục trống vẫn cho nhập tên; lỗi tải có Thử lại',
      (tester) async {
    var calls = 0;
    final h = await open(tester, (req) async {
      if (req.url.path == '/api/core/varieties') {
        calls++;
        return calls == 1
            ? errorResponse(500, 'INTERNAL', 'Máy chủ bận')
            : jsonResponse([]);
      }
      if (req.method == 'POST') return jsonResponse(created(), 201);
      return jsonResponse(pkgs());
    });
    await tester.tap(find.byKey(const Key('variety-tile')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Máy chủ bận'), findsOneWidget);
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('variety-empty')), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('variety-later')));
    await tester.tap(find.byKey(const Key('variety-later')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('rent-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Giống nấm: chọn sau'), findsOneWidget);
    await tester.tap(find.text('Thuê ngay'));
    await tester.pumpAndSettle();
    final body = h.requests.firstWhere((r) => r.method == 'POST').body;
    expect(body, isNot(contains('variety')));
    expect(find.byKey(const Key('result-variety')), findsNothing);
  });

  testWidgets(
      'ô nhập tên giống không chặn độ dài lúc gõ (tránh làm rơi chữ của bộ gõ tiếng Việt), quá dài thì khóa nút',
      (tester) async {
    await open(tester, (req) async {
      if (req.url.path == '/api/core/varieties') return jsonResponse([]);
      return jsonResponse(pkgs());
    });
    await tester.tap(find.byKey(const Key('variety-tile')));
    await tester.pumpAndSettle();
    final field =
        tester.widget<TextField>(find.byKey(const Key('custom-variety')));
    expect(field.maxLength, isNull);
    expect(field.inputFormatters, isNull);

    await tester.enterText(find.byKey(const Key('custom-variety')),
        'nấm rơm tím được ươm ở Đà Lạt');
    await tester.pump();
    expect(find.text('nấm rơm tím được ươm ở Đà Lạt'),
        findsOneWidget); // giữ nguyên dấu và khoảng trắng
    expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('custom-submit')))
            .onPressed,
        isNotNull);

    await tester.enterText(find.byKey(const Key('custom-variety')), 'ă' * 101);
    await tester.pump();
    expect(find.byKey(const Key('custom-too-long')), findsOneWidget);
    expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('custom-submit')))
            .onPressed,
        isNull);
    await tester.enterText(find.byKey(const Key('custom-variety')), 'ă' * 100);
    await tester.pump();
    expect(find.byKey(const Key('custom-too-long')), findsNothing);
    expect(
        tester
            .widget<FilledButton>(find.byKey(const Key('custom-submit')))
            .onPressed,
        isNotNull);
  });
}
