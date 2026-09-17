
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/storage/hive_storage_service.dart';
import '../../services/station_service.dart';
import 'station_detail_event.dart';
import 'station_detail_state.dart';

class StationDetailBloc extends Bloc<StationDetailEvent, StationDetailState> {
  final StationService _stationService;
  final HiveStorageService _storageService;

  StationDetailBloc({
    StationService? stationService,
    HiveStorageService? storageService,
  })  : _stationService = stationService ?? StationService(),
        _storageService = storageService ?? HiveStorageService(),
        super(StationDetailState.initial()) {
    on<StationDetailLoaded>(_onLoaded);
    on<StationDetailFavoriteToggled>(_onFavoriteToggled);
  }

  Future<void> _onLoaded(
    StationDetailLoaded event,
    Emitter<StationDetailState> emit,
  ) async {
    emit(state.copyWith(status: StationDetailStatus.loading));
    try {
      final detail = await _stationService.fetchStationDetail(event.slugOrId);
      final isFav = _storageService.isFavorite(detail.id);
      emit(state.copyWith(
        status: StationDetailStatus.loaded,
        detail: detail,
        isFavorite: isFav,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: StationDetailStatus.error,
        errorMessage: 'İstasyon detayı alınamadı.',
      ));
    }
  }

  Future<void> _onFavoriteToggled(
    StationDetailFavoriteToggled event,
    Emitter<StationDetailState> emit,
  ) async {
    final id = event.station.id;
    if (_storageService.isFavorite(id)) {
      await _storageService.removeFavorite(id);
      emit(state.copyWith(isFavorite: false));
    } else {
      await _storageService.addFavorite(event.station);
      emit(state.copyWith(isFavorite: true));
    }
  }
}
