import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_customer/core/network/api_client.dart';
import 'package:mushroom_customer/core/network/api_exception.dart';
import 'package:mushroom_customer/core/storage/token_storage.dart';

class MemoryTokenStorage implements TokenStorage {
  String? access;
  String? refresh;
  @override
  Future<String?> readAccessToken() async => access;
  @override
  Future<String?> readRefreshToken() async => refresh;
  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    access = accessToken;
    refresh = refreshToken;
  }

  @override
  Future<void> clear() async {
    access = null;
    refresh = null;
  }
}

/// Adapter giả: mỗi request được `handler` trả lời, đồng thời ghi lại để kiểm tra.
class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter(this.handler);
  final Future<ResponseBody> Function(RequestOptions options, int index) handler;
  final List<RequestOptions> calls = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls.add(options);
    return handler(options, calls.length - 1);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonResponse(int status, Object body) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

Map<String, dynamic> errorBody(String code, String message) => {
      'error': {'code': code, 'message': message, 'requestId': 'r-1'},
    };

const instant = [Duration.zero, Duration.zero, Duration.zero];

ApiClient makeClient(ScriptedAdapter adapter, MemoryTokenStorage storage, {void Function()? onExpired}) =>
    ApiClient(
      storage: storage,
      baseUrl: 'http://test',
      adapter: adapter,
      retryDelays: instant,
      onSessionExpired: onExpired,
    );

