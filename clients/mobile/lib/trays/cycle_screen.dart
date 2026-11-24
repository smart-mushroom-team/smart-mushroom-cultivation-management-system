import 'package:flutter/material.dart';

import '../auth/auth_controller.dart';
import '../core/api_client.dart';
import '../core/format.dart';
import '../rent/rental_repository.dart';
import '../theme.dart';
import '../variety/variety_models.dart';
import '../variety/variety_sheet.dart';
import '../widgets/notice.dart';
import 'condition.dart';
import 'mini_chart.dart';
import 'room_reading.dart';
import 'tray_models.dart';
import 'tray_repository.dart';
import 'trays_tab.dart' show StageBar;

enum _Metric {
  temperature('Nhiệt độ', '°C', Color(0xFFB4533A)),
  humidity('Độ ẩm', '%', Color(0xFF2F6F8F)),
  soil('Độ ẩm đất', '%', AppColors.moss);

  const _Metric(this.label, this.unit, this.color);

  final String label;
  final String unit;
  final Color color;

  String value(Reading? reading) => switch (this) {
        temperature => formatTemp(reading?.temperature),
        humidity => formatHumidity(reading?.humidity),
        soil => formatHumidity(reading?.soilMoisture),
      };

  double? point(ChartPoint point) => switch (this) {
        temperature => point.temp,
        humidity => point.hum,
        soil => point.soil,
      };
}

/// Chi tiết một khay: tiến độ, nhật ký, số đo hiện tại, biểu đồ 24 giờ và ảnh camera đúng khu vực khay đang thuê.
/// Màn này nằm trên Navigator nên nhận [auth] trực tiếp (không đứng dưới AuthScope của HomeShell chắc chắn).
class CycleScreen extends StatefulWidget {
  const CycleScreen(
      {super.key,
      required this.cycleId,
      required this.trayCode,
      required this.roomId,
      required this.roomName,
      required this.auth});

  final String cycleId;
  final String trayCode;
  final String roomId;
  final String roomName;
  final AuthController auth;

  @override
  State<CycleScreen> createState() => _CycleScreenState();
}

