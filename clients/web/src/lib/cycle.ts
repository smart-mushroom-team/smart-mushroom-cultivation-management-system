import type { CycleStatus, Stage } from '../api/cycles'

export const STAGES: Stage[] = ['SEEDING', 'INCUBATING', 'FRUITING', 'READY']
export const STAGE_LABEL: Record<Stage, string> = { SEEDING: 'Cấy giống', INCUBATING: 'Ủ tơ', FRUITING: 'Ra quả thể', READY: 'Sẵn sàng thu hoạch' }
export const STATUS_LABEL: Record<CycleStatus, string> = { GROWING: 'Đang nuôi', HARVESTED: 'Đã thu hoạch', DISCARDED: 'Đã loại bỏ' }

/** Giai đoạn kế tiếp; backend chỉ cho đi từng bước nên giao diện chỉ đưa ra đúng một lựa chọn. */
export const nextStage = (s: Stage): Stage | null => STAGES[STAGES.indexOf(s) + 1] ?? null
/** Chỉ thu hoạch được khi đã ra quả thể hoặc sẵn sàng (BR-06). */
export const canHarvest = (s: Stage) => s === 'FRUITING' || s === 'READY'

/** "2026-11-05" -> "05/11/2026" bằng cách tách chuỗi, không qua Date để khỏi lệch múi giờ. */
export function dateVi(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** Nhập "1,5" hoặc "1.5" -> 1.5; null nếu không hợp lệ theo luật backend (0 < kg <= 1000). */
export function parseWeight(s: string): number | null {
  const v = Number(s.trim().replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(v) && v > 0 && v <= 1000 ? v : null
}
