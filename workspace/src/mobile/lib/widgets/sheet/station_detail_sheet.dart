
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../bloc/station_detail/station_detail_bloc.dart';
import '../../bloc/station_detail/station_detail_event.dart';
import '../../bloc/station_detail/station_detail_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/tokens.dart';
import '../common/custom_toast.dart';
import '../common/missing_data_badge.dart';
import '../common/service_type_badge.dart';
import '../../models/station_summary.dart';
import '../../services/deeplink_service.dart';

/// SCR-02: İstasyon Detay Görünümü — 3 Kademeli Alt Çekmece (StationDetailSheet)
/// Kademeler:
/// - Kademe 1 (Peek: ~160pt): Tutamaç, İstasyon/Operatör adı, EPDK kodu, Birincil CTA.
/// - Kademe 2 (Half: ~380pt): Hizmet şekli, Eksik veri rozetleri, Açık Adres, Yol Tarifi.
/// - Kademe 3 (Full: ~90% ekran): Soket/güç detayları, Arıza bildir CTA, EMP yasal beyanı.
class StationDetailSheet extends StatelessWidget {
  final StationSummary summary;
  final VoidCallback onReportTap;
  final VoidCallback onContributeTap;
  final VoidCallback onClose;
  final double? distanceMeters;

  const StationDetailSheet({
    super.key,
    required this.summary,
    required this.onReportTap,
    required this.onContributeTap,
    required this.onClose,
    this.distanceMeters,
  });