void main() {
  group('tự thử lại khi service khởi động nguội (NFR-14)', () {
    test('GET gặp 503 hai lần rồi thành công', () async {
      final adapter = ScriptedAdapter((o, i) async => i < 2
          ? jsonResponse(503, errorBody('SERVICE_UNAVAILABLE', 'đang khởi động'))
          : jsonResponse(200, {'ok': true}));
      final client = makeClient(adapter, MemoryTokenStorage());

      final data = await client.get('/api/core/my-trays');

      expect(data, {'ok': true});
      expect(adapter.calls.length, 3);
      expect(client.reconnecting.value, isFalse, reason: 'xong thì tắt trạng thái "đang kết nối"');
    });

    test('hết số lần thử thì ném ApiException có mã SERVICE_UNAVAILABLE', () async {
      final adapter = ScriptedAdapter(
          (o, i) async => jsonResponse(503, errorBody('SERVICE_UNAVAILABLE', 'chưa sẵn sàng')));
      final client = makeClient(adapter, MemoryTokenStorage());

      await expectLater(
        client.get('/api/core/my-trays'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'SERVICE_UNAVAILABLE')),
      );
      expect(adapter.calls.length, 4, reason: '1 lần gốc + 3 lần thử lại');
    });

    test('POST gặp 504 KHÔNG thử lại (không biết server đã xử lý chưa, tránh tạo trùng)', () async {
      final adapter = ScriptedAdapter(
          (o, i) async => jsonResponse(504, errorBody('GATEWAY_TIMEOUT', 'quá thời gian')));
      final client = makeClient(adapter, MemoryTokenStorage());

      await expectLater(
        client.post('/api/core/rentals', data: {'x': 1}),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'GATEWAY_TIMEOUT')),
      );
      expect(adapter.calls.length, 1);
    });

    test('POST gặp 503 vẫn thử lại (yêu cầu chưa tới service)', () async {
      final adapter = ScriptedAdapter((o, i) async => i == 0
          ? jsonResponse(503, errorBody('SERVICE_UNAVAILABLE', 'đang khởi động'))
          : jsonResponse(201, {'id': 'abc'}));
      final client = makeClient(adapter, MemoryTokenStorage());

      final data = await client.post('/api/identity/auth/register', data: {'x': 1}, auth: false);

      expect(data, {'id': 'abc'});
      expect(adapter.calls.length, 2);
    });

    test('lỗi nghiệp vụ (409) không thử lại và giữ nguyên mã lỗi', () async {
      final adapter = ScriptedAdapter(
          (o, i) async => jsonResponse(409, errorBody('INSUFFICIENT_TRAYS', 'Không đủ khay trống')));
      final client = makeClient(adapter, MemoryTokenStorage());

      await expectLater(
        client.post('/api/core/rentals', data: {}),
        throwsA(isA<ApiException>()
            .having((e) => e.code, 'code', 'INSUFFICIENT_TRAYS')
            .having((e) => e.statusCode, 'status', 409)),
      );
      expect(adapter.calls.length, 1);
    });
  });

  group('làm mới token', () {
    test('token hết hạn: refresh một lần, lưu cặp mới, gọi lại thành công', () async {
      final storage = MemoryTokenStorage()
        ..access = 'old'
        ..refresh = 'r1';
      final adapter = ScriptedAdapter((o, i) async {
        if (o.path == '/api/identity/auth/refresh') {
          return jsonResponse(200, {'accessToken': 'new', 'refreshToken': 'r2', 'expiresIn': 3600});
        }
        return o.headers['Authorization'] == 'Bearer new'
            ? jsonResponse(200, {'items': []})
            : jsonResponse(401, errorBody('TOKEN_EXPIRED', 'Token đã hết hạn'));
      });
      final client = makeClient(adapter, storage);

      final data = await client.get('/api/core/my-trays');

      expect(data, {'items': []});
      expect(storage.access, 'new');
      expect(storage.refresh, 'r2');
    });

    test('nhiều request cùng hết hạn chỉ gửi MỘT yêu cầu refresh (single-flight)', () async {
      final storage = MemoryTokenStorage()
        ..access = 'old'
        ..refresh = 'r1';
      final adapter = ScriptedAdapter((o, i) async {
        if (o.path == '/api/identity/auth/refresh') {
          await Future<void>.delayed(const Duration(milliseconds: 30)); // để các request kia kịp cùng chờ
          return jsonResponse(200, {'accessToken': 'new', 'refreshToken': 'r2', 'expiresIn': 3600});
        }
        return o.headers['Authorization'] == 'Bearer new'
            ? jsonResponse(200, {'path': o.path})
            : jsonResponse(401, errorBody('TOKEN_EXPIRED', 'Token đã hết hạn'));
      });
      final client = makeClient(adapter, storage);

      final results = await Future.wait([
        client.get('/api/core/my-trays'),
        client.get('/api/core/notifications'),
        client.get('/api/core/notifications/unread-count'),
      ]);

      expect(results.length, 3);
      final refreshCalls =
          adapter.calls.where((c) => c.path == '/api/identity/auth/refresh').length;
      expect(refreshCalls, 1);
    });

    test('refresh bị từ chối (401): xóa token, báo hết phiên đúng một lần, ném lỗi 401', () async {
      final storage = MemoryTokenStorage()
        ..access = 'old'
        ..refresh = 'r1';
      var expired = 0;
      final adapter = ScriptedAdapter((o, i) async {
        if (o.path == '/api/identity/auth/refresh') {
          return jsonResponse(401, errorBody('UNAUTHORIZED', 'Refresh token không hợp lệ'));
        }
        return jsonResponse(401, errorBody('TOKEN_EXPIRED', 'Token đã hết hạn'));
      });
      final client = makeClient(adapter, storage, onExpired: () => expired++);

      await expectLater(
        client.get('/api/core/my-trays'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
      );
      expect(storage.access, isNull);
      expect(storage.refresh, isNull);
      expect(expired, 1);
    });

    test('đăng nhập sai (401 ở endpoint công khai) KHÔNG kích hoạt refresh', () async {
      final storage = MemoryTokenStorage()..refresh = 'r1';
      final adapter = ScriptedAdapter(
          (o, i) async => jsonResponse(401, errorBody('UNAUTHORIZED', 'Sai thông tin đăng nhập')));
      final client = makeClient(adapter, storage);

      await expectLater(
        client.post('/api/identity/auth/login', data: {'email': 'a@b.c', 'password': 'x'}, auth: false),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'UNAUTHORIZED')),
      );
      expect(adapter.calls.length, 1);
      expect(storage.refresh, 'r1', reason: 'không được xóa phiên chỉ vì gõ sai mật khẩu');
    });
  });

  test('ApiException đọc được lỗi theo trường của 422', () async {
    final adapter = ScriptedAdapter((o, i) async => jsonResponse(422, {
          'error': {
            'code': 'VALIDATION_ERROR',
            'message': 'Dữ liệu không hợp lệ',
            'details': [
              {'path': 'email', 'message': 'Email không hợp lệ'},
              {'path': 'password', 'message': 'Mật khẩu tối thiểu 8 ký tự'},
            ],
          },
        }));
    final client = makeClient(adapter, MemoryTokenStorage());

    try {
      await client.post('/api/identity/auth/register', data: {}, auth: false);
      fail('phải ném ApiException');
    } on ApiException catch (e) {
      expect(e.fieldErrors.map((f) => f.path), ['email', 'password']);
      expect(e.fieldErrors.first.message, 'Email không hợp lệ');
    }
  });
}
