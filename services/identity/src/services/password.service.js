'use strict';

const bcrypt = require('bcryptjs');

/** Băm và so sánh mật khẩu bằng bcrypt. `rounds` lấy từ cấu hình (test dùng 4 cho nhanh). */
function createPasswordService({ rounds }) {
  let dummy; // băm giả để so sánh khi email không tồn tại
  const dummyHash = () => (dummy ||= bcrypt.hash('mat-khau-gia-de-chong-do-thoi-gian', rounds));

  return {
    hash: (plain) => bcrypt.hash(plain, rounds),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
    /**
     * Khi email không tồn tại vẫn tốn thời gian bcrypt như khi email có thật, để kẻ tấn công không
     * phân biệt được "email không có" với "sai mật khẩu" qua thời gian phản hồi.
     */
    async compareDummy(plain) {
      await bcrypt.compare(plain, await dummyHash());
    },
  };
}

module.exports = { createPasswordService };
