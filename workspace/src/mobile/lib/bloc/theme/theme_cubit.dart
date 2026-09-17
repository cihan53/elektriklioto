
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/storage/hive_storage_service.dart';
import 'theme_state.dart';

class ThemeCubit extends Cubit<ThemeState> {
  final HiveStorageService _storageService;

  ThemeCubit({HiveStorageService? storageService})
      : _storageService = storageService ?? HiveStorageService(),
        super(const ThemeState(ThemeMode.system)) {
    _loadSavedTheme();
  }

  void _loadSavedTheme() {
    final modeStr = _storageService.getThemeMode();
    switch (modeStr) {
      case 'light':
        emit(const ThemeState(ThemeMode.light));
        break;
      case 'dark':
        emit(const ThemeState(ThemeMode.dark));
        break;
      default:
        emit(const ThemeState(ThemeMode.system));
        break;
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    String modeStr = 'system';
    if (mode == ThemeMode.light) modeStr = 'light';
    if (mode == ThemeMode.dark) modeStr = 'dark';
    await _storageService.saveThemeMode(modeStr);
    emit(ThemeState(mode));
  }
}
