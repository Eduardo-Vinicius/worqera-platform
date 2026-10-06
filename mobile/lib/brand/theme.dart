import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.dart';

class Wq {
  static const paper = WqTokens.paper;
  static const ink = WqTokens.ink;
  static const muted = WqTokens.textMuted;
  static const line = WqTokens.border;
  static const surface = WqTokens.surface;
  static const brand = WqTokens.brand;
  static const action = WqTokens.action;
  static const success = WqTokens.success;
  static const warn = WqTokens.warn;
  static const danger = WqTokens.danger;
}

extension WqTheme on BuildContext {
  bool get wqDark => Theme.of(this).brightness == Brightness.dark;
  Color get wqInk => wqDark ? WqTokens.darkText : Wq.ink;
  Color get wqMuted => wqDark ? WqTokens.darkMuted : Wq.muted;
  Color get wqPaper => wqDark ? WqTokens.darkPaper : Wq.paper;
  Color get wqSurface => wqDark ? WqTokens.darkSurface : Wq.surface;
  Color get wqLine => wqDark ? WqTokens.darkBorder : Wq.line;
}

ThemeData buildWorqeraTheme({bool dark = false}) {
  final base = dark ? ThemeData.dark() : ThemeData.light();
  final text = base.textTheme.apply(
    bodyColor: dark ? WqTokens.darkText : WqTokens.text,
    displayColor: dark ? WqTokens.darkText : WqTokens.text,
  );
  final brand = dark ? WqTokens.darkBrand : Wq.brand;
  final paper = dark ? WqTokens.darkPaper : Wq.paper;
  final surface = dark ? WqTokens.darkSurface : Wq.surface;
  final ink = dark ? WqTokens.darkText : Wq.ink;
  final line = dark ? WqTokens.darkBorder : Wq.line;
  return ThemeData(
    useMaterial3: true,
    brightness: dark ? Brightness.dark : Brightness.light,
    fontFamily: GoogleFonts.inter().fontFamily,
    scaffoldBackgroundColor: paper,
    colorScheme: ColorScheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: brand,
      onPrimary: dark ? WqTokens.darkInk : Colors.white,
      secondary: dark ? WqTokens.darkAction : Wq.action,
      onSecondary: dark ? WqTokens.darkInk : Colors.white,
      error: dark ? WqTokens.darkDanger : Wq.danger,
      onError: Colors.white,
      surface: surface,
      onSurface: ink,
    ),
    textTheme: text,
    splashFactory: InkRipple.splashFactory,
    pageTransitionsTheme: PageTransitionsTheme(
      builders: {
        TargetPlatform.iOS: const CupertinoPageTransitionsBuilder(),
        TargetPlatform.android: const CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: const CupertinoPageTransitionsBuilder(),
      },
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: paper,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge?.copyWith(color: ink, fontWeight: FontWeight.w700, fontSize: 20),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: surface,
      indicatorColor: brand.withValues(alpha: 0.14),
      labelTextStyle: WidgetStatePropertyAll(text.labelMedium?.copyWith(color: ink, fontWeight: FontWeight.w600)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? WqTokens.darkInk2 : Wq.ink,
      contentTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: surface,
      selectedColor: brand.withValues(alpha: 0.14),
      side: BorderSide(color: line),
      labelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: brand,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ink,
        minimumSize: const Size(0, 44),
        side: BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      hintStyle: TextStyle(color: dark ? WqTokens.darkMuted : Wq.muted),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: brand, width: 1.6)),
    ),
  );
}
