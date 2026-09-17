
import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:elektriklioto_mobile/bloc/filter/filter_bloc.dart';
import 'package:elektriklioto_mobile/bloc/filter/filter_event.dart';
import 'package:elektriklioto_mobile/bloc/filter/filter_state.dart';

void main() {
  group('FilterBloc Tests', () {
    late FilterBloc filterBloc;

    setUp(() {
      filterBloc = FilterBloc();
    });

    tearDown(() {
      filterBloc.close();
    });

    test('initial state has no operator and public only false', () {
      expect(filterBloc.state.selectedOperatorSlug, isNull);
      expect(filterBloc.state.isPublicOnly, isFalse);
    });

    blocTest<FilterBloc, FilterState>(
      'FilterOperatorChanged updates selected operator',
      build: () => filterBloc,
      act: (bloc) => bloc.add(const FilterOperatorChanged('zes')),
      expect: () => [
        isA<FilterState>().having((s) => s.selectedOperatorSlug, 'selectedOperatorSlug', 'zes'),
      ],
    );

    blocTest<FilterBloc, FilterState>(
      'FilterLockedTapped triggers missing data toast message',
      build: () => filterBloc,
      act: (bloc) => bloc.add(const FilterLockedTapped('Hızlı Şarj (DC)')),
      expect: () => [
        isA<FilterState>().having(
          (s) => s.toastMessage,
          'toastMessage',
          'Operatör Verisi Bekleniyor — Bu filtre yakında aktifleşecektir.',
        ),
      ],
    );
  });
}
