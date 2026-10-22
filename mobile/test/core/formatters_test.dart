import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_customer/core/utils/formatters.dart';

void main() {
  group('Formatters.vnd', () {
    test('ngăn cách hàng nghìn bằng dấu chấm', () {
      expect(Formatters.vnd(0), '0 ₫');
      expect(Formatters.vnd(999), '999 ₫');
      expect(Formatters.vnd(1000), '1.000 ₫');
      expect(Formatters.vnd(150000), '150.000 ₫');
      expect(Formatters.vnd(1234567), '1.234.567 ₫');
    });
  });

  group('ngày', () {
    test('parseDate đọc YYYY-MM-DD, sai hoặc thiếu thì null', () {
      expect(parseDate('2026-10-20'), DateTime(2026, 10, 20));
      expect(parseDate(null), isNull);
      expect(parseDate('không phải ngày'), isNull);
      expect(parseDate(42), isNull);
    });

    test('Formatters.date ra dd/MM/yyyy', () {
      expect(Formatters.date(DateTime(2026, 1, 5)), '05/01/2026');
      expect(Formatters.date(null), '');
    });
  });
}
