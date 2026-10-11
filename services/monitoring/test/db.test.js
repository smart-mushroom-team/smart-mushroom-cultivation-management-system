'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { migratedDb, expectDbError, SQLSTATE } = require('@mushroom/shared/testing/pglite');

const uuid = () => crypto.randomUUID();
let seq = 0;

test('Monitoring: migration áp dụng được và ràng buộc DB hoạt động', async (t) => {
  const db = await migratedDb('monitoring');
  t.after(() => db.close());

  const device = (roomId, type = 'SENSOR', extra = '') =>
    db.query(
      `INSERT INTO devices (room_id, type, name, api_key_hash, interval_sec) VALUES ($1, $2, 'TB', $3, 10) ${extra} RETURNING id`,
      [roomId, type, `hash-${(seq += 1)}`],
    );

  await t.test('đủ 5 bảng', async () => {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    assert.equal(rows[0].n, 5);
  });

  await t.test('BR-09: mỗi phòng tối đa một thiết bị ACTIVE cho mỗi loại', async () => {
    const room = uuid();
    const first = (await device(room, 'SENSOR')).rows[0].id;
    await device(room, 'CAMERA'); // khác loại: được
    await device(uuid(), 'SENSOR'); // khác phòng: được
    await expectDbError(device(room, 'SENSOR'), SQLSTATE.UNIQUE, /uq_devices_active_room_type/);

    await db.query(`UPDATE devices SET status = 'INACTIVE' WHERE id = $1`, [first]);
    await device(room, 'SENSOR'); // thiết bị cũ đã INACTIVE => đăng ký thiết bị thay thế được
  });

  await t.test('BR-09: không đổi phòng/loại sau khi tạo; BR-15: không xóa thiết bị', async () => {
    const id = (await device(uuid())).rows[0].id;
    await expectDbError(
      db.query(`UPDATE devices SET room_id = $2 WHERE id = $1`, [id, uuid()]),
      SQLSTATE.CHECK,
      /BR-09/,
    );
    await expectDbError(
      db.query(`UPDATE devices SET type = 'CAMERA' WHERE id = $1`, [id]),
      SQLSTATE.CHECK,
      /BR-09/,
    );
    await expectDbError(db.query(`DELETE FROM devices WHERE id = $1`, [id]), SQLSTATE.RESTRICT);
  });

  await t.test('FR-28: thiết bị INACTIVE luôn OFFLINE', async () => {
    const id = (await device(uuid())).rows[0].id;
    await db.query(
      `UPDATE devices SET connection_state = 'ONLINE', last_seen = now() WHERE id = $1`,
      [id],
    );
    await expectDbError(
      db.query(`UPDATE devices SET status = 'INACTIVE' WHERE id = $1`, [id]),
      SQLSTATE.CHECK,
      /chk_devices_inactive_offline/,
    );
    await db.query(
      `UPDATE devices SET status = 'INACTIVE', connection_state = 'OFFLINE' WHERE id = $1`,
      [id],
    );
  });

  await t.test('API key hash duy nhất; chu kỳ gửi trong 1..3600 giây', async () => {
    await db.query(
      `INSERT INTO devices (room_id, type, name, api_key_hash, interval_sec) VALUES ($1, 'SENSOR', 'A', 'same', 10)`,
      [uuid()],
    );
    await expectDbError(
      db.query(
        `INSERT INTO devices (room_id, type, name, api_key_hash, interval_sec) VALUES ($1, 'SENSOR', 'B', 'same', 10)`,
        [uuid()],
      ),
      SQLSTATE.UNIQUE,
    );
    for (const bad of [0, 3601]) {
      await expectDbError(
        db.query(
          `INSERT INTO devices (room_id, type, name, api_key_hash, interval_sec) VALUES ($1, 'SENSOR', 'C', $2, $3)`,
          [uuid(), `h-${bad}`, bad],
        ),
        SQLSTATE.CHECK,
        /chk_devices_interval/,
      );
    }
  });

  await t.test('BR-10: số liệu cảm biến phải trong khoảng DHT22', async () => {
    const room = uuid();
    const dev = (await device(room)).rows[0].id;
    const ins = (temp, hum) =>
      db.query(
        `INSERT INTO sensor_readings (device_id, room_id, temperature, humidity) VALUES ($1, $2, $3, $4)`,
        [dev, room, temp, hum],
      );
    await ins(27.5, 85);
    await ins(-40, 0);
    await ins(80, 100);
    await expectDbError(ins(80.1, 50), SQLSTATE.CHECK, /chk_readings_temperature/);
    await expectDbError(ins(-41, 50), SQLSTATE.CHECK, /chk_readings_temperature/);
    await expectDbError(ins(25, 100.5), SQLSTATE.CHECK, /chk_readings_humidity/);
    await expectDbError(ins(25, -1), SQLSTATE.CHECK, /chk_readings_humidity/);

    const { rows } = await db.query(
      `SELECT id, recorded_at FROM sensor_readings WHERE room_id = $1 ORDER BY id`,
      [room],
    );
    assert.equal(rows.length, 3);
    assert.ok(Number(rows[1].id) > Number(rows[0].id), 'id tự tăng');
    assert.ok(rows[0].recorded_at instanceof Date, 'recorded_at mặc định là giờ máy chủ');
  });

  await t.test('BR-10: ảnh snapshot tối đa 2 MB và mỗi camera đúng một dòng (ghi đè)', async () => {
    const cam = (await device(uuid(), 'CAMERA')).rows[0].id;
    const put = (bytes) =>
      db.query(
        `INSERT INTO camera_latest (device_id, image, captured_at) VALUES ($1, decode(repeat('ff', $2::int), 'hex'), now())`,
        [cam, bytes],
      );
    await put(1024);
    await expectDbError(put(1024), SQLSTATE.UNIQUE); // cần UPSERT, không thêm dòng thứ hai
    await db.query(
      `UPDATE camera_latest SET image = decode(repeat('ff', 2097152), 'hex') WHERE device_id = $1`,
      [cam],
    ); // đúng 2 MB: được
    await expectDbError(
      db.query(
        `UPDATE camera_latest SET image = decode(repeat('ff', 2097153), 'hex') WHERE device_id = $1`,
        [cam],
      ),
      SQLSTATE.CHECK,
      /chk_camera_latest_image_size/,
    );
    await expectDbError(
      db.query(`UPDATE camera_latest SET image = ''::bytea WHERE device_id = $1`, [cam]),
      SQLSTATE.CHECK,
    );
  });

  await t.test(
    'BR-12: ngưỡng phải đủ cặp min/max, min < max, trong khoảng cho phép, N trong 1..20',
    async () => {
      const put = (sets) =>
        db.query(`INSERT INTO room_thresholds (room_id, ${sets.cols}) VALUES ($1, ${sets.vals})`, [
          uuid(),
        ]);

      await db.query(`INSERT INTO room_thresholds (room_id) VALUES ($1)`, [uuid()]); // chưa đặt ngưỡng: hợp lệ
      await put({ cols: 'temp_min, temp_max, hum_min, hum_max', vals: '22, 30, 80, 95' });

      await expectDbError(
        put({ cols: 'temp_min, temp_max', vals: '30, 22' }),
        SQLSTATE.CHECK,
        /chk_thresholds_temp/,
      );
      await expectDbError(
        put({ cols: 'temp_min, temp_max', vals: '25, 25' }),
        SQLSTATE.CHECK,
        /chk_thresholds_temp/,
      );
      await expectDbError(
        put({ cols: 'temp_min', vals: '22' }),
        SQLSTATE.CHECK,
        /chk_thresholds_temp/,
      ); // thiếu max
      await expectDbError(
        put({ cols: 'hum_min, hum_max', vals: '-5, 50' }),
        SQLSTATE.CHECK,
        /chk_thresholds_hum/,
      );
      await expectDbError(
        put({ cols: 'hum_min, hum_max', vals: '50, 120' }),
        SQLSTATE.CHECK,
        /chk_thresholds_hum/,
      );
      await expectDbError(
        put({ cols: 'consecutive_count', vals: '0' }),
        SQLSTATE.CHECK,
        /chk_thresholds_n/,
      );
      await expectDbError(
        put({ cols: 'consecutive_count', vals: '21' }),
        SQLSTATE.CHECK,
        /chk_thresholds_n/,
      );
      await expectDbError(
        put({ cols: 'temp_out_of_count', vals: '-1' }),
        SQLSTATE.CHECK,
        /chk_thresholds_counters/,
      );
    },
  );

  await t.test('BR-14: cảnh báo chờ gửi không trùng dedupeKey', async () => {
    const put = (key) =>
      db.query(
        `INSERT INTO pending_alerts (dedupe_key, payload) VALUES ($1, '{"type":"DEVICE_OFFLINE"}')`,
        [key],
      );
    await put('DEVICE_OFFLINE:abc:2026-10-11T10:00');
    await expectDbError(put('DEVICE_OFFLINE:abc:2026-10-11T10:00'), SQLSTATE.UNIQUE);
  });

  await t.test('updated_at tự cập nhật bằng trigger', async () => {
    const id = (await device(uuid())).rows[0].id;
    await new Promise((r) => setTimeout(r, 15));
    const { rows } = await db.query(
      `UPDATE devices SET name = 'Tên mới' WHERE id = $1 RETURNING updated_at > created_at AS changed`,
      [id],
    );
    assert.equal(rows[0].changed, true);
  });

  await t.test('Telemetry Retention: xóa số liệu cũ hơn 7 ngày vẫn được phép', async () => {
    const room = uuid();
    const dev = (await device(room)).rows[0].id;
    await db.query(
      `INSERT INTO sensor_readings (device_id, room_id, temperature, humidity, recorded_at)
       VALUES ($1, $2, 25, 80, now() - interval '8 days'), ($1, $2, 26, 81, now())`,
      [dev, room],
    );
    const del = await db.query(
      `DELETE FROM sensor_readings WHERE room_id = $1 AND recorded_at < now() - interval '7 days'`,
      [room],
    );
    assert.equal(del.affectedRows, 1);
  });
});
