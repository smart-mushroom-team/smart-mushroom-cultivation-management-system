'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { migratedDb, expectDbError, SQLSTATE } = require('@mushroom/shared/testing/pglite');

let seq = 0;
const uuid = () => crypto.randomUUID();

/** Các hàm dựng dữ liệu mẫu bằng raw SQL (id do DB tự sinh). */
function factory(db) {
  return {
    async room() {
      return (await db.query(`INSERT INTO rooms (name) VALUES ('Phòng A') RETURNING id`)).rows[0]
        .id;
    },
    async tray(roomId) {
      seq += 1;
      return (
        await db.query(
          `INSERT INTO trays (tray_code, room_id, location_row, location_shelf, location_slot)
           VALUES ($1, $2, 1, 1, $3) RETURNING id`,
          [`T-${seq}`, roomId, seq],
        )
      ).rows[0].id;
    },
    async pkg() {
      return (
        await db.query(
          `INSERT INTO rental_packages (name, duration_days, price_per_tray) VALUES ('Gói 30 ngày', 30, 100000) RETURNING id`,
        )
      ).rows[0].id;
    },
    async rental(packageId, trayCount = 1) {
      return (
        await db.query(
          `INSERT INTO rentals (customer_id, customer_name, package_id, package_name, duration_days,
                                price_per_tray, tray_count, total_amount)
           VALUES ($1, 'Khách', $2, 'Gói 30 ngày', 30, 100000, $3, $4) RETURNING id`,
          [uuid(), packageId, trayCount, 100000 * trayCount],
        )
      ).rows[0].id;
    },
    link: (rentalId, trayId) =>
      db.query(`INSERT INTO rental_trays (rental_id, tray_id) VALUES ($1, $2)`, [rentalId, trayId]),
    async cycle(rentalId, trayId) {
      return (
        await db.query(
          `INSERT INTO cultivation_cycles (rental_id, tray_id) VALUES ($1, $2) RETURNING id`,
          [rentalId, trayId],
        )
      ).rows[0].id;
    },
    confirm: (rentalId) =>
      db.query(
        `UPDATE rentals SET status = 'ACTIVE', start_date = current_date, end_date = current_date + 30,
                processed_by = $2, processed_at = now() WHERE id = $1`,
        [rentalId, uuid()],
      ),
  };
}

