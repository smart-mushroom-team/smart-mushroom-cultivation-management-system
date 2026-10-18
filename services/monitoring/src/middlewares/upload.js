'use strict';

const multer = require('multer');
const { AppError, ERROR_CODES } = require('@mushroom/shared');

/**
 * Nhận ảnh snapshot (multipart/form-data, trường "image"), giữ trong RAM vì chỉ cần latest snapshot.
 * BR-10: chỉ JPEG, tối đa 2 MB (413 nếu quá lớn, 415 nếu không phải JPEG).
 * Lưu ý: mimetype do client tự khai; controller nên kiểm thêm magic bytes JPEG (FF D8 FF).
 */
function createSnapshotUpload({ maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'image/jpeg') {
        return cb(new AppError(415, ERROR_CODES.UNSUPPORTED_MEDIA_TYPE, 'Chỉ chấp nhận ảnh JPEG'));
      }
      return cb(null, true);
    },
  }).single('image');
}

module.exports = { createSnapshotUpload };
