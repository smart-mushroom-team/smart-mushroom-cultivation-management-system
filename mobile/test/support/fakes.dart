// Đồ giả dùng chung cho test của Khay của tôi / Gói thuê / Thuê khay và các thành phần dùng chung.
// Mỗi repository giả đều cho: đếm số lần gọi, giả lỗi (`failure`), và giữ yêu cầu lại bằng `gate`
// để kiểm tra trạng thái "đang tải" / chống bấm đúp.
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mushroom_customer/core/network/api_client.dart';
import 'package:mushroom_customer/core/network/api_exception.dart';
import 'package:mushroom_customer/core/pagination/paged_controller.dart';
import 'package:mushroom_customer/core/pagination/paged_state.dart';
import 'package:mushroom_customer/core/providers.dart';
import 'package:mushroom_customer/core/storage/token_storage.dart';
import 'package:mushroom_customer/core/theme/app_theme.dart';
import 'package:mushroom_customer/features/packages/application/packages_controller.dart';
import 'package:mushroom_customer/features/packages/data/package_repository.dart';
import 'package:mushroom_customer/features/packages/data/rental_package.dart';
import 'package:mushroom_customer/features/rentals/application/rent_controller.dart';
import 'package:mushroom_customer/features/rentals/data/rental.dart';
import 'package:mushroom_customer/features/rentals/data/rental_repository.dart';
import 'package:mushroom_customer/features/trays/application/my_trays_controller.dart';
import 'package:mushroom_customer/features/trays/data/cycle_summary.dart';
import 'package:mushroom_customer/features/trays/data/my_tray.dart';
import 'package:mushroom_customer/features/trays/data/my_trays_repository.dart';

// ---------------------------------------------------------------- dữ liệu mẫu

const networkError = ApiException(code: 'NETWORK_ERROR', message: '');
const timeoutError = ApiException(code: 'TIMEOUT', message: '');

CycleSummary makeCycle({CycleStage stage = CycleStage.fruiting}) => CycleSummary(
      id: 'cycle-1',
      stage: stage,
      status: 'GROWING',
      variety: 'Nấm sò trắng',
      expectedHarvestDate: DateTime(2026, 11, 5),
    );

MyTray makeTray({
  String id = 'tray-1',
  String code = 'A1-02-03-01',
  int? daysRemaining = 12,
  CycleSummary? cycle,
}) =>
    MyTray(
      trayId: id,
      trayCode: code,
      roomId: 'room-1',
      roomName: 'Phòng ủ A1',
      location: const TrayLocation(row: 2, shelf: 3, slot: 1),
      rentalId: 'rental-1',
      rentalEndDate: DateTime(2026, 11, 1),
      daysRemaining: daysRemaining,
      currentCycle: cycle,
    );

RentalPackage makePackage({
  String id = 'pkg-30',
  String name = 'Gói 30 ngày',
  int days = 30,
  int price = 150000,
}) =>
    RentalPackage(id: id, name: name, durationDays: days, pricePerTray: price, isActive: true);

Rental makeRental({int trayCount = 2, int pricePerTray = 150000}) => Rental(
      id: 'rental-1',
      packageName: 'Gói 30 ngày',
      durationDays: 30,
      pricePerTray: pricePerTray,
      trayCount: trayCount,
      totalAmount: pricePerTray * trayCount,
      status: RentalStatus.paid,
    );

// ---------------------------------------------------------------- repository giả

class ScriptedMyTraysRepository implements MyTraysRepository {
  ScriptedMyTraysRepository([List<MyTray>? trays]) : trays = trays ?? [];

  List<MyTray> trays;
  ApiException? failure;
  Completer<void>? gate;
  int calls = 0;

  @override
  Future<List<MyTray>> listMyTrays() async {
    calls++;
    await gate?.future;
    if (failure != null) throw failure!;
    return List.of(trays);
  }
}

class ScriptedPackageRepository implements PackageRepository {
  ScriptedPackageRepository({List<RentalPackage>? packages, this.available = 5})
      : packages = packages ?? [makePackage()];

  List<RentalPackage> packages;
  int available;
  ApiException? failure;
  Completer<void>? gate;
  int calls = 0;

  @override
  Future<PackageCatalog> listPackages() async {
    calls++;
    await gate?.future;
    if (failure != null) throw failure!;
    return PackageCatalog(items: List.of(packages), availableTrayCount: available);
  }
}

