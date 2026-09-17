
import 'package:flutter/foundation.dart';
import '../../models/station_summary.dart';

@immutable
abstract class StationDetailEvent {
  const StationDetailEvent();
}

class StationDetailLoaded extends StationDetailEvent {
  final String slugOrId;

  const StationDetailLoaded(this.slugOrId);
}

class StationDetailFavoriteToggled extends StationDetailEvent {
  final StationSummary station;

  const StationDetailFavoriteToggled(this.station);
}
