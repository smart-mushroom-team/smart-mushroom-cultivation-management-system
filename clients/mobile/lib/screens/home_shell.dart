import 'dart:async';

import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../notifications/notification_controller.dart';
import '../notifications/notifications_tab.dart';
import '../push/push_registrar.dart';
import '../push/push_service.dart';
import '../rent/rent_tab.dart';
import '../theme.dart';
import '../trays/cycle_screen.dart';
import '../trays/tray_repository.dart';
import '../trays/trays_tab.dart';
import 'account_tab.dart';

/// Khung chính sau khi đăng nhập: thanh điều hướng dưới cùng với bốn tab.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.registrar, required this.push});

  final PushRegistrar registrar;
  final PushService push;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  static const _trays = 0;
  static const _rent = 1;
  static const _notes = 2;

  int _index = _trays;
  late final NotificationController _notifications;
  final List<StreamSubscription<PushMessage>> _subs = [];

  static const _labels = [
    'Khay của tôi',
    'Thuê khay',
    'Thông báo',
    'Tài khoản'
  ];
  static const _icons = [
    Icons.grid_view_outlined,
    Icons.add_circle_outline,
    Icons.notifications_none,
    Icons.person_outline
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _notifications = NotificationController(AuthScope.read(context).api);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _notifications.load();
    });
    _subs.add(widget.push.onForeground.listen(_onForeground));
    _subs.add(widget.push.onOpened.listen(_onOpenedFromPush));
    widget.push.initialMessage().then((m) {
      if (m != null && mounted) _onOpenedFromPush(m);
    }, onError: (Object _) {});
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final s in _subs) {
      s.cancel();
    }
    _notifications.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _notifications.load();
  }

  /// Push đến khi app đang mở: FCM không tự hiện, nên tự báo bằng thanh thông báo ngắn và cập nhật số chưa đọc.
  void _onForeground(PushMessage m) {
    _notifications.load();
    final text = [m.title, m.body]
        .whereType<String>()
        .where((s) => s.isNotEmpty)
        .join(': ');
    if (text.isEmpty) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(text, maxLines: 2, overflow: TextOverflow.ellipsis),
        action: SnackBarAction(
            label: 'Xem', onPressed: () => setState(() => _index = _notes)),
      ));
  }

  /// Bấm vào thông báo đẩy trên thanh trạng thái: mở tab Thông báo, và mở luôn khay nếu thông báo nói về một khay.
  void _onOpenedFromPush(PushMessage m) {
    if (!mounted) return;
    setState(() => _index = _notes);
    _notifications.load();
    final cycleId = m.data['cycleId'];
    if (cycleId != null && cycleId.isNotEmpty) _openCycle(cycleId);
  }

  void _openNotification(AppNotification n) {
    final cycleId = n.cycleId;
    if (cycleId != null) {
      _openCycle(cycleId);
    } else if (n.rentalId != null || n.roomId != null) {
      setState(() => _index = _trays);
    }
  }

  Future<void> _openCycle(String cycleId) async {
    final auth = AuthScope.read(context);
    final repo = TrayRepository(auth.api);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      final cycle = await repo.cycle(cycleId);
      final rooms = await repo.roomNames();
      if (!mounted) return;
      navigator.push(MaterialPageRoute<void>(
        builder: (_) => CycleScreen(
            cycleId: cycle.id,
            trayCode: cycle.trayCode,
            roomId: cycle.roomId,
            roomName: rooms[cycle.roomId] ?? 'nuôi',
            auth: auth),
      ));
    } catch (_) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(
            content: Text('Khay này không còn trong danh sách của bạn.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_labels[_index]),
        backgroundColor: AppColors.paper,
        surfaceTintColor: Colors.transparent,
      ),
      body: IndexedStack(
        index: _index,
        children: [
          TraysTab(
              active: _index == _trays,
              onGoRent: () => setState(() => _index = _rent)),
          RentTab(
              active: _index == _rent,
              onGoToTrays: () => setState(() => _index = _trays)),
          NotificationsTab(
              controller: _notifications,
              active: _index == _notes,
              onOpen: _openNotification),
          AccountTab(registrar: widget.registrar),
        ],
      ),
      bottomNavigationBar: ListenableBuilder(
        listenable: _notifications,
        builder: (context, _) {
          final unread = _notifications.unread;
          return NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            destinations: [
              for (var i = 0; i < _labels.length; i++)
                NavigationDestination(
                  icon: i == _notes
                      ? Badge(
                          isLabelVisible: unread > 0,
                          label: Text(unread > 99 ? '99+' : '$unread'),
                          child: Icon(_icons[i]))
                      : Icon(_icons[i]),
                  label: _labels[i],
                ),
            ],
          );
        },
      ),
    );
  }
}
