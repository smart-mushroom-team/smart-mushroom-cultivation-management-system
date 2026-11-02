import type { Stage } from '../api/cycles'
import { STAGES, STAGE_LABEL } from '../lib/cycle'

/** Bốn giai đoạn theo thứ tự; đã qua = tím đặc, hiện tại = viền tím đậm, chưa tới = viền nhạt. Chữ luôn có, không chỉ dựa vào màu. */
export function StageSteps({ stage, ended }: { stage: Stage; ended?: boolean }) {
  const cur = STAGES.indexOf(stage)
  return (
    <ol aria-label="Tiến độ" className="flex flex-wrap gap-x-2 gap-y-1">
      {STAGES.map((s, i) => {
        const done = i < cur || (ended && i <= cur)
        const here = i === cur && !ended
        return (
          <li key={s} aria-current={here ? 'step' : undefined} className={`flex items-center gap-1.5 text-sm ${here ? 'font-semibold text-spore-deep' : done ? 'text-ink' : 'text-mute'}`}>
            <span aria-hidden="true" className={`h-3 w-3 rounded-[3px] border ${done ? 'border-spore bg-spore' : here ? 'border-spore-deep bg-spore-soft' : 'border-mute/40 bg-paper'}`} />
            {STAGE_LABEL[s]}
            {i < STAGES.length - 1 && <span aria-hidden="true" className="ml-1 text-mute/50">›</span>}
          </li>
        )
      })}
    </ol>
  )
}
