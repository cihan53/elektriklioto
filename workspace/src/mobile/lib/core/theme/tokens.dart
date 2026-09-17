
import 'package:flutter/material.dart';

/// Semantik Tema Renk Şeması (ThemeExtension)
/// tasarim_sistemi.md spesifikasyonundaki semantik token karşılıklarıdır.
class AppColorScheme extends ThemeExtension<AppColorScheme> {
  final Color bgBase;
  final Color bgSurface;
  final Color bgElevated;
  final Color bgSubdued;
  final Color primary;
  final Color primaryHover;
  final Color primaryActive;
  final Color onPrimary;
  final Color onPrimaryDarkActive;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color borderDefault;
  final Color borderStrong;
  final Color focusRing;
  final Color success;
  final Color successSubdued;
  final Color warning;
  final Color warningSubdued;
  final Color danger;
  final Color dangerSubdued;
  final Color dangerOnSubdued;
  final Color missingText;
  final Color missingBg;

  // Geriye dönük uyumluluk ve bileşen alias alanları
  final Color primaryLight;
  final Color primaryDark;
  final Color primaryContainer;
  final Color textDisabled;
  final Color bgCanvas;
  final Color borderSubtle;
  final Color info;
  final Color acColor;
  final Color dcFast;
  final Color dcUltra;
  final Color brandZes;
  final Color brandTrugo;
  final Color brandEcorun;
  final Color brandVoltrun;
  final Color brandSharz;
  final Color brandAstor;
  final Color brandEntek;

  Color get error => danger;
  Color get errorSubdued => dangerSubdued;

  const AppColorScheme({
    required this.bgBase,
    required this.bgSurface,
    required this.bgElevated,
    required this.bgSubdued,
    required this.primary,
    required this.primaryHover,
    required this.primaryActive,
    required this.onPrimary,
    required this.onPrimaryDarkActive,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.borderDefault,
    required this.borderStrong,
    required this.focusRing,
    required this.success,
    required this.successSubdued,
    required this.warning,
    required this.warningSubdued,
    required this.danger,
    required this.dangerSubdued,
    required this.dangerOnSubdued,
    required this.missingText,
    required this.missingBg,
    this.primaryLight = const Color(0xFFEBF4FF),
    this.primaryDark = const Color(0xFF004C99),
    this.primaryContainer = const Color(0xFFD6E8FF),
    this.textDisabled = const Color(0xFFCBD5E1),
    this.bgCanvas = const Color(0xFFF1F5F9),
    this.borderSubtle = const Color(0xFFF1F5F9),
    this.info = const Color(0xFF0284C7),
    this.acColor = const Color(0xFF0284C7),
    this.dcFast = const Color(0xFFD97706),
    this.dcUltra = const Color(0xFF7C3AED),
    this.brandZes = const Color(0xFFE11925),
    this.brandTrugo = const Color(0xFF00B0FF),
    this.brandEcorun = const Color(0xFF00C853),
    this.brandVoltrun = const Color(0xFFFF6D00),
    this.brandSharz = const Color(0xFF1565C0),
    this.brandAstor = const Color(0xFFD32F2F),
    this.brandEntek = const Color(0xFF2E7D32),
  });

