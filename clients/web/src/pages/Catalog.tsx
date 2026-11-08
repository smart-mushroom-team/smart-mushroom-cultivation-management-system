import { useState } from 'react'
import { Tabs } from '../components/Tabs'
import { PackagesTab } from './catalog/PackagesTab'
import { RoomsTab } from './catalog/RoomsTab'
import { TraysTab } from './catalog/TraysTab'

type Tab = 'rooms' | 'trays' | 'packages'

export function Catalog() {
  const [tab, setTab] = useState<Tab>('rooms')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Phòng, khay, gói</h1>
        <p className="mt-1 text-mute">Danh mục khách có thể thuê: phòng, các khay trong phòng và các gói thời hạn, giá.</p>
      </div>
      <Tabs label="Danh mục" value={tab} onChange={setTab} items={[{ id: 'rooms', label: 'Phòng' }, { id: 'trays', label: 'Khay' }, { id: 'packages', label: 'Gói thuê' }]} />
      {tab === 'rooms' ? <RoomsTab /> : tab === 'trays' ? <TraysTab /> : <PackagesTab />}
    </div>
  )
}
