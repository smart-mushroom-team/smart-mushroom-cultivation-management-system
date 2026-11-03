import type { DeviceType } from '../api/devices'

export const TYPE_LABEL: Record<DeviceType, string> = { SENSOR_NODE: 'Cảm biến nhiệt độ, độ ẩm', CAMERA: 'Camera' }

/** Chu kỳ gửi hợp lệ theo backend: số nguyên 5–3600 giây. Trả null nếu không hợp lệ. */
export function parseInterval(s: string): number | null {
  const v = Number(s.trim())
  return s.trim() !== '' && Number.isInteger(v) && v >= 5 && v <= 3600 ? v : null
}

/** Thiết bị bị coi là mất kết nối sau 3 lần chu kỳ im lặng (BR-11); chữ giải thích để Operator biết vì sao. */
export const OFFLINE_HINT = (interval: number) => `Quá ${interval * 3} giây chưa nhận dữ liệu`
