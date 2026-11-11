import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listRooms } from '../api/core'
import { listCycles, type CycleStatus } from '../api/cycles'
import { describeError } from '../api/http'
import { Notice } from '../components/Notice'
import { STAGE_LABEL, STATUS_LABEL, VARIETY_STATUS_LABEL, dateVi } from '../lib/cycle'

const TABS: CycleStatus[] = ['GROWING', 'HARVESTED', 'DISCARDED']

export function Cycles() {
  const [status, setStatus] = useState<CycleStatus>('GROWING')
  const [roomId, setRoomId] = useState('')
  // Tổng quan dẫn tới đây bằng ?giong=cho-duyet để mở sẵn bộ lọc giống chờ duyệt.
  const [params] = useSearchParams()
  const [pendingOnly, setPendingOnly] = useState(params.get('giong') === 'cho-duyet')
  const rooms = useQuery({ queryKey: ['rooms'], queryFn: listRooms })
  const q = useQuery({ queryKey: ['cycles', status, roomId, pendingOnly], queryFn: () => listCycles(status, roomId, pendingOnly ? 'PENDING' : undefined) })
  const roomName = (id: string) => rooms.data?.find((r) => r.id === id)?.name ?? '—'

  return (
    <div>
      <h1 className="text-3xl font-semibold">Đợt nuôi</h1>
      <p className="mt-1 text-mute">Các khay đang được thuê, xếp theo hạn thuê gần nhất trước.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Trạng thái" className="flex gap-1">
          {TABS.map((t) => (
            <button key={t} type="button" aria-pressed={status === t} onClick={() => setStatus(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${status === t ? 'bg-spore-soft text-spore-deep' : 'border border-line hover:border-spore'}`}>
              {STATUS_LABEL[t]}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={pendingOnly} onClick={() => setPendingOnly(!pendingOnly)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${pendingOnly ? 'bg-amber-soft text-amber' : 'border border-line hover:border-spore'}`}>
          Giống chờ duyệt
        </button>
        <label className="flex items-center gap-2 text-sm">
          Phòng
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
            <option value="">Tất cả</option>
            {(rooms.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {q.error ? (
          <Notice tone="error" action={<button className="shrink-0 font-medium underline" onClick={() => void q.refetch()}>Thử lại</button>}>
            Không tải được danh sách. {describeError(q.error)}
          </Notice>
        ) : !q.data ? (
          <p className="text-mute" role="status">Đang tải...</p>
        ) : q.data.length === 0 ? (
          <p className="text-mute">{pendingOnly ? 'Không có giống nào đang chờ duyệt.' : status === 'GROWING' ? 'Chưa có khay nào đang nuôi. Khi khách thuê khay, đợt nuôi sẽ hiện ở đây.' : `Chưa có đợt nuôi nào ở trạng thái "${STATUS_LABEL[status].toLowerCase()}".`}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-paper">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách đợt nuôi</caption>
              <thead className="border-b border-line text-mute">
                <tr>
                  {['Khay', 'Phòng', 'Khách', 'Giai đoạn', 'Giống', 'Thu hoạch dự kiến', 'Hạn thuê'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.data.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium whitespace-nowrap">
                      <Link to={`/dot-nuoi/${c.id}`} className="text-spore-deep underline">{c.trayCode}</Link>
                    </th>
                    <td className="px-4 py-3">{roomName(c.roomId)}</td>
                    <td className="px-4 py-3">{c.customerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{c.status === 'GROWING' ? STAGE_LABEL[c.stage] : STATUS_LABEL[c.status]}</td>
                    <td className="px-4 py-3">
                      {c.variety ?? <span className="text-mute">Chưa nhập</span>}
                      {(c.varietyStatus === 'PENDING' || c.varietyStatus === 'REJECTED') && (
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${c.varietyStatus === 'PENDING' ? 'bg-amber-soft text-amber' : 'bg-brick-soft text-brick'}`}>{VARIETY_STATUS_LABEL[c.varietyStatus]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{dateVi(c.expectedHarvestDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dateVi(c.rentalEndDate)}
                      {c.status === 'GROWING' && c.rentalStatus === 'EXPIRED' && <span className="ml-2 rounded bg-amber-soft px-1.5 py-0.5 text-xs text-amber">Đã hết hạn</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
