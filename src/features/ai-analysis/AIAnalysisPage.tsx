import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChartLine, Locked, SettingsAdjust } from "@carbon/icons-react";
import { Dropdown } from "@carbon/react";

type Provider = { id: string; name: string; models: string[] };
const providers: Provider[] = [
  { id: "deepseek", name: "DeepSeek", models: ["DeepSeek V3", "DeepSeek R1"] },
  { id: "qwen", name: "阿里云百炼 · Qwen", models: ["Qwen-Max", "Qwen-Plus", "Qwen-Turbo"] },
  { id: "zhipu", name: "智谱 GLM", models: ["GLM-4.5", "GLM-4.5-Air"] },
  { id: "kimi", name: "月之暗面 · Kimi", models: ["Kimi K2", "Moonshot v1"] },
  { id: "doubao", name: "火山引擎 · 豆包", models: ["Doubao-pro", "Doubao-lite"] },
  { id: "openai", name: "OpenAI", models: ["GPT 系列（连接后同步）"] },
  { id: "anthropic", name: "Anthropic · Claude", models: ["Claude Sonnet", "Claude Opus"] },
  { id: "google", name: "Google · Gemini", models: ["Gemini Pro", "Gemini Flash"] },
  { id: "openrouter", name: "OpenRouter", models: ["连接后同步模型目录"] },
  { id: "siliconflow", name: "SiliconFlow", models: ["连接后同步模型目录"] },
];
const dimensions = [
  { id: "strategy", title: "企业战略与经营诊断", desc: "商业模式、核心能力、经营目标与战略一致性", models: ["deepseek", "openai", "anthropic"] },
  { id: "market", title: "市场与行业机会", desc: "市场规模、趋势、区域机会与进入壁垒", models: ["qwen", "google", "openai"] },
  { id: "competitor", title: "竞争格局与对标分析", desc: "竞争者、替代方案、差异化和竞争优势", models: ["deepseek", "openai", "kimi"] },
  { id: "product", title: "产品与服务组合", desc: "产品竞争力、价值主张、定价与产品路线", models: ["qwen", "anthropic", "deepseek"] },
  { id: "growth", title: "销售增长与客户策略", desc: "客户细分、获客渠道、销售漏斗与增长路径", models: ["openai", "qwen", "google"] },
  { id: "operation", title: "组织与运营效率", desc: "组织能力、流程、供应链与资源配置", models: ["deepseek", "qwen", "openai"] },
  { id: "finance", title: "财务与资源规划", desc: "预算、成本结构、投入优先级与情景推演", models: ["deepseek", "openai", "anthropic"] },
  { id: "risk", title: "风险与合规识别", desc: "经营风险、外部依赖、合规与应急预案", models: ["anthropic", "deepseek", "google"] },
];
type Assignment = { provider: string; model: string };
const providerById = (id: string) => providers.find((p) => p.id === id) || providers[0];
const initialAssignments: Record<string, Assignment> = Object.fromEntries(dimensions.map((d) => {
  const provider = providerById(d.models[0]);
  return [d.id, { provider: provider.id, model: provider.models[0] }];
}));
export function AIAnalysisPage() {
  const location = useLocation();
  const enterprise = (location.state as { enterpriseName?: string; profile?: Record<string, string>; completion?: number } | null) || {};
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selected, setSelected] = useState<string[]>(dimensions.map((d) => d.id));
  const [globalProvider, setGlobalProvider] = useState(providers[0].id);
  const [globalModel, setGlobalModel] = useState(providers[0].models[0]);
  const [notice, setNotice] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const selectedProvider = providerById(globalProvider);
  const selectedDimensions = useMemo(() => dimensions.filter((d) => selected.includes(d.id)), [selected]);
  const updateProvider = (dimensionId: string, providerId: string) => {
    const provider = providerById(providerId);
    setAssignments((old) => ({ ...old, [dimensionId]: { provider: provider.id, model: provider.models[0] } }));
  };
  const applyGlobal = () => {
    setAssignments((old) => {
      const next = { ...old };
      selected.forEach((id) => { next[id] = { provider: selectedProvider.id, model: globalModel }; });
      return next;
    });
    setNotice("已将统一模型应用到当前勾选的分析维度。你仍可逐项修改。");
  };
  const startAnalysis = () => setNotice("当前所有服务商均尚未配置真实 API 凭证。模型分配已保留在本页面状态；接入平台调用网关后即可启动真实分析。");
  return <div className="analysis-page">
    <header className="analysis-heading"><div><div className="ep-eyebrow"><i/> BUSINESS INTELLIGENCE / AI ANALYSIS</div><h1>AI 企业分析</h1><p>基于本企业档案，按分析维度分配最合适的 AI 模型，形成可追溯的经营洞察。</p></div><span className="analysis-secure"><Locked size={15}/> 平台统一调用凭证</span></header>
    <section className="analysis-enterprise"><div className="analysis-enterprise-mark">{(enterprise.enterpriseName || "企").slice(0,1)}</div><div><small>ANALYSIS SUBJECT</small><b>{enterprise.enterpriseName || "当前企业档案"}</b><span>{typeof enterprise.completion === "number" ? "档案完整度 " + enterprise.completion + "%" : "分析将使用已确认的企业档案信息"}</span></div><Link to="/enterprise-profile"><span>查看企业档案</span><ArrowRight size={15}/></Link></section>
    <section className="analysis-intro"><div className="analysis-intro-icon"><ChartLine size={22}/></div><div><small>ANALYSIS WORKSPACE</small><h2>为每个分析维度选择 AI 能力</h2><p>模型选择属于本次分析任务，不会被 Settings 中的服务商配置强制覆盖。你可以逐项指定，也可以将同一模型批量应用到勾选的维度。</p></div></section>
    <section className="analysis-selection">
      <div className="analysis-section-head"><div><div className="ep-section-kicker">01 / MODEL ALLOCATION</div><h2>模型分配</h2><p>选择本次需要执行的分析维度，并为每个维度指定服务商和模型。</p></div><span>{selected.length} / {dimensions.length} 个维度已选择</span></div>
      <div className="analysis-global"><div className="analysis-global-head"><div><b><SettingsAdjust size={16}/> 统一应用模型</b><small>将同一服务商与模型应用到所有已勾选维度</small></div><button type="button" onClick={applyGlobal} disabled={!selected.length}>应用到已选维度 <ArrowRight size={14}/></button></div><div className="analysis-global-fields"><Dropdown id="analysis-global-provider" titleText="统一服务商" label="选择服务商" items={providers} itemToString={(item) => item?.name || ""} selectedItem={selectedProvider} onChange={({ selectedItem }) => { if (selectedItem) { setGlobalProvider(selectedItem.id); setGlobalModel(selectedItem.models[0]); } }}/><Dropdown id="analysis-global-model" titleText="统一模型" label="选择模型" items={selectedProvider.models} itemToString={(item) => item || ""} selectedItem={globalModel} onChange={({ selectedItem }) => setGlobalModel(selectedItem || selectedProvider.models[0])}/></div></div>
      <div className="analysis-dimension-list">{dimensions.map((dimension, index) => {
        const assignment = assignments[dimension.id];
        const provider = providerById(assignment.provider);
        const enabled = selected.includes(dimension.id);
        return <article className={"analysis-dimension" + (enabled ? " selected" : "")} key={dimension.id}><label className="analysis-dimension-check"><input type="checkbox" checked={enabled} onChange={(e) => setSelected((old) => e.target.checked ? [...old, dimension.id] : old.filter((id) => id !== dimension.id))}/><span>{String(index + 1).padStart(2,"0")}</span></label><div className="analysis-dimension-copy"><b>{dimension.title}</b><small>{dimension.desc}</small></div><div className="analysis-dimension-fields"><Dropdown id={"provider-" + dimension.id} titleText="AI 服务商" label="选择服务商" items={providers.filter((p) => dimension.models.includes(p.id))} itemToString={(item) => item?.name || ""} selectedItem={provider} disabled={!enabled} onChange={({ selectedItem }) => selectedItem && updateProvider(dimension.id, selectedItem.id)}/><Dropdown id={"model-" + dimension.id} titleText="模型" label="选择模型" items={provider.models} itemToString={(item) => item || ""} selectedItem={assignment.model} disabled={!enabled} onChange={({ selectedItem }) => setAssignments((old) => ({ ...old, [dimension.id]: { ...old[dimension.id], model: selectedItem || provider.models[0] } }))}/></div></article>;
      })}</div>
    </section>
    <section className="analysis-options"><button type="button" onClick={() => setAdvanced((v) => !v)}>{advanced ? "收起" : "展开"} 分析执行设置 <span>{advanced ? "−" : "+"}</span></button>{advanced && <div className="analysis-options-grid"><div><b>分析深度</b><span>标准诊断（后续可扩展深度研究）</span></div><div><b>结果语言</b><span>中文（简体）</span></div><div><b>输出原则</b><span>事实、推断、建议分开呈现，并标注依据与不确定性</span></div><div><b>数据使用</b><span>仅使用本企业档案及后续明确授权的数据源</span></div></div>}</section>
    <section className="analysis-bottom"><div><b>分析任务摘要</b><p>已选择 {selectedDimensions.length} 个维度 · {new Set(selectedDimensions.map((d) => assignments[d.id].provider)).size} 家 AI 服务商 · 每个维度独立保留模型配置。</p></div><button type="button" className="ep-button-primary" disabled={!selected.length} onClick={startAnalysis}>开始 AI 分析 <ArrowRight size={16}/></button></section>
    {notice && <div className="analysis-notice" role="status">{notice}{notice.includes("API 凭证") && <> <Link to="/settings">前往 AI 服务中心配置 <ArrowRight size={13}/></Link></>}</div>}
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · AI ANALYSIS WORKSPACE</span><span>逐维度模型分配 · 任务级配置</span></footer>
  </div>;
}
