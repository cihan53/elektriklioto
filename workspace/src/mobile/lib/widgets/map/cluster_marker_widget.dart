
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';
import '../../models/station_summary.dart';

class ClusterMarkerWidget extends StatelessWidget {
  final ClusterSummary cluster;
  final VoidCallback onTap;

  const ClusterMarkerWidget({
    Key? key,
    required this.cluster,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final count = cluster.count;

    double size;
    Color bg;
    TextStyle style;

    if (count < 10) {
      size = 36.0;
      bg = const Color(0xFF0066CC);
      style = AppTypography.caption.copyWith(color: Colors.white, fontWeight: FontWeight.bold);
    } else if (count < 100) {
      size = 44.0;
      bg = const Color(0xFF0052A3);
      style = AppTypography.bodySmall.copyWith(color: Colors.white, fontWeight: FontWeight.bold);
    } else {
      size = 52.0;
      bg = Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF38BDF8)
          : const Color(0xFF0F172A);
      style = AppTypography.bodyMediumBold.copyWith(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF0F172A)
            : Colors.white,
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: AppTouchTarget.mobileConstraints,
        child: Center(
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: bg,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: bg.withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ],
              border: Border.all(
                color: Colors.white.withOpacity(0.8),
                width: 2.5,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              '$count',
              style: style,
            ),
          ),
        ),
      ),
    );
  }
}
