import 'package:flutter/material.dart';

import '../network/api_exception.dart';

/// Thông điệp hiện cho người dùng từ một lỗi bất kỳ.
String errorMessageOf(Object error) =>
    error is ApiException ? error.userMessage : 'Đã xảy ra lỗi. Vui lòng thử lại.';

/// Màn hình/khối báo lỗi kèm nút "Thử lại" (khác [ErrorBox] là khung lỗi nhỏ trong form).
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    required this.onRetry,
    this.icon = Icons.error_outline,
  });

  /// Dùng khi có sẵn lỗi: chọn thông điệp và biểu tượng (mất mạng/máy chủ chưa sẵn sàng) cho phù hợp.
  ErrorView.fromError(Object error, {super.key, required this.onRetry})
      : message = errorMessageOf(error),
        icon = error is ApiException && error.isConnectivity ? Icons.cloud_off : Icons.error_outline;

  final String message;
  final VoidCallback onRetry;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 20),
            FilledButton.tonalIcon(
              style: FilledButton.styleFrom(minimumSize: const Size(160, 44)),
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
