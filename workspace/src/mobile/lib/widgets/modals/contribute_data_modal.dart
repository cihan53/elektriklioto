
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';
import '../../models/station_summary.dart';
import '../common/custom_toast.dart';

class ContributeDataModal extends StatefulWidget {
  final StationSummary station;

  const ContributeDataModal({Key? key, required this.station}) : super(key: key);

  @override
  State<ContributeDataModal> createState() => _ContributeDataModalState();
}

class _ContributeDataModalState extends State<ContributeDataModal> {
  final Set<String> _selectedSockets = {};
  String? _selectedPower;
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.s5),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'İstasyon Bilgisi Ekle',
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
            'EPDK kayıtlarında eksik olan soket ve güç bilgilerini tamamlayarak diğer sürücülere yardımcı olun.',
            style: AppTypography.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.s4),

          Text('Soket Tipi', style: AppTypography.bodyMediumBold),
          const SizedBox(height: AppSpacing.s2),
          Wrap(
            spacing: AppSpacing.s2,
            children: ['CCS (DC)', 'Type 2 (AC)', 'CHAdeMO'].map((s) {
              final sel = _selectedSockets.contains(s);
              return FilterChip(
                label: Text(s),
                selected: sel,
                onSelected: (val) {
                  setState(() {
                    if (val) {
                      _selectedSockets.add(s);
                    } else {
                      _selectedSockets.remove(s);
                    }
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.s4),

          Text('Tahmini Şarj Gücü', style: AppTypography.bodyMediumBold),
          const SizedBox(height: AppSpacing.s2),
          Wrap(
            spacing: AppSpacing.s2,
            children: ['22 kW', '60 kW', '120 kW', '180 kW+', 'Bilmiyorum'].map((p) {
              final sel = _selectedPower == p;
              return ChoiceChip(
                label: Text(p),
                selected: sel,
                onSelected: (val) => setState(() => _selectedPower = val ? p : null),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.s5),

          ConstrainedBox(
            constraints: AppTouchTarget.mobileConstraints,
            child: ElevatedButton(
              onPressed: _selectedSockets.isEmpty || _isSubmitting
                  ? null
                  : () async {
                      setState(() => _isSubmitting = true);
                      await Future.delayed(const Duration(milliseconds: 600));
                      if (!mounted) return;
                      CustomToast.show(
                        context,
                        'Veri katkınız inceleme kuyruğuna alındı. Teşekkürler!',
                      );
                      Navigator.pop(context);
                    },
              child: _isSubmitting
                  ? const CircularProgressIndicator()
                  : const Text('Bilgileri İncelemeye Gönder'),
            ),
          ),
        ],
      ),
    );
  }
}
