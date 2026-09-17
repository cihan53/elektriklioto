
import 'package:flutter/foundation.dart';
import '../../models/station_detail.dart';

enum StationDetailStatus { initial, loading, loaded, error }

@immutable
class StationDetailState {
  final StationDetailStatus status;
  final StationDetail? detail;
  final bool isFavorite;
  final String? errorMessage;

  const StationDetailState({
    required this.status,
    this.detail,
    required this.isFavorite,
    this.errorMessage,
  });

  factory StationDetailState.initial() {
    return const StationDetailState(
      status: StationDetailStatus.initial,
      detail: null,
      isFavorite: false,
      errorMessage: null,
    );
  }

  StationDetailState copyWith({
    StationDetailStatus? status,
    StationDetail? detail,
    bool? isFavorite,
    String? errorMessage,
  }) {
    return StationDetailState(
      status: status ?? this.status,
      detail: detail ?? this.detail,
      isFavorite: isFavorite ?? this.isFavorite,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}
