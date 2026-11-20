// Sao chép file này thành config.h (cùng thư mục include/) rồi điền giá trị thật.
// config.h đã nằm trong .gitignore: KHÔNG commit mật khẩu Wi-Fi và khóa thiết bị lên GitHub.
#pragma once

// ===================== 1. Wi-Fi (chỉ hỗ trợ Wi-Fi 2.4 GHz) =====================
#define WIFI_SSID     "ten-wifi"
#define WIFI_PASSWORD "mat-khau-wifi"

// ===================== 2. Server =====================
// IP LAN của máy tính đang chạy "docker compose up" (xem bằng lệnh ipconfig), cổng Gateway 8000.
// KHÔNG dùng "localhost" hay "127.0.0.1": với ESP32, localhost là chính nó.
#define API_URL       "http://192.168.1.10:8000/iot/telemetry"

// Khóa API lấy ở web: Thiết bị -> Thêm thiết bị -> loại "Cảm biến nhiệt độ, độ ẩm". Dạng mk_xxxxx
#define DEVICE_KEY    "mk_dan-khoa-thiet-bi-vao-day"

// Chu kỳ gửi (mili giây). Phải KHỚP "Chu kỳ gửi (giây)" khi tạo thiết bị trên web (30 giây = 30000).
// Server coi thiết bị là mất kết nối nếu quá 3 chu kỳ không nhận được dữ liệu.
#define SEND_INTERVAL_MS 30000

// ===================== 3. Chân cắm cảm biến =====================
#define DHT_PIN   4          // chân DATA (S/OUT) của module DHT11 -> GPIO4 (D4)
#define DHT_TYPE  DHT11      // kit của bạn là DHT11 (xanh dương). Nếu sau này đổi sang DHT22 (trắng) thì sửa thành DHT22
// Chân GIỮA (VCC) của DHT11 nối vào GPIO18 (D18): firmware tự bật chân này lên 3,3V để cấp nguồn, khỏi cần breadboard.
// Nếu nối VCC của DHT11 vào 3V3 thì bỏ comment dòng dưới để tắt tính năng này.
// #define DHT_POWER_PIN -1

// Cảm biến độ ẩm đất: chân AO -> GPIO34. BẮT BUỘC dùng chân ADC1 (32-39) vì ADC2 không đọc được khi bật Wi-Fi.
// Đặt 0 nếu chưa cắm cảm biến đất.
#define SOIL_ENABLED  1
#define SOIL_PIN      34
// Hiệu chỉnh: đọc giá trị "raw" trên Serial Monitor khi đầu dò để khô ngoài không khí và khi nhúng vào cốc nước.
#define SOIL_RAW_DRY  3200   // giá trị raw khi khô  -> 0 %
#define SOIL_RAW_WET  1300   // giá trị raw khi ướt  -> 100 %

// Màn hình OLED 0.96" I2C (SSD1306): SDA -> GPIO21, SCL -> GPIO22. Đặt 0 nếu không dùng.
#define OLED_ENABLED  1
#define OLED_ADDR     0x3C   // nếu màn hình không sáng thử 0x3D

// LED báo trạng thái: GPIO2 là LED xanh có sẵn trên board.
// Nhấp nháy nhanh = đang kết nối Wi-Fi; chớp 1 lần = gửi thành công; chớp 3 lần = gửi lỗi.
#define STATUS_LED_PIN 2

// ===================== 4. (Tùy chọn) Relay tự động phun sương / quạt =====================
// Điều khiển ngay trên ESP32 theo số đo, không cần server. Mặc định TẮT.
// Relay 2 kênh 5V: VCC -> VIN (5V), GND -> GND, IN1 -> GPIO26, IN2 -> GPIO27.
#define RELAY_ENABLED     0
#define RELAY_MIST_PIN    26   // kênh 1: máy phun sương / tạo ẩm
#define RELAY_FAN_PIN     27   // kênh 2: quạt thông gió
#define RELAY_ACTIVE_LOW  1    // đa số module relay 5V bật khi chân IN = LOW
#define MIST_ON_BELOW     80.0 // độ ẩm < 80 %  -> bật phun sương
#define MIST_OFF_ABOVE    88.0 // độ ẩm > 88 %  -> tắt phun sương
#define FAN_ON_ABOVE      28.0 // nhiệt độ > 28 °C -> bật quạt
#define FAN_OFF_BELOW     26.0 // nhiệt độ < 26 °C -> tắt quạt
