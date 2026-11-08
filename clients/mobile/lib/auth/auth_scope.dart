import 'package:flutter/widgets.dart';

import 'auth_controller.dart';

class AuthScope extends InheritedNotifier<AuthController> {
  const AuthScope(
      {super.key, required AuthController controller, required super.child})
      : super(notifier: controller);

  AuthController get controller => notifier!;

  static AuthController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope is missing from the widget tree');
    return scope!.controller;
  }

  static AuthController read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope is missing from the widget tree');
    return scope!.controller;
  }
}
