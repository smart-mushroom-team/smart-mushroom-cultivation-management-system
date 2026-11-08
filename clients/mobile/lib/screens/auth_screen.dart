import 'package:flutter/material.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../theme.dart';
import '../widgets/notice.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _again = TextEditingController();
  bool _register = false;
  bool _busy = false;
  String? _error;
  String? _emailError;
  String? _passwordError;
  String? _nameError;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _again.dispose();
    super.dispose();
  }

  bool _validEmail(String value) =>
      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim());

  Future<void> _submit() async {
    final email = _email.text.trim();
    final password = _password.text;
    final emailError =
        _validEmail(email) ? null : 'Nhập email hợp lệ, ví dụ ten@gmail.com.';
    final passwordError = password.isEmpty
        ? 'Nhập mật khẩu.'
        : password.length < 8
            ? 'Mật khẩu cần ít nhất 8 ký tự.'
            : null;
    final nameError =
        _register && _name.text.trim().isEmpty ? 'Nhập họ tên.' : null;
    if (emailError != null ||
        passwordError != null ||
        nameError != null ||
        (_register && _again.text != password)) {
      setState(() {
        _emailError = emailError;
        _passwordError = passwordError;
        _nameError = nameError;
        _error = _register && _again.text != password
            ? 'Hai mật khẩu chưa giống nhau.'
            : null;
      });
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _emailError = null;
      _passwordError = null;
      _nameError = null;
    });
    try {
      final auth = AuthScope.read(context);
      if (_register) {
        await auth.register(name: _name.text, email: email, password: password);
      } else {
        await auth.login(email, password);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e is AuthException ? e.message : describeError(e);
        _busy = false;
      });
      return;
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final authMessage = AuthScope.of(context).message;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.all(24),
              shrinkWrap: true,
              children: [
                const Icon(Icons.eco_outlined,
                    size: 52, color: AppColors.spore),
                const SizedBox(height: 12),
                Text(_register ? 'Tạo tài khoản khách hàng' : 'Trại nấm',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(
                  _register
                      ? 'Đăng ký để thuê khay và theo dõi nấm của bạn.'
                      : 'Đăng nhập để xem khay nấm của bạn.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.mute),
                ),
                const SizedBox(height: 24),
                if (authMessage != null) ...[
                  Notice(authMessage, tone: NoticeTone.info),
                  const SizedBox(height: 12),
                ],
                if (_register) ...[
                  TextField(
                    key: const Key('register-name'),
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    decoration: InputDecoration(
                        labelText: 'Họ và tên', errorText: _nameError),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  key: Key(_register ? 'register-email' : 'login-email'),
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: InputDecoration(
                      labelText: 'Email', errorText: _emailError),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: Key(_register ? 'register-password' : 'login-password'),
                  controller: _password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(
                      labelText: 'Mật khẩu', errorText: _passwordError),
                  onSubmitted: (_) => _submit(),
                ),
                if (_register) ...[
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('register-again'),
                    controller: _again,
                    obscureText: true,
                    decoration:
                        const InputDecoration(labelText: 'Nhập lại mật khẩu'),
                    onSubmitted: (_) => _submit(),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Notice(_error!, tone: NoticeTone.error),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  key: Key(_register ? 'register-submit' : 'login-submit'),
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48)),
                  child: _busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(_register ? 'Đăng ký' : 'Đăng nhập'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  key: const Key('switch-mode'),
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                            _register = !_register;
                            _error = null;
                            _emailError = null;
                            _passwordError = null;
                            _nameError = null;
                          }),
                  child: Text(_register
                      ? 'Đã có tài khoản? Đăng nhập'
                      : 'Chưa có tài khoản? Đăng ký'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
