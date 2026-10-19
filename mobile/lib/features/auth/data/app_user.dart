/// Khớp schema `User` trong docs/openapi/identity.yaml.
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.address,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
      );

  final String id;
  final String name;
  final String email;

  /// `ADMIN`, `OPERATOR` hoặc `CUSTOMER`.
  final String role;
  final String? phone;
  final String? address;

  bool get isCustomer => role == 'CUSTOMER';
}
