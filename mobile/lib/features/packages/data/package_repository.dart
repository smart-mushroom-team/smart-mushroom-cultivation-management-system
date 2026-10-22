import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import 'rental_package.dart';

/// Nguồn dữ liệu gói thuê. Là interface để thay bằng bản giả khi API chưa xong (và trong test).
abstract class PackageRepository {
  Future<PackageCatalog> listPackages();
}

/// GET /api/core/packages. CUSTOMER chỉ nhận các gói đang bật (FR-10, FR-11), nên không cần lọc lại ở app.
class ApiPackageRepository implements PackageRepository {
  ApiPackageRepository(this._api);

  final ApiClient _api;

  @override
  Future<PackageCatalog> listPackages() async {
    final data = await _api.get('${AppConfig.corePrefix}/packages') as Map<String, dynamic>;
    return PackageCatalog.fromJson(data);
  }
}
