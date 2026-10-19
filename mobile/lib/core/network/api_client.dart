
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';
import 'token_pair.dart';

/// Kết quả một lần làm mới token.
enum RefreshResult {
  /// Đã lưu cặp token mới.
  ok,

  /// Server từ chối refresh token (hết hạn/đã thu hồi/tài khoản bị khóa): phải đăng nhập lại.
  rejected,

  /// Không làm mới được vì lỗi mạng/máy chủ: giữ nguyên phiên, thử lại sau.
  unavailable,
}

/// Khách HTTP duy nhất của app, luôn gọi qua API Gateway (không gọi thẳng service).
///
/// Việc nó làm (để các màn hình không phải lo):
///  1. Gắn `Authorization: Bearer <access>`.
///  2. Gặp 401: làm mới token MỘT LẦN rồi gọi lại. Nhiều request cùng 401 chỉ gửi **một** yêu cầu refresh
///     (single-flight) vì refresh token chỉ dùng được một lần, gửi song song sẽ bị coi là bị đánh cắp
///     và mất phiên (services/identity/README.md, mục "giới hạn đã biết").
///  3. Tự thử lại khi service khởi động nguội (NFR-14): lỗi kết nối/timeout/502/503/504 -> chờ rồi gọi lại,
///     đồng thời bật cờ [reconnecting] để UI hiện "Đang kết nối".
///  4. Đổi mọi lỗi sang [ApiException].
class ApiClient {
  ApiClient({
    required TokenStorage storage,
    String? baseUrl,
    HttpClientAdapter? adapter,
    List<Duration>? retryDelays,
    this.onSessionExpired,
  })  : _storage = storage,
        _retryDelays = retryDelays ?? AppConfig.coldStartRetryDelays {
    final options = BaseOptions(
      baseUrl: baseUrl ?? AppConfig.gatewayUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      sendTimeout: AppConfig.connectTimeout,
      contentType: Headers.jsonContentType,
      headers: {'Accept': Headers.jsonContentType},
    );
    dio = Dio(options);
    _bareDio = Dio(options.copyWith());
    if (adapter != null) {
      dio.httpClientAdapter = adapter;
      _bareDio.httpClientAdapter = adapter;
    }
    dio.interceptors.addAll([
      _AuthInterceptor(this),
      _ColdStartRetryInterceptor(dio, _retryDelays, reconnecting),
    ]);
    // Dio dùng riêng cho /auth/refresh: không gắn token, không tự refresh (tránh vòng lặp), vẫn thử lại khi nguội.
    _bareDio.interceptors.add(_ColdStartRetryInterceptor(_bareDio, _retryDelays, reconnecting));
  }

  late final Dio dio;
  late final Dio _bareDio;
  final TokenStorage _storage;
  final List<Duration> _retryDelays;

  /// Gọi khi phiên không còn cứu được (refresh bị từ chối). Token đã được xóa trước khi gọi.
  final VoidCallback? onSessionExpired;

  /// `true` trong lúc đang chờ thử lại vì mạng/máy chủ chưa sẵn sàng.
  final ValueNotifier<bool> reconnecting = ValueNotifier<bool>(false);

  Future<RefreshResult>? _refreshing;

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send('GET', path, query: query, auth: auth);

  Future<dynamic> post(String path, {Object? data, bool auth = true}) =>
      _send('POST', path, data: data, auth: auth);

  Future<dynamic> patch(String path, {Object? data, bool auth = true}) =>
      _send('PATCH', path, data: data, auth: auth);

  Future<dynamic> delete(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send('DELETE', path, query: query, auth: auth);

  Future<dynamic> _send(
    String method,
    String path, {
    Object? data,
    Map<String, dynamic>? query,
    bool auth = true,
  }) async {
    try {
      final res = await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: query,
        options: Options(method: method, extra: {'skipAuth': !auth}),
      );
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Làm mới token, single-flight: mọi lời gọi đồng thời dùng chung một kết quả.
  Future<RefreshResult> refreshTokens() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<RefreshResult> _doRefresh() async {
    final refresh = await _storage.readRefreshToken();
    if (refresh == null) return RefreshResult.rejected;
    try {
      final res = await _bareDio.post<dynamic>(
        '${AppConfig.identityPrefix}/auth/refresh',
        data: {'refreshToken': refresh},
      );
      final pair = TokenPair.fromJson(res.data as Map<String, dynamic>);
      await _storage.saveTokens(accessToken: pair.accessToken, refreshToken: pair.refreshToken);
      return RefreshResult.ok;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403 || status == 422) {
        await _storage.clear();
        onSessionExpired?.call();
        return RefreshResult.rejected;
      }
      return RefreshResult.unavailable;
    }
  }
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._client);
  final ApiClient _client;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.extra['skipAuth'] != true) {
      final token = await _client._storage.readAccessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final opts = err.requestOptions;
    final isUnauthorized = err.response?.statusCode == 401;
    if (!isUnauthorized || opts.extra['skipAuth'] == true || opts.extra['authRetried'] == true) {
      return handler.next(err);
    }

    final result = await _client.refreshTokens();
    if (result != RefreshResult.ok) return handler.next(err);

    opts.extra['authRetried'] = true; // chỉ thử lại một lần
    try {
      // fetch chạy lại cả chuỗi interceptor nên onRequest sẽ đọc access token mới.
      handler.resolve(await _client.dio.fetch<dynamic>(opts));
    } on DioException catch (e) {
      handler.reject(e);
    }
  }
}

/// Thử lại khi service chưa sẵn sàng (Render tắt máy sau 15 phút không có request, NFR-14).
///
/// Chỉ thử lại thứ chắc chắn chưa được xử lý, để không tạo trùng (đặt thuê, đăng ký...):
///  - Mọi phương thức: lỗi kết nối, hết thời gian kết nối, 502, 503 (yêu cầu chưa tới service).
///  - Chỉ GET/HEAD/PUT/DELETE: hết thời gian chờ phản hồi và 504 (không biết server đã xử lý chưa).
class _ColdStartRetryInterceptor extends Interceptor {
  _ColdStartRetryInterceptor(this._dio, this._delays, this._reconnecting);

  final Dio _dio;
  final List<Duration> _delays;
  final ValueNotifier<bool> _reconnecting;
  int _waiting = 0;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final extra = err.requestOptions.extra;
    final attempt = (extra['retryAttempt'] as int?) ?? 0;
    if (attempt >= _delays.length || !_shouldRetry(err)) return handler.next(err);

    extra['retryAttempt'] = attempt + 1;
    _waiting++;
    _reconnecting.value = true;
    try {
      await Future<void>.delayed(_delays[attempt]);
    } finally {
      _waiting--;
      if (_waiting == 0) _reconnecting.value = false;
    }

    try {
      handler.resolve(await _dio.fetch<dynamic>(err.requestOptions));
    } on DioException catch (e) {
      handler.reject(e); // lỗi cuối cùng: không chạy lại các interceptor lỗi phía sau
    }
  }

  bool _shouldRetry(DioException e) {
    final method = e.requestOptions.method.toUpperCase();
    final idempotent = const {'GET', 'HEAD', 'PUT', 'DELETE'}.contains(method);
    switch (e.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
        return true;
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return idempotent;
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode;
        if (status == 502 || status == 503) return true;
        if (status == 504) return idempotent;
        return false;
      default:
        return false;
    }
  }
}
