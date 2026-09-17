
class OperatorModel {
  final int id;
  final String name;
  final String slug;
  final String? logoUrl;
  final int stationCount;
  final String? websiteUrl;
  final String? iosBundleId;
  final String? androidPackageName;

  const OperatorModel({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    required this.stationCount,
    this.websiteUrl,
    this.iosBundleId,
    this.androidPackageName,
  });

  factory OperatorModel.fromJson(Map<String, dynamic> json) {
    return OperatorModel(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      logoUrl: json['logo_url'] as String?,
      stationCount: json['station_count'] as int? ?? 0,
      websiteUrl: json['website_url'] as String?,
      iosBundleId: json['ios_bundle_id'] as String?,
      androidPackageName: json['android_package_name'] as String?,
    );
  }
}
