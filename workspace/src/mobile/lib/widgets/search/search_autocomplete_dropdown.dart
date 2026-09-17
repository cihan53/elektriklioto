
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';
import '../../models/station_summary.dart';

class SearchAutocompleteDropdown extends StatelessWidget {
  final List<StationSummary> results;
  final ValueChanged<StationSummary> onSelected;

  const SearchAutocompleteDropdown({
    Key? key,
    required this.results,
    required this.onSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    if (results.isEmpty) return const SizedBox.shrink();

    return Container(
      constraints: const BoxConstraints(maxHeight: 280),
      decoration: BoxDecoration(
        color: colors.bgSurface,
        borderRadius: AppRadius.borderLg,
        boxShadow: AppElevation.card,
        border: Border.all(color: colors.borderDefault),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
        itemCount: results.length,
        separatorBuilder: (_, __) => Divider(height: 1, color: colors.borderSubtle),
        itemBuilder: (context, index) {
          final s = results[index];
          return ListTile(
            dense: true,
            leading: Icon(LucideIcons.map_pin, color: colors.primary, size: 20),
            title: Text(
              s.name ?? s.address,
              style: AppTypography.bodyMediumBold.copyWith(color: colors.textPrimary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              '${s.operatorName} • ${s.district}, ${s.city}',
              style: AppTypography.caption.copyWith(color: colors.textSecondary),
            ),
            onTap: () => onSelected(s),
          );
        },
      ),
    );
  }
}
