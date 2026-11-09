# Patch gói thuê linh hoạt

Thay đúng 3 file theo đường dẫn trong ZIP. Backend cho phép ADMIN tạo/sửa gói có thời hạn bất kỳ (ví dụ 60 ngày), không cần migration vì schema đã hỗ trợ. Admin có nút Tạo gói và sửa/tắt/bật gói; Operator chỉ xem. Flutter hiển thị giá trung bình mỗi ngày; tổng thanh toán không thay đổi.

Chạy: `docker compose up -d --build core`; `cd clients/web && npm run build`; `cd ../mobile && flutter analyze`.

Lưu ý: Backend đang có các gói 10/15/30 ngày mặc định; chúng vẫn tồn tại. Giá tiền gói nên dùng số nguyên VNĐ. Giá/ngày chỉ là thông tin tham khảo.
