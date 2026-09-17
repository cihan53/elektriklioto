
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/constants/app_constants.dart';
import 'filter_event.dart';
import 'filter_state.dart';

class FilterBloc extends Bloc<FilterEvent, FilterState> {
  FilterBloc() : super(FilterState.initial()) {
    on<FilterOperatorChanged>(_onOperatorChanged);
    on<FilterPublicOnlyToggled>(_onPublicOnlyToggled);
    on<FilterLockedTapped>(_onLockedTapped);
    on<FilterToastCleared>(_onToastCleared);
  }

  void _onOperatorChanged(FilterOperatorChanged event, Emitter<FilterState> emit) {
    if (event.operatorSlug == null) {
      emit(state.copyWith(clearOperator: true));
    } else {
      emit(state.copyWith(selectedOperatorSlug: event.operatorSlug));
    }
  }

  void _onPublicOnlyToggled(FilterPublicOnlyToggled event, Emitter<FilterState> emit) {
    emit(state.copyWith(isPublicOnly: event.isPublicOnly));
  }

  void _onLockedTapped(FilterLockedTapped event, Emitter<FilterState> emit) {
    emit(state.copyWith(toastMessage: AppConstants.lockedFilterNotice));
  }

  void _onToastCleared(FilterToastCleared event, Emitter<FilterState> emit) {
    emit(state.copyWith(clearToast: true));
  }
}
