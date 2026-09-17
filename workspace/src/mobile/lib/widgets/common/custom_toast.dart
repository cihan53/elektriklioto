
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';

class CustomToast {
  CustomToast._();

  static void show(BuildContext context, String message, {bool isError = false}) {
    final colors = context.colors;

    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: AppTypography.bodySmallBold.copyWith(color: Colors.white),
        ),
        backgroundColor: isError ? colors.error : colors.textPrimary,
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        margin: const EdgeInsets.all(AppSpacing.s4),
      ),
    );
  }
}
