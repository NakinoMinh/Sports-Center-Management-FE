import { useCallback, useEffect, useRef, useState } from "react";
import { sprint2Api } from "../../services/sprint2Api";
import { describeError, fieldErrorsOf } from "../../services/apiErrors";
import { useToast } from "../../hooks/useToast";
import { Dialog } from "../../components/common/Dialog";
import * as v from "../../utils/validation";
import type { SportItem, SportInput } from "../../types/sprint2";

export function SportsPage() {
  const toast = useToast();
  const [items, setItems] = useState<SportItem[]>([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<SportItem | "new" | null>(null);
  const [form, setForm] = useState<SportInput>({name: "", description: ""});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    setIsLoading(true);
    try { const result = await sprint2Api.sports(search,page,active === "" ? undefined : active === "true"); if (request !== requestId.current) return; setItems(result.items); setTotalPages(result.totalPages); setError(""); }
    catch(caught) { if (request === requestId.current) setError(describeError(caught)); }
    finally { if (request === requestId.current) setIsLoading(false); }
  },[search,page,active]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 150); return () => { window.clearTimeout(timer); requestId.current++; }; }, [refresh]);
  async function handleSave() {
    const next = v.validateForm(form,{name:v.all(v.required("Tên bộ môn"),v.minLength("Tên bộ môn",2),v.maxLength("Tên bộ môn",80)),description:v.text("Mô tả",500)});
    setErrors(next);
    if(v.hasErrors(next)) return;
    setIsSaving(true);
    try { await sprint2Api.saveSport(form, editing === "new" ? undefined : editing?.id); setEditing(null); toast.success("Đã lưu bộ môn."); await refresh(); }
    catch(caught) { setErrors(fieldErrorsOf(caught)); toast.error(describeError(caught)); }
    finally { setIsSaving(false); }
  }
  async function handleToggle(item: SportItem) {
    setIsSaving(true);
    try { await sprint2Api.setSportActive(item.id,!item.isActive); toast.success("Đã cập nhật trạng thái bộ môn."); await refresh(); }
    catch(caught) { toast.error(describeError(caught)); }
    finally { setIsSaving(false); }
  }
  return <>
    <div className="page-heading"><div><h1>Bộ môn</h1><p>Quản lý danh mục dùng cho lớp học và quyền lợi gói tập.</p></div><button className="button primary" onClick={() => {setEditing("new");setForm({name:"",description:""});setErrors({});}}>Thêm bộ môn</button></div>
    <section className="panel"><div className="toolbar"><label className="field">Tìm bộ môn<input value={search} onChange={e => {setSearch(e.target.value);setPage(1);}}/></label><label className="field">Trạng thái<select value={active} onChange={e => {setActive(e.target.value);setPage(1);}}><option value="">Tất cả</option><option value="true">Đang hoạt động</option><option value="false">Đã ẩn</option></select></label><button className="button secondary" disabled={isLoading} onClick={() => void refresh()}>Làm mới</button></div>
    {error && <p role="alert">{error}</p>}{isLoading && <p role="status">Đang tải…</p>}
    <div className="reception-class-grid">{items.map(item => <article className="reception-class-card" key={item.id}><h2>{item.name}</h2><p>{item.description}</p><p>{item.isActive ? "Đang hoạt động" : "Đã ẩn"}</p><div className="row-actions"><button className="button secondary" disabled={isSaving} onClick={() => {setEditing(item);setForm({name:item.name,description:item.description ?? ""});setErrors({});}}>Sửa</button><button className="button secondary" disabled={isSaving} onClick={() => void handleToggle(item)}>{item.isActive ? "Ẩn bộ môn" : "Hiện bộ môn"}</button></div></article>)}</div>
    {!isLoading && !error && !items.length && <p className="empty-state">Không có bộ môn phù hợp.</p>}
    <div className="table-footer"><button className="button secondary" disabled={isLoading || page <= 1} onClick={() => setPage(page-1)}>Trước</button><span>Trang {page} / {Math.max(1,totalPages)}</span><button className="button secondary" disabled={isLoading || page >= totalPages} onClick={() => setPage(page+1)}>Sau</button></div></section>
    {editing && <Dialog title={editing === "new" ? "Thêm bộ môn" : "Sửa bộ môn"} onClose={() => {if(!isSaving)setEditing(null);}}><form onSubmit={e => {e.preventDefault();void handleSave();}} noValidate><label className="field">Tên bộ môn<input value={form.name} maxLength={80} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "sport-name-error" : undefined} onChange={e => setForm({...form,name:e.target.value})}/>{errors.name && <small id="sport-name-error" className="form-error">{errors.name}</small>}</label><label className="field">Mô tả<textarea value={form.description} maxLength={500} aria-invalid={Boolean(errors.description)} onChange={e => setForm({...form,description:e.target.value})}/>{errors.description && <small className="form-error">{errors.description}</small>}</label><button className="button primary" disabled={isSaving}>{isSaving ? "Đang lưu…" : "Lưu bộ môn"}</button></form></Dialog>}
  </>;
}
