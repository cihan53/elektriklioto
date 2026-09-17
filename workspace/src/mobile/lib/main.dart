
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'bloc/filter/filter_bloc.dart';
import 'bloc/map/map_bloc.dart';
import 'bloc/station_detail/station_detail_bloc.dart';
import 'bloc/theme/theme_cubit.dart';
import 'bloc/theme/theme_state.dart';
import 'core/storage/hive_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'views/main_navigation_view.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await HiveStorageService().init();

  runApp(const ElektrikliOtoApp());
}

class ElektrikliOtoApp extends StatelessWidget {
  const ElektrikliOtoApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ThemeCubit()),
        BlocProvider(create: (_) => MapBloc()),
        BlocProvider(create: (_) => FilterBloc()),
        BlocProvider(create: (_) => StationDetailBloc()),
      ],
      child: BlocBuilder<ThemeCubit, ThemeState>(
        builder: (context, themeState) {
          return MaterialApp(
            title: 'elektriklioto.com',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeState.themeMode,
            home: const MainNavigationView(),
          );
        },
      ),
    );
  }
}
