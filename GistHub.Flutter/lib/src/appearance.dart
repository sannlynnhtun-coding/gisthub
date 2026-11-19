import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_state.dart';
import 'theme.dart';

final appearanceProvider = NotifierProvider<AppearanceController, Appearance>(
  AppearanceController.new,
);

class Appearance {
  const Appearance({
    this.catalog = const {},
    this.theme = '',
    this.style = 'default',
    this.font = 'default',
    this.error,
  });
  final Map<String, dynamic> catalog;
  final String theme, style, font;
  final String? error;
  Iterable<Map<String, dynamic>> options(String kind) =>
      (catalog[kind] as List? ?? []).cast<Map<String, dynamic>>();
  Map<String, dynamic>? option(String kind, String id) {
    for (final item in options(kind)) {
      if (item['id'] == id) return item;
    }
    return null;
  }

  String get fontFamily =>
      option('fonts', font)?['family'] as String? ?? 'Helvetica Neue';
}

Color appearanceColor(String hex) =>
    Color(int.parse(hex.replaceFirst('#', 'ff'), radix: 16));

class AppearanceController extends Notifier<Appearance> {
  final _loadedFonts = <String>{};
  int _revision = 0;
  @override
  Appearance build() {
    Future.microtask(_restore);
    return const Appearance();
  }

  Future<void> _loadFont(Map<String, dynamic> font) async {
    final family = font['family'] as String;
    if (_loadedFonts.contains(family)) return;
    final loader = FontLoader(family);
    for (final path in (font['assets'] as List).cast<String>()) {
      loader.addFont(rootBundle.load(path));
    }
    await loader.load();
    _loadedFonts.add(family);
  }

  Future<void> _restore() async {
    try {
      final catalog =
          jsonDecode(
                await rootBundle.loadString('assets/appearance/catalog.json'),
              )
              as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      final next = Appearance(
        catalog: catalog,
        theme: prefs.getString('gist_hub_palette') ?? '',
        style: prefs.getString('gist_hub_style') ?? 'default',
        font: prefs.getString('gist_hub_font') ?? 'default',
      );
      await _loadFont(next.option('fonts', 'default')!);
      await _loadFont(next.option('fonts', 'myanmar')!);
      await _loadFont(
        next.option('fonts', next.font) ?? next.option('fonts', 'default')!,
      );
      if (ref.mounted) state = next;
    } catch (e) {
      if (ref.mounted) {
        state = Appearance(error: 'Could not load appearance settings: $e');
      }
    }
  }

  Future<void> choose({String? theme, String? style, String? font}) async {
    final revision = ++_revision;
    final next = Appearance(
      catalog: state.catalog,
      theme: theme ?? state.theme,
      style: style ?? state.style,
      font: font ?? state.font,
    );
    try {
      final face = next.option('fonts', next.font);
      if (face == null ||
          next.option('styles', next.style) == null ||
          (next.theme.isNotEmpty &&
              next.theme != 'light' &&
              next.theme != 'dark' &&
              next.option('themes', next.theme) == null)) {
        throw const FormatException('Unknown appearance option.');
      }
      await _loadFont(face);
      if (!ref.mounted || revision != _revision) return;
      state = next;
      if (theme != null && theme.isNotEmpty) {
        final dark =
            theme == 'dark' || next.option('themes', theme)?['dark'] == true;
        await ref
            .read(themeModeControllerProvider.notifier)
            .setMode(dark ? ThemeMode.dark : ThemeMode.light);
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('gist_hub_palette', next.theme);
      await prefs.setString('gist_hub_style', next.style);
      await prefs.setString('gist_hub_font', next.font);
    } catch (e) {
      if (ref.mounted && revision == _revision) {
        state = Appearance(
          catalog: state.catalog,
          theme: state.theme,
          style: state.style,
          font: state.font,
          error: 'Appearance settings were not saved: $e',
        );
      }
    }
  }
}

class AppearanceScreen extends ConsumerStatefulWidget {
  const AppearanceScreen({super.key});
  @override
  ConsumerState<AppearanceScreen> createState() => _AppearanceScreenState();
}

class _AppearanceScreenState extends ConsumerState<AppearanceScreen> {
  String category = 'themes', query = '';
  @override
  Widget build(BuildContext context) {
    final appearance = ref.watch(appearanceProvider);
    final controller = ref.read(appearanceProvider.notifier);
    final options =
        [
              if (category == 'themes') ...[
                {'id': 'light', 'name': 'Light', 'chrome': '#ffffff'},
                {'id': 'dark', 'name': 'Dark', 'chrome': '#181818'},
              ],
              ...appearance.options(category),
            ]
            .where(
              (o) =>
                  '${o['name']} ${o['source'] ?? ''} ${o['group'] ?? ''} ${o['description'] ?? ''}'
                      .toLowerCase()
                      .contains(query.toLowerCase()),
            )
            .toList();
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: Theme.of(
          context,
        ).textTheme.apply(fontFamily: 'Inter Variable'),
      ),
      child: AppShell(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Appearance',
              style: Theme.of(
                context,
              ).textTheme.headlineLarge?.copyWith(fontFamily: 'Inter Variable'),
            ),
            const Text(
              'Preview themes, native surface styles, presets and bundled fonts.',
            ),
            Wrap(
              spacing: 8,
              children: [
                for (final kind in ['themes', 'styles', 'presets', 'fonts'])
                  ChoiceChip(
                    label: Text(kind),
                    selected: category == kind,
                    onSelected: (_) => setState(() {
                      category = kind;
                      query = '';
                    }),
                  ),
              ],
            ),
            TextField(
              key: ValueKey(category),
              onChanged: (value) => setState(() => query = value),
              decoration: InputDecoration(labelText: 'Search $category'),
            ),
            TextButton(
              onPressed: appearance.catalog.isEmpty
                  ? null
                  : () => controller.choose(
                      theme: '',
                      style: 'default',
                      font: 'default',
                    ),
              child: const Text('Restore default appearance'),
            ),
            if (appearance.error != null)
              Text(
                appearance.error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            if (appearance.catalog.isEmpty && appearance.error == null)
              const LinearProgressIndicator(),
            for (final item in options)
              ListTile(
                selected: switch (category) {
                  'themes' => appearance.theme == item['id'],
                  'styles' => appearance.style == item['id'],
                  'fonts' => appearance.font == item['id'],
                  _ =>
                    appearance.theme == item['theme'] &&
                        appearance.style == item['style'] &&
                        (item['font'] == null ||
                            appearance.font == item['font']),
                },
                leading: category == 'themes'
                    ? CircleAvatar(
                        backgroundColor: appearanceColor(
                          item['chrome'] as String,
                        ),
                      )
                    : Icon(
                        category == 'fonts'
                            ? Icons.text_fields
                            : Icons.palette_outlined,
                      ),
                title: Text(item['name'] as String),
                subtitle: Text(
                  '${item['source'] ?? item['description'] ?? item['group'] ?? ''}',
                ),
                onTap: appearance.catalog.isEmpty
                    ? null
                    : () => controller.choose(
                        theme: category == 'themes'
                            ? item['id'] as String
                            : category == 'presets'
                            ? item['theme'] as String
                            : null,
                        style: category == 'styles'
                            ? item['id'] as String
                            : category == 'presets'
                            ? item['style'] as String
                            : null,
                        font: category == 'fonts'
                            ? item['id'] as String
                            : category == 'presets'
                            ? item['font'] as String?
                            : null,
                      ),
              ),
          ],
        ),
      ),
    );
  }
}
