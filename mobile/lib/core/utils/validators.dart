import 'dart:convert';

/// Kiểm tra đầu vào phía app, **khớp quy tắc của Identity** (services/identity/src/validators/common.validator.js)
/// để bắt lỗi sớm; server vẫn là nơi quyết định cuối cùng (lỗi 422 được hiện lại theo từng trường).
/// Mỗi hàm trả `null` nếu hợp lệ, ngược lại trả thông báo lỗi.
class Validators {
  const Validators._();

  static final RegExp _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _phone = RegExp(r'^\+?[0-9][0-9\s\-().]{5,19}$');

  static String? email(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Vui lòng nhập email';
    if (v.length > 254) return 'Email quá dài';
    if (!_email.hasMatch(v)) return 'Email không hợp lệ';
    return null;
  }

  /// Dùng cho đăng ký: tối thiểu 8 ký tự, tối đa 72 **byte** (bcrypt chỉ dùng 72 byte đầu;
  /// ký tự tiếng Việt chiếm 2-3 byte).
  static String? newPassword(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'Vui lòng nhập mật khẩu';
    if (v.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
    if (utf8.encode(v).length > 72) return 'Mật khẩu tối đa 72 byte (ký tự có dấu tính nhiều byte)';
    return null;
  }

  /// Đăng nhập không áp chính sách độ dài (server cũng vậy), chỉ yêu cầu không trống.
  static String? loginPassword(String? value) {
    if ((value ?? '').isEmpty) return 'Vui lòng nhập mật khẩu';
    return null;
  }

  static String? confirmPassword(String? value, String original) {
    if ((value ?? '').isEmpty) return 'Vui lòng nhập lại mật khẩu';
    if (value != original) return 'Mật khẩu nhập lại không khớp';
    return null;
  }

  static String? name(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Họ tên không được để trống';
    if (v.length > 100) return 'Họ tên tối đa 100 ký tự';
    return null;
  }

  /// Tùy chọn: để trống là hợp lệ.
  static String? optionalPhone(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return null;
    if (!_phone.hasMatch(v)) return 'Số điện thoại không hợp lệ';
    return null;
  }

  /// Tùy chọn: để trống là hợp lệ.
  static String? optionalAddress(String? value) {
    final v = (value ?? '').trim();
    if (v.length > 255) return 'Địa chỉ tối đa 255 ký tự';
    return null;
  }
}
