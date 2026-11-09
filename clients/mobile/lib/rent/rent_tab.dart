import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../core/format.dart';
import '../theme.dart';
import '../variety/variety_models.dart';
import '../variety/variety_sheet.dart';
import '../widgets/notice.dart';
import 'rental_repository.dart';

/// Wizard P1: phòng -> vị trí khay -> giống -> gói -> xác nhận -> thanh toán mô phỏng.
class RentTab extends StatefulWidget {
  const RentTab({super.key, required this.active, required this.onGoToTrays});
  final bool active;
  final VoidCallback onGoToTrays;
  @override
  State<RentTab> createState() => _RentTabState();
}

class _RentTabState extends State<RentTab> {
  List<RentalRoom>? _rooms;
  PackageList? _packages;
  RentalRoom? _room;
  final Set<String> _selected = {};
  VarietyChoice _variety = const VarietyChoice.none();
  String? _packageId;
  RentalResult? _result;
  Object? _error;
  String? _actionError;
  int _step = 0;
  bool _busy = false;
  bool _started = false;

  RentalRepository get _repo => RentalRepository(AuthScope.read(context).api);

  @override
  void initState() {
    super.initState();
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(covariant RentTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active && !_busy && _result == null) _load();
  }

  Future<void> _load() async {
    if (_busy) return;
    setState(() { _started = true; _error = null; });
    try {
      final rooms = await _repo.roomsForRent();
      final packages = await _repo.packages();
      if (!mounted) return;
      setState(() {
        _rooms = rooms;
        _packages = packages;
        if (_room != null) {
          final matches = rooms.where((r) => r.id == _room!.id);
          _room = matches.isEmpty ? null : matches.first;
          if (_room == null) {
            _selected.clear();
            _step = 0;
          } else {
            final valid = _room!.trays.where((t) => t.available).map((t) => t.id).toSet();
            _selected.removeWhere((id) => !valid.contains(id));
          }
        }
        if (packages.packages.every((p) => p.id != _packageId)) {
          _packageId = packages.packages.isEmpty ? null : packages.packages.first.id;
        }
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  RentalPackage? get _package {
    for (final p in _packages?.packages ?? <RentalPackage>[]) {
      if (p.id == _packageId) return p;
    }
    return null;
  }

  void _reset() {
    setState(() {
      _step = 0; _room = null; _selected.clear();
      _variety = const VarietyChoice.none(); _result = null;
      _actionError = null;
    });
    _load();
  }

  Future<void> _chooseVariety() async {
    final v = await showVarietySheet(context, repo: _repo,
      currentName: _variety.label, allowLater: false);
    if (v != null && mounted && !v.isNone) setState(() => _variety = v);
  }

  Future<void> _pay() async {
    final room = _room;
    final pkg = _package;
    if (room == null || pkg == null || _selected.isEmpty || _variety.isNone || _busy) return;
    setState(() { _busy = true; _actionError = null; });
    try {
      // Backend tính lại giá, khóa các khay bằng FOR UPDATE và thanh toán mô phỏng trong transaction.
      final result = await _repo.rentSelected(packageId: pkg.id,
        roomId: room.id, trayIds: _selected.toList(), variety: _variety);
      if (!mounted) return;
      setState(() { _result = result; _busy = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _actionError = e is ApiException && e.isNetwork
          ? 'Mất kết nối. Đơn có thể đã được tạo, hãy kiểm tra Khay của tôi trước khi thử lại.'
          : describeError(e);
      });
      if (e is ApiException && (e.code == 'TRAY_CONFLICT' ||
          e.code == 'NOT_ENOUGH_TRAYS' || e.code == 'PACKAGE_NOT_FOUND')) {
        await _load();
        if (mounted) setState(() => _step = 1);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_result != null) return _success(_result!);
    if (_rooms == null || _packages == null) {
      if (_error != null) {
        return ListView(padding: const EdgeInsets.all(20), children: [
          Notice('Không tải được dữ liệu. ${describeError(_error!)}', tone: NoticeTone.error),
          const SizedBox(height: 12), OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
        ]);
      }
      return Center(child: _started || widget.active
        ? const CircularProgressIndicator() : const SizedBox.shrink());
    }
    return Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(20, 12, 20, 4), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            if (_step > 0) IconButton(onPressed: _busy ? null : () => setState(() => _step--),
              icon: const Icon(Icons.arrow_back), tooltip: 'Quay lại'),
            Expanded(child: Text(_titles[_step], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
            Text('${_step + 1}/5', style: const TextStyle(color: AppColors.mute)),
          ]),
          LinearProgressIndicator(value: (_step + 1) / 5, minHeight: 4,
            borderRadius: BorderRadius.circular(6)),
        ])),
      Expanded(child: RefreshIndicator(onRefresh: _load,
        child: ListView(padding: const EdgeInsets.fromLTRB(20, 16, 20, 24), children: [
          if (_error != null) ...[Notice('Không thể làm mới: ${describeError(_error!)}', tone: NoticeTone.error), const SizedBox(height: 12)],
          if (_step == 0) _roomsView(),
          if (_step == 1) _slotsView(),
          if (_step == 2) _varietyView(),
          if (_step == 3) _packagesView(),
          if (_step == 4) _summaryView(),
          if (_actionError != null) ...[const SizedBox(height: 12), Notice(_actionError!, tone: NoticeTone.error)],
        ]))),
      if (_step > 0) SafeArea(top: false, child: Container(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
        decoration: const BoxDecoration(color: AppColors.paper,
          border: Border(top: BorderSide(color: AppColors.line))),
        child: Row(children: [
          Expanded(child: Column(mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${_selected.length} khay đã chọn', style: const TextStyle(color: AppColors.mute, fontSize: 12)),
              Text(formatVnd((_package?.pricePerTray ?? 0) * _selected.length),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ])),
          FilledButton(onPressed: _busy || !_canContinue ? null : () {
            if (_step == 4) { _pay(); } else { setState(() => _step++); }
          }, child: _busy ? const SizedBox(width: 20, height: 20,
            child: CircularProgressIndicator(strokeWidth: 2))
            : Text(_step == 4 ? 'Thanh toán mô phỏng' : 'Tiếp tục')),
        ]))),
    ]);
  }

