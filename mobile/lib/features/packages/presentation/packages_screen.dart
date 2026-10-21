import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/formatters.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/empty_view.dart';
import '../application/packages_controller.dart';
import '../data/rental_package.dart';

/// Danh sách gói thuê (#187, FR-11). Chọn một gói để sang màn hình thuê khay (#188).
class PackagesScreen extends ConsumerWidget {
  const PackagesScreen({super.key});

  Future<void> _refresh(BuildContext context, WidgetRef ref) async {
    final message = await ref.read(packagesControllerProvider.notifier).refresh();
    if (message != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(packagesControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Gói thuê khay')),
      body: AsyncValueView<PackageCatalog>(
        value: catalog,
        loadingMessage: 'Đang tải các gói thuê…',
        onRetry: () => ref.invalidate(packagesControllerProvider),
        data: (data) => RefreshIndicator(
          onRefresh: () => _refresh(context, ref),
          child: data.items.isEmpty
              ? const EmptyView(icon: Icons.inventory_2_outlined, message: 'Hiện chưa có gói thuê nào.')
              : ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    _AvailabilityBanner(count: data.availableTrayCount),
                    const SizedBox(height: 12),
                    for (final p in data.items) ...[
                      PackageCard(
                        package: p,
                        enabled: data.availableTrayCount > 0,
                        onRent: () => context.go('/trays/packages/rent', extra: p),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}

class _AvailabilityBanner extends StatelessWidget {
  const _AvailabilityBanner({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final none = count == 0;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: none ? scheme.errorContainer : scheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(none ? Icons.block : Icons.check_circle_outline,
              color: none ? scheme.onErrorContainer : scheme.onPrimaryContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              none ? 'Hiện đã hết khay trống.' : 'Còn $count khay trống.',
              style: TextStyle(color: none ? scheme.onErrorContainer : scheme.onPrimaryContainer),
            ),
          ),
        ],
      ),
    );
  }
}

class PackageCard extends StatelessWidget {
  const PackageCard({super.key, required this.package, required this.enabled, required this.onRent});

  final RentalPackage package;

  /// `false` khi hết khay trống.
  final bool enabled;
  final VoidCallback onRent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(package.name, style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text('Thời hạn ${package.durationDays} ngày', style: theme.textTheme.bodyMedium),
            const SizedBox(height: 8),
            Text('${Formatters.vnd(package.pricePerTray)} / khay',
                style: theme.textTheme.titleLarge?.copyWith(color: theme.colorScheme.primary)),
            const SizedBox(height: 12),
            FilledButton(onPressed: enabled ? onRent : null, child: const Text('Thuê khay')),
          ],
        ),
      ),
    );
  }
}