  @override
  AppColorScheme copyWith({
    Color? bgBase,
    Color? bgSurface,
    Color? bgElevated,
    Color? bgSubdued,
    Color? primary,
    Color? primaryHover,
    Color? primaryActive,
    Color? onPrimary,
    Color? onPrimaryDarkActive,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? borderDefault,
    Color? borderStrong,
    Color? focusRing,
    Color? success,
    Color? successSubdued,
    Color? warning,
    Color? warningSubdued,
    Color? danger,
    Color? dangerSubdued,
    Color? dangerOnSubdued,
    Color? missingText,
    Color? missingBg,
    Color? primaryLight,
    Color? primaryDark,
    Color? primaryContainer,
    Color? textDisabled,
    Color? bgCanvas,
    Color? borderSubtle,
    Color? info,
    Color? acColor,
    Color? dcFast,
    Color? dcUltra,
    Color? brandZes,
    Color? brandTrugo,
    Color? brandEcorun,
    Color? brandVoltrun,
    Color? brandSharz,
    Color? brandAstor,
    Color? brandEntek,
  }) {
    return AppColorScheme(
      bgBase: bgBase ?? this.bgBase,
      bgSurface: bgSurface ?? this.bgSurface,
      bgElevated: bgElevated ?? this.bgElevated,
      bgSubdued: bgSubdued ?? this.bgSubdued,
      primary: primary ?? this.primary,
      primaryHover: primaryHover ?? this.primaryHover,
      primaryActive: primaryActive ?? this.primaryActive,
      onPrimary: onPrimary ?? this.onPrimary,
      onPrimaryDarkActive: onPrimaryDarkActive ?? this.onPrimaryDarkActive,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      borderDefault: borderDefault ?? this.borderDefault,
      borderStrong: borderStrong ?? this.borderStrong,
      focusRing: focusRing ?? this.focusRing,
      success: success ?? this.success,
      successSubdued: successSubdued ?? this.successSubdued,
      warning: warning ?? this.warning,
      warningSubdued: warningSubdued ?? this.warningSubdued,
      danger: danger ?? this.danger,
      dangerSubdued: dangerSubdued ?? this.dangerSubdued,
      dangerOnSubdued: dangerOnSubdued ?? this.dangerOnSubdued,
      missingText: missingText ?? this.missingText,
      missingBg: missingBg ?? this.missingBg,
      primaryLight: primaryLight ?? this.primaryLight,
      primaryDark: primaryDark ?? this.primaryDark,
      primaryContainer: primaryContainer ?? this.primaryContainer,
      textDisabled: textDisabled ?? this.textDisabled,
      bgCanvas: bgCanvas ?? this.bgCanvas,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      info: info ?? this.info,
      acColor: acColor ?? this.acColor,
      dcFast: dcFast ?? this.dcFast,
      dcUltra: dcUltra ?? this.dcUltra,
      brandZes: brandZes ?? this.brandZes,
      brandTrugo: brandTrugo ?? this.brandTrugo,
      brandEcorun: brandEcorun ?? this.brandEcorun,
      brandVoltrun: brandVoltrun ?? this.brandVoltrun,
      brandSharz: brandSharz ?? this.brandSharz,
      brandAstor: brandAstor ?? this.brandAstor,
      brandEntek: brandEntek ?? this.brandEntek,
    );
  }

