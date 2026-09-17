
import 'package:flutter/foundation.dart';

@immutable
class FilterState {
  final String? selectedOperatorSlug;
  final bool isPublicOnly;
  final String? toastMessage;

  const FilterState({
    this.selectedOperatorSlug,
    required this.isPublicOnly,
    this.toastMessage,
  });

  factory FilterState.initial() {
    return const FilterState(
      selectedOperatorSlug: null,
      isPublicOnly: false,
      toastMessage: null,
    );
  }

  FilterState copyWith({
    String? selectedOperatorSlug,
    bool clearOperator = false,
    bool? isPublicOnly,
    String? toastMessage,
    bool clearToast = false,
  }) {
    return FilterState(
      selectedOperatorSlug: clearOperator ? null : (selectedOperatorSlug ?? this.selectedOperatorSlug),
      isPublicOnly: isPublicOnly ?? this.isPublicOnly,
      toastMessage: clearToast ? null : (toastMessage ?? this.toastMessage),
    );
  }
}
