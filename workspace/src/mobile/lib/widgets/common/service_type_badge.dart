
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';

class ServiceTypeBadge extends StatelessWidget {
  final bool isPublic;

  const ServiceTypeBadge({super.key, required this.isPublic});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final bg = isPublic ? colors.primaryLight : colors.bgCanvas;
    final fg = isPublic ? colors.primary : colors.textMuted;
    final label = isPublic ? 'Halka Açık' : 'Özel / Kısıtlı';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s2,
        vertical: AppSpacing.s1 / 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.borderSm,
        border: Border.all(color: fg.withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: AppTypography.badge.copyWith(color: fg),
      ),
    );
  }
}
