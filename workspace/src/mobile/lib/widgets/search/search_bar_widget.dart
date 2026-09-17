
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';

class SearchBarWidget extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final bool hasFocus;

  const SearchBarWidget({
    Key? key,
    required this.controller,
    required this.onChanged,
    required this.onClear,
    this.hasFocus = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: colors.bgSurface,
        borderRadius: AppRadius.borderLg,
        boxShadow: AppElevation.card,
        border: Border.all(
          color: hasFocus ? colors.primary : colors.borderDefault,
          width: hasFocus ? 1.5 : 1.0,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
      child: Row(
        children: [
          Icon(LucideIcons.search, color: colors.textMuted, size: 20),
          const SizedBox(width: AppSpacing.s2),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: AppTypography.bodyMedium.copyWith(color: colors.textPrimary),
              decoration: InputDecoration(
                hintText: 'İlçe, şehir veya operatör ara...',
                hintStyle: AppTypography.bodyMedium.copyWith(color: colors.textMuted),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            GestureDetector(
              onTap: onClear,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                child: Icon(LucideIcons.x, color: colors.textMuted, size: 18),
              ),
            ),
        ],
      ),
    );
  }
}
