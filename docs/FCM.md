# Thông báo đẩy (Firebase Cloud Messaging)

Core là service duy nhất gọi Firebase. Thông báo luôn được lưu vào DB trước; push chỉ là kênh bổ sung, lỗi push chỉ ghi log và
không làm hỏng nghiệp vụ (BR-18).

## Ai nhận push khi nào

| Sự kiện | Người nhận | Nguồn |
|---|---|---|
| Thuê khay thành công | Khách | Core, sau commit đơn thuê |
| Đổi giai đoạn nuôi, thu hoạch, loại bỏ đợt | Khách | Core, sau commit |
| Đơn hoàn tất (thu hoạch/loại bỏ đợt cuối, hoặc job hết hạn) | Khách | Core |
| Có đơn thuê mới, đơn hết hạn còn đợt nuôi dang dở | Operator + Admin | Core |
| Vượt ngưỡng, thiết bị offline/online | Operator + Admin | Monitoring -> RabbitMQ `alerts.events` -> Core |

Token mang vai trò của người đăng nhập lúc đăng ký. Cùng một điện thoại: Operator đăng xuất rồi khách đăng nhập thì token
chuyển sang khách và không còn nhận cảnh báo hạ tầng.

## Chạy thử không cần Firebase (mặc định)

`FCM_DRY_RUN=true` (mặc định trong `.env.example`): Core ghi log `[FCM dry-run] -> N token: ...` thay vì gửi. Đủ để demo luồng
và chạy test. Xem log: `docker compose logs -f core`.

## Bật gửi thật

1. Firebase Console -> tạo project -> Project settings -> **Service accounts** -> *Generate new private key*.
2. Lưu tệp thành `secrets/firebase-service-account.json` (thư mục `secrets/` đã nằm trong `.gitignore`; không commit khóa này).
3. Trong `.env`: `FCM_DRY_RUN=false`, `FIREBASE_CREDENTIALS_FILE=/run/secrets/firebase-service-account.json`.
4. `docker compose up -d core`. Log khởi động phải có dòng `FCM: gửi thật, service account ...`.
   Nếu thấy `ĐÃ BẬT gửi thật nhưng không thấy tệp service account` thì sai đường dẫn hoặc quên đặt tệp.
5. App mobile cấu hình cùng project Firebase để lấy FCM token (mục tiếp theo).

## Cấu hình app mobile (Android)

App chạy được khi chưa làm các bước này: không có Firebase thì tab Tài khoản ghi "chưa cấu hình Firebase" và thông báo vẫn xem được
trong tab Thông báo (app hỏi lại server khi mở tab, khi mở lại app, và khi có push lúc đang dùng). Muốn có push thật:

1. Firebase Console, **cùng project** đã tạo khóa service account ở trên -> *Add app* -> Android. Package name lấy từ
   `applicationId` trong `clients/mobile/android/app/build.gradle(.kts)` (nếu tạo bằng `flutter create --org vn.edu.utc` thì là
   `vn.edu.utc.mushroom_mobile`). Tải `google-services.json` đặt vào `clients/mobile/android/app/`.
2. Bật plugin Google Services cho Gradle (chọn đúng kiểu theo template Flutter của máy bạn):
   - Template mới (có khối `plugins {}` trong `android/settings.gradle(.kts)`): thêm vào `settings.gradle`
     `id("com.google.gms.google-services") version "4.4.2" apply false`, và vào `android/app/build.gradle(.kts)`
     khối `plugins {}` dòng `id("com.google.gms.google-services")`.
   - Template cũ: thêm `classpath 'com.google.gms:google-services:4.4.2'` vào `buildscript` của `android/build.gradle` và
     `apply plugin: 'com.google.gms.google-services'` ở cuối `android/app/build.gradle`.
   - Hoặc để `flutterfire configure` (FlutterFire CLI) tự làm cả hai bước 1-2.
3. Android 13 trở lên cần quyền hiện thông báo: thêm vào `android/app/src/main/AndroidManifest.xml`, ngay trong `<manifest>`:
   `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`
4. `flutter pub get`, rồi chạy lại app (không dùng hot reload sau khi đổi Gradle).
5. **Máy ảo phải là bản có Google Play** (biểu tượng Play Store ở cột *Play Store* khi tạo AVD) và đã đăng nhập tài khoản Google,
   nếu không FCM không cấp được token. Nếu Gradle báo `minSdkVersion`, đặt `minSdk = 23` trong `android/app/build.gradle(.kts)`.

Kiểm tra: đăng nhập app -> tab Tài khoản phải ghi "Thông báo đẩy: đã bật trên máy này" -> bấm **Gửi thông báo thử**.
Muốn thấy thông báo hiện trên thanh trạng thái, đưa app ra màn hình chính trước (app đang mở thì chỉ hiện thanh báo ngắn trong app).
Tab Tài khoản cũng báo rõ các trường hợp: bạn từ chối quyền thông báo, chưa có Firebase, hay máy chủ đang ở chế độ dry-run.

## Kiểm tra bằng API (không cần app)

Trong Swagger của Core (`/api/core/docs`), đăng nhập rồi:

1. `POST /notifications/device-tokens` với `{"token": "<FCM token thật hoặc chuỗi bất kỳ khi dry-run>", "platform": "android"}`.
2. `POST /notifications/test-push` trả `{"registeredTokens": N, "sent": M, "dryRun": true|false}`.
   Dry-run: `sent` bằng số token. Gửi thật với token thật: `sent` bằng số máy nhận được. `sent` = 0 trong khi `registeredTokens` > 0
   nghĩa là FCM từ chối (xem log core).
3. `DELETE /notifications/device-tokens/{token}` khi đăng xuất.

## Token hỏng

FCM báo token không còn hợp lệ (app bị gỡ, token cũ, sai project) thì Core xóa token đó. Lỗi tạm thời (quá tải, mất mạng) thì giữ
token. Gửi theo lô tối đa 500 token; một lô lỗi không làm mất các lô sau.

## Chỉ số (Core `/metrics`, nội bộ)

| Chỉ số | Ý nghĩa |
|---|---|
| `mushroom_push_total{target,result}` | `target`: staff/user; `result`: sent, failed, dry_run, no_token (đếm theo lần gọi) |
| `mushroom_push_dead_tokens_total` | token đã bị xóa vì không còn hợp lệ |
| `mushroom_alert_events_total{result}` | stored, duplicate, dead (tin cảnh báo từ RabbitMQ) |
| `mushroom_alert_consumer_connected` | 1 khi consumer đang nghe RabbitMQ |
