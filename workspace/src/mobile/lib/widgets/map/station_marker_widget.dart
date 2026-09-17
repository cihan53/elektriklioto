
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';
import '../../models/station_summary.dart';

class StationMarkerWidget extends StatelessWidget {
  final StationSummary station;
  final bool isSelected;
  final VoidCallback onTap;

  const StationMarkerWidget({
    Key? key,
    required this.station,
    required this.isSelected,
    required this.onTap,
  }) : super(key: key);

  Color _resolveOperatorColor(AppColorScheme colors, String slug) {
    switch (slug.toLowerCase()) {
      case 'zes':
        return colors.brandZes;
      case 'trugo':
        return colors.brandTrugo;
      case 'ecorun':
        return colors.brandEcorun;
      case 'voltrun':
        return colors.brandVoltrun;
      case 'sharz':
      case 'sharznet':
        return colors.brandSharz;
      case 'astor':
        return colors.brandAstor;
      case 'entek':
        return colors.brandEntek;
      default:
        return colors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final opColor = _resolveOperatorColor(colors, station.operatorSlug);

    final size = isSelected ? 40.0 : 32.0;

    return GestureDetector(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: AppTouchTarget.mobileConstraints,
        child: Center(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: opColor,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: opColor.withOpacity(isSelected ? 0.6 : 0.3),
                  blurRadius: isSelected ? 12 : 6,
                  spreadRadius: isSelected ? 2 : 0,
                ),
              ],
              border: Border.all(
                color: isSelected ? Colors.white : Colors.white.withOpacity(0.9),
                width: isSelected ? 3.0 : 2.0,
              ),
            ),
            child: Icon(
              station.isFlaggedDefective ? LucideIcons.triangle_alert : LucideIcons.zap,
              color: Colors.white,
              size: isSelected ? 22 : 16,
            ),
          ),
        ),
      ),
    );
  }
}
