import 'package:flutter/material.dart';

/// Màn hình/khối đang tải dùng chung.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  /// Dòng chú thích dưới vòng xoay (vd báo máy chủ có thể đang khởi động).
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(message!, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
