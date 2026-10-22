import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network/api_client.dart';
import 'storage/token_storage.dart';
import '../features/auth/application/auth_controller.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => SecureTokenStorage());

/// Khách HTTP dùng chung. Khi refresh token bị từ chối, báo cho AuthController đưa người dùng về màn hình đăng nhập.
/// (Dùng `ref.read` bên trong callback nên không tạo phụ thuộc vòng lúc khởi tạo.)
final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(
    storage: ref.watch(tokenStorageProvider),
    onSessionExpired: () => ref.read(authControllerProvider.notifier).sessionExpired(),
  );
  ref.onDispose(() => client.reconnecting.dispose());
  return client;
});

/// Id người đang đăng nhập. Dữ liệu theo người dùng (khay, đơn thuê...) `watch` provider này
/// để tự tải lại khi đổi tài khoản, không để lộ dữ liệu của người trước.
final currentUserIdProvider = Provider<String?>(
  (ref) => ref.watch(authControllerProvider.select((s) => s.user?.id)),
);
