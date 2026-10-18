'use strict';

/**
 * Chuyển bản ghi người dùng thành đối tượng trả về cho client.
 * LUÔN đi qua hàm này: tuyệt đối không trả passwordHash, failedLoginCount, lockedUntil ra ngoài.
 */
function toUserDto(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    address: user.address,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

module.exports = { toUserDto };
