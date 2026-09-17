
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:elektriklioto_mobile/models/station_summary.dart';
import 'package:elektriklioto_mobile/bloc/station_detail/station_detail_bloc.dart';
import 'package:elektriklioto_mobile/widgets/sheet/station_detail_sheet.dart';

void main() {
  testWidgets('StationDetailSheet renders SCR-02 components correctly', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const summary = StationSummary(
      id: 'test-uid-1',
      istasyonNo: 'ŞRJ/1904',
      slug: 'zes-kadikoy-1904',
      name: 'ZES Kadıköy İstasyonu',
      address: 'Caferağa Mah. Moda Cad. No:12',
      city: 'İstanbul',
      district: 'Kadıköy',
      lat: 40.985,
      lon: 29.028,
      isPublic: true,
      operatorName: 'ZES',
      operatorSlug: 'zes',
      isFlaggedDefective: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<StationDetailBloc>(
            create: (_) => StationDetailBloc(),
            child: StationDetailSheet(
              summary: summary,
              onReportTap: () {},
              onContributeTap: () {},
              onClose: () {},
              distanceMeters: 1200,
            ),
          ),
        ),
      ),
    );

    // Verify operator & station name
    expect(find.text('ZES'), findsOneWidget);
    expect(find.text('ZES Kadıköy İstasyonu'), findsOneWidget);

    // Verify EPDK Sicil badge
    expect(find.text('EPDK: ŞRJ/1904'), findsOneWidget);

    // Verify ServiceType badge
    expect(find.text('Halka Açık'), findsOneWidget);

    // Verify Distance badge
    expect(find.text('~1.2 km'), findsOneWidget);

    // Verify primary CTA button
    expect(find.text('Operatörde Aç / Şarja Başla'), findsOneWidget);

    // Scroll down to see details
    await tester.scrollUntilVisible(find.text('Canlı durum verisi henüz açılmadı'), 300);

    // Verify missing data badges for socket, tariff, occupancy
    expect(find.text('Operatör Verisi Bekleniyor'), findsWidgets);
    expect(find.text('+ Bilgi Ekle'), findsWidgets);
    expect(find.text('Canlı durum verisi henüz açılmadı'), findsOneWidget);

    // Scroll down for legal disclaimer
    await tester.scrollUntilVisible(find.text('Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)'), 300);
    expect(find.text('Veri Kaynağı: EPDK Sicil Kaydı (Eylül 2026)'), findsOneWidget);
  });
}
