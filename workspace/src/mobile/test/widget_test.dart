
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:elektriklioto_mobile/core/theme/tokens.dart';
import 'package:elektriklioto_mobile/widgets/common/service_type_badge.dart';
import 'package:elektriklioto_mobile/widgets/common/missing_data_badge.dart';

void main() {
  testWidgets('ServiceTypeBadge renders Halka Açık correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ServiceTypeBadge(isPublic: true),
        ),
      ),
    );

    expect(find.text('Halka Açık'), findsOneWidget);
  });

  testWidgets('MissingDataBadge renders standard text and touch target', (WidgetTester tester) async {
    bool tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MissingDataBadge(
            onContributeTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Operatör Verisi Bekleniyor'), findsOneWidget);
    expect(find.text('+ Bilgi Ekle'), findsOneWidget);

    await tester.tap(find.text('+ Bilgi Ekle'));
    expect(tapped, isTrue);
  });

  test('WCAG 2.1 AA touch target constraint check', () {
    expect(AppTouchTarget.minMobile, greaterThanOrEqualTo(48.0));
  });
}
