
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../../core/theme/tokens.dart';
import 'explore_tab_view.dart';
import 'favorites_tab_view.dart';
import 'settings_tab_view.dart';

class MainNavigationView extends StatefulWidget {
  const MainNavigationView({Key? key}) : super(key: key);

  @override
  State<MainNavigationView> createState() => _MainNavigationViewState();
}

class _MainNavigationViewState extends State<MainNavigationView> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    ExploreTabView(),
    FavoritesTabView(),
    SettingsTabView(),
  ];

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: colors.bgSurface,
        indicatorColor: colors.primaryContainer,
        elevation: 2,
        destinations: const [
          NavigationDestination(
            icon: Icon(LucideIcons.map),
            selectedIcon: Icon(LucideIcons.map_pin),
            label: 'Keşfet',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.star),
            selectedIcon: Icon(Icons.star),
            label: 'Favoriler',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.settings),
            selectedIcon: Icon(LucideIcons.settings_2),
            label: 'Ayarlar',
          ),
        ],
      ),
    );
  }
}
