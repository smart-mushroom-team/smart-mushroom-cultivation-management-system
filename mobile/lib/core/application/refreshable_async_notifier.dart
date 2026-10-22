import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_exception.dart';
import '../providers.dart';

/// Khuôn cho màn hình tải một lần rồi cho kéo để làm mới.
///
/// Lớp con chỉ cài [load] (dùng `ref.read`). Dữ liệu tự tải lại khi đổi tài khoản.
abstract class RefreshableAsyncNotifier<T> extends AsyncNotifier<T> {
  Future<T> load();

  @override
  Future<T> build() {
    ref.watch(currentUserIdProvider);
    return load();
  }

  /// Kéo để làm mới. Lỗi mà đã có dữ liệu thì GIỮ dữ liệu cũ và trả thông điệp để báo người dùng
  /// (không thay cả màn hình bằng lỗi); chưa có dữ liệu thì chuyển sang trạng thái lỗi. Thành công trả `null`.
  Future<String?> refresh() async {
    try {
      state = AsyncData(await load());
      return null;
    } on ApiException catch (e, st) {
      if (state.hasValue) return e.userMessage;
      state = AsyncError(e, st);
      return null;
    }
  }
}
