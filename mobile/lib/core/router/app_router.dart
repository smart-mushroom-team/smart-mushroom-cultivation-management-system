import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/home/presentation/home_shell.dart';
import '../../features/packages/data/rental_package.dart';
import '../../features/packages/presentation/packages_screen.dart';
import '../../features/rentals/presentation/rent_tray_screen.dart';
import '../../features/trays/presentation/my_trays_screen.dart';

/// Bảng điều hướng. Đăng nhập/đăng xuất chỉ cần đổi `authControllerProvider`, router tự chuyển màn hình.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen<AuthState>(authControllerProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loc = state.matchedLocation;
      final onAuthPage = loc == '/login' || loc == '/register';
      switch (status) {
        case AuthStatus.unknown:
          return loc == '/splash' ? null : '/splash';
        case AuthStatus.unauthenticated:
          return onAuthPage ? null : '/login';
        case AuthStatus.authenticated:
          return (onAuthPage || loc == '/splash') ? '/trays' : null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => HomeShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/trays',
              builder: (_, __) => const MyTraysScreen(),
              routes: [
                // Nằm trong nhánh tab "Khay của tôi" nên thanh điều hướng dưới vẫn hiện và nút Back quay về danh sách khay.
                GoRoute(
                  path: 'packages',
                  builder: (_, __) => const PackagesScreen(),
                  routes: [
                    GoRoute(
                      path: 'rent',
                      // Gói được truyền qua `extra`; mở thẳng đường dẫn này (không có gói) thì quay về danh sách gói.
                      redirect: (_, state) => state.extra is RentalPackage ? null : '/trays/packages',
                      builder: (_, state) => RentTrayScreen(package: state.extra! as RentalPackage),
                    ),
                  ],
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/notifications',
              builder: (_, __) => const PlaceholderScreen(
                title: 'Thông báo',
                icon: Icons.notifications,
                note: 'Thông báo của bạn sẽ hiện ở đây (task #191).',
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
          ]),
        ],
      ),
    ],
  );
});

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}
