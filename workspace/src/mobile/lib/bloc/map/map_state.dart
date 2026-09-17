
import 'package:flutter/foundation.dart';
import '../../models/station_summary.dart';

enum MapStatus { initial, loading, loaded, error }

@immutable
class MapState {
  final MapStatus status;
  final bool isClusters;
  final List<StationSummary> stations;
  final List<ClusterSummary> clusters;
  final StationSummary? selectedStation;
  final double? userLat;
  final double? userLon;
  final String? errorMessage;
  final bool isOffline;

  const MapState({
    required this.status,
    required this.isClusters,
    required this.stations,
    required this.clusters,
    this.selectedStation,
    this.userLat,
    this.userLon,
    this.errorMessage,
    required this.isOffline,
  });

  factory MapState.initial() {
    return const MapState(
      status: MapStatus.initial,
      isClusters: false,
      stations: [],
      clusters: [],
      selectedStation: null,
      userLat: null,
      userLon: null,
      errorMessage: null,
      isOffline: false,
    );
  }

  MapState copyWith({
    MapStatus? status,
    bool? isClusters,
    List<StationSummary>? stations,
    List<ClusterSummary>? clusters,
    StationSummary? selectedStation,
    bool clearSelectedStation = false,
    double? userLat,
    double? userLon,
    String? errorMessage,
    bool? isOffline,
  }) {
    return MapState(
      status: status ?? this.status,
      isClusters: isClusters ?? this.isClusters,
      stations: stations ?? this.stations,
      clusters: clusters ?? this.clusters,
      selectedStation: clearSelectedStation ? null : (selectedStation ?? this.selectedStation),
      userLat: userLat ?? this.userLat,
      userLon: userLon ?? this.userLon,
      errorMessage: errorMessage ?? this.errorMessage,
      isOffline: isOffline ?? this.isOffline,
    );
  }
}
