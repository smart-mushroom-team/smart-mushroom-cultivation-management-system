'use strict';

const crypto = require('crypto');
const deviceRepository = require('../repositories/device.repository');

// Service = chứa business logic
module.exports = {
  // Tạo device mới
  async createDevice(payload) {
    // Step 1: Validate input
    if (!payload.roomId || !payload.type || !payload.name) {
      throw new Error('Thiếu roomId, type, hoặc name');
    }

    // Step 2: Sinh API key ngẫu nhiên
    const plainTextApiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = crypto.createHash('sha256').update(plainTextApiKey).digest('hex');

    // Step 3: Lưu device vào database
    const device = await deviceRepository.create({
      roomId: payload.roomId,
      type: payload.type,
      name: payload.name,
      apiKeyHash, // Lưu hash, không lưu plaintext
      status: 'INACTIVE', // Mặc định không hoạt động
      connectionState: 'OFFLINE', // Mặc định offline
    });

    // Step 4: Trả response
    return {
      device,
      apiKey: plainTextApiKey, // Chỉ trả lần đầu tạo
    };
  },

  // Lấy danh sách device
  async listDevices(filters = {}) {
    return deviceRepository.findAll(filters);
  },

  // Lấy device theo ID
  async getDeviceById(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      throw new Error(`Device ${id} không tồn tại`);
    }
    return device;
  },

  // Cập nhật device (VD: đổi tên)
  async updateDevice(id, updateData) {
    // Không cho phép đổi roomId (BR-09)
    if (updateData.roomId) {
      throw new Error('Không được phép đổi roomId của device');
    }

    return deviceRepository.update(id, updateData);
  },

  // Kích hoạt device
  async activateDevice(id) {
    const device = await this.getDeviceById(id);

    // Business rule BR-09: max 1 ACTIVE device per type per room
    const activeInRoom = await deviceRepository.findAll({
      roomId: device.roomId,
      type: device.type,
      status: 'ACTIVE',
    });

    if (activeInRoom.length > 0) {
      throw new Error(`Đã có device ${device.type} active trong phòng này`);
    }

    return deviceRepository.update(id, {
      status: 'ACTIVE',
      connectionState: 'OFFLINE', // Bắt đầu offline
    });
  },

  // Vô hiệu hóa device
  async deactivateDevice(id) {
    return deviceRepository.update(id, {
      status: 'INACTIVE',
      connectionState: 'OFFLINE',
    });
  },

  // Cấp lại API key mới
  async rotateDeviceKey(id) {
    const device = await this.getDeviceById(id);

    // Sinh API key mới
    const plainTextApiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = crypto.createHash('sha256').update(plainTextApiKey).digest('hex');

    // Update device với API key mới
    await deviceRepository.update(id, { apiKeyHash });

    return {
      device: { ...device, apiKeyHash }, // Không trả plaintext trong response
      apiKey: plainTextApiKey, // Chỉ trả plaintext lần này thôi
    };
  },
};
