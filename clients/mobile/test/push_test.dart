import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_mobile/push/push_registrar.dart';
import 'package:mushroom_mobile/push/push_service.dart';

import 'helpers.dart';

Harness okServer() => Harness((req) async => jsonResponse({'ok': true}));

void main() {
  test('đăng nhập xong: xin quyền, lấy token và gửi lên server', () async {
    final h = okServer();
    final r = PushRegistrar(api: h.api, push: FakePush());
    await r.start();
    expect(r.status, PushStatus.registered);
    final req = h.requests.single;
    expect(req.method, 'POST');
    expect(req.url.path, '/api/core/notifications/device-tokens');
    expect(req.body, '{"token":"fcm-token-aaaaaaaa","platform":"android"}');
  });

  test('gọi start nhiều lần chỉ đăng ký một lần', () async {
    final h = okServer();
    final r = PushRegistrar(api: h.api, push: FakePush());
    await r.start();
    await r.start();
    expect(h.requests, hasLength(1));
  });

  test('người dùng từ chối quyền thông báo: không gửi token', () async {
    final h = okServer();
    final r = PushRegistrar(
        api: h.api, push: FakePush(permission: PushPermission.denied));
    await r.start();
    expect(r.status, PushStatus.denied);
    expect(h.requests, isEmpty);
  });

  test('chưa cấu hình Firebase: trạng thái unavailable, không gọi server',
      () async {
    final h = okServer();
    final r = PushRegistrar(api: h.api, push: const NoPushService());
    await r.start();
    expect(r.status, PushStatus.unavailable);
    expect(h.requests, isEmpty);
  });

  test('token đổi thì đăng ký lại token mới', () async {
    final h = okServer();
    final push = FakePush();
    final r = PushRegistrar(api: h.api, push: push);
    await r.start();
    push.refresh.add('fcm-token-bbbbbbbb');
    await pumpEventQueue();
    expect(h.requests.map((q) => q.body), [
      '{"token":"fcm-token-aaaaaaaa","platform":"android"}',
      '{"token":"fcm-token-bbbbbbbb","platform":"android"}'
    ]);
    expect(r.token, 'fcm-token-bbbbbbbb');
  });

  test(
      'server từ chối hoặc không lấy được token: trạng thái error, không ném lỗi ra ngoài',
      () async {
    final bad =
        Harness((req) async => errorResponse(500, 'INTERNAL', 'Lỗi máy chủ'));
    final r1 = PushRegistrar(api: bad.api, push: FakePush());
    await r1.start();
    expect(r1.status, PushStatus.error);

    final h = okServer();
    final r2 = PushRegistrar(api: h.api, push: FakePush(token: null));
    await r2.start();
    expect(r2.status, PushStatus.error);
    expect(h.requests, isEmpty);
  });

  test('đăng xuất: hủy token trên server (mã hóa URL) rồi về trạng thái off',
      () async {
    final h = okServer();
    final r =
        PushRegistrar(api: h.api, push: FakePush(token: 'abc:APA91b-xyz_123'));
    await r.start();
    await r.stop();
    final del = h.requests.last;
    expect(del.method, 'DELETE');
    expect(del.url.toString(),
        'http://api.test/api/core/notifications/device-tokens/abc%3AAPA91b-xyz_123');
    expect(r.status, PushStatus.off);
    expect(r.token, isNull);
  });

  test('đăng xuất khi mất mạng vẫn xong và về off', () async {
    var fail = false;
    final h = Harness((req) async {
      if (fail) throw Exception('offline');
      return jsonResponse({'ok': true});
    });
    final r = PushRegistrar(api: h.api, push: FakePush());
    await r.start();
    fail = true;
    await r.stop();
    expect(r.status, PushStatus.off);
  });

  test('sau khi hết phiên (reset) rồi đăng nhập lại thì đăng ký lại', () async {
    final h = okServer();
    final r = PushRegistrar(api: h.api, push: FakePush());
    await r.start();
    r.reset();
    expect(r.status, PushStatus.off);
    await r.start();
    expect(r.status, PushStatus.registered);
    expect(h.requests.where((q) => q.method == 'POST'), hasLength(2));
  });
}
