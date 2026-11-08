import 'package:flutter/material.dart';

import 'auth/auth_controller.dart';
import 'auth/auth_scope.dart';
import 'push/push_registrar.dart';
import 'push/push_service.dart';
import 'screens/auth_screen.dart';
import 'screens/home_shell.dart';
import 'theme.dart';

class MushroomApp extends StatefulWidget {
  const MushroomApp(
      {super.key, required this.auth, this.push = const NoPushService()});

  final AuthController auth;

  /// FCM; mặc định không có push (test, hoặc bản cài chưa cấu hình Firebase).
  final PushService push;

  @override
  State<MushroomApp> createState() => _MushroomAppState();
}

class _MushroomAppState extends State<MushroomApp> with WidgetsBindingObserver {
  late final PushRegistrar _registrar =
      PushRegistrar(api: widget.auth.api, push: widget.push);
  bool _wasSignedIn = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.auth.addListener(_onAuthChanged);
    widget.auth.restore();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.auth.removeListener(_onAuthChanged);
    _registrar.dispose();
    super.dispose();
  }

  /// Đăng nhập (hoặc khôi phục phiên) thì đăng ký token FCM; mất phiên mà không qua đăng xuất chủ động thì chỉ dọn trạng thái.
  void _onAuthChanged() {
    final signedIn = widget.auth.status == AuthStatus.signedIn;
    if (signedIn && !_wasSignedIn) {
      _registrar.start();
    } else if (!signedIn && _wasSignedIn) {
      _registrar.reset();
    }
    _wasSignedIn = signedIn;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Sau thời gian dài ở nền, token có thể đã hết hạn: kiểm ngay khi mở lại thay vì chờ lần gọi API đầu bị 401.
    if (state == AppLifecycleState.resumed) widget.auth.checkExpiry();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      controller: widget.auth,
      child: MaterialApp(
        title: 'Trại nấm',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: _AuthGate(registrar: _registrar, push: widget.push),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate({required this.registrar, required this.push});

  final PushRegistrar registrar;
  final PushService push;

  @override
  Widget build(BuildContext context) {
    switch (AuthScope.of(context).status) {
      case AuthStatus.loading:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case AuthStatus.signedOut:
        return const AuthScreen();
      case AuthStatus.signedIn:
        return HomeShell(registrar: registrar, push: push);
    }
  }
}
