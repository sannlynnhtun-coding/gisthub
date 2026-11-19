import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:gist_hub_flutter/src/appearance.dart';
import 'package:gist_hub_flutter/src/theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'appearance catalog includes every palette, style, preset and usable font asset',
    () async {
      final catalog =
          jsonDecode(
                await rootBundle.loadString('assets/appearance/catalog.json'),
              )
              as Map<String, dynamic>;
      final appearance = Appearance(catalog: catalog);
      expect(appearance.options('themes').length, 177);
      expect(appearance.options('styles').length, 68);
      expect(appearance.options('presets').length, 31);
      expect(appearance.options('fonts').length, 76);
      for (final id in [
        'boardui-dark',
        'kit-bencho-dark',
        'kit-beui-pro-dark',
        'kit-obsidian-dark',
      ]) {
        final preset = appearance.option('presets', id)!;
        expect(
          appearance.option('themes', preset['theme'] as String),
          isNotNull,
        );
        expect(
          appearance.option('styles', preset['style'] as String),
          isNotNull,
        );
        expect(appearance.option('fonts', preset['font'] as String), isNotNull);
      }
      for (final font in appearance.options('fonts')) {
        for (final path in (font['assets'] as List).cast<String>()) {
          expect((await rootBundle.load(path)).lengthInBytes, greaterThan(0));
        }
      }
      final chosen = appearance.options('themes').first;
      final themed = buildGistHubTheme(
        chosen['dark'] == true ? Brightness.dark : Brightness.light,
        appearance: Appearance(
          catalog: catalog,
          theme: chosen['id'] as String,
          style: 'neobrutalism',
        ),
      );
      expect(
        themed.scaffoldBackgroundColor,
        appearanceColor(chosen['colors']['background'] as String),
      );
      expect((themed.cardTheme.shape as RoundedRectangleBorder).side.width, 3);
      final bencho = buildGistHubTheme(
        Brightness.dark,
        appearance: Appearance(
          catalog: catalog,
          theme: 'kit-bencho-dark',
          style: 'kit-bencho',
        ),
      );
      expect(bencho.scaffoldBackgroundColor, const Color(0xff0a0a0a));
      final buttonShape =
          bencho.filledButtonTheme.style!.shape!.resolve({})
              as RoundedRectangleBorder;
      expect(buttonShape.borderRadius, BorderRadius.circular(999));
    },
  );
  test(
    'appearance choices and reset persist while loading local fonts',
    () async {
      SharedPreferences.setMockInitialValues({});
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final ready = Completer<void>();
      container.listen(appearanceProvider, (_, next) {
        if (!ready.isCompleted &&
            (next.catalog.isNotEmpty || next.error != null)) {
          ready.complete();
        }
      });
      await ready.future;
      expect(container.read(appearanceProvider).error, isNull);
      final controller = container.read(appearanceProvider.notifier);
      await controller.choose(
        theme: 'light',
        style: 'neobrutalism',
        font: 'myanmar',
      );
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('gist_hub_palette'), 'light');
      expect(prefs.getString('gist_hub_style'), 'neobrutalism');
      expect(
        container.read(appearanceProvider).fontFamily,
        'Noto Sans Myanmar Variable',
      );
      await controller.choose(theme: '', style: 'default', font: 'default');
      expect(container.read(appearanceProvider).font, 'default');
      expect(container.read(appearanceProvider).error, isNull);
    },
  );
}
