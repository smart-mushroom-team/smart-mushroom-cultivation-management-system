#!/bin/sh
# Ba database riêng trên một instance; mỗi service một tài khoản chỉ có quyền trên database của mình.
set -e
create() {
  db="$1"; user="$2"; pass="$3"
  psql -v ON_ERROR_STOP=1 --username postgres <<SQL
CREATE USER ${user} WITH PASSWORD '${pass}';
CREATE DATABASE ${db} OWNER ${user};
REVOKE ALL ON DATABASE ${db} FROM PUBLIC;
GRANT ALL ON DATABASE ${db} TO ${user};
SQL
}
create identity_db   identity_user   "$IDENTITY_DB_PASSWORD"
create core_db       core_user       "$CORE_DB_PASSWORD"
create monitoring_db monitoring_user "$MONITORING_DB_PASSWORD"

# Tài khoản riêng cho NiFi: chỉ được ghi bảng sensor_aggregates (tạo bảng bởi migration của Monitoring)
psql -v ON_ERROR_STOP=1 --username postgres <<SQL
CREATE USER nifi_user WITH PASSWORD '${NIFI_DB_PASSWORD}';
GRANT CONNECT ON DATABASE monitoring_db TO nifi_user;
SQL
