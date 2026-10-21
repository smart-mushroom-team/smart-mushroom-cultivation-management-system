/// Khớp schema `Package` (core.yaml): gói thuê khay. Tên `RentalPackage` để khỏi nhầm với "package" của Dart.
class RentalPackage {
  const RentalPackage({
    required this.id,
    required this.name,
    required this.durationDays,
    required this.pricePerTray,
    required this.isActive,
  });

  factory RentalPackage.fromJson(Map<String, dynamic> json) => RentalPackage(
        id: json['id'] as String,
        name: json['name'] as String,
        durationDays: json['durationDays'] as int,
        pricePerTray: json['pricePerTray'] as int,
        isActive: json['isActive'] as bool,
      );

  final String id;
  final String name;
  final int durationDays;

  /// VND mỗi khay (số nguyên).
  final int pricePerTray;
  final bool isActive;
}

/// Khớp schema `PackageList` (core.yaml): các gói + số khay còn trống dùng chung cho mọi gói.
class PackageCatalog {
  const PackageCatalog({required this.items, required this.availableTrayCount});

  factory PackageCatalog.fromJson(Map<String, dynamic> json) => PackageCatalog(
        items: [for (final e in json['items'] as List) RentalPackage.fromJson(e as Map<String, dynamic>)],
        availableTrayCount: json['availableTrayCount'] as int,
      );

  final List<RentalPackage> items;
  final int availableTrayCount;
}
