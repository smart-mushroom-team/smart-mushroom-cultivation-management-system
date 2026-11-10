import 'package:flutter/material.dart';

import '../theme.dart';
import 'tray_models.dart';

/// Mức đánh giá một số đo so với khoảng phù hợp của giống.
enum Level { ok, warn, danger }

/// Lệch tối đa còn coi là "hơi" lệch; quá mức này là bất thường.
const double tempTolerance = 2; // °C
const double humTolerance = 5; // %

/// Số đo cũ hơn mức này thì không đánh giá (đánh giá theo số liệu cũ dễ gây hiểu nhầm).
const Duration staleAfter = Duration(minutes: 30);

class Condition {
  const Condition(this.level, this.label);

  final Level level;
  final String label;
}

Condition assessTemperature(double v, VarietyRange r) {
  if (v < r.tempMin) {
    return v >= r.tempMin - tempTolerance
        ? const Condition(Level.warn, 'Hơi lạnh')
        : const Condition(Level.danger, 'Quá lạnh');
  }
  if (v > r.tempMax) {
    return v <= r.tempMax + tempTolerance
        ? const Condition(Level.warn, 'Hơi nóng')
        : const Condition(Level.danger, 'Quá nóng');
  }
  return const Condition(Level.ok, 'Trong mức phù hợp');
}

Condition assessHumidity(double v, VarietyRange r) {
  if (v < r.humMin) {
    return v >= r.humMin - humTolerance
        ? const Condition(Level.warn, 'Hơi khô')
        : const Condition(Level.danger, 'Quá khô');
  }
  if (v > r.humMax) {
    return v < r.humMax + humTolerance
        ? const Condition(Level.warn, 'Hơi ẩm')
        : const Condition(Level.danger, 'Quá ẩm');
  }
  return const Condition(Level.ok, 'Trong mức phù hợp');
}

/// Kết quả đánh giá một khay: từng chỉ số, hoặc lý do chưa đánh giá được ([unavailable]).
class Assessment {
  const Assessment({this.temp, this.hum, this.unavailable});

  final Condition? temp;
  final Condition? hum;
  final String? unavailable;

  bool get available => unavailable == null && (temp != null || hum != null);

  Level get level {
    final levels = [if (temp != null) temp!.level, if (hum != null) hum!.level];
    if (levels.contains(Level.danger)) return Level.danger;
    if (levels.contains(Level.warn)) return Level.warn;
    return Level.ok;
  }

  /// Dòng tóm tắt cho thẻ khay: "Phù hợp", "Lệch nhẹ · Hơi nóng", "Bất thường · Quá nóng, Quá khô".
  String get summary {
    if (!available) return 'Chưa đánh giá: ${unavailable ?? 'chưa có số đo'}';
    final problems = [
      if (temp != null && temp!.level != Level.ok) temp!.label,
      if (hum != null && hum!.level != Level.ok) hum!.label,
    ];
    return switch (level) {
      Level.ok => 'Phù hợp',
      Level.warn => 'Lệch nhẹ · ${problems.join(', ')}',
      Level.danger => 'Bất thường · ${problems.join(', ')}',
    };
  }
}

/// Đánh giá số đo mới nhất của phòng theo khoảng phù hợp của giống.
/// Trả null khi chưa có khoảng (không có giống, giống chờ duyệt, giống tự nhập chưa vào danh mục) hoặc chưa tải xong số đo.
Assessment? assess(LatestReading? latest, VarietyRange? range, DateTime now) {
  if (range == null || latest == null) return null;
  final r = latest.reading;
  if (r == null) return const Assessment(unavailable: 'phòng chưa có số đo');
  if (!latest.deviceOnline) {
    return const Assessment(unavailable: 'cảm biến mất kết nối');
  }
  final at = DateTime.tryParse(r.recordedAt);
  if (at == null || now.difference(at) > staleAfter) {
    return Assessment(unavailable: 'số đo đã cũ (${ago(r.recordedAt, now)})');
  }
  return Assessment(
    temp:
        r.temperature == null ? null : assessTemperature(r.temperature!, range),
    hum: r.humidity == null ? null : assessHumidity(r.humidity!, range),
  );
}

(Color bg, Color fg, IconData icon) levelStyle(Level l) => switch (l) {
      Level.ok => (
          AppColors.mossSoft,
          AppColors.moss,
          Icons.check_circle_outline
        ),
      Level.warn => (
          AppColors.amberSoft,
          AppColors.amber,
          Icons.warning_amber_rounded
        ),
      Level.danger => (
          AppColors.brickSoft,
          AppColors.brick,
          Icons.error_outline
        ),
    };

/// Nhãn nhỏ cho thẻ khay: biểu tượng + chữ + màu (không chỉ dựa vào màu).
class AssessmentChip extends StatelessWidget {
  const AssessmentChip({super.key, required this.assessment});

