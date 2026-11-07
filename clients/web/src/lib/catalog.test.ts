import { describe, expect, it } from 'vitest'
import { money, parseInt_, parsePrice, planTrays } from './catalog'

describe('danh mục: hàm thuần', () => {
  it('parsePrice nhận 50000, 50.000, 1.234.567 và 0; từ chối âm, chữ, rỗng', () => {
    expect(parsePrice('50000')).toBe(50000)
    expect(parsePrice('50.000')).toBe(50000)
    expect(parsePrice('1.234.567')).toBe(1234567)
    expect(parsePrice('12,5')).toBe(12.5)
    expect(parsePrice('0')).toBe(0)
    for (const bad of ['', '-1', 'abc', ' ']) expect(parsePrice(bad)).toBeNull()
  })
  it('parseInt_ theo khoảng', () => {
    expect(parseInt_('5', 1, 50)).toBe(5)
    for (const bad of ['', '0', '51', '1.5', 'x']) expect(parseInt_(bad, 1, 50)).toBeNull()
  })
  it('planTrays đệm số 0 theo số lượng và tăng ô liên tục', () => {
    expect(planTrays('A1', 3, 4)).toEqual([{ trayCode: 'A1-01', slot: 4 }, { trayCode: 'A1-02', slot: 5 }, { trayCode: 'A1-03', slot: 6 }])
    expect(planTrays('B', 100, 1)[99].trayCode).toBe('B-100')
    expect(planTrays('B', 100, 1)[0].trayCode).toBe('B-001')
  })
  it('money dùng dấu chấm ngăn nghìn', () => {
    expect(money(1500000).replace(/\s/g, ' ')).toBe('1.500.000 đ')
  })
})
