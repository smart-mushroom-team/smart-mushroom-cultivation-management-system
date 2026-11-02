import { Link } from 'react-router-dom'
export function NotFound() { return <div className="py-16 text-center"><h1 className="text-3xl font-semibold">Không tìm thấy trang</h1><p className="mt-2 text-mute">Đường dẫn này không tồn tại.</p><Link to="/" className="mt-4 inline-block text-spore-deep underline">Về trang chính</Link></div> }
