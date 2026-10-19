import 'package:dio/dio.dart';

/// Một lỗi theo trường trong `error.details` của HTTP 422: `{ path, message }`.
class FieldError {
  const FieldError(this.path, this.message);
  final String path;
  final String message;
}

/// Lỗi thống nhất cho toàn app. Mọi lỗi mạng/HTTP đều được đổi sang kiểu này ở `ApiClient`,
/// UI chỉ cần bắt `ApiException` (không phải `DioException`).
///
/// Server trả lỗi dạng `{ "error": { "code", "message", "details?", "requestId" } }`
/// (docs/CONVENTIONS.md mục 2). Lỗi không đến được server dùng mã `NETWORK_ERROR` / `TIMEOUT`.
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.fieldErrors = const [],
    this.requestId,
  });

  factory ApiException.fromDio(DioException e) {
    final status = e.response?.statusCode;
    final data = e.response?.data;

    if (data is Map && data['error'] is Map) {
      final err = data['error'] as Map;
      return ApiException(
        statusCode: status,
        code: (err['code'] ?? 'UNKNOWN').toString(),
        message: (err['message'] ?? '').toString(),
        requestId: err['requestId']?.toString(),
        fieldErrors: _parseFieldErrors(err['details']),
      );
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(code: 'TIMEOUT', message: 'Hết thời gian chờ máy chủ');
      case DioExceptionType.connectionError:
        return const ApiException(code: 'NETWORK_ERROR', message: 'Không kết nối được máy chủ');
      default:
        break;
    }

    // Phản hồi không đúng định dạng chuẩn (vd trang lỗi HTML từ proxy).
    final code = switch (status) {
      502 => 'BAD_GATEWAY',
      503 => 'SERVICE_UNAVAILABLE',
      504 => 'GATEWAY_TIMEOUT',
      _ => 'UNKNOWN',
    };
    return ApiException(statusCode: status, code: code, message: e.message ?? '');
  }

  final int? statusCode;
  final String code;
  final String message;
  final List<FieldError> fieldErrors;
  final String? requestId;

  /// Lỗi do mạng/máy chủ chưa sẵn sàng (không phải lỗi nghiệp vụ): đáng để người dùng thử lại.
  bool get isConnectivity => const {
        'NETWORK_ERROR',
        'TIMEOUT',
        'BAD_GATEWAY',
        'SERVICE_UNAVAILABLE',
        'GATEWAY_TIMEOUT',
      }.contains(code);

  /// Thông điệp thân thiện để hiện cho người dùng.
  String get userMessage {
    switch (code) {
      case 'NETWORK_ERROR':
        return 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.';
      case 'TIMEOUT':
      case 'GATEWAY_TIMEOUT':
        return 'Máy chủ phản hồi chậm (có thể đang khởi động). Vui lòng thử lại sau ít phút.';
      case 'BAD_GATEWAY':
      case 'SERVICE_UNAVAILABLE':
        return 'Hệ thống đang khởi động hoặc tạm thời không khả dụng. Vui lòng thử lại sau ít phút.';
      case 'TOO_MANY_REQUESTS':
        return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau giây lát.';
    }
    return message.isNotEmpty ? message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  static List<FieldError> _parseFieldErrors(Object? details) {
    if (details is! List) return const [];
    return [
      for (final d in details)
        if (d is Map) FieldError((d['path'] ?? '').toString(), (d['message'] ?? '').toString()),
    ];
  }

  @override
  String toString() => 'ApiException($statusCode $code: $message)';
}
