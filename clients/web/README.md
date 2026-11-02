# Web quản trị (React + Vite + TypeScript)

Dành cho **Operator** và **Admin**. Khách thuê khay dùng ứng dụng di động (`clients/mobile`).

Thư viện: React Router, TanStack Query, Tailwind CSS 4 và Recharts.

## Chạy khi phát triển

```bash
make up
make web-install
make web-dev
```

Vite chuyển tiếp `/api/...` tới API Gateway. Có thể đặt `VITE_API_URL` để gọi trực tiếp API.

## Kiểm thử

```bash
make web-test
make ui-test
```

Test giao diện giám sát nằm ở `tests/ui/test_web_monitoring.py`.
