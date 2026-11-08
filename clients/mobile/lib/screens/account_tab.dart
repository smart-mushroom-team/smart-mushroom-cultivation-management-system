import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../core/api_client.dart';
import '../core/config.dart';
import '../push/push_registrar.dart';
import '../rent/my_rentals_screen.dart';
import '../theme.dart';
import '../widgets/notice.dart';

String pushStatusText(PushStatus s) => switch (s) {
      PushStatus.registered => 'Thông báo đẩy: đã bật trên máy này.',
      PushStatus.unavailable => 'Thông báo đẩy: bản cài này chưa cấu hình Firebase. Bạn vẫn xem được thông báo trong tab Thông báo.',
      PushStatus.denied => 'Thông báo đẩy: bạn đã tắt quyền thông báo. Hãy bật lại trong Cài đặt của máy.',
      PushStatus.error => 'Thông báo đẩy: chưa đăng ký được với máy chủ, sẽ thử lại khi bạn mở lại ứng dụng.',
      PushStatus.starting || PushStatus.off => 'Thông báo đẩy: đang thiết lập...',
    };

/// Mô tả kết quả của "Gửi thông báo thử" (server trả registeredTokens, sent, dryRun).
String testPushResult(Map<String, dynamic> r) {
  final registered = (r['registeredTokens'] as num?)?.toInt() ?? 0;
  final sent = (r['sent'] as num?)?.toInt() ?? 0;
  if (registered == 0) return 'Máy này chưa đăng ký nhận thông báo đẩy, nên chưa gửi được.';
  if (r['dryRun'] == true) return 'Máy chủ đang ở chế độ thử (FCM_DRY_RUN): chỉ ghi log, chưa gửi thật.';
  if (sent > 0) return 'Đã gửi. Thông báo sẽ hiện trong vài giây.';
  return 'Máy chủ chưa gửi được. Nhờ quản trị viên kiểm tra cấu hình Firebase.';
}

class AccountTab extends StatefulWidget {
  const AccountTab({super.key, required this.registrar});

  final PushRegistrar registrar;

  @override
  State<AccountTab> createState() => _AccountTabState();
}

class _AccountTabState extends State<AccountTab> {
  bool _testing = false;
  String? _testResult;
  bool _testFailed = false;

  Future<void> _confirmLogout() async {
    final auth = AuthScope.read(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn cần đăng nhập lại để xem khay nấm.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Hủy')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(96, 44)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await widget.registrar.stop(); // hủy token trước khi bỏ phiên, vì cần token đăng nhập để gọi server
    await auth.logout();
  }

  Future<void> _testPush() async {
    final api = AuthScope.read(context).api;
    setState(() {
      _testing = true;
      _testResult = null;
    });
    try {
      final r = await api.post('/api/core/notifications/test-push') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _testing = false;
        _testFailed = false;
        _testResult = testPushResult(r);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _testing = false;
        _testFailed = true;
        _testResult = 'Không gửi thử được. ${describeError(e)}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = AuthScope.of(context).session;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(session?.name ?? '', key: const Key('account-name'), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        const Text('Khách hàng', style: TextStyle(color: AppColors.mute)),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          key: const Key('my-rentals'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), alignment: Alignment.centerLeft),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => MyRentalsScreen(auth: AuthScope.read(context)))),
          icon: const Icon(Icons.receipt_long_outlined),
          label: const Text('Đơn thuê của tôi'),
        ),
        const SizedBox(height: 24),
        const Text('Thông báo đẩy', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 6),
        ListenableBuilder(
          listenable: widget.registrar,
          builder: (context, _) => Text(pushStatusText(widget.registrar.status), key: const Key('push-status'), style: const TextStyle(color: AppColors.mute, height: 1.35)),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          key: const Key('test-push'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
          onPressed: _testing ? null : _testPush,
          child: _testing ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2.5)) : const Text('Gửi thông báo thử'),
        ),
        if (_testResult != null) ...[
          const SizedBox(height: 10),
          Notice(_testResult!, tone: _testFailed ? NoticeTone.error : NoticeTone.info, key: const Key('test-push-result')),
        ],
        const SizedBox(height: 24),
        OutlinedButton(
          key: const Key('logout'),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          onPressed: _confirmLogout,
          child: const Text('Đăng xuất'),
        ),
        const SizedBox(height: 24),
        const Text('Máy chủ', style: TextStyle(color: AppColors.mute, fontSize: 12)),
        const SelectableText(AppConfig.apiBaseUrl, style: TextStyle(fontSize: 13)),
      ],
    );
  }
}
