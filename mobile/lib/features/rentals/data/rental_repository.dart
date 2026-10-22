import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import 'rental.dart';

/// Nguồn dữ liệu đơn thuê. Là interface để thay bằng bản giả khi API chưa xong (và trong test).
abstract class RentalRepository {
  /// Ném `ApiException`: 404 gói không còn, 402 `PAYMENT_FAILED`, 409 `INSUFFICIENT_TRAYS`, 422 dữ liệu sai.
  Future<Rental> createRental({required String packageId, required int trayCount});
}

/// POST /api/core/rentals (FR-12, UC-02): đặt thuê và thanh toán mô phỏng trong một lần gọi, trả đơn `PAID`.
///
/// ApiClient KHÔNG tự thử lại POST khi 504/timeout (không biết server đã tạo đơn chưa), nên không tạo đơn trùng ngầm.
class ApiRentalRepository implements RentalRepository {
  ApiRentalRepository(this._api);

  final ApiClient _api;

  @override
  Future<Rental> createRental({required String packageId, required int trayCount}) async {
    final data = await _api.post(
      '${AppConfig.corePrefix}/rentals',
      data: {'packageId': packageId, 'trayCount': trayCount},
    ) as Map<String, dynamic>;
    return Rental.fromJson(data);
  }
}
