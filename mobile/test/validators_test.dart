import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_customer/core/utils/validators.dart';

void main() {
  group('email', () {
    test('hợp lệ (có khoảng trắng hai đầu vẫn được, server sẽ cắt)', () {
      expect(Validators.email('an@example.com'), isNull);
      expect(Validators.email('  an@example.com  '), isNull);
    });
    test('không hợp lệ', () {
      expect(Validators.email(''), isNotNull);
      expect(Validators.email(null), isNotNull);
      expect(Validators.email('an@'), isNotNull);
      expect(Validators.email('an example@x.com'), isNotNull);
      expect(Validators.email('${'a' * 250}@x.com'), isNotNull);
    });
  });

  group('newPassword', () {
    test('tối thiểu 8 ký tự', () {
      expect(Validators.newPassword('1234567'), isNotNull);
      expect(Validators.newPassword('12345678'), isNull);
    });
    test('tối đa 72 BYTE, không phải 72 ký tự', () {
      expect(Validators.newPassword('a' * 72), isNull);
      expect(Validators.newPassword('a' * 73), isNotNull);
      // "ế" chiếm 3 byte trong UTF-8: 24 ký tự = 72 byte (được), 25 ký tự = 75 byte (bị chặn).
      expect(Validators.newPassword('ế' * 24), isNull);
      expect(Validators.newPassword('ế' * 25), isNotNull);
    });
  });

  test('loginPassword chỉ yêu cầu không trống', () {
    expect(Validators.loginPassword(''), isNotNull);
    expect(Validators.loginPassword('x'), isNull);
  });

  test('confirmPassword', () {
    expect(Validators.confirmPassword('', 'abc12345'), isNotNull);
    expect(Validators.confirmPassword('khac', 'abc12345'), isNotNull);
    expect(Validators.confirmPassword('abc12345', 'abc12345'), isNull);
  });

  test('name', () {
    expect(Validators.name('   '), isNotNull);
    expect(Validators.name('Nguyễn Văn An'), isNull);
    expect(Validators.name('a' * 101), isNotNull);
  });

  test('phone và address là tùy chọn', () {
    expect(Validators.optionalPhone(''), isNull);
    expect(Validators.optionalPhone('0901234567'), isNull);
    expect(Validators.optionalPhone('+84 901 234 567'), isNull);
    expect(Validators.optionalPhone('abc'), isNotNull);
    expect(Validators.optionalAddress(''), isNull);
    expect(Validators.optionalAddress('a' * 256), isNotNull);
  });
}
