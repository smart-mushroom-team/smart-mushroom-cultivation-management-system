import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../theme.dart';
import 'tray_models.dart';
import 'tray_repository.dart';

/// Tải số đo mới nhất của một phòng một lần rồi đưa cho [builder]; muốn tải lại thì đổi `key`.
/// Tách khỏi phần hiển thị để thẻ khay và chi tiết khay dùng chung một lần tải (đánh giá theo giống cần số đo này).
class LatestReadingBuilder extends StatefulWidget {
  const LatestReadingBuilder(
      {super.key, required this.roomId, required this.builder});

  final String roomId;
  final Widget Function(
      BuildContext context, LatestReading? data, Object? error) builder;

  @override
  State<LatestReadingBuilder> createState() => _LatestReadingBuilderState();
}

class _LatestReadingBuilderState extends State<LatestReadingBuilder> {
  LatestReading? _data;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await TrayRepository(AuthScope.read(context).api)
          .latest(widget.roomId);
      if (mounted) setState(() => _data = d);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) => widget.builder(context, _data, _error);
}

/// Nhiệt độ, độ ẩm mới nhất của một phòng + trạng thái thiết bị. Tự tải khi dựng; muốn tải lại thì đổi `key`.
class RoomReading extends StatelessWidget {
  const RoomReading({super.key, required this.roomId, this.now});

  final String roomId;

  /// Chỉ để test cố định giờ.
  final DateTime? now;

  @override
  Widget build(BuildContext context) => LatestReadingBuilder(
      roomId: roomId,
      builder: (context, data, error) =>
          RoomReadingView(data: data, error: error, now: now));
}

class RoomReadingView extends StatelessWidget {
  const RoomReadingView(
      {super.key, required this.data, required this.error, this.now});

  final LatestReading? data;
  final Object? error;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final d = data;
    if (d == null) {
      return Text(
          error == null
              ? 'Đang tải số đo…'
              : 'Chưa lấy được số đo. ${describeError(error!)}',
          key: const Key('reading-state'),
          style: const TextStyle(color: AppColors.mute, fontSize: 13));
    }
    final r = d.reading;
    if (r == null) {
      return const Text('Phòng chưa có số đo nào.',
          key: Key('reading-state'),
          style: TextStyle(color: AppColors.mute, fontSize: 13));
    }
    final at = now ?? DateTime.now();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.thermostat, size: 20, color: AppColors.spore),
          const SizedBox(width: 4),
          Text(formatTemp(r.temperature),
              key: const Key('reading-temp'),
              style:
                  const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
          const SizedBox(width: 20),
          const Icon(Icons.water_drop_outlined,
              size: 20, color: AppColors.spore),
          const SizedBox(width: 4),
          Text(formatHumidity(r.humidity),
              key: const Key('reading-hum'),
              style:
                  const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 2),
        Text(
          d.deviceOnline
              ? 'Cập nhật ${ago(r.recordedAt, at)}'
              : 'Cảm biến đang mất kết nối · số đo cuối ${ago(r.recordedAt, at)}',
          key: const Key('reading-fresh'),
          style: TextStyle(
              color: d.deviceOnline ? AppColors.mute : AppColors.amber,
              fontSize: 13),
        ),
      ],
    );
  }
}
