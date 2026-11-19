import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'app_state.dart';
import 'appearance.dart';

const ink = Color(0xFF111111);
const muted = Color(0xFF787774);
const bone = Color(0xFFF7F6F3);
const border = Color(0xFFEAEAEA);
const card = Color(0xFFFFFFFF);
const paleRed = Color(0xFFFDEBEC);
const redText = Color(0xFF9F2F2D);
const paleBlue = Color(0xFFE1F3FE);
const blueText = Color(0xFF1F6C9F);
const paleGreen = Color(0xFFEDF3EC);
const greenText = Color(0xFF346538);
const paleYellow = Color(0xFFFBF3DB);
const yellowText = Color(0xFF956400);

const _lightPalette = AppPalette(
  background: Color(0xFFF5F7FA),
  surface: card,
  surfaceAlt: Color(0xFFF0F3F6),
  text: Color(0xFF18212D),
  mutedText: Color(0xFF5C6B7A),
  border: Color(0xFFE0E6ED),
  codeSurface: ink,
  codeText: Colors.white,
  inverseText: Colors.white,
);

const _darkPalette = AppPalette(
  background: Color(0xFF0E141B),
  surface: Color(0xFF151E29),
  surfaceAlt: Color(0xFF1B2633),
  text: Color(0xFFF5F2EA),
  mutedText: Color(0xFFA1AFBE),
  border: Color(0xFF2B3B4D),
  codeSurface: Color(0xFF0B0B0B),
  codeText: Color(0xFFF5F2EA),
  inverseText: Color(0xFF111111),
);

