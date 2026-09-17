
import 'dart:math';

class DistanceCalculator {
  DistanceCalculator._();

  static const double earthRadiusMeters = 6371000.0;

  static double distanceBetween({
    required double lat1,
    required double lon1,
    required double lat2,
    required double lon2,
  }) {
    final dLat = _degToRad(lat2 - lat1);
    final dLon = _degToRad(lon2 - lon1);

    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degToRad(lat1)) * cos(_degToRad(lat2)) * sin(dLon / 2) * sin(dLon / 2);

    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  static double _degToRad(double deg) => deg * (pi / 180.0);

  static String formatDistance(double meters) {
    if (meters < 1000) {
      return '~${meters.round()} m';
    }
    final km = meters / 1000.0;
    return '~${km.toStringAsFixed(1)} km';
  }
}
