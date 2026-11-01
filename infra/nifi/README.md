# Luồng NiFi gộp số liệu 5 phút (FR-53)

```
Monitoring ──► RabbitMQ telemetry.events ──► NiFi ──► monitoring_db.sensor_aggregates ──► GET /rooms/{id}/chart
```

Luồng NiFi (process group "Mushroom - telemetry 5 phut"):

```
ConsumeAMQP (telemetry.events)
  -> EvaluateJsonPath   roomId, recordedAt, temperature, humidity  ->  thuộc tính sql.args.1..4.value
  -> UpdateAttribute    sql.args.N.type = 12 (VARCHAR)
  -> PutSQL             chạy services/monitoring/app/upsert_aggregate.sql
  lỗi (JSON sai, SQL lỗi) -> LogAttribute (ERROR kèm nội dung);  retry của PutSQL tự nối về chính nó
```

NiFi **không** nằm trên đường nhận dữ liệu thiết bị: Monitoring đã lưu `sensor_readings` và cập nhật Redis trước khi phát sự kiện,
nên NiFi dừng thì số liệu thô và cảnh báo vẫn nguyên (NFR-22). Tin chờ trong hàng đợi bền và được gộp khi NiFi chạy lại.

## Dựng luồng (một lần, bằng script)

```bash
make nifi-driver     # tải driver JDBC PostgreSQL vào infra/nifi/drivers/ (NiFi không kèm sẵn), đối chiếu SHA-1 với Maven Central
make up              # NiFi lần đầu khởi động mất 1-3 phút
make nifi-flow       # tạo controller service, 5 processor, nối, kiểm tra hợp lệ, rồi chạy
```

Script đọc `.env` (`NIFI_USER`, `NIFI_PASSWORD` phải từ 12 ký tự, `NIFI_DB_PASSWORD`, `RABBITMQ_*`), gọi REST API của NiFi và chạy lại an toàn
(đã có luồng thì bỏ qua). Dựng lại từ đầu: `make nifi-flow ARGS=--recreate` (hàng đợi trong luồng phải trống). Các tùy chọn khác:
`python infra/nifi/provision_flow.py --help` (`--no-start` chỉ dựng, `--url`, `--wait`...).

Script tìm thuộc tính theo **tên hiển thị** của chính NiFi đang chạy. Nếu NiFi không chấp nhận thuộc tính nào, hoặc luồng không hợp lệ, script
in rõ nguyên nhân, **không** khởi động luồng và thoát mã khác 0.

> Script được kiểm bằng test với NiFi giả (`make test-infra`), chưa được thử trên NiFi 1.27 thật trong môi trường phát triển.
> Lần chạy đầu trên máy bạn nên mở https://localhost:8443/nifi xem process group có chạy xanh không; nếu script báo thuộc tính nào đó
> không tồn tại, gửi nguyên thông báo lỗi để sửa. Cần dựng tay thì các bước và tham số ở bảng dưới là đủ.

| Thành phần | Thiết lập |
|---|---|
| DBCPConnectionPool | `jdbc:postgresql://postgres:5432/monitoring_db`, driver `org.postgresql.Driver`, jar `/opt/nifi/nifi-current/drivers/postgresql-*.jar`, user `nifi_user` |
| ConsumeAMQP | Brokers `rabbitmq:5672`, queue `telemetry.events`, user/mật khẩu RabbitMQ, Auto-Acknowledge **false** |
| EvaluateJsonPath | Destination `flowfile-attribute`, Path Not Found `ignore`, Null Value `empty string`; `sql.args.1.value=$.roomId`, `.2=$.recordedAt`, `.3=$.temperature`, `.4=$.humidity` |
| UpdateAttribute | `sql.args.1..4.type = 12` |
| PutSQL | JDBC Connection Pool ở trên, SQL Statement = nội dung `upsert_aggregate.sql` bỏ dòng chú thích |

## Cách gộp (một câu SQL duy nhất)

`services/monitoring/app/upsert_aggregate.sql` cộng thêm **một** lần đo vào cửa sổ của nó (UPSERT theo `(room_id, window_start)`):

- Cửa sổ 5 phút căn theo UTC từ epoch (00:00, 00:05, ...), tính theo `recordedAt` của lần đo, không phải giờ nhận: tin đến trễ hay sai thứ tự
  vẫn vào đúng cửa sổ.
- Lưu **tổng và số lần đo riêng** cho nhiệt độ và độ ẩm (một lần đo có thể thiếu một giá trị) cùng min/max; `avg_*` là cột sinh tự động
  `round(sum/count, 2)` nên không tích lũy sai số làm tròn.
- Giao tin kiểu at-least-once: nếu NiFi mất kết nối sau khi ghi mà chưa ack, tin được giao lại và cộng thêm một lần (sai số tối đa vài lần đo
  trong cửa sổ đó). Chấp nhận được cho biểu đồ; bảng `sensor_readings` vẫn là số liệu gốc chính xác.
- Giữ 30 ngày (job dọn lúc 03:00 UTC của Monitoring).

## Kiểm tra luồng đang chạy

1. NiFi UI: các processor xanh; chạy `make simulate` rồi xem số FlowFile đi qua; `PutSQL` có `In`/`Out` tăng.
2. RabbitMQ UI (:15672): hàng đợi `telemetry.events` gần 0 tin chờ.
3. Dữ liệu: `docker compose exec postgres psql -U postgres monitoring_db -c "SELECT * FROM sensor_aggregates ORDER BY window_start DESC LIMIT 5"`
4. API: `GET /api/monitoring/rooms/<id>/chart?hours=1` qua Gateway.
5. Toàn luồng: `make e2e` (bước 13 chỉ chạy khi có NiFi hoặc aggregator; `E2E_NEED_AGGREGATE=1 make e2e` bắt buộc phải có).

## Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `make nifi-flow` báo từ chối đăng nhập | `NIFI_USER`/`NIFI_PASSWORD` trong `.env` khác lúc tạo container; mật khẩu NiFi phải >= 12 ký tự. Đổi `.env` rồi `docker compose up -d --force-recreate nifi` |
| Báo thiếu driver | Chưa chạy `make nifi-driver` |
| Luồng không hợp lệ, DBCP lỗi | Sai `NIFI_DB_PASSWORD` hoặc chưa có driver; sửa rồi `--recreate` |
| ConsumeAMQP báo `NOT_FOUND - no queue` | Monitoring chưa khởi động xong (nó tạo hàng đợi lúc khởi động); chờ ít phút hoặc `docker compose restart monitoring` |
| NiFi thiếu RAM / bị kill | Docker Desktop nên cấp >= 6 GB RAM; NiFi được giới hạn heap 1 GB (`docker-compose.yml`) |
| Cần demo mà NiFi chưa chạy được | Aggregator dự phòng (dùng đúng câu SQL trên): `make aggregator`. Chạy cùng NiFi cũng không đếm đôi vì mỗi tin chỉ giao cho một consumer |
