import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mushroom_customer/core/network/api_exception.dart';
import 'package:mushroom_customer/features/packages/application/packages_controller.dart';
import 'package:mushroom_customer/features/rentals/application/rent_controller.dart';
import 'package:mushroom_customer/features/rentals/data/rental.dart';
import 'package:mushroom_customer/features/rentals/data/rental_repository.dart';
import 'package:mushroom_customer/features/rentals/presentation/rent_tray_screen.dart';

import '../../support/fakes.dart';

const _insufficient = ApiException(statusCode: 409, code: 'INSUFFICIENT_TRAYS', message: 'Không đủ khay trống.');
const _paymentFailed = ApiException(statusCode: 402, code: 'PAYMENT_FAILED', message: 'Thanh toán thất bại.');

void main() {
  group('ApiRentalRepository', () {
    test('POST /api/core/rentals gửi đúng body và đọc đơn PAID', () async {
      final adapter = ScriptedAdapter((o, i) async => jsonResponse(201, {
            'id': 'rt1',
            'customerId': 'u1',
            'customerName': 'An',
            'packageId': 'p1',
            'packageName': 'Gói 30 ngày',
            'durationDays': 30,
            'pricePerTray': 150000,
            'trayCount': 2,
            'totalAmount': 300000,
            'status': 'PAID',
            'createdAt': '2026-10-20T10:00:00.000Z',
            'trays': [],
            'transactions': [],
          }));

      final rental = await ApiRentalRepository(makeApiClient(adapter)).createRental(packageId: 'p1', trayCount: 2);

      expect(adapter.calls.single.method, 'POST');
      expect(adapter.calls.single.path, '/api/core/rentals');
      expect(adapter.calls.single.data, {'packageId': 'p1', 'trayCount': 2});
      expect(rental.id, 'rt1');
      expect(rental.totalAmount, 300000);
      expect(rental.status, RentalStatus.paid);
      expect(rental.createdAt, isNotNull);
    });

    test('409 INSUFFICIENT_TRAYS (details là object) thành ApiException và không bị thử lại', () async {
      final adapter = ScriptedAdapter((o, i) async => jsonResponse(409, {
            'error': {
              'code': 'INSUFFICIENT_TRAYS',
              'message': 'Không đủ khay trống',
              'details': {'available': 1},
            },
          }));

      await expectLater(
        ApiRentalRepository(makeApiClient(adapter)).createRental(packageId: 'p1', trayCount: 5),
        throwsA(isA<ApiException>()
            .having((e) => e.code, 'code', 'INSUFFICIENT_TRAYS')
            .having((e) => e.statusCode, 'statusCode', 409)),
      );
      expect(adapter.calls, hasLength(1));
    });
  });

  group('RentController', () {
    late ScriptedRentalRepository rentals;
    late ScriptedPackageRepository packages;
    late ProviderContainer container;

    setUp(() {
      rentals = ScriptedRentalRepository();
      packages = ScriptedPackageRepository(available: 10);
      container = ProviderContainer(overrides: testOverrides(rentals: rentals, packages: packages));
      addTearDown(container.dispose);
      container.listen(rentControllerProvider, (_, __) {});
    });

    RentController ctrl() => container.read(rentControllerProvider.notifier);
    RentState state() => container.read(rentControllerProvider);

    test('đặt thành công: có đơn PAID và số khay trống được tải lại', () async {
      await container.read(packagesControllerProvider.future);
      expect(packages.calls, 1);

      await ctrl().submit(packageId: 'pkg-30', trayCount: 2);

      expect(rentals.requests.single, (packageId: 'pkg-30', trayCount: 2));
      expect(state().rental?.trayCount, 2);
      expect(state().rental?.status, RentalStatus.paid);
      expect(state().error, isNull);
      expect(state().submitting, isFalse);
      await container.read(packagesControllerProvider.future);
      expect(packages.calls, 2, reason: 'số khay trống đã đổi nên phải tải lại');
    });

    test('bấm đúp chỉ gửi một đơn', () async {
      rentals.gate = Completer<void>();

      final first = ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      final second = ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().submitting, isTrue);
      rentals.gate!.complete();
      await Future.wait([first, second]);

      expect(rentals.requests, hasLength(1));
    });

    test('đã đặt xong thì bấm tiếp không tạo thêm đơn', () async {
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);

      expect(rentals.requests, hasLength(1));
    });

    test('INSUFFICIENT_TRAYS: báo lỗi, không có đơn, tải lại số khay trống', () async {
      await container.read(packagesControllerProvider.future);
      rentals.failure = _insufficient;
      packages.available = 1;

      await ctrl().submit(packageId: 'pkg-30', trayCount: 5);

      expect(state().rental, isNull);
      expect(state().error?.code, 'INSUFFICIENT_TRAYS');
      expect(state().outcomeUncertain, isFalse);
      final catalog = await container.read(packagesControllerProvider.future);
      expect(catalog.availableTrayCount, 1);
    });

    test('PAYMENT_FAILED: báo lỗi, không tải lại gói, cho đặt lại', () async {
      await container.read(packagesControllerProvider.future);
      rentals.failure = _paymentFailed;

      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().error?.code, 'PAYMENT_FAILED');
      expect(packages.calls, 1);

      rentals.failure = null;
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().rental, isNotNull);
      expect(state().error, isNull);
      expect(rentals.requests, hasLength(2));
    });

    test('hết thời gian chờ: kết quả không chắc chắn; lỗi mạng thì chắc là chưa tạo', () async {
      rentals.failure = timeoutError;
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().outcomeUncertain, isTrue);

      rentals.failure = const ApiException(code: 'GATEWAY_TIMEOUT', message: '');
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().outcomeUncertain, isTrue);

      rentals.failure = networkError;
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);
      expect(state().outcomeUncertain, isFalse);
    });

    test('clearError xóa lỗi cũ', () async {
      rentals.failure = _paymentFailed;
      await ctrl().submit(packageId: 'pkg-30', trayCount: 1);

      ctrl().clearError();

      expect(state().error, isNull);
    });
  });

  group('RentTrayScreen', () {
    late ScriptedRentalRepository rentals;
    late ScriptedPackageRepository packages;

    setUp(() {
      rentals = ScriptedRentalRepository();
      packages = ScriptedPackageRepository(available: 10);
    });

    Widget app() => testApp(
          overrides: testOverrides(rentals: rentals, packages: packages),
          routes: [
            GoRoute(path: '/', builder: (_, __) => RentTrayScreen(package: makePackage())),
            stubRoute('/trays', 'Trang khay của tôi'),
          ],
        );

    Future<void> tapAdd(WidgetTester tester, int times) async {
      for (var i = 0; i < times; i++) {
        await tester.tap(find.byIcon(Icons.add));
        await tester.pump();
      }
    }

    Future<void> tapPay(WidgetTester tester, String label) async {
      final button = find.widgetWithText(FilledButton, label);
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pumpAndSettle();
    }

    testWidgets('đổi số khay cập nhật tổng tiền', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      expect(find.text('Thanh toán 150.000 ₫'), findsOneWidget);

      await tapAdd(tester, 2);

      expect(find.text('450.000 ₫'), findsOneWidget);
      expect(find.text('Thanh toán 450.000 ₫'), findsOneWidget);
    });

    testWidgets('không cho chọn quá số khay trống', (tester) async {
      packages.available = 2;
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tapAdd(tester, 5);

      expect(find.text('2'), findsOneWidget);
      expect(tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.add)).onPressed, isNull);
    });

    testWidgets('không cho giảm xuống dưới 1', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.remove)).onPressed, isNull);
    });

    testWidgets('thanh toán thành công: hiện đơn chờ xác nhận, nút về Khay của tôi', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      await tapAdd(tester, 2);

      await tapPay(tester, 'Thanh toán 450.000 ₫');

      expect(rentals.requests.single, (packageId: 'pkg-30', trayCount: 3));
      expect(find.text('Đặt thuê thành công'), findsOneWidget);
      expect(find.textContaining('Chờ xác nhận'), findsOneWidget);

      await tester.tap(find.text('Về Khay của tôi'));
      await tester.pumpAndSettle();
      expect(find.text('Trang khay của tôi'), findsOneWidget);
    });

    testWidgets('hết khay do người khác đặt trước: báo lỗi và tự hạ số khay xuống mức còn lại', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      await tapAdd(tester, 2); // đang chọn 3
      rentals.failure = _insufficient;
      packages.available = 2;

      await tapPay(tester, 'Thanh toán 450.000 ₫');

      expect(find.text('Không đủ khay trống.'), findsOneWidget);
      expect(find.text('Còn 2 khay trống'), findsOneWidget);
      expect(find.text('2'), findsOneWidget, reason: 'số khay đang chọn bị kéo xuống bằng số còn lại');
      expect(find.text('Đặt thuê thành công'), findsNothing);
    });

    testWidgets('thanh toán lỗi: hiện lỗi và vẫn đặt lại được', (tester) async {
      rentals.failure = _paymentFailed;
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tapPay(tester, 'Thanh toán 150.000 ₫');
      expect(find.text('Thanh toán thất bại.'), findsOneWidget);

      rentals.failure = null;
      await tapPay(tester, 'Thanh toán 150.000 ₫');
      expect(find.text('Đặt thuê thành công'), findsOneWidget);
    });

    testWidgets('hết thời gian chờ: cảnh báo đơn có thể đã được tạo', (tester) async {
      rentals.failure = timeoutError;
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tapPay(tester, 'Thanh toán 150.000 ₫');

      expect(find.textContaining('có thể đã được tạo'), findsOneWidget);
    });

    testWidgets('hết sạch khay: báo hết và khóa nút thanh toán', (tester) async {
      packages.available = 0;
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.text('Hiện đã hết khay trống. Vui lòng quay lại sau.'), findsOneWidget);
      final pay = tester.widget<FilledButton>(find.byType(FilledButton));
      expect(pay.onPressed, isNull);
    });
  });
}
