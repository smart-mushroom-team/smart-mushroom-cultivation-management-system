import 'package:flutter_test/flutter_test.dart';
import 'package:mushroom_mobile/trays/condition.dart';
import 'package:mushroom_mobile/trays/tray_models.dart';

const range = VarietyRange(
    growthDays: 40, tempMin: 18, tempMax: 26, humMin: 85, humMax: 95);
final now = DateTime.utc(2026, 11, 7, 10, 0, 0);

LatestReading latest(
        {double? t = 22,
        double? h = 90,
        bool online = true,
        Duration age = const Duration(minutes: 2)}) =>
    LatestReading(
        reading: Reading(
            temperature: t,
            humidity: h,
            recordedAt: now.subtract(age).toIso8601String()),
        deviceOnline: online);

void main() {
  test('nhiệt độ: trong khoảng, lệch nhẹ, lệch nhiều', () {
    expect(assessTemperature(22, range).level, Level.ok);
    expect(assessTemperature(18, range).level, Level.ok);
    expect(assessTemperature(26, range).level, Level.ok);
    expect(assessTemperature(27.5, range).label, 'Hơi nóng');
    expect(assessTemperature(28, range).level, Level.warn);
    expect(assessTemperature(28.1, range).label, 'Quá nóng');
    expect(assessTemperature(16.5, range).label, 'Hơi lạnh');
    expect(assessTemperature(10, range).label, 'Quá lạnh');
  });

  test('độ ẩm: trong khoảng, lệch nhẹ, lệch nhiều', () {
    expect(assessHumidity(90, range).level, Level.ok);
    expect(assessHumidity(81, range).label, 'Hơi khô');
    expect(assessHumidity(70, range).label, 'Quá khô');
    expect(assessHumidity(99, range).label, 'Hơi ẩm');
    expect(assessHumidity(100, range).label, 'Quá ẩm');
  });

  test('không có khoảng của giống hoặc chưa tải xong thì không đánh giá', () {
    expect(assess(latest(), null, now), isNull);
    expect(assess(null, range, now), isNull);
  });

  test(
      'số đo cũ, cảm biến mất kết nối, phòng chưa có số đo: chưa đánh giá và nói rõ lý do',
      () {
    final old = assess(latest(age: const Duration(hours: 2)), range, now)!;
    expect(old.available, isFalse);
    expect(old.summary, contains('số đo đã cũ'));
    expect(assess(latest(online: false), range, now)!.summary,
        contains('mất kết nối'));
    expect(
        assess(const LatestReading(reading: null, deviceOnline: true), range,
                now)!
            .summary,
        contains('chưa có số đo'));
  });

  test('tóm tắt lấy mức xấu nhất của hai chỉ số', () {
    expect(assess(latest(), range, now)!.summary, 'Phù hợp');
    final warn = assess(latest(t: 27), range, now)!;
    expect(warn.level, Level.warn);
    expect(warn.summary, 'Lệch nhẹ · Hơi nóng');
    final bad = assess(latest(t: 30, h: 70), range, now)!;
    expect(bad.level, Level.danger);
    expect(bad.summary, 'Bất thường · Quá nóng, Quá khô');
  });

  test('VarietyRange.fromJson và chữ hiển thị', () {
    final r = VarietyRange.fromJson({
      'growth_days': 40,
      'temp_min': 18.0,
      'temp_max': 26.5,
      'hum_min': 85.0,
      'hum_max': 95.0
    })!;
    expect(r.tempText, '18–26,5 °C');
    expect(r.humText, 'ẩm 85–95 %');
    expect(VarietyRange.fromJson(null), isNull);
  });
}
