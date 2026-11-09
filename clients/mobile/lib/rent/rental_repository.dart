import '../core/api_client.dart';
import '../variety/variety_models.dart';

/// Số khay tối đa một đơn (khớp giới hạn của backend).
const int maxTraysPerRental = 50;

class RentalPackage {
  const RentalPackage({required this.id, required this.name, required this.durationDays, required this.pricePerTray, required this.scope, required this.varietyIds});

  final String id;
  final String name;
  final int durationDays;
  final num pricePerTray;
  final String scope;
  final List<String> varietyIds;

  factory RentalPackage.fromJson(Map<String, dynamic> j) => RentalPackage(
        id: j['id'] as String,
        name: j['name'] as String,
        durationDays: (j['duration_days'] as num).toInt(),
        pricePerTray: j['price_per_tray'] as num,
        scope: j['scope'] as String? ?? 'GENERAL',
        varietyIds: [for(final id in (j['variety_ids'] as List<dynamic>? ?? [])) id as String],
      );
}

class PackageList {
  const PackageList({required this.availableTrays, required this.packages});

  final int availableTrays;
  final List<RentalPackage> packages;

  /// Số khay nhiều nhất có thể chọn trong một lần thuê.
  int get maxCount => availableTrays < maxTraysPerRental ? availableTrays : maxTraysPerRental;

  factory PackageList.fromJson(Map<String, dynamic> j) => PackageList(
        availableTrays: (j['availableTrays'] as num).toInt(),
        packages: [for (final p in (j['packages'] as List<dynamic>)) RentalPackage.fromJson(p as Map<String, dynamic>)],
      );
}

class RentalResult {
  const RentalResult({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.totalAmount,
    required this.trayCount,
    this.variety,
    this.varietyStatus = 'NONE',
  });

  final String id;
  final String startDate;
  final String endDate;
  final num totalAmount;
  final int trayCount;
  final String? variety;
  final String varietyStatus;

  bool get varietyPending => varietyStatus == 'PENDING';

  factory RentalResult.fromJson(Map<String, dynamic> j) => RentalResult(
        id: j['id'] as String,
        startDate: j['startDate'] as String,
        endDate: j['endDate'] as String,
        totalAmount: j['totalAmount'] as num,
        trayCount: (j['trayIds'] as List<dynamic>).length,
        variety: j['variety'] as String?,
        varietyStatus: (j['varietyStatus'] as String?) ?? 'NONE',
      );
}

/// Một đơn thuê trong lịch sử của khách (`GET /rentals/mine`, khóa snake_case).
class MyRental {
  const MyRental({
    required this.id,
    required this.packageName,
    required this.trayCount,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.durationDays,
    required this.pricePerTray,
    required this.totalAmount,
    required this.growingCount,
  });

  final String id;
  final String packageName;
  final int trayCount;
  final String status; // ACTIVE, EXPIRED, COMPLETED
  final String startDate;
  final String endDate;
  final int durationDays;
  final num pricePerTray;
  final num totalAmount;
  final int growingCount; // số khay còn đang nuôi (đơn hết hạn mà > 0 thì khay cần nhân viên xử lý)

  bool get isActive => status == 'ACTIVE';

  String get statusText => switch (status) {
        'ACTIVE' => 'Đang thuê',
        'EXPIRED' => 'Đã hết hạn',
        'COMPLETED' => 'Đã hoàn tất',
        _ => status,
      };

  factory MyRental.fromJson(Map<String, dynamic> j) => MyRental(
        id: j['id'] as String,
        packageName: j['package_name'] as String,
        trayCount: (j['tray_count'] as num).toInt(),
        status: j['status'] as String,
        startDate: j['start_date'] as String,
        endDate: j['end_date'] as String,
        durationDays: (j['duration_days'] as num?)?.toInt() ?? 0,
        pricePerTray: (j['price_per_tray'] as num?) ?? 0,
        totalAmount: (j['total_amount'] as num?) ?? 0,
        growingCount: (j['growing_count'] as num?)?.toInt() ?? 0,
      );
}

class RentalSlot {
  const RentalSlot({required this.id, required this.code, required this.row,
    required this.shelf, required this.slot, required this.status});
  final String id, code, status;
  final int row, shelf, slot;
  bool get available => status == 'AVAILABLE';
  factory RentalSlot.fromJson(Map<String, dynamic> j) => RentalSlot(
    id: j['id'] as String, code: j['code'] as String,
    row: (j['row'] as num).toInt(), shelf: (j['shelf'] as num).toInt(),
    slot: (j['slot'] as num).toInt(), status: j['status'] as String);
}

class RentalRoom {
  const RentalRoom({required this.id, required this.name, required this.empty,
    required this.rented, required this.available, required this.other, required this.trays});
  final String id, name;
  final int empty, rented, available, other;
  final List<RentalSlot> trays;
  factory RentalRoom.fromJson(Map<String, dynamic> j) => RentalRoom(
    id: j['id'] as String, name: j['name'] as String,
    empty: (j['empty'] as num).toInt(), rented: (j['rented'] as num).toInt(),
    available: (j['available'] as num).toInt(), other: (j['other'] as num).toInt(),
    trays: [for (final t in j['trays'] as List<dynamic>) RentalSlot.fromJson(t as Map<String, dynamic>)]);
}

class RentalRepository {
  RentalRepository(this._api);

  final ApiClient _api;

  Future<List<RentalRoom>> roomsForRent() async => [
    for (final r in (await _api.get('/api/core/rental-availability') as List<dynamic>))
      RentalRoom.fromJson(r as Map<String, dynamic>)
  ];

  Future<RentalResult> rentSelected({required String packageId, required String roomId,
      required List<String> trayIds, required VarietyChoice variety}) async =>
    RentalResult.fromJson(await _api.post('/api/core/rentals', body: {
      'packageId': packageId, 'roomId': roomId, 'trayIds': trayIds,
      ...variety.toBody(),
    }) as Map<String, dynamic>);

  Future<PackageList> packages() async => PackageList.fromJson(await _api.get('/api/core/packages') as Map<String, dynamic>);

  Future<RentalResult> rent({required String packageId, required int trayCount, VarietyChoice? variety}) async => RentalResult.fromJson(
      await _api.post('/api/core/rentals', body: {'packageId': packageId, 'trayCount': trayCount, ...?variety?.toBody()}) as Map<String, dynamic>);

  Future<Map<String,dynamic>> requestTermination(String rentalId, {required String bankName,required String accountNumber,required String accountHolder}) async =>
      await _api.post('/api/core/terminations/rentals/$rentalId', body:{'bankName':bankName,'accountNumber':accountNumber,'accountHolder':accountHolder}) as Map<String,dynamic>;

  Future<List<Map<String,dynamic>>> myTerminations() async => [
    for(final r in (await _api.get('/api/core/terminations/mine') as List<dynamic>)) r as Map<String,dynamic>
  ];

  Future<List<MyRental>> mine() async =>
      [for (final r in (await _api.get('/api/core/rentals/mine') as List<dynamic>)) MyRental.fromJson(r as Map<String, dynamic>)];

  Future<List<Variety>> varieties() async =>
      [for (final v in (await _api.get('/api/core/varieties') as List<dynamic>)) Variety.fromJson(v as Map<String, dynamic>)];
}
