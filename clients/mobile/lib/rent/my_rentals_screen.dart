import 'package:flutter/material.dart';

import '../auth/auth_controller.dart';
import '../core/api_client.dart';
import '../core/format.dart';
import '../theme.dart';
import '../trays/cycle_screen.dart';
import '../trays/pager.dart';
import '../trays/tray_filter.dart';
import '../trays/tray_models.dart';
import '../trays/tray_repository.dart';
import '../widgets/notice.dart';
import 'rental_repository.dart';

const int rentalsPerPage = 5;

enum RentalFilter {
  all('Tất cả'),
  active('Còn hạn'),
  ended('Hết hạn');

  const RentalFilter(this.label);

  final String label;

  bool matches(MyRental r) => switch (this) {
        RentalFilter.all => true,
        RentalFilter.active => r.isActive,
        RentalFilter.ended => !r.isActive, // EXPIRED hoặc COMPLETED
      };
}

/// Lịch sử đơn thuê của khách: trạng thái, ngày hết hạn, tiền; bấm vào đơn để xem các khay của đơn đó (kể cả đã hết hạn).
class MyRentalsScreen extends StatefulWidget {
  const MyRentalsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<MyRentalsScreen> createState() => _MyRentalsScreenState();
}

class _MyRentalsScreenState extends State<MyRentalsScreen> {
  List<MyRental>? _rentals;
  Object? _error;
  RentalFilter _filter = RentalFilter.all;
  int _page = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await RentalRepository(widget.auth.api).mine();
      if (mounted) {
        setState(() {
          _rentals = r;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = _rentals;
    return Scaffold(
      appBar: AppBar(title: const Text('Đơn thuê của tôi')),
      body: RefreshIndicator(onRefresh: _load, child: _body(all)),
    );
  }

  Widget _body(List<MyRental>? all) {
    if (all == null) {
      if (_error != null) {
        return ListView(padding: const EdgeInsets.all(16), children: [
          Notice('Không tải được danh sách đơn thuê. ${describeError(_error!)}', tone: NoticeTone.error),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
        ]);
      }
      return const Center(child: CircularProgressIndicator());
    }
    if (all.isEmpty) {
      return ListView(padding: const EdgeInsets.all(24), children: const [Text('Bạn chưa có đơn thuê nào.', key: Key('rentals-empty'), textAlign: TextAlign.center)]);
    }
    final shown = [for (final r in all) if (_filter.matches(r)) r];
    final pages = pageCountOf(shown.length, rentalsPerPage);
    final page = _page.clamp(1, pages);
    final total = all.fold<num>(0, (s, r) => s + r.totalAmount);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.sporeSoft, borderRadius: BorderRadius.circular(8)),
          child: Text('${all.length} đơn · tổng đã thuê ${formatVnd(total)}', key: const Key('rentals-summary'), style: const TextStyle(color: AppColors.sporeDeep, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(height: 12),
        Wrap(spacing: 8, children: [
          for (final f in RentalFilter.values)
            ChoiceChip(
              key: Key('rental-filter-${f.name}'),
              label: Text('${f.label} (${all.where(f.matches).length})'),
              selected: _filter == f,
              onSelected: (_) => setState(() {
                _filter = f;
                _page = 1;
              }),
            ),
        ]),
        const SizedBox(height: 12),
        if (shown.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Không có đơn nào trong mục này.', key: Key('rentals-filter-empty'), style: TextStyle(color: AppColors.mute))),
        for (final r in pageSlice(shown, page, rentalsPerPage)) ...[
          _RentalCard(
            rental: r,
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => RentalDetailScreen(rental: r, auth: widget.auth))),
          ),
          const SizedBox(height: 10),
        ],
        Pager(page: page, pages: pages, onChanged: (p) => setState(() => _page = p)),
      ],
    );
  }
}

class _RentalCard extends StatelessWidget {
  const _RentalCard({required this.rental, required this.onTap});

