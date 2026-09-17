
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/filter/filter_bloc.dart';
import '../../bloc/filter/filter_event.dart';
import '../../bloc/filter/filter_state.dart';
import '../../bloc/map/map_bloc.dart';
import '../../bloc/map/map_event.dart';
import '../../bloc/map/map_state.dart';
import '../../bloc/station_detail/station_detail_bloc.dart';
import '../../bloc/station_detail/station_detail_event.dart';
import '../../bloc/station_detail/station_detail_state.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/tokens.dart';
import '../../models/operator_model.dart';
import '../../models/station_summary.dart';
import '../../services/location_service.dart';
import '../../services/operator_service.dart';
import '../widgets/common/custom_toast.dart';
import '../widgets/common/offline_status_banner.dart';
import '../widgets/filter/filter_chips_bar.dart';
import '../widgets/filter/operator_filter_dialog.dart';
import '../widgets/map/location_fab_widget.dart';
import '../widgets/map/map_canvas_widget.dart';
import '../widgets/modals/contribute_data_modal.dart';
import '../widgets/modals/issue_report_modal.dart';
import '../widgets/search/search_autocomplete_dropdown.dart';
import '../widgets/search/search_bar_widget.dart';
import '../widgets/sheet/station_detail_sheet.dart';

class ExploreTabView extends StatefulWidget {
  const ExploreTabView({Key? key}) : super(key: key);

  @override
  State<ExploreTabView> createState() => _ExploreTabViewState();
}

class _ExploreTabViewState extends State<ExploreTabView> {
  final _searchController = TextEditingController();
  final _operatorService = OperatorService();
  List<OperatorModel> _operators = [];
  List<StationSummary> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadOperators();
    _triggerInitialBBox();
  }

  Future<void> _loadOperators() async {
    try {
      final ops = await _operatorService.fetchOperators();
      if (mounted) setState(() => _operators = ops);
    } catch (_) {}
  }

  void _triggerInitialBBox() {
    context.read<MapBloc>().add(
          const MapCameraChanged(
            minLon: 28.5,
            minLat: 40.8,
            maxLon: 29.5,
            maxLat: 41.3,
            zoom: 10.0,
          ),
        );
  }

  Future<void> _handleUserLocation() async {
    final pos = await LocationService.getCurrentPosition();
    if (pos != null && mounted) {
      context.read<MapBloc>().add(const MapUserLocationRequested());
      context.read<MapBloc>().add(
            MapCameraChanged(
              minLon: pos.longitude - 0.05,
              minLat: pos.latitude - 0.05,
              maxLon: pos.longitude + 0.05,
              maxLat: pos.latitude + 0.05,
              zoom: 13.0,
            ),
          );
    } else {
      if (mounted) {
        CustomToast.show(
          context,
          'Konum izni verilmedi veya servis kapalı.',
          isError: true,
        );
      }
    }
  }

  void _onStationSelected(StationSummary station) {
    context.read<MapBloc>().add(MapStationSelected(station));
    context.read<StationDetailBloc>().add(StationDetailLoaded(station.slug.isNotEmpty ? station.slug : station.id));
  }

  void _onSearchQueryChanged(String query) {
    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults = [];
      });
      return;
    }
    setState(() => _isSearching = true);
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<FilterBloc, FilterState>(
          listener: (context, state) {
            if (state.toastMessage != null) {
              CustomToast.show(context, state.toastMessage!);
              context.read<FilterBloc>().add(const FilterToastCleared());
            }
          },
        ),
        BlocListener<StationDetailBloc, StationDetailState>(
          listener: (context, state) {
            if (state.status == StationDetailStatus.error && state.errorMessage != null) {
              CustomToast.show(context, state.errorMessage!, isError: true);
            }
          },
        ),
      ],
      child: BlocBuilder<MapBloc, MapState>(
        builder: (context, mapState) {
          final filterState = context.watch<FilterBloc>().state;

          return Scaffold(
            resizeToAvoidBottomInset: false,
            body: Stack(
              children: [
                Positioned.fill(
                  child: MapCanvasWidget(
                    stations: mapState.stations,
                    clusters: mapState.clusters,
                    selectedStation: mapState.selectedStation,
                    isClusters: mapState.isClusters,
                    onStationSelected: _onStationSelected,
                    onClusterSelected: (c) {
                      context.read<MapBloc>().add(
                            MapCameraChanged(
                              minLon: c.lon - 0.02,
                              minLat: c.lat - 0.02,
                              maxLon: c.lon + 0.02,
                              maxLat: c.lat + 0.02,
                              zoom: 13.0,
                            ),
                          );
                    },
                    onCameraChanged: (minLon, minLat, maxLon, maxLat, zoom) {
                      context.read<MapBloc>().add(
                            MapCameraChanged(
                              minLon: minLon,
                              minLat: minLat,
                              maxLon: maxLon,
                              maxLat: maxLat,
                              zoom: zoom,
                            ),
                          );
                    },
                  ),
                ),

                if (mapState.isOffline)
                  const Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: SafeArea(child: OfflineStatusBanner()),
                  ),

                SafeArea(
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.s4,
                          vertical: AppSpacing.s2,
                        ),
                        child: SearchBarWidget(
                          controller: _searchController,
                          onChanged: _onSearchQueryChanged,
                          onClear: () {
                            _searchController.clear();
                            setState(() {
                              _isSearching = false;
                              _searchResults = [];
                            });
                          },
                        ),
                      ),
                      if (_isSearching && _searchResults.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
                          child: SearchAutocompleteDropdown(
                            results: _searchResults,
                            onSelected: (station) {
                              setState(() {
                                _isSearching = false;
                                _searchController.text = station.name ?? station.address;
                              });
                              _onStationSelected(station);
                            },
                          ),
                        ),
                      FilterChipsBar(
                        selectedOperator: filterState.selectedOperatorSlug,
                        isPublicOnly: filterState.isPublicOnly,
                        onOperatorFilterTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => OperatorFilterDialog(
                              operators: _operators,
                              initialSelectedSlug: filterState.selectedOperatorSlug,
                              onSelected: (slug) {
                                context.read<FilterBloc>().add(FilterOperatorChanged(slug));
                              },
                            ),
                          );
                        },
                        onPublicOnlyToggle: (val) {
                          context.read<FilterBloc>().add(FilterPublicOnlyToggled(val));
                        },
                        onLockedFilterTap: (name) {
                          context.read<FilterBloc>().add(FilterLockedTapped(name));
                        },
                      ),
                    ],
                  ),
                ),

                Positioned(
                  bottom: mapState.selectedStation != null ? 300 : 32,
                  right: AppSpacing.s4,
                  child: LocationFabWidget(
                    onPressed: _handleUserLocation,
                  ),
                ),

                if (mapState.selectedStation != null)
                  StationDetailSheet(
                    summary: mapState.selectedStation!,
                    onReportTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        shape: const RoundedRectangleBorder(
                          borderRadius: AppRadius.sheetTopXl,
                        ),
                        builder: (ctx) => IssueReportModal(
                          station: mapState.selectedStation!,
                        ),
                      );
                    },
                    onContributeTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        shape: const RoundedRectangleBorder(
                          borderRadius: AppRadius.sheetTopXl,
                        ),
                        builder: (ctx) => ContributeDataModal(
                          station: mapState.selectedStation!,
                        ),
                      );
                    },
                    onClose: () {
                      context.read<MapBloc>().add(const MapStationDeselected());
                    },
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
