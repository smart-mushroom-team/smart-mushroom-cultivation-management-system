# Ứng dụng di động cho khách hàng (Flutter)

Khách hàng đăng ký, thuê khay, xem tình trạng nấm và số đo nhiệt độ, độ ẩm của phòng, nhận thông báo.
Nhân viên (Admin/Operator) dùng web quản trị, không dùng ứng dụng này: đăng nhập bằng tài khoản nhân viên sẽ được hướng dẫn sang web.

Tiến độ: **5h (khung app, đăng nhập, đăng ký, đăng xuất)** và **5i (thuê khay: chọn gói, số khay, xác nhận, kết quả)** và **5j (khay của tôi: danh sách theo phòng, số đo, chi tiết khay với biểu đồ 24 giờ và ảnh camera)** xong. Đã thêm (5j+) chọn giống nấm: bảng chọn giống kèm thông tin lúc thuê, nhập giống khác (chờ nhân viên duyệt), đổi giống ở chi tiết khay. **5k (tab Thông báo, số chưa đọc, thông báo đẩy FCM, gửi thử)** xong; cấu hình Firebase xem `docs/FCM.md`. **5l (hoàn thiện)** xong: nút Back của Android về tab đầu trước khi thoát, sửa lỗi rơi chữ khi gõ tiếng Việt ở ô nhập giống, biểu tượng ứng dụng, bản 1.0.0, hướng dẫn đóng gói APK và chạy trên điện thoại thật (`docs/MOBILE.md`).

## Cài đặt lần đầu

Cần Flutter 3.22 trở lên (Dart 3.3+) và Android Studio có sẵn máy ảo Android. Thư mục này chỉ chứa mã nguồn; phần dự án Android do `flutter create` sinh ra.

```bash
cd clients/mobile
flutter create --org vn.edu.utc --project-name mushroom_mobile --platforms=android .
```

`flutter create` có thể ghi đè `lib/main.dart` và `test/widget_test.dart` bằng bản mẫu. Sau khi chạy xong, **giải nén lại file zip một lần nữa đè lên** để trả lại các file của dự án.

Rồi sửa `android/app/src/main/AndroidManifest.xml` hai chỗ (máy chủ chạy bằng HTTP thường khi phát triển, Android mặc định chặn):

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>   <!-- thêm dòng này, ngay dưới thẻ <manifest> -->
    <application
        android:usesCleartextTraffic="true"                         <!-- thêm thuộc tính này vào thẻ <application> -->
        ...
```

Cuối cùng:

```bash
flutter pub get
flutter analyze
flutter test
```

## Chạy

Bật hệ thống (`make up` ở thư mục gốc), mở máy ảo Android, rồi:

```bash
flutter run
```

Mặc định ứng dụng gọi API Gateway ở `http://10.0.2.2:8000`. Trên máy ảo Android, `10.0.2.2` là laptop chạy máy ảo, còn `localhost` là chính máy ảo nên không dùng được.
Điện thoại thật thì dùng IP LAN của laptop (cùng mạng Wi-Fi):

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8000
```

Tài khoản thử: bấm "Chưa có tài khoản? Đăng ký" ngay trong app (không cần Admin tạo).

## Cấu trúc

```
lib/core/    api_client.dart (gọi API, lỗi thống nhất tiếng Việt), jwt.dart, validators.dart (cùng luật với backend), config.dart
lib/auth/    session.dart (lưu phiên trong Keystore/Keychain), auth_controller.dart (đăng nhập/đăng ký/đăng xuất/hết hạn), auth_scope.dart
lib/screens/ auth_screen.dart (đăng nhập và đăng ký), home_shell.dart (thanh điều hướng dưới, nút Back), account_tab.dart
lib/rent/    tab Thuê khay (gói, số khay, xác nhận, giống nấm)
lib/variety/ danh mục giống nấm và bảng chọn giống
lib/trays/   tab Khay của tôi, chi tiết khay (số đo, biểu đồ, camera, giống)
lib/notifications/ tab Thông báo, số chưa đọc
lib/push/    FCM: PushService, đăng ký token (firebase_push.dart là file duy nhất import Firebase)
lib/theme.dart, lib/widgets/   màu và thành phần dùng chung (cùng bộ màu với web)
test/        core_test, auth_controller_test, widget_test, rent_test, trays_test, notifications_test, push_test, format_test
assets/icon/ biểu tượng ứng dụng (dart run flutter_launcher_icons)
```

## Đóng gói APK

Xem `docs/MOBILE.md`: sửa `AndroidManifest.xml` (đặc biệt quyền `INTERNET` cho bản release), biểu tượng, `flutter build apk`, cài lên điện thoại, kịch bản kiểm tra trọn vẹn và bảng lỗi thường gặp.

## Ghi chú thiết kế

- Phiên đăng nhập (JWT, không có refresh token) lưu bằng `flutter_secure_storage`. Hết hạn hoặc server trả 401 thì tự về màn đăng nhập kèm lời giải thích; mở lại app sau thời gian dài ở nền cũng được kiểm ngay.
- Phản hồi JSON luôn được đọc bằng UTF-8 một cách tường minh, vì server không ghi charset và thư viện `http` sẽ đọc sai tiếng Việt nếu tự đoán.
- Ô nhập có thể gõ bằng bộ gõ tiếng Việt (VNI/Telex): không đặt `maxLength`/`inputFormatters` và không `setState` mỗi lần gõ ở các ô tự do, vì bộ gõ Android sửa lại ký tự vừa gõ và sẽ rơi chữ nếu ô bị chặn hay dựng lại giữa chừng.
- Ứng dụng chỉ gọi Gateway (cổng 8000), không gọi thẳng service nào.
- Chưa có thư viện quản lý trạng thái hay điều hướng bên ngoài: `ChangeNotifier` và `Navigator` có sẵn của Flutter là đủ cho phạm vi hiện tại.
- Đánh giá số đo (UX #1): so nhiệt độ, độ ẩm mới nhất của phòng với khoảng phù hợp của giống (`variety_info` do server trả, chỉ có khi giống nằm trong danh mục). Lệch ≤ 2 °C / 5 % là "hơi", quá nữa là "quá"; số đo cũ hơn 30 phút hoặc cảm biến mất kết nối thì ghi "chưa đánh giá". Khay chưa chọn giống hoặc giống chưa có khoảng chuẩn chỉ hiện số đo. Logic ở `lib/trays/condition.dart`.
- Tab Khay của tôi chỉ hiện khay của đơn còn hạn (`rentalStatus=ACTIVE`). Mỗi phòng có thanh phân loại (Tất cả, Cấy giống, Ủ tơ, Ra quả thể, Đã thu hoạch, Giống chờ duyệt, kèm số khay) và phân trang 3 khay/trang (`lib/trays/pager.dart`: Trước, ô nhập số trang, Sau; số không hợp lệ về trang 1). "Ra quả thể" gồm cả khay Sẵn sàng thu hoạch.
- Tài khoản → "Đơn thuê của tôi" (`lib/rent/my_rentals_screen.dart`): tổng số đơn và tổng tiền, lọc Còn hạn / Hết hạn, bấm vào đơn để xem thông tin đơn và toàn bộ khay (kể cả đã hết hạn, đã thu hoạch).
