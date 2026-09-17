
import 'package:flutter/foundation.dart';
import '../../models/station_summary.dart';

@immutable
abstract class MapEvent {
  const MapEvent();
}

class MapCameraChanged extends MapEvent {
  final double minLon;
  final double minLat;
  final double maxLon;
  final double maxLat;
  final double zoom;

  const MapCameraChanged({
    required this.minLon,
    required this.minLat,
    required this.maxLon,
    required this.maxLat,
    required this.zoom,
  });
}

class MapStationSelected extends MapEvent {
  final StationSummary station;
  const MapStationSelected(this.station);
}

class MapStationDeselected extends MapEvent {
  const MapStationDeselected();
}

class MapClusterSelected extends MapEvent {
  final ClusterSummary cluster;
  const MapClusterSelected(this.cluster);
}

class MapUserLocationRequested extends MapEvent {
  const MapUserLocationRequested();
}
