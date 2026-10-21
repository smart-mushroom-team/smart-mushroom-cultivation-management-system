import '../network/api_exception.dart';

/// Một trang kết quả theo quy ước `{ items, page, limit, total }` (common.yaml, `PageMeta`).
class PageResult<T> {
  const PageResult({required this.items, required this.page, required this.limit, required this.total});

  factory PageResult.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) itemFromJson) =>
      PageResult(
        items: [for (final e in json['items'] as List) itemFromJson(e as Map<String, dynamic>)],
        page: json['page'] as int,
        limit: json['limit'] as int,
        total: json['total'] as int,
      );

  final List<T> items;
  final int page;
  final int limit;
  final int total;
}

/// Trạng thái danh sách phân trang sau lần tải đầu. (Lần tải đầu do `AsyncValue` lo: đang tải / lỗi.)
class PagedState<T> {
  const PagedState({
    required this.items,
    required this.nextPage,
    required this.hasMore,
    this.isLoadingMore = false,
    this.loadMoreError,
  });

  factory PagedState.fromFirstPage(PageResult<T> r) => PagedState(
        items: List.unmodifiable(r.items),
        nextPage: r.page + 1,
        hasMore: _hasMore(r, r.items.length),
      );

  final List<T> items;
  final int nextPage;
  final bool hasMore;
  final bool isLoadingMore;

  /// Lỗi khi tải trang kế tiếp; các mục đã có vẫn giữ nguyên, người dùng bấm "Thử lại" ở cuối danh sách.
  final ApiException? loadMoreError;

  PagedState<T> loadingMore() => PagedState(
        items: items,
        nextPage: nextPage,
        hasMore: hasMore,
        isLoadingMore: true,
      );

  PagedState<T> withError(ApiException e) =>
      PagedState(items: items, nextPage: nextPage, hasMore: hasMore, loadMoreError: e);

  PagedState<T> appended(PageResult<T> r) {
    final all = [...items, ...r.items];
    return PagedState(items: List.unmodifiable(all), nextPage: r.page + 1, hasMore: _hasMore(r, all.length));
  }

  // Trang rỗng thì dừng dù `total` nói còn (dữ liệu đổi giữa hai lần gọi), để không lặp vô hạn.
  static bool _hasMore<T>(PageResult<T> r, int loaded) => r.items.isNotEmpty && loaded < r.total;
}
