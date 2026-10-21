import 'cycle_summary.dart';
import 'my_tray.dart';
import 'my_trays_repository.dart';

/// Dữ liệu mẫu để làm giao diện khi API chưa xong. Bật bằng `--dart-define=FAKE_REPOS=trays`.
class FakeMyTraysRepository implements MyTraysRepository {
  @override
  Future<List<MyTray>> listMyTrays() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return [
      MyTray(
        trayId: 'fake-tray-1',
        trayCode: 'A1-02-03-01',
        roomId: 'fake-room-1',
        roomName: 'Phòng ủ A1',
        location: const TrayLocation(row: 2, shelf: 3, slot: 1),
        rentalId: 'fake-rental-1',
        rentalEndDate: today.add(const Duration(days: 12)),
        daysRemaining: 12,
        currentCycle: CycleSummary(
          id: 'fake-cycle-1',
          stage: CycleStage.fruiting,
          status: 'GROWING',
          variety: 'Nấm sò trắng',
          startDate: today.subtract(const Duration(days: 18)),
          expectedHarvestDate: today.add(const Duration(days: 6)),
        ),
      ),
      MyTray(
        trayId: 'fake-tray-2',
        trayCode: 'A1-02-03-02',
        roomId: 'fake-room-1',
        roomName: 'Phòng ủ A1',
        location: const TrayLocation(row: 2, shelf: 3, slot: 2),
        rentalId: 'fake-rental-1',
        rentalEndDate: today.add(const Duration(days: 12)),
        daysRemaining: 12,
      ),
    ];
  }
}
