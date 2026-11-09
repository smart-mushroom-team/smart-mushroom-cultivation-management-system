# Smart Mushroom Flutter rental P1 patch

## Scope
- Customer chọn phòng với số vị trí chưa lắp, đang thuê, sẵn sàng, trạng thái khác.
- Sơ đồ 4 hàng x 2 kệ x 4 ô, chọn nhiều khay trong một phòng.
- Một giống nấm cho cả đơn; nhập giống khác cần Operator duyệt theo logic backend sẵn có.
- Chọn gói, xem tổng tiền, thanh toán mô phỏng bằng API hiện tại.
- Backend GET /api/core/rental-availability trả trạng thái phòng/khay cho CUSTOMER.
- POST /api/core/rentals đã hỗ trợ roomId + trayIds, FOR UPDATE, kiểm tra xung đột.

## Áp dụng
1. Sao lưu/commit thay đổi hiện tại.
2. Giải nén vào root mushroom-rental-platform, ghi đè 3 file theo đúng đường dẫn.
3. docker compose up -d --build core
4. cd clients/mobile && flutter analyze && flutter test && flutter run
5. Test CUSTOMER: chọn phòng, nhiều khay, giống có sẵn/nhập tay, gói, thanh toán; dùng tài khoản khác thử thuê trùng.

## Giới hạn
- Backend hiện tại thanh toán mô phỏng và kích hoạt đơn trong cùng transaction, KHÔNG có giữ chỗ 10 phút hoặc màn thanh toán riêng.
- Operator duyệt giống theo API sẵn có; patch này không tạo giao diện Operator mới.
- Số lượng ô mỗi phòng cố định 32; nếu thêm trạng thái khay khác, giao diện hiển thị cột 'Trạng thái khác'.
- Chưa chạy flutter analyze/test vì môi trường tạo patch không có Flutter SDK.
- Bài test cũ kiểm tra UI thuê theo số lượng có thể cần cập nhật vì flow đã thay đổi.
