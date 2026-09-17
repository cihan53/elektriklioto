
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import 'api_exception.dart';

class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({
    this.baseUrl = AppConstants.apiBaseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    try {
      final response = await _client.get(
        uri,
        headers: {
          'Accept': 'application/json',
          'X-Client-App': 'elektriklioto-mobile-v1',
        },
      );
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        statusCode: 0,
        message: 'Ağ bağlantı hatası: $e',
      );
    }
  }

  Future<Map<String, dynamic>> post(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    try {
      final response = await _client.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-App': 'elektriklioto-mobile-v1',
        },
        body: jsonEncode(body),
      );
      return _handleResponse(response) as Map<String, dynamic>;
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        statusCode: 0,
        message: 'Ağ bağlantı hatası: $e',
      );
    }
  }

  Uri _buildUri(String path, [Map<String, String>? queryParams]) {
    final cleanPath = path.startsWith('/') ? path.substring(1) : path;
    final url = '$baseUrl/$cleanPath';
    final parsed = Uri.parse(url);
    if (queryParams != null && queryParams.isNotEmpty) {
      return parsed.replace(queryParameters: queryParams);
    }
    return parsed;
  }

  dynamic _handleResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    String errorMsg = 'HTTP Hata: ${response.statusCode}';
    if (decoded is Map<String, dynamic>) {
      errorMsg = decoded['detail'] ?? decoded['message'] ?? errorMsg;
    }
    throw ApiException(statusCode: response.statusCode, message: errorMsg);
  }
}
