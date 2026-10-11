'use strict';

const { requireEnv, optionalEnv, intEnv } = require('@mushroom/shared');

function loadConfig() {
  return {
    port: intEnv('PORT', 3003),
    jwtSecret: requireEnv('JWT_SECRET'),
    serviceKey: requireEnv('SERVICE_KEY'),
    coreUrl: optionalEnv('CORE_INTERNAL_URL', 'http://localhost:3002'), // gọi thẳng Core, không qua Gateway
    roomAccessTimeoutMs: intEnv('ROOM_ACCESS_TIMEOUT_MS', 10000), // quá thời gian => từ chối (fail-closed)
    // Thông số nghiệp vụ (có thể cấu hình, SRS: "mặc định")
    snapshotPersistIntervalSec: intEnv('SNAPSHOT_PERSIST_INTERVAL_SEC', 60), // FR-31
    statusSchedulerIntervalSec: intEnv('STATUS_SCHEDULER_INTERVAL_SEC', 10), // FR-36
    offlineMissedIntervals: intEnv('OFFLINE_MISSED_INTERVALS', 3), // BR-11
    thresholdConsecutiveCount: intEnv('THRESHOLD_CONSECUTIVE_COUNT', 3), // BR-12, N
    telemetryRetentionDays: intEnv('TELEMETRY_RETENTION_DAYS', 7), // BR-13
    maxSnapshotBytes: intEnv('MAX_SNAPSHOT_BYTES', 2 * 1024 * 1024), // BR-10
  };
}

module.exports = { loadConfig };
