
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';

class LocationFabWidget extends StatelessWidget {
  final VoidCallback onPressed;

  const LocationFabWidget({Key? key, required this.onPressed}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return ConstrainedBox(
      constraints: AppTouchTarget.mobileConstraints,
      child: FloatingActionButton(
        onPressed: onPressed,
        mini: false,
        backgroundColor: colors.bgSurface,
        foregroundColor: colors.primary,
        elevation: 3,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderFull),
        tooltip: 'Mevcut Konumuma Git (Yalnızca Cihaz İçi)',
        child: const Icon(LucideIcons.locate_fixed, size: 22),
      ),
    );
  }
}
