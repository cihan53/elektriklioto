
import '../core/network/api_client.dart';
import '../models/report_model.dart';

class ReportService {
  final ApiClient _client;

  ReportService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<bool> submitIssueReport(IssueReportRequest request) async {
    try {
      await _client.post(
        '/stations/${request.stationId}/report',
        body: request.toJson(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
