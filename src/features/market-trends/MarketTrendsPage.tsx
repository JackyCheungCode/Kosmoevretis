import { useEffect, useMemo, useState } from "react";
import {
  Activity, Download, ArrowRight, ChartLine, ChevronDown,
  Earth, Filter, Flash, Globe, Information, Play, Search, Time,
  DataTable as DataTableIcon, Code
} from "@carbon/icons-react";
import {
  Button, InlineLoading, InlineNotification,
  Dropdown, NumberInput, Tag, TextArea, Toggle
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
  { id: "", text: "网页搜索（默认）" }, { id: "youtube", text: "YouTube" },
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
  for (const item of items) {
    for (const field of fieldNames) {
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
    <svg viewBox="0 0 700 170" role="img" aria-label="Google Trends 搜索热度趋势图" className="mt-line-chart">
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
  const currentPage = Math.min(page, pageCount - 1);
  const columns = useMemo(() => Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))), [rows]);
  if (!rows.length) return <div className="mt-empty-inline"><Search size={22} /><span>{empty}</span></div>;
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return <div className="mt-table-scroll"><table className="mt-data-table"><thead><tr>{columns.map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>
    {visibleRows.map((row, index) => <tr key={currentPage * pageSize + index}>{columns.map((key) => <td key={key}>{typeof row[key] === "object" && row[key] !== null ? JSON.stringify(row[key]) : String(row[key] ?? "—")}</td>)}</tr>)}
  </tbody></table><div className="mt-table-foot"><span>显示第 {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, rows.length)} 条，共 {rows.length.toLocaleString()} 条记录</span><div><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</button><span>第 {currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>下一页</button></div></div></div>;
}
export function MarketTrendsPage() {
  const { session, workspace } = useAuth();
  const [keywordsText, setKeywordsText] = useState("");
  const [geo, setGeo] = useState("");
  const [timeRange, setTimeRange] = useState("today 12-m");
  const [property, setProperty] = useState("");
  const [category, setCategory] = useState("0");
  const [maxItems, setMaxItems] = useState(1000);
  const [compareTerms, setCompareTerms] = useState(false);
  const [trendingMode, setTrendingMode] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tasks, setTasks] = useState<TrendTask[]>([]);
  const [activeTask, setActiveTask] = useState<TrendTask | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actorInputText, setActorInputText] = useState("");
  const [actorInputError, setActorInputError] = useState("");

  const keywords = useMemo(() => keywordsText.split(/[\n,;]+/).map((term) => term.trim()).filter(Boolean), [keywordsText]);
  const rawItems = activeTask?.raw_items || [];
  const timelineRows = extractRows(rawItems, "time", ["interestOverTime_timelineData", "interestOverTime", "timelineData", "timeline"]);
  const regionRows = extractRows(rawItems, "region", ["interestByRegion", "interestBySubregion", "interestByCity", "regions"]);
  const queryRows = extractRows(rawItems, "query", ["relatedQueries_top", "relatedQueries_rising", "relatedQueries", "topQueries", "risingQueries"]);
  const topicRows = extractRows(rawItems, "topic", ["relatedTopics_top", "relatedTopics_rising", "relatedTopics", "topTopics", "risingTopics"]);
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
    if (!actorInputText.trim() && !trendingMode && !keywords.length) { setError("请输入至少一个研究关键词。"); return; }
    if (!actorInputText.trim() && compareTerms && (keywords.length < 2 || keywords.length > 5)) { setError("关键词对比需要输入 2 至 5 个关键词。"); return; }
    if (!actorInputText.trim() && trendingMode && !geo) { setError("收集即时趋势前，请选择具体国家或地区；该模式不支持全球范围。"); return; }
    let customActorInput: Record<string, any> | undefined;
    if (actorInputText.trim()) {
      try {
        const parsed = JSON.parse(actorInputText);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Actor 输入必须是 JSON 对象。");
        customActorInput = parsed;
      } catch (e) { setActorInputError(e instanceof Error ? e.message : "Actor JSON 格式无效。"); return; }
    }
    setActorInputError("");
    if (!actorInputText.trim() && (maxItems < 1 || maxItems > 5000)) { setError("最大数据量必须在 1 至 5,000 条之间。"); return; }
    setBusy(true); setError(""); setNotice(""); setActiveTask(null);
    try {
      const response = await fetch("/api/market-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          organizationId: workspace.id, keywords, geo, timeRange, property, category: Number(category), maxItems, compareTerms, mode: trendingMode ? "trendingNow" : "explore", ...(customActorInput ? { actorInput: customActorInput } : {})
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "无法启动 Actor。");
      const task = await fetchTask(payload.taskId);
      setNotice("研究任务已提交，结果将自动更新。");
      setActiveTab("overview");
      if (task.status === "succeeded" || task.status === "partial") setNotice("研究已完成，收到 " + task.result_count + " 条记录。");
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
          <Dropdown id="mt-geo" titleText="目标地区" label="请选择地区" items={geoItems} itemToString={(item) => item?.text || ""} selectedItem={geoItems.find((item) => item.id === geo) || geoItems[0]} onChange={({ selectedItem }) => setGeo(selectedItem?.id ?? "")} />
          <Dropdown id="mt-time" titleText="时间范围" label="请选择时间范围" items={timeItems} itemToString={(item) => item?.text || ""} selectedItem={timeItems.find((item) => item.id === timeRange) || timeItems[2]} onChange={({ selectedItem }) => selectedItem && setTimeRange(selectedItem.id)} />
          <Dropdown id="mt-property" titleText="搜索类型" label="请选择搜索类型" items={propertyItems} itemToString={(item) => item?.text || ""} selectedItem={propertyItems.find((item) => item.id === property) || propertyItems[0]} onChange={({ selectedItem }) => selectedItem && setProperty(selectedItem.id)} />
          <Dropdown id="mt-category" titleText="类别" label="请选择类别" items={categories} itemToString={(item) => item?.text || ""} selectedItem={categories.find((item) => item.id === category) || categories[0]} onChange={({ selectedItem }) => selectedItem && setCategory(selectedItem.id)} />
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
          <div className="mt-max-items"><NumberInput id="mt-max-items" label="最大数据集条数" min={1} max={5000} value={maxItems} onChange={(_event, state) => setMaxItems(Number(state.value) || 1)} helperText="成本控制 · 1–5,000 条" /></div>
          <Toggle id="mt-trending-mode" labelText="改为采集实时趋势" labelA="关闭" labelB="开启" toggled={trendingMode} onToggle={setTrendingMode} />
          {trendingMode && <div className="mt-config-note"><Information size={16} /><span>实时趋势使用所选目标地区。请指定国家/地区，不要选择全球。</span></div>}
          <div className="mt-config-note"><Information size={16} /><span>可直接填写 Actor 原始输入 JSON。参数名称与英文值将原样提交，不会被页面翻译或改写。</span></div>
          <div className="mt-actor-json">
            <TextArea id="mt-actor-input" labelText="Actor 原始输入 JSON（可选）" helperText="填写 Actor 文档要求的完整输入对象。JSON key/value 将保持原样提交；英文参数不会被页面翻译或转换。留空时使用上方表单生成默认输入。" placeholder={'{\n  "actorParameter": "value"\n}'} rows={7} value={actorInputText} onChange={(event) => { setActorInputText(event.target.value); setActorInputError(""); }} />
            {actorInputError && <InlineNotification kind="error" title="Actor JSON 格式错误" subtitle={actorInputError} lowContrast />}
          </div>
        </div>}
        <div className="mt-run-footer">
          <div><span>最大数据集条数</span><b>{maxItems.toLocaleString()}</b></div>
          <Button kind="primary" renderIcon={Play} onClick={runResearch} disabled={busy || (!actorInputText.trim() && !trendingMode && keywords.length === 0) || (!actorInputText.trim() && trendingMode && !geo)}>{busy ? "提交中…" : "开始市场研究"}</Button>
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
          {(activeTask.status === "queued" || activeTask.status === "running") && <div className="mt-running-state"><InlineLoading description="Apify Actor 正在运行，结果将自动刷新。" /><span>{activeTask.actor_run_id || "等待 Actor 运行 ID"}</span></div>}
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
            <div className="mt-subsection-head"><div><h3>最新数据集记录</h3><p>Actor 返回的原始记录。</p></div><button type="button" onClick={() => setActiveTab("raw")}>查看全部数据 <ArrowRight size={14} /></button></div>
            <DataTable rows={rawItems.slice(0, 8)} empty="暂未收到 数据集记录。" />
          </div>}
          {activeTab === "timeline" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>时间趋势</h3><p>{timelineRows.length} 条时间序列记录 · 数值为相对热度，并非绝对搜索量。</p></div></div><TrendLine rows={timelineRows} /><DataTable rows={timelineRows} empty="Actor 响应中暂无时间序列记录。" /></div>}
          {activeTab === "regions" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>地区热度</h3><p>{regionRows.length} 条地区记录。地区粒度取决于所选目标地区。</p></div></div><DataTable rows={regionRows} empty="Actor 响应中暂无地区记录。" /></div>}
          {activeTab === "queries" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>相关搜索</h3><p>与研究关键词相关的热门及上升搜索。</p></div></div><DataTable rows={queryRows} empty="Actor 响应中暂无相关搜索记录。" /></div>}
          {activeTab === "topics" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>相关主题</h3><p>Google Trends 返回的相关实体与主题。</p></div></div><DataTable rows={topicRows} empty="Actor 响应中暂无相关主题记录。" /></div>}
          {activeTab === "raw" && <div className="mt-result-content">
            <div className="mt-raw-toolbar"><div><h3>Actor 完整数据集</h3><p>{rawItems.length.toLocaleString()} 条记录 · 完整保留 Actor 返回的全部字段。</p></div><div><Button kind="tertiary" size="sm" renderIcon={Download} onClick={downloadCsv} disabled={!rawItems.length}>CSV</Button><Button kind="primary" size="sm" renderIcon={Download} onClick={downloadJson} disabled={!rawItems.length}>JSON</Button></div></div>
            <DataTable rows={rawItems} empty="Actor 执行完成后，完整数据集将在此显示。" />
            <details className="mt-json-details"><summary><Code size={15} /> 查看完整 数据集 JSON ({rawItems.length} 条记录)</summary><pre>{JSON.stringify(rawItems, null, 2)}</pre></details>
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
            <span className="mt-history-copy"><b>{(task.input_snapshot?.keywords || []).join(", ") || "即时趋势 research"}</b><small>{new Date(task.created_at).toLocaleString()} · {task.result_count} 条记录</small></span>
            <Tag type={task.status === "succeeded" ? "green" : task.status === "failed" ? "red" : "blue"}>{statusLabel[task.status]}</Tag><ArrowRight size={16} />
          </button>)}
        {!loadingHistory && !tasks.length && <div className="mt-history-empty"><DataTableIcon size={22} /><span>暂无研究历史记录。</span></div>}
      </div>
    </section>
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · 市场趋势情报</span><span>数据来源：Apify · sureFetch Google Trends Actor</span></footer>
  </div>;
}
