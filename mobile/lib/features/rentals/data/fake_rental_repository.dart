import '../../../core/network/api_exception.dart';
import '../../packages/data/fake_package_repository.dart';
import 'rental.dart';
import 'rental_repository.dart';

/// Đặt thuê giả khi API chưa xong. Bật bằng `--dart-define=FAKE_REPOS=rentals`.
/// Đặt quá số khay trống giả thì trả 409 `INSUFFICIENT_TRAYS` như server thật.
class FakeRentalRepository implements RentalRepository {
  @override
  Future<Rental> createRental({required String packageId, required int trayCount}) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (trayCount > FakePackageRepository.availableTrays) {
      throw const ApiException(
        statusCode: 409,
        code: 'INSUFFICIENT_TRAYS',
        message: 'Không đủ khay trống.',
      );
    }
    final days = packageId.endsWith('90') ? 90 : (packageId.endsWith('60') ? 60 : 30);
    const price = {30: 150000, 60: 270000, 90: 380000};
    return Rental(
      id: 'fake-rental-${DateTime.now().millisecondsSinceEpoch}',
      packageName: 'Gói $days ngày',
      durationDays: days,
      pricePerTray: price[days]!,
      trayCount: trayCount,
      totalAmount: price[days]! * trayCount,
      status: RentalStatus.paid,
      createdAt: DateTime.now(),
    );
  }
}
