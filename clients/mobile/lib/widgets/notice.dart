import 'package:flutter/material.dart';

import '../theme.dart';

enum NoticeTone { info, error }

class Notice extends StatelessWidget {
  const Notice(this.text, {super.key, this.tone = NoticeTone.info});

  final String text;
  final NoticeTone tone;

  @override
  Widget build(BuildContext context) {
    final isError = tone == NoticeTone.error;
    final background = isError ? AppColors.brickSoft : AppColors.sporeSoft;
    final foreground = isError ? AppColors.brick : AppColors.sporeDeep;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: background, borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: foreground, height: 1.35)),
    );
  }
}
