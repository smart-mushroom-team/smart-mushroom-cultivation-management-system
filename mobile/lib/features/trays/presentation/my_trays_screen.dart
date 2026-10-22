import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/formatters.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/empty_view.dart';
import '../application/my_trays_controller.dart';
import '../data/cycle_summary.dart';
import '../data/my_tray.dart';

/// Tab "Khay của tôi" (#189, FR-17, UC-04).
class MyTraysScreen extends ConsumerWidget {
  const MyTraysScreen({super.key});

  Future<void> _refresh(BuildContext context, WidgetRef ref) async {
    final message = await ref.read(myTraysControllerProvider.notifier).refresh();
    if (message != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trays = ref.watch(myTraysControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Khay của tôi')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/trays/packages'),
        icon: const Icon(Icons.add),
        label: const Text('Thuê khay'),
      ),
      body: AsyncValueView<List<MyTray>>(
        value: trays,
        loadingMessage: 'Đang tải khay của bạn…',
        onRetry: () => ref.invalidate(myTraysControllerProvider),
        data: (items) => RefreshIndicator(
          onRefresh: () => _refresh(context, ref),
          child: items.isEmpty
              ? EmptyView(
                  icon: Icons.grid_view,
                  message: 'Bạn chưa có khay nào đang nuôi.\nĐơn thuê sẽ hiện ở đây sau khi được xác nhận.',
                  actionLabel: 'Xem các gói thuê',
                  onAction: () => context.go('/trays/packages'),
                )
              : ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  // Chừa chỗ cho nút nổi để không che thẻ cuối.
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => TrayCard(tray: items[i]),
                ),
        ),
      ),
    );
  }
}

class TrayCard extends StatelessWidget {
  const TrayCard({super.key, required this.tray});

  final MyTray tray;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cycle = tray.currentCycle;
    final where = [
      if (tray.roomName != null) tray.roomName!,
      if (tray.location != null) tray.location!.label,
    ].join(' · ');
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(tray.trayCode, style: theme.textTheme.titleMedium)),
                if (tray.daysRemaining != null) _RemainingChip(days: tray.daysRemaining!),
              ],
            ),
            if (where.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(where, style: theme.textTheme.bodySmall),
            ],
            const Divider(height: 24),
            if (cycle == null)
              Text('Chưa có đợt nuôi đang chạy', style: theme.textTheme.bodyMedium)
            else ...[
              Text(cycle.variety ?? 'Đợt nuôi hiện tại', style: theme.textTheme.bodyLarge),
              const SizedBox(height: 8),
              _StageBar(stage: cycle.stage),
              if (cycle.expectedHarvestDate != null) ...[
                const SizedBox(height: 8),
                Text('Dự kiến thu hoạch: ${Formatters.date(cycle.expectedHarvestDate)}',
                    style: theme.textTheme.bodySmall),
              ],
            ],
            if (tray.rentalEndDate != null) ...[
              const SizedBox(height: 8),
              Text('Thuê đến: ${Formatters.date(tray.rentalEndDate)}', style: theme.textTheme.bodySmall),
            ],
          ],
        ),
      ),
    );
  }
}

class _RemainingChip extends StatelessWidget {
  const _RemainingChip({required this.days});
  final int days;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Sắp hết hạn (≤ 7 ngày) thì đổi màu để khách để ý.
    final soon = days <= 7;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: soon ? scheme.errorContainer : scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        days <= 0 ? 'Hết hạn' : 'Còn $days ngày',
        style: TextStyle(color: soon ? scheme.onErrorContainer : scheme.onSecondaryContainer, fontSize: 12),
      ),
    );
  }
}

/// Thanh 4 giai đoạn SEEDING → INCUBATING → FRUITING → READY (BR-06).
class _StageBar extends StatelessWidget {
  const _StageBar({required this.stage});
  final CycleStage stage;

  static const _steps = [CycleStage.seeding, CycleStage.incubating, CycleStage.fruiting, CycleStage.ready];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = _steps.indexOf(stage);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var i = 0; i < _steps.length; i++) ...[
              if (i > 0) const SizedBox(width: 4),
              Expanded(
                child: Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: i <= current ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 6),
        Text(stage.label, style: theme.textTheme.labelLarge),
      ],
    );
  }
}
