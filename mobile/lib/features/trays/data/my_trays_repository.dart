import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import 'my_tray.dart';

/// Nguồn dữ liệu "Khay của tôi". Là interface để có thể thay bằng bản giả khi API chưa xong (và trong test).
abstract class MyTraysRepository {
  Future<List<MyTray>> listMyTrays();
}

/// GET /api/core/my-trays: khay thuộc các đơn `ACTIVE` của khách (chỉ CUSTOMER, FR-17).
class ApiMyTraysRepository implements MyTraysRepository {
  ApiMyTraysRepository(this._api);

  final ApiClient _api;

  @override
  Future<List<MyTray>> listMyTrays() async {
    final data = await _api.get('${AppConfig.corePrefix}/my-trays') as Map<String, dynamic>;
    return [for (final e in data['items'] as List) MyTray.fromJson(e as Map<String, dynamic>)];
  }
}
