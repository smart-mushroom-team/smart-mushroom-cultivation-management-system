import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/application/refreshable_async_notifier.dart';
import '../../../core/config/app_config.dart';
import '../../../core/providers.dart';
import '../data/fake_package_repository.dart';
import '../data/package_repository.dart';
import '../data/rental_package.dart';

final packageRepositoryProvider = Provider<PackageRepository>(
  (ref) => AppConfig.useFake('packages')
      ? FakePackageRepository()
      : ApiPackageRepository(ref.watch(apiClientProvider)),
);

final packagesControllerProvider =
    AsyncNotifierProvider<PackagesController, PackageCatalog>(PackagesController.new);

/// Danh sách gói thuê + số khay còn trống (#187).
class PackagesController extends RefreshableAsyncNotifier<PackageCatalog> {
  @override
  Future<PackageCatalog> load() => ref.read(packageRepositoryProvider).listPackages();
}
