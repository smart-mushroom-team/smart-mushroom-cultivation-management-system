import { useEffect,useState } from 'react'
import { api,describeError } from '../api/http'
type Policy={version:number|null;content:string;publishedAt:string|null}
export function Policies(){const [current,setCurrent]=useState<Policy|null>(null);const [draft,setDraft]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
 async function load(){try{const r=await api<Policy>('/api/core/policies/current');setCurrent(r);setDraft(r.version?r.content:'');setError('')}catch(e){setError(describeError(e))}}
 useEffect(()=>{void load()},[])
 async function publish(){if(!window.confirm('Xuất bản chính sách mới cho toàn bộ người dùng?'))return;setBusy(true);try{await api('/api/core/policies',{method:'POST',body:{content:draft}});await load()}catch(e){setError(describeError(e))}finally{setBusy(false)}}
 return <section className="space-y-4"><h1 className="text-2xl font-bold">Chính sách</h1><p className="text-sm">Phiên bản đã xuất bản: {current?.version??'Chưa có'} · {current?.publishedAt??''}</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<label className="block font-semibold" htmlFor="policy-editor">Nội dung chính sách</label><textarea id="policy-editor" className="w-full min-h-96 rounded border border-line bg-paper p-3" value={draft} onChange={e=>setDraft(e.target.value)}/><button disabled={busy||draft.trim().length<20} className="rounded bg-spore px-4 py-2 text-white disabled:opacity-50" onClick={()=>void publish()}>Xuất bản chính sách</button></section>
}
