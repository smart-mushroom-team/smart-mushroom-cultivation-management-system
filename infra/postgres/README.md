Sau khi Monitoring chạy migration `001_init.sql`, cấp quyền cho NiFi (đã có trong migration):

```sql
GRANT USAGE ON SCHEMA public TO nifi_user;
GRANT SELECT, INSERT, UPDATE ON sensor_aggregates TO nifi_user;
```
