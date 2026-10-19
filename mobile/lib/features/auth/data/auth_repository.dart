import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/token_storage.dart';
import 'app_user.dart';

/// Gọi Identity Service qua Gateway (`/api/identity/...`), hợp đồng ở docs/openapi/identity.yaml.
class AuthRepository {
  AuthRepository(this._api, this._storage);

  final ApiClient _api;
  final TokenStorage _storage;

  static const _base = AppConfig.identityPrefix;

  /// POST /auth/login. Lưu cặp token rồi trả về người dùng.
  Future<AppUser> login({required String email, required String password}) async {
    final data = await _api.post(
      '$_base/auth/login',
      // Server cũng chuẩn hóa email (cắt khoảng trắng, chữ thường); làm sẵn ở đây cho đồng nhất.
      data: {'email': email.trim().toLowerCase(), 'password': password},
      auth: false,
    ) as Map<String, dynamic>;
    await _storage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// POST /auth/register (luôn tạo CUSTOMER, FR-03). Không tự đăng nhập: gọi [login] sau đó.
  /// Server dùng strictObject nên chỉ gửi đúng các trường hợp lệ; trường tùy chọn để trống thì bỏ qua.
  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? address,
  }) async {
    final p = phone?.trim() ?? '';
    final a = address?.trim() ?? '';
    await _api.post(
      '$_base/auth/register',
      data: {
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
        if (p.isNotEmpty) 'phone': p,
        if (a.isNotEmpty) 'address': a,
      },
      auth: false,
    );
  }

  /// Khôi phục phiên khi mở app: có refresh token thì hỏi GET /me (tự làm mới access token nếu hết hạn).
  /// Trả `null` nếu chưa đăng nhập hoặc phiên đã hết hiệu lực.
  Future<AppUser?> restoreSession() async {
    if (await _storage.readRefreshToken() == null) return null;
    try {
      final data = await _api.get('$_base/me') as Map<String, dynamic>;
      return AppUser.fromJson(data);
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) return null;
      rethrow;
    }
  }

  /// POST /auth/logout để thu hồi refresh token (server luôn trả 204), rồi xóa token trong máy.
  /// Lỗi mạng khi thu hồi không được chặn việc đăng xuất cục bộ.
  Future<void> logout() async {
    final refresh = await _storage.readRefreshToken();
    try {
      if (refresh != null) {
        await _api.post('$_base/auth/logout', data: {'refreshToken': refresh}, auth: false);
      }
    } on ApiException {
      // best-effort
    } finally {
      await _storage.clear();
    }
  }
}
