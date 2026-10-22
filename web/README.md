# Web application

Frontend cho Admin và Operator/Staff của Smart Mushroom System.

## Nguyên tắc tổ chức

- `src/core`: hạ tầng dùng chung như API client, auth, router và config.
- `src/layouts`: layout đăng nhập và dashboard.
- `src/components`: UI component dùng lại giữa nhiều feature.
- `src/features`: code theo từng nghiệp vụ; mỗi feature tự quản lý API, component, page, hook và type.
- Web chỉ gọi API Gateway, không gọi trực tiếp các service.

## Feature dự kiến

`auth`, `dashboard`, `rooms`, `trays`, `cycles`, `rentals`, `packages`, `transactions`, `monitoring`, `notifications`, `users`, `demo`.