ThemeData buildGistHubTheme(
  Brightness brightness, {
  Appearance appearance = const Appearance(),
}) {
  var palette = brightness == Brightness.dark ? _darkPalette : _lightPalette;
  final selected = appearance.option('themes', appearance.theme);
  Map<String, dynamic>? colors;
  if (selected != null &&
      (selected['dark'] == true) == (brightness == Brightness.dark)) {
    colors = selected['colors'] as Map<String, dynamic>;
    Color color(String key) => appearanceColor(colors![key] as String);
    palette = AppPalette(
      background: color('background'),
      surface: color('card'),
      surfaceAlt: color('secondary'),
      text: color('foreground'),
      mutedText: color('muted-foreground'),
      border: color('border'),
      codeSurface: color('card'),
      codeText: color('code'),
      inverseText: color('primary-foreground'),
    );
  }
  final primary = colors == null
      ? (brightness == Brightness.dark
            ? const Color(0xFF5BD3B4)
            : const Color(0xFF007E68))
      : appearanceColor(colors['primary'] as String);
  final style = appearance.option('styles', appearance.style);
  final radii = (style?['radius'] as List? ?? [12]).cast<num>();
  final radius = BorderRadius.only(
    topLeft: Radius.circular(radii[0].toDouble()),
    topRight: Radius.circular(
      radii.length > 1 ? radii[1].toDouble() : radii[0].toDouble(),
    ),
    bottomRight: Radius.circular(
      radii.length > 2 ? radii[2].toDouble() : radii[0].toDouble(),
    ),
    bottomLeft: Radius.circular(
      radii.length > 3
          ? radii[3].toDouble()
          : radii.length > 1
          ? radii[1].toDouble()
          : radii[0].toDouble(),
    ),
  );
  final borderWidth = (style?['border'] as num? ?? 1).toDouble();
  final customStyle = appearance.style != 'default';
  final fontFamily = appearance.fontFamily;
  final capsuleActions = [
    'kit-bencho',
    'kit-beui-pro',
  ].contains(appearance.style);
  final actionRadius = capsuleActions ? BorderRadius.circular(999) : radius;
  final base = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: palette.background,
    fontFamily: fontFamily,
    fontFamilyFallback: const ['Noto Sans Myanmar Variable'],
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: brightness,
      primary: primary,
      surface: palette.surface,
    ),
    extensions: const [_lightPalette, _darkPalette],
  );

  return base.copyWith(
    extensions: [palette],
    textTheme: base.textTheme.apply(
      bodyColor: palette.text,
      displayColor: palette.text,
      fontFamily: fontFamily,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: palette.surface,
      labelStyle: TextStyle(color: palette.mutedText),
      hintStyle: TextStyle(color: palette.mutedText),
      prefixIconColor: palette.mutedText,
      suffixIconColor: palette.mutedText,
      border: _outline(
        palette.border,
        radius: customStyle ? radius : null,
        width: borderWidth,
      ),
      enabledBorder: _outline(
        palette.border,
        radius: customStyle ? radius : null,
        width: borderWidth,
      ),
      focusedBorder: _outline(
        primary,
        radius: customStyle ? radius : null,
        width: borderWidth,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardTheme: CardThemeData(
      color: palette.surface,
      elevation: customStyle
          ? (style?['elevation'] as num? ?? 0).toDouble()
          : 0,
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: customStyle
            ? radius
            : const BorderRadius.all(Radius.circular(12)),
        side: BorderSide(color: palette.border, width: borderWidth),
      ),
    ),
    filledButtonTheme: customStyle
        ? FilledButtonThemeData(
            style: FilledButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: palette.inverseText,
              shape: RoundedRectangleBorder(borderRadius: actionRadius),
            ),
          )
        : null,
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        backgroundColor: primary,
        foregroundColor: palette.inverseText,
        disabledBackgroundColor: palette.mutedText.withValues(alpha: 0.2),
        shape: RoundedRectangleBorder(
          borderRadius: customStyle ? actionRadius : BorderRadius.circular(6),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: palette.text,
        side: BorderSide(color: palette.border),
        shape: RoundedRectangleBorder(
          borderRadius: customStyle ? actionRadius : BorderRadius.circular(6),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        foregroundColor: palette.text,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    dividerTheme: DividerThemeData(color: palette.border, thickness: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: palette.background,
      foregroundColor: palette.text,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: palette.surface,
      surfaceTintColor: Colors.transparent,
      shape: customStyle
          ? RoundedRectangleBorder(
              borderRadius: radius,
              side: BorderSide(color: palette.border),
            )
          : null,
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: palette.surface,
      surfaceTintColor: Colors.transparent,
      shape: customStyle
          ? RoundedRectangleBorder(
              borderRadius: radius,
              side: BorderSide(color: palette.border),
            )
          : null,
    ),
  );
}

OutlineInputBorder _outline(
  Color color, {
  BorderRadius? radius,
  double width = 1,
}) {
  return OutlineInputBorder(
    borderRadius: radius ?? BorderRadius.circular(8),
    borderSide: BorderSide(color: color, width: width),
  );
}

class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.text,
    required this.mutedText,
    required this.border,
    required this.codeSurface,
    required this.codeText,
    required this.inverseText,
  });

  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color text;
  final Color mutedText;
  final Color border;
  final Color codeSurface;
  final Color codeText;
  final Color inverseText;

  @override
  AppPalette copyWith({
    Color? background,
    Color? surface,
    Color? surfaceAlt,
    Color? text,
    Color? mutedText,
    Color? border,
    Color? codeSurface,
    Color? codeText,
    Color? inverseText,
  }) {
    return AppPalette(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      text: text ?? this.text,
      mutedText: mutedText ?? this.mutedText,
      border: border ?? this.border,
      codeSurface: codeSurface ?? this.codeSurface,
      codeText: codeText ?? this.codeText,
      inverseText: inverseText ?? this.inverseText,
    );
  }

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      text: Color.lerp(text, other.text, t)!,
      mutedText: Color.lerp(mutedText, other.mutedText, t)!,
      border: Color.lerp(border, other.border, t)!,
      codeSurface: Color.lerp(codeSurface, other.codeSurface, t)!,
      codeText: Color.lerp(codeText, other.codeText, t)!,
      inverseText: Color.lerp(inverseText, other.inverseText, t)!,
    );
  }
}

extension AppPaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
}

