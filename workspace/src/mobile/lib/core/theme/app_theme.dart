
import 'package:flutter/material.dart';
import 'tokens.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    final colors = AppColors.light;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: colors.primary,
      scaffoldBackgroundColor: colors.bgBase,
      extensions: const [AppColors.light],
      colorScheme: ColorScheme.light(
        primary: colors.primary,
        onPrimary: Colors.white,
        primaryContainer: colors.primaryContainer,
        surface: colors.bgSurface,
        onSurface: colors.textPrimary,
        error: colors.error,
        onError: Colors.white,
      ),
      fontFamily: AppTypography.fontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.bgSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 1,
      ),
      cardTheme: CardTheme(
        color: colors.bgSurface,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
          side: BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          backgroundColor: colors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          textStyle: AppTypography.bodyMediumBold,
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.borderDefault),
          textStyle: AppTypography.bodyMediumBold,
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          foregroundColor: colors.primary,
          textStyle: AppTypography.bodyMediumBold,
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    final colors = AppColors.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: colors.primary,
      scaffoldBackgroundColor: colors.bgBase,
      extensions: const [AppColors.dark],
      colorScheme: ColorScheme.dark(
        primary: colors.primary,
        onPrimary: colors.bgBase,
        primaryContainer: colors.primaryContainer,
        surface: colors.bgSurface,
        onSurface: colors.textPrimary,
        error: colors.error,
        onError: Colors.white,
      ),
      fontFamily: AppTypography.fontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.bgSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 1,
      ),
      cardTheme: CardTheme(
        color: colors.bgSurface,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
          side: BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          backgroundColor: colors.primary,
          foregroundColor: colors.bgBase,
          elevation: 0,
          textStyle: AppTypography.bodyMediumBold,
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.borderDefault),
          textStyle: AppTypography.bodyMediumBold,
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(AppTouchTarget.minMobile, AppTouchTarget.minMobile),
          foregroundColor: colors.primary,
          textStyle: AppTypography.bodyMediumBold,
        ),
      ),
    );
  }
}