class ScriptedRentalRepository implements RentalRepository {
  /// Các yêu cầu đã nhận, theo thứ tự.
  final List<({String packageId, int trayCount})> requests = [];
  ApiException? failure;
  Completer<void>? gate;

  @override
  Future<Rental> createRental({required String packageId, required int trayCount}) async {
    requests.add((packageId: packageId, trayCount: trayCount));
    await gate?.future;
    if (failure != null) throw failure!;
    return makeRental(trayCount: trayCount);
  }
}

// ---------------------------------------------------------------- phân trang

/// Nguồn phân trang giả trên một danh sách có sẵn.
class FakePagedSource<T> {
  FakePagedSource(this.all);

  List<T> all;

  /// Nếu đặt, trả `total` này thay vì số phần tử thật (giả lập dữ liệu đổi giữa hai lần gọi).
  int? totalOverride;
  final List<int> requestedPages = [];
  final Map<int, ApiException> failures = {};
  final Map<int, Completer<void>> gates = {};

  Future<PageResult<T>> fetch(int page, int limit) async {
    requestedPages.add(page);
    await gates[page]?.future;
    final failure = failures[page];
    if (failure != null) throw failure;
    final start = (page - 1) * limit;
    return PageResult(
      items: all.skip(start).take(limit).toList(),
      page: page,
      limit: limit,
      total: totalOverride ?? all.length,
    );
  }
}

final pagedSourceProvider = Provider<FakePagedSource<int>>(
  (_) => throw UnimplementedError('override pagedSourceProvider'),
);
final pagedPageSizeProvider = Provider<int>((_) => 2);

class PagedIntsController extends PagedController<int> {
  @override
  int get pageSize => ref.read(pagedPageSizeProvider);

  @override
  Future<PageResult<int>> fetchPage(int page, int limit) => ref.read(pagedSourceProvider).fetch(page, limit);
}

final pagedIntsProvider =
    AsyncNotifierProvider<PagedIntsController, PagedState<int>>(PagedIntsController.new);

// ---------------------------------------------------------------- provider/container/app

/// Người đang đăng nhập trong test; đổi giá trị để giả lập đổi tài khoản.
final testUserIdProvider = StateProvider<String?>((_) => 'user-1');

List<Override> testOverrides({
  MyTraysRepository? trays,
  PackageRepository? packages,
  RentalRepository? rentals,
  FakePagedSource<int>? paged,
  int pageSize = 2,
}) =>
    [
      currentUserIdProvider.overrideWith((ref) => ref.watch(testUserIdProvider)),
      if (trays != null) myTraysRepositoryProvider.overrideWithValue(trays),
      if (packages != null) packageRepositoryProvider.overrideWithValue(packages),
      if (rentals != null) rentalRepositoryProvider.overrideWithValue(rentals),
      if (paged != null) pagedSourceProvider.overrideWithValue(paged),
      pagedPageSizeProvider.overrideWithValue(pageSize),
    ];

GoRoute stubRoute(String path, String text) =>
    GoRoute(path: path, builder: (_, __) => Scaffold(body: Center(child: Text(text))));

Widget testApp({
  required List<RouteBase> routes,
  String initialLocation = '/',
  List<Override> overrides = const [],
}) {
  final router = GoRouter(initialLocation: initialLocation, routes: routes);
  return ProviderScope(
    overrides: overrides,
    child: MaterialApp.router(theme: AppTheme.light(), routerConfig: router),
  );
}

// ---------------------------------------------------------------- HTTP giả (test repository gọi API)

class MemoryTokenStorage implements TokenStorage {
  @override
  Future<String?> readAccessToken() async => 'access';
  @override
  Future<String?> readRefreshToken() async => 'refresh';
  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {}
  @override
  Future<void> clear() async {}
}

class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options, int index) handler;
  final List<RequestOptions> calls = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    calls.add(options);
    return handler(options, calls.length - 1);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonResponse(int status, Object body) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

/// Gọi lại qua ApiClient thật nhưng không chờ thử lại (`retryDelays` rỗng).
ApiClient makeApiClient(ScriptedAdapter adapter) => ApiClient(
      storage: MemoryTokenStorage(),
      baseUrl: 'http://test',
      adapter: adapter,
      retryDelays: const [],
    );