class _CycleScreenState extends State<CycleScreen> {
  late final TrayRepository _repo = TrayRepository(widget.auth.api);
  Cycle? _cycle;
  Object? _cycleError;
  List<ChartPoint>? _chart;
  _Metric _metric = _Metric.temperature;
  Object? _chartError;
  CameraImage? _image;
  Object? _imageError;
  bool _refreshing = false;
  bool _savingVariety = false;
  Object? _varietyError;
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    if (_refreshing) return;
    setState(() {
      _refreshing = true;
      _cycleError = null;
    });
    await Future.wait([_loadCycle(), _loadChart(), _loadImage()]);
    if (mounted) {
      setState(() {
        _refreshing = false;
        _generation++;
      });
    }
  }

  Widget _roomBody(Cycle? c, LatestReading? data, Object? error) {
    final range = c?.varietyRange;
    final a = assess(data, range, DateTime.now());
    final values = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final metric in _Metric.values)
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: metric == _Metric.soil ? 0 : 6),
              child: Semantics(
                selected: _metric == metric,
                child: OutlinedButton(
                  key: ValueKey('metric-${metric.name}'),
                  onPressed: () => setState(() => _metric = metric),
                  style: OutlinedButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    backgroundColor:
                        _metric == metric ? AppColors.sporeSoft : null,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(metric.label, textAlign: TextAlign.center),
                      Text(metric.value(data?.reading),
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (data?.reading == null) values,
        RoomReadingView(data: data, error: error, values: values),
        const SizedBox(height: 12),
        _Section(title: '24 giờ gần nhất', children: _chartBody()),
        if (a != null && range != null) ...[
          ConditionTiles(assessment: a, reading: data?.reading, range: range),
          EnvironmentNotice(assessment: a),
        ],
        if (c != null && range == null && c.varietyStatus != 'NONE')
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
                'Giống này chưa có khoảng nhiệt độ, độ ẩm chuẩn nên chưa đánh giá được.',
                key: Key('no-range-hint'),
                style: TextStyle(color: AppColors.mute, fontSize: 13)),
          ),
        if (c != null && c.varietyStatus == 'NONE')
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Chọn giống để xem số đo có phù hợp không.',
                key: Key('no-variety-hint'),
                style: TextStyle(color: AppColors.mute, fontSize: 13)),
          ),
      ],
    );
  }

  Future<void> _pickVariety() async {
    final c = _cycle;
    if (c == null || _savingVariety) return;
    final choice = await showVarietySheet(context,
        repo: RentalRepository(widget.auth.api), currentName: c.variety);
    if (choice == null || choice.isNone || !mounted) return;
    setState(() {
      _savingVariety = true;
      _varietyError = null;
    });
    try {
      final u = await _repo.setVariety(c.id, choice);
      if (!mounted) return;
      setState(() {
        _cycle = c.copyWithVariety(
            variety: u.variety,
            status: u.varietyStatus,
            rejectReason: u.varietyRejectReason,
            range: u.varietyRange);
        _savingVariety = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _varietyError = e;
        _savingVariety = false;
      });
    }
  }

  Future<void> _loadCycle() async {
    try {
      final c = await _repo.cycle(widget.cycleId);
      if (mounted) setState(() => _cycle = c);
    } catch (e) {
      if (mounted) setState(() => _cycleError = e);
    }
  }

  Future<void> _loadChart() async {
    try {
      final c = await _repo.chart(widget.roomId);
      if (mounted) {
        setState(() {
          _chart = c;
          _chartError = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _chartError = e);
    }
  }

  Future<void> _loadImage() async {
    try {
      final i = await _repo.cameraForCycle(widget.roomId, widget.cycleId);
      if (mounted) {
        setState(() {
          _image = i;
          _imageError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _image = null;
          _imageError = e;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _cycle;
    return Scaffold(
      appBar: AppBar(
          title: Text('Khay ${widget.trayCode}'),
          backgroundColor: AppColors.paper,
          surfaceTintColor: Colors.transparent),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (c == null && _cycleError != null) ...[
              Notice(
                  'Không tải được thông tin khay. ${describeError(_cycleError!)}',
                  tone: NoticeTone.error),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _loadAll, child: const Text('Thử lại')),
            ] else if (c == null)
              const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()))
            else
              _Progress(
                  cycle: c,
                  saving: _savingVariety,
                  error: _varietyError,
                  onPickVariety: _pickVariety),
            const SizedBox(height: 20),
            _Section(title: 'Phòng ${widget.roomName}', children: [
              LatestReadingBuilder(
                key: ValueKey('r-${widget.roomId}-$_generation'),
                roomId: widget.roomId,
                builder: (context, data, error) => _roomBody(c, data, error),
              ),
            ]),
            const SizedBox(height: 20),
            _Section(title: 'Camera', children: _cameraBody()),
            if (c != null && c.logs.isNotEmpty) ...[
              const SizedBox(height: 20),
              _Section(title: 'Nhật ký tiến độ', children: [
                for (final l in c.logs.reversed) _LogLine(log: l)
              ]),
            ],
          ],
        ),
      ),
    );
  }

  List<Widget> _chartBody() {
    return [
      _selectedChart(),
      if (_metric == _Metric.soil)
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text(
            'Thông số này được trích từ 1 khay của phòng, chỉ mang giá trị xấp xỉ cho khay của bạn.',
            style: TextStyle(color: AppColors.mute, fontSize: 12),
          ),
        ),
    ];
  }

  Widget _selectedChart() {
    final chart = _chart;
    if (_chartError case final error?) {
      return Text('Không tải được biểu đồ. ${describeError(error)}',
          key: const Key('chart-state'),
          style: const TextStyle(color: AppColors.mute));
    }
    if (chart == null) {
      return const Text('Đang tải biểu đồ…',
          key: Key('chart-state'), style: TextStyle(color: AppColors.mute));
    }
    if (chart.isEmpty) {
      return const Text('Chưa có số liệu trong 24 giờ qua.',
          key: Key('chart-state'), style: TextStyle(color: AppColors.mute));
    }
    final values = <double?>[];
    const window = Duration(minutes: 5);
    for (var i = 0; i < chart.length; i++) {
      if (i > 0) {
        final gap = chart[i].t.difference(chart[i - 1].t);
        for (var missing = window; missing < gap; missing += window) {
          values.add(null);
        }
      }
      values.add(_metric.point(chart[i]));
    }
    final isTemp = _metric == _Metric.temperature;
    return MiniChart(
      key: ValueKey('chart-${_metric.name}'),
      title: _metric.label,
      values: values,
      unit: _metric.unit,
      color: _metric.color,
      fractionDigits: isTemp ? 1 : 0,
      minSpan: isTemp ? 2 : 5,
    );
  }

  List<Widget> _cameraBody() {
    final img = _image;
    if (img != null) {
      return [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.memory(
            img.bytes,
            key: const Key('camera-image'),
            width: double.infinity,
            fit: BoxFit.cover,
            gaplessPlayback: true,
            semanticLabel: 'Ảnh camera khu vực khay ${widget.trayCode}',
            errorBuilder: (_, __, ___) => const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Không hiển thị được ảnh này.')),
          ),
        ),
        if (img.capturedAt != null)
          Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('Chụp lúc ${_when(img.capturedAt!)}',
                  style: const TextStyle(color: AppColors.mute, fontSize: 13))),
      ];
    }
    final e = _imageError;
    if (e == null) {
      return [
        const Text('Đang tải ảnh…',
            key: Key('camera-state'), style: TextStyle(color: AppColors.mute))
      ];
    }
    final text = e is ApiException && e.code == 'NO_SNAPSHOT'
        ? 'Camera chưa gửi ảnh nào.'
        : 'Không tải được ảnh. ${describeError(e)}';
    return [
      Text(text,
          key: const Key('camera-state'),
          style: const TextStyle(color: AppColors.mute))
    ];
  }
}

