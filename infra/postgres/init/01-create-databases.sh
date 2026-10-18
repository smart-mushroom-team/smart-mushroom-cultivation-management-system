#!/bin/sh
# Chạy MỘT LẦN khi volume Postgres còn trống (cơ chế /docker-entrypoint-initdb.d của image postgres).
# Tạo 3 database riêng + 3 user riêng, mỗi user chỉ truy cập được database của mình
# => "database per service" ở mức logic: Postgres không cho truy vấn chéo giữa các database.
#
# Muốn chạy lại từ đầu:  docker compose down -v   (XÓA toàn bộ dữ liệu dev)
# Lưu ý: mật khẩu trong .env chỉ nên dùng chữ và số (tránh ký tự đặc biệt làm hỏng DATABASE_URL).
set -eu

create_service_db() {
  db="$1"
  usr="$2"
  pwd="$3"
  if [ -z "$db" ] || [ -z "$usr" ] || [ -z "$pwd" ]; then
    echo "Thiếu biến môi trường *_DB_NAME / *_DB_USER / *_DB_PASSWORD" >&2
    exit 1
  fi
  echo ">> Tạo database '$db' (owner '$usr')"
  # CREATEDB: cho phép `prisma migrate dev` tạo shadow database khi phát triển cục bộ.
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
    -v db="$db" -v usr="$usr" -v pwd="$pwd" <<'EOSQL'
CREATE ROLE :"usr" LOGIN PASSWORD :'pwd' CREATEDB;
CREATE DATABASE :"db" OWNER :"usr";
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT ALL ON DATABASE :"db" TO :"usr";
EOSQL
}

create_service_db "$IDENTITY_DB_NAME" "$IDENTITY_DB_USER" "$IDENTITY_DB_PASSWORD"
create_service_db "$CORE_DB_NAME" "$CORE_DB_USER" "$CORE_DB_PASSWORD"
create_service_db "$MONITORING_DB_NAME" "$MONITORING_DB_USER" "$MONITORING_DB_PASSWORD"
