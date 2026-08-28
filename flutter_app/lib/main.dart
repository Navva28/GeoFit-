import 'package:flutter/material.dart';
import 'screens/map_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TerritoryRunnerApp());
}

class TerritoryRunnerApp extends StatelessWidget {
  const TerritoryRunnerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Territory Runner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF080808),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFF5F1F),
          secondary: Color(0xFFFF5F1F),
        ),
      ),
      home: const MapScreen(),
    );
  }
}
