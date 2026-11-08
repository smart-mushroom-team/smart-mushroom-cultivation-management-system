import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { describeError } from '../api/http'
import { getDemoStatus, runExpiry, setDemoDate } from '../api/demo'
import { Notice } from '../components/Notice'
import { dateVi } from '../lib/cycle'
import { addDays, isIsoDate } from '../lib/demo'
import { btn, ghost, input, primary } from './catalog/ui'

export function Demo() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['demo'], queryFn: getDemoStatus })
  const [date, setDate] = useState('')
  const [confirm, setConfirm] = useState(false)
  const done = () => Promise.all([qc.invalidateQueries({ queryKey: ['demo'] }), qc.invalidateQueries({ queryKey: ['cycles'] }), qc.invalidateQueries({ queryKey: ['notifications'] })])
  const setD = useMutation({ mutationFn: (d: string | null) => setDemoDate(d), onSuccess: () => { setDate(''); return done() } })
  const run = useMutation({ mutationFn: runExpiry, onSuccess: () => { setConfirm(false); return done() } })

  if (q.error) return <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>Không tải được trạng thái demo. {describeError(q.error)}</Notice>
  if (!q.data) return <p className="text-mute" role="status">Đang tải...</p>
  const s = q.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Chế độ demo</h1>
        <p className="mt-1 text-mute">Giả lập ngày để thử hết hạn đơn thuê mà không phải chờ. Chỉ dùng khi trình bày hoặc kiểm thử.</p>
      </div>

      {!s.enabled ? (
        <Notice>Chế độ demo đang tắt. Đặt <code>DEMO_MODE=true</code> trong file <code>.env</code> rồi chạy lại <code>docker compose up -d</code> để bật.</Notice>
      ) : (
        <>
          <section aria-label="Ngày hệ thống" className="rounded-lg border border-line bg-paper p-4">
            <div className="text-sm text-mute">Hôm nay theo hệ thống</div>
            <div className="font-display text-3xl font-semibold" data-testid="today">{dateVi(s.today)}</div>
            <p className="mt-1 text-sm text-mute">{s.demoDate ? 'Đang dùng ngày giả lập.' : 'Đang dùng ngày thật.'}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 7, 30].map((n) => (
                <button key={n} type="button" disabled={setD.isPending} onClick={() => setD.mutate(addDays(s.today, n))} className={ghost}>+{n} ngày</button>
              ))}
              <button type="button" disabled={setD.isPending || !s.demoDate} onClick={() => setD.mutate(null)} className={ghost}>Về ngày thật</button>
            </div>

            <form noValidate onSubmit={(e) => { e.preventDefault(); if (isIsoDate(date)) setD.mutate(date) }} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="demo-date" className="block text-sm font-medium">Đặt ngày cụ thể</label>
                <input id="demo-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
              </div>
              <button type="submit" disabled={setD.isPending || !isIsoDate(date)} className={primary}>Đặt ngày</button>
            </form>
            {setD.isError && <div className="mt-3"><Notice tone="error">Không đặt được ngày. {describeError(setD.error)}</Notice></div>}
          </section>

          <section aria-label="Job hết hạn" className="rounded-lg border border-line bg-paper p-4">
            <h2 className="font-display text-base font-semibold">Chạy job hết hạn đơn thuê</h2>
            <p className="mt-1 text-sm text-mute">Chuyển các đơn có hạn trước ngày hôm nay sang hết hạn, trả khay nếu đợt nuôi đã xong, và báo Operator những đơn còn đợt nuôi dang dở. Job thật cũng chạy đúng việc này lúc 00:00.</p>
            {!confirm ? (
              <button type="button" onClick={() => setConfirm(true)} className={`${ghost} mt-3`}>Chạy job...</button>
            ) : (
              <div role="group" aria-label="Xác nhận chạy job" className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm">Chạy với ngày {dateVi(s.today)}? Đơn hết hạn rồi không hoàn tác được.</span>
                <button type="button" disabled={run.isPending} onClick={() => run.mutate()} className={`${btn} bg-brick text-paper`}>{run.isPending ? 'Đang chạy...' : 'Xác nhận chạy'}</button>
                <button type="button" onClick={() => setConfirm(false)} className={`${btn} border border-line`}>Hủy</button>
              </div>
            )}
            {run.isSuccess && (
              <div className="mt-3">
                <Notice tone={run.data.errors ? 'error' : 'ok'}>
                  Đã chạy: {run.data.expired} đơn hết hạn, {run.data.completed} đơn hoàn tất{run.data.errors ? `, ${run.data.errors} đơn lỗi (xem log của Core)` : ''}.
                </Notice>
              </div>
            )}
            {run.isError && <div className="mt-3"><Notice tone="error">Không chạy được. {describeError(run.error)}</Notice></div>}
          </section>
        </>
      )}
    </div>
  )
}