  @override
  AppColorScheme lerp(ThemeExtension<AppColorScheme>? other, double t) {
    if (other is! AppColorScheme) return this;
    return AppColorScheme(
      bgBase: Color.lerp(bgBase, other.bgBase, t)!,
      bgSurface: Color.lerp(bgSurface, other.bgSurface, t)!,
      bgElevated: Color.lerp(bgElevated, other.bgElevated, t)!,
      bgSubdued: Color.lerp(bgSubdued, other.bgSubdued, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      primaryHover: Color.lerp(primaryHover, other.primaryHover, t)!,
      primaryActive: Color.lerp(primaryActive, other.primaryActive, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      onPrimaryDarkActive: Color.lerp(onPrimaryDarkActive, other.onPrimaryDarkActive, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      borderDefault: Color.lerp(borderDefault, other.borderDefault, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      focusRing: Color.lerp(focusRing, other.focusRing, t)!,
      success: Color.lerp(success, other.success, t)!,
      successSubdued: Color.lerp(successSubdued, other.successSubdued, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningSubdued: Color.lerp(warningSubdued, other.warningSubdued, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerSubdued: Color.lerp(dangerSubdued, other.dangerSubdued, t)!,
      dangerOnSubdued: Color.lerp(dangerOnSubdued, other.dangerOnSubdued, t)!,
      missingText: Color.lerp(missingText, other.missingText, t)!,
      missingBg: Color.lerp(missingBg, other.missingBg, t)!,
      primaryLight: Color.lerp(primaryLight, other.primaryLight, t)!,
      primaryDark: Color.lerp(primaryDark, other.primaryDark, t)!,
      primaryContainer: Color.lerp(primaryContainer, other.primaryContainer, t)!,
      textDisabled: Color.lerp(textDisabled, other.textDisabled, t)!,
      bgCanvas: Color.lerp(bgCanvas, other.bgCanvas, t)!,
      borderSubtle: Color.lerp(borderSubtle, other.borderSubtle, t)!,
      info: Color.lerp(info, other.info, t)!,
      acColor: Color.lerp(acColor, other.acColor, t)!,
      dcFast: Color.lerp(dcFast, other.dcFast, t)!,
      dcUltra: Color.lerp(dcUltra, other.dcUltra, t)!,
      brandZes: Color.lerp(brandZes, other.brandZes, t)!,
      brandTrugo: Color.lerp(brandTrugo, other.brandTrugo, t)!,
      brandEcorun: Color.lerp(brandEcorun, other.brandEcorun, t)!,
      brandVoltrun: Color.lerp(brandVoltrun, other.brandVoltrun, t)!,
      brandSharz: Color.lerp(brandSharz, other.brandSharz, t)!,
      brandAstor: Color.lerp(brandAstor, other.brandAstor, t)!,
      brandEntek: Color.lerp(brandEntek, other.brandEntek, t)!,
    );
  }
}

class AppColors {
  AppColors._();

  static const AppColorScheme light = AppColorScheme(
    bgBase: Color(0xFFF8FAFC),
    bgSurface: Color(0xFFFFFFFF),
    bgElevated: Color(0xFFFFFFFF),
    bgSubdued: Color(0xFFF1F5F9),
    primary: Color(0xFF0066CC),
    primaryHover: Color(0xFF0052A3),
    primaryActive: Color(0xFF004080),
    onPrimary: Color(0xFFFFFFFF),
    onPrimaryDarkActive: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF0F172A),
    textSecondary: Color(0xFF475569),
    textMuted: Color(0xFF64748B),
    borderDefault: Color(0xFFE2E8F0),
    borderStrong: Color(0xFFCBD5E1),
    focusRing: Color(0xFF0066CC),
    success: Color(0xFF15803D),
    successSubdued: Color(0xFFDCFCE7),
    warning: Color(0xFFB45309),
    warningSubdued: Color(0xFFFEF3C7),
    danger: Color(0xFFB91C1C),
    dangerSubdued: Color(0xFFFEE2E2),
    dangerOnSubdued: Color(0xFFB91C1C),
    missingText: Color(0xFF334155),
    missingBg: Color(0xFFE2E8F0),
    primaryLight: Color(0xFFEBF4FF),
    primaryDark: Color(0xFF004C99),
    primaryContainer: Color(0xFFD6E8FF),
    textDisabled: Color(0xFFCBD5E1),
    bgCanvas: Color(0xFFF1F5F9),
    borderSubtle: Color(0xFFF1F5F9),
    info: Color(0xFF0284C7),
    acColor: Color(0xFF0284C7),
    dcFast: Color(0xFFD97706),
    dcUltra: Color(0xFF7C3AED),
    brandZes: Color(0xFFE11925),
    brandTrugo: Color(0xFF00B0FF),
    brandEcorun: Color(0xFF00C853),
    brandVoltrun: Color(0xFFFF6D00),
    brandSharz: Color(0xFF1565C0),
    brandAstor: Color(0xFFD32F2F),
    brandEntek: Color(0xFF2E7D32),
  );

  static const AppColorScheme dark = AppColorScheme(
    bgBase: Color(0xFF0B0F19),
    bgSurface: Color(0xFF0F172A),
    bgElevated: Color(0xFF1E293B),
    bgSubdued: Color(0xFF1E293B),
    primary: Color(0xFF38BDF8),
    primaryHover: Color(0xFF0284C7),
    primaryActive: Color(0xFF0369A1),
    onPrimary: Color(0xFF0B0F19),
    onPrimaryDarkActive: Color(0xFFFFFFFF),
    textPrimary: Color(0xFFF8FAFC),
    textSecondary: Color(0xFFCBD5E1),
    textMuted: Color(0xFF94A3B8),
    borderDefault: Color(0xFF1E293B),
    borderStrong: Color(0xFF334155),
    focusRing: Color(0xFF38BDF8),
    success: Color(0xFF4ADE80),
    successSubdued: Color(0xFF064E3B),
    warning: Color(0xFFFBBF24),
    warningSubdued: Color(0xFF78350F),
    danger: Color(0xFFF87171),
    dangerSubdued: Color(0xFF7F1D1D),
    dangerOnSubdued: Color(0xFFFEE2E2),
    missingText: Color(0xFFCBD5E1),
    missingBg: Color(0xFF334155),
    primaryLight: Color(0xFF0C2D48),
    primaryDark: Color(0xFF0284C7),
    primaryContainer: Color(0xFF075985),
    textDisabled: Color(0xFF334155),
    bgCanvas: Color(0xFF0F172A),
    borderSubtle: Color(0xFF172033),
    borderStrong: Color(0xFF334155),
    info: Color(0xFF38BDF8),
    acColor: Color(0xFF38BDF8),
    dcFast: Color(0xFFF59E0B),
    dcUltra: Color(0xFFA78BFA),
    brandZes: Color(0xFFEF4444),
    brandTrugo: Color(0xFF38BDF8),
    brandEcorun: Color(0xFF22C55E),
    brandVoltrun: Color(0xFFFB923C),
    brandSharz: Color(0xFF60A5FA),
    brandAstor: Color(0xFFF87171),
    brandEntek: Color(0xFF4ADE80),
  );

  static AppColorScheme of(BuildContext context) =>
      Theme.of(context).extension<AppColorScheme>() ?? light;

  static Color bgBase(BuildContext context) => of(context).bgBase;
  static Color bgSurface(BuildContext context) => of(context).bgSurface;
  static Color primary(BuildContext context) => of(context).primary;
}

extension AppThemeContext on BuildContext {
  AppColorScheme get colors => AppColors.of(this);
}

class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  static const TextStyle display = TextStyle(
    fontFamily: fontFamily,
    fontSize: 36,
    height: 44 / 36,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.72,
  );

  static const TextStyle h1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 30,
    height: 38 / 30,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.45,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    height: 32 / 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.24,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    height: 28 / 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.10,
  );

  static const TextStyle h4 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    height: 24 / 18,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle bodyMediumBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.12,
  );

  static const TextStyle bodySmallBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    height: 14 / 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.22,
  );

  static const TextStyle badge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w600,
    height: 1.2,
    letterSpacing: 0.2,
  );

