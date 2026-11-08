import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.isNetwork = false,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final bool isNetwork;

  @override
  String toString() => message;
}

class ApiBytesResponse {
  const ApiBytesResponse({required this.bytes, this.capturedAt});

  final Uint8List bytes;
  final String? capturedAt;
}

class ApiClient {
  ApiClient({
    required String baseUrl,
    http.Client? client,
    String? Function()? getToken,
    void Function()? onUnauthorized,
  })  : _baseUri = Uri.parse(baseUrl),
        _client = client ?? http.Client(),
        _getToken = getToken,
        _onUnauthorized = onUnauthorized;

  final Uri _baseUri;
  final http.Client _client;
  final String? Function()? _getToken;
  final void Function()? _onUnauthorized;

  Future<Object?> get(String path, {Map<String, String>? query}) async {
    final response = await _send('GET', path, query: query);
    return _decodeJson(response);
  }

  Future<Object?> post(String path, {Object? body}) async {
    final response = await _send('POST', path, body: body);
    return _decodeJson(response);
  }

  Future<Object?> put(String path, {Object? body}) async {
    final response = await _send('PUT', path, body: body);
    return _decodeJson(response);
  }

  Future<Object?> delete(String path) async {
    final response = await _send('DELETE', path);
    return _decodeJson(response);
  }

  Future<ApiBytesResponse> getBytes(String path,
      {Map<String, String>? query}) async {
    final response = await _send('GET', path, query: query);
    return ApiBytesResponse(
      bytes: response.bodyBytes,
      capturedAt: response.headers['x-captured-at'],
    );
  }

  Future<http.Response> _send(String method, String path,
      {Object? body, Map<String, String>? query}) async {
    final uri = _baseUri.resolve(path).replace(queryParameters: query);
    final headers = <String, String>{'Accept': 'application/json'};
    final token = _getToken?.call();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (body != null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (response.statusCode == 401) _onUnauthorized?.call();
        throw _responseError(response);
      }
      return response;
    } on ApiException {
      rethrow;
    } on http.ClientException catch (e) {
      throw ApiException(
          message: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
          isNetwork: true,
          code: e.message);
    } on SocketException catch (e) {
      throw ApiException(
          message: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.',
          isNetwork: true,
          code: e.message);
    } on TimeoutException {
      throw const ApiException(
          message: 'Máy chủ phản hồi quá lâu. Hãy thử lại.', isNetwork: true);
    }
  }

  ApiException _responseError(http.Response response) {
    var code = 'HTTP_${response.statusCode}';
    var message = 'Máy chủ trả về lỗi ${response.statusCode}.';
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        final error = decoded['error'];
        if (error is Map<String, dynamic>) {
          code = error['code'] as String? ?? code;
          message = error['message'] as String? ?? message;
        } else {
          code = decoded['code'] as String? ?? code;
          message = decoded['message'] as String? ?? message;
        }
      }
    } on FormatException {
      final body = utf8.decode(response.bodyBytes, allowMalformed: true).trim();
      if (body.isNotEmpty) message = body;
    }
    return ApiException(
        message: message, statusCode: response.statusCode, code: code);
  }

  Object? _decodeJson(http.Response response) {
    if (response.bodyBytes.isEmpty) return null;
    try {
      return jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException catch (e) {
      throw ApiException(
        message: 'Phản hồi từ máy chủ không đúng định dạng.',
        code: e.message,
      );
    }
  }
}

String describeError(Object error) {
  if (error is ApiException) return error.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