/// "2026-11-05T03:20:00+00:00" -> "10:20 05/11/2026" (giờ Việt Nam, UTC+7). Dùng cho nhãn thời điểm.
String _when(String iso) {
  final t = DateTime.tryParse(iso);
  if (t == null) return iso;
  final v = t.toUtc().add(const Duration(hours: 7));
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(v.hour)}:${two(v.minute)} ${two(v.day)}/${two(v.month)}/${v.year}';
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...children
        ],
      );
}

class _Progress extends StatelessWidget {
  const _Progress(
      {required this.cycle,
      required this.saving,
      required this.error,
      required this.onPickVariety});

  final Cycle cycle;
  final bool saving;
  final Object? error;
  final VoidCallback onPickVariety;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(stageText(cycle.stage),
            key: const Key('cycle-stage'),
            style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.sporeDeep)),
        const SizedBox(height: 8),
        StageBar(index: stageIndex(cycle.stage)),
        const SizedBox(height: 12),
        _Line(
            'Giống',
            cycle.variety == null
                ? 'Chưa chọn'
                : '${cycle.variety}${varietyStatusText(cycle.varietyStatus).isEmpty ? '' : ' (${varietyStatusText(cycle.varietyStatus)})'}'),
        if (cycle.varietyStatus == 'PENDING')
          const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Notice(
                  'Giống này ngoài danh mục, đang chờ nhân viên duyệt. Khay chưa sang giai đoạn tiếp theo cho đến khi được duyệt.',
                  tone: NoticeTone.info)),
        if (cycle.varietyStatus == 'REJECTED')
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Notice(
                'Giống "${cycle.variety}" bị từ chối${cycle.varietyRejectReason == null ? '' : ': ${cycle.varietyRejectReason}'}. Hãy chọn giống khác trong danh mục.',
                tone: NoticeTone.error),
          ),
        if (error != null)
          Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Notice('Không lưu được giống. ${describeError(error!)}',
                  tone: NoticeTone.error)),
        if (cycle.canChangeVariety)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                key: const Key('change-variety'),
                onPressed: saving ? null : onPickVariety,
                icon: saving
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.eco_outlined),
                label: Text(cycle.variety == null ? 'Chọn giống' : 'Đổi giống'),
              ),
            ),
          ),
        _Line('Bắt đầu', formatDate(cycle.startDate)),
        _Line(
            'Dự kiến thu hoạch',
            cycle.expectedHarvestDate == null
                ? 'Chưa có'
                : formatDate(cycle.expectedHarvestDate!)),
        _Line('Thuê đến hết', formatDate(cycle.rentalEndDate)),
        if (cycle.rentalExpired)
          const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Notice('Đơn thuê đã hết hạn. Nhân viên sẽ xử lý khay này.',
                  tone: NoticeTone.info)),
        if (cycle.note != null && cycle.note!.isNotEmpty)
          _Line('Ghi chú', cycle.note!),
      ],
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
              width: 140,
              child:
                  Text(label, style: const TextStyle(color: AppColors.mute))),
          Expanded(child: Text(value)),
        ]),
      );
}

class _LogLine extends StatelessWidget {
  const _LogLine({required this.log});

  final CycleLog log;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
              log.fromStage == null
                  ? stageText(log.toStage)
                  : '${stageText(log.fromStage!)} → ${stageText(log.toStage)}',
              style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(_when(log.createdAt),
              style: const TextStyle(color: AppColors.mute, fontSize: 13)),
          if (log.note != null && log.note!.isNotEmpty) Text(log.note!),
        ]),
      );
}
