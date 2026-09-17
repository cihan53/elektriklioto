
class StationSummary {
  final String id;
  final String istasyonNo;
  final String slug;
  final String? name;
  final String address;
  final String city;
  final String district;
  final double lat;
  final double lon;
  final bool isPublic;
  final String operatorName;
  final String operatorSlug;
  final bool isFlaggedDefective;

  const StationSummary({
    required this.id,
    required this.istasyonNo,
    required this.slug,
    this.name,
    required this.address,
    required this.city,
    required this.district,
    required this.lat,
    required this.lon,
    required this.isPublic,
    required this.operatorName,
    required this.operatorSlug,
    required this.isFlaggedDefective,
  });

  factory StationSummary.fromJson(Map<String, dynamic> json) {
    final op = json['operator'] as Map<String, dynamic>?;
    return StationSummary(
      id: json['id'] as String,
      istasyonNo: json['istasyon_no'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      name: json['name'] as String?,
      address: json['address'] as String? ?? '',
      city: json['city'] as String? ?? '',
      district: json['district'] as String? ?? '',
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
      isPublic: json['is_public'] as bool? ?? true,
      operatorName: op?['name'] as String? ?? (json['operator_name'] as String? ?? 'Bilinmeyen Operatör'),
      operatorSlug: op?['slug'] as String? ?? (json['operator_slug'] as String? ?? 'diger'),
      isFlaggedDefective: json['is_flagged_defective'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'istasyon_no': istasyonNo,
      'slug': slug,
      'name': name,
      'address': address,
      'city': city,
      'district': district,
      'lat': lat,
      'lon': lon,
      'is_public': isPublic,
      'operator_name': operatorName,
      'operator_slug': operatorSlug,
      'is_flagged_defective': isFlaggedDefective,
    };
  }
}

class ClusterSummary {
  final double lat;
  final double lon;
  final int count;

  const ClusterSummary({
    required this.lat,
    required this.lon,
    required this.count,
  });

  factory ClusterSummary.fromJson(Map<String, dynamic> json) {
    return ClusterSummary(
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
      count: json['count'] as int? ?? 1,
    );
  }
}

class BBoxResult {
  final bool isClusters;
  final List<StationSummary> stations;
  final List<ClusterSummary> clusters;

  const BBoxResult({
    required this.isClusters,
    required this.stations,
    required this.clusters,
  });

  factory BBoxResult.fromApiResponse(dynamic response) {
    if (response is Map<String, dynamic>) {
      final isClustered = response['is_clusters'] == true || response['clusters'] != null;
      if (isClustered && response['clusters'] is List) {
        final list = (response['clusters'] as List)
            .map((c) => ClusterSummary.fromJson(Map<String, dynamic>.from(c as Map)))
            .toList();
        return BBoxResult(isClusters: true, stations: const [], clusters: list);
      }
      if (response['stations'] is List) {
        final list = (response['stations'] as List)
            .map((s) => StationSummary.fromJson(Map<String, dynamic>.from(s as Map)))
            .toList();
        return BBoxResult(isClusters: false, stations: list, clusters: const []);
      }
    }
    if (response is List) {
      final list = response
          .map((s) => StationSummary.fromJson(Map<String, dynamic>.from(s as Map)))
          .toList();
      return BBoxResult(isClusters: false, stations: list, clusters: const []);
    }
    return const BBoxResult(isClusters: false, stations: [], clusters: []);
  }
}
