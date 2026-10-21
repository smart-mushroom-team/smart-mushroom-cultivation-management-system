/// Định dạng hiển thị (không dùng package intl để khỏi thêm phụ thuộc).
class Formatters {
  const Formatters._();

  /// 150000 -> `150.000 ₫` (VND là số nguyên, core.yaml).
  static String vnd(int amount) {
    final digits = amount.abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
      buf.write(digits[i]);
    }
    return '${amount < 0 ? '-' : ''}$buf ₫';
  }

  /// `2026-10-20` (hoặc chuỗi ISO) -> `20/10/2026`. Không đọc được thì trả lại nguyên văn.
  static String date(DateTime? d) {
    if (d == null) return '';
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}

/// Đọc ngày `YYYY-MM-DD` từ JSON; thiếu hoặc sai định dạng thì `null`.
DateTime? parseDate(Object? value) => value is String ? DateTime.tryParse(value) : null;
