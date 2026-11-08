import 'package:flutter/material.dart';

import 'app.dart';
import 'auth/auth_controller.dart';
import 'auth/session.dart';
import 'core/api_client.dart';
import 'core/config.dart';
import 'push/firebase_push.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // ApiClient cần biết token hiện tại và phản ứng khi bị 401, còn AuthController cần ApiClient: nối vòng qua biến `late`.
  late final AuthController auth;
  final api = ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    getToken: () => auth.session?.token,
    onUnauthorized: () => auth.expire(),
  );
  auth = AuthController(api: api, store: SecureSessionStore());
  final push = await FirebasePushService
      .create(); // không có Firebase thì trả bản không push, app vẫn chạy
  runApp(MushroomApp(auth: auth, push: push));
}
