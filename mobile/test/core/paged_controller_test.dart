import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_customer/core/network/api_exception.dart';

import '../support/fakes.dart';

void main() {
  late FakePagedSource<int> source;
  late ProviderContainer container;

  // 5 phần tử, mỗi trang 2: trang 1 = [1,2], trang 2 = [3,4], trang 3 = [5].
  setUp(() {
    source = FakePagedSource<int>([1, 2, 3, 4, 5]);
    container = ProviderContainer(overrides: testOverrides(paged: source));
    addTearDown(container.dispose);
  });

  PagedIntsController ctrl() => container.read(pagedIntsProvider.notifier);
  List<int> items() => container.read(pagedIntsProvider).requireValue.items;

  test('lần tải đầu lấy trang 1', () async {
    await container.read(pagedIntsProvider.future);

    expect(items(), [1, 2]);
    expect(container.read(pagedIntsProvider).requireValue.hasMore, isTrue);
    expect(source.requestedPages, [1]);
  });

  test('loadMore nối thêm đến khi đủ total rồi dừng, không gọi thừa', () async {
    await container.read(pagedIntsProvider.future);

    await ctrl().loadMore();
    await ctrl().loadMore();
    expect(items(), [1, 2, 3, 4, 5]);
    expect(container.read(pagedIntsProvider).requireValue.hasMore, isFalse);

    await ctrl().loadMore();
    expect(source.requestedPages, [1, 2, 3], reason: 'hết trang thì không gọi nữa');
  });

  test('gọi loadMore liên tiếp chỉ tải một lần', () async {
    await container.read(pagedIntsProvider.future);

    await Future.wait([ctrl().loadMore(), ctrl().loadMore(), ctrl().loadMore()]);

    expect(source.requestedPages, [1, 2]);
    expect(items(), [1, 2, 3, 4]);
  });

  test('lỗi khi tải trang kế: giữ các mục đã có, ghi lỗi, gọi lại là thử lại', () async {
    await container.read(pagedIntsProvider.future);
    source.failures[2] = networkError;

    await ctrl().loadMore();
    var state = container.read(pagedIntsProvider).requireValue;
    expect(state.items, [1, 2]);
    expect(state.loadMoreError?.code, 'NETWORK_ERROR');
    expect(state.isLoadingMore, isFalse);

    source.failures.clear();
    await ctrl().loadMore();
    state = container.read(pagedIntsProvider).requireValue;
    expect(state.items, [1, 2, 3, 4]);
    expect(state.loadMoreError, isNull);
  });

  test('trang rỗng thì dừng dù total nói còn (tránh lặp vô hạn)', () async {
    source.all = [1, 2];
    source.totalOverride = 10;
    await container.read(pagedIntsProvider.future);

    await ctrl().loadMore(); // trang 2 rỗng

    expect(container.read(pagedIntsProvider).requireValue.hasMore, isFalse);
    await ctrl().loadMore();
    expect(source.requestedPages, [1, 2]);
  });

  test('refresh quay về trang 1', () async {
    await container.read(pagedIntsProvider.future);
    await ctrl().loadMore();
    source.all = [10, 20, 30];

    final message = await ctrl().refresh();

    expect(message, isNull);
    expect(items(), [10, 20]);
    expect(container.read(pagedIntsProvider).requireValue.nextPage, 2);
  });

  test('refresh lỗi khi đã có dữ liệu: giữ dữ liệu cũ và trả thông điệp', () async {
    await container.read(pagedIntsProvider.future);
    source.failures[1] = networkError;

    final message = await ctrl().refresh();

    expect(message, isNotNull);
    expect(container.read(pagedIntsProvider).hasError, isFalse);
    expect(items(), [1, 2]);
  });

  test('lần tải đầu lỗi -> AsyncError; refresh thành công thì có dữ liệu', () async {
    source.failures[1] = networkError;
    await expectLater(container.read(pagedIntsProvider.future), throwsA(isA<ApiException>()));
    expect(container.read(pagedIntsProvider).hasError, isTrue);

    source.failures.clear();
    await ctrl().refresh();

    expect(items(), [1, 2]);
  });

  test('kết quả trang kế về muộn sau khi refresh bị bỏ, không chèn vào danh sách mới', () async {
    await container.read(pagedIntsProvider.future);
    source.gates[2] = Completer<void>();

    final pending = ctrl().loadMore(); // đang chờ trang 2
    await ctrl().refresh(); // làm mới trong lúc đó
    source.gates[2]!.complete();
    await pending;

    expect(items(), [1, 2], reason: 'không được nối [3,4] của lần tải cũ');
    expect(container.read(pagedIntsProvider).requireValue.isLoadingMore, isFalse);
  });

  test('đổi tài khoản thì tải lại từ trang 1', () async {
    await container.read(pagedIntsProvider.future);
    await ctrl().loadMore();

    container.read(testUserIdProvider.notifier).state = 'user-2';
    await container.read(pagedIntsProvider.future);

    expect(items(), [1, 2]);
    expect(source.requestedPages, [1, 2, 1]);
  });
}
