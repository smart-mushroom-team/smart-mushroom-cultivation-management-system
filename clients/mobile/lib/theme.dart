import 'package:flutter/material.dart';

class AppColors {
  static const paper = Color(0xFFFFFCF5);
  static const bone = Color(0xFFF2EDE1);
  static const ink = Color(0xFF25312B);
  static const mute = Color(0xFF777D75);
  static const line = Color(0xFFE1DCCF);
  static const spore = Color(0xFF6D8B45);
  static const sporeDeep = Color(0xFF49652D);
  static const sporeSoft = Color(0xFFEAF0DE);
  static const moss = Color(0xFF3D7651);
  static const mossSoft = Color(0xFFE3F1E7);
  static const amber = Color(0xFF8A5A00);
  static const amberSoft = Color(0xFFFFF1D1);
  static const brick = Color(0xFF9B3D32);
  static const brickSoft = Color(0xFFF9E5E1);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.spore,
    brightness: Brightness.light,
    surface: AppColors.paper,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.paper,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paper,
      foregroundColor: AppColors.ink,
      centerTitle: false,
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.paper,
      indicatorColor: AppColors.sporeSoft,
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12)),
    ),
  );
}
