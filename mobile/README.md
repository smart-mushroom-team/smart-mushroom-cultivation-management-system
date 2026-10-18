# Mobile (Flutter) – Customer

Ứng dụng Android cho **Customer** của Smart Mushroom System (SRS 2.4, 7.1). Chỉ gọi **API Gateway**
(`/api/identity/**`, `/api/core/**`, `/api/monitoring/**`), không gọi thẳng service.

Đã làm: khung ứng dụng (#185) và đăng ký/đăng nhập (#186). Các tab *Khay của tôi* và *Thông báo* đang là màn hình chờ.

## Chạy lần đầu

Thư mục `android/` chưa có trong repo (cần Flutter SDK để sinh). Từ thư mục `mobile/`:

```bash
flutter create --platforms=android --project-name mushroom_customer .
git diff pubspec.yaml lib/main.dart   # lệnh trên không nên đổi 2 file này; nếu có thì khôi phục
flutter pub get
```

Android Emulator gọi máy host qua `10.0.2.2`, và Gateway dev dùng **http** (không TLS), nên bật cleartext cho bản debug:
tạo `android/app/src/debug/AndroidManifest.xml` (nếu chưa có) và thêm `android:usesCleartextTraffic="true"` vào thẻ `<application>`.
Bản release gọi Gateway trên Render dùng HTTPS nên không cần.

```bash
docker compose up --build                      # ở thư mục gốc repo, dựng Gateway + service
npm run db:seed -w services/identity           # (một lần) có tài khoản Admin; khách tự đăng ký trong app

flutter run                                    # emulator: mặc định http://10.0.2.2:8080
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8080   # điện thoại thật (cùng Wi-Fi)
flutter build apk --dart-define=API_BASE_URL=https://<gateway>.onrender.com
flutter test
```

## Cấu trúc

```
lib/
├── main.dart, app.dart          khởi động, MaterialApp.router, banner "Đang kết nối"
├── core/
│   ├── config/app_config.dart   URL Gateway (--dart-define), tiền tố route, timeout, lịch thử lại
│   ├── network/                 ApiClient (token, refresh, thử lại), ApiException, TokenPair
│   ├── storage/                 TokenStorage (Keystore qua flutter_secure_storage)
│   ├── router/app_router.dart   go_router + chuyển hướng theo trạng thái đăng nhập
│   ├── providers.dart           Riverpod: tokenStorage, apiClient
│   ├── theme/, utils/validators.dart, widgets/
└── features/
    ├── auth/{data,application,presentation}   repository -> controller (Riverpod) -> màn hình
    └── home/presentation        khung 3 tab + màn hình chờ + Tài khoản
```

Thêm tính năng mới theo mẫu `features/auth`: `data/` (repository gọi `ApiClient`) → `application/` (Notifier) → `presentation/`.
Bắt lỗi bằng `ApiException` (có `code`, `statusCode`, `fieldErrors`, `userMessage`), không bắt `DioException`.

## Hành vi đã chốt (để review)

- **Token**: access + refresh lưu trong Keystore. Gặp 401 thì làm mới **một lần** rồi gọi lại; nhiều request cùng hết hạn chỉ gửi
  **một** yêu cầu refresh (refresh token dùng một lần, gửi song song sẽ bị coi là bị đánh cắp và mất phiên).
  Refresh bị từ chối → xóa token, về màn hình đăng nhập.
- **Khởi động nguội (NFR-14)**: timeout 60 giây khớp Gateway; lỗi kết nối/timeout/502/503/504 tự thử lại tối đa 3 lần (chờ 2s, 5s, 10s)
  và hiện banner "Đang kết nối". POST chỉ thử lại khi chắc chắn chưa được xử lý (lỗi kết nối, 502, 503), **không** thử lại khi 504/timeout
  để khỏi tạo trùng đơn thuê.
- **Chỉ Customer**: Admin/Operator đăng nhập trên mobile bị từ chối và phiên vừa tạo bị thu hồi (SRS 2.4: họ dùng web).
- **Đăng ký**: gọi `POST /auth/register` rồi tự đăng nhập. Lỗi 422/409 hiện ngay dưới từng ô.
- **Mở app lúc mất mạng** có refresh token: về màn hình đăng nhập nhưng **không** xóa token.
