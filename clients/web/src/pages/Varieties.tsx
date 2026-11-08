import { VarietiesTab } from './catalog/VarietiesTab'

export function Varieties() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Giống nấm</h1>
        <p className="mt-1 text-mute">Danh mục giống khách chọn khi thuê khay, kèm thông tin tham khảo. Giống khách tự nhập được duyệt ở trang Đợt nuôi.</p>
      </div>
      <VarietiesTab />
    </div>
  )
}
