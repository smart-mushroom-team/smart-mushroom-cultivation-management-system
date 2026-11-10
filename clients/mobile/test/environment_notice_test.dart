import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// Run from clients/mobile (package imports can also be used if package name differs).
import '../lib/trays/condition.dart';
import '../lib/trays/tray_models.dart';

void main() {
  const range = VarietyRange(
    growthDays: 30, tempMin: 22, tempMax: 28, humMin: 80, humMax: 90,
  );
  final now = DateTime.utc(2026, 11, 9, 12);

  Assessment evaluate(double? temp, double? hum,
      {bool online = true, Duration age = const Duration(minutes: 1)}) {
    final reading = Reading(
      temperature: temp,
      humidity: hum,
      recordedAt: now.subtract(age).toIso8601String(),
    );
    return assess(LatestReading(reading: reading, deviceOnline: online),
        range, now)!;
  }

  Future<void> showNotice(WidgetTester tester, Assessment assessment) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: EnvironmentNotice(assessment: assessment)),
    ));
  }

  testWidgets('Trong ngưỡng: không hiển thị cảnh báo', (tester) async {
    await showNotice(tester, evaluate(26, 85));
    expect(find.byKey(const Key('environment-warning')), findsNothing);
    expect(find.byKey(const Key('environment-unavailable')), findsNothing);
  });

  testWidgets('Nhiệt độ cao: hiện lời nhắc hotline', (tester) async {
    await showNotice(tester, evaluate(30, 85));
    expect(find.byKey(const Key('environment-warning')), findsOneWidget);
    expect(find.textContaining('Nhiệt độ hơi nóng'), findsOneWidget);
    expect(find.textContaining('hotline hỗ trợ'), findsOneWidget);
  });

  testWidgets('Cả hai vượt ngưỡng: hiện đủ hai nguyên nhân', (tester) async {
    await showNotice(tester, evaluate(32, 95));
    expect(find.textContaining('Nhiệt độ quá nóng'), findsOneWidget);
    expect(find.textContaining('Độ ẩm quá ẩm'), findsOneWidget);
  });

  testWidgets('Cảm biến offline: không cảnh báo sai', (tester) async {
    await showNotice(tester, evaluate(32, 95, online: false));
    expect(find.byKey(const Key('environment-warning')), findsNothing);
    expect(find.byKey(const Key('environment-unavailable')), findsOneWidget);
  });

  testWidgets('Số đo cũ: không cảnh báo sai', (tester) async {
    await showNotice(tester, evaluate(32, 95, age: const Duration(hours: 1)));
    expect(find.byKey(const Key('environment-warning')), findsNothing);
    expect(find.byKey(const Key('environment-unavailable')), findsOneWidget);
  });

  test('Ngưỡng biên được tính là phù hợp', () {
    expect(evaluate(22, 90).level, Level.ok);
    expect(evaluate(28, 80).level, Level.ok);
  });
}
