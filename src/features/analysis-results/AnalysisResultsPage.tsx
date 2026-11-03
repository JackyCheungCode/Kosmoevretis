import { useState } from "react";
import { ArrowRight, ChartLine, Locked } from "@carbon/icons-react";

type View = "overview" | "dimensions" | "history";

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

export function AnalysisResultsPage({ companyName, onConfigureAnalysis }: { companyName: string; onConfigureAnalysis: () => void }) {
  const [view, setView] = useState<View>("overview");
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

    {view === "overview" && <>
      <div className="ar-report-status">
        <div className="ar-status-mark"><ChartLine size={23}/></div>
        <div className="ar-status-copy"><span>最新分析报告</span><b>尚未生成</b><small>完成一次 AI 分析后，综合结论与报告内容将在此处呈现。</small></div>
        <span className="ar-status-pill">等待首次分析</span>
      </div>
      <div className="ar-metrics">
        <article><span>综合经营评分</span><strong>—<small>/ 100</small></strong><small>等待真实分析数据</small></article>
        <article><span>已完成分析维度</span><strong>0<small>/ 12</small></strong><small>尚无已完成任务</small></article>
        <article><span>关键发现</span><strong>—</strong><small>由分析结果自动归纳</small></article>
        <article><span>高优先级风险</span><strong>—</strong><small>等待风险识别结果</small></article>
      </div>
      <div className="ar-empty-layout">
        <div className="ar-empty-card">
          <div className="ar-empty-visual"><div className="ar-empty-orbit orbit-one"/><div className="ar-empty-orbit orbit-two"/><div className="ar-empty-core"><ChartLine size={28}/></div><span className="ar-node node-one"/><span className="ar-node node-two"/><span className="ar-node node-three"/></div>
          <div className="ep-section-kicker">YOUR FIRST INTELLIGENCE REPORT</div>
          <h3>让企业数据转化为可执行的经营洞察</h3>
          <p>当前还没有已完成的分析报告。先在 AI 分析中选择分析维度和模型；当真实分析服务接通并完成任务后，这里会生成可追溯的企业报告。</p>
          <button type="button" className="ep-button-primary" onClick={onConfigureAnalysis}>前往配置 AI 分析 <ArrowRight size={16}/></button>
        </div>
        <aside className="ar-report-outline">
          <div className="ar-outline-head"><b>报告内容结构</b><span>REPORT STRUCTURE</span></div>
          {[
            ["01","综合经营诊断","经营概况、整体判断与核心结论"],
            ["02","优势与机会","核心竞争力、市场机会与增长空间"],
            ["03","风险与短板","经营风险、能力缺口与关键约束"],
            ["04","行动建议","按优先级组织的策略与落地步骤"],
            ["05","依据与追溯","事实来源、模型信息与分析版本"],
          ].map(([no,title,desc]) => <div className="ar-outline-row" key={no}><b>{no}</b><div><strong>{title}</strong><small>{desc}</small></div><span>待生成</span></div>)}
        </aside>
      </div>
    </>}

    {view === "dimensions" && <div className="ar-section-card">
      <div className="ar-section-title"><div><b>十二大分析维度</b><small>每个维度将独立保存结论、证据、评分及建议。</small></div><span>0 / 12 已完成</span></div>
      <div className="ar-dimension-list">{dimensions.map((item,index) => <article key={item.id}><span className="ar-dimension-no">{String(index+1).padStart(2,"0")}</span><div><b>{item.name}</b><small>{item.detail}</small></div><span className="ar-waiting">待分析</span><span className="ar-dash">—</span></article>)}</div>
      <div className="ar-footnote">维度内容将在真实 AI 任务完成后写入；当前不展示模拟评分或虚构结论。</div>
    </div>}

    {view === "history" && <div className="ar-history-empty">
      <div className="ar-history-icon"><span>↺</span></div><h3>尚无历史分析版本</h3><p>每次成功完成分析后，系统应保存独立报告版本，并记录分析时间、企业资料版本、服务商及模型配置，便于对比变化和追溯依据。</p>
      <div className="ar-history-fields"><span>分析时间</span><span>企业资料版本</span><span>模型配置</span><span>报告版本号</span></div>
      <button type="button" className="ep-button-secondary" onClick={onConfigureAnalysis}>前往 AI 分析 <ArrowRight size={15}/></button>
    </div>}

    <div className="ar-integrity-note"><Locked size={15}/><span><b>数据状态说明</b> 当前版本已完成报告中心的界面与信息架构；真实 AI 执行、结果数据库、历史版本持久化及 PDF / Word 导出尚未接通。因此页面不会生成虚构分数或报告。</span></div>
  </section>;
}
