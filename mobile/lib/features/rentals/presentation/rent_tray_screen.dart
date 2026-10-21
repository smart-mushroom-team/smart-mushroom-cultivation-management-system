import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/formatters.dart';
import '../../../core/widgets/error_box.dart';
import '../../packages/application/packages_controller.dart';
import '../../packages/data/rental_package.dart';
import '../application/rent_controller.dart';
import '../data/rental.dart';

/// Chọn số khay và thanh toán mô phỏng (#188, FR-12, UC-02).
class RentTrayScreen extends ConsumerStatefulWidget {
  const RentTrayScreen({super.key, required this.package});

  final RentalPackage package;

  /// Tối đa mỗi đơn theo `CreateRentalRequest.trayCount` (core.yaml).
  static const maxPerOrder = 50;

  @override
  ConsumerState<RentTrayScreen> createState() => _RentTrayScreenState();
}

class _RentTrayScreenState extends ConsumerState<RentTrayScreen> {
  int _count = 1;

  @override
  Widget build(BuildContext context) {
    final rent = ref.watch(rentControllerProvider);
    final rental = rent.rental;
    return Scaffold(
      appBar: AppBar(title: const Text('Thuê khay'), automaticallyImplyLeading: rental == null),
      body: SafeArea(
        child: rental != null ? _Success(rental: rental) : _form(context, rent),
      ),
    );
  }

  Widget _form(BuildContext context, RentState rent) {
    final theme = Theme.of(context);
    final pkg = widget.package;
    // Số khay trống mới nhất (tự cập nhật sau khi gặp INSUFFICIENT_TRAYS); chưa biết thì để server quyết định.
    final available = ref.watch(packagesControllerProvider).valueOrNull?.availableTrayCount;
    final max = available == null ? RentTrayScreen.maxPerOrder : math.min(RentTrayScreen.maxPerOrder, available);
    final soldOut = max < 1;
    final count = soldOut ? 1 : math.max(1, math.min(max, _count));
    final total = pkg.pricePerTray * count;
    final busy = rent.submitting;
    final error = rent.error;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(pkg.name, style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text('Thời hạn ${pkg.durationDays} ngày · ${Formatters.vnd(pkg.pricePerTray)} / khay'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text('Số khay', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton.outlined(
              tooltip: 'Giảm',
              onPressed: busy || count <= 1 ? null : () => _setCount(count - 1),
              icon: const Icon(Icons.remove),
            ),
            SizedBox(
              width: 64,
              child: Text('$count', textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
            ),
            IconButton.outlined(
              tooltip: 'Tăng',
              onPressed: busy || soldOut || count >= max ? null : () => _setCount(count + 1),
              icon: const Icon(Icons.add),
            ),
            const SizedBox(width: 12),
            if (available != null) Text('Còn $available khay trống', style: theme.textTheme.bodySmall),
          ],
        ),
        const Divider(height: 32),
        Row(
          children: [
            Expanded(child: Text('Tổng thanh toán', style: theme.textTheme.titleSmall)),
            Text(Formatters.vnd(total),
                style: theme.textTheme.titleLarge?.copyWith(color: theme.colorScheme.primary)),
          ],
        ),
        const SizedBox(height: 4),
        Text('Thanh toán mô phỏng, không trừ tiền thật.', style: theme.textTheme.bodySmall),
        const SizedBox(height: 20),
        if (soldOut) ...[
          const ErrorBox(message: 'Hiện đã hết khay trống. Vui lòng quay lại sau.'),
          const SizedBox(height: 16),
        ],
        if (error != null) ...[
          ErrorBox(
            message: rent.outcomeUncertain
                ? '${error.userMessage}\nĐơn thuê có thể đã được tạo. Vui lòng đợi ít phút và kiểm tra trước khi đặt lại để tránh trùng đơn.'
                : error.userMessage,
          ),
          const SizedBox(height: 16),
        ],
        FilledButton(
          onPressed: busy || soldOut
              ? null
              : () => ref.read(rentControllerProvider.notifier).submit(packageId: pkg.id, trayCount: count),
          child: busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5))
              : Text('Thanh toán ${Formatters.vnd(total)}'),
        ),
      ],
    );
  }

  void _setCount(int value) {
    ref.read(rentControllerProvider.notifier).clearError();
    setState(() => _count = value);
  }
}

class _Success extends StatelessWidget {
  const _Success({required this.rental});

  final Rental rental;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.check_circle, size: 64, color: theme.colorScheme.primary),
              const SizedBox(height: 12),
              Text('Đặt thuê thành công', textAlign: TextAlign.center, style: theme.textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text(
                '${rental.trayCount} khay · ${Formatters.vnd(rental.totalAmount)}\n'
                'Trạng thái: ${rental.status.label}',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Khay sẽ hiện trong "Khay của tôi" sau khi nhân viên xác nhận đơn.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 24),
              FilledButton(onPressed: () => context.go('/trays'), child: const Text('Về Khay của tôi')),
            ],
          ),
        ),
      ),
    );
  }
}