test('Core: migration áp dụng được trên PostgreSQL thật', async (t) => {
  const db = await migratedDb('core');
  t.after(() => db.close());
  const f = factory(db);

  await t.test('đủ 12 bảng nghiệp vụ', async () => {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    assert.equal(rows[0].n, 12);
  });

  await t.test(
    'BR-01: một khay không thể thuộc hai đơn đang hiệu lực (chặn bán lố ở tầng DB)',
    async () => {
      const [roomId, pkgId] = [await f.room(), await f.pkg()];
      const trayId = await f.tray(roomId);
      const r1 = await f.rental(pkgId);
      const r2 = await f.rental(pkgId);
      await f.link(r1, trayId);
      await expectDbError(f.link(r2, trayId), SQLSTATE.UNIQUE, /uq_rental_trays_active_tray/);

      // Đơn 1 bị từ chối => nhả khay (is_active = false) => đơn 2 giữ được khay
      await db.query(`UPDATE rental_trays SET is_active = false WHERE rental_id = $1`, [r1]);
      await f.link(r2, trayId);
    },
  );

  await t.test(
    'BR-01: giữ khay đồng thời bằng FOR UPDATE SKIP LOCKED không trả khay trùng',
    async () => {
      const roomId = await f.room();
      for (let i = 0; i < 3; i += 1) await f.tray(roomId);
      const lockSql = `SELECT t.id FROM trays t JOIN rooms r ON r.id = t.room_id
                     WHERE t.occupancy_status = 'AVAILABLE' AND t.room_id = $1
                     ORDER BY t.tray_code LIMIT 2 FOR UPDATE OF t SKIP LOCKED`;
      const ids = await db.transaction(async (tx) => {
        const first = (await tx.query(lockSql, [roomId])).rows.map((r) => r.id);
        assert.equal(first.length, 2);
        return first;
      });
      assert.equal(new Set(ids).size, 2);
    },
  );

  await t.test('đợt nuôi chỉ tạo được cho khay THỰC SỰ thuộc đơn (khóa ngoại kép)', async () => {
    const [roomId, pkgId] = [await f.room(), await f.pkg()];
    const trayOfOrder = await f.tray(roomId);
    const strangeTray = await f.tray(roomId);
    const rental = await f.rental(pkgId);
    await f.link(rental, trayOfOrder);
    await f.cycle(rental, trayOfOrder);
    await expectDbError(f.cycle(rental, strangeTray), SQLSTATE.FOREIGN_KEY);
  });

  await t.test('BR-06: mỗi khay tối đa một đợt GROWING', async () => {
    const [roomId, pkgId] = [await f.room(), await f.pkg()];
    const trayId = await f.tray(roomId);
    const rental = await f.rental(pkgId);
    await f.link(rental, trayId);
    const c1 = await f.cycle(rental, trayId);
    await expectDbError(f.cycle(rental, trayId), SQLSTATE.UNIQUE, /uq_cycles_growing_tray/);

    await db.query(`UPDATE cultivation_cycles SET stage = 'INCUBATING' WHERE id = $1`, [c1]);
    await db.query(`UPDATE cultivation_cycles SET stage = 'FRUITING' WHERE id = $1`, [c1]);
    await db.query(
      `UPDATE cultivation_cycles SET status = 'HARVESTED', harvested_at = current_date,
              weight_kg = 2.4, handover = 'ON_SITE' WHERE id = $1`,
      [c1],
    );
    await f.cycle(rental, trayId); // đợt cũ đã thu hoạch => được bắt đầu đợt mới
  });

  await t.test(
    'BR-07: giai đoạn chỉ tiến đúng một bước, không lùi, đợt đã kết thúc là bất biến',
    async () => {
      const [roomId, pkgId] = [await f.room(), await f.pkg()];
      const trayId = await f.tray(roomId);
      const rental = await f.rental(pkgId);
      await f.link(rental, trayId);
      const c = await f.cycle(rental, trayId);
      const setStage = (s) =>
        db.query(`UPDATE cultivation_cycles SET stage = $2 WHERE id = $1`, [c, s]);

      await expectDbError(setStage('FRUITING'), SQLSTATE.CHECK, /BR-07/); // nhảy bước
      await setStage('INCUBATING');
      await expectDbError(setStage('SEEDING'), SQLSTATE.CHECK, /BR-07/); // lùi
      await setStage('FRUITING');

      await db.query(
        `UPDATE cultivation_cycles SET status = 'DISCARDED', discard_reason = 'Nhiễm mốc' WHERE id = $1`,
        [c],
      );
      await expectDbError(setStage('READY'), SQLSTATE.CHECK, /đã kết thúc/);
      await expectDbError(
        db.query(`UPDATE cultivation_cycles SET status = 'GROWING' WHERE id = $1`, [c]),
        SQLSTATE.CHECK,
        /đã kết thúc/,
      );
    },
  );

  await t.test('BR-04: chỉ thu hoạch khi FRUITING/READY và phải ghi đủ sản lượng', async () => {
    const [roomId, pkgId] = [await f.room(), await f.pkg()];
    const trayId = await f.tray(roomId);
    const rental = await f.rental(pkgId);
    await f.link(rental, trayId);
    const c = await f.cycle(rental, trayId);
    const harvest = (extra = '') =>
      db.query(
        `UPDATE cultivation_cycles SET status = 'HARVESTED', harvested_at = current_date,
                weight_kg = 1.5, handover = 'DELIVERY' ${extra} WHERE id = $1`,
        [c],
      );

    await expectDbError(harvest(), SQLSTATE.CHECK, /chk_cycles_harvest/); // còn SEEDING
    await db.query(`UPDATE cultivation_cycles SET stage = 'INCUBATING' WHERE id = $1`, [c]);
    await expectDbError(harvest(), SQLSTATE.CHECK, /chk_cycles_harvest/); // còn INCUBATING
    await db.query(`UPDATE cultivation_cycles SET stage = 'FRUITING' WHERE id = $1`, [c]);
    await expectDbError(
      db.query(
        `UPDATE cultivation_cycles SET status = 'HARVESTED', harvested_at = current_date WHERE id = $1`,
        [c],
      ),
      SQLSTATE.CHECK,
    ); // thiếu sản lượng + bàn giao
    await harvest();
  });

  await t.test('FR-20: loại bỏ đợt nuôi bắt buộc có lý do', async () => {
    const [roomId, pkgId] = [await f.room(), await f.pkg()];
    const trayId = await f.tray(roomId);
    const rental = await f.rental(pkgId);
    await f.link(rental, trayId);
    const c = await f.cycle(rental, trayId);
    await expectDbError(
      db.query(`UPDATE cultivation_cycles SET status = 'DISCARDED' WHERE id = $1`, [c]),
      SQLSTATE.CHECK,
      /chk_cycles_discard_reason/,
    );
  });

  await t.test('nhật ký tiến độ chỉ nhận chuyển giai đoạn hợp lệ', async () => {
    const [roomId, pkgId] = [await f.room(), await f.pkg()];
    const trayId = await f.tray(roomId);
    const rental = await f.rental(pkgId);
    await f.link(rental, trayId);
    const c = await f.cycle(rental, trayId);
    const log = (from, to) =>
      db.query(
        `INSERT INTO cycle_progress_logs (cycle_id, from_stage, to_stage, created_by) VALUES ($1, $2, $3, $4)`,
        [c, from, to, uuid()],
      );
    await log(null, 'SEEDING');
    await log('SEEDING', 'SEEDING'); // chỉ ghi chú
    await log('SEEDING', 'INCUBATING');
    await expectDbError(log('SEEDING', 'READY'), SQLSTATE.CHECK);
    await expectDbError(log('FRUITING', 'INCUBATING'), SQLSTATE.CHECK);
    await expectDbError(log(null, 'FRUITING'), SQLSTATE.CHECK);
  });

  await t.test('BR-03: vòng đời đơn thuê và tính bất biến của dữ liệu tài chính', async () => {
    const pkgId = await f.pkg();
    const rental = await f.rental(pkgId, 2);
    const setStatus = (s) => db.query(`UPDATE rentals SET status = $2 WHERE id = $1`, [rental, s]);

    await expectDbError(setStatus('COMPLETED'), SQLSTATE.CHECK, /BR-03/); // PAID -> COMPLETED
    await expectDbError(setStatus('ACTIVE'), SQLSTATE.CHECK, /chk_rentals_confirmed_dates/); // thiếu ngày
    await expectDbError(
      db.query(`UPDATE rentals SET total_amount = 1 WHERE id = $1`, [rental]),
      SQLSTATE.CHECK,
      /không được sửa/i,
    );

    await f.confirm(rental); // PAID -> ACTIVE
    await expectDbError(setStatus('PAID'), SQLSTATE.CHECK, /BR-03/); // lùi
    await expectDbError(setStatus('COMPLETED'), SQLSTATE.CHECK, /BR-03/); // nhảy bước
    await setStatus('EXPIRED');
    await setStatus('COMPLETED');
    await expectDbError(setStatus('ACTIVE'), SQLSTATE.CHECK, /BR-03/);
  });

  await t.test('FR-14: từ chối đơn bắt buộc có lý do và người xử lý', async () => {
    const pkgId = await f.pkg();
    const rental = await f.rental(pkgId);
    await expectDbError(
      db.query(
        `UPDATE rentals SET status = 'REJECTED', processed_by = $2, processed_at = now() WHERE id = $1`,
        [rental, uuid()],
      ),
      SQLSTATE.CHECK,
      /chk_rentals_reject_reason/,
    );
    await db.query(
      `UPDATE rentals SET status = 'REJECTED', reject_reason = 'Hết giống', processed_by = $2, processed_at = now() WHERE id = $1`,
      [rental, uuid()],
    );
  });

  await t.test('số tiền đơn phải nhất quán: tổng = đơn giá x số khay', async () => {
    const pkgId = await f.pkg();
    await expectDbError(
      db.query(
        `INSERT INTO rentals (customer_id, customer_name, package_id, package_name, duration_days, price_per_tray, tray_count, total_amount)
         VALUES ($1, 'K', $2, 'G', 30, 100000, 2, 999)`,
        [uuid(), pkgId],
      ),
      SQLSTATE.CHECK,
      /chk_rentals_amounts/,
    );
  });

  await t.test(
    'BR-15: không xóa đơn, giao dịch, đợt nuôi, phòng; khay đã từng thuê không xóa được',
    async () => {
      const [roomId, pkgId] = [await f.room(), await f.pkg()];
      const trayId = await f.tray(roomId);
      const rental = await f.rental(pkgId);
      await f.link(rental, trayId);
      await db.query(
        `INSERT INTO transactions (rental_id, amount, status) VALUES ($1, 100000, 'PAID')`,
        [rental],
      );

      await expectDbError(
        db.query(`DELETE FROM rentals WHERE id = $1`, [rental]),
        SQLSTATE.RESTRICT,
      );
      await expectDbError(
        db.query(`DELETE FROM transactions WHERE rental_id = $1`, [rental]),
        SQLSTATE.RESTRICT,
      );
      await expectDbError(db.query(`DELETE FROM rooms WHERE id = $1`, [roomId]), SQLSTATE.RESTRICT);
      await expectDbError(db.query(`DELETE FROM trays WHERE id = $1`, [trayId]), [
        SQLSTATE.FOREIGN_KEY,
        SQLSTATE.RESTRICT,
      ]);

      const freshTray = await f.tray(roomId); // FR-08: khay chưa từng thuê thì xóa được
      await db.query(`DELETE FROM trays WHERE id = $1`, [freshTray]);
    },
  );

  await t.test('khay: mã duy nhất, vị trí duy nhất trong phòng, vị trí dương', async () => {
    const roomId = await f.room();
    const ins = (code, row, shelf, slot) =>
      db.query(
        `INSERT INTO trays (tray_code, room_id, location_row, location_shelf, location_slot) VALUES ($1, $2, $3, $4, $5)`,
        [code, roomId, row, shelf, slot],
      );
    await ins('DUP-1', 9, 9, 9);
    await expectDbError(ins('DUP-1', 9, 9, 8), SQLSTATE.UNIQUE); // trùng mã
    await expectDbError(ins('DUP-2', 9, 9, 9), SQLSTATE.UNIQUE); // trùng vị trí
    await expectDbError(ins('DUP-3', 0, 1, 1), SQLSTATE.CHECK);
  });

  await t.test('thông báo gửi đúng MỘT đối tượng; dedupeKey chống trùng (BR-14)', async () => {
    const ins = (userId, role, dedupe = null) =>
      db.query(
        `INSERT INTO notifications (recipient_user_id, recipient_role, type, title, content, dedupe_key)
         VALUES ($1, $2, 'DEVICE_OFFLINE', 't', 'c', $3)`,
        [userId, role, dedupe],
      );
    await ins(uuid(), null);
    await ins(null, 'STAFF', 'DEVICE_OFFLINE:d1:2026-10-11T10:00');
    await expectDbError(ins(uuid(), 'STAFF'), SQLSTATE.CHECK, /chk_notifications_recipient/); // cả hai
    await expectDbError(ins(null, null), SQLSTATE.CHECK, /chk_notifications_recipient/); // không ai
    await expectDbError(ins(null, 'ADMIN'), SQLSTATE.CHECK); // vai trò lạ
    await expectDbError(ins(null, 'STAFF', 'DEVICE_OFFLINE:d1:2026-10-11T10:00'), SQLSTATE.UNIQUE);
  });

  await t.test('FCM token duy nhất; đánh dấu đã đọc theo từng người', async () => {
    const insToken = (token) =>
      db.query(`INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, 'ANDROID')`, [
        uuid(),
        token,
      ]);
    await insToken('fcm-token-1');
    await expectDbError(insToken('fcm-token-1'), SQLSTATE.UNIQUE);

    const n = (
      await db.query(
        `INSERT INTO notifications (recipient_role, type, title, content) VALUES ('STAFF', 'DEVICE_OFFLINE', 't', 'c') RETURNING id`,
      )
    ).rows[0].id;
    const read = (user) =>
      db.query(`INSERT INTO notification_reads (notification_id, user_id) VALUES ($1, $2)`, [
        n,
        user,
      ]);
    const [u1, u2] = [uuid(), uuid()];
    await read(u1);
    await read(u2); // người khác vẫn đọc độc lập
    await expectDbError(read(u1), SQLSTATE.UNIQUE);
  });

  await t.test('updated_at tự cập nhật bằng trigger (kể cả raw SQL)', async () => {
    const roomId = await f.room();
    await new Promise((r) => setTimeout(r, 15));
    const { rows } = await db.query(
      `UPDATE rooms SET name = 'Phòng B' WHERE id = $1 RETURNING updated_at > created_at AS changed`,
      [roomId],
    );
    assert.equal(rows[0].changed, true);
  });
});
