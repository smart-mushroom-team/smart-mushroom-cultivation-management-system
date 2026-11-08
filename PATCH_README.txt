SMART MUSHROOM — BẢN PATCH WEB ADMIN + CORE (2026-11-08)

ĐÃ THAY ĐỔI
- Admin Khay: chọn phòng, sơ đồ 4 hàng x 2 kệ x 4 ô, thêm khay vào ô trống, xem trạng thái, xóa khay chưa từng thuê.
- Admin Gói: chỉ chỉnh giá/khay cho 10, 15, 30 ngày; không có ô số lượng.
- Backend: giới hạn vị trí 4x2x4, unique vị trí, chặn tạo gói ngoài 10/15/30 ngày.
- Backend POST /api/core/rentals: hỗ trợ {roomId, trayIds, packageId, varietyId hoặc các trường giống nấm hiện tại}; giữ trayCount legacy cho Flutter cũ. Giao dịch khóa các khay được chọn và từ chối thuê trùng.
- Đơn thuê mới ghi room_id.

CÁCH ÁP DỤNG
1. BACKUP database và commit source hiện tại.
2. Giải nén vào thư mục gốc mushroom-rental-platform, giữ nguyên đường dẫn.
3. Kiểm tra dữ liệu khay cũ: mọi hàng 1..4, kệ 1..2, ô 1..4 và không trùng vị trí. Nếu vi phạm, migration 004 sẽ dừng.
4. Chạy migration 004 bằng cơ chế migration hiện có, sau đó restart core và web.
5. Kiểm tra web build, backend tests và thao tác thuê trên môi trường test trước khi đưa lên production.

CHƯA TRIỂN KHAI
- Giao diện chọn khay kiểu rạp phim cho khách trên Flutter (không nằm trong ZIP nguồn được cung cấp).
- Popup checkout/ thanh toán thật trên mobile; backend hiện dùng thanh toán mô phỏng.
- Gia hạn đơn: cần chốt chính sách và xây API riêng.
- Không có xác nhận chạy thành công toàn bộ test vì npm ci chưa hoàn tất trong môi trường này.

LƯU Ý
- API cũ theo trayCount vẫn chạy để tránh phá client mobile, nhưng chỉ nhận đơn nếu tất cả khay cùng phòng.
- Dữ liệu gói cũ ngoài 10/15/30 ngày vẫn còn trong DB để bảo toàn lịch sử. Cần tắt các gói cũ không hợp lệ bằng Admin/SQL.
- Bản patch này chưa phải triển khai trọn vẹn UX khách hàng.
