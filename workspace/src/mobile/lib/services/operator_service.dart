
import '../core/network/api_client.dart';
import '../models/operator_model.dart';

class OperatorService {
  final ApiClient _client;

  OperatorService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<List<OperatorModel>> fetchOperators() async {
    final res = await _client.get('/operators');
    if (res is List) {
      return res
          .map((e) => OperatorModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
    return [];
  }
}
