import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mushroom_customer/features/packages/application/packages_controller.dart';
import 'package:mushroom_customer/features/packages/data/package_repository.dart';
import 'package:mushroom_customer/features/packages/data/rental_package.dart';
import 'package:mushroom_customer/features/packages/presentation/packages_screen.dart';

import '../../support/fakes.dart';

void main() {
  group('ApiPackageRepository', () {
    test('GET /api/core/packages và đọc gói + số khay trống', () async {
      final adapter = ScriptedAdapter((o, i) async => jsonResponse(200, {
            'items': [
              {'id': 'p1', 'name': 'Gói 30 ngày', 'durationDays': 30, 'pricePerTray': 150000, 'isActive': true},
              {'id': 'p2', 'name': 'Gói 60 ngày', 'durationDays': 60, 'pricePerTray': 270000, 'isActive': true},
            ],
            'availableTrayCount': 18,
          }));

      final catalog = await ApiPackageRepository(makeApiClient(adapter)).listPackages();

      expect(adapter.calls.single.method, 'GET');
      expect(adapter.calls.single.path, '/api/core/packages');
      expect(catalog.availableTrayCount, 18);
      expect(catalog.items.map((p) => p.name), ['Gói 30 ngày', 'Gói 60 ngày']);
      expect(catalog.items.first.durationDays, 30);
      expect(catalog.items.first.pricePerTray, 150000);
    });
  });

  group('PackagesController', () {
    test('tải gói; lỗi rồi thử lại được; đổi tài khoản thì tải lại', () async {
      final repo = ScriptedPackageRepository(available: 7)..failure = networkError;
      final container = ProviderContainer(overrides: testOverrides(packages: repo));
      addTearDown(container.dispose);

      await expectLater(container.read(packagesControllerProvider.future), throwsA(anything));

      repo.failure = null;
      container.invalidate(packagesControllerProvider);
      final catalog = await container.read(packagesControllerProvider.future);
      expect(catalog.availableTrayCount, 7);

      container.read(testUserIdProvider.notifier).state = 'user-2';
      await container.read(packagesControllerProvider.future);
      expect(repo.calls, 3);
    });
  });

  group('PackagesScreen', () {
    late ScriptedPackageRepository repo;

    setUp(() => repo = ScriptedPackageRepository(packages: [
          makePackage(),
          makePackage(id: 'pkg-60', name: 'Gói 60 ngày', days: 60, price: 270000),
        ]));

    Widget app() => testApp(
          initialLocation: '/trays/packages',
          overrides: testOverrides(packages: repo),
          routes: [
            GoRoute(
              path: '/trays/packages',
              builder: (_, __) => const PackagesScreen(),
              routes: [
                GoRoute(
                  path: 'rent',
                  builder: (_, state) =>
                      Scaffold(body: Text('Thuê: ${(state.extra! as RentalPackage).name}')),
                ),
              ],
            ),
          ],
        );

    testWidgets('đang tải rồi hiện các gói và số khay trống', (tester) async {
      repo.gate = Completer<void>();

      await tester.pumpWidget(app());
      await tester.pump();
      expect(find.text('Đang tải các gói thuê…'), findsOneWidget);

      repo.gate!.complete();
      await tester.pumpAndSettle();

      expect(find.text('Còn 5 khay trống.'), findsOneWidget);
      expect(find.text('Gói 30 ngày'), findsOneWidget);
      expect(find.text('Thời hạn 30 ngày'), findsOneWidget);
      expect(find.text('150.000 ₫ / khay'), findsOneWidget);
      expect(find.text('270.000 ₫ / khay'), findsOneWidget);
    });

    testWidgets('chọn gói thì sang màn hình thuê và mang theo gói đã chọn', (tester) async {
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Thuê khay').last);
      await tester.pumpAndSettle();

      expect(find.text('Thuê: Gói 60 ngày'), findsOneWidget);
    });

    testWidgets('hết khay trống: báo hết và khóa nút thuê', (tester) async {
      repo.available = 0;

      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.text('Hiện đã hết khay trống.'), findsOneWidget);
      final buttons = tester.widgetList<FilledButton>(find.byType(FilledButton));
      expect(buttons, isNotEmpty);
      expect(buttons.every((b) => b.onPressed == null), isTrue);
    });

    testWidgets('lỗi: màn hình lỗi có Thử lại', (tester) async {
      repo.failure = timeoutError;

      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      expect(find.text('Thử lại'), findsOneWidget);

      repo.failure = null;
      await tester.tap(find.text('Thử lại'));
      await tester.pumpAndSettle();

      expect(find.text('Gói 30 ngày'), findsOneWidget);
    });

    testWidgets('chưa có gói nào: hiện thông điệp rỗng', (tester) async {
      repo.packages = [];

      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(find.text('Hiện chưa có gói thuê nào.'), findsOneWidget);
    });
  });
}
