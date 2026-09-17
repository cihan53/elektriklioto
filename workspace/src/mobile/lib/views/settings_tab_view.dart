
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../bloc/theme/theme_cubit.dart';
import '../../bloc/theme/theme_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/storage/hive_storage_service.dart';
import '../../core/theme/tokens.dart';
import '../widgets/common/custom_toast.dart';

class SettingsTabView extends StatelessWidget {
  const SettingsTabView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final storage = HiveStorageService();
    final cacheMb = storage.getEstimatedCacheSizeMb();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Ayarlar',
          style: AppTypography.h2.copyWith(color: colors.textPrimary),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.s5),
        children: [
          Text('Görünüm', style: AppTypography.h4.copyWith(color: colors.textPrimary)),
          const SizedBox(height: AppSpacing.s2),
          BlocBuilder<ThemeCubit, ThemeState>(
            builder: (context, state) {
              return SegmentedButton<ThemeMode>(
                segments: const [
                  ButtonSegment(value: ThemeMode.system, label: Text('Sistem')),
                  ButtonSegment(value: ThemeMode.light, label: Text('Açık')),
                  ButtonSegment(value: ThemeMode.dark, label: Text('Koyu')),
                ],
                selected: {state.themeMode},
                onSelectionChanged: (set) {
                  context.read<ThemeCubit>().setThemeMode(set.first);
                },
              );
            },
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            'Gece sürüşünde göz kamaşmasını önlemek için Koyu temayı tercih edebilirsiniz.',
            style: AppTypography.caption.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.s6),

          Text('Veri ve Önbellek', style: AppTypography.h4.copyWith(color: colors.textPrimary)),
          const SizedBox(height: AppSpacing.s2),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(LucideIcons.hard_drive, color: colors.primary),
            title: const Text('Kayıtlı Çevrimdışı Veri'),
            subtitle: Text('${cacheMb.toStringAsFixed(1)} MB önbellek kullanılıyor'),
            trailing: OutlinedButton(
              onPressed: () async {
                await storage.clearAllCache();
                CustomToast.show(context, 'Önbellek temizlendi.');
              },
              child: const Text('Temizle'),
            ),
          ),
          const SizedBox(height: AppSpacing.s6),

          Text('Yasal Bilgiler', style: AppTypography.h4.copyWith(color: colors.textPrimary)),
          const SizedBox(height: AppSpacing.s2),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(LucideIcons.shield, color: colors.success),
            title: const Text('Hakkımızda ve Yasal Statü'),
            subtitle: const Text('Platform bir e-Mobilite Asistanıdır; lisanslı şarj operatörü değildir.'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(LucideIcons.map_pin_off, color: colors.primary),
            title: const Text('Konum Gizliliği ve KVKK'),
            subtitle: const Text('GPS koordinatlarınız sunucuya iletilmez ve saklanmaz.'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(LucideIcons.database, color: colors.textSecondary),
            title: const Text('EPDK Veri Kaynak Beyanı'),
            subtitle: const Text('16.788 istasyon EPDK sicil kaydıyla tohumlanmıştır.'),
          ),
          const SizedBox(height: AppSpacing.s8),

          Center(
            child: Text(
              '${AppConstants.appName} ${AppConstants.appVersion}',
              style: AppTypography.bodySmall.copyWith(color: colors.textMuted),
            ),
          ),
          const SizedBox(height: AppSpacing.s6),
        ],
      ),
    );
  }
}
