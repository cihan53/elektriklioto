
import 'package:hive_ce_flutter/hive_flutter.dart';
import '../../models/station_summary.dart';

class HiveStorageService {
  static const String stationCacheBoxName = 'station_cache';
  static const String favoritesBoxName = 'favorites_cache';
  static const String settingsBoxName = 'settings_cache';

  static final HiveStorageService _instance = HiveStorageService._internal();
  factory HiveStorageService() => _instance;
  HiveStorageService._internal();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;
    await Hive.initFlutter();
    await Hive.openBox(stationCacheBoxName);
    await Hive.openBox(favoritesBoxName);
    await Hive.openBox(settingsBoxName);
    _isInitialized = true;
  }

  Box get _stationBox => Hive.box(stationCacheBoxName);
  Box get _favoritesBox => Hive.box(favoritesBoxName);
  Box get _settingsBox => Hive.box(settingsBoxName);

  Future<void> saveStations(String cacheKey, List<StationSummary> stations) async {
    final listJson = stations.map((s) => s.toJson()).toList();
    await _stationBox.put(cacheKey, {
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'data': listJson,
    });
  }

  List<StationSummary>? getStations(String cacheKey, {Duration maxAge = const Duration(hours: 24)}) {
    final entry = _stationBox.get(cacheKey);
    if (entry == null || entry is! Map) return null;

    final timestamp = entry['timestamp'] as int?;
    if (timestamp == null) return null;

    final age = DateTime.now().millisecondsSinceEpoch - timestamp;
    if (age > maxAge.inMilliseconds) return null;

    final rawData = entry['data'] as List<dynamic>?;
    if (rawData == null) return null;

    return rawData
        .map((e) => StationSummary.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> addFavorite(StationSummary station) async {
    await _favoritesBox.put(station.id, station.toJson());
  }

  Future<void> removeFavorite(String stationId) async {
    await _favoritesBox.delete(stationId);
  }

  bool isFavorite(String stationId) {
    return _favoritesBox.containsKey(stationId);
  }

  List<StationSummary> getAllFavorites() {
    final values = _favoritesBox.values;
    return values
        .map((e) => StationSummary.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> saveThemeMode(String mode) async {
    await _settingsBox.put('theme_mode', mode);
  }

  String getThemeMode() {
    return _settingsBox.get('theme_mode', defaultValue: 'system');
  }

  Future<void> clearAllCache() async {
    await _stationBox.clear();
  }

  double getEstimatedCacheSizeMb() {
    return (_stationBox.length * 0.4) / 1024.0;
  }
}
