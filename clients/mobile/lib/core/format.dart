/// Định dạng hiển thị kiểu Việt Nam, không cần thêm thư viện.
library;

/// 1500000 -> "1.500.000 đ"
String formatVnd(num value) {
  final digits = value.round().abs().toString();
  final out = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('.');
    out.write(digits[i]);
  }
  return '$out đ';
}

/// "2026-11-05" hoặc "2026-11-05T03:00:00Z" -> "05/11/2026". Tách chuỗi, không qua DateTime để khỏi lệch múi giờ.
String formatDate(String iso) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(iso);
  return m == null ? iso : '${m[3]}/${m[2]}/${m[1]}';
}
