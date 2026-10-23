'use strict';

const axios = require('axios');

class ESP32Simulator {
  constructor(config) {
    this.deviceId = config.deviceId;
    this.deviceKey = config.deviceKey;
    this.monitoringUrl = config.monitoringUrl;
    this.roomId = config.roomId;
    this.interval = config.interval || 30000; // 30s default

    // Base values với realistic variance
    this.baseTemp = 25.0; // °C
    this.baseHumidity = 65.0; // %
  }

  generateReading() {
    // Add random walk + noise
    const tempDrift = (Math.random() - 0.5) * 0.5; // ±0.25°C per reading
    const humidityDrift = (Math.random() - 0.5) * 2.0; // ±1% per reading

    this.baseTemp += tempDrift;
    this.baseHumidity += humidityDrift;

    // Clamp to DHT22 valid ranges
    const temperature = Math.max(-40, Math.min(80, this.baseTemp));
    const humidity = Math.max(0, Math.min(100, this.baseHumidity));

    return {
      temperature: parseFloat(temperature.toFixed(2)),
      humidity: parseFloat(humidity.toFixed(2)),
      timestamp: new Date().toISOString(),
      isSimulated: true, // Để UI hiển thị flag
    };
  }

  async sendTelemetry(reading) {
    await axios.post(
      `${this.monitoringUrl}/iot/devices/${this.deviceId}/telemetry`,
      {
        roomId: this.roomId,
        readings: [reading],
      },
      {
        headers: {
          'X-Device-Key': this.deviceKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async run() {
    console.log(`[ESP32 Simulator] Starting for device ${this.deviceId}, room ${this.roomId}`);

    setInterval(async () => {
      try {
        const reading = this.generateReading();
        await this.sendTelemetry(reading);
        console.log(`[${reading.timestamp}] Sent: ${reading.temperature}°C, ${reading.humidity}%`);
      } catch (err) {
        console.error('Telemetry send failed:', err.message);
      }
    }, this.interval);
  }
}

// Usage
// Usage
const simulator = new ESP32Simulator({
  deviceId: process.env.DEVICE_ID || '00000000-0000-0000-0000-000000000001', // UUID
  deviceKey: process.env.DEVICE_KEY || 'test-device-key',
  monitoringUrl: process.env.MONITORING_URL || 'http://localhost:3003',
  roomId: process.env.ROOM_ID || '00000000-0000-0000-0000-000000000101', // UUID
  interval: parseInt(process.env.INTERVAL_MS || '30000'),
});

simulator.run();
