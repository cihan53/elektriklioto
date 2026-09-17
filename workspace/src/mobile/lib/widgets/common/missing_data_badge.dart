
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';

class MissingDataBadge extends StatelessWidget {
  final VoidCallback onContributeTap;

  const MissingDataBadge({super.key, required this.onContributeTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s2,
            vertical: 4.0,
          ),
          decoration: BoxDecoration(
            color: colors.missingBg,
            borderRadius: AppRadius.borderSm,
            border: Border.all(color: colors.borderDefault),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.circle_question_mark, size: 12, color: colors.missingText),
              const SizedBox(width: 4),
              Text(
                'Operatör Verisi Bekleniyor',
                style: AppTypography.caption.copyWith(color: colors.missingText),
              ),
            ],
          ),
        ),
        const SizedBox(width: AppSpacing.s2),
        ConstrainedBox(
          constraints: AppTouchTarget.mobileConstraints,
          child: TextButton(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s2),
              minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
            ),
            onPressed: onContributeTap,
            child: Text(
              '+ Bilgi Ekle',
              style: AppTypography.bodySmallBold.copyWith(color: colors.primary),
            ),
          ),
        ),
      ],
    );
  }
}