  static const TextStyle mono = TextStyle(
    fontFamily: 'Courier',
    fontFamilyFallback: ['monospace', 'Roboto Mono'],
    fontSize: 13,
    height: 18 / 13,
    fontWeight: FontWeight.w500,
  );
}

class AppSpacing {
  AppSpacing._();
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 20.0;
  static const double s6 = 24.0;
  static const double s8 = 32.0;
  static const double s10 = 40.0;
  static const double s12 = 48.0;
}

class AppRadius {
  AppRadius._();
  static const Radius none = Radius.zero;
  static const Radius sm = Radius.circular(4.0);
  static const Radius md = Radius.circular(8.0);
  static const Radius lg = Radius.circular(12.0);
  static const Radius xl = Radius.circular(16.0);
  static const Radius full = Radius.circular(9999.0);

  static const BorderRadius borderSm = BorderRadius.all(sm);
  static const BorderRadius borderMd = BorderRadius.all(md);
  static const BorderRadius borderLg = BorderRadius.all(lg);
  static const BorderRadius borderXl = BorderRadius.all(xl);
  static const BorderRadius borderFull = BorderRadius.all(full);

  static const BorderRadius sheetTopXl = BorderRadius.vertical(top: xl);
  static const BorderRadius sheetTop = BorderRadius.vertical(top: lg);
}

class AppElevation {
  AppElevation._();

  static const List<BoxShadow> shadowNone = [];
  static const List<BoxShadow> shadowSmLight = [
    BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
  ];
  static const List<BoxShadow> shadowMdLight = [
    BoxShadow(color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 4), spreadRadius: -1),
  ];
  static const List<BoxShadow> shadowLgLight = [
    BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10), spreadRadius: -3),
  ];
  static const List<BoxShadow> shadowXlLight = [
    BoxShadow(color: Color(0x1F000000), blurRadius: 25, offset: Offset(0, 20), spreadRadius: -5),
  ];

  static const List<BoxShadow> shadowSmDark = [
    BoxShadow(color: Color(0x66000000), blurRadius: 2, offset: Offset(0, 1)),
  ];
  static const List<BoxShadow> shadowMdDark = [
    BoxShadow(color: Color(0x80000000), blurRadius: 6, offset: Offset(0, 4), spreadRadius: -1),
  ];
  static const List<BoxShadow> shadowLgDark = [
    BoxShadow(color: Color(0x99000000), blurRadius: 15, offset: Offset(0, 10), spreadRadius: -3),
  ];
  static const List<BoxShadow> shadowXlDark = [
    BoxShadow(color: Color(0xB3000000), blurRadius: 25, offset: Offset(0, 20), spreadRadius: -5),
  ];

  static const List<BoxShadow> none = shadowNone;
  static const List<BoxShadow> card = shadowMdLight;
  static const List<BoxShadow> sheet = shadowXlLight;
}

class AppTouchTarget {
  AppTouchTarget._();
  static const double minWeb = 44.0;
  static const double minMobile = 48.0;
  static const BoxConstraints mobileConstraints = BoxConstraints(
    minWidth: minMobile,
    minHeight: minMobile,
  );
}
