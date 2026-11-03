import { useEffect, useState } from "react";
import { ArrowRight, ChartLine, Locked } from "@carbon/icons-react";
import { useAuth } from "../../app/AuthProvider";
import { requireSupabase } from "../../lib/supabase";

type View = "overview" | "dimensions" | "history";
type AnalysisRun = {
  id: string;
  profile_id: string | null;
  status: string;
  provider_id: string | null;
  model_id: string | null;
  input_snapshot: Record<string, any>;
  result: { dimensions?: Array<{ id: string; title: string; status: string; provider_id?: string; model_id?: string; output?: string; error?: string }>; summary?: string } | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

const dimensions = [
  { id: "foundation", name: "企业基础认知", detail: "企业定位、发展阶段、核心业务与关键背景" },
  { id: "business-model", name: "商业模式分析", detail: "价值创造、收入来源、成本结构与盈利逻辑" },
  { id: "product", name: "产品与服务能力", detail: "产品组合、服务交付、差异化能力与价值主张" },
  { id: "market", name: "市场环境分析", detail: "行业趋势、市场规模、区域环境与外部驱动因素" },
  { id: "customer", name: "客户与需求分析", detail: "客户细分、购买动机、痛点需求与客户价值" },
  { id: "competitor", name: "竞争格局分析", detail: "竞争者、替代方案、市场定位与竞争优势" },
  { id: "organization", name: "组织与人才分析", detail: "组织架构、关键岗位、人才能力与治理机制" },
  { id: "operations", name: "运营与资源分析", detail: "运营流程、供应链、技术设施与资源配置效率" },
  { id: "finance", name: "财务与经营健康度", detail: "收入成本、现金流、盈利能力与经营韧性" },
  { id: "risk", name: "风险分析", detail: "战略、市场、运营、财务、合规及外部依赖风险" },
  { id: "swot", name: "SWOT 与战略分析", detail: "优势、劣势、机会、威胁及战略匹配" },
  { id: "planning", name: "发展目标与规划分析", detail: "阶段目标、战略路径、关键举措与资源需求" },
];

const statusText = (status?: string) => status === "succeeded" ? "已完成" : status === "partial" ? "部分完成" : status === "failed" ? "失败" : status === "running" ? "执行中" : status === "queued" ? "排队中" : status || "待分析";

export function AnalysisResultsPage({ companyName, onConfigureAnalysis }: { companyName: string; onConfigureAnalysis: () => void }) {
  const { workspace } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!workspace?.id) return;
    let active = true;
    setLoading(true);
    void requireSupabase().from("ai_analysis_runs").select("*").eq("organization_id", workspace.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else {
          const rows = (data || []) as AnalysisRun[];
          setRuns(rows);
          setSelectedRunId(rows[0]?.id || "");
        }
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace?.id]);
  const latest = runs.find((run) => run.id === selectedRunId) || runs[0];
  const dimensionResults = latest?.result?.dimensions || [];
  const resultById = new Map(dimensionResults.map((item) => [item.id, item]));
  const completed = dimensionResults.filter((item) => item.status === "succeeded").length;
  const profileVersion = latest?.input_snapshot?.profile_version ?? latest?.input_snapshot?.profile?.version ?? "—";

  return <section className="ep-tab-content ar-page">
    <div className="ep-tab-heading ar-heading">
      <div><div className="ep-section-kicker">BUSINESS INTELLIGENCE / REPORT CENTER</div><h2>分析结果</h2><p>查看 {companyName} 的经营诊断、维度分析、行动建议与历史报告版本。</p></div>
      <div className="ar-secure"><Locked size={15}/> 企业私有分析档案</div>
    </div>
    <nav className="ar-tabs" aria-label="分析结果分区">
      <button type="button" className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>报告总览</button>
      <button type="button" className={view === "dimensions" ? "active" : ""} onClick={() => setView("dimensions")}>维度报告 <span>12</span></button>
      <button type="button" className={view === "history" ? "active" : ""} onClick={() => setView("history")}>历史版本</button>
    </nav>
    {error && <div className="analysis-notice" role="alert">{error}</div>}
    {view === "overview" && <>
      <div className="ar-report-status">
        <div className="ar-status-mark"><ChartLine size={23}/></div>
        <div className="ar-status-copy"><span>最新分析报告</span><b>{loading ? "正在读取…" : latest ? statusText(latest.status) : "尚未生成"}</b><small>{latest ? new Date(latest.created_at).toLocaleString() + " · 企业档案 v" + profileVersion : "完成一次 AI 分析后，报告内容将在此处呈现。"}</small></div>
        <span className="ar-status-pill">{latest ? statusText(latest.status) : "等待首次分析"}</span>
      </div>
      <div className="ar-metrics">
        <article><span>分析任务</span><strong>{runs.length}</strong><small>数据库中的历史任务</small></article>
        <article><span>已完成分析维度</span><strong>{completed}<small>/ 12</small></strong><small>当前选中报告的完成数</small></article>
        <article><span>本次模型服务</span><strong>{latest?.provider_id || "—"}</strong><small>{latest?.model_id || "等待分析"}</small></article>
        <article><span>失败维度</span><strong>{dimensionResults.filter((item) => item.status === "failed").length}</strong><small>可在维度报告中查看错误</small></article>
      </div>
      {latest ? <div className="ar-empty-layout">
        <div className="ar-empty-card"><div className="ep-section-kicker">LATEST INTELLIGENCE REPORT</div><h3>{latest.input_snapshot?.profile?.display_name || companyName}</h3><p>{latest.result?.summary || "本次报告已从数据库读取。选择“维度报告”查看各项分析输出和实际模型信息。"}</p><button type="button" className="ep-button-primary" onClick={() => setView("dimensions")}>查看十二维度报告 <ArrowRight size={16}/></button></div>
        <aside className="ar-report-outline"><div className="ar-outline-head"><b>本次分析配置</b><span>TRACEABILITY</span></div><div className="ar-outline-row"><b>01</b><div><strong>企业档案快照</strong><small>版本 v{profileVersion}</small></div><span>已保存</span></div><div className="ar-outline-row"><b>02</b><div><strong>分析任务</strong><small>{latest.id}</small></div><span>{statusText(latest.status)}</span></div><div className="ar-outline-row"><b>03</b><div><strong>创建时间</strong><small>{new Date(latest.created_at).toLocaleString()}</small></div><span>已记录</span></div></aside>
      </div> : <div className="ar-empty-layout"><div className="ar-empty-card"><div className="ar-empty-visual"><div className="ar-empty-orbit orbit-one"/><div className="ar-empty-orbit orbit-two"/><div className="ar-empty-core"><ChartLine size={28}/></div></div><div className="ep-section-kicker">YOUR FIRST INTELLIGENCE REPORT</div><h3>让企业数据转化为可执行的经营洞察</h3><p>{loading ? "正在读取分析任务…" : "当前工作空间还没有已保存的分析报告。先选择企业档案并启动 AI 分析。"}</p><button type="button" className="ep-button-primary" onClick={onConfigureAnalysis}>前往配置 AI 分析 <ArrowRight size={16}/></button></div></div>}
    </>}
    {view === "dimensions" && <div className="ar-section-card">
      <div className="ar-section-title"><div><b>十二大分析维度</b><small>每个维度展示独立输出、服务商、模型及执行状态。</small></div><span>{completed} / {dimensionResults.length || 12} 已完成</span></div>
      <div className="ar-dimension-list">{dimensions.map((item,index) => {
        const result = resultById.get(item.id);
        return <article key={item.id}><span className="ar-dimension-no">{String(index+1).padStart(2,"0")}</span><div><b>{item.name}</b><small>{item.detail}</small>{result?.output && <pre className="analysis-result">{result.output}</pre>}{result?.error && <small role="alert">{result.error}</small>}<small>{result ? [result.provider_id, result.model_id].filter(Boolean).join(" · ") : "当前报告未执行此维度"}</small></div><span className={result?.status === "succeeded" ? "ar-waiting" : "ar-waiting"}>{result ? statusText(result.status) : "待分析"}</span><span className="ar-dash">{result?.status === "succeeded" ? "✓" : "—"}</span></article>;
      })}</div>
      <div className="ar-footnote">数据来自当前选中分析任务的数据库结果；未完成或失败的维度不会显示模拟结论。</div>
    </div>}
    {view === "history" && <div className="ar-section-card">
      <div className="ar-section-title"><div><b>历史分析版本</b><small>每次分析均保留企业档案快照和任务级模型配置。</small></div><span>{runs.length} 个任务</span></div>
      {runs.map((run) => <button type="button" className="revision-row" key={run.id} onClick={() => { setSelectedRunId(run.id); setView("overview"); }}><div><b>{run.input_snapshot?.profile?.display_name || "企业分析"} · {statusText(run.status)}</b><small>{new Date(run.created_at).toLocaleString()} · 档案 v{run.input_snapshot?.profile_version ?? "—"} · {run.id}</small></div><span>{run.provider_id || "multi"} / {run.model_id || "multi"}</span></button>)}
      {!runs.length && <p className="ep-muted">尚无历史分析版本。</p>}
    </div>}
    <div className="ar-integrity-note"><Locked size={15}/><span><b>数据状态说明</b> 报告和历史任务直接从 Supabase 读取；每个任务关联独立企业档案快照，并保存各维度实际调用的服务商、模型与状态。</span></div>
  </section>;
}
