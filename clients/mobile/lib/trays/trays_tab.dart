import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../core/format.dart';
import '../theme.dart';
import '../variety/variety_models.dart' show varietyStatusText;
import '../widgets/notice.dart';
import 'cycle_screen.dart';
import 'condition.dart';
import 'pager.dart';
import 'room_reading.dart';
import 'tray_filter.dart';
import 'tray_models.dart';
import 'tray_repository.dart';

/// Tab "Khay của tôi": khay đang nuôi gom theo phòng, kèm số đo mới nhất của từng phòng.
class TraysTab extends StatefulWidget {
  const TraysTab({super.key, required this.active, required this.onGoRent});

  final bool active;
  final VoidCallback onGoRent;

  @override
  State<TraysTab> createState() => _TraysTabState();
}

class _TraysTabState extends State<TraysTab> {
  TraysData? _data;
  Object? _error;
  bool _loading = false;
  int _generation = 0; // đổi để các thẻ số đo tải lại

  @override
  void initState() {
    super.initState();
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(TraysTab old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) _load();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await TrayRepository(AuthScope.read(context).api).myTrays();
      if (!mounted) return;
      setState(() {
        _data = d;
        _loading = false;
        _generation++;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    if (data == null) {
      if (_error != null) {
        return ListView(padding: const EdgeInsets.all(20), children: [
          Notice('Không tải được danh sách khay. ${describeError(_error!)}', tone: NoticeTone.error),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
        ]);
      }
      return const Center(child: CircularProgressIndicator());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) ...[Notice('Chưa làm mới được. ${describeError(_error!)}', tone: NoticeTone.error), const SizedBox(height: 12)],
          if (data.cycles.isEmpty) _Empty(onGoRent: widget.onGoRent),
          for (final roomId in data.roomIds) ...[
            _RoomSection(
              roomName: data.roomName(roomId),
              roomId: roomId,
              generation: _generation,
              cycles: [for (final c in data.cycles) if (c.roomId == roomId) c],
              roomNameOf: data.roomName,
            ),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.onGoRent});

  final VoidCallback onGoRent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 12),
      child: Column(children: [
        const Icon(Icons.grid_view_outlined, size: 48, color: AppColors.mute),
        const SizedBox(height: 12),
        const Text('Bạn chưa có khay nào đang nuôi.', key: Key('trays-empty'), style: TextStyle(fontSize: 16)),
        const SizedBox(height: 6),
        const Text('Khay của đơn đã hết hạn xem ở Tài khoản › Đơn thuê của tôi.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.mute, fontSize: 13)),
        const SizedBox(height: 16),
        FilledButton(onPressed: onGoRent, child: const Text('Thuê khay ngay')),
      ]),
    );
  }
}

/// Số khay tối đa mỗi trang trong một phòng.
const int traysPerPage = 3;

class _RoomSection extends StatefulWidget {
  const _RoomSection({required this.roomName, required this.roomId, required this.generation, required this.cycles, required this.roomNameOf});

  final String roomName;
  final String roomId;
  final int generation;
  final List<Cycle> cycles;
  final String Function(String) roomNameOf;

  @override
  State<_RoomSection> createState() => _RoomSectionState();
}

class _RoomSectionState extends State<_RoomSection> {
  TrayFilter _filter = TrayFilter.all;
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    final roomId = widget.roomId;
    final shown = [for (final c in widget.cycles) if (_filter.matches(c)) c];
    final pages = pageCountOf(shown.length, traysPerPage);
    final page = _page.clamp(1, pages);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(widget.roomName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        LatestReadingBuilder(
          key: ValueKey('reading-$roomId-${widget.generation}'),
          roomId: roomId,
          builder: (context, data, error) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RoomReadingView(data: data, error: error),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final f in TrayFilter.values)
                    ChoiceChip(
                      key: Key('filter-$roomId-${f.name}'),
                      label: Text('${f.label} (${widget.cycles.where(f.matches).length})'),
                      selected: _filter == f,
                      onSelected: (_) => setState(() {
                        _filter = f;
                        _page = 1;
                      }),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              if (shown.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text('Không có khay nào trong mục "${_filter.label}".', key: Key('filter-empty-$roomId'), style: const TextStyle(color: AppColors.mute)),
                ),
              for (final c in pageSlice(shown, page, traysPerPage)) ...[
                _TrayCard(
                  cycle: c,
                  assessment: c.status == 'GROWING' ? assess(data, c.varietyRange, DateTime.now()) : null,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
                    builder: (_) => CycleScreen(cycleId: c.id, trayCode: c.trayCode, roomId: c.roomId, roomName: widget.roomNameOf(c.roomId), auth: AuthScope.read(context)),
                  )),
                ),
                const SizedBox(height: 8),
              ],
              Pager(page: page, pages: pages, onChanged: (p) => setState(() => _page = p)),
            ],
          ),
        ),
      ],
    );
  }
}

class _TrayCard extends StatelessWidget {
  const _TrayCard({required this.cycle, required this.assessment, required this.onTap});

  final Cycle cycle;
  final Assessment? assessment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final idx = stageIndex(cycle.stage);
    return InkWell(
      key: Key('tray-${cycle.id}'),
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.line)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
  children: [
    Expanded(
      child: Text(
        'Khay ${cycle.trayCode}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 16,
        ),
      ),
    ),
    const SizedBox(width: 8),
    Flexible(
      fit: FlexFit.loose,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 10,
          vertical: 4,
        ),
        decoration: BoxDecoration(
          color: AppColors.sporeSoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          cycleStateText(cycle),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.sporeDeep,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    ),
    const SizedBox(width: 4),
    const Icon(
      Icons.chevron_right,
      color: AppColors.mute,
    ),
  ],
),
            const SizedBox(height: 8),
            StageBar(index: idx),
            const SizedBox(height: 8),
            Text('${cycle.variety == null ? 'Chưa chọn giống' : '${cycle.variety}${varietyStatusText(cycle.varietyStatus).isEmpty ? '' : ' (${varietyStatusText(cycle.varietyStatus)})'}'} · dự kiến thu hoạch ${cycle.expectedHarvestDate == null ? 'chưa có' : formatDate(cycle.expectedHarvestDate!)}', style: const TextStyle(color: AppColors.mute, fontSize: 13)),
            if (assessment != null) Padding(padding: const EdgeInsets.only(top: 8, bottom: 2), child: AssessmentChip(key: Key('assessment-${cycle.id}'), assessment: assessment!)),
            Text(
              cycle.rentalExpired ? 'Đơn thuê đã hết hạn ${formatDate(cycle.rentalEndDate)}: cần xử lý khay' : 'Thuê đến hết ${formatDate(cycle.rentalEndDate)}',
              style: TextStyle(color: cycle.rentalExpired ? const Color(0xFF9A5B00) : AppColors.mute, fontSize: 13, fontWeight: cycle.rentalExpired ? FontWeight.w600 : FontWeight.w400),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thanh 4 chặng của vòng đời nấm; các chặng đã qua và hiện tại được tô màu.
class StageBar extends StatelessWidget {
  const StageBar({super.key, required this.index});

  final int index;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Giai đoạn ${index + 1} trên ${stageOrder.length}',
      child: ExcludeSemantics(
        child: Row(children: [
          for (var i = 0; i < stageOrder.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(child: Container(height: 6, decoration: BoxDecoration(color: i <= index ? AppColors.spore : AppColors.line, borderRadius: BorderRadius.circular(3)))),
          ],
        ]),
      ),
    );
  }
}
