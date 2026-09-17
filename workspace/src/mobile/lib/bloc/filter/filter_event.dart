
import 'package:flutter/foundation.dart';

@immutable
abstract class FilterEvent {
  const FilterEvent();
}

class FilterOperatorChanged extends FilterEvent {
  final String? operatorSlug;
  const FilterOperatorChanged(this.operatorSlug);
}

class FilterPublicOnlyToggled extends FilterEvent {
  final bool isPublicOnly;
  const FilterPublicOnlyToggled(this.isPublicOnly);
}

class FilterLockedTapped extends FilterEvent {
  final String filterName;
  const FilterLockedTapped(this.filterName);
}

class FilterToastCleared extends FilterEvent {
  const FilterToastCleared();
}
