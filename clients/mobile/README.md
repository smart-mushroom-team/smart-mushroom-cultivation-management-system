# Mobile (Flutter) – khung

`flutter create .` trong thư mục này. Dùng `firebase_messaging` để nhận FCM; sau đăng nhập gọi
`POST /api/core/notifications/device-tokens` để đăng ký token, khi đăng xuất gọi DELETE.
Emulator Android gọi máy host bằng `http://10.0.2.2:8000`.

Gợi ý: `lib/{api,screens,models,services}/`.
