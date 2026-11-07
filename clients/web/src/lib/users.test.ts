import { describe, expect, it } from 'vitest'
import { addDays, isIsoDate } from './demo'
import { filterUsers, validateOperator } from './users'

describe('validateOperator', () => {
  it('hợp lệ thì không có lỗi', () => {
    expect(validateOperator({ name: 'Nguyễn Văn A', email: 'a@congty.vn', password: '12345678' })).toEqual({})
  })
  it('bắt từng lỗi với lời nhắc cách sửa', () => {
    const e = validateOperator({ name: '  ', email: 'a@congty', password: 'ngan' })
    expect(Object.keys(e).sort()).toEqual(['email', 'name', 'password'])
    for (const bad of ['', 'abc', '@x.vn', 'a b@x.vn', 'a@@x.vn', 'a@b']) expect(validateOperator({ name: 'x', email: bad, password: '12345678' }).email).toBeDefined()
    expect(validateOperator({ name: 'x', email: 'a@b.vn', password: 'x'.repeat(129) }).password).toMatch(/128/)
  })
})

describe('filterUsers', () => {
  const u = [
    { name: 'An', email: 'an@x.vn', role: 'ADMIN' },
    { name: 'Bình Operator', email: 'binh@x.vn', role: 'OPERATOR' },
    { name: 'Chi', email: 'AN.chi@y.vn', role: 'CUSTOMER' },
  ]
  it('lọc theo vai trò và từ khóa không phân biệt hoa thường, theo tên hoặc email', () => {
    expect(filterUsers(u, 'OPERATOR', '').map((x) => x.name)).toEqual(['Bình Operator'])
    expect(filterUsers(u, '', 'an').map((x) => x.name)).toEqual(['An', 'Chi'])
    expect(filterUsers(u, 'CUSTOMER', 'an').map((x) => x.name)).toEqual(['Chi'])
    expect(filterUsers(u, '', 'zzz')).toEqual([])
  })
})

describe('demo date', () => {
  it('addDays qua tháng, năm, năm nhuận', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-11-01', 30)).toBe('2026-12-01')
  })
  it('isIsoDate', () => {
    expect(isIsoDate('2026-10-31')).toBe(true)
    for (const b of ['', '31/10/2026', '2026-13-01']) expect(isIsoDate(b)).toBe(false)
  })
})
