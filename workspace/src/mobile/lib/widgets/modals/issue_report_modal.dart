
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/station_detail/station_detail_bloc.dart';
import '../../bloc/station_detail/station_detail_event.dart';
import '../../core/theme/tokens.dart';
import '../../core/utils/proximity_proof_helper.dart';
import '../../services/location_service.dart';
import '../common/custom_toast.dart';
import '../../models/report_model.dart';
import '../../models/station_summary.dart';
import '../../services/report_service.dart';

class IssueReportModal extends StatefulWidget {
  final StationSummary station;

  const IssueReportModal({Key? key, required this.station}) : super(key: key);

  @override
  State<IssueReportModal> createState() => _IssueReportModalState();
}

class _IssueReportModalState extends State<IssueReportModal> {
  final _reportService = ReportService();
  String _selectedIssue = 'broken_connector';
  final _descController = TextEditingController();
  bool _isSubmitting = false;

  final Map<String, String> _issueOptions = {
    'broken_connector': 'Kırık / Hasarlı Soket',
    'power_cut': 'İstasyonda Elektrik Yok / Cihaz Kapalı',
    'blocked_by_ice': 'İçten Yanmalı Araç İşgali (ICE-ing)',
    'screen_frozen': 'Ekran / Yazılım Donmuş',
    'access_closed': 'İstasyon Alanı Kilitli / Giriş Kapalı',
    'other': 'Diğer Sorun',
  };

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);

    String? proof;
    final pos = await LocationService.getCurrentPosition();
    if (pos != null) {
      final nonce = ProximityProofHelper.generateNonce();
      proof = ProximityProofHelper.generateProofIfWithin50m(
        userLat: pos.latitude,
        userLon: pos.longitude,
        stationLat: widget.station.lat,
        stationLon: widget.station.lon,
        stationId: widget.station.id,
        nonce: nonce,
      );
    }

    final req = IssueReportRequest(
      stationId: widget.station.id,
      issueType: _selectedIssue,
      description: _descController.text.trim().isNotEmpty ? _descController.text.trim() : null,
      proximityProof: proof,
    );

    final success = await _reportService.submitIssueReport(req);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      CustomToast.show(
        context,
        proof != null
            ? 'Bildiriminiz yakınlık kanıtı (<50m) ile öncelikli işleme alındı.'
            : 'Bildiriminiz iletildi. Katkınız için teşekkürler.',
      );
      Navigator.pop(context);
    } else {
      CustomToast.show(context, 'Bildirim gönderilemedi. Lütfen tekrar deneyin.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.s5,
        right: AppSpacing.s5,
        top: AppSpacing.s5,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.s5,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Arıza / Sorun Bildir',
                style: AppTypography.h3.copyWith(color: colors.textPrimary),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
                constraints: AppTouchTarget.mobileConstraints,
              ),
            ],
          ),
          Text(
            widget.station.name ?? widget.station.address,
            style: AppTypography.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.s4),

          Text('Sorun Tipi', style: AppTypography.bodyMediumBold),
          const SizedBox(height: AppSpacing.s2),
          DropdownButtonFormField<String>(
            value: _selectedIssue,
            items: _issueOptions.entries.map((e) {
              return DropdownMenuItem(value: e.key, child: Text(e.value));
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _selectedIssue = val);
            },
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: AppRadius.borderMd,
                borderSide: BorderSide(color: colors.borderDefault),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
            ),
          ),
          const SizedBox(height: AppSpacing.s4),

          Text('Açıklama (Opsiyonel)', style: AppTypography.bodyMediumBold),
          const SizedBox(height: AppSpacing.s2),
          TextField(
            controller: _descController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Ek ayrıntı belirtebilirsiniz...',
              border: OutlineInputBorder(
                borderRadius: AppRadius.borderMd,
                borderSide: BorderSide(color: colors.borderDefault),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.s4),

          Container(
            padding: const EdgeInsets.all(AppSpacing.s3),
            decoration: BoxDecoration(
              color: colors.bgCanvas,
              borderRadius: AppRadius.borderMd,
            ),
            child: Row(
              children: [
                Icon(Icons.location_on_outlined, size: 18, color: colors.primary),
                const SizedBox(width: AppSpacing.s2),
                Expanded(
                  child: Text(
                    'İstasyona 50m mesafedeyseniz bildiriminiz kriptografik yakınlık kanıtıyla doğrulanır.',
                    style: AppTypography.caption.copyWith(color: colors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s5),

          ConstrainedBox(
            constraints: AppTouchTarget.mobileConstraints,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const CircularProgressIndicator()
                  : const Text('Bildirimi Gönder'),
            ),
          ),
        ],
      ),
    );
  }
}
