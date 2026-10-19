import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/error_box.dart';
import '../application/auth_controller.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();

  bool _obscure = true;
  bool _loading = false;
  String? _formError;

  /// Lỗi do server trả về theo từng trường (422 / 409), khóa là tên trường: name, email, password, phone, address.
  Map<String, String> _serverErrors = {};

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  /// Gộp kiểm tra phía app với lỗi từ server; sửa trường thì xóa lỗi server của trường đó.
  String? Function(String?) _validator(String field, String? Function(String?) local) =>
      (v) => _serverErrors[field] ?? local(v);

  void _clearServerError(String field) {
    if (_serverErrors.containsKey(field)) {
      setState(() => _serverErrors = Map.of(_serverErrors)..remove(field));
    }
  }

  Future<void> _submit() async {
    setState(() {
      _formError = null;
      _serverErrors = {};
    });
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(authControllerProvider.notifier).register(
            name: _name.text,
            email: _email.text,
            password: _password.text,
            phone: _phone.text,
            address: _address.text,
          );
      // Thành công: router tự chuyển vào app khi trạng thái đăng nhập đổi.
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == 'REGISTERED_LOGIN_FAILED') {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        context.go('/login');
        return;
      }
      setState(() {
        if (e.statusCode == 409) {
          _serverErrors = {'email': 'Email này đã được đăng ký'};
        } else if (e.fieldErrors.isNotEmpty) {
          _serverErrors = {for (final f in e.fieldErrors) f.path: f.message};
        } else {
          _formError = e.userMessage;
        }
      });
      _formKey.currentState?.validate(); // hiện lỗi server ngay dưới từng ô
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đăng ký'),
        leading: BackButton(onPressed: () => context.go('/login')),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_formError != null) ...[
                      ErrorBox(message: _formError!),
                      const SizedBox(height: 16),
                    ],
                    TextFormField(
                      controller: _name,
                      textInputAction: TextInputAction.next,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      decoration: const InputDecoration(labelText: 'Họ tên', prefixIcon: Icon(Icons.person_outline)),
                      onChanged: (_) => _clearServerError('name'),
                      validator: _validator('name', Validators.name),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
                      onChanged: (_) => _clearServerError('email'),
                      validator: _validator('email', Validators.email),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu (tối thiểu 8 ký tự)',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                          icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      onChanged: (_) => _clearServerError('password'),
                      validator: _validator('password', Validators.newPassword),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirm,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu', prefixIcon: Icon(Icons.lock_reset)),
                      validator: (v) => Validators.confirmPassword(v, _password.text),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(labelText: 'Số điện thoại (không bắt buộc)', prefixIcon: Icon(Icons.phone_outlined)),
                      onChanged: (_) => _clearServerError('phone'),
                      validator: _validator('phone', Validators.optionalPhone),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _address,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.fullStreetAddress],
                      decoration: const InputDecoration(labelText: 'Địa chỉ nhận hàng (không bắt buộc)', prefixIcon: Icon(Icons.home_outlined)),
                      onChanged: (_) => _clearServerError('address'),
                      onFieldSubmitted: (_) => _loading ? null : _submit(),
                      validator: _validator('address', Validators.optionalAddress),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                          : const Text('Tạo tài khoản'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _loading ? null : () => context.go('/login'),
                      child: const Text('Đã có tài khoản? Đăng nhập'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