  static const _titles = ['Chọn phòng', 'Chọn khay', 'Chọn giống nấm', 'Chọn gói thuê', 'Xác nhận đơn'];
  bool get _canContinue => switch (_step) {
    1 => _selected.isNotEmpty,
    2 => !_variety.isNone,
    3 || 4 => _package != null,
    _ => false,
  };

  Widget _roomsView() {
    if (_rooms!.isEmpty) return const Notice('Chưa có phòng đang hoạt động.');
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Chọn phòng còn khay sẵn sàng để bắt đầu thuê.',
        style: TextStyle(color: AppColors.mute)),
      const SizedBox(height: 16),
      for (final room in _rooms!) ...[
        Card(color: Colors.white, child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [Expanded(child: Text(room.name,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold))),
              Text('${room.available} khay sẵn sàng', style: const TextStyle(color: AppColors.moss))]),
            const SizedBox(height: 12),
            ClipRRect(borderRadius: BorderRadius.circular(5), child: Row(children: [
              _bar(room.empty, const Color(0xFFB0B0B0)),
              _bar(room.rented, const Color(0xFFD99B38)),
              _bar(room.available, AppColors.moss),
              _bar(room.other, AppColors.brick),
            ])),
            const SizedBox(height: 12),
            Wrap(spacing: 12, runSpacing: 8, children: [
              _stat('${room.empty}/32', 'Chưa có khay', Colors.grey),
              _stat('${room.rented}/32', 'Đang thuê', AppColors.amber),
              _stat('${room.available}/32', 'Sẵn sàng', AppColors.moss),
              if (room.other > 0) _stat('${room.other}/32', 'Trạng thái khác', AppColors.brick),
            ]),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: room.available == 0 ? null : () => setState(() {
              _room = room; _selected.clear(); _step = 1;
            }), child: const Text('Xem sơ đồ phòng')),
          ]))),
        const SizedBox(height: 12),
      ],
    ]);
  }

  Widget _bar(int n, Color color) => Expanded(flex: n == 0 ? 1 : n * 100,
    child: Container(height: 9, color: n == 0 ? Colors.transparent : color));

  Widget _stat(String value, String label, Color color) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(Icons.circle, size: 9, color: color), const SizedBox(width: 4),
    Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
    const SizedBox(width: 4), Text(label, style: const TextStyle(fontSize: 11)),
  ]);

  Widget _slotsView() {
    final room = _room!;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(room.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      const SizedBox(height: 8),
      const Text('Chạm vào các khay màu xanh để chọn. Một đơn chỉ thuê khay trong cùng phòng.',
        style: TextStyle(color: AppColors.mute)),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 8, children: [
        _stat('', 'Sẵn sàng', AppColors.moss), _stat('', 'Đã chọn', Colors.blue),
        _stat('', 'Đang thuê', AppColors.amber), _stat('', 'Chưa lắp', Colors.grey),
      ]),
      const SizedBox(height: 20),
      for (var row = 1; row <= 4; row++) ...[
        Text('Hàng $row', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (var shelf = 1; shelf <= 2; shelf++)
            Expanded(child: Padding(padding: EdgeInsets.only(right: shelf == 1 ? 8 : 0,
              left: shelf == 2 ? 8 : 0), child: Column(children: [
              Text('Kệ $shelf', style: const TextStyle(fontSize: 12, color: AppColors.mute)),
              const SizedBox(height: 5),
              Row(children: [for (var slot = 1; slot <= 4; slot++)
                Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: _slot(room, row, shelf, slot))),
              ]),
            ]))),
        ]),
        const SizedBox(height: 18),
      ],
      Text('Đã chọn ${_selected.length} khay (tối đa 32 khay/đơn)',
        style: const TextStyle(fontWeight: FontWeight.bold)),
    ]);
  }

  Widget _slot(RentalRoom room, int row, int shelf, int slot) {
    RentalSlot? item;
    for (final t in room.trays) {
      if (t.row == row && t.shelf == shelf && t.slot == slot) { item = t; break; }
    }
    final picked = item != null && _selected.contains(item.id);
    final available = item?.available ?? false;
    final color = picked ? Colors.blue : item == null ? const Color(0xFFE0E0E0)
      : available ? AppColors.mossSoft : AppColors.amberSoft;
    return Semantics(label: 'Hàng $row, kệ $shelf, ô $slot: '
      '${item == null ? 'chưa có khay' : picked ? 'đã chọn' : available ? 'có thể thuê' : 'không khả dụng'}',
      child: Tooltip(message: item?.code ?? 'Chưa lắp khay', child: InkWell(
        onTap: !available ? null : () => setState(() {
          if (picked) { _selected.remove(item!.id); }
          else if (_selected.length < 32) { _selected.add(item!.id); }
        }),
        borderRadius: BorderRadius.circular(7),
        child: Container(height: 44, alignment: Alignment.center,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(7),
            border: Border.all(color: picked ? Colors.blue : AppColors.line)),
          child: Text('$slot', style: TextStyle(fontWeight: FontWeight.bold,
            color: picked ? Colors.white : AppColors.ink))),
      )));
  }

  Widget _varietyView() => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Text('Chọn một giống nấm cho tất cả khay trong đơn thuê.',
      style: TextStyle(color: AppColors.mute)),
    const SizedBox(height: 14),
    Card(child: ListTile(leading: const Icon(Icons.spa_outlined),
      title: Text(_variety.label ?? 'Chọn giống nấm'),
      subtitle: Text(_variety.needsApproval ? 'Giống nhập tay cần Operator duyệt'
        : _variety.isNone ? 'Chọn giống có sẵn hoặc nhập giống khác' : 'Áp dụng cho ${_selected.length} khay'),
      trailing: const Icon(Icons.chevron_right), onTap: _chooseVariety)),
    if (_variety.needsApproval) const Padding(padding: EdgeInsets.all(12),
      child: Notice('Đơn thuê sẽ được tạo, nhưng giống nhập tay cần Operator phê duyệt trước khi tiếp tục nuôi.')),
  ]);

  Widget _packagesView() => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Text('Tất cả khay trong đơn sử dụng cùng một gói thuê.',
      style: TextStyle(color: AppColors.mute)),
    const SizedBox(height: 12),
    if (_packages!.packages.isEmpty) const Notice('Hiện không có gói thuê đang bán.'),
    RadioGroup<String>(
      groupValue: _packageId,
      onChanged: (id) => setState(() => _packageId = id),
      child: Column(children: [
        for (final pkg in _packages!.packages)
          Card(child: RadioListTile<String>(
            value: pkg.id,
            title: Text(pkg.name),
            subtitle: Text('${pkg.durationDays} ngày · ${formatVnd(pkg.pricePerTray)}/khay'),
            secondary: Text(formatVnd(pkg.pricePerTray * _selected.length),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          )),
      ]),
    ),
  ]);

  Widget _summaryView() {
    final pkg = _package!;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Kiểm tra thông tin trước khi thanh toán.',
        style: TextStyle(color: AppColors.mute)),
      const SizedBox(height: 14),
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
        _summaryRow('Phòng', _room!.name),
        _summaryRow('Số khay', '${_selected.length} khay'),
        _summaryRow('Vị trí', _selectedPositions()),
        _summaryRow('Giống nấm', _variety.label ?? ''),
        if (_variety.needsApproval) _summaryRow('Duyệt giống', 'Đang chờ Operator'),
        _summaryRow('Gói thuê', '${pkg.name} · ${pkg.durationDays} ngày'),
        _summaryRow('Đơn giá', formatVnd(pkg.pricePerTray)),
        const Divider(),
        _summaryRow('Tổng thanh toán', formatVnd(pkg.pricePerTray * _selected.length)),
      ]))),
      const SizedBox(height: 12),
      const Notice('Thanh toán mô phỏng: không trừ tiền thật. Giá và tình trạng khay sẽ được máy chủ kiểm tra lại.'),
    ]);
  }

  String _selectedPositions() {
    final selectedTrays = _room!.trays.where((t) => _selected.contains(t.id)).toList()
      ..sort((a, b) { final r = a.row.compareTo(b.row); if (r != 0) return r;
        final s = a.shelf.compareTo(b.shelf); return s != 0 ? s : a.slot.compareTo(b.slot); });
    return selectedTrays.map((t) => 'H${t.row}-K${t.shelf}-Ô${t.slot}').join(', ');
  }

  Widget _summaryRow(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7), child: Row(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppColors.mute))),
        Expanded(child: Text(value, textAlign: TextAlign.right,
          style: const TextStyle(fontWeight: FontWeight.w600))),
      ]));

  Widget _success(RentalResult result) => Center(child: SingleChildScrollView(
    padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.check_circle, color: AppColors.moss, size: 76),
      const SizedBox(height: 14),
      const Text('Thuê khay thành công!', style: TextStyle(fontSize: 23, fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      Text('${result.trayCount} khay · ${formatVnd(result.totalAmount)}'),
      const SizedBox(height: 6),
      Text('Hết hạn: ${result.endDate}'),
      if (result.varietyPending) const Padding(padding: EdgeInsets.only(top: 12),
        child: Notice('Giống nấm đang chờ Operator duyệt.')),
      const SizedBox(height: 20),
      FilledButton(onPressed: () { widget.onGoToTrays(); _reset(); },
        child: const Text('Xem khay của tôi')),
      TextButton(onPressed: _reset, child: const Text('Thuê thêm khay')),
    ])));
}