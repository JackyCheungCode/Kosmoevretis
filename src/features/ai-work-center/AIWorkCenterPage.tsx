import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, Renew, Search, TrashCan } from "@carbon/icons-react";
import { Button, Checkbox, InlineLoading, InlineNotification, Search as CarbonSearch, Select, SelectItem, Tag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { taskStatusLabel, taskTypeLabel } from "./types";
import { PageHeader } from "../../components/ui/PageHeader";
import type { ResearchTask, ResearchTaskStatus } from "./types";
import "./ai-work-center.scss";

type TaskView = "active" | "archived" | "trash" | "all";
type ListResponse = { items: ResearchTask[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; summary: Record<ResearchTaskStatus, number> };
const statusTone: Record<ResearchTaskStatus, "blue" | "green" | "red" | "warm-gray" | "purple"> = { queued: "blue", running: "blue", succeeded: "green", partial: "purple", failed: "red", cancelled: "warm-gray" };
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

export function AIWorkCenterPage() {
  const { session, workspace } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<TaskView>("active");
  const [taskType, setTaskType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!session?.access_token || !workspace?.id) return;
    setLoading(true); setError("");
    const params = new URLSearchParams({ organizationId: workspace.id, page: String(page), pageSize: "50", view, taskType, status, search });
    try {
      const response = await fetch("/api/research-tasks?" + params.toString(), { headers: { Authorization: "Bearer " + session.access_token } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "读取任务列表失败。");
      setData(payload as ListResponse); setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取任务列表失败。");
    } finally { setLoading(false); }
  }, [session?.access_token, workspace?.id, page, view, taskType, status, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setSelected([]); }, [view, taskType, status, search]);

  const items = data?.items || [];
  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.id));
  const selectedCount = selected.length;
  const summary = data?.summary || {} as Record<ResearchTaskStatus, number>;
  const selectPage = (checked: boolean) => setSelected((current) => checked ? [...new Set([...current, ...items.map((item) => item.id)])] : current.filter((id) => !items.some((item) => item.id === id)));
  const toggleOne = (id: string, checked: boolean) => setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id));

  const runAction = async (action: "archive" | "trash" | "restore") => {
    if (!session?.access_token || !workspace?.id || !selected.length) return;
    const prompt = action === "trash" ? "将所选任务移入回收站？这不会停止正在运行的 Apify Actor。" : action === "archive" ? "归档所选已结束任务？" : "恢复所选任务？";
    if (!window.confirm(prompt)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/research-tasks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({ organizationId: workspace.id, action, taskIds: selected }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "批量操作失败。");
      setNotice("已处理 " + (payload.affected || 0) + " 项，跳过 " + (payload.skipped || 0) + " 项。");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "批量操作失败。"); }
    finally { setBusy(false); }
  };

  const viewLabel = useMemo(() => ({ active: "全部任务", archived: "已归档", trash: "回收站", all: "全部（含归档）" }[view]), [view]);

  return <section className="awc-page">
    <PageHeader className="awc-header" eyebrow="AI WORK CENTER" title="AI 工作中心" description="集中管理市场研究、关键词研究及后续 AI 工作流任务。任务删除与外部 Actor 取消相互独立。" meta={<Button kind="tertiary" renderIcon={Renew} onClick={() => void load()} disabled={loading || busy}>刷新</Button>} />
    <div className="awc-summary" aria-label="任务状态统计">{(["queued", "running", "succeeded", "partial", "failed", "cancelled"] as ResearchTaskStatus[]).map((key) => <div className="awc-summary-card" key={key}><span>{taskStatusLabel[key]}</span><strong>{summary[key] ?? "—"}</strong></div>)}</div>
    {error && <InlineNotification kind="error" lowContrast title="操作失败" subtitle={error} onCloseButtonClick={() => setError("")} />}
    {notice && <InlineNotification kind="success" lowContrast title="操作完成" subtitle={notice} onCloseButtonClick={() => setNotice("")} />}
    <div className="awc-toolbar">
      <div className="awc-view-tabs" aria-label="任务视图">{(["active", "archived", "trash", "all"] as TaskView[]).map((key) => <Button key={key} size="sm" kind={view === key ? "primary" : "ghost"} onClick={() => setView(key)}>{{ active: "全部任务", archived: "已归档", trash: "回收站", all: "含归档" }[key]}</Button>)}</div>
      <div className="awc-filters">
        <CarbonSearch size="lg" labelText="搜索任务" placeholder="搜索任务名称" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select id="awc-type" labelText="任务类型" size="md" value={taskType} onChange={(event) => setTaskType(event.target.value)}><SelectItem value="all" text="全部类型" /><SelectItem value="google_trends" text="市场趋势" /><SelectItem value="keyword_research" text="关键词研究" /></Select>
        <Select id="awc-status" labelText="执行状态" size="md" value={status} onChange={(event) => setStatus(event.target.value)}><SelectItem value="all" text="全部状态" />{Object.entries(taskStatusLabel).map(([key, label]) => <SelectItem key={key} value={key} text={label} />)}</Select>
      </div>
    </div>
    <div className="awc-bulkbar">
      <div className="awc-selection"><Checkbox id="awc-select-page" labelText="选择本页" checked={allSelected} onChange={(_, state) => selectPage(state.checked)} /><span>{selectedCount ? "已选择 " + selectedCount + " 项" : "未选择任务"}</span></div>
      <div className="awc-actions">{view === "trash" || view === "archived" ? <Button size="sm" kind="tertiary" renderIcon={Renew} disabled={!selectedCount || busy} onClick={() => void runAction("restore")}>{view === "archived" ? "取消归档" : "恢复所选"}</Button> : <><Button size="sm" kind="ghost" renderIcon={Archive} disabled={!selectedCount || busy} onClick={() => void runAction("archive")}>批量归档</Button><Button size="sm" kind="danger--tertiary" renderIcon={TrashCan} disabled={!selectedCount || busy} onClick={() => void runAction("trash")}>移入回收站</Button></>}</div>
    </div>
    <div className="awc-table-wrap">
      {loading ? <div className="awc-loading"><InlineLoading description="正在读取任务…" /></div> : <Table size="lg" useZebraStyles><TableHead><TableRow><TableHeader>选择</TableHeader><TableHeader>任务名称</TableHeader><TableHeader>类型</TableHeader><TableHeader>状态</TableHeader><TableHeader>数据量</TableHeader><TableHeader>创建时间</TableHeader><TableHeader>结果</TableHeader></TableRow></TableHead><TableBody>
        {items.map((task) => <TableRow key={task.id}><TableCell><Checkbox id={"awc-task-" + task.id} labelText="" hideLabel checked={selected.includes(task.id)} onChange={(_, state) => toggleOne(task.id, state.checked)} /></TableCell><TableCell><button className="awc-task-link" type="button" onClick={() => navigate("/ai-work-center/" + task.id)}>{task.title || "研究任务"}<ArrowRight size={14} /></button></TableCell><TableCell>{taskTypeLabel[task.task_type] || task.task_type}</TableCell><TableCell><Tag type={statusTone[task.status]}>{taskStatusLabel[task.status] || task.status}</Tag></TableCell><TableCell>{Number(task.result_count || 0).toLocaleString()}</TableCell><TableCell>{dateLabel(task.created_at)}</TableCell><TableCell>{task.error_message ? <span className="awc-error-text" title={task.error_message}>查看错误</span> : task.completed_at ? dateLabel(task.completed_at) : "—"}</TableCell></TableRow>)}
        {!items.length && <TableRow><TableCell colSpan={7}><div className="awc-empty"><Search size={24} /><strong>没有找到任务</strong><span>调整筛选条件，或先从市场趋势、关键词研究页面创建任务。</span></div></TableCell></TableRow>}
      </TableBody></Table>}
    </div>
    <footer className="awc-pagination"><span>{viewLabel} · 共 {data?.pagination.total ?? 0} 项</span><div><Button kind="ghost" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>上一页</Button><span>第 {data?.pagination.page ?? page} / {data?.pagination.totalPages ?? 1} 页</span><Button kind="ghost" size="sm" disabled={page >= (data?.pagination.totalPages ?? 1) || loading} onClick={() => setPage((value) => value + 1)}>下一页</Button></div></footer>
    {busy && <div className="awc-busy"><InlineLoading description="正在执行批量操作…" /></div>}
  </section>;
}
