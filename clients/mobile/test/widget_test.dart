import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mushroom_mobile/app.dart';
import 'package:mushroom_mobile/auth/session.dart';

import 'helpers.dart';

Future<Harness> start(
    WidgetTester tester, Future<http.Response> Function(http.Request) handler,
    {Session? saved}) async {
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 2.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final h = Harness(withHomeStubs(handler), saved: saved);
  await tester.pumpWidget(MushroomApp(auth: h.auth));
  await tester.pumpAndSettle();
  return h;
}

Finder loginButton() => find.byKey(const Key('login-submit'));

void main() {
  testWidgets(
      'chưa đăng nhập thì thấy màn đăng nhập; bấm khi để trống báo lỗi và không gọi API',
      (tester) async {
    final h = await start(tester, (_) async => loginOk());
    expect(find.text('Đăng nhập để xem khay nấm của bạn.'), findsOneWidget);
    await tester.tap(loginButton());
    await tester.pumpAndSettle();
    expect(
        find.text('Nhập email hợp lệ, ví dụ ten@gmail.com.'), findsOneWidget);
    expect(find.text('Nhập mật khẩu.'), findsOneWidget);
    expect(h.requests, isEmpty);
  });

  testWidgets(
      'đăng nhập đúng vào màn chính, thấy tên ở tab Tài khoản, đăng xuất có xác nhận rồi về màn đăng nhập',
      (tester) async {
    final h = await start(tester, (_) async => loginOk(name: 'Lê Thị Hoa'));
    await tester.enterText(find.byKey(const Key('login-email')), 'hoa@x.vn');
    await tester.enterText(
        find.byKey(const Key('login-password')), 'matkhau-dai');
    await tester.tap(loginButton());
    await tester.pumpAndSettle();
    expect(identityCalls(h), hasLength(1));
    expect(find.text('Khay của tôi'), findsWidgets);

    await tester.tap(find.text('Tài khoản').last);
    await tester.pumpAndSettle();
    expect(find.text('Lê Thị Hoa'), findsOneWidget);

    await tester.tap(find.byKey(const Key('logout')));
    await tester.pumpAndSettle();
    expect(find.text('Đăng xuất?'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Đăng xuất'));
    await tester.pumpAndSettle();
    expect(find.text('Đăng nhập để xem khay nấm của bạn.'), findsOneWidget);
    expect(h.store.session, isNull);
  });

  testWidgets(
      'sai mật khẩu hiện lời của server ngay trên form và ở lại màn đăng nhập',
      (tester) async {
    await start(
        tester,
        (_) async =>
            errorResponse(401, 'BAD_CREDENTIALS', 'Sai email hoặc mật khẩu'));
    await tester.enterText(find.byKey(const Key('login-email')), 'a@b.vn');
    await tester.enterText(
        find.byKey(const Key('login-password')), 'sai-roi-nhe');
    await tester.tap(loginButton());
    await tester.pumpAndSettle();
    expect(find.text('Sai email hoặc mật khẩu'), findsOneWidget);
    expect(find.byKey(const Key('login-email')), findsOneWidget);
  });

  testWidgets('tài khoản nhân viên được hướng dẫn dùng web', (tester) async {
    await start(tester, (_) async => loginOk(role: 'OPERATOR'));
    await tester.enterText(find.byKey(const Key('login-email')), 'nv@x.vn');
    await tester.enterText(
        find.byKey(const Key('login-password')), 'matkhau-dai');
    await tester.tap(loginButton());
    await tester.pumpAndSettle();
    expect(find.textContaining('trang web quản trị'), findsOneWidget);
  });

  testWidgets('đăng ký: kiểm mật khẩu nhập lại, rồi vào thẳng màn chính',
      (tester) async {
    final h = await start(
        tester,
        (r) async => r.url.path.endsWith('/register')
            ? jsonResponse({'id': 'u9'}, 201)
            : loginOk(name: 'Khách Mới'));
    await tester.tap(find.byKey(const Key('switch-mode')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('register-name')), 'Khách Mới');
    await tester.enterText(find.byKey(const Key('register-email')), 'moi@x.vn');
    await tester.enterText(
        find.byKey(const Key('register-password')), 'matkhau-dai');
    await tester.enterText(
        find.byKey(const Key('register-again')), 'khac-roi-nhe');
    await tester.ensureVisible(find.byKey(const Key('register-submit')));
    await tester.tap(find.byKey(const Key('register-submit')));
    await tester.pumpAndSettle();
    expect(find.text('Hai mật khẩu chưa giống nhau.'), findsOneWidget);
    expect(h.requests, isEmpty);

    await tester.enterText(
        find.byKey(const Key('register-again')), 'matkhau-dai');
    await tester.ensureVisible(find.byKey(const Key('register-submit')));
    await tester.tap(find.byKey(const Key('register-submit')));
    await tester.pumpAndSettle();
    expect(identityCalls(h).map((r) => r.url.path),
        ['/api/identity/auth/register', '/api/identity/auth/login']);
    expect(find.text('Khay của tôi'), findsWidgets);
  });

  testWidgets(
      'mở app với phiên còn hạn thì vào thẳng màn chính, không đăng nhập lại',
      (tester) async {
    final saved = Session(
        token: makeJwt(),
        role: 'CUSTOMER',
        name: 'Khách Cũ',
        expiresAt: DateTime.now().add(const Duration(hours: 1)));
    final h = await start(tester, (_) async => loginOk(), saved: saved);
    expect(find.text('Khay của tôi'), findsWidgets);
    expect(identityCalls(h), isEmpty);
  });

  testWidgets(
      'phiên đã hết hạn lúc mở app: về màn đăng nhập kèm lời giải thích',
      (tester) async {
    final saved = Session(
        token: makeJwt(),
        role: 'CUSTOMER',
        name: 'Khách Cũ',
        expiresAt: DateTime.now().subtract(const Duration(minutes: 1)));
    await start(tester, (_) async => loginOk(), saved: saved);
    expect(find.textContaining('Phiên đăng nhập đã hết hạn'), findsOneWidget);
  });
}
