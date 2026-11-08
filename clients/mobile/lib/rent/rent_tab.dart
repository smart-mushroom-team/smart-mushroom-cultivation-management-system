import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../core/format.dart';
import '../theme.dart';
import '../variety/variety_models.dart';
import '../variety/variety_sheet.dart';
import '../widgets/notice.dart';
import 'rental_repository.dart';

/// Tab "Thuê khay": chọn gói và số khay, xem tổng tiền, xác nhận rồi thuê.
/// Chỉ tải dữ liệu khi tab được mở ([active]) để không gọi API khi người dùng chưa cần.
class RentTab extends StatefulWidget {
  const RentTab({super.key, required this.active, required this.onGoToTrays});

  final bool active;
  final VoidCallback onGoToTrays;

  @override
  State<RentTab> createState() => _RentTabState();
}

class _RentTabState extends State<RentTab> {
  PackageList? _data;
  Object? _loadError;
  String? _selectedId;
  int _count = 1;
  VarietyChoice _variety = const VarietyChoice.none();
  bool _busy = false;
  String? _actionError;
  RentalResult? _result;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    if (widget.active) _load();
  }

  @override
  void didUpdateWidget(RentTab old) {
    super.didUpdateWidget(old);
    // Mỗi lần mở lại tab thì làm mới số khay trống và giá, trừ khi đang thuê dở hoặc đang xem kết quả.
    if (widget.active && !old.active && !_busy && _result == null) _load();
  }

  RentalRepository get _repo => RentalRepository(AuthScope.read(context).api);

  Future<void> _load() async {
    _started = true;
    setState(() {
      _loadError = null;
    });
    try {
      final data = await _repo.packages();
      if (!mounted) return;
      setState(() {
        _data = data;
        if (data.packages.every((p) => p.id != _selectedId)) {
          _selectedId = data.packages.isEmpty ? null : data.packages.first.id;
        }
        if (_count > data.maxCount) {
          _count = data.maxCount < 1 ? 1 : data.maxCount;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e;
      });
    }
  }

  RentalPackage? get _selected {
    final d = _data;
    if (d == null) return null;
    for (final p in d.packages) {
      if (p.id == _selectedId) return p;
    }
    return null;
  }

  Future<void> _confirmAndRent() async {
    final pkg = _selected;
    if (pkg == null || _busy) return;
    final total = pkg.pricePerTray * _count;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xác nhận thuê khay'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$_count khay · ${pkg.name} (${pkg.durationDays} ngày)'),
            const SizedBox(height: 4),
            Text(_variety.isNone
                ? 'Giống nấm: chọn sau'
                : 'Giống nấm: ${_variety.label}${_variety.needsApproval ? ' (chờ nhân viên duyệt)' : ''}'),
            const SizedBox(height: 8),
            Text('Tổng: ${formatVnd(total)}',
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            const SizedBox(height: 8),
            const Text(
                'Thanh toán mô phỏng: hệ thống tự xác nhận, không trừ tiền thật.',
                style: TextStyle(color: AppColors.mute, fontSize: 13)),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Hủy')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(120, 44)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Thuê ngay'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    setState(() {
      _busy = true;
      _actionError = null;
    });
    try {
      final result = await _repo.rent(
          packageId: pkg.id, trayCount: _count, variety: _variety);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _result = result;
      });
    } catch (e) {
      if (!mounted) return;
      final stale = e is ApiException &&
          (e.code == 'NOT_ENOUGH_TRAYS' ||
              e.code == 'TRAY_CONFLICT' ||
              e.code == 'PACKAGE_NOT_FOUND');
      setState(() {
        _busy = false;
        // Mất mạng giữa chừng: không biết server đã nhận đơn hay chưa, nên không khuyên bấm thử lại ngay.
        _actionError = e is ApiException && e.isNetwork
            ? 'Không nhận được phản hồi từ máy chủ. Đơn có thể đã được tạo: hãy xem tab Khay của tôi trước khi thử lại.'
            : describeError(e);
      });
      if (stale) {
        await _load(); // số khay trống hoặc gói đã đổi: làm mới để người dùng chọn lại cho đúng
      }
    }
  }

  Future<void> _pickVariety() async {
    final choice = await showVarietySheet(context,
        repo: _repo, currentName: _variety.label, allowLater: true);
    if (choice != null && mounted) setState(() => _variety = choice);
  }

  void _backToForm() {
    setState(() {
      _result = null;
      _variety = const VarietyChoice.none();
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    if (result != null) {
      return _Success(
        result: result,
        onGoToTrays: () {
          widget.onGoToTrays();
          _backToForm();
        },
        onAgain: _backToForm,
      );
    }
    final data = _data;
    if (data == null) {
      if (_loadError != null) {
        return _Padded(children: [
          Notice('Không tải được danh sách gói. ${describeError(_loadError!)}',
              tone: NoticeTone.error),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
        ]);
      }
      return Center(
          child: _started || widget.active
              ? const CircularProgressIndicator()
              : const SizedBox.shrink());
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_loadError != null) ...[
            Notice('Chưa làm mới được. ${describeError(_loadError!)}',
                tone: NoticeTone.error),
            const SizedBox(height: 12)
          ],
          _body(data),
        ],
      ),
    );
  }

  Widget _body(PackageList data) {
    if (data.packages.isEmpty) {
      return const Notice(
          'Hiện chưa có gói thuê nào đang bán. Vui lòng quay lại sau.');
    }
    if (data.availableTrays < 1) {
      return const Notice(
          'Hiện chưa còn khay trống. Kéo xuống để làm mới, hoặc quay lại sau.');
    }
    final pkg = _selected;
    final total = pkg == null ? 0 : pkg.pricePerTray * _count;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Còn ${data.availableTrays} khay trống',
            key: const Key('available'),
            style: const TextStyle(color: AppColors.mute)),
        const SizedBox(height: 12),
        const Text('Chọn gói',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 8),
        for (final p in data.packages) ...[
          _PackageCard(
              pkg: p,
              selected: p.id == _selectedId,
              onTap: () => setState(() => _selectedId = p.id)),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 8),
        const Text('Giống nấm',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 8),
        _VarietyTile(choice: _variety, onTap: _pickVariety),
        const SizedBox(height: 20),
        const Text('Số khay',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 8),
        Row(
          children: [
            IconButton.outlined(
              key: const Key('count-minus'),
              tooltip: 'Bớt một khay',
              onPressed: _count > 1 ? () => setState(() => _count--) : null,
              icon: const Icon(Icons.remove),
            ),
            SizedBox(
                width: 56,
                child: Text('$_count',
                    key: const Key('count'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w600))),
            IconButton.outlined(
              key: const Key('count-plus'),
              tooltip: 'Thêm một khay',
              onPressed: _count < data.maxCount
                  ? () => setState(() => _count++)
                  : null,
              icon: const Icon(Icons.add),
            ),
            const SizedBox(width: 12),
            if (_count >= data.maxCount)
              Expanded(
                  child: Text(
                      data.maxCount >= maxTraysPerRental
                          ? 'Tối đa $maxTraysPerRental khay mỗi đơn'
                          : 'Đã chọn hết số khay còn trống',
                      style: const TextStyle(
                          color: AppColors.mute, fontSize: 13))),
          ],
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: AppColors.sporeSoft,
              borderRadius: BorderRadius.circular(8)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tổng cộng',
                  style: TextStyle(color: AppColors.sporeDeep)),
              Text(formatVnd(total),
                  key: const Key('total'),
                  style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: AppColors.sporeDeep)),
              if (pkg != null)
                Text(
                    '$_count khay × ${formatVnd(pkg.pricePerTray)} · ${pkg.durationDays} ngày kể từ hôm nay',
                    style: const TextStyle(
                        color: AppColors.sporeDeep, fontSize: 13)),
            ],
          ),
        ),
        if (_actionError != null) ...[
          const SizedBox(height: 12),
          Notice(_actionError!, tone: NoticeTone.error)
        ],
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('rent-submit'),
          onPressed: _busy || pkg == null ? null : _confirmAndRent,
          child: _busy
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2.5))
              : const Text('Thuê khay'),
        ),
      ],
    );
  }
}

