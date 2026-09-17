
import 'station_summary.dart';

class OperatorSummary {
  final int id;
  final String name;
  final String slug;
  final String? websiteUrl;
  final String? iosBundleId;
  final String? androidPackageName;

  const OperatorSummary({
    required this.id,
    required this.name,
    required this.slug,
    this.websiteUrl,
    this.iosBundleId,
    this.androidPackageName,
  });

  factory OperatorSummary.fromJson(Map<String, dynamic> json) {
    return OperatorSummary(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? 'Bilinmeyen Operatör',
      slug: json['slug'] as String? ?? 'diger',
      websiteUrl: json['website_url'] as String?,
      iosBundleId: json['ios_bundle_id'] as String?,
      androidPackageName: json['android_package_name'] as String?,
    );
  }
}

class DeepLinkResult {
  final String? deepLinkUrl;
  final bool clipboardFallback;
  final String? clipboardText;
  final String? storeUrl;

  const DeepLinkResult({
    this.deepLinkUrl,
    required this.clipboardFallback,
    this.clipboardText,
    this.storeUrl,
  });

  factory DeepLinkResult.fromJson(Map<String, dynamic> json) {
    return DeepLinkResult(
      deepLinkUrl: json['deep_link_url'] as String?,
      clipboardFallback: json['clipboard_fallback'] as bool? ?? false,
      clipboardText: json['clipboard_text'] as String?,
      storeUrl: json['store_url'] as String?,
    );
  }
}

class StationDetail {
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
  final bool isFlaggedDefective;

  // Faz 1 Nullable DTO: Soket, güç, tarife ve anlık doluluk verisi Faz 1 başlangıcında YOKTUR (null).
  final String? soketSayisi;
  final String? acDcTipi;
  final String? gucKw;
  final String? tarifeAc;
  final String? tarifeDc;
  final String? dolulukDurumu;

  final String updatedAt;
  final OperatorSummary operator;
  final DeepLinkResult deepLink;

  const StationDetail({
    required this.id,
    required this.istasyonNo,
    required this.slug,
    this.name,
    required this.address,
    required this.city,
    required this.district,
    required this.lat,
    required this.lon,
    this.isPublic = true,
    this.soketSayisi,
    this.acDcTipi,
    this.gucKw,
    this.tarifeAc,
    this.tarifeDc,
    this.dolulukDurumu,
    required this.updatedAt,
    required this.isFlaggedDefective,
    required this.operator,
    required this.deepLink,
  });

  factory StationDetail.fromJson(Map<String, dynamic> json) {
    return StationDetail(
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
      soketSayisi: json['soket_sayisi'] as String?,
      acDcTipi: json['ac_dc_tipi'] as String?,
      gucKw: json['guc_kw'] as String?,
      tarifeAc: json['tarife_ac'] as String?,
      tarifeDc: json['tarife_dc'] as String?,
      dolulukDurumu: json['doluluk_durumu'] as String?,
      updatedAt: json['updated_at'] as String? ?? DateTime.now().toIso8601String(),
      isFlaggedDefective: json['is_flagged_defective'] as bool? ?? false,
      operator: OperatorSummary.fromJson(Map<String, dynamic>.from(json['operator'] as Map? ?? {})),
      deepLink: DeepLinkResult.fromJson(Map<String, dynamic>.from(json['deep_link'] as Map? ?? {})),
    );
  }

  StationSummary toSummary() {
    return StationSummary(
      id: id,
      istasyonNo: istasyonNo,
      slug: slug,
      name: name,
      address: address,
      city: city,
      district: district,
      lat: lat,
      lon: lon,
      isPublic: isPublic,
      operatorName: operator.name,
      operatorSlug: operator.slug,
      isFlaggedDefective: isFlaggedDefective,
    );
  }
}
