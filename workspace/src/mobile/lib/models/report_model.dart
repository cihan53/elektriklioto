
class IssueReportRequest {
  final String stationId;
  final String issueType;
  final String? description;
  final String? proximityProof;

  const IssueReportRequest({
    required this.stationId,
    required this.issueType,
    this.description,
    this.proximityProof,
  });

  Map<String, dynamic> toJson() {
    return {
      'station_id': stationId,
      'issue_type': issueType,
      'description': description,
      'proximity_proof': proximityProof,
    };
  }
}
