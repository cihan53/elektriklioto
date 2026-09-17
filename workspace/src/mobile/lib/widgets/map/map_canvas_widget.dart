
import 'package:flutter/material.dart';
import '../../models/station_summary.dart';
import 'cluster_marker_widget.dart';
import 'station_marker_widget.dart';

class MapCanvasWidget extends StatelessWidget {
  final List<StationSummary> stations;
  final List<ClusterSummary> clusters;
  final StationSummary? selectedStation;
  final bool isClusters;
  final Function(StationSummary) onStationSelected;
  final Function(ClusterSummary) onClusterSelected;
  final Function(double minLon, double minLat, double maxLon, double maxLat, double zoom) onCameraChanged;

  const MapCanvasWidget({
    Key? key,
    required this.stations,
    required this.clusters,
    required this.selectedStation,
    required this.isClusters,
    required this.onStationSelected,
    required this.onClusterSelected,
    required this.onCameraChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          color: Theme.of(context).scaffoldBackgroundColor,
          child: Stack(
            children: [
              CustomPaint(
                size: Size(constraints.maxWidth, constraints.maxHeight),
                painter: _MapGridPainter(
                  isDark: Theme.of(context).brightness == Brightness.dark,
                ),
              ),
              if (isClusters)
                ...clusters.map((c) {
                  final x = ((c.lon - 26.0) / 19.0) * constraints.maxWidth;
                  final y = ((42.5 - c.lat) / 6.5) * constraints.maxHeight;
                  return Positioned(
                    left: (x - 24).clamp(10, constraints.maxWidth - 50),
                    top: (y - 24).clamp(10, constraints.maxHeight - 50),
                    child: ClusterMarkerWidget(
                      cluster: c,
                      onTap: () => onClusterSelected(c),
                    ),
                  );
                }).toList()
              else
                ...stations.map((s) {
                  final isSelected = selectedStation?.id == s.id;
                  final x = ((s.lon - 26.0) / 19.0) * constraints.maxWidth;
                  final y = ((42.5 - s.lat) / 6.5) * constraints.maxHeight;
                  return Positioned(
                    left: (x - 20).clamp(10, constraints.maxWidth - 44),
                    top: (y - 20).clamp(10, constraints.maxHeight - 44),
                    child: StationMarkerWidget(
                      station: s,
                      isSelected: isSelected,
                      onTap: () => onStationSelected(s),
                    ),
                  );
                }).toList(),
            ],
          ),
        );
      },
    );
  }
}

class _MapGridPainter extends CustomPainter {
  final bool isDark;
  const _MapGridPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isDark ? const Color(0xFF1E293B).withOpacity(0.5) : const Color(0xFFE2E8F0)
      ..strokeWidth = 1.0;

    const step = 60.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MapGridPainter oldDelegate) => oldDelegate.isDark != isDark;
}
