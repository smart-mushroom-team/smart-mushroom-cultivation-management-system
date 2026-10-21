import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_customer/core/pagination/paged_state.dart';
import 'package:mushroom_customer/core/widgets/async_value_view.dart';
import 'package:mushroom_customer/core/widgets/paged_list_view.dart';

import '../support/fakes.dart';

class _Harness extends ConsumerWidget {
  const _Harness({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ctrl = ref.read(pagedIntsProvider.notifier);
    return Scaffold(
      body: AsyncValueView<PagedState<int>>(
        value: ref.watch(pagedIntsProvider),
        onRetry: () => ref.invalidate(pagedIntsProvider),
        data: (state) => PagedListView<int>(
          state: state,
          itemBuilder: (_, n) => SizedBox(height: 100, child: Text('Mục $n')),
          onLoadMore: ctrl.loadMore,
          onRefresh: () async {
            await ctrl.refresh();
          },
        ),
      ),
    );
  }
}

Widget _app(FakePagedSource<int> source) => ProviderScope(
      overrides: testOverrides(paged: source, pageSize: 10),
      child: const MaterialApp(home: _Harness()),
    );

void main() {
  testWidgets('hiện trang đầu, cuộn tới cuối thì tự tải trang kế', (tester) async {
    final source = FakePagedSource<int>(List.generate(30, (i) => i + 1));
    await tester.pumpWidget(_app(source));
    await tester.pumpAndSettle();

    expect(find.text('Mục 1'), findsOneWidget);
    expect(source.requestedPages, [1]);

    await tester.drag(find.byType(ListView), const Offset(0, -3000));
    await tester.pumpAndSettle();

    expect(source.requestedPages, contains(2));
    expect(find.text('Mục 11'), findsOneWidget);
  });

  testWidgets('tải trang kế lỗi: hiện lỗi kèm Thử lại, bấm là tải lại', (tester) async {
    final source = FakePagedSource<int>(List.generate(30, (i) => i + 1));
    await tester.pumpWidget(_app(source));
    await tester.pumpAndSettle();
    source.failures[2] = networkError;

    await tester.drag(find.byType(ListView), const Offset(0, -3000));
    await tester.pumpAndSettle();

    expect(find.textContaining('Không kết nối được máy chủ'), findsOneWidget);
    expect(find.text('Thử lại'), findsOneWidget);
    expect(source.requestedPages.where((p) => p == 2).length, 1, reason: 'lỗi rồi thì không tự gọi lặp');

    source.failures.clear();
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();

    expect(find.text('Mục 11'), findsOneWidget);
    expect(find.text('Thử lại'), findsNothing);
  });

  testWidgets('kéo xuống để làm mới gọi lại trang 1', (tester) async {
    final source = FakePagedSource<int>(List.generate(30, (i) => i + 1));
    await tester.pumpWidget(_app(source));
    await tester.pumpAndSettle();

    await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();

    expect(source.requestedPages, [1, 1]);
  });

  testWidgets('danh sách rỗng hiện thông điệp rỗng', (tester) async {
    await tester.pumpWidget(_app(FakePagedSource<int>([])));
    await tester.pumpAndSettle();

    expect(find.text('Chưa có dữ liệu.'), findsOneWidget);
  });

  testWidgets('lần tải đầu lỗi: màn hình lỗi có Thử lại, bấm là tải lại', (tester) async {
    final source = FakePagedSource<int>([1, 2, 3])..failures[1] = timeoutError;
    await tester.pumpWidget(_app(source));
    await tester.pumpAndSettle();

    expect(find.text('Thử lại'), findsOneWidget);
    expect(find.byIcon(Icons.cloud_off), findsOneWidget, reason: 'lỗi kết nối dùng biểu tượng mất mạng');

    source.failures.clear();
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();

    expect(find.text('Mục 1'), findsOneWidget);
  });
}
