import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../theme.dart';
import '../trays/tray_models.dart' show ago;
import '../widgets/notice.dart';
import 'notification_controller.dart';

IconData notificationIcon(String type) => switch (type) {
      'RENTAL_CREATED' => Icons.receipt_long,
      'RENTAL_COMPLETED' => Icons.check_circle_outline,
      'RENTAL_EXPIRED_GROWING' => Icons.event_busy,
      'CYCLE_STAGE' => Icons.eco_outlined,
      'CYCLE_HARVESTED' => Icons.inventory_2_outlined,
      'CYCLE_DISCARDED' => Icons.delete_outline,
      'VARIETY_APPROVED' => Icons.verified_outlined,
      'VARIETY_REJECTED' => Icons.block,
      'TEMP_OUT_OF_RANGE' => Icons.thermostat,
      'HUMIDITY_OUT_OF_RANGE' => Icons.water_drop_outlined,
      'DEVICE_OFFLINE' => Icons.wifi_off,
      _ => Icons.notifications_none,
    };

/// Tab "Thông báo". Mỗi lần mở tab thì tải lại; bấm một thông báo thì đánh dấu đã đọc rồi gọi [onOpen].
class NotificationsTab extends StatefulWidget {
  const NotificationsTab(
      {super.key,
      required this.controller,
      required this.active,
      required this.onOpen,
      this.now});

  final NotificationController controller;
  final bool active;
  final void Function(AppNotification) onOpen;

  /// Chỉ để test cố định giờ.
  final DateTime? now;

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  @override
  void initState() {
    super.initState();
    if (widget.active) _loadAfterBuild();
  }

  @override
  void didUpdateWidget(NotificationsTab old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) _loadAfterBuild();
  }

  void _loadAfterBuild() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.active) widget.controller.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final c = widget.controller;
        if (!c.loaded) {
          if (c.error != null) {
            return ListView(padding: const EdgeInsets.all(20), children: [
              Notice('Không tải được thông báo. ${describeError(c.error!)}',
                  tone: NoticeTone.error),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: c.load, child: const Text('Thử lại')),
            ]);
          }
          return const Center(child: CircularProgressIndicator());
        }
        return RefreshIndicator(
          onRefresh: c.load,
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 8),
            children: [
              if (c.error != null)
                Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Notice(
                        'Chưa làm mới được. ${describeError(c.error!)}',
                        tone: NoticeTone.error)),
              if (c.items.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 64, horizontal: 24),
                  child: Column(children: [
                    Icon(Icons.notifications_none,
                        size: 48, color: AppColors.mute),
                    SizedBox(height: 12),
                    Text('Chưa có thông báo nào.',
                        key: Key('notifications-empty'),
                        style: TextStyle(fontSize: 16)),
                  ]),
                )
              else ...[
                if (c.unread > 0)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                        key: const Key('mark-all'),
                        onPressed: c.markAllRead,
                        child: Text('Đánh dấu đã đọc cả ${c.unread}')),
                  ),
                for (final n in c.items)
                  _Item(
                      n: n,
                      now: widget.now ?? DateTime.now(),
                      onTap: () {
                        c.markRead(n);
                        widget.onOpen(n);
                      }),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.n, required this.now, required this.onTap});

  final AppNotification n;
  final DateTime now;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label:
          '${n.read ? '' : 'Chưa đọc. '}${n.title}. ${n.content}. ${ago(n.createdAt, now)}',
      button: true,
      child: ExcludeSemantics(
        child: InkWell(
          key: Key('notification-${n.id}'),
          onTap: onTap,
          child: Container(
            color: n.read ? null : AppColors.sporeSoft.withAlpha(110),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(notificationIcon(n.type),
                  color: n.read ? AppColors.mute : AppColors.spore),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(n.title,
                          style: TextStyle(
                              fontWeight:
                                  n.read ? FontWeight.w500 : FontWeight.w700,
                              fontSize: 15)),
                      if (n.content.isNotEmpty)
                        Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(n.content,
                                style: const TextStyle(fontSize: 14))),
                      Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(ago(n.createdAt, now),
                              style: const TextStyle(
                                  color: AppColors.mute, fontSize: 12))),
                    ]),
              ),
              if (!n.read)
                const Padding(
                    padding: EdgeInsets.only(left: 8, top: 6),
                    child: Icon(Icons.circle,
                        size: 10,
                        color: AppColors.spore,
                        semanticLabel: 'Chưa đọc')),
            ]),
          ),
        ),
      ),
    );
  }
}
