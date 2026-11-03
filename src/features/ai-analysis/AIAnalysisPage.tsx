import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChartLine, Locked, SettingsAdjust } from "@carbon/icons-react";
import { Dropdown } from "@carbon/react";
import { useAuth } from "../../app/AuthProvider";
import { requireSupabase } from "../../lib/supabase";

type Provider = { id: string; name: string; models: string[] };
const providers: Provider[] = [
  { id: "deepseek", name: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "qwen", name: "阿里云百炼 · Qwen", models: ["qwen-plus", "qwen-max", "qwen-turbo"] },
  { id: "zhipu", name: "智谱 GLM", models: ["glm-4-plus", "glm-4.5"] },
  { id: "moonshot", name: "月之暗面 · Kimi", models: ["kimi-k2", "moonshot-v1-128k"] },
  { id: "volcengine", name: "火山引擎 · 豆包", models: ["doubao-pro-32k", "doubao-lite-32k"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4.1-mini", "gpt-4.1"] },
  { id: "anthropic", name: "Anthropic · Claude", models: ["claude-sonnet-4-5", "claude-opus-4-1"] },
  { id: "google", name: "Google · Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  { id: "openrouter", name: "OpenRouter", models: ["openai/gpt-4.1-mini"] },
  { id: "siliconflow", name: "SiliconFlow", models: ["deepseek-ai/DeepSeek-V3"] },
  { id: "cloudflare", name: "Cloudflare Workers AI", models: ["@cf/zai-org/glm-4.7-flash"] },
];
const dimensions = [
  { id: "foundation", title: "企业基础认知", desc: "企业定位、发展阶段、核心业务、经营范围与关键背景", models: ["cloudflare", "deepseek", "openai", "anthropic"] },
  { id: "business-model", title: "商业模式分析", desc: "价值创造、收入来源、成本结构、渠道与盈利逻辑", models: ["cloudflare", "deepseek", "openai", "anthropic"] },
  { id: "product", title: "产品与服务能力", desc: "产品组合、服务交付、差异化能力与价值主张", models: ["cloudflare", "qwen", "anthropic", "deepseek"] },
  { id: "market", title: "市场环境分析", desc: "行业趋势、市场规模、区域环境与外部驱动因素", models: ["cloudflare", "qwen", "google", "openai"] },
  { id: "customer", title: "客户与需求分析", desc: "客户细分、购买动机、痛点需求与客户价值", models: ["cloudflare", "openai", "qwen", "google"] },
  { id: "competitor", title: "竞争格局分析", desc: "竞争者、替代方案、市场定位与竞争优势", models: ["cloudflare", "deepseek", "openai", "anthropic"] },
  { id: "organization", title: "组织与人才分析", desc: "组织架构、关键岗位、人才能力与治理机制", models: ["cloudflare", "deepseek", "qwen", "openai"] },
  { id: "operations", title: "运营与资源分析", desc: "运营流程、供应链、技术设施与资源配置效率", models: ["cloudflare", "deepseek", "qwen", "openai"] },
  { id: "finance", title: "财务与经营健康度", desc: "收入成本、现金流、盈利能力、财务韧性与经营指标", models: ["cloudflare", "deepseek", "openai", "anthropic"] },
  { id: "risk", title: "风险分析", desc: "战略、市场、运营、财务、合规及外部依赖风险", models: ["cloudflare", "anthropic", "deepseek", "google"] },
  { id: "swot", title: "SWOT 与战略分析", desc: "优势、劣势、机会、威胁及战略匹配", models: ["cloudflare", "deepseek", "openai", "anthropic"] },
  { id: "planning", title: "发展目标与规划分析", desc: "阶段目标、战略路径、关键举措、里程碑与资源需求", models: ["cloudflare", "openai", "qwen", "google"] },
];
type Assignment = { provider: string; model: string };
const providerById = (id: string) => providers.find((p) => p.id === id) || providers[0];
const initialAssignments: Record<string, Assignment> = Object.fromEntries(dimensions.map((d) => {
  const provider = providerById(d.models[0]);
  return [d.id, { provider: provider.id, model: provider.models[0] }];
}));
export function AIAnalysisPage({ embedded = false, enterpriseName, profile, initialProfileId, onContinue }: { embedded?: boolean; enterpriseName?: string; profile?: Record<string, string>; initialProfileId?: string; onContinue?: () => void } = {}) {
  const location = useLocation();
  const routeEnterprise = (location.state as { enterpriseName?: string; profile?: Record<string, string>; completion?: number; profileId?: string } | null) || {};
  const { session, workspace } = useAuth();
  const [profileOptions, setProfileOptions] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(initialProfileId || routeEnterprise.profileId || "");
  const [profileLoading, setProfileLoading] = useState(false);
  useEffect(() => {
    if (!workspace?.id) return;
    let active = true;
    setProfileLoading(true);
    void (async () => {
      try {
        const { data, error } = await requireSupabase().from("enterprise_profiles").select("*").eq("organization_id", workspace.id).order("updated_at", { ascending: false });
        if (!active) return;
        if (error) setNotice(error.message);
        else {
          const rows = data || [];
          setProfileOptions(rows);
          setSelectedProfileId((current) => initialProfileId && rows.some((row) => row.id === initialProfileId) ? initialProfileId : current && rows.some((row) => row.id === current) ? current : rows[0]?.id || "");
        }
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "企业档案读取失败。");
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspace?.id, initialProfileId]);
  const activeProfile = profileOptions.find((item) => item.id === selectedProfileId);
  const enterprise = {
    ...routeEnterprise,
    enterpriseName: enterpriseName || activeProfile?.display_name || routeEnterprise.enterpriseName,
    profile: profile || (activeProfile ? { ...activeProfile, ...(activeProfile.profile || {}) } : routeEnterprise.profile),
    profileId: selectedProfileId,
    completion: activeProfile ? Math.round([activeProfile.display_name, activeProfile.legal_name, activeProfile.website, activeProfile.country, activeProfile.industry, activeProfile.profile?.summary].filter(Boolean).length / 6 * 100) : routeEnterprise.completion
  };
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selected, setSelected] = useState<string[]>(dimensions.map((d) => d.id));
  const [globalProvider, setGlobalProvider] = useState("cloudflare");
  const [globalModel, setGlobalModel] = useState("@cf/zai-org/glm-4.7-flash");
  const [allocationMode, setAllocationMode] = useState<"uniform" | "independent">("independent");
  const [notice, setNotice] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [running, setRunning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
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
  const startAnalysis = async (): Promise<boolean> => {
    if (!selected.length) return false;
    if (!session || !workspace?.id) { setNotice("请先登录并进入工作空间。"); return false; }
    if (!selectedProfileId) { setNotice("请先创建或选择一份企业档案。"); return false; }
    setRunning(true); setNotice(""); setAnalysisResult("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          profileId: selectedProfileId,
          organizationId: workspace.id,
          objective: "对企业进行全球商业智能分析。严格区分已知事实、合理推断、待验证问题和可执行建议；不得编造企业未提供的数据。",
          dimensions: selectedDimensions.map((d) => ({ id: d.id, title: d.title, description: d.desc })),
          assignments: Object.fromEntries(selectedDimensions.map((d) => [d.id, assignments[d.id]]))
        })
      });
      const data = await response.json();
      if (!response.ok && !data.runId) throw new Error(data.error || "AI 分析调用失败");
      setAnalysisResult(JSON.stringify(data.dimensions || data, null, 2));
      setNotice(data.status === "succeeded" ? "12 维度分析任务已完成，结果已保存到分析结果中心。" : data.status === "failed" ? "本次分析未成功，但失败任务与错误信息已保存，可在分析结果中查看。" : "分析任务已结束，部分维度可能失败；请前往结果中心查看详情。");
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI 分析失败，请检查服务配置。"); return false; }
    finally { setRunning(false); }
  };
  return <div className="analysis-page">
    <header className="analysis-heading"><div><div className="ep-eyebrow"><i/> BUSINESS INTELLIGENCE / AI ANALYSIS</div><h1>AI 企业分析</h1><p>基于本企业档案，按分析维度分配最合适的 AI 模型，形成可追溯的经营洞察。</p></div><span className="analysis-secure"><Locked size={15}/> 平台统一调用凭证</span></header>
    {!embedded && <section className="analysis-enterprise"><div className="analysis-enterprise-mark">{(enterprise.enterpriseName || "企").slice(0,1)}</div><div><small>ANALYSIS SUBJECT</small><b>{enterprise.enterpriseName || "当前企业档案"}</b><span>{profileLoading ? "正在读取企业档案…" : typeof enterprise.completion === "number" ? "档案完整度 " + enterprise.completion + "%" : "请选择本次分析所使用的企业档案"}</span><Dropdown id="analysis-enterprise-profile" titleText="分析企业档案" label={profileLoading ? "正在加载…" : "选择企业档案"} items={profileOptions} itemToString={(item: any) => item ? item.display_name + " · v" + item.version : ""} selectedItem={activeProfile || null} disabled={profileLoading || !profileOptions.length} onChange={({ selectedItem }: any) => setSelectedProfileId(selectedItem?.id || "")} /></div><Link to="/enterprise-profile"><span>管理企业档案</span><ArrowRight size={15}/></Link></section>}
    <section className="analysis-intro"><div className="analysis-intro-icon"><ChartLine size={22}/></div><div><small>ANALYSIS WORKSPACE</small><h2>为每个分析维度选择 AI 能力</h2><p>模型选择属于本次分析任务。默认模型由设置中的 AI 服务中心管理；请先在那里完成服务连接测试。</p></div><Link to="/settings"><span>前往 AI 服务中心配置与测试</span><ArrowRight size={15}/></Link></section>
    <section className="analysis-selection">
      <div className="analysis-section-head"><div><div className="ep-section-kicker">01 / MODEL ALLOCATION</div><h2>模型分配</h2><p>选择本次需要执行的分析维度，并为每个维度指定服务商和模型。</p></div><span>{selected.length} / {dimensions.length} 个维度已选择</span></div>
      <div className="analysis-global"><div className="analysis-allocation-modes"><button type="button" className={allocationMode === "uniform" ? "active" : ""} onClick={() => { setAllocationMode("uniform"); applyGlobal(); }}>统一使用一个 AI 模型</button><button type="button" className={allocationMode === "independent" ? "active" : ""} onClick={() => setAllocationMode("independent")}>各分析阶段独立选择模型</button></div><div className="analysis-global-head"><div><b><SettingsAdjust size={16}/> 统一应用模型</b><small>将同一服务商与模型应用到所有已勾选维度</small></div><button type="button" onClick={applyGlobal} disabled={!selected.length}>应用到已选维度 <ArrowRight size={14}/></button></div><div className="analysis-global-fields"><Dropdown id="analysis-global-provider" titleText="统一服务商" label="选择服务商" items={providers} itemToString={(item) => item?.name || ""} selectedItem={selectedProvider} onChange={({ selectedItem }) => { if (selectedItem) { setGlobalProvider(selectedItem.id); setGlobalModel(selectedItem.models[0]); } }}/><Dropdown id="analysis-global-model" titleText="统一模型" label="选择模型" items={selectedProvider.models} itemToString={(item) => item || ""} selectedItem={globalModel} onChange={({ selectedItem }) => setGlobalModel(selectedItem || selectedProvider.models[0])}/></div></div>
      <div className="analysis-dimension-list">{dimensions.map((dimension, index) => {
        const assignment = assignments[dimension.id];
        const provider = providerById(assignment.provider);
        const enabled = selected.includes(dimension.id);
        return <article className={"analysis-dimension" + (enabled ? " selected" : "")} key={dimension.id}><label className="analysis-dimension-check"><input type="checkbox" checked={enabled} onChange={(e) => setSelected((old) => e.target.checked ? [...old, dimension.id] : old.filter((id) => id !== dimension.id))}/><span>{String(index + 1).padStart(2,"0")}</span></label><div className="analysis-dimension-copy"><b>{dimension.title}</b><small>{dimension.desc}</small></div><div className="analysis-dimension-fields"><Dropdown id={"provider-" + dimension.id} titleText="AI 服务商" label="选择服务商" items={providers.filter((p) => dimension.models.includes(p.id))} itemToString={(item) => item?.name || ""} selectedItem={provider} disabled={!enabled || allocationMode === "uniform"} onChange={({ selectedItem }) => selectedItem && updateProvider(dimension.id, selectedItem.id)}/><Dropdown id={"model-" + dimension.id} titleText="模型" label="选择模型" items={provider.models} itemToString={(item) => item || ""} selectedItem={assignment.model} disabled={!enabled || allocationMode === "uniform"} onChange={({ selectedItem }) => setAssignments((old) => ({ ...old, [dimension.id]: { ...old[dimension.id], model: selectedItem || provider.models[0] } }))}/></div></article>;
      })}</div>
    </section>
    <section className="analysis-options"><button type="button" onClick={() => setAdvanced((v) => !v)}>{advanced ? "收起" : "展开"} 分析执行设置 <span>{advanced ? "−" : "+"}</span></button>{advanced && <div className="analysis-options-grid"><div><b>分析深度</b><span>标准诊断（后续可扩展深度研究）</span></div><div><b>结果语言</b><span>中文（简体）</span></div><div><b>输出原则</b><span>事实、推断、建议分开呈现，并标注依据与不确定性</span></div><div><b>数据使用</b><span>仅使用本企业档案及后续明确授权的数据源</span></div></div>}</section>
    <section className="analysis-bottom"><div><b>分析任务摘要</b><p>已选择 {selectedDimensions.length} 个维度 · {new Set(selectedDimensions.map((d) => assignments[d.id].provider)).size} 家 AI 服务商 · {allocationMode === "uniform" ? "所有选中维度统一使用同一模型。" : "每个维度独立保留模型配置。"}</p></div><button type="button" className="ep-button-primary" disabled={!selected.length || running} onClick={onContinue ? async () => { const succeeded = await startAnalysis(); if (succeeded) onContinue(); } : startAnalysis}>{running ? "正在分析…" : onContinue ? "开始分析并查看结果" : "开始 AI 分析"} <ArrowRight size={16}/></button></section>
    {notice && <div className="analysis-notice" role="status">{notice}</div>}{analysisResult && <section className="analysis-result"><h2>本次分析任务结果摘要</h2><pre style={{ whiteSpace: "pre-wrap", font: "inherit" }}>{analysisResult}</pre><Link to="/analysis-results">打开独立分析结果中心 <ArrowRight size={15}/></Link></section>}
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · AI ANALYSIS WORKSPACE</span><span>逐维度模型分配 · 任务级配置</span></footer>
  </div>;
}