void _showGlobalSearch(BuildContext context, WidgetRef ref) {
  showDialog<void>(
    context: context,
    builder: (dialogContext) {
      var query = '';
      var bookmarksOnly = false;
      return StatefulBuilder(
        builder: (dialogContext, update) => AlertDialog(
          title: const Text('Search gists'),
          content: SizedBox(
            width: 560,
            height: 420,
            child: Column(
              children: [
                TextField(
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: 'Description, filename, content, or tags',
                  ),
                  onChanged: (value) => update(() => query = value),
                ),
                FilterChip(
                  label: const Text('Bookmarks only'),
                  selected: bookmarksOnly,
                  onSelected: (value) => update(() => bookmarksOnly = value),
                ),
                Expanded(
                  child: ListView(
                    children: [
                      for (final gist
                          in ref
                              .read(gistControllerProvider.notifier)
                              .search(query)
                              .where((g) => !bookmarksOnly || g.isBookmarked)
                              .take(50))
                        ListTile(
                          title: Text(
                            gist.description.isEmpty
                                ? gist.firstFile?.filename ?? gist.id
                                : gist.description,
                          ),
                          subtitle: Text(gist.firstFile?.filename ?? ''),
                          onTap: () {
                            Navigator.pop(dialogContext);
                            context.go('/gists/${gist.id}');
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    },
  );
}

class AppShell extends ConsumerWidget {
  const AppShell({
    super.key,
    required this.child,
    this.actions = const [],
    this.footer,
    this.routePath,
  });
  final Widget child;
  final Widget? footer;
  final String? routePath;
  final List<Widget> actions;
  static const destinations = [
    ('/', 'Overview', Icons.space_dashboard_outlined),
    ('/gists', 'My library', Icons.code_rounded),
    ('/collections', 'Collections', Icons.folder_outlined),
    ('/saved', 'Saved', Icons.bookmark_border),
    ('/account', 'Account', Icons.person_outline),
    ('/discovery', 'Discover', Icons.explore_outlined),
    ('/slh-collection', 'SLH Collection', Icons.collections_bookmark_outlined),
    ('/tools', 'Developer tools', Icons.handyman_outlined),
    ('/appearance', 'Appearance', Icons.palette_outlined),
    ('/trending', 'Trending', Icons.trending_up),
    ('/login', 'Profiles', Icons.manage_accounts_outlined),
  ];

  Widget navigation(
    BuildContext context,
    WidgetRef ref, {
    required bool dismiss,
  }) {
    final current = routePath ?? GoRouterState.of(context).uri.path;
    final palette = context.palette;
    final session = ref.watch(sessionControllerProvider);
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
            child: Row(
              children: [
                const GistHubLogoMark(size: 38),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'GistHub',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: palette.text,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'A home for your snippets',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: palette.mutedText,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                for (final (path, label, icon) in destinations) ...[
                  if (path == '/' ||
                      path == '/discovery' ||
                      path == '/tools' ||
                      path == '/appearance')
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
                      child: Text(
                        switch (path) {
                          '/' => 'WORKSPACE',
                          '/discovery' => 'EXPLORE',
                          '/tools' => 'TOOLS',
                          _ => 'PREFERENCES',
                        },
                        style: TextStyle(
                          color: palette.mutedText,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: ListTile(
                      dense: true,
                      minTileHeight: 48,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      selected:
                          current == path ||
                          (path == '/gists' && current.startsWith('/gists/')),
                      selectedTileColor: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: .10),
                      selectedColor: Theme.of(context).colorScheme.primary,
                      leading: Icon(icon, size: 20),
                      title: Text(
                        label,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      onTap: () {
                        if (dismiss) Navigator.pop(context);
                        if (ref.read(soundControllerProvider)) {
                          SystemSound.play(SystemSoundType.click);
                        }
                        context.go(path);
                      },
                    ),
                  ),
                ],
                SwitchListTile(
                  dense: true,
                  title: const Text('Sounds', style: TextStyle(fontSize: 13)),
                  value: ref.watch(soundControllerProvider),
                  onChanged: (_) =>
                      ref.read(soundControllerProvider.notifier).toggle(),
                ),
                SwitchListTile(
                  dense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                  title: const Text(
                    'Blur previews',
                    style: TextStyle(fontSize: 13),
                  ),
                  value: ref.watch(blurControllerProvider),
                  onChanged: (_) =>
                      ref.read(blurControllerProvider.notifier).toggle(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              leading: const CircleAvatar(
                radius: 18,
                child: Icon(Icons.person_outline, size: 20),
              ),
              title: Text(
                session.profile?.name ?? 'Guest',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              subtitle: Text(
                session.profile == null
                    ? 'Connect GitHub'
                    : '@${session.profile!.githubUsername}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: palette.mutedText),
              ),
              trailing: const Icon(Icons.chevron_right, size: 18),
              onTap: () {
                if (dismiss) Navigator.pop(context);
                context.go('/account');
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wide = MediaQuery.sizeOf(context).width >= 1100;
    final isDark = ref.watch(themeModeControllerProvider) == ThemeMode.dark;
    final sound = ref.watch(soundControllerProvider);
    final path = routePath ?? GoRouterState.of(context).uri.path;
    final matches = destinations.where((d) => d.$1 == path);
    final title = matches.isEmpty ? 'Workspace' : matches.first.$2;
    final scaffold = Scaffold(
      drawer: wide
          ? null
          : Drawer(child: navigation(context, ref, dismiss: true)),
      appBar: AppBar(
        leading: !wide && path.startsWith('/gists/')
            ? IconButton(
                tooltip: 'Back',
                icon: const Icon(Icons.arrow_back),
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go('/gists'),
              )
            : null,
        titleSpacing: wide ? 28 : 12,
        title: wide
            ? Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              )
            : const Text(
                'GistHub',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
        actions: [
          IconButton(
            tooltip: 'Search all local gists',
            icon: const Icon(Icons.search),
            onPressed: () => _showGlobalSearch(context, ref),
          ),
          if (MediaQuery.sizeOf(context).width >= 800)
            ...actions
          else if (actions.isNotEmpty)
            IconButton(
              tooltip: 'Page actions',
              icon: const Icon(Icons.more_horiz),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                builder: (sheetContext) => SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (final action in actions)
                          if (action is IconButton)
                            ListTile(
                              leading: action.icon,
                              title: Text(action.tooltip ?? 'Action'),
                              onTap: action.onPressed == null
                                  ? null
                                  : () {
                                      Navigator.pop(sheetContext);
                                      action.onPressed!();
                                    },
                            )
                          else
                            action,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          IconButton(
            tooltip: isDark ? 'Light mode' : 'Dark mode',
            onPressed: () =>
                ref.read(themeModeControllerProvider.notifier).toggle(),
            icon: Icon(
              isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            ),
          ),
          if (wide)
            IconButton(
              tooltip: sound ? 'Mute sounds' : 'Enable sounds',
              onPressed: () =>
                  ref.read(soundControllerProvider.notifier).toggle(),
              icon: Icon(
                sound ? Icons.volume_up_outlined : Icons.volume_off_outlined,
              ),
            ),
          if (wide)
            Padding(
              padding: const EdgeInsets.only(left: 12, right: 24),
              child: FilledButton.icon(
                onPressed: () => context.push('/gists/new'),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New snippet'),
              ),
            ),
          if (!wide) const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(height: 1, color: context.palette.border),
        ),
      ),
      bottomNavigationBar: footer != null
          ? SafeArea(
              child: Padding(padding: const EdgeInsets.all(12), child: footer),
            )
          : wide || path.startsWith('/gists/')
          ? null
          : SafeArea(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  for (final entry in [
                    ('/gists', 'Gists', Icons.code),
                    ('/collections', 'Collections', Icons.folder_outlined),
                    ('/gists/new', 'Create', Icons.add_circle_outline),
                    ('/saved', 'Saved', Icons.bookmark_border),
                    ('/account', 'Account', Icons.person_outline),
                  ])
                    Expanded(
                      child: Semantics(
                        selected: path == entry.$1,
                        child: TextButton(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 2,
                              vertical: 8,
                            ),
                            minimumSize: const Size(0, 56),
                            foregroundColor: path == entry.$1
                                ? Theme.of(context).colorScheme.primary
                                : context.palette.mutedText,
                            backgroundColor: path == entry.$1
                                ? Theme.of(
                                    context,
                                  ).colorScheme.primary.withValues(alpha: .10)
                                : null,
                          ),
                          onPressed: () => entry.$1 == '/gists/new'
                              ? context.push(entry.$1)
                              : context.go(entry.$1),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(entry.$3),
                              const SizedBox(height: 4),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  entry.$2,
                                  maxLines: 1,
                                  style: const TextStyle(fontSize: 10),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1440),
            child: child,
          ),
        ),
      ),
    );
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyK, control: true): () =>
            _showGlobalSearch(context, ref),
        const SingleActivator(LogicalKeyboardKey.keyK, meta: true): () =>
            _showGlobalSearch(context, ref),
      },
      child: Focus(
        autofocus: true,
        child: wide
            ? Row(
                children: [
                  SizedBox(
                    width: 244,
                    child: Material(
                      color: context.palette.surface,
                      child: navigation(context, ref, dismiss: false),
                    ),
                  ),
                  VerticalDivider(
                    width: 1,
                    thickness: 1,
                    color: context.palette.border,
                  ),
                  Expanded(child: scaffold),
                ],
              )
            : scaffold,
      ),
    );
  }
}

class GistHubLogoMark extends StatelessWidget {
  const GistHubLogoMark({super.key, this.size = 36, this.iconSize = 21});

  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: palette.text,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: palette.border),
      ),
      alignment: Alignment.center,
      child: SvgPicture.asset(
        'assets/gisthub-logo.svg',
        width: iconSize,
        height: iconSize,
        colorFilter: ColorFilter.mode(palette.inverseText, BlendMode.srcIn),
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.background = paleBlue,
    this.foreground = blueText,
  });

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: palette.border),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        child: Text(
          label,
          style: TextStyle(
            color: foreground,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(padding: padding, child: child),
    );
  }
}
