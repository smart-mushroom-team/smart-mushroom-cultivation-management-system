import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_mobile/core/format.dart';

void main() {
  test('formatVnd chấm phân cách hàng nghìn', () {
    expect(formatVnd(0), '0 đ');
    expect(formatVnd(999), '999 đ');
    expect(formatVnd(75000), '75.000 đ');
    expect(formatVnd(1500000), '1.500.000 đ');
    expect(formatVnd(1234567.6), '1.234.568 đ');
    expect(formatVnd(-2500), '-2.500 đ');
  });

  test('formatDate đổi ISO sang dd/MM/yyyy, giữ nguyên nếu không đúng dạng',
      () {
    expect(formatDate('2026-11-05'), '05/11/2026');
    expect(formatDate('2026-11-05T23:30:00Z'), '05/11/2026');
    expect(formatDate('hôm qua'), 'hôm qua');
  });
}
