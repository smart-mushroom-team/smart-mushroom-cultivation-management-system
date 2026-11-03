import { describe, expect, it } from 'vitest'
import { canHarvest, dateVi, nextStage, parseWeight } from './cycle'

describe('đợt nuôi: hàm thuần', () => {
  it('chỉ có một bước tiếp theo, bước cuối không còn', () => {
    expect(nextStage('SEEDING')).toBe('INCUBATING')
    expect(nextStage('FRUITING')).toBe('READY')
    expect(nextStage('READY')).toBeNull()
  })
  it('thu hoạch được từ FRUITING trở đi', () => {
    expect(['SEEDING', 'INCUBATING', 'FRUITING', 'READY'].map((s) => canHarvest(s as 'SEEDING'))).toEqual([false, false, true, true])
  })
  it('đổi ngày không lệch múi giờ', () => {
    expect(dateVi('2026-11-05')).toBe('05/11/2026')
    expect(dateVi('2026-01-01T00:00:00')).toBe('01/01/2026')
    expect(dateVi(null)).toBe('—')
  })
  it('khối lượng theo luật backend (0 < kg <= 1000), nhận dấu phẩy', () => {
    expect(parseWeight('1,5')).toBe(1.5)
    expect(parseWeight(' 2 ')).toBe(2)
    for (const bad of ['', '0', '-1', 'abc', '1000.1']) expect(parseWeight(bad)).toBeNull()
    expect(parseWeight('1000')).toBe(1000)
  })
})
