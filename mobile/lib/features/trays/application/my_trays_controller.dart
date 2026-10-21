import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/application/refreshable_async_notifier.dart';
import '../../../core/config/app_config.dart';
import '../../../core/providers.dart';
import '../data/fake_my_trays_repository.dart';
import '../data/my_tray.dart';
import '../data/my_trays_repository.dart';

final myTraysRepositoryProvider = Provider<MyTraysRepository>(
  (ref) => AppConfig.useFake('trays')
      ? FakeMyTraysRepository()
      : ApiMyTraysRepository(ref.watch(apiClientProvider)),
);

final myTraysControllerProvider =
    AsyncNotifierProvider<MyTraysController, List<MyTray>>(MyTraysController.new);

/// Danh sách khay đang thuê của khách. Tải khi mở tab, kéo để làm mới, tải lại khi đổi tài khoản.
class MyTraysController extends RefreshableAsyncNotifier<List<MyTray>> {
  @override
  Future<List<MyTray>> load() => ref.read(myTraysRepositoryProvider).listMyTrays();
}
