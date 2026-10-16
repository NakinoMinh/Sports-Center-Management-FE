import { useCallback, useEffect, useRef, useState } from "react";
import { sprint2Api } from "../services/sprint2Api";
import { describeError } from "../services/apiErrors";
import { useToast } from "../hooks/useToast";
import { formatDate } from "../utils/format";
import { notificationTypeLabels, type ClassNotification } from "../types/sprint2";

export function NotificationsPage() {
  const toast = useToast();
  const [items,setItems] = useState<ClassNotification[]>([]);
  const [page,setPage] = useState(1);
  const [totalPages,setTotalPages] = useState(0);
  const [unread,setUnread] = useState(0);
  const [filter,setFilter] = useState("");
  const [isLoading,setIsLoading] = useState(false);
  const [isSaving,setIsSaving] = useState(false);
  const [error,setError] = useState("");
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    setIsLoading(true);
    try { const [result,count] = await Promise.all([sprint2Api.notifications(page,filter === "" ? undefined : filter === "true"),sprint2Api.unreadCount()]);if (request !== requestId.current) return; setItems(result.items);setTotalPages(result.totalPages);setUnread(count);setError(""); }
    catch(caught) {if (request === requestId.current) setError(describeError(caught));}
    finally {if (request === requestId.current) setIsLoading(false);}
  },[page,filter]);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 150); return () => { window.clearTimeout(timer); requestId.current++; }; }, [refresh]);
  async function handleRead(item: ClassNotification) {
    setIsSaving(true);
    try {await sprint2Api.markRead(item.id,!item.isRead);await refresh();}
    catch(caught) {toast.error(describeError(caught));}
    finally {setIsSaving(false);}
  }
  return <><div className="page-heading"><div><h1>Thông báo lớp học</h1><p>{unread} thông báo chưa đọc</p></div><button className="button secondary" disabled={isLoading} onClick={() => void refresh()}>Làm mới</button></div><section className="panel"><label className="field">Trạng thái<select value={filter} onChange={e => {setFilter(e.target.value);setPage(1);}}><option value="">Tất cả</option><option value="false">Chưa đọc</option><option value="true">Đã đọc</option></select></label>{error && <p role="alert">{error}</p>}{isLoading && <p role="status">Đang tải thông báo…</p>}<div className="reception-class-grid">{items.map(item => <article className="reception-class-card" key={item.id}><span className="eyebrow">{notificationTypeLabels[item.type] ?? item.type}</span><h2>{item.title}</h2><p>{item.body}</p><p>{formatDate(item.createdAt)} · {item.isRead ? "Đã đọc" : "Chưa đọc"}</p><button className="button secondary" disabled={isSaving} onClick={() => void handleRead(item)}>{item.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}</button></article>)}</div>{!isLoading && !error && !items.length && <p className="empty-state">Không có thông báo phù hợp.</p>}<div className="table-footer"><button className="button secondary" disabled={isLoading || page<=1} onClick={() => setPage(page-1)}>Trước</button><span>Trang {page} / {Math.max(1,totalPages)}</span><button className="button secondary" disabled={isLoading || page>=totalPages} onClick={() => setPage(page+1)}>Sau</button></div></section></>;
}
