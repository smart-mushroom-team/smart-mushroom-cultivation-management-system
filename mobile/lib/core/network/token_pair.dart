/// Khớp schema `TokenPair` trong docs/openapi/identity.yaml.
class TokenPair {
  const TokenPair({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory TokenPair.fromJson(Map<String, dynamic> json) => TokenPair(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresIn: (json['expiresIn'] as num?)?.toInt() ?? 0,
      );

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
}
