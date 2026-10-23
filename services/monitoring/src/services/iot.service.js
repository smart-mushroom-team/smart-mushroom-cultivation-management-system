'use strict';

const deviceRepository = require('../repositories/device.repository');

module.exports = {
  // Lưu telemetry data từ sensor
  async saveTelemetry(deviceId, payload) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} không tồn tại`);
    }

    // TODO: Lưu readings vào database (cần tạo reading.repository.js)
    // Tạm thời chỉ log ra
    console.log(`[IoT] Device ${deviceId} sent telemetry:`, payload);

    // Update lastSeen
    await deviceRepository.update(deviceId, {
      lastSeen: new Date(),
      connectionState: 'ONLINE',
    });

    return { success: true };
  },

  // Lưu snapshot từ camera
  async saveSnapshot(deviceId, snapshotBuffer) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} không tồn tại`);
    }

    // TODO: Lưu snapshot vào storage (RAM + disk)
    // Tạm thời chỉ log ra
    console.log(`[IoT] Device ${deviceId} sent snapshot, size: ${snapshotBuffer.length} bytes`);

    // Update lastSeen
    await deviceRepository.update(deviceId, {
      lastSeen: new Date(),
      connectionState: 'ONLINE',
    });

    return { success: true };
  },
};
