
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/storage/hive_storage_service.dart';
import '../../core/theme/tokens.dart';
import '../../models/station_summary.dart';

class FavoritesTabView extends StatefulWidget {
  const FavoritesTabView({Key? key}) : super(key: key);

  @override
  State<FavoritesTabView> createState() => _FavoritesTabViewState();
}

class _FavoritesTabViewState extends State<FavoritesTabView> {
  final _storage = HiveStorageService();
  List<StationSummary> _favorites = [];

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  void _loadFavorites() {
    setState(() {
      _favorites = _storage.getAllFavorites();
    });
  }

  Future<void> _remove(String id) async {
    await _storage.removeFavorite(id);
    _loadFavorites();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Favori İstasyonlarım',
          style: AppTypography.h2.copyWith(color: colors.textPrimary),
        ),
      ),
      body: _favorites.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.star_off, size: 48, color: colors.textMuted),
                  const SizedBox(height: AppSpacing.s3),
                  Text(
                    'Henüz favori istasyon eklemediniz.',
                    style: AppTypography.bodyMediumBold.copyWith(color: colors.textSecondary),
                  ),
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    'Haritadan istasyon seçip yıldıza dokunarak favorilerinize ekleyin.',
                    style: AppTypography.caption.copyWith(color: colors.textMuted),
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.s4),
              itemCount: _favorites.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s2),
              itemBuilder: (context, index) {
                final s = _favorites[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s4,
                      vertical: AppSpacing.s2,
                    ),
                    leading: CircleAvatar(
                      backgroundColor: colors.primaryLight,
                      child: Icon(LucideIcons.zap, color: colors.primary, size: 20),
                    ),
                    title: Text(
                      s.name ?? s.address,
                      style: AppTypography.bodyMediumBold.copyWith(color: colors.textPrimary),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${s.operatorName} • ${s.district}, ${s.city}',
                          style: AppTypography.bodySmall.copyWith(color: colors.textSecondary),
                        ),
                        Text(
                          'EPDK: ${s.istasyonNo}',
                          style: AppTypography.caption.copyWith(color: colors.textMuted),
                        ),
                      ],
                    ),
                    trailing: IconButton(
                      icon: const Icon(LucideIcons.trash, color: Colors.redAccent, size: 20),
                      onPressed: () => _remove(s.id),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
