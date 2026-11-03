import { useEffect, useMemo, useState } from "react";
import {
  Activity, Download, ArrowRight, ChartLine, ChevronDown,
  Earth, Filter, Flash, Globe, Information, Play, Search, Time,
  DataTable as DataTableIcon, Code
} from "@carbon/icons-react";
import {
  Button, InlineLoading, InlineNotification,
  NumberInput, Select, SelectItem, Tag, TextArea, Toggle
} from "@carbon/react";
import { useAuth } from "../../app/AuthProvider";
import { requireSupabase } from "../../lib/supabase";
import "./market-trends.scss";

type TaskStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
type TrendTask = {
  id: string; status: TaskStatus; result_count: number; created_at: string;
  input_snapshot: Record<string, any>; raw_items?: any[]; error_message?: string | null;
  actor_run_id?: string | null; completed_at?: string | null; actor_meta?: Record<string, any>; kv_records?: any[]; key_value_store_id?: string | null;
};
const geoItems = [
  { id: "", text: "全球" }, { id: "US", text: "美国" }, { id: "GB", text: "英国" },
  { id: "DE", text: "德国" }, { id: "JP", text: "日本" }, { id: "KR", text: "韩国" },
  { id: "TW", text: "台湾" }, { id: "SG", text: "新加坡" }, { id: "IN", text: "印度" },
  { id: "FR", text: "法国" }, { id: "CA", text: "加拿大" }, { id: "AU", text: "澳大利亚" },
  { id: "BR", text: "巴西" }, { id: "AE", text: "阿联酋" }
];
const timeItems = [
  { id: "today 1-m", text: "过去 30 天" }, { id: "today 3-m", text: "过去 3 个月" },
  { id: "today 12-m", text: "过去 12 个月" }, { id: "today 5-y", text: "过去 5 年" }, { id: "all", text: "2004 年至今" }
];
const propertyItems = [
  { id: "web", text: "网页搜索" }, { id: "youtube", text: "YouTube" },
  { id: "news", text: "Google 新闻" }, { id: "images", text: "Google 图片" }, { id: "froogle", text: "Google 购物" }
];
const categories = [
  { id: "0", text: "所有类别" }, { id: "3", text: "艺术与娱乐" },
  { id: "5", text: "商业与工业" }, { id: "7", text: "计算机与电子产品" },
  { id: "12", text: "金融" }, { id: "13", text: "食品与饮料" },
  { id: "18", text: "购物" }, { id: "22", text: "旅游" }
];
const statusLabel: Record<TaskStatus, string> = {
  queued: "排队中", running: "运行中", succeeded: "已完成", partial: "部分完成", failed: "失败"
};
function pickNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length) return pickNumber(value[0]);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace(/%/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function rowKind(row: any): string {
  const value = String(row?.type || row?.dataType || row?.rowType || row?.kind || row?.recordType || "").toLowerCase();
  if (value.includes("time") || value.includes("timeline")) return "time";
  if (value.includes("region") || value.includes("geo")) return "region";
  if (value.includes("quer")) return "query";
  if (value.includes("topic")) return "topic";
  if (value.includes("trend")) return "trending";
  return "other";
}
function rowValue(row: any): number | null {
  const direct = pickNumber(row?.value ?? row?.interest ?? row?.score ?? row?.searchInterest);
  if (direct !== null) return direct;
  const fallback = Object.entries(row || {}).filter(([key]) => !["date", "time", "formattedTime", "geoName", "region", "query", "title", "type"].includes(key)).map(([, value]) => pickNumber(value)).find((value) => value !== null);
  if (fallback !== undefined) return fallback;
  const values = row?.values;
  if (values && typeof values === "object") {
    const first = Object.values(values).map(pickNumber).find((n) => n !== null);
    return first ?? null;
  }
  return null;
}
function extractRows(items: any[], kind: string, fieldNames: string[]): any[] {
  const direct = items.filter((row) => rowKind(row) === kind);
  if (direct.length) return direct;
  const extracted: any[] = [];
  for (const item 条，共 items) {
    for (const field 条，共 fieldNames) {
      const value = item?.[field];
      const add = (entry: any, variant?: string) => {
        if (entry && typeof entry === "object") extracted.push({ ...entry, type: kind, sourceSearchTerm: item.searchTerm || item.keyword || item.searchTerms || "", ...(variant ? { variant } : {}) });
      };
      if (Array.isArray(value)) value.forEach((entry) => add(entry));
      else if (value && typeof value === "object") {
        if (Array.isArray(value.top)) value.top.forEach((entry: any) => add(entry, "top"));
        if (Array.isArray(value.rising)) value.rising.forEach((entry: any) => add(entry, "rising"));
        if (!Array.isArray(value.top) && !Array.isArray(value.rising)) add(value);
      }
    }
  }
  return extracted;
}
function exportFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}
function TrendLine({ rows }: { rows: any[] }) {
  const points = rows.map((row) => rowValue(row)).filter((value): value is number => value !== null);
  if (points.length < 2) return <div className="mt-chart-empty">Actor 返回时间序列数据后，将在此显示趋势图。</div>;
  const max = Math.max(100, ...points);
  const coords = points.map((value, index) => {
    const x = 12 + (index / (points.length - 1)) * 676;
    const y = 154 - (value / max) * 132;
    return x + "," + y;
  }).join(" ");
  return <div className="mt-chart-wrap">
    <div className="mt-chart-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
    <svg viewBox="0 0 700 170" role="img" aria-label="Google Trends interest over time chart" className="mt-line-chart">
      {[22, 55, 88, 121, 154].map((y) => <line key={y} x1="12" y1={y} x2="688" y2={y} className="mt-grid-line" />)}
      <polyline points={coords} className="mt-line" />
      {points.map((value, index) => {
        const x = 12 + (index / (points.length - 1)) * 676;
        const y = 154 - (value / max) * 132;
        return <circle key={index} cx={x} cy={y} r="3" className="mt-point"><title>{value}</title></circle>;
      })}
    </svg>
  </div>;
}
function DataTable({ rows, empty }: { rows: any[]; empty: string }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current第 = Math.min(page, pageCount - 1);
  const columns = useMemo(() => Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))), [rows]);
  if (!rows.length) return <div className="mt-empty-inline"><Search size={22} /><span>{empty}</span></div>;
  const visibleRows = rows.slice(current第 * pageSize, (current第 + 1) * pageSize);
  return <div className="mt-table-scroll"><table className="mt-data-table"><thead><tr>{columns.map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>
    {visibleRows.map((row, index) => <tr key={current第 * pageSize + index}>{columns.map((key) => <td key={key}>{typeof row[key] === "object" && row[key] !== null ? JSON.stringify(row[key]) : String(row[key] ?? "—")}</td>)}</tr>)}
  </tbody></table><div className="mt-table-foot"><span>显示第 {current第 * pageSize + 1}–{Math.min((current第 + 1) * pageSize, rows.length)} 条，共 {rows.length.toLocaleString()} 条记录</span><div><button type="button" disabled={current第 === 0} onClick={() => setPage(current第 - 1)}>上一页</button><span>第 {current第 + 1} / {pageCount}</span><button type="button" disabled={current第 >= pageCount - 1} onClick={() => setPage(current第 + 1)}>下一页</button></div></div></div>;
}
export function MarketTrendsPage() {
  const { session, workspace } = useAuth();
  const [keywordsText, setKeywordsText] = useState("");
  const [geo, setGeo] = useState("");
  const [timeRange, setTimeRange] = useState("today 12-m");
  const [property, setProperty] = useState("web");
  const [category, set类别] = useState("0");
  const [maxItems, setMaxItems] = useState(1000);
  const [compareTerms, setCompareTerms] = useState(false);
  const [trendingMode, set实时趋势Mode] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tasks, setTasks] = useState<TrendTask[]>([]);
  const [activeTask, setActiveTask] = useState<TrendTask | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const keywords = useMemo(() => keywordsText.split(/[\n,;]+/).map((term) => term.trim()).filter(Boolean), [keywordsText]);
  const rawItems = activeTask?.raw_items || [];
  const timelineRows = extractRows(rawItems, "time", ["interestOverTime_timelineData", "interestOverTime", "timelineData", "timeline"]);
  const regionRows = extractRows(rawItems, "region", ["interestByRegion", "interestBySubregion", "interestByCity", "regions"]);
  const queryRows = extractRows(rawItems, "query", ["related相关搜索_top", "related相关搜索_rising", "related相关搜索", "top相关搜索", "rising相关搜索"]);
  const topicRows = extractRows(rawItems, "topic", ["related相关主题_top", "related相关主题_rising", "related相关主题", "top相关主题", "rising相关主题"]);
  const trendingRows = extractRows(rawItems, "trending", ["trendingSearches", "trendingNow", "trending"]);

  const loadHistory = async () => {
    if (!workspace?.id) return;
    setLoadingHistory(true);
    const { data, error: queryError } = await requireSupabase().from("market_trend_tasks")
      .select("id,status,result_count,created_at,input_snapshot,error_message,actor_run_id,completed_at")
      .eq("organization_id", workspace.id).order("created_at", { ascending: false }).limit(20);
    if (queryError) setError(queryError.message);
    else setTasks((data || []) as TrendTask[]);
    setLoadingHistory(false);
  };
  useEffect(() => { void loadHistory(); }, [workspace?.id]);

  const fetchTask = async (taskId: string) => {
    const token = session?.access_token;
    if (!token) throw new Error("登录状态已过期，请重新登录。");
    const response = await fetch("/api/market-trends?taskId=" + encodeURIComponent(taskId), { headers: { Authorization: "Bearer " + token } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "无法刷新任务。");
    const next = payload.task as TrendTask;
    setActiveTask(next);
    setTasks((current) => [next, ...current.filter((task) => task.id !== next.id)]);
    return next;
  };
  useEffect(() => {
    if (!activeTask || !["queued", "running"].includes(activeTask.status)) return;
    let alive = true;
    const timer = window.setInterval(() => {
      void fetchTask(activeTask.id).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "任务刷新失败。"); });
    }, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activeTask?.id, activeTask?.status, session?.access_token]);

  const runResearch = async () => {
    if (!session?.access_token || !workspace?.id) { setError("请先登录并选择工作空间。"); return; }
    if (!trendingMode && !keywords.length) { setError("请输入至少一个研究关键词。"); return; }
    if (compareTerms && (keywords.length < 2 || keywords.length > 5)) { setError("关键词对比需要输入 2 至 5 个关键词。"); return; }
    if (trendingMode && !geo) { setError("Choose a country before collecting 实时趋势 Now. 全球 is not supported for country-level trending searches."); return; }
    if (maxItems < 1 || maxItems > 5000) { setError("最大数据量必须在 1 至 5,000 条之间。"); return; }
    setBusy(true); setError(""); setNotice(""); setActiveTask(null);
    try {
      const response = await fetch("/api/market-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          organizationId: workspace.id, keywords, geo, timeRange, property, category: Number(category), maxItems, compareTerms, mode: trendingMode ? "trendingNow" : "explore"
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "无法启动 Actor。");
      const task = await fetchTask(payload.taskId);
      setNotice("研究任务已提交，结果将自动更新。");
      setActiveTab("overview");
      if (task.status === "succeeded" || task.status === "partial") setNotice("研究已完成，收到 " + task.result_count + " 条记录 received.");
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "研究请求失败。");
    } finally { setBusy(false); }
  };

  const openTask = async (task: TrendTask) => {
    setError("");
    try {
      if (task.status === "queued" || task.status === "running") {
        await fetchTask(task.id);
      } else {
        const { data, error: readError } = await requireSupabase().from("market_trend_tasks").select("*").eq("id", task.id).single();
        if (readError) throw readError;
        setActiveTask(data as TrendTask);
      }
      setActiveTab("overview");
    } catch (e) { setError(e instanceof Error ? e.message : "无法加载任务。"); }
  };

  const downloadJson = () => exportFile("google-trends-" + (activeTask?.id || "results") + ".json", JSON.stringify({ dataset: rawItems, keyValueStore: activeTask?.kv_records || [], actorRun: activeTask?.actor_meta || {} }, null, 2), "application/json");
  const downloadCsv = () => {
    if (!rawItems.length) return;
    const columns = Array.from(new Set(rawItems.flatMap((row) => Object.keys(row || {}))));
    const quote = (value: any) => '"' + String(value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : value).replace(/"/g, '""') + '"';
    const csv = [columns.map(quote).join(","), ...rawItems.map((row) => columns.map((column) => quote(row[column])).join(","))].join("\r\n");
    exportFile("google-trends-" + activeTask?.id + ".csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
  };
  const summary = activeTask?.input_snapshot || {};

  return <div className="market-trends-page">
    <header className="mt-heading">
      <div><div className="ep-eyebrow"><i /> 市场情报 / GOOGLE TRENDS</div><h1>市场趋势情报</h1><p>通过 Google Trends 数据探索全球搜索需求、地区热度与新兴主题。</p></div>
      <div className="mt-heading-mark"><Earth size={22} /><span>全球趋势信号</span></div>
    </header>

    {error && <InlineNotification kind="error" title="请求异常" subtitle={error} lowContrast onCloseButtonClick={() => setError("")} />}
    {notice && <InlineNotification kind="success" title="研究状态" subtitle={notice} lowContrast onCloseButtonClick={() => setNotice("")} />}

    <section className="mt-workspace-grid">
      <aside className="mt-config-panel">
        <div className="mt-panel-heading"><div><span className="mt-step">01</span><div><h2>研究配置</h2><p>定义需要采集的市场信号。</p></div></div><Tag type="blue">Apify 数据采集器</Tag></div>
        <div className="mt-form-field">
          <TextArea id="mt-keywords" labelText="研究关键词" placeholder={"例如：industrial automation\nAI agents, smart factory"} helperText="多个关键词请用逗号或换行分隔；最多可同时对比 5 个关键词。" rows={3} value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} disabled={trendingMode} />
          {keywords.length > 0 && <div className="mt-keyword-tags">{keywords.map((keyword, index) => <Tag key={keyword + index} type="blue">{keyword}</Tag>)}</div>}
        </div>
        <div className="mt-form-grid">
          <Select id="mt-geo" labelText="目标地区" value={geo} onChange={(event) => setGeo(event.target.value)}>
            {geoItems.map((item) => <SelectItem key={item.id || "world"} value={item.id} text={item.text} />)}
          </Select>
          <Select id="mt-time" labelText="时间范围" value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
            {timeItems.map((item) => <SelectItem key={item.id} value={item.id} text={item.text} />)}
          </Select>
          <Select id="mt-property" labelText="搜索类型" value={property} onChange={(event) => setProperty(event.target.value)}>
            {propertyItems.map((item) => <SelectItem key={item.id} value={item.id} text={item.text} />)}
          </Select>
          <Select id="mt-category" labelText="类别" value={category} onChange={(event) => set类别(event.target.value)}>
            {categories.map((item) => <SelectItem key={item.id} value={item.id} text={item.text} />)}
          </Select>
        </div>

        <div className="mt-output-picker">
          <div className="mt-output-heading"><b>完整 Actor 返回数据</b><Tag type="green">保留全部数据</Tag></div>
          <div className="mt-output-options mt-output-static">
            <span><b>时间趋势</b><small>历史搜索热度</small></span>
            <span><b>地区热度</b><small>地理分布</small></span>
            <span><b>相关搜索</b><small>热门与上升搜索</small></span>
            <span><b>相关主题</b><small>热门与上升主题</small></span>
            <span><b>实时趋势搜索</b><small>各国家/地区实时搜索</small></span>
          </div>
        </div>

        <div className="mt-advanced-toggle"><button type="button" onClick={() => setAdvancedOpen(!advancedOpen)}><Filter size={16} /> 高级设置 <ChevronDown size={16} className={advancedOpen ? "is-open" : ""} /></button></div>
        {advancedOpen && <div className="mt-advanced-content">
          <Toggle id="mt-compare" labelText="在同一尺度对比关键词" labelA="关闭" labelB="开启" toggled={compareTerms} onToggle={setCompareTerms} />
          <div className="mt-max-items"><NumberInput id="mt-max-items" label="最大数据集条数" min={1} max={5000} value={maxItems} onChange={(_event, state) => setMaxItems(Number(state.value) || 1)} helperText="Cost control · 1–5,000 条记录" /></div>
          <Toggle id="mt-trending-mode" labelText="改为采集实时趋势" labelA="关闭" labelB="开启" toggled={trendingMode} onToggle={set实时趋势Mode} />
          {trendingMode && <div className="mt-config-note"><Information size={16} /><span>实时趋势 Now uses the selected 目标地区. Choose a country instead 条，共 全球.</span></div>}
          <div className="mt-config-note"><Information size={16} /><span>Actor 专属字段由服务端适配器映射。即使更换数据提供方，研究表单也保持稳定。</span></div>
        </div>}
        <div className="mt-run-footer">
          <div><span>最大数据集条数</span><b>{maxItems.toLocaleString()}</b></div>
          <Button kind="primary" renderIcon={Play} onClick={runResearch} disabled={busy || (!trendingMode && keywords.length === 0) || (trendingMode && !geo)}>{busy ? "提交中…" : "开始市场研究"}</Button>
        </div>
        {busy && <InlineLoading description="正在向 Apify 提交研究任务…" />}
      </aside>

      <section className="mt-results-panel">
        <div className="mt-results-head"><div><span className="mt-step">02</span><div><h2>研究结果</h2><p>可视化洞察与 Actor 完整返回数据。</p></div></div>
          {activeTask && <Tag type={activeTask.status === "succeeded" ? "green" : activeTask.status === "failed" ? "red" : "blue"}>{statusLabel[activeTask.status]}</Tag>}
        </div>
        {!activeTask ? <div className="mt-results-empty"><div className="mt-empty-illustration"><ChartLine size={36} /></div><h3>从这里开始发现市场信号。</h3><p>配置研究任务以采集搜索热度、地区需求和相关搜索。结果将在此工作区显示。</p><div className="mt-empty-features"><span><Activity size={15} /> 时间序列</span><span><Globe size={15} /> 地区信号</span><span><Flash size={15} /> 上升搜索</span></div></div> :
        <>
          <div className="mt-task-summary">
            <div><small>数据集条数</small><b>{activeTask.result_count.toLocaleString()}</b></div>
            <div><small>地区</small><b>{geoItems.find((item) => item.id === summary.geo)?.text || summary.geo || "全球"}</b></div>
            <div><small>时间范围</small><b>{summary.timeRange || "—"}</b></div>
            <div><small>关键词</small><b>{(summary.keywords || []).length || "—"}</b></div>
            <div><small>键值存储输出</small><b>{(activeTask.kv_records || []).length}</b></div>
            <div><small>Actor 用量</small><b>{activeTask.actor_meta?.usageTotalUsd == null ? "—" : "$" + Number(activeTask.actor_meta.usageTotalUsd).toFixed(4)}</b></div>
          </div>
          {(activeTask.status === "queued" || activeTask.status === "running") && <div className="mt-running-state"><InlineLoading description="Apify 数据采集器 is running. Results refresh automatically." /><span>{activeTask.actor_run_id || "等待 Actor 运行 ID"}</span></div>}
          {activeTask.error_message && <InlineNotification kind="warning" title="Actor 执行提示" subtitle={activeTask.error_message} lowContrast />}
          <div className="mt-result-tabs">
            {[
              ["overview", "概览", Activity], ["timeline", "时间趋势", ChartLine],
              ["regions", "地区", Earth], ["queries", "相关搜索", Search],
              ["topics", "相关主题", Flash], ["raw", "原始数据", Code]
            ].map(([id, label, Icon]: any) => <button type="button" key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><Icon size={15} />{label}</button>)}
          </div>
          {activeTab === "overview" && <div className="mt-result-content">
            <div className="mt-overview-cards">
              {[["时间趋势", timelineRows.length], ["地区", regionRows.length], ["相关搜索", queryRows.length], ["相关主题", topicRows.length], ["实时趋势", trendingRows.length]].map(([label, count]) => <div key={String(label)}><span>{label}</span><b>{Number(count).toLocaleString()}</b></div>)}
            </div>
            <div className="mt-subsection-head"><div><h3>搜索热度变化趋势</h3><p>Google Trends 标准化热度指数（0–100）。</p></div><Tag type="blue">时间趋势</Tag></div>
            <TrendLine rows={timelineRows} />
            <div className="mt-subsection-head"><div><h3>Latest dataset 条记录</h3><p>Actor 返回的原始记录。</p></div><button type="button" onClick={() => setActiveTab("raw")}>查看全部数据 <ArrowRight size={14} /></button></div>
            <DataTable rows={rawItems.slice(0, 8)} empty="No dataset 条记录 have been returned yet." />
          </div>}
          {activeTab === "timeline" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>时间趋势</h3><p>{timelineRows.length} time-series 条记录 · values are relative, not absolute search volume.</p></div></div><TrendLine rows={timelineRows} /><DataTable rows={timelineRows} empty="No timeline 条记录 in this Actor response." /></div>}
          {activeTab === "regions" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>Regional interest</h3><p>{regionRows.length} regional 条记录 returned. The region granularity depends on the requested geography.</p></div></div><DataTable rows={regionRows} empty="No regional 条记录 in this Actor response." /></div>}
          {activeTab === "queries" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>相关搜索</h3><p>热门与上升搜索 associated with the research keywords.</p></div></div><DataTable rows={queryRows} empty="No related-query 条记录 in this Actor response." /></div>}
          {activeTab === "topics" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>相关主题</h3><p>Google Trends 返回的相关实体与主题。</p></div></div><DataTable rows={topicRows} empty="No related-topic 条记录 in this Actor response." /></div>}
          {activeTab === "raw" && <div className="mt-result-content">
            <div className="mt-raw-toolbar"><div><h3>Actor 完整数据集</h3><p>{rawItems.length.toLocaleString()} 条记录 · all returned fields retained.</p></div><div><Button kind="tertiary" size="sm" renderIcon={Download} onClick={downloadCsv} disabled={!rawItems.length}>CSV</Button><Button kind="primary" size="sm" renderIcon={Download} onClick={downloadJson} disabled={!rawItems.length}>JSON</Button></div></div>
            <DataTable rows={rawItems} empty="Actor 执行完成后，完整数据集将在此显示。" />
            <details className="mt-json-details"><summary><Code size={15} /> 查看完整 Dataset JSON ({rawItems.length} 条记录)</summary><pre>{JSON.stringify(rawItems, null, 2)}</pre></details>
            <details className="mt-json-details"><summary><Code size={15} /> 查看 Key-Value Store 输出 ({(activeTask.kv_records || []).length} 条记录)</summary><pre>{JSON.stringify(activeTask.kv_records || [], null, 2)}</pre></details>
            <details className="mt-json-details"><summary><Information size={15} /> 查看完整 Actor 运行元数据</summary><pre>{JSON.stringify(activeTask.actor_meta || {}, null, 2)}</pre></details>
          </div>}
        </>}
      </section>
    </section>

    <section className="mt-history-section">
      <div className="mt-history-heading"><div><div className="ep-section-kicker">研究历史</div><h2>最近的研究任务</h2></div><Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={loadHistory}>刷新历史</Button></div>
      <div className="mt-history-list">
        {loadingHistory ? <div className="mt-history-empty"><InlineLoading description="正在加载任务历史…" /></div> :
          tasks.map((task) => <button type="button" className={"mt-history-row" + (activeTask?.id === task.id ? " selected" : "")} key={task.id} onClick={() => void openTask(task)}>
            <span className="mt-history-icon"><Time size={17} /></span>
            <span className="mt-history-copy"><b>{(task.input_snapshot?.keywords || []).join(", ") || "实时趋势 Now research"}</b><small>{new Date(task.created_at).toLocaleString()} · {task.result_count} 条记录</small></span>
            <Tag type={task.status === "succeeded" ? "green" : task.status === "failed" ? "red" : "blue"}>{statusLabel[task.status]}</Tag><ArrowRight size={16} />
          </button>)}
        {!loadingHistory && !tasks.length && <div className="mt-history-empty"><DataTableIcon size={22} /><span>暂无研究历史记录。</span></div>}
      </div>
    </section>
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · 市场趋势情报</span><span>数据来源：Apify · sureFetch Google Trends Actor</span></footer>
  </div>;
}
