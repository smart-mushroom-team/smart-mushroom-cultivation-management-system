import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';

import 'error_view.dart';
import 'loading_view.dart';

/// Gói `AsyncValue.when` theo một khuôn: đang tải -> [LoadingView], lỗi -> [ErrorView] có "Thử lại",
/// có dữ liệu -> [data]. Đang làm mới (kéo để tải lại) vẫn giữ dữ liệu cũ trên màn hình.
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    super.key,
    required this.value,
    required this.data,
    required this.onRetry,
    this.loadingMessage,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback onRetry;
  final String? loadingMessage;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: data,
      loading: () => LoadingView(message: loadingMessage),
      error: (e, _) => ErrorView.fromError(e, onRetry: onRetry),
    );
  }
}
