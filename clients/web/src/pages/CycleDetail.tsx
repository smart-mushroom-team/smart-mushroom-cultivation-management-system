import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listRooms } from '../api/core'
import { discardCycle, getCycle, harvestCycle, patchCycle, type CycleDetail as Detail } from '../api/cycles'
import { ApiError, describeError } from '../api/http'
import { Notice } from '../components/Notice'
import { StageSteps } from '../components/StageSteps'
import { STAGE_LABEL, STATUS_LABEL, canHarvest, dateVi, nextStage, parseWeight } from '../lib/cycle'
import { clock } from '../lib/format'

const input = 'mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm'
const btn = 'rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60'

export function CycleDetail() {
  const { cycleId = '' } = useParams()
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const q = useQuery({ queryKey: ['cycle', cycleId], queryFn: () => getCycle(cycleId) })

  if (q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 422)) {
    return (
      <div>
        <Link to="/dot-nuoi" className="text-sm text-spore-deep underline">← Về danh sách đợt nuôi</Link>
        <h1 className="mt-3 text-3xl font-semibold">Không tìm thấy đợt nuôi</h1>
        <p className="mt-1 text-mute">Đợt nuôi này không tồn tại. Chọn lại trong danh sách.</p>
      </div>
    )
  }
  if (q.error) return <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được đợt nuôi. {describeError(q.error)}</Notice>
  const c = q.data
  if (!c) return <p className="text-mute" role="status">Đang tải...</p>
  const room = rooms.data?.find((r) => r.id === c.roomId)
  const growing = c.status === 'GROWING'

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dot-nuoi" className="text-sm text-spore-deep underline">← Về danh sách đợt nuôi</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">Khay {c.trayCode}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${growing ? 'bg-moss-soft text-moss' : 'bg-bone text-mute'}`}>{STATUS_LABEL[c.status]}</span>
        </div>
        <p className="mt-1 text-mute">
          {room ? <Link to={`/giam-sat/${room.id}`} className="underline">{room.name}</Link> : 'Phòng'} · khách {c.customerName}
        </p>
      </div>

      {growing && c.rentalStatus === 'EXPIRED' && (
        <Notice>Đơn thuê đã hết hạn, khách không còn xem được khay này. Hãy thu hoạch hoặc loại bỏ để đóng đơn.</Notice>
      )}

      <section aria-label="Thông tin" className="rounded-lg border border-line bg-paper p-4">
        <StageSteps stage={c.stage} ended={!growing} />
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Info label="Bắt đầu" value={dateVi(c.startDate)} />
          <Info label="Hạn thuê" value={dateVi(c.rentalEndDate)} />
          <Info label="Giống" value={c.variety ?? 'Chưa nhập'} />
          <Info label="Thu hoạch dự kiến" value={dateVi(c.expectedHarvestDate)} />
          {c.status === 'HARVESTED' && <Info label="Đã thu hoạch" value={`${dateVi(c.harvestedAt)} · ${c.weightKg} kg`} />}
          {c.status === 'DISCARDED' && <Info label="Lý do loại bỏ" value={c.discardReason ?? '—'} />}
          {c.note && <Info label="Ghi chú" value={c.note} />}
        </dl>
      </section>

      {growing && <Actions cycle={c} />}

      <section aria-label="Nhật ký" className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Nhật ký tiến độ</h2>
        {c.logs.length === 0 ? (
          <p className="mt-2 text-sm text-mute">Chưa có thay đổi nào.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {c.logs.map((l, i) => (
              <li key={i}>
                <span className="text-mute">{clock(l.at)}</span> · {label(l.from)} → <strong className="font-medium">{label(l.to)}</strong>
                {l.note && <span className="text-mute"> · {l.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

const label = (s: string | null) => (s && s in STAGE_LABEL ? STAGE_LABEL[s as keyof typeof STAGE_LABEL] : s === 'HARVESTED' ? 'Thu hoạch' : s === 'DISCARDED' ? 'Loại bỏ' : '—')

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-mute">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function Actions({ cycle }: { cycle: Detail }) {
  const qc = useQueryClient()
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['cycle', cycle.id] }), qc.invalidateQueries({ queryKey: ['cycles'] })])
  const next = nextStage(cycle.stage)

  // --- chuyển giai đoạn
  const [stageNote, setStageNote] = useState('')
  const advance = useMutation({ mutationFn: () => patchCycle(cycle.id, { stage: next!, note: stageNote.trim() || undefined }), onSuccess: () => { setStageNote(''); return refresh() } })

  // --- sửa thông tin
  const [variety, setVariety] = useState(cycle.variety ?? '')
  const [expected, setExpected] = useState(cycle.expectedHarvestDate ?? '')
  const [note, setNote] = useState(cycle.note ?? '')
  const save = useMutation({
    mutationFn: () => patchCycle(cycle.id, { variety: variety.trim() || undefined, expectedHarvestDate: expected || undefined, note: note.trim() || undefined }),
    onSuccess: refresh,
  })
  const dateError = expected && expected < cycle.startDate ? 'Ngày thu hoạch dự kiến không thể trước ngày bắt đầu.' : null

  // --- thu hoạch
  const [kg, setKg] = useState('')
  const [hNote, setHNote] = useState('')
  const [hShown, setHShown] = useState(false)
  const weight = parseWeight(kg)
  const harvest = useMutation({ mutationFn: () => harvestCycle(cycle.id, { weightKg: weight!, note: hNote.trim() || undefined }), onSuccess: refresh })

  // --- loại bỏ (hai bước: nhập lý do rồi xác nhận)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState(false)
  const discard = useMutation({ mutationFn: () => discardCycle(cycle.id, reason.trim()), onSuccess: refresh })

  const onHarvest = (e: FormEvent) => {
    e.preventDefault()
    setHShown(true)
    if (weight !== null) harvest.mutate()
  }

  return (
    <section aria-label="Thao tác" className="space-y-4">
      <div className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Chuyển giai đoạn</h2>
        {next ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-mute">Hiện tại: {STAGE_LABEL[cycle.stage]}. Chỉ chuyển được từng bước, không quay lại. Khách sẽ nhận thông báo.</p>
            <label className="block text-sm font-medium">
              Ghi chú (không bắt buộc)
              <input value={stageNote} onChange={(e) => setStageNote(e.target.value)} maxLength={1000} className={input} />
            </label>
            <button type="button" disabled={advance.isPending} onClick={() => advance.mutate()} className={`${btn} bg-spore text-paper hover:bg-spore-deep`}>
              {advance.isPending ? 'Đang chuyển...' : `Chuyển sang ${STAGE_LABEL[next]}`}
            </button>
            {advance.isError && <Notice tone="error">Không chuyển được. {describeError(advance.error)}</Notice>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-mute">Đã ở giai đoạn cuối. Bước tiếp theo là thu hoạch hoặc loại bỏ.</p>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!dateError) save.mutate() }} noValidate className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Thông tin đợt nuôi</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Giống nấm
            <input value={variety} onChange={(e) => { setVariety(e.target.value); save.reset() }} maxLength={100} className={input} />
          </label>
          <div>
            <label htmlFor="exp" className="block text-sm font-medium">Thu hoạch dự kiến</label>
            <input id="exp" type="date" value={expected} onChange={(e) => { setExpected(e.target.value); save.reset() }} aria-invalid={dateError ? true : undefined} aria-describedby={dateError ? 'exp-err' : undefined} className={input} />
            {dateError && <p id="exp-err" className="mt-1 text-sm text-brick">{dateError}</p>}
          </div>
          <label className="block text-sm font-medium sm:col-span-2">
            Ghi chú
            <textarea value={note} onChange={(e) => { setNote(e.target.value); save.reset() }} maxLength={1000} rows={2} className={input} />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <button type="submit" disabled={save.isPending || !!dateError} className={`${btn} border border-line hover:border-spore`}>{save.isPending ? 'Đang lưu...' : 'Lưu thông tin'}</button>
          {save.isSuccess && <Notice tone="ok">Đã lưu.</Notice>}
        </div>
        {save.isError && <div className="mt-3"><Notice tone="error">Không lưu được. {describeError(save.error)}</Notice></div>}
      </form>

      <form onSubmit={onHarvest} noValidate className="rounded-lg border border-line bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Thu hoạch</h2>
        {!canHarvest(cycle.stage) ? (
          <p className="mt-2 text-sm text-mute">Chỉ thu hoạch được khi khay đã ra quả thể hoặc sẵn sàng thu hoạch. Khay đang ở giai đoạn {STAGE_LABEL[cycle.stage].toLowerCase()}.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="kg" className="block text-sm font-medium">Khối lượng (kg)</label>
              <input id="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} aria-invalid={hShown && weight === null ? true : undefined} aria-describedby={hShown && weight === null ? 'kg-err' : undefined} className={input} />
              {hShown && weight === null && <p id="kg-err" className="mt-1 text-sm text-brick">Nhập khối lượng lớn hơn 0 và không quá 1000 kg.</p>}
            </div>
            <label className="block text-sm font-medium">
              Ghi chú (không bắt buộc)
              <input value={hNote} onChange={(e) => setHNote(e.target.value)} maxLength={1000} className={input} />
            </label>
            <button type="submit" disabled={harvest.isPending} className={`${btn} bg-moss text-paper`}>{harvest.isPending ? 'Đang ghi...' : 'Ghi nhận thu hoạch'}</button>
            {harvest.isError && <Notice tone="error">Không ghi nhận được. {describeError(harvest.error)}</Notice>}
          </div>
        )}
      </form>

      <div className="rounded-lg border border-brick/30 bg-paper p-4">
        <h2 className="font-display text-base font-semibold">Loại bỏ đợt nuôi</h2>
        <p className="mt-1 text-sm text-mute">Dùng khi nấm hỏng hoặc nhiễm bệnh. Không hoàn tác được, khách sẽ nhận lý do.</p>
        <label className="mt-3 block text-sm font-medium">
          Lý do
          <input value={reason} onChange={(e) => { setReason(e.target.value); setConfirm(false) }} maxLength={1000} className={input} />
        </label>
        {!confirm ? (
          <button type="button" disabled={!reason.trim()} onClick={() => setConfirm(true)} className={`${btn} mt-3 border border-brick/40 text-brick hover:bg-brick-soft`}>Loại bỏ...</button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3" role="group" aria-label="Xác nhận loại bỏ">
            <span className="text-sm font-medium text-brick">Loại bỏ khay {cycle.trayCode}?</span>
            <button type="button" disabled={discard.isPending} onClick={() => discard.mutate()} className={`${btn} bg-brick text-paper`}>{discard.isPending ? 'Đang xử lý...' : 'Xác nhận loại bỏ'}</button>
            <button type="button" onClick={() => setConfirm(false)} className={`${btn} border border-line`}>Hủy</button>
          </div>
        )}
        {discard.isError && <div className="mt-3"><Notice tone="error">Không loại bỏ được. {describeError(discard.error)}</Notice></div>}
      </div>
    </section>
  )
}
