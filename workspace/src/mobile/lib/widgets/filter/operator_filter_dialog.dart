
import 'package:flutter/material.dart';
import '../../core/theme/tokens.dart';
import '../../models/operator_model.dart';

class OperatorFilterDialog extends StatefulWidget {
  final List<OperatorModel> operators;
  final String? initialSelectedSlug;
  final ValueChanged<String?> onSelected;

  const OperatorFilterDialog({
    Key? key,
    required this.operators,
    this.initialSelectedSlug,
    required this.onSelected,
  }) : super(key: key);

  @override
  State<OperatorFilterDialog> createState() => _OperatorFilterDialogState();
}

class _OperatorFilterDialogState extends State<OperatorFilterDialog> {
  String _searchQuery = '';
  String? _selectedSlug;

  @override
  void initState() {
    super.initState();
    _selectedSlug = widget.initialSelectedSlug;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    final filtered = widget.operators.where((op) {
      return op.name.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
      backgroundColor: colors.bgSurface,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Operatör Filtrele',
                  style: AppTypography.h3.copyWith(color: colors.textPrimary),
                ),
                if (_selectedSlug != null)
                  TextButton(
                    onPressed: () {
                      setState(() => _selectedSlug = null);
                      widget.onSelected(null);
                      Navigator.pop(context);
                    },
                    child: Text(
                      'Temizle',
                      style: AppTypography.bodySmall.copyWith(color: colors.primary),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.s3),
            TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Operatör ara...',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: AppRadius.borderMd,
                  borderSide: BorderSide(color: colors.borderDefault),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
            SizedBox(
              height: 300,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: filtered.length,
                itemBuilder: (context, i) {
                  final op = filtered[i];
                  return RadioListTile<String>(
                    title: Text(
                      op.name,
                      style: AppTypography.bodyMedium.copyWith(color: colors.textPrimary),
                    ),
                    value: op.slug,
                    groupValue: _selectedSlug,
                    activeColor: colors.primary,
                    onChanged: (val) {
                      setState(() => _selectedSlug = val);
                      widget.onSelected(val);
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
