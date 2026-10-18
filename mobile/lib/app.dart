import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/network/api_client.dart';
import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

final _messengerKey = GlobalKey<ScaffoldMessengerState>();

class MushroomApp extends ConsumerStatefulWidget {
  const MushroomApp({super.key});

  @override
  ConsumerState<MushroomApp> createState() => _MushroomAppState();
}

class _MushroomAppState extends ConsumerState<MushroomApp> {
  late final ApiClient _api;

  @override
  void initState() {
    super.initState();
    _api = ref.read(apiClientProvider);
    _api.reconnecting.addListener(_onReconnectingChanged);
  }

  @override
  void dispose() {
    _api.reconnecting.removeListener(_onReconnectingChanged);
    super.dispose();
  }

  /// NFR-14: khi máy chủ đang khởi động nguội, hiện "Đang kết nối" thay vì treo im lặng.
  void _onReconnectingChanged() {
    final messenger = _messengerKey.currentState;
    if (messenger == null) return;
    if (_api.reconnecting.value) {
      messenger
        ..hideCurrentMaterialBanner()
        ..showMaterialBanner(
          MaterialBanner(
            content: const Text('Đang kết nối tới máy chủ… (máy chủ có thể đang khởi động)'),
            leading: const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5)),
            actions: [TextButton(onPressed: messenger.hideCurrentMaterialBanner, child: const Text('Ẩn'))],
          ),
        );
    } else {
      messenger.hideCurrentMaterialBanner();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Smart Mushroom',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      scaffoldMessengerKey: _messengerKey,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