  Future<void> _openNavigation(double lat, double lon) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lon');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return BlocBuilder<StationDetailBloc, StationDetailState>(
      builder: (context, state) {
        final isFav = state.isFavorite;
        final detail = state.detail;

        return DraggableScrollableSheet(
          initialChildSize: 0.28,
          minChildSize: 0.20,
          maxChildSize: 0.90,
          snap: true,
          snapSizes: const [0.22, 0.50, 0.90],
          builder: (context, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: colors.bgSurface,
                borderRadius: AppRadius.sheetTopXl,
                boxShadow: AppElevation.sheet,
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s5,
                  vertical: AppSpacing.s3,
                ),
                children: [
                  // 1. Çekmece Tutamacı (36x4px, radius 9999px)
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: colors.borderStrong,
                        borderRadius: AppRadius.borderFull,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s3),

                  // 2. Başlık ve Operatör / EPDK Bloğu
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  summary.operatorName,
                                  style: AppTypography.bodySmallBold.copyWith(
                                    color: colors.primary,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.s2),
                                // EPDK Sicil Rozeti (13px Mono)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: colors.bgCanvas,
                                    borderRadius: AppRadius.borderSm,
                                    border: Border.all(color: colors.borderDefault),
                                  ),
                                  child: Text(
                                    summary.istasyonNo.isNotEmpty
                                        ? 'EPDK: ${summary.istasyonNo}'
                                        : 'EPDK Sicilsiz',
                                    style: AppTypography.mono.copyWith(
                                      fontSize: 11,
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.s1),
                            Text(
                              summary.name ?? summary.address,
                              style: AppTypography.h3.copyWith(color: colors.textPrimary),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      // Favori Butonu (Dokunma hedefi >= 48x48pt)
                      ConstrainedBox(
                        constraints: AppTouchTarget.mobileConstraints,
                        child: IconButton(
                          icon: Icon(
                            isFav ? Icons.star : Icons.star_border,
                            color: isFav ? Colors.amber : colors.textMuted,
                            size: 24,
                          ),
                          onPressed: () {
                            context
                                .read<StationDetailBloc>()
                                .add(StationDetailFavoriteToggled(summary));
                          },
                        ),
                      ),
                      // Kapatma Butonu (Dokunma hedefi >= 48x48pt)
                      ConstrainedBox(
                        constraints: AppTouchTarget.mobileConstraints,
                        child: IconButton(
                          icon: Icon(Icons.close, color: colors.textMuted),
                          onPressed: onClose,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s2),

                  // 3. Durum, Hizmet ve Mesafe Rozetleri
                  Row(
                    children: [
                      ServiceTypeBadge(isPublic: summary.isPublic),
                      if (distanceMeters != null) ...[
                        const SizedBox(width: AppSpacing.s2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 3),
                          decoration: BoxDecoration(
                            color: colors.primaryLight,
                            borderRadius: AppRadius.borderSm,
                          ),
                          child: Text(
                            '~${(distanceMeters! / 1000).toStringAsFixed(1)} km',
                            style: AppTypography.caption.copyWith(color: colors.primary),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s3),

                  // Arızalı Rozeti (3+ Doğrulanmış İhbar)
                  if (summary.isFlaggedDefective) ...[
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.s3),
                      decoration: BoxDecoration(
                        color: colors.error.withValues(alpha: 0.1),
                        borderRadius: AppRadius.borderMd,
                        border: Border.all(color: colors.error.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(LucideIcons.triangle_alert, color: colors.error, size: 20),
                          const SizedBox(width: AppSpacing.s2),
                          Expanded(
                            child: Text(
                              'Arıza Bildirildi (3+ Doğrulama) — İstasyon riskli veya kapalı olabilir.',
                              style: AppTypography.bodySmallBold.copyWith(color: colors.error),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.s3),
                  ],

                  // 4. Birincil CTA Butonu ("Operatörde Aç / Şarja Başla" - 48pt, min 48x48pt)
                  ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48, minWidth: double.infinity),
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.primary,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 48),
                        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s5, vertical: AppSpacing.s3),
                      ),
                      onPressed: detail != null
                          ? () => DeepLinkService.launchOperator(
                                station: detail,
                                onShowToast: (msg) => CustomToast.show(context, msg),
                              )
                          : null,
                      icon: const Icon(LucideIcons.zap, size: 20),
                      label: Text(
                        'Operatörde Aç / Şarja Başla',
                        style: AppTypography.bodyMediumBold.copyWith(color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s3),

                  // 5. İkincil Buton Grubu (Yol Tarifi)
                  Row(
                    children: [
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 48),
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                              shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                              side: BorderSide(color: colors.borderDefault),
                            ),
                            onPressed: () => _openNavigation(summary.lat, summary.lon),
                            icon: Icon(LucideIcons.navigation, size: 18, color: colors.primary),
                            label: Text(
                              'Yol Tarifi Al',
                              style: AppTypography.bodyMediumBold.copyWith(color: colors.textPrimary),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s4),

                  const Divider(),
                  const SizedBox(height: AppSpacing.s2),

                  // 6. Açık Adres ve Konum
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(LucideIcons.map_pin, size: 18, color: colors.textSecondary),
                      const SizedBox(width: AppSpacing.s2),
                      Expanded(
                        child: Text(
                          summary.address.isNotEmpty
                              ? summary.address
                              : '${summary.district}, ${summary.city}',
                          style: AppTypography.bodyMedium.copyWith(color: colors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s4),

                  // 7. Eksik Veri Bölümü (> VERİ YOK: Faz 1 Kuralı)
                  const Text('Soket ve Güç Bilgileri', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.s2),

                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: Icon(LucideIcons.plug, color: colors.textMuted),
                    title: const Text('Soket Tipi ve Güç'),
                    trailing: MissingDataBadge(onContributeTap: onContributeTap),
                  ),

                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: Icon(LucideIcons.coins, color: colors.textMuted),
                    title: const Text('Tarife'),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: colors.bgCanvas,
                        borderRadius: AppRadius.borderSm,
                        border: Border.all(color: colors.borderDefault),
                      ),
                      child: Text(
                        'Operatör Verisi Bekleniyor',
                        style: AppTypography.caption.copyWith(color: colors.textMuted),
                      ),
                    ),
                  ),

                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    leading: Icon(LucideIcons.activity, color: colors.textMuted),
                    title: const Text('Canlı Doluluk'),
                    trailing: Text(
                      'Canlı durum verisi henüz açılmadı',
                      style: AppTypography.bodySmall.copyWith(color: colors.textMuted),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.s4),
                  const Divider(),
                  const SizedBox(height: AppSpacing.s2),

                  // 8. Topluluk ve Arıza Bildirimi
                  const Text('Topluluk Katkısı', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.s2),

                  Row(
                    children: [
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 48),
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                              shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                              side: BorderSide(color: colors.error.withValues(alpha: 0.5)),
                            ),
                            onPressed: onReportTap,
                            icon: Icon(LucideIcons.flag, size: 16, color: colors.error),
                            label: Text(
                              'Arıza Bildir',
                              style: AppTypography.bodySmallBold.copyWith(color: colors.error),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.s3),
                      Expanded(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 48),
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                              shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                              side: BorderSide(color: colors.primary.withValues(alpha: 0.5)),
                            ),
                            onPressed: onContributeTap,
                            icon: Icon(LucideIcons.circle_plus, size: 16, color: colors.primary),
                            label: Text(
                              'Bilgi Ekle',
                              style: AppTypography.bodySmallBold.copyWith(color: colors.primary),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s5),

                  // 9. Veri Tazelik ve Yasal EMP Beyanı
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.s3),
                    decoration: BoxDecoration(
                      color: colors.bgCanvas,
                      borderRadius: AppRadius.borderMd,
                      border: Border.all(color: colors.borderDefault),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(LucideIcons.shield_check, size: 16, color: colors.success),
                            const SizedBox(width: 6),
                            Text(
                              'Yasal Bilgilendirme',
                              style: AppTypography.caption.copyWith(
                                fontWeight: FontWeight.bold,
                                color: colors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.s1),
                        Text(
                          AppConstants.legalEmpDisclaimer,
                          style: AppTypography.caption.copyWith(color: colors.textSecondary),
                        ),
                        const SizedBox(height: AppSpacing.s2),
                        Text(
                          'Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)',
                          style: AppTypography.bodySmall.copyWith(color: colors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s8),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
