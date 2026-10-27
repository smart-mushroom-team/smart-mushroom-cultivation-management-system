# Web (React + Vite) – khung

Chạy ngoài Docker khi phát triển: `npm create vite@latest . -- --template react-ts && npm i && npm run dev`.
Gọi API qua Gateway: `VITE_API_URL=http://localhost:8000`.

Gợi ý cấu trúc: `src/api/` (client + gắn JWT), `src/pages/{customer,operator,admin}/`, `src/components/`.
Màn hình tối thiểu: đăng nhập, danh sách gói + thuê khay, Khay của tôi, biểu đồ nhiệt độ/độ ẩm, thông báo, quản trị.
Swagger của từng service: `http://localhost:8000/api/<service>/docs`.
