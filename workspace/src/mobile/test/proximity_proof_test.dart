
import 'package:flutter_test/flutter_test.dart';
import 'package:elektriklioto_mobile/core/utils/proximity_proof_helper.dart';
import 'package:elektriklioto_mobile/core/utils/distance_calculator.dart';

void main() {
  test('DistanceCalculator returns distance accurately', () {
    final d = DistanceCalculator.distanceBetween(
      lat1: 41.0000,
      lon1: 29.0000,
      lat2: 41.0002,
      lon2: 29.0000,
    );
    expect(d, lessThan(30.0));
    expect(d, greaterThan(15.0));
  });

  test('ProximityProofHelper produces proof only within 50 meters', () {
    final nonce = ProximityProofHelper.generateNonce();
    expect(nonce.length, 32);

    final proof = ProximityProofHelper.generateProofIfWithin50m(
      userLat: 41.0000,
      userLon: 29.0000,
      stationLat: 41.0001,
      stationLon: 29.0000,
      stationId: 'station-uuid-1234',
      nonce: nonce,
    );
    expect(proof, isNotNull);
    expect(proof!.length, 64);

    final distantProof = ProximityProofHelper.generateProofIfWithin50m(
      userLat: 41.0000,
      userLon: 29.0000,
      stationLat: 41.0100,
      stationLon: 29.0000,
      stationId: 'station-uuid-1234',
      nonce: nonce,
    );
    expect(distantProof, isNull);
  });
}
