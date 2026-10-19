import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../data/app_user.dart';
import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider)),
);

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  const AuthState._(this.status, this.user);
  const AuthState.unknown() : this._(AuthStatus.unknown, null);
  const AuthState.unauthenticated() : this._(AuthStatus.unauthenticated, null);
  const AuthState.authenticated(AppUser user) : this._(AuthStatus.authenticated, user);

  final AuthStatus status;
  final AppUser? user;
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  AuthState build() {
    Future.microtask(restoreSession);
    return const AuthState.unknown();
  }

  /// Chạy khi mở app. Lỗi mạng ở đây KHÔNG xóa token (người dùng vẫn đăng nhập lại được, hoặc mở lại app khi có mạng).
  Future<void> restoreSession() async {
    try {
      final user = await _repo.restoreSession();
      state = (user != null && user.isCustomer)
          ? AuthState.authenticated(user)
          : const AuthState.unauthenticated();
    } on ApiException {
      state = const AuthState.unauthenticated();
    }
  }

  /// Ném [ApiException] nếu thất bại để màn hình hiện lỗi.
  Future<void> login({required String email, required String password}) async {
    final user = await _repo.login(email: email, password: password);
    if (!user.isCustomer) {
      // SRS 2.4: mobile dành cho Customer; Admin/Operator dùng web. Thu hồi phiên vừa tạo.
      await _repo.logout();
      throw const ApiException(
        code: 'ROLE_NOT_ALLOWED',
        message: 'Ứng dụng này dành cho khách hàng. Admin/Operator vui lòng dùng trang web quản trị.',
        statusCode: 403,
      );
    }
    state = AuthState.authenticated(user);
  }

  /// Đăng ký rồi đăng nhập luôn. Nếu đăng ký xong mà đăng nhập lỗi, ném mã `REGISTERED_LOGIN_FAILED`
  /// để màn hình chuyển người dùng sang trang đăng nhập.
  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? address,
  }) async {
    await _repo.register(
      name: name,
      email: email,
      password: password,
      phone: phone,
      address: address,
    );
    try {
      await login(email: email, password: password);
    } on ApiException catch (e) {
      throw ApiException(
        code: 'REGISTERED_LOGIN_FAILED',
        message: 'Đăng ký thành công. Vui lòng đăng nhập.',
        statusCode: e.statusCode,
      );
    }
  }

  Future<void> logout() async {
    // TODO(task #149): hủy đăng ký FCM token (DELETE /api/core/device-tokens?token=...) trước khi đăng xuất.
    await _repo.logout();
    state = const AuthState.unauthenticated();
  }

  /// ApiClient gọi khi refresh token bị từ chối (token đã được xóa).
  void sessionExpired() {
    if (state.status != AuthStatus.unauthenticated) {
      state = const AuthState.unauthenticated();
    }
  }
}
