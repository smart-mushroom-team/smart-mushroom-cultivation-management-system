import 'package:flutter/material.dart';

import '../pagination/paged_state.dart';
import 'empty_view.dart';

/// Danh sách phân trang dùng chung: kéo để làm mới, tự tải trang kế khi cuộn gần cuối,
/// vòng xoay ở cuối khi đang tải, và dòng lỗi kèm "Thử lại" nếu tải trang kế thất bại.
///
/// Màn hình tải lần đầu / lỗi lần đầu do [AsyncValueView] lo; widget này chỉ nhận [PagedState] đã có.
class PagedListView<T> extends StatelessWidget {
  const PagedListView({
    super.key,
    required this.state,
    required this.itemBuilder,
    required this.onLoadMore,
    required this.onRefresh,
    this.empty,
    this.padding = const EdgeInsets.all(16),
    this.separator = const SizedBox(height: 12),
  });

  final PagedState<T> state;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final VoidCallback onLoadMore;
  final Future<void> Function() onRefresh;

  /// Hiện khi không có mục nào. Mặc định là dòng chữ chung.
  final Widget? empty;
  final EdgeInsetsGeometry padding;
  final Widget separator;

  @override
  Widget build(BuildContext context) {
    if (state.items.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: empty ?? const EmptyView(icon: Icons.inbox_outlined, message: 'Chưa có dữ liệu.'),
      );
    }
    final hasFooter = state.hasMore || state.loadMoreError != null;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: padding,
        itemCount: state.items.length + (hasFooter ? 1 : 0),
        separatorBuilder: (_, __) => separator,
        itemBuilder: (context, index) {
          if (index < state.items.length) return itemBuilder(context, state.items[index]);
          return _Footer(state: state, onLoadMore: onLoadMore);
        },
      ),
    );
  }
}

/// Chân danh sách. ListView chỉ dựng nó khi người dùng cuộn gần tới (hoặc khi danh sách ngắn hơn màn hình),
/// nên dựng ra là tải trang kế, trừ khi đang tải hoặc vừa lỗi (chờ người dùng bấm thử lại).
class _Footer extends StatelessWidget {
  const _Footer({required this.state, required this.onLoadMore});

  final PagedState<dynamic> state;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final error = state.loadMoreError;
    if (error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            Text(error.userMessage, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            TextButton.icon(onPressed: onLoadMore, icon: const Icon(Icons.refresh), label: const Text('Thử lại')),
          ],
        ),
      );
    }
    if (!state.isLoadingMore) {
      WidgetsBinding.instance.addPostFrameCallback((_) => onLoadMore());
    }
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))),
    );
  }
}