  final Assessment assessment;

  @override
  Widget build(BuildContext context) {
    final a = assessment;
    final (bg, fg, icon) = a.available
        ? levelStyle(a.level)
        : (AppColors.bone, AppColors.mute, Icons.info_outline);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: fg),
        const SizedBox(width: 6),
        Flexible(
            child: Text(a.summary,
                style: TextStyle(
                    color: fg, fontSize: 13, fontWeight: FontWeight.w600))),
      ]),
    );
  }
}

/// Thông báo tại chỗ cho khách thuê, không gửi push và không tạo luồng hỗ trợ.
/// Chỉ cảnh báo khi có số đo mới, thiết bị online và thông số vượt ngưỡng.
class EnvironmentNotice extends StatelessWidget {
  const EnvironmentNotice({super.key, required this.assessment});

  final Assessment assessment;

  @override
  Widget build(BuildContext context) {
    if (!assessment.available) {
      return _notice(
        keyName: 'environment-unavailable',
        icon: Icons.info_outline,
        foreground: AppColors.mute,
        background: AppColors.bone,
        title: 'Chưa thể đánh giá môi trường',
        message: assessment.unavailable ?? 'Chưa có dữ liệu cảm biến đáng tin cậy.',
      );
    }

    final problems = <String>[
      if (assessment.temp != null && assessment.temp!.level != Level.ok)
        'Nhiệt độ ${assessment.temp!.label.toLowerCase()}',
      if (assessment.hum != null && assessment.hum!.level != Level.ok)
        'Độ ẩm ${assessment.hum!.label.toLowerCase()}',
    ];
    if (problems.isEmpty) {
      // Không thêm banner khi hai thông số đều bình thường;
      // ConditionTiles đã hiển thị trạng thái phù hợp.
      return const SizedBox.shrink();
    }
    final severe = assessment.level == Level.danger;
    return _notice(
      keyName: 'environment-warning',
      icon: severe ? Icons.error_outline : Icons.warning_amber_rounded,
      foreground: severe ? AppColors.brick : AppColors.amber,
      background: severe ? AppColors.brickSoft : AppColors.amberSoft,
      title: 'Điều kiện môi trường chưa phù hợp',
      message: '${problems.join('; ')} so với ngưỡng của giống nấm. '
          'Vui lòng liên hệ hotline hỗ trợ nếu tình trạng kéo dài.',
    );
  }

  Widget _notice({
    required String keyName,
    required IconData icon,
    required Color foreground,
    required Color background,
    required String title,
    required String message,
  }) => Container(
        key: Key(keyName),
        width: double.infinity,
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: foreground),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  style: TextStyle(
                      color: foreground, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(message, style: TextStyle(color: foreground, fontSize: 13)),
            ]),
          ),
        ]),
      );
}

/// Hai ô "Nhiệt độ" và "Độ ẩm" ở chi tiết khay: giá trị, nhãn đánh giá và khoảng phù hợp.
class ConditionTiles extends StatelessWidget {
  const ConditionTiles(
      {super.key,
      required this.assessment,
      required this.reading,
      required this.range});

  final Assessment assessment;
  final Reading? reading;
  final VarietyRange range;

  @override
  Widget build(BuildContext context) {
    if (!assessment.available) {
      return Padding(
          padding: const EdgeInsets.only(top: 8),
          child: AssessmentChip(assessment: assessment));
    }
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(children: [
        if (assessment.temp != null)
          _Tile(
              keyName: 'cond-temp',
              title: 'Nhiệt độ',
              value: formatTemp(reading?.temperature),
              cond: assessment.temp!,
              ideal: range.tempText),
        if (assessment.temp != null && assessment.hum != null)
          const SizedBox(height: 8),
        if (assessment.hum != null)
          _Tile(
              keyName: 'cond-hum',
              title: 'Độ ẩm',
              value: formatHumidity(reading?.humidity),
              cond: assessment.hum!,
              ideal: range.humText),
      ]),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile(
      {required this.keyName,
      required this.title,
      required this.value,
      required this.cond,
      required this.ideal});

  final String keyName;
  final String title;
  final String value;
  final Condition cond;
  final String ideal;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = levelStyle(cond.level);
    return Semantics(
      container: true,
      label: '$title $value, ${cond.label}, phù hợp $ideal',
      child: ExcludeSemantics(
        child: Container(
          key: Key(keyName),
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration:
              BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            Icon(icon, color: fg),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$title · $value',
                        style:
                            TextStyle(color: fg, fontWeight: FontWeight.w700)),
                    Text('${cond.label} (phù hợp $ideal)',
                        style: TextStyle(color: fg, fontSize: 13)),
                  ]),
            ),
          ]),
        ),
      ),
    );
  }
}
