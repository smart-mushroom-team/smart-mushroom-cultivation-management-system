import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_exception.dart';
import '../providers.dart';
import 'paged_state.dart';

/// Khuôn cho danh sách phân trang. Lớp con chỉ cài [fetchPage] (dùng `ref.read`):
///
/// ```dart
/// class RentalsController extends PagedController<Rental> {
///   @override
///   Future<PageResult<Rental>> fetchPage(int page, int limit) =>
///       ref.read(rentalRepositoryProvider).list(page: page, limit: limit);
/// }
/// final rentalsProvider = AsyncNotifierProvider<RentalsController, PagedState<Rental>>(RentalsController.new);
/// ```
///
/// Hiển thị bằng `PagedListView`. Tự tải lại khi đổi tài khoản.
abstract class PagedController<T> extends AsyncNotifier<PagedState<T>> {
  /// Số mục mỗi trang (tối đa 100, common.yaml).
  int get pageSize => 20;

  Future<PageResult<T>> fetchPage(int page, int limit);

  // Tăng khi làm mới/dựng lại để bỏ kết quả của lần tải trang cũ về muộn.
  int _generation = 0;

  @override
  Future<PagedState<T>> build() async {
    ref.watch(currentUserIdProvider);
    _generation++;
    return PagedState.fromFirstPage(await fetchPage(1, pageSize));
  }

  /// Tải trang kế tiếp (gọi nhiều lần liên tiếp vẫn chỉ tải một lần). Gọi lại sau lỗi = thử lại.
  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) return;
    final gen = _generation;
    state = AsyncData(current.loadingMore());
    try {
      final result = await fetchPage(current.nextPage, pageSize);
      if (gen != _generation) return;
      state = AsyncData(current.appended(result));
    } on ApiException catch (e) {
      if (gen != _generation) return;
      state = AsyncData(current.withError(e));
    }
  }

  /// Kéo để làm mới. Lỗi mà đã có dữ liệu thì giữ dữ liệu cũ và trả thông điệp để báo người dùng.
  Future<String?> refresh() async {
    final gen = ++_generation;
    try {
      final result = await fetchPage(1, pageSize);
      if (gen != _generation) return null;
      state = AsyncData(PagedState.fromFirstPage(result));
      return null;
    } on ApiException catch (e, st) {
      if (gen != _generation) return null;
      if (state.hasValue) return e.userMessage;
      state = AsyncError(e, st);
      return null;
    }
  }
}
