
import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/storage/hive_storage_service.dart';
import '../../models/station_summary.dart';
import '../../services/location_service.dart';
import '../../services/station_service.dart';
import 'map_event.dart';
import 'map_state.dart';

class MapBloc extends Bloc<MapEvent, MapState> {
  final StationService _stationService;
  final HiveStorageService _storageService;
  Timer? _debounceTimer;

  MapBloc({
    StationService? stationService,
    HiveStorageService? storageService,
  })  : _stationService = stationService ?? StationService(),
        _storageService = storageService ?? HiveStorageService(),
        super(MapState.initial()) {
    on<MapCameraChanged>(_onCameraChanged);
    on<MapStationSelected>(_onStationSelected);
    on<MapStationDeselected>(_onStationDeselected);
    on<MapClusterSelected>(_onClusterSelected);
    on<MapUserLocationRequested>(_onUserLocationRequested);
  }

  Future<void> _onCameraChanged(MapCameraChanged event, Emitter<MapState> emit) async {
    _debounceTimer?.cancel();
    final completer = Completer<void>();

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      final cacheKey =
          'bbox_${event.minLon.toStringAsFixed(2)}_${event.minLat.toStringAsFixed(2)}_${event.maxLon.toStringAsFixed(2)}_${event.maxLat.toStringAsFixed(2)}';

      try {
        final result = await _stationService.fetchBBoxStations(
          minLon: event.minLon,
          minLat: event.minLat,
          maxLon: event.maxLon,
          maxLat: event.maxLat,
          zoom: event.zoom,
        );

        if (!result.isClusters) {
          await _storageService.saveStations(cacheKey, result.stations);
        }

        emit(state.copyWith(
          status: MapStatus.loaded,
          isClusters: result.isClusters,
          stations: result.stations,
          clusters: result.clusters,
          isOffline: false,
        ));
      } catch (e) {
        final cached = _storageService.getStations(cacheKey);
        if (cached != null && cached.isNotEmpty) {
          emit(state.copyWith(
            status: MapStatus.loaded,
            isClusters: false,
            stations: cached,
            clusters: [],
            isOffline: true,
          ));
        } else {
          emit(state.copyWith(
            status: MapStatus.error,
            errorMessage: 'İstasyon verileri yüklenemedi.',
            isOffline: true,
          ));
        }
      }
      completer.complete();
    });

    await completer.future;
  }

  void _onStationSelected(MapStationSelected event, Emitter<MapState> emit) {
    emit(state.copyWith(selectedStation: event.station));
  }

  void _onStationDeselected(MapStationDeselected event, Emitter<MapState> emit) {
    emit(state.copyWith(clearSelectedStation: true));
  }

  void _onClusterSelected(MapClusterSelected event, Emitter<MapState> emit) {
    emit(state.copyWith(clearSelectedStation: true));
  }

  Future<void> _onUserLocationRequested(MapUserLocationRequested event, Emitter<MapState> emit) async {
    final pos = await LocationService.getCurrentPosition();
    if (pos != null) {
      emit(state.copyWith(userLat: pos.latitude, userLon: pos.longitude));
    }
  }

  @override
  Future<void> close() {
    _debounceTimer?.cancel();
    return super.close();
  }
}
