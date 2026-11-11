import { describe, expect, it } from 'vitest'
import type { Dashboard } from '../api/dashboard'
import type { Device } from '../api/devices'
import type { Latest, ThresholdState } from '../api/monitoring'
import { buildTodo, daysLeftText, money, occupancyRate, sensorSummary, offlineDevices, roomHealth } from './dashboard'

const room = (status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE', name = 'A') => ({ id: `r-${name}`, name, status })
const latest = (online: boolean, has = true): Latest => ({ snapshot: has ? { temperature: 25, humidity: 85, recordedAt: '2026-11-10T08:00:00Z' } : null, deviceOnline: online })
const th = (temp = false, hum = false): ThresholdState => ({ tempMin: 20, tempMax: 30, humMin: 80, humMax: 90, consecutiveN: 3, configured: true, alerting: { temp, hum } })
const dash = (over: Partial<Dashboard> = {}): Dashboard => ({
  today: '2026-11-10', activeRentals: 3, pendingVarieties: { cycles: 0, rentals: 0 }, expiring: { days: 3, total: 0, items: [] },
  expiredGrowing: 0, awaitingClearance: 0, terminations: null, revenue: null, ...over,
})
const device = (over: Partial<Device>): Device => ({ id: 'd', name: 'D', type: 'SENSOR_NODE', roomId: 'r', status: 'ACTIVE', isSimulated: false, intervalSec: 30, online: true, lastSeenAt: '2026-11-10T08:00:00Z', cameraSlot: null, coverageRows: null, ...over })

describe('money', () => {
  it('phân tách hàng nghìn kiểu Việt Nam và làm tròn đồng', () => {
    expect(money(1234567)).toBe('1.234.567đ')
    expect(money(0)).toBe('0đ')
    expect(money(99.6)).toBe('100đ')
  })
})

describe('roomHealth', () => {
  it('thứ tự ưu tiên: ngừng > mất kết nối > chưa có dữ liệu > cảnh báo > bình thường', () => {
    expect(roomHealth(room('INACTIVE'), latest(true), th(true)).health).toBe('inactive')
    expect(roomHealth(room(), latest(false), th(true, true))).toEqual({ health: 'offline', reasons: [] })
    expect(roomHealth(room(), latest(true), th(false, true))).toEqual({ health: 'alert', reasons: ['độ ẩm'] })
    expect(roomHealth(room(), latest(false), th()).health).toBe('offline')
    expect(roomHealth(room(), latest(true, false), th()).health).toBe('nodata')
    expect(roomHealth(room(), latest(true), th()).health).toBe('ok')
  })
  it('chưa tải xong số đo thì là loading, không báo bình thường', () => {
    expect(roomHealth(room(), undefined, undefined).health).toBe('loading')
  })
})

describe('offlineDevices', () => {
  it('chỉ tính thiết bị đang bật, từng gửi dữ liệu và hiện mất kết nối', () => {
    const list = [device({ id: 'a', online: false }), device({ id: 'b', online: true }), device({ id: 'c', online: false, status: 'INACTIVE' }), device({ id: 'd', online: false, lastSeenAt: null })]
    expect(offlineDevices(list).map((d) => d.id)).toEqual(['a'])
  })
})

describe('buildTodo', () => {
  it('không có gì cần làm thì danh sách rỗng', () => {
    expect(buildTodo({ dash: dash(), rooms: [], offline: 0 })).toEqual([])
    expect(buildTodo({ dash: undefined, rooms: [], offline: 0 })).toEqual([])
  })
  it('một phòng cảnh báo dẫn thẳng vào phòng đó, nhiều phòng dẫn vào danh sách', () => {
    const a = { room: room('ACTIVE', 'A'), status: { health: 'alert' as const, reasons: ['nhiệt độ'] } }
    const b = { room: room('ACTIVE', 'B'), status: { health: 'alert' as const, reasons: ['độ ẩm'] } }
    const one = buildTodo({ dash: dash(), rooms: [a], offline: 0 })[0]
    expect(one.to).toBe('/giam-sat/r-A')
    expect(one.label).toBe('A đang cảnh báo ngưỡng phòng: nhiệt độ')
    const two = buildTodo({ dash: dash(), rooms: [a, b], offline: 0 })[0]
    expect(two.to).toBe('/giam-sat')
    expect(two.label).toBe('2 phòng đang cảnh báo ngưỡng phòng')
  })
  it('mỗi việc có đường dẫn đúng; Operator (terminations = null) không thấy việc của Admin', () => {
    const d = dash({ pendingVarieties: { cycles: 3, rentals: 2 }, expiredGrowing: 1, awaitingClearance: 4 })
    const keys = buildTodo({ dash: d, rooms: [], offline: 2 })
    expect(keys.map((t) => [t.key, t.to])).toEqual([
      ['expired', '/dot-nuoi'],
      ['offline', '/thiet-bi'],
      ['variety', '/dot-nuoi?giong=cho-duyet'],
      ['clearance', '/ban-giao-khay'],
    ])
    expect(keys.find((t) => t.key === 'variety')?.label).toContain('2 đơn')
    const admin = buildTodo({ dash: dash({ terminations: { pendingReview: 2, awaitingTransfer: 1 } }), rooms: [], offline: 0 })
    expect(admin.map((t) => [t.key, t.to])).toEqual([['review', '/don-thue'], ['transfer', '/don-thue']])
  })
  it('việc nguy hiểm (cảnh báo, hết hạn còn khay nuôi) đứng trước việc nhắc nhở', () => {
    const a = { room: room(), status: { health: 'alert' as const, reasons: ['nhiệt độ'] } }
    const out = buildTodo({ dash: dash({ expiredGrowing: 1, awaitingClearance: 1 }), rooms: [a], offline: 1 })
    expect(out.map((t) => t.tone)).toEqual(['error', 'error', 'warn', 'warn'])
  })
})

describe('daysLeftText', () => {
  it('các mức', () => {
    expect(daysLeftText(0)).toBe('Hết hạn hôm nay')
    expect(daysLeftText(1)).toBe('Còn 1 ngày')
    expect(daysLeftText(3)).toBe('Còn 3 ngày')
  })
})

describe('KPI vận hành', () => {
  it('tỷ lệ lấp đầy không chia cho 0', () => {
    expect(occupancyRate(3, 4)).toBe(75)
    expect(occupancyRate(0, 0)).toBe(0)
  })
  it('chỉ tính cảm biến đang hoạt động', () => {
    expect(sensorSummary([device({ id: 'a', online: true }), device({ id: 'b', online: false }), device({ id: 'c', status: 'INACTIVE' }), device({ id: 'd', type: 'CAMERA' })])).toEqual({ online: 1, total: 2 })
  })
})
