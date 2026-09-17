
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'distance_calculator.dart';

class ProximityProofHelper {
  ProximityProofHelper._();

  static const double maxProofDistanceMeters = 50.0;
  static const String secretHmacKey = 'elektriklioto_zero_location_hmac_secret_2026';

  static String? generateProofIfWithin50m({
    required double userLat,
    required double userLon,
    required double stationLat,
    required double stationLon,
    required String stationId,
    required String nonce,
  }) {
    final dist = DistanceCalculator.distanceBetween(
      lat1: userLat,
      lon1: userLon,
      lat2: stationLat,
      lon2: stationLon,
    );

    if (dist > maxProofDistanceMeters) {
      return null;
    }

    final message = '$stationId:$nonce';
    final key = utf8.encode(secretHmacKey);
    final hmacSha256 = Hmac(sha256, key);
    final digest = hmacSha256.convert(utf8.encode(message));
    return digest.toString();
  }

  static String generateNonce() {
    final rnd = Random.secure();
    final values = List<int>.generate(16, (i) => rnd.nextInt(256));
    return values.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
