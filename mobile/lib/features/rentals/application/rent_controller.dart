import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../packages/application/packages_controller.dart';
import '../data/fake_rental_repository.dart';
import '../data/rental.dart';
import '../data/rental_repository.dart';

final rentalRepositoryProvider = Provider<RentalRepository>(
  (ref) => AppConfig.useFake('rentals')
      ? FakeRentalRepository()
      : ApiRentalRepository(ref.watch(apiClientProvider)),
);

class RentState {
  const RentState({this.submitting = false, this.rental, this.error});

  final bool submitting;

  /// Đơn vừa tạo (trạng thái `PAID`, chờ Operator xác nhận). Khác `null` nghĩa là đã đặt xong.
  final Rental? rental;
  final ApiException? error;

  /// Hết thời gian chờ: không biết server đã tạo đơn chưa. Khuyên người dùng đừng bấm đặt lại ngay.
  bool get outcomeUncertain => error != null && RentController.uncertainCodes.contains(error!.code);
}

final rentControllerProvider =
    NotifierProvider.autoDispose<RentController, RentState>(RentController.new);

/// Đặt thuê khay (#188). Trạng thái bỏ đi khi rời màn hình, nên mỗi lần vào là một phiên đặt mới.
class RentController extends AutoDisposeNotifier<RentState> {
  static const uncertainCodes = {'TIMEOUT', 'GATEWAY_TIMEOUT'};

  @override
  RentState build() => const RentState();

  Future<void> submit({required String packageId, required int trayCount}) async {
    // Chặn bấm đúp: đang gửi hoặc đã đặt xong thì bỏ qua (tránh tạo trùng đơn).
    if (state.submitting || state.rental != null) return;
    final keepAlive = ref.keepAlive(); // rời màn hình giữa chừng vẫn cập nhật được state an toàn
    state = const RentState(submitting: true);
    try {
      final rental = await ref
          .read(rentalRepositoryProvider)
          .createRental(packageId: packageId, trayCount: trayCount);
      state = RentState(rental: rental);
      ref.invalidate(packagesControllerProvider); // số khay trống đã đổi
    } on ApiException catch (e) {
      state = RentState(error: e);
      // Có người khác đặt trước: tải lại để số khay trống hiển thị đúng.
      if (e.code == 'INSUFFICIENT_TRAYS') ref.invalidate(packagesControllerProvider);
    } finally {
      keepAlive.close();
    }
  }

  /// Xóa thông báo lỗi khi người dùng đổi số khay.
  void clearError() {
    if (state.error != null && !state.submitting) state = const RentState();
  }
}
