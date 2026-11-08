# Ứng dụng di động: chạy trên điện thoại thật và đóng gói APK

Phần cài đặt lần đầu và chạy trên máy ảo nằm ở `clients/mobile/README.md`. Tài liệu này là phần còn lại để có một file APK cài
được lên điện thoại. Firebase (thông báo đẩy) xem `docs/FCM.md`.

## 1. Sửa dự án Android (một lần, sau `flutter create`)

Thư mục `android/` do `flutter create` sinh ra, không nằm trong mã nguồn nên các chỗ sau phải tự sửa.

`android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <application
        android:label="Trại nấm"
        android:usesCleartextTraffic="true"
        ...
```

| Dòng | Vì sao |
|---|---|
| `INTERNET` | **Bắt buộc cho bản release.** Bản debug được Flutter tự thêm quyền này nên chạy `flutter run` vẫn có mạng, nhưng APK release thiếu nó thì không gọi được server nào. |
| `POST_NOTIFICATIONS` | Android 13 trở lên mới cho hiện thông báo đẩy. |
| `android:label` | Tên hiện dưới biểu tượng. Mặc định là `mushroom_mobile`. |
| `usesCleartextTraffic` | Hệ thống chạy bằng HTTP thường (chưa có HTTPS). Android 9 trở lên chặn HTTP nếu thiếu dòng này. Khi triển khai thật với HTTPS thì bỏ dòng này. |

Biểu tượng ứng dụng (đã có sẵn ảnh trong `assets/icon/`):

```bash
cd clients/mobile
flutter pub get
dart run flutter_launcher_icons
```

## 2. Chạy trên điện thoại thật

1. Điện thoại và laptop cùng mạng Wi-Fi. Lấy IP LAN của laptop: `ipconfig` (Windows) hoặc `ip addr` (Linux), ví dụ `192.168.1.10`.
2. Bật hệ thống: `make up`. Gateway lắng nghe ở cổng 8000.
3. Windows: cho phép cổng 8000 đi vào (Windows Defender Firewall -> Inbound Rules -> New Rule -> Port -> TCP 8000), nếu không
   điện thoại sẽ báo không kết nối được máy chủ dù laptop vẫn truy cập được.
4. Kiểm tra từ trình duyệt trên điện thoại: mở `http://192.168.1.10:8000/health` phải thấy kết quả.
5. Chạy app trỏ vào IP đó (`10.0.2.2` chỉ đúng trên máy ảo Android):

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8000
```

## 3. Đóng gói APK

```bash
cd clients/mobile
flutter build apk --release --dart-define=API_BASE_URL=http://192.168.1.10:8000
```

Địa chỉ máy chủ được ghi cứng vào APK lúc build. Đổi mạng hoặc đổi IP thì build lại.

File ra ở `build/app/outputs/flutter-apk/app-release.apk` (khoảng 20-30 MB). Cài vào điện thoại bằng một trong hai cách:

- Cắm cáp, bật *Gỡ lỗi USB*, chạy `adb install -r build/app/outputs/flutter-apk/app-release.apk`.
- Chép file sang điện thoại (Zalo, Drive, cáp) rồi mở file, cho phép *Cài ứng dụng không rõ nguồn gốc* khi Android hỏi.

Muốn file nhỏ hơn: thêm `--split-per-abi` rồi cài bản `app-arm64-v8a-release.apk` (hầu hết điện thoại hiện nay).

### Ký ứng dụng

Mẫu dự án Flutter mặc định ký bản release bằng khóa debug, đủ để cài và demo trong lớp. Phát hành thật (Google Play) cần khóa riêng:

```bash
keytool -genkey -v -keystore ~/mushroom-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mushroom
```

Tạo `android/key.properties` (không commit, thêm vào `.gitignore`):

```
storePassword=...
keyPassword=...
keyAlias=mushroom
storeFile=C:/duong/dan/mushroom-release.jks
```

Rồi khai báo khóa trong `android/app/build.gradle(.kts)` theo hướng dẫn "Sign the app" của Flutter
(https://docs.flutter.dev/deployment/android#sign-the-app); cú pháp khác nhau giữa `.gradle` và `.gradle.kts` nên làm theo đúng
trang đó cho template của máy bạn. **Mất khóa này thì không cập nhật được ứng dụng đã phát hành**, hãy sao lưu.

## 4. Kịch bản kiểm tra trọn vẹn trên điện thoại

1. Web (Admin): *Giống nấm* đã có danh mục; *Phòng, khay, gói* có phòng, khay và ít nhất một gói.
2. App: Đăng ký -> tab Tài khoản ghi "Thông báo đẩy: đã bật" (nếu đã cấu hình Firebase).
3. Tab Thuê khay: chọn gói, số khay, bấm Chọn giống -> chọn một giống trong danh mục -> Thuê. Thử thêm một lần nhập giống tự đặt.
4. Web (Operator): *Đợt nuôi* -> *Giống chờ duyệt* -> Duyệt hoặc Từ chối (kèm lý do). App nhận thông báo.
5. Web: chuyển giai đoạn khay. App nhận thông báo, tab Khay của tôi cập nhật.
6. Chạy `make simulate` để có số đo; app hiện nhiệt độ, độ ẩm, biểu đồ 24 giờ và ảnh camera trong chi tiết khay.
7. Web: thu hoạch hoặc loại bỏ khay. App nhận thông báo; khi mọi khay của đơn xong thì đơn hoàn tất.

## 5. Gặp lỗi

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| `flutter run` có mạng, APK release không có mạng | Thiếu `INTERNET` trong `AndroidManifest.xml` (mục 1). |
| "Cleartext HTTP traffic not permitted" | Thiếu `android:usesCleartextTraffic="true"`. |
| Máy ảo kết nối được, điện thoại thật thì không | Đang dùng `10.0.2.2`; hoặc tường lửa chặn cổng 8000; hoặc điện thoại khác mạng Wi-Fi. |
| Tab Tài khoản ghi "chưa cấu hình Firebase" | Chưa có `google-services.json` hoặc chưa bật plugin Gradle (`docs/FCM.md`). |
| Có "đã bật" nhưng bấm Gửi thử không thấy gì | Server đang `FCM_DRY_RUN=true` (app báo rõ); hoặc app đang mở nên chỉ hiện thanh báo ngắn trong app. Đưa app ra màn hình chính rồi gửi lại. |
| Gõ tiếng Việt kiểu VNI/Telex bị mất chữ | Đã sửa ở ô nhập giống nấm (bản 5l). Nếu còn gặp ở ô khác, ghi lại ô nào, bộ gõ nào (Gboard, Unikey...) và báo lại. |
| `flutter create` ghi đè `lib/main.dart` | Giải nén lại bản zip mới nhất đè lên một lần nữa. |
