
import '../core/network/api_client.dart';
import '../models/station_detail.dart';
import '../models/station_summary.dart';

class StationService {
  final ApiClient _client;

  StationService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<BBoxResult> fetchBBoxStations({
    required double minLon,
    required double minLat,
    required double maxLon,
    required double maxLat,
    double? zoom,
    String? operatorSlug,
    bool? isPublicOnly,
  }) async {
    final bbox = '$minLon,$minLat,$maxLon,$maxLat';
    final query = <String, String>{
      'bbox': bbox,
    };
    if (zoom != null) query['zoom'] = zoom.toString();
    if (operatorSlug != null && operatorSlug.isNotEmpty) {
      query['operator'] = operatorSlug;
    }
    if (isPublicOnly == true) {
      query['is_public'] = 'true';
    }

    final res = await _client.get('/stations/bbox', queryParams: query);
    return BBoxResult.fromApiResponse(res);
  }

  Future<StationDetail> fetchStationDetail(String slugOrId) async {
    final res = await _client.get('/stations/$slugOrId');
    return StationDetail.fromJson(Map<String, dynamic>.from(res as Map));
  }

  Future<List<StationSummary>> searchStations(String query) async {
    final res = await _client.get('/stations/search', queryParams: {'q': query});
    if (res is List) {
      return res
          .map((e) => StationSummary.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
    return [];
  }
}
