import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mushroom_customer/core/network/api_exception.dart';
import 'package:mushroom_customer/features/trays/application/my_trays_controller.dart';
import 'package:mushroom_customer/features/trays/data/cycle_summary.dart';
import 'package:mushroom_customer/features/trays/data/my_trays_repository.dart';
import 'package:mushroom_customer/features/trays/presentation/my_trays_screen.dart';

import '../../support/fakes.dart';

void main() {
  group('ApiMyTraysRepository', () {
    test('GET /api/core/my-trays và đọc đúng các trường của MyTray', () async {
      final adapter = ScriptedAdapter((o, i) async => jsonResponse(200, {
            'items': [
              {
                'trayId': 't1',
                'trayCode': 'A1-02-03-01',
                'roomId': 'r1',
                'roomName': 'Phòng ủ A1',
                'location': {'row': 2, 'shelf': 3, 'slot': 1},
                'rentalId': 'rt1',
                'rentalEndDate': '2026-11-01',
                'daysRemaining': 12,
                'currentCycle': {
                  'id': 'c1',
                  'stage': 'FRUITING',
                  'status': 'GROWING',
                  'variety': 'Nấm sò trắng',
                  'startDate': '2026-10-01',
                  'expectedHarvestDate': '2026-11-05',
                },
              },
              // Tối thiểu theo `required` của schema: không phòng, không vị trí, chưa có đợt nuôi.
              {
                'trayId': 't2',
                'trayCode': 'A1-02-03-02',
                'roomId': 'r1',
                'rentalId': 'rt1',
                'rentalEndDate': '2026-11-01',
                'currentCycle': null,
              },
              // Giai đoạn lạ từ server không làm app vỡ.
              {
                'trayId': 't3',
                'trayCode': 'A1-02-03-03',
                'roomId': 'r1',
                'rentalId': 'rt1',
                'rentalEndDate': '2026-11-01',
                'currentCycle': {'id': 'c3', 'stage': 'DRYING', 'status': 'GROWING'},
              },
            ],
          }));

      final trays = await ApiMyTraysRepository(makeApiClient(adapter)).listMyTrays();

      expect(adapter.calls.single.method, 'GET');
      expect(adapter.calls.single.path, '/api/core/my-trays');
      expect(trays, hasLength(3));
      expect(trays[0].trayCode, 'A1-02-03-01');
      expect(trays[0].location!.label, 'Hàng 2 · Kệ 3 · Ô 1');
      expect(trays[0].rentalEndDate, DateTime(2026, 11, 1));
      expect(trays[0].daysRemaining, 12);
      expect(trays[0].currentCycle!.stage, CycleStage.fruiting);
      expect(trays[0].currentCycle!.expectedHarvestDate, DateTime(2026, 11, 5));
      expect(trays[1].currentCycle, isNull);
      expect(trays[1].location, isNull);
      expect(trays[1].roomName, isNull);
      expect(trays[2].currentCycle!.stage, CycleStage.unknown);
    });

    test('403 (không phải Customer) thành ApiException', () async {
      final adapter = ScriptedAdapter((o, i) async => jsonResponse(403, {
            'error': {'code': 'FORBIDDEN', 'message': 'Không đủ quyền'},
          }));

      await expectLater(
        ApiMyTraysRepository(makeApiClient(adapter)).listMyTrays(),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 403)),
      );
    });
  });

  group('MyTraysController', () {
    late ScriptedMyTraysRepository repo;
    late ProviderContainer container;

    setUp(() {
      repo = ScriptedMyTraysRepository([makeTray()]);
      container = ProviderContainer(overrides: testOverrides(trays: repo));
      addTearDown(container.dispose);
    });

    test('tải danh sách khay', () async {
      final trays = await container.read(myTraysControllerProvider.future);

      expect(trays.map((t) => t.trayCode), ['A1-02-03-01']);
      expect(repo.calls, 1);
    });

    test('lỗi thì AsyncError; thử lại (invalidate) thành công', () async {
      repo.failure = networkError;
      await expectLater(container.read(myTraysControllerProvider.future), throwsA(isA<ApiException>()));
      expect(container.read(myTraysControllerProvider).hasError, isTrue);

      repo.failure = null;
      container.invalidate(myTraysControllerProvider);
      final trays = await container.read(myTraysControllerProvider.future);

      expect(trays, hasLength(1));
    });

    test('refresh thành công cập nhật danh sách', () async {
      await container.read(myTraysControllerProvider.future);
      repo.trays = [makeTray(), makeTray(id: 'tray-2', code: 'A1-02-03-02')];

      final message = await container.read(myTraysControllerProvider.notifier).refresh();

      expect(message, isNull);
      expect(container.read(myTraysControllerProvider).requireValue, hasLength(2));
    });

    test('refresh lỗi khi đã có dữ liệu: giữ dữ liệu cũ, trả thông điệp để báo', () async {
      await container.read(myTraysControllerProvider.future);
      repo.failure = networkError;

      final message = await container.read(myTraysControllerProvider.notifier).refresh();

      expect(message, contains('Không kết nối được máy chủ'));
      expect(container.read(myTraysControllerProvider).hasError, isFalse);
      expect(container.read(myTraysControllerProvider).requireValue, hasLength(1));
    });

    test('đổi tài khoản thì tải lại, không giữ khay của người trước', () async {
      await container.read(myTraysControllerProvider.future);
      repo.trays = [makeTray(code: 'B2-01-01-01')];

      container.read(testUserIdProvider.notifier).state = 'user-2';
      final trays = await container.read(myTraysControllerProvider.future);

      expect(trays.single.trayCode, 'B2-01-01-01');
      expect(repo.calls, 2);
    });
  });

  group('MyTraysScreen', () {
    late ScriptedMyTraysRepository repo;

    setUp(() => repo = ScriptedMyTraysRepository());

    Widget app() => testApp(
          initialLocation: '/trays',
          overrides: testOverrides(trays: repo),
          routes: [
            GoRoute(
              path: '/trays',
              builder: (_, __) => const MyTraysScreen(),
              routes: [stubRoute('packages', 'Trang gói thuê')],
            ),
          ],
        );

    testWidgets('đang tải rồi hiện thẻ khay (mã, ngày còn lại, giai đoạn, ngày thuê đến)', (tester) async {
      repo.trays = [
        makeTray(cycle: makeCycle()),
        makeTray(id: 'tray-2', code: 'A1-02-03-02', daysRemaining: 3),
      ];
      repo.gate = Completer<void>();

      await tester.pumpWidget(app());
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Đang tải khay của bạn…'), findsOneWidget);

      repo.gate!.complete();
      await tester.pumpAndSettle();

      expect(find.text('A1-02-03-01'), findsOneWidget);
      expect(find.text('A1-02-03-02'), findsOneWidget);
      expect(find.text('Còn 12 ngày'), findsOneWidget);
      expect(find.text('Còn 3 ngày'), findsOneWidget);
      expect(find.text('Phòng ủ A1 · Hàng 2 · Kệ 3 · Ô 1'), findsNWidgets(2));
      expect(find.text('Ra quả thể'), findsOneWidget);
      expect(find.text('Chưa có đợt nuôi đang chạy'), findsOneWidget);
      expect(find.text('Dự kiến thu hoạch: 05/11/2026'), findsOneWidget);
      expect(find.text('Thuê đến: 01/11/2026'), findsNWidgets(2));
    });

    testWidgets('lỗi: hiện màn hình lỗi, bấm Thử lại thì tải lại và hiện khay', (tester) async {
      repo
        ..trays = [makeTray()]
        ..failure = networkError;

      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      expect(find.text('Thử lại'), findsOneWidget);
      expect(find.textContaining('Không kết nối được máy chủ'), findsOneWidget);

      repo.failure = null;
      await tester.tap(find.text('Thử lại'));
      await tester.pumpAndSettle();

      expect(find.text('A1-02-03-01'), findsOneWidget);
      expect(find.text('Thử lại'), findsNothing);
      expect(repo.calls, 2);
    });

    testWidgets('chưa có khay: hiện hướng dẫn và nút đi tới các gói thuê', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.textContaining('chưa có khay nào đang nuôi'), findsOneWidget);

      await tester.tap(find.text('Xem các gói thuê'));
      await tester.pumpAndSettle();

      expect(find.text('Trang gói thuê'), findsOneWidget);
    });

    testWidgets('nút "Thuê khay" đi tới danh sách gói', (tester) async {
      repo.trays = [makeTray()];
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Thuê khay'));
      await tester.pumpAndSettle();

      expect(find.text('Trang gói thuê'), findsOneWidget);
    });

    testWidgets('kéo để làm mới lỗi: giữ danh sách cũ và báo bằng thanh thông báo', (tester) async {
      repo.trays = [makeTray()];
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      repo.failure = networkError;

      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      expect(find.text('A1-02-03-01'), findsOneWidget);
      expect(find.byType(SnackBar), findsOneWidget);
    });
  });
}
