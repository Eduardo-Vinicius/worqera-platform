import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class Wq {
  static const paper = Color(0xFFF4F5F7);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const surface = Color(0xFFFFFFFF);
  static const brand = Color(0xFF7D26DE);
  static const action = Color(0xFF0D9488);
  static const success = Color(0xFF059669);
  static const warn = Color(0xFFD97706);
  static const danger = Color(0xFFDC2626);
}

ThemeData buildWorqeraTheme() {
  final text = ThemeData.light().textTheme;
  return ThemeData(
    useMaterial3: true,
    fontFamily: GoogleFonts.instrumentSans().fontFamily,
    scaffoldBackgroundColor: Wq.paper,
    colorScheme: ColorScheme.light(
      primary: Wq.brand,
      onPrimary: Colors.white,
      surface: Wq.surface,
      onSurface: Wq.ink,
    ),
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: Wq.paper,
      foregroundColor: Wq.ink,
      elevation: 0,
      titleTextStyle: text.titleLarge?.copyWith(color: Wq.ink, fontWeight: FontWeight.w600),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Wq.surface,
      indicatorColor: Wq.brand.withValues(alpha: 0.14),
      labelTextStyle: WidgetStatePropertyAll(text.labelMedium?.copyWith(color: Wq.ink)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Wq.brand,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Wq.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Wq.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Wq.line)),
    ),
  );
}
