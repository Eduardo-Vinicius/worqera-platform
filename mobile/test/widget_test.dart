// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:worqera_mobile/brand/theme.dart';

void main() {
  testWidgets('Worqera theme uses the brand purple', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: buildWorqeraTheme(), home: const Text('Worqera')));
    expect(find.text('Worqera'), findsOneWidget);
    expect(ThemeData().scaffoldBackgroundColor, isNot(Wq.paper));
    expect(buildWorqeraTheme().colorScheme.primary, Wq.brand);
  });
}