class _Padded extends StatelessWidget {
  const _Padded({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(20), children: children);
}

class _VarietyTile extends StatelessWidget {
  const _VarietyTile({required this.choice, required this.onTap});

  final VarietyChoice choice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = choice.catalog;
    final String title =
        choice.isNone ? 'Chưa chọn (có thể chọn sau)' : choice.label!;
    final String? sub = c != null
        ? '${c.growthText} · ${c.tempText} · ${c.humText}'
        : (choice.needsApproval
            ? 'Giống ngoài danh mục: chờ nhân viên duyệt'
            : null);
    return InkWell(
      key: const Key('variety-tile'),
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: AppColors.paper,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.line)),
        child: Row(children: [
          const Icon(Icons.eco_outlined, color: AppColors.spore),
          const SizedBox(width: 12),
          Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                  key: const Key('variety-title'),
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: choice.isNone ? AppColors.mute : AppColors.ink)),
              if (sub != null)
                Text(sub,
                    style:
                        const TextStyle(color: AppColors.mute, fontSize: 13)),
            ]),
          ),
          Text(choice.isNone ? 'Chọn giống' : 'Đổi',
              style: const TextStyle(
                  color: AppColors.spore, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  const _PackageCard(
      {required this.pkg, required this.selected, required this.onTap});

  final RentalPackage pkg;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label:
          '${pkg.name}, ${pkg.durationDays} ngày, ${formatVnd(pkg.pricePerTray)} mỗi khay',
      child: ExcludeSemantics(
        child: InkWell(
          key: Key('package-${pkg.id}'),
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: selected ? AppColors.sporeSoft : AppColors.paper,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                  color: selected ? AppColors.spore : AppColors.line,
                  width: selected ? 2 : 1),
            ),
            child: Row(
              children: [
                Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                    color: selected ? AppColors.spore : AppColors.mute),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(pkg.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 16)),
                      Text('${pkg.durationDays} ngày',
                          style: const TextStyle(color: AppColors.mute)),
                    ],
                  ),
                ),
                Text('${formatVnd(pkg.pricePerTray)}\n/ khay',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Success extends StatelessWidget {
  const _Success(
      {required this.result, required this.onGoToTrays, required this.onAgain});

  final RentalResult result;
  final VoidCallback onGoToTrays;
  final VoidCallback onAgain;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.check_circle_outline,
                size: 56, color: AppColors.moss),
            const SizedBox(height: 12),
            Text('Thuê khay thành công',
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
                '${result.trayCount} khay, dùng đến hết ${formatDate(result.endDate)}',
                key: const Key('result-line'),
                textAlign: TextAlign.center),
            Text('Tổng ${formatVnd(result.totalAmount)}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.mute)),
            if (result.variety != null) ...[
              const SizedBox(height: 8),
              Text('Giống: ${result.variety}',
                  key: const Key('result-variety'),
                  textAlign: TextAlign.center),
              if (result.varietyPending)
                const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Notice(
                        'Giống này ngoài danh mục nên cần nhân viên duyệt. Bạn sẽ nhận thông báo khi có kết quả; nếu bị từ chối, bạn chọn lại giống khác trong màn Khay của tôi.',
                        tone: NoticeTone.info)),
            ],
            const SizedBox(height: 24),
            FilledButton(
                key: const Key('go-trays'),
                onPressed: onGoToTrays,
                child: const Text('Xem khay của tôi')),
            const SizedBox(height: 8),
            TextButton(
                key: const Key('rent-again'),
                onPressed: onAgain,
                child: const Text('Thuê thêm')),
          ],
        ),
      ),
    );
  }
}
