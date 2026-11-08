import 'package:flutter/material.dart';

import '../theme.dart';

/// Biểu đồ đường đơn giản (không cần thư viện): một chuỗi giá trị theo thời gian, chỗ thiếu số liệu để hở.
class MiniChart extends StatelessWidget {
  const MiniChart(
      {super.key,
      required this.title,
      required this.values,
      required this.unit,
      required this.color,
      this.fractionDigits = 1,
      this.minSpan = 2});

  final String title;
  final List<double?> values;
  final String unit;
  final Color color;
  final int fractionDigits;

  /// Khoảng giá trị tối thiểu của trục dọc: dao động nhỏ hơn mức này vẫn vẽ gần phẳng thay vì bị kéo giãn thành dốc.
  final double minSpan;

  @override
  Widget build(BuildContext context) {
    final real = [
      for (final v in values)
        if (v != null) v
    ];
    if (real.isEmpty) {
      return Text('$title: chưa có số liệu',
          style: const TextStyle(color: AppColors.mute));
    }
    final lo = real.reduce((a, b) => a < b ? a : b);
    final hi = real.reduce((a, b) => a > b ? a : b);
    String f(double v) =>
        v.toStringAsFixed(fractionDigits).replaceAll('.', ',');
    return Semantics(
      label: '$title, thấp nhất ${f(lo)} $unit, cao nhất ${f(hi)} $unit',
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                Text('${f(lo)} – ${f(hi)} $unit',
                    style:
                        const TextStyle(color: AppColors.mute, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 6),
            SizedBox(
                height: 90,
                width: double.infinity,
                child: CustomPaint(
                    painter: _LinePainter(values, lo, hi, color, minSpan))),
          ],
        ),
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter(this.values, this.lo, this.hi, this.color, this.minSpan);

  final List<double?> values;
  final double lo;
  final double hi;
  final Color color;
  final double minSpan;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = AppColors.line
      ..strokeWidth = 1;
    canvas.drawLine(
        Offset(0, size.height), Offset(size.width, size.height), grid);
    canvas.drawLine(Offset.zero, Offset(size.width, 0), grid);
    final rawSpan = hi - lo;
    final span = rawSpan < minSpan ? minSpan : rawSpan;
    final base = rawSpan < minSpan
        ? lo - (minSpan - rawSpan) / 2
        : lo; // đặt đoạn dữ liệu ở giữa trục
    final n = values.length;
    final line = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.round;
    var path = Path();
    var open = false;
    for (var i = 0; i < n; i++) {
      final v = values[i];
      if (v == null) {
        if (open) canvas.drawPath(path, line);
        path = Path();
        open = false;
        continue;
      }
      final x = n == 1 ? size.width / 2 : size.width * i / (n - 1);
      final y = size.height - 6 - (size.height - 12) * (v - base) / span;
      if (open) {
        path.lineTo(x, y);
      } else {
        path.moveTo(x, y);
        open = true;
        if ((i == n - 1 || values[i + 1] == null)) {
          canvas.drawCircle(
              Offset(x, y), 2.5, Paint()..color = color); // điểm lẻ
        }
      }
    }
    if (open) canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(_LinePainter old) =>
      old.values != values ||
      old.lo != lo ||
      old.hi != hi ||
      old.color != color ||
      old.minSpan != minSpan;
}
