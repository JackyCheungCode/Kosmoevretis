import { useEffect, useMemo, useState } from "react";
import {
  Activity, Download, ArrowRight, ChartLine, CheckmarkFilled, ChevronDown,
  Earth, Filter, Flash, Globe, Information, Play, Search, Time, WarningAlt,
  DataTable as DataTableIcon, Code
} from "@carbon/icons-react";
import {
  Button, Checkbox, Dropdown, DropdownItem, InlineLoading, InlineNotification,
  NumberInput, Tag, TextInput, Toggle
} from "@carbon/react";
import { useAuth } from "../../app/AuthProvider";
import { requireSupabase } from "../../lib/supabase";
import "./market-trends.scss";

type OutputKey = "interestOverTime" | "interestByRegion" | "relatedQueries" | "relatedTopics";
type TaskStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
type TrendTask = {
  id: string; status: TaskStatus; result_count: number; created_at: string;
  input_snapshot: Record<string, any>; raw_items?: any[]; error_message?: string | null;
  actor_run_id?: string | null; completed_at?: string | null; actor_meta?: Record<string, any>;
};
const outputOptions: { id: OutputKey; label: string; description: string }[] = [
  { id: "interestOverTime", label: "Interest over time", description: "时间序列热度" },
  { id: "interestByRegion", label: "Interest by region", description: "国家与地区分布" },
  { id: "relatedQueries", label: "Related queries", description: "相关搜索词" },
  { id: "relatedTopics", label: "Related topics", description: "相关主题" }
];
const geoItems = [
  { id: "", text: "Worldwide" }, { id: "US", text: "United States" }, { id: "GB", text: "United Kingdom" },
  { id: "DE", text: "Germany" }, { id: "JP", text: "Japan" }, { id: "KR", text: "South Korea" },
  { id: "TW", text: "Taiwan" }, { id: "SG", text: "Singapore" }, { id: "IN", text: "India" },
  { id: "FR", text: "France" }, { id: "CA", text: "Canada" }, { id: "AU", text: "Australia" },
  { id: "BR", text: "Brazil" }, { id: "AE", text: "United Arab Emirates" }
];
const timeItems = [
  { id: "today 1-m", text: "Past 30 days" }, { id: "today 3-m", text: "Past 3 months" },
  { id: "today 12-m", text: "Past 12 months" }, { id: "today 5-y", text: "Past 5 years" }, { id: "all", text: "2004–present" }
];
const propertyItems = [
  { id: "web", text: "Web Search" }, { id: "youtube", text: "YouTube" },
  { id: "news", text: "Google News" }, { id: "images", text: "Google Images" }, { id: "froogle", text: "Google Shopping" }
];
const categories = [
  { id: "0", text: "All categories" }, { id: "3", text: "Arts & Entertainment" },
  { id: "5", text: "Business & Industrial" }, { id: "7", text: "Computers & Electronics" },
  { id: "12", text: "Finance" }, { id: "13", text: "Food & Drink" },
  { id: "18", text: "Shopping" }, { id: "22", text: "Travel" }
];
const statusLabel: Record<TaskStatus, string> = {
  queued: "Queued", running: "Running", succeeded: "Completed", partial: "Partial result", failed: "Failed"
};
function pickNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
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
  const values = row?.values;
  if (values && typeof values === "object") {
    const first = Object.values(values).map(pickNumber).find((n) => n !== null);
    return first ?? null;
  }
  return null;
}
function rowLabel(row: any): string {
  return String(row?.query || row?.title || row?.geoName || row?.region || row?.formattedTime || row?.date || row?.keyword || row?.searchTerm || "—");
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
  if (points.length < 2) return <div className="mt-chart-empty">Timeline data will appear here when the Actor returns time-series records.</div>;
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
  const columns = useMemo(() => Array.from(new Set(rows.flatMap((row) => Object.keys(row || {})))).slice(0, 12), [rows]);
  if (!rows.length) return <div className="mt-empty-inline"><Search size={22} /><span>{empty}</span></div>;
  return <div className="mt-table-scroll"><table className="mt-data-table"><thead><tr>{columns.map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>
    {rows.slice(0, 250).map((row, index) => <tr key={index}>{columns.map((key) => <td key={key}>{typeof row[key] === "object" && row[key] !== null ? JSON.stringify(row[key]) : String(row[key] ?? "—")}</td>)}</tr>)}
  </tbody></table>{rows.length > 250 && <div className="mt-table-foot">Showing first 250 rows in the table. Full dataset remains available in Raw data and JSON export.</div>}</div>;
}
export function MarketTrendsPage() {
  const { session, workspace } = useAuth();
  const [keywordsText, setKeywordsText] = useState("");
  const [geo, setGeo] = useState("");
  const [timeRange, setTimeRange] = useState("today 12-m");
  const [property, setProperty] = useState("web");
  const [category, setCategory] = useState("0");
  const [outputs, setOutputs] = useState<OutputKey[]>(["interestOverTime", "interestByRegion", "relatedQueries", "relatedTopics"]);
  const [maxItems, setMaxItems] = useState(1000);
  const [compareTerms, setCompareTerms] = useState(false);
  const [trendingMode, setTrendingMode] = useState(false);
  const [trendingGeos, setTrendingGeos] = useState("US,GB,DE,JP");
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
  const timelineRows = rawItems.filter((row) => rowKind(row) === "time");
  const regionRows = rawItems.filter((row) => rowKind(row) === "region");
  const queryRows = rawItems.filter((row) => rowKind(row) === "query");
  const topicRows = rawItems.filter((row) => rowKind(row) === "topic");
  const trendingRows = rawItems.filter((row) => rowKind(row) === "trending");
  const otherRows = rawItems.filter((row) => rowKind(row) === "other");

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
    if (!token) throw new Error("Your session has expired. Sign in again.");
    const response = await fetch("/api/market-trends?taskId=" + encodeURIComponent(taskId), { headers: { Authorization: "Bearer " + token } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to refresh task.");
    const next = payload.task as TrendTask;
    setActiveTask(next);
    setTasks((current) => [next, ...current.filter((task) => task.id !== next.id)]);
    return next;
  };
  useEffect(() => {
    if (!activeTask || !["queued", "running"].includes(activeTask.status)) return;
    let alive = true;
    const timer = window.setInterval(() => {
      void fetchTask(activeTask.id).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Task refresh failed."); });
    }, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activeTask?.id, activeTask?.status, session?.access_token]);

  const runResearch = async () => {
    if (!session?.access_token || !workspace?.id) { setError("A signed-in workspace is required."); return; }
    if (!trendingMode && !keywords.length) { setError("Enter at least one research keyword."); return; }
    if (compareTerms && keywords.length > 5) { setError("Google Trends comparison supports up to five terms in one comparison group."); return; }
    if (maxItems < 1 || maxItems > 5000) { setError("Maximum results must be between 1 and 5,000."); return; }
    if (!trendingMode && !outputs.length) { setError("Select at least one data family."); return; }
    setBusy(true); setError(""); setNotice(""); setActiveTask(null);
    try {
      const response = await fetch("/api/market-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          organizationId: workspace.id, keywords, geo, timeRange, property, category: Number(category),
          outputs, maxItems, compareTerms, mode: trendingMode ? "trendingNow" : "explore",
          trendingGeos: trendingGeos.split(/[,\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to start the Actor.");
      const task = await fetchTask(payload.taskId);
      setNotice("Research task submitted. The results will update automatically.");
      setActiveTab("overview");
      if (task.status === "succeeded" || task.status === "partial") setNotice("Research completed. " + task.result_count + " records received.");
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research request failed.");
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
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load task."); }
  };

  const downloadJson = () => exportFile("google-trends-" + (activeTask?.id || "results") + ".json", JSON.stringify(rawItems, null, 2), "application/json");
  const downloadCsv = () => {
    if (!rawItems.length) return;
    const columns = Array.from(new Set(rawItems.flatMap((row) => Object.keys(row || {}))));
    const quote = (value: any) => '"' + String(value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : value).replace(/"/g, '""') + '"';
    const csv = [columns.map(quote).join(","), ...rawItems.map((row) => columns.map((column) => quote(row[column])).join(","))].join("\r\n");
    exportFile("google-trends-" + activeTask?.id + ".csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
  };
  const summary = activeTask?.input_snapshot || {};
  const geoLabel = geoItems.find((item) => item.id === summary.geo)?.text || summary.geo || "Worldwide";

  return <div className="market-trends-page">
    <header className="mt-heading">
      <div><div className="ep-eyebrow"><i /> MARKET INTELLIGENCE / GOOGLE TRENDS</div><h1>Market Trends Intelligence</h1><p>Explore global search demand, regional interest and emerging topics with Google Trends data.</p></div>
      <div className="mt-heading-mark"><Earth size={22} /><span>GLOBAL SIGNALS</span></div>
    </header>

    {error && <InlineNotification kind="error" title="Request issue" subtitle={error} lowContrast onCloseButtonClick={() => setError("")} />}
    {notice && <InlineNotification kind="success" title="Research update" subtitle={notice} lowContrast onCloseButtonClick={() => setNotice("")} />}

    <section className="mt-workspace-grid">
      <aside className="mt-config-panel">
        <div className="mt-panel-heading"><div><span className="mt-step">01</span><div><h2>Research configuration</h2><p>Define the market signals to collect.</p></div></div><Tag type="blue">Apify Actor</Tag></div>
        <div className="mt-form-field">
          <TextInput id="mt-keywords" labelText="Research keywords" placeholder={"e.g. industrial automation\nAI agents, smart factory"} helperText="Separate keywords with commas or line breaks. Up to five can be compared together." value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} disabled={trendingMode} />
          {keywords.length > 0 && <div className="mt-keyword-tags">{keywords.map((keyword, index) => <Tag key={keyword + index} type="blue">{keyword}</Tag>)}</div>}
        </div>
        <div className="mt-form-grid">
          <div className="mt-form-field"><label>Target geography</label><Dropdown id="mt-geo" titleText="" label="Select country or region" selectedItem={geoItems.find((item) => item.id === geo) || geoItems[0]} itemToString={(item) => item?.text || ""} onChange={({ selectedItem }) => setGeo(selectedItem?.id || "")}>{geoItems.map((item) => <DropdownItem key={item.id || "world"} item={item} value={item.id} /></Dropdown>}</div>
          <div className="mt-form-field"><label>Time range</label><Dropdown id="mt-time" titleText="" label="Select time range" selectedItem={timeItems.find((item) => item.id === timeRange) || timeItems[2]} itemToString={(item) => item?.text || ""} onChange={({ selectedItem }) => setTimeRange(selectedItem?.id || "today 12-m")}>{timeItems.map((item) => <DropdownItem key={item.id} item={item} value={item.id} />)}</Dropdown></div>
          <div className="mt-form-field"><label>Search property</label><Dropdown id="mt-property" titleText="" label="Search property" selectedItem={propertyItems.find((item) => item.id === property) || propertyItems[0]} itemToString={(item) => item?.text || ""} onChange={({ selectedItem }) => setProperty(selectedItem?.id || "web")}>{propertyItems.map((item) => <DropdownItem key={item.id} item={item} value={item.id} />)}</Dropdown></div>
          <div className="mt-form-field"><label>Category</label><Dropdown id="mt-category" titleText="" label="All categories" selectedItem={categories.find((item) => item.id === category) || categories[0]} itemToString={(item) => item?.text || ""} onChange={({ selectedItem }) => setCategory(selectedItem?.id || "0")}>{categories.map((item) => <DropdownItem key={item.id} item={item} value={item.id} />)}</Dropdown></div>
        </div>

        <div className="mt-output-picker">
          <div className="mt-output-heading"><b>Data to collect</b><span>{outputs.length} selected</span></div>
          <div className="mt-output-options">{outputOptions.map((item) => <Checkbox key={item.id} id={"output-" + item.id} labelText={<span><b>{item.label}</b><small>{item.description}</small></span>} checked={outputs.includes(item.id)} onChange={(checked) => setOutputs((current) => checked ? [...current, item.id] : current.filter((value) => value !== item.id))} />)}</div>
        </div>

        <div className="mt-advanced-toggle"><button type="button" onClick={() => setAdvancedOpen(!advancedOpen)}><Filter size={16} /> Advanced settings <ChevronDown size={16} className={advancedOpen ? "is-open" : ""} /></button></div>
        {advancedOpen && <div className="mt-advanced-content">
          <Toggle id="mt-compare" labelText="Compare keywords on one scale" labelA="Off" labelB="On" toggled={compareTerms} onToggle={setCompareTerms} />
          <div className="mt-max-items"><NumberInput id="mt-max-items" label="Maximum dataset items" min={1} max={5000} value={maxItems} onChange={(_event, state) => setMaxItems(Number(state.value) || 1)} helperText="Cost control · 1–5,000 records" /></div>
          <Toggle id="mt-trending-mode" labelText="Collect Trending Now instead" labelA="Off" labelB="On" toggled={trendingMode} onToggle={setTrendingMode} />
          {trendingMode && <TextInput id="mt-trending-geos" labelText="Trending countries" value={trendingGeos} onChange={(event) => setTrendingGeos(event.target.value)} helperText="Comma-separated country codes, e.g. US,GB,DE,JP." />}
          <div className="mt-config-note"><Information size={16} /><span>Actor-specific fields are mapped by the server adapter. Your research form remains stable if the data provider changes.</span></div>
        </div>}
        <div className="mt-run-footer">
          <div><span>MAX DATASET ITEMS</span><b>{maxItems.toLocaleString()}</b></div>
          <Button kind="primary" renderIcon={Play} onClick={runResearch} disabled={busy || (!trendingMode && keywords.length === 0)}>{busy ? "Submitting…" : "Run market research"}</Button>
        </div>
        {busy && <InlineLoading description="Submitting research task to Apify…" />}
      </aside>

      <section className="mt-results-panel">
        <div className="mt-results-head"><div><span className="mt-step">02</span><div><h2>Research results</h2><p>Visual insights and the complete Actor response.</p></div></div>
          {activeTask && <Tag type={activeTask.status === "succeeded" ? "green" : activeTask.status === "failed" ? "red" : "blue"}>{statusLabel[activeTask.status]}</Tag>}
        </div>
        {!activeTask ? <div className="mt-results-empty"><div className="mt-empty-illustration"><ChartLine size={36} /></div><h3>Your market signals start here.</h3><p>Configure a research task to collect search interest, regional demand and related queries. Results will appear in this workspace.</p><div className="mt-empty-features"><span><Activity size={15} /> Time series</span><span><Globe size={15} /> Regional signals</span><span><Flash size={15} /> Rising queries</span></div></div> :
        <>
          <div className="mt-task-summary">
            <div><small>DATASET ITEMS</small><b>{activeTask.result_count.toLocaleString()}</b></div>
            <div><small>GEOGRAPHY</small><b>{geoItems.find((item) => item.id === summary.geo)?.text || summary.geo || "Worldwide"}</b></div>
            <div><small>TIME RANGE</small><b>{summary.timeRange || "—"}</b></div>
            <div><small>KEYWORDS</small><b>{(summary.keywords || []).length || "—"}</b></div>
          </div>
          {(activeTask.status === "queued" || activeTask.status === "running") && <div className="mt-running-state"><InlineLoading description="Apify Actor is running. Results refresh automatically." /><span>{activeTask.actor_run_id || "Waiting for Actor run ID"}</span></div>}
          {activeTask.error_message && <InlineNotification kind="warning" title="Actor execution notice" subtitle={activeTask.error_message} lowContrast />}
          <div className="mt-result-tabs">
            {[
              ["overview", "Overview", Activity], ["timeline", "Interest over time", ChartLine],
              ["regions", "Regions", Earth], ["queries", "Related queries", Search],
              ["topics", "Related topics", Flash], ["raw", "Raw data", Code]
            ].map(([id, label, Icon]: any) => <button type="button" key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><Icon size={15} />{label}</button>)}
          </div>
          {activeTab === "overview" && <div className="mt-result-content">
            <div className="mt-overview-cards">
              {[["Timeline", timelineRows.length], ["Regions", regionRows.length], ["Queries", queryRows.length], ["Topics", topicRows.length], ["Trending", trendingRows.length]].map(([label, count]) => <div key={String(label)}><span>{label}</span><b>{Number(count).toLocaleString()}</b></div>)}
            </div>
            <div className="mt-subsection-head"><div><h3>Search interest over time</h3><p>Google Trends normalized interest index (0–100).</p></div><Tag type="blue">Timeline</Tag></div>
            <TrendLine rows={timelineRows} />
            <div className="mt-subsection-head"><div><h3>Latest dataset records</h3><p>Raw rows returned by the Actor.</p></div><button type="button" onClick={() => setActiveTab("raw")}>View all data <ArrowRight size={14} /></button></div>
            <DataTable rows={rawItems.slice(0, 8)} empty="No dataset records have been returned yet." />
          </div>}
          {activeTab === "timeline" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>Interest over time</h3><p>{timelineRows.length} time-series records · values are relative, not absolute search volume.</p></div></div><TrendLine rows={timelineRows} /><DataTable rows={timelineRows} empty="No timeline records in this Actor response." /></div>}
          {activeTab === "regions" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>Regional interest</h3><p>{regionRows.length} regional records returned. The region granularity depends on the requested geography.</p></div></div><DataTable rows={regionRows} empty="No regional records in this Actor response." /></div>}
          {activeTab === "queries" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>Related queries</h3><p>Top and rising searches associated with the research keywords.</p></div></div><DataTable rows={queryRows} empty="No related-query records in this Actor response." /></div>}
          {activeTab === "topics" && <div className="mt-result-content"><div className="mt-subsection-head"><div><h3>Related topics</h3><p>Related entities and topics returned by Google Trends.</p></div></div><DataTable rows={topicRows} empty="No related-topic records in this Actor response." /></div>}
          {activeTab === "raw" && <div className="mt-result-content">
            <div className="mt-raw-toolbar"><div><h3>Complete Actor dataset</h3><p>{rawItems.length.toLocaleString()} records · all returned fields retained.</p></div><div><Button kind="tertiary" size="sm" renderIcon={Download} onClick={downloadCsv} disabled={!rawItems.length}>CSV</Button><Button kind="primary" size="sm" renderIcon={Download} onClick={downloadJson} disabled={!rawItems.length}>JSON</Button></div></div>
            <DataTable rows={rawItems} empty="The complete dataset will appear here after the Actor finishes." />
            <details className="mt-json-details"><summary><Code size={15} /> View full JSON payload</summary><pre>{JSON.stringify(rawItems, null, 2)}</pre></details>
          </div>}
        </>}
      </section>
    </section>

    <section className="mt-history-section">
      <div className="mt-history-heading"><div><div className="ep-section-kicker">RESEARCH HISTORY</div><h2>Recent research tasks</h2></div><Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={loadHistory}>Refresh history</Button></div>
      <div className="mt-history-list">
        {loadingHistory ? <div className="mt-history-empty"><InlineLoading description="Loading task history…" /></div> :
          tasks.map((task) => <button type="button" className={"mt-history-row" + (activeTask?.id === task.id ? " selected" : "")} key={task.id} onClick={() => void openTask(task)}>
            <span className="mt-history-icon"><Time size={17} /></span>
            <span className="mt-history-copy"><b>{(task.input_snapshot?.keywords || []).join(", ") || "Trending Now research"}</b><small>{new Date(task.created_at).toLocaleString()} · {task.result_count} records</small></span>
            <Tag type={task.status === "succeeded" ? "green" : task.status === "failed" ? "red" : "blue"}>{statusLabel[task.status]}</Tag><ArrowRight size={16} />
          </button>)}
        {!loadingHistory && !tasks.length && <div className="mt-history-empty"><DataTableIcon size={22} /><span>No research history yet.</span></div>}
      </div>
    </section>
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · MARKET TRENDS INTELLIGENCE</span><span>Source: Apify · sureFetch Google Trends Actor</span></footer>
  </div>;
}
