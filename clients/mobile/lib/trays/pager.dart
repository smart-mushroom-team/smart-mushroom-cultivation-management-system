import 'package:flutter/material.dart';

import '../theme.dart';

/// Số trang cần để chứa [total] mục, mỗi trang [size] mục (luôn ít nhất 1 trang).
int pageCountOf(int total, int size) => total <= 0 ? 1 : (total + size - 1) ~/ size;

/// Các mục của trang [page] (đếm từ 1); [page] ngoài phạm vi được kéo về trang hợp lệ gần nhất.
List<T> pageSlice<T>(List<T> items, int page, int size) {
  final p = page.clamp(1, pageCountOf(items.length, size));
  final start = (p - 1) * size;
  final end = start + size > items.length ? items.length : start + size;
  return items.sublist(start, end);
}

/// Thanh chuyển trang: "Trước", ô nhập số trang "n / tổng", "Sau". Ẩn khi chỉ có một trang.
/// Nhập số trang rồi bấm xong hoặc rời ô để nhảy; số không hợp lệ thì về trang 1.
class Pager extends StatefulWidget {
  const Pager({super.key, required this.page, required this.pages, required this.onChanged});

  final int page;
  final int pages;
  final ValueChanged<int> onChanged;

  @override
  State<Pager> createState() => _PagerState();
}

class _PagerState extends State<Pager> {
  late final TextEditingController _controller = TextEditingController(text: '${widget.page}');
  final FocusNode _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (!_focus.hasFocus) _commit();
    });
  }

  @override
  void didUpdateWidget(Pager old) {
    super.didUpdateWidget(old);
    if (!_focus.hasFocus && _controller.text != '${widget.page}') _controller.text = '${widget.page}';
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _commit() {
    final parsed = int.tryParse(_controller.text.trim());
    final target = (parsed == null || parsed < 1 || parsed > widget.pages) ? 1 : parsed;
    _controller.text = '$target';
    if (target != widget.page) widget.onChanged(target);
  }

  void _go(int target) {
    _focus.unfocus();
    _controller.text = '$target';
    widget.onChanged(target);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.pages <= 1) return const SizedBox.shrink();
    final page = widget.page;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          OutlinedButton(
            key: const Key('pager-prev'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(72, 44)),
            onPressed: page > 1 ? () => _go(page - 1) : null,
            child: const Text('Trước'),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            height: 44,
            decoration: BoxDecoration(color: AppColors.paper, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.line)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              SizedBox(
                width: 36,
                child: TextField(
                  key: const Key('pager-input'),
                  controller: _controller,
                  focusNode: _focus,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _commit(),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.spore),
                  decoration: const InputDecoration(isDense: true, border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, filled: false, contentPadding: EdgeInsets.zero),
                ),
              ),
              Text('/ ${widget.pages}', key: const Key('pager-total'), style: const TextStyle(color: AppColors.mute)),
            ]),
          ),
          const SizedBox(width: 12),
          OutlinedButton(
            key: const Key('pager-next'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(72, 44)),
            onPressed: page < widget.pages ? () => _go(page + 1) : null,
            child: const Text('Sau'),
          ),
        ],
      ),
    );
  }
}
