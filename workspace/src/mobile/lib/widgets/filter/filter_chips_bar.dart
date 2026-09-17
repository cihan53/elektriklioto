
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';

class FilterChipsBar extends StatelessWidget {
  final String? selectedOperator;
  final bool isPublicOnly;
  final VoidCallback onOperatorFilterTap;
  final ValueChanged<bool> onPublicOnlyToggle;
  final Function(String) onLockedFilterTap;

  const FilterChipsBar({
    Key? key,
    this.selectedOperator,
    required this.isPublicOnly,
    required this.onOperatorFilterTap,
    required this.onPublicOnlyToggle,
    required this.onLockedFilterTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final opLabel = selectedOperator != null ? 'Operatör (1)' : 'Operatörler';

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s4,
        vertical: AppSpacing.s2,
      ),
      child: Row(
        children: [
          FilterChip(
            label: Text(opLabel),
            selected: selectedOperator != null,
            onSelected: (_) => onOperatorFilterTap(),
          ),
          const SizedBox(width: AppSpacing.s2),
          FilterChip(
            label: const Text('Halka Açık'),
            selected: isPublicOnly,
            onSelected: onPublicOnlyToggle,
          ),
          const SizedBox(width: AppSpacing.s2),
          _LockedFilterChip(
            label: 'Hızlı Şarj (DC)',
            onTap: () => onLockedFilterTap('Hızlı Şarj (DC)'),
          ),
          const SizedBox(width: AppSpacing.s2),
          _LockedFilterChip(
            label: 'Müsait İstasyonlar',
            onTap: () => onLockedFilterTap('Müsait İstasyonlar'),
          ),
          const SizedBox(width: AppSpacing.s2),
          _LockedFilterChip(
            label: 'Tarife Fiyatı',
            onTap: () => onLockedFilterTap('Tarife Fiyatı'),
          ),
        ],
      ),
    );
  }
}

class _LockedFilterChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _LockedFilterChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
        decoration: BoxDecoration(
          color: colors.bgCanvas,
          borderRadius: AppRadius.borderFull,
          border: Border.all(color: colors.borderDefault),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.lock_outline, size: 14, color: colors.textMuted),
            const SizedBox(width: 4),
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(color: colors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
