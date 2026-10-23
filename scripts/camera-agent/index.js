'use strict';

const axios = require('axios');
const FormData = require('form-data');

class CameraAgent {
  constructor(config) {
    this.deviceId = config.deviceId;
    this.deviceKey = config.deviceKey;
    this.monitoringUrl = config.monitoringUrl;
    this.roomId = config.roomId;
    this.interval = config.interval || 60000; // 60s default
  }

  // Generate fake snapshot (1x1 pixel JPEG)
  generateFakeSnapshot() {
    // Minimal valid JPEG: 1x1 pixel, black color
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02,
      0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04,
      0x05, 0x0a, 0x07, 0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d,
      0x0e, 0x12, 0x10, 0x0d, 0x0e, 0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14,
      0x15, 0x15, 0x15, 0x0c, 0x0f, 0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xff,
      0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
      0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f,
      0xff, 0xd9,
    ]);
    return jpegBuffer;
  }

  async uploadSnapshot(imageBuffer) {
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: `snapshot-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    });
    form.append('roomId', this.roomId);

    await axios.post(`${this.monitoringUrl}/iot/devices/${this.deviceId}/snapshot`, form, {
      headers: {
        'X-Device-Key': this.deviceKey,
        ...form.getHeaders(),
      },
    });
  }

  async run() {
    console.log(`[Camera Agent] Starting for device ${this.deviceId}, room ${this.roomId}`);

    setInterval(async () => {
      try {
        const snapshot = this.generateFakeSnapshot();
        await this.uploadSnapshot(snapshot);
        console.log(`[${new Date().toISOString()}] Uploaded snapshot (${snapshot.length} bytes)`);
      } catch (err) {
        console.error('Snapshot upload failed:', err.message);
      }
    }, this.interval);
  }
}

// Usage
const agent = new CameraAgent({
  deviceId: process.env.DEVICE_ID || '00000000-0000-0000-0000-000000000002',
  deviceKey: process.env.DEVICE_KEY || 'test-device-key-camera',
  monitoringUrl: process.env.MONITORING_URL || 'http://localhost:3003',
  roomId: process.env.ROOM_ID || '00000000-0000-0000-0000-000000000101',
  interval: parseInt(process.env.INTERVAL_MS || '60000'),
});

agent.run();