  final MyRental rental;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final r = rental;
    final (bg, fg) = switch (r.status) {
      'ACTIVE' => (AppColors.mossSoft, AppColors.moss),
      'EXPIRED' => (AppColors.amberSoft, AppColors.amber),
      _ => (AppColors.bone, AppColors.mute),
    };
    return InkWell(
      key: Key('rental-${r.id}'),
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(r.packageName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
              child: Text(r.statusText, style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 13)),
            ),
            const Icon(Icons.chevron_right, color: AppColors.mute),
          ]),
          const SizedBox(height: 6),
          Text('${r.trayCount} khay · ${formatVnd(r.totalAmount)}', style: const TextStyle(fontSize: 14)),
          Text('${formatDate(r.startDate)} – ${formatDate(r.endDate)}', style: const TextStyle(color: AppColors.mute, fontSize: 13)),
          if (r.status == 'EXPIRED' && r.growingCount > 0)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Còn ${r.growingCount} khay chưa xử lý xong', key: Key('rental-open-${r.id}'), style: const TextStyle(color: AppColors.amber, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
        ]),
      ),
    );
  }
}

/// Chi tiết một đơn: thông tin đơn và toàn bộ khay của đơn (đang nuôi, đã thu hoạch, đã loại bỏ).
class RentalDetailScreen extends StatefulWidget {
  const RentalDetailScreen({super.key, required this.rental, required this.auth});

  final MyRental rental;
  final AuthController auth;

  @override
  State<RentalDetailScreen> createState() => _RentalDetailScreenState();
}

class _RentalDetailScreenState extends State<RentalDetailScreen> {
  TraysData? _data;
  Object? _error;
  int _page = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await TrayRepository(widget.auth.api).myTrays(status: 'ALL', rentalStatus: 'ALL', rentalId: widget.rental.id);
      if (mounted) {
        setState(() {
          _data = d;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.rental;
    final d = _data;
    return Scaffold(
      appBar: AppBar(title: Text(r.packageName)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _info('Trạng thái', r.statusText, key: 'detail-status'),
            _info('Thời gian thuê', '${formatDate(r.startDate)} – ${formatDate(r.endDate)}${r.durationDays > 0 ? ' (${r.durationDays} ngày)' : ''}'),
            _info('Số khay', '${r.trayCount}'),
            _info('Giá mỗi khay', formatVnd(r.pricePerTray)),
            _info('Tổng tiền', formatVnd(r.totalAmount), key: 'detail-total'),
            const SizedBox(height: 16),
            const Text('Các khay của đơn', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            if (d == null && _error != null) ...[
              Notice('Không tải được khay của đơn. ${describeError(_error!)}', tone: NoticeTone.error),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
            ] else if (d == null)
              const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
            else ...[
              if (d.cycles.isEmpty) const Text('Đơn này chưa có khay nào.', style: TextStyle(color: AppColors.mute)),
              for (final c in pageSlice(d.cycles, _page, rentalsPerPage)) ...[
                _TrayRow(
                  cycle: c,
                  roomName: d.roomName(c.roomId),
                  onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
                    builder: (_) => CycleScreen(cycleId: c.id, trayCode: c.trayCode, roomId: c.roomId, roomName: d.roomName(c.roomId), auth: widget.auth),
                  )),
                ),
                const SizedBox(height: 8),
              ],
              Pager(page: _page.clamp(1, pageCountOf(d.cycles.length, rentalsPerPage)), pages: pageCountOf(d.cycles.length, rentalsPerPage), onChanged: (p) => setState(() => _page = p)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _info(String label, String value, {String? key}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: AppColors.mute))),
          Expanded(child: Text(value, key: key == null ? null : Key(key), style: const TextStyle(fontWeight: FontWeight.w600))),
        ]),
      );
}

class _TrayRow extends StatelessWidget {
  const _TrayRow({required this.cycle, required this.roomName, required this.onTap});

  final Cycle cycle;
  final String roomName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = cycle;
    return InkWell(
      key: Key('rental-tray-${c.id}'),
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.line)),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Khay ${c.trayCode} · $roomName', style: const TextStyle(fontWeight: FontWeight.w700)),
              Text('${cycleStateText(c)} · ${c.variety ?? 'Chưa chọn giống'}', style: const TextStyle(color: AppColors.mute, fontSize: 13)),
            ]),
          ),
          const Icon(Icons.chevron_right, color: AppColors.mute),
        ]),
      ),
    );
  }
}
