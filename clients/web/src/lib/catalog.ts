const vnd = new Intl.NumberFormat('vi-VN')
export const money = (n: number) => `${vnd.format(n)} đ`

/** Số nguyên dương trong khoảng [min, max]; null nếu không hợp lệ. */
export function parseInt_(s: string, min = 1, max = Number.MAX_SAFE_INTEGER): number | null {
  const v = Number(s.trim())
  return s.trim() !== '' && Number.isInteger(v) && v >= min && v <= max ? v : null
}

/** Giá >= 0, nhận "50000" hoặc "50.000" (dấu chấm ngăn nghìn kiểu Việt Nam). */
export function parsePrice(s: string): number | null {
  const t = s.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const v = Number(t)
  return t !== '' && Number.isFinite(v) && v >= 0 ? v : null
}

/** Sinh danh sách khay để tạo hàng loạt: mã = tiền tố-NN (đệm 0 theo số lượng), ô tăng dần từ `startSlot`. */
export function planTrays(prefix: string, count: number, startSlot: number) {
  const width = Math.max(2, String(count).length)
  return Array.from({ length: count }, (_, i) => ({ trayCode: `${prefix}-${String(i + 1).padStart(width, '0')}`, slot: startSlot + i }))
}

/** Số thực trong [min, max], nhận cả "27,5" lẫn "27.5"; null nếu không hợp lệ. */
export function parseDecimal(s: string, min: number, max: number): number | null {
  const t = s.trim().replace(',', '.')
  const v = Number(t)
  return t !== '' && Number.isFinite(v) && v >= min && v <= max ? v : null
}
