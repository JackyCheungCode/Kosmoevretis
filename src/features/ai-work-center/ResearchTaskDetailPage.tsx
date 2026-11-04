import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, Renew } from "@carbon/icons-react";
import { Button, InlineLoading, InlineNotification, Tag } from "@carbon/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { taskStatusLabel, taskTypeLabel } from "./types";
import type { ResearchTask, ResearchTaskExecution } from "./types";
import "./ai-work-center.scss";

type DetailResponse = { task: ResearchTask; executions: ResearchTaskExecution[] };
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";
const statusTone: Record<string, "blue" | "green" | "red" | "warm-gray" | "purple"> = { queued: "blue", running: "blue", succeeded: "green", partial: "purple", failed: "red", cancelled: "warm-gray" };
function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}
function toCsv(rows: any[]) {
  if (!rows.length) return "";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const cell = (value: any) => '"' + String(value == null ? "" : typeof value === "object" ? JSON.stringify(value) : value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [columns, ...rows.map((row) => columns.map((key) => row?.[key]))].map((line) => line.map(cell).join(",")).join("\r\n");
}
export function ResearchTaskDetailPage() {
  const { taskId = "" } = useParams();
  const navigate = useNavigate();
  const { session, workspace } = useAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retrying, setRetrying] = useState(false);
  const task = data?.task;

  const load = useCallback(async (silent = false) => {
    if (!session?.access_token || !workspace?.id || !taskId) return;
    if (!silent) setLoading(true); setError("");
    const params = new URLSearchParams({ organizationId: workspace.id, taskId });
    try {
      const response = await fetch("/api/research-tasks?" + params.toString(), { headers: { Authorization: "Bearer " + session.access_token } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "无法读取任务详情。");
      setData(payload as DetailResponse);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "无法读取任务详情。"); }
    finally { if (!silent) setLoading(false); }
  }, [session?.access_token, workspace?.id, taskId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!task || !["queued", "running"].includes(task.status)) return;
    const timer = window.setInterval(() => { void load(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [task?.id, task?.status, load]);

  const executions = data?.executions || [];
  const rawItems = Array.isArray(task?.raw_items) ? task.raw_items : [];
  const previewRows = rawItems.slice(0, 20);
  const previewColumns = [...new Set(previewRows.flatMap((row) => Object.keys(row || {})))].slice(0, 8);

  if (loading) return <div className="awc-loading"><InlineLoading description="正在读取任务详情…" /></div>;
  if (error || !task) return <section className="awc-detail"><Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate("/ai-work-center")}>返回任务中心</Button><div style={{ marginTop: 20 }}><InlineNotification kind="error" title="无法打开任务" subtitle={error || "任务不存在或无权访问。"} /></div></section>;

  const retry = async () => {
    if (!session?.access_token || !workspace?.id || !task) return;
    if (!window.confirm("基于当前任务的原始输入重新执行？本次将创建新的执行记录，不覆盖历史结果。")) return;
    setRetrying(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/research-tasks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ taskId: task.id, organizationId: workspace.id })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "重试失败。");
      setNotice("已创建第 " + payload.attempt + " 次执行，Actor 正在启动。");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "重试失败。"); }
    finally { setRetrying(false); }
  };
  const exportJson = () => download("kosmoevretis-task-" + task.id + ".json", JSON.stringify({ task, executions }, null, 2), "application/json;charset=utf-8");
  const exportCsv = () => download("kosmoevretis-task-" + task.id + "-results.csv", toCsv(rawItems), "text/csv;charset=utf-8");

  return <section className="awc-detail">
    <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={() => navigate("/ai-work-center")}>返回任务中心</Button>
    {error && <InlineNotification kind="error" lowContrast title="操作失败" subtitle={error} onCloseButtonClick={() => setError("")} />}\n    {notice && <InlineNotification kind="success" lowContrast title="任务已重新提交" subtitle={notice} onCloseButtonClick={() => setNotice("")} />}\n    <header className="awc-detail-header">
      <div><div className="awc-eyebrow">RESEARCH TASK DETAIL</div><h1>{task.title || "研究任务"}</h1><p>{taskTypeLabel[task.task_type] || task.task_type} · 创建于 {dateLabel(task.created_at)} · ID {task.id}</p></div>
      <div className="awc-detail-actions"><Button kind="tertiary" size="sm" renderIcon={Renew} onClick={() => void load()}>刷新状态</Button>{!["queued", "running"].includes(task.status) && <Button kind="tertiary" size="sm" renderIcon={Renew} disabled={retrying} onClick={() => void retry()}>{retrying ? "正在重试" : "重新执行"}</Button>}<Button kind="tertiary" size="sm" renderIcon={Download} onClick={exportJson}>导出 JSON</Button><Button kind="tertiary" size="sm" renderIcon={Download} disabled={!rawItems.length} onClick={exportCsv}>导出 CSV</Button></div>
    </header>

    <div className="awc-detail-grid">
      <div className="awc-detail-metric"><span>执行状态</span><strong><Tag type={statusTone[task.status] || "warm-gray"}>{taskStatusLabel[task.status] || task.status}</Tag></strong></div>
      <div className="awc-detail-metric"><span>数据记录数</span><strong>{Number(task.result_count || 0).toLocaleString()}</strong></div>
      <div className="awc-detail-metric"><span>Actor</span><strong>{task.actor_id}</strong></div>
      <div className="awc-detail-metric"><span>执行次数</span><strong>{executions.length}</strong></div>
      <div className="awc-detail-metric"><span>开始时间</span><strong>{dateLabel(task.started_at)}</strong></div>
      <div className="awc-detail-metric"><span>完成时间</span><strong>{dateLabel(task.completed_at)}</strong></div>
      <div className="awc-detail-metric"><span>Apify Run ID</span><strong>{task.actor_run_id || "尚未创建"}</strong></div>
      <div className="awc-detail-metric"><span>Dataset ID</span><strong>{task.dataset_id || "尚未生成"}</strong></div>
    </div>

    {task.error_message && <InlineNotification kind={task.status === "partial" ? "warning" : "error"} lowContrast title="执行信息" subtitle={task.error_message} />}

    <section className="awc-detail-section">
      <h2>执行历史</h2>
      {executions.length ? <div className="awc-execution-list">{executions.map((execution) => <div className="awc-execution-row" key={execution.id}>
        <div><strong>第 {execution.attempt_number} 次</strong><small>{dateLabel(execution.created_at)}</small></div>
        <div><Tag type={statusTone[execution.status] || "warm-gray"}>{taskStatusLabel[execution.status] || execution.status}</Tag></div>
        <div><strong>{execution.actor_run_id || "尚未生成 Run ID"}</strong><small>{execution.result_count.toLocaleString()} 条数据 · {execution.actor_id}</small>{execution.error_message && <small className="awc-error-text">{execution.error_message}</small>}</div>
        <div><small>开始</small>{dateLabel(execution.started_at)}<small>结束</small>{dateLabel(execution.completed_at)}</div>
      </div>)}</div> : <div className="awc-detail-empty">暂无执行记录。</div>}
    </section>

    <section className="awc-detail-section">
      <h2>研究结果</h2>
      {rawItems.length ? <>
        <p>共 {rawItems.length.toLocaleString()} 条原始记录。下方展示前 20 条预览；完整数据可通过 JSON 或 CSV 导出。</p>
        <div className="awc-result-preview"><table><thead><tr>{previewColumns.map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{previewRows.map((row, index) => <tr key={index}>{previewColumns.map((key) => <td key={key}>{typeof row?.[key] === "object" && row?.[key] !== null ? JSON.stringify(row[key]) : String(row?.[key] ?? "—")}</td>)}</tr>)}</tbody></table></div>
      </> : <div className="awc-detail-empty">当前任务没有可展示的 Dataset 记录。请检查执行状态和 Actor 返回信息。</div>}
      <details className="awc-code-panel"><summary>查看完整原始数据 JSON（{rawItems.length.toLocaleString()} 条）</summary><pre>{JSON.stringify(rawItems, null, 2)}</pre></details>
      <details className="awc-code-panel"><summary>查看原始输入参数</summary><pre>{JSON.stringify(task.input_snapshot, null, 2)}</pre></details>
      <details className="awc-code-panel"><summary>查看 Actor 执行元数据</summary><pre>{JSON.stringify(task.actor_meta, null, 2)}</pre></details>
      {Array.isArray(task.kv_records) && task.kv_records.length > 0 && <details className="awc-code-panel"><summary>查看 Key-Value Store 数据（{task.kv_records.length} 项）</summary><pre>{JSON.stringify(task.kv_records, null, 2)}</pre></details>}
    </section>
  </section>;
}
