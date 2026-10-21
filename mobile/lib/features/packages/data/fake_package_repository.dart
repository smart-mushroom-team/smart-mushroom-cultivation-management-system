import 'package_repository.dart';
import 'rental_package.dart';

/// Dữ liệu mẫu khi API chưa xong. Bật bằng `--dart-define=FAKE_REPOS=packages`.
class FakePackageRepository implements PackageRepository {
  /// Cùng con số với `FakeRentalRepository` để hai bản giả khớp nhau.
  static const availableTrays = 5;

  @override
  Future<PackageCatalog> listPackages() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    return const PackageCatalog(
      availableTrayCount: availableTrays,
      items: [
        RentalPackage(id: 'fake-pkg-30', name: 'Gói 30 ngày', durationDays: 30, pricePerTray: 150000, isActive: true),
        RentalPackage(id: 'fake-pkg-60', name: 'Gói 60 ngày', durationDays: 60, pricePerTray: 270000, isActive: true),
        RentalPackage(id: 'fake-pkg-90', name: 'Gói 90 ngày', durationDays: 90, pricePerTray: 380000, isActive: true),
      ],
    );
  }
}
