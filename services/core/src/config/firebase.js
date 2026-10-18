'use strict';

const fs = require('node:fs');

/**
 * Khởi tạo Firebase Admin (FCM) một lần, theo kiểu lười.
 * Nguồn credential (ưu tiên từ trên xuống):
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON  — nội dung JSON (tiện cho môi trường deploy)
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH  — đường dẫn file, vd /run/secrets/firebase-service-account.json
 * Không có credential => trả null, hệ thống vẫn chạy bình thường (chỉ không đẩy được push).
 *
 * TUYỆT ĐỐI không commit file service account lên GitHub (đã có trong .gitignore).
 */
let messaging; // undefined = chưa thử, null = không cấu hình

function loadCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) return JSON.parse(inline);
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  return null;
}

function getMessaging() {
  if (messaging !== undefined) return messaging;
  const credential = loadCredential();
  if (!credential) {
    messaging = null;
    return messaging;
  }
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getMessaging: getFcm } = require('firebase-admin/messaging');
  const app = initializeApp({ credential: cert(credential) });
  messaging = getFcm(app);
  return messaging;
}

module.exports = { getMessaging };
