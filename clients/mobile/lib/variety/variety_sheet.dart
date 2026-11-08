import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../rent/rental_repository.dart';
import '../theme.dart';
import '../widgets/notice.dart';
import 'variety_models.dart';

/// Độ dài tối đa của tên giống (khớp backend).
const int maxVarietyNameLength = 100;

String _normalize(String s) => s.trim().split(RegExp(r'\s+')).join(' ');

/// Bảng chọn giống: danh sách giống trong danh mục kèm thông tin, hoặc nhập tên giống khác (cần nhân viên duyệt).
/// Trả về null nếu người dùng đóng bảng mà không chọn. [allowLater] bật nút "Chọn sau" (khi thuê khay).
Future<VarietyChoice?> showVarietySheet(BuildContext context,
    {required RentalRepository repo,
    String? currentName,
    bool allowLater = false}) {
  return showModalBottomSheet<VarietyChoice>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => _VarietySheet(
        repo: repo, currentName: currentName, allowLater: allowLater),
  );
}

class _VarietySheet extends StatefulWidget {
  const _VarietySheet(
      {required this.repo,
      required this.currentName,
      required this.allowLater});

  final RentalRepository repo;
  final String? currentName;
  final bool allowLater;

  @override
  State<_VarietySheet> createState() => _VarietySheetState();
}

class _VarietySheetState extends State<_VarietySheet> {
  List<Variety>? _items;
  Object? _error;
  final _custom = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _custom.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await widget.repo.varieties();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return SizedBox(
      height: media.size.height * 0.85,
      child: Padding(
        padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          children: [
            const Text('Chọn giống nấm',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text(
                'Số liệu chỉ để tham khảo. Giống nào hợp với phòng của bạn sẽ do nhân viên hướng dẫn thêm.',
                style: TextStyle(color: AppColors.mute, fontSize: 13)),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Notice(
                  'Không tải được danh sách giống. ${describeError(_error!)}',
                  tone: NoticeTone.error),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
            ] else if (_items == null)
              const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()))
            else if (_items!.isEmpty)
              const Text(
                  'Chưa có giống nào trong danh mục. Bạn có thể nhập tên giống bên dưới.',
                  key: Key('variety-empty'),
                  style: TextStyle(color: AppColors.mute))
            else
              for (final v in _items!) ...[
                _VarietyCard(
                    variety: v,
                    selected: v.name == widget.currentName,
                    onTap: () =>
                        Navigator.of(context).pop(VarietyChoice.catalog(v))),
                const SizedBox(height: 8),
              ],
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            const Text('Giống khác',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 4),
            const Text(
                'Giống không có trong danh mục cần nhân viên duyệt. Khay vẫn được thuê, nhưng chưa sang giai đoạn tiếp theo cho đến khi giống được duyệt.',
                style: TextStyle(color: AppColors.mute, fontSize: 13)),
            const SizedBox(height: 8),
            // Không đặt maxLength/inputFormatters và không setState khi gõ: trên Android, bộ gõ tiếng Việt (VNI/Telex) sửa lại các
            // ký tự vừa gõ trong vùng "composing"; khi ô nhập bị chặn độ dài hoặc dựng lại giữa chừng, bộ gõ bị lệch và rơi mất chữ
            // ("nam61 rom7" thành "m rm"). Độ dài được kiểm ở nút bên dưới, chỉ phần nút dựng lại theo nội dung.
            TextField(
              key: const Key('custom-variety'),
              controller: _custom,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                  labelText: 'Tên giống nấm', border: OutlineInputBorder()),
            ),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _custom,
              builder: (context, value, _) {
                final name = _normalize(value.text);
                final tooLong = name.length > maxVarietyNameLength;
                return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (tooLong)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                              'Tên giống tối đa $maxVarietyNameLength ký tự (đang ${name.length}).',
                              key: const Key('custom-too-long'),
                              style: const TextStyle(
                                  color: AppColors.brick, fontSize: 13)),
                        ),
                      const SizedBox(height: 8),
                      FilledButton(
                        key: const Key('custom-submit'),
                        onPressed: name.isEmpty || tooLong
                            ? null
                            : () => Navigator.of(context)
                                .pop(VarietyChoice.custom(name)),
                        child: const Text('Dùng giống này'),
                      ),
                    ]);
              },
            ),
            if (widget.allowLater) ...[
              const SizedBox(height: 8),
              TextButton(
                  key: const Key('variety-later'),
                  onPressed: () =>
                      Navigator.of(context).pop(const VarietyChoice.none()),
                  child: const Text('Chọn sau')),
            ],
          ],
        ),
      ),
    );
  }
}

class _VarietyCard extends StatelessWidget {
  const _VarietyCard(
      {required this.variety, required this.selected, required this.onTap});

  final Variety variety;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label:
          '${variety.name}, sinh trưởng ${variety.growthText}, ${variety.tempText}, ${variety.humText}',
      child: ExcludeSemantics(
        child: InkWell(
          key: Key('variety-${variety.id}'),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(variety.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16)),
                if (variety.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(variety.description,
                      style: const TextStyle(fontSize: 14))
                ],
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 6, children: [
                  _Chip(Icons.schedule, variety.growthText),
                  _Chip(Icons.thermostat, variety.tempText),
                  _Chip(Icons.water_drop_outlined, variety.humText)
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.icon, this.text);

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: AppColors.spore),
        const SizedBox(width: 4),
        Text(text,
            style: const TextStyle(fontSize: 13, color: AppColors.sporeDeep)),
      ]);
}
