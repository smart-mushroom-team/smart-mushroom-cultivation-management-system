import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mushroom_mobile/auth/auth_controller.dart';
import 'package:mushroom_mobile/auth/session.dart';
import 'package:mushroom_mobile/core/api_client.dart';
import 'package:mushroom_mobile/push/push_service.dart';

/// JWT giả (không có chữ ký thật; app chỉ đọc `exp` và `sub`).
String makeJwt(
    {String sub = 'u1',
    String role = 'CUSTOMER',
    String name = 'Tên Thử',
    DateTime? exp}) {
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  final expiry = exp ?? DateTime.now().add(const Duration(hours: 8));
  return '${b64({'alg': 'HS256', 'typ': 'JWT'})}.${b64({
        'sub': sub,
        'role': role,
        'name': name,
        'exp': expiry.millisecondsSinceEpoch ~/ 1000
      })}.sig';
}

/// Phản hồi JSON mã hóa UTF-8 như FastAPI (header không ghi charset), để bắt lỗi hỏng tiếng Việt.
http.Response jsonResponse(Object body, [int status = 200]) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status,
        headers: {'content-type': 'application/json'});

http.Response errorResponse(int status, String code, String message) =>
    jsonResponse({
      'error': {'code': code, 'message': message}
    }, status);

http.Response loginOk(
        {String role = 'CUSTOMER',
        String name = 'Nguyễn Văn Khách',
        DateTime? exp}) =>
    jsonResponse({
      'accessToken': makeJwt(role: role, name: name, exp: exp),
      'tokenType': 'Bearer',
      'expiresIn': 28800,
      'role': role,
      'name': name
    });

class Harness {
  Harness(Future<http.Response> Function(http.Request) handler,
      {Session? saved})
      : store = MemorySessionStore(saved) {
    mock = MockClient((req) {
      requests.add(req);
      return handler(req);
    });
    api = ApiClient(
      baseUrl: 'http://api.test',
      client: mock,
      getToken: () => auth.session?.token,
      onUnauthorized: () => auth.expire(),
    );
    auth = AuthController(api: api, store: store);
  }

  final MemorySessionStore store;
  final List<http.Request> requests = [];
  late final MockClient mock;
  late final ApiClient api;
  late final AuthController auth;
}

/// Bọc handler của test: màn chính (tab Khay của tôi, số chưa đọc) tự gọi các API này, mặc định trả "không có khay".
Future<http.Response> Function(http.Request) withHomeStubs(
        Future<http.Response> Function(http.Request) inner) =>
    (req) async {
      final path = req.url.path;
      if (path == '/api/core/my-trays' ||
          path == '/api/core/rooms' ||
          path == '/api/core/notifications') {
        return jsonResponse([]);
      }
      return inner(req);
    };

Iterable<http.Request> identityCalls(Harness h) =>
    h.requests.where((r) => r.url.path.startsWith('/api/identity'));

/// Push giả: test chủ động đẩy token mới, thông báo đến khi đang mở, hoặc người dùng bấm thông báo.
class FakePush implements PushService {
  FakePush(
      {this.permission = PushPermission.granted,
      this.token = 'fcm-token-aaaaaaaa',
      this.isAvailable = true,
      this.initial});

  final PushPermission permission;
  String? token;
  final bool isAvailable;
  PushMessage? initial;
  final refresh = StreamController<String>.broadcast();
  final foreground = StreamController<PushMessage>.broadcast();
  final opened = StreamController<PushMessage>.broadcast();

  @override
  bool get available => isAvailable;

  @override
  String? get unavailableReason =>
      isAvailable ? null : 'Chưa cấu hình Firebase';

  @override
  Future<PushPermission> requestPermission() async => permission;

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => refresh.stream;

  @override
  Stream<PushMessage> get onForeground => foreground.stream;

  @override
  Stream<PushMessage> get onOpened => opened.stream;

  @override
  Future<PushMessage?> initialMessage() async => initial;
}
