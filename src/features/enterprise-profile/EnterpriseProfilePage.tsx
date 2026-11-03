import { useMemo, useState } from "react";
import { ArrowRight, ChartLine, Globe, Search, Security } from "@carbon/icons-react";
import { Dropdown } from "@carbon/react";

type CreateMode = "search" | "website" | "manual";
type TabId = "overview" | "identity" | "business" | "offerings" | "market" | "operations" | "strategy" | "sources";
type FieldDef = { key: string; label: string; placeholder?: string; wide?: boolean; multiline?: boolean; options?: string[] };

const fieldGroups: { id: string; title: string; description: string; fields: FieldDef[] }[] = [
  { id: "identity", title: "企业身份与注册信息", description: "明确企业法律身份、组织形态和基本背景。", fields: [
    { key: "legalName", label: "法定注册名称" }, { key: "brandName", label: "品牌 / 商业名称" },
    { key: "country", label: "注册国家 / 地区" }, { key: "city", label: "总部城市" },
    { key: "registrationNumber", label: "注册编号 / 统一社会信用代码" }, { key: "taxNumber", label: "税务识别号" },
    { key: "founded", label: "成立日期" }, { key: "companyType", label: "企业性质 / 法律形式", options: ["有限责任公司", "股份有限公司", "个人独资企业", "合伙企业", "国有企业", "非营利组织", "其他"] },
    { key: "website", label: "官方网站" }, { key: "languages", label: "经营语言" },
    { key: "address", label: "注册地址 / 总部地址", wide: true }, { key: "summary", label: "企业简介", wide: true, multiline: true },
  ]},
  { id: "business", title: "业务模式与经营范围", description: "让 AI 理解企业如何创造价值、交付产品并获得收入。", fields: [
    { key: "industry", label: "所属行业 / 细分行业", options: ["制造业", "信息技术 / 软件", "金融 / 保险", "批发 / 零售", "专业服务 / 咨询", "医疗 / 健康", "教育 / 培训", "建筑 / 房地产", "物流 / 供应链", "能源 / 环境", "农业 / 食品", "媒体 / 文娱", "旅游 / 酒店", "其他"] }, { key: "businessStage", label: "发展阶段", options: ["初创期", "成长期", "成熟期", "转型期", "重组 / 复苏期"] },
    { key: "businessModel", label: "商业模式", options: ["B2B", "B2C", "B2B2C", "D2C", "SaaS / 订阅制", "平台 / 市场撮合", "项目制 / 定制交付", "授权 / 特许经营", "混合模式", "其他"] }, { key: "revenueStreams", label: "主要收入来源", options: ["产品销售", "服务 / 项目收入", "订阅 / 会员费", "平台佣金", "授权 / 许可费", "广告 / 流量收入", "租赁 / 使用费", "多元收入组合", "其他"] },
    { key: "coreBusiness", label: "主营业务", wide: true, multiline: true }, { key: "valueProposition", label: "核心价值主张 / 差异化优势", wide: true, multiline: true },
    { key: "deliveryModel", label: "交付与服务模式", options: ["现场交付", "远程 / 在线交付", "云端 / 数字化交付", "客户现场驻场", "合作伙伴交付", "混合交付"] }, { key: "salesChannels", label: "销售渠道 / 获客方式", options: ["直销", "线上电商 / 官网", "经销 / 分销", "代理 / 代表处", "平台渠道", "合作伙伴 / 联盟", "招投标", "多渠道组合"] },
    { key: "pricingModel", label: "定价模式", options: ["固定价格", "订阅制", "按使用量计费", "阶梯定价", "项目报价", "竞价 / 招投标", "定制报价", "免费增值"] }, { key: "seasonality", label: "业务季节性 / 周期性", options: ["全年稳定", "明显季节性", "节假日驱动", "项目周期驱动", "受宏观周期影响", "尚不明确"] },
  ]},
  { id: "offerings", title: "产品、服务与技术能力", description: "梳理企业能提供什么、如何交付，以及能力边界。", fields: [
    { key: "products", label: "核心产品 / 产品线", wide: true, multiline: true }, { key: "services", label: "服务项目 / 解决方案", wide: true, multiline: true },
    { key: "technologies", label: "核心技术 / 专利 / 工艺", wide: true, multiline: true }, { key: "capacity", label: "产能 / 服务交付能力" },
    { key: "customization", label: "定制化能力" }, { key: "quality", label: "质量体系 / 认证标准" },
    { key: "ip", label: "知识产权 / 研发成果" }, { key: "suppliers", label: "关键原材料 / 供应依赖" },
  ]},
  { id: "market", title: "市场、客户与竞争环境", description: "描述企业服务的市场、客户群体和竞争位置。", fields: [
    { key: "targetSegments", label: "目标客户群体 / 客户画像", wide: true, multiline: true }, { key: "industriesServed", label: "重点服务行业" },
    { key: "markets", label: "当前销售市场 / 国家地区", wide: true }, { key: "competitors", label: "主要竞争对手 / 替代方案", wide: true },
    { key: "positioning", label: "市场定位", options: ["高端 / 高价值", "中高端", "大众市场", "性价比 / 成本领先", "细分市场专家", "创新 / 技术驱动", "其他"] }, { key: "marketShare", label: "市场份额 / 行业地位（如已知）" },
    { key: "customerNeeds", label: "客户核心需求与痛点", wide: true, multiline: true }, { key: "marketTrends", label: "市场趋势与外部变化", wide: true, multiline: true },
  ]},
  { id: "operations", title: "组织、资源与运营能力", description: "了解企业内部资源、组织能力、运营流程和约束。", fields: [
    { key: "employees", label: "员工人数 / 团队规模", options: ["1 人", "2–10 人", "11–50 人", "51–200 人", "201–500 人", "501–1,000 人", "1,001–5,000 人", "5,000 人以上"] }, { key: "departments", label: "主要部门 / 组织结构" },
    { key: "leadership", label: "管理团队 / 关键岗位" }, { key: "locations", label: "办公、工厂、仓储及研发地点", wide: true },
    { key: "facilities", label: "设备、设施与基础资源", wide: true }, { key: "partners", label: "关键合作伙伴 / 生态关系", wide: true },
    { key: "systems", label: "使用中的管理系统 / 数字化工具" }, { key: "certifications", label: "资质、许可与行业认证" },
    { key: "constraints", label: "当前经营限制 / 瓶颈", wide: true, multiline: true },
  ]},
  { id: "strategy", title: "经营目标、财务与发展规划", description: "提供目标、资源边界和时间预期，帮助 AI 形成可执行规划。", fields: [
    { key: "vision", label: "企业愿景 / 长期方向", wide: true, multiline: true }, { key: "mission", label: "企业使命 / 核心价值观", wide: true, multiline: true },
    { key: "goals12m", label: "未来 12 个月经营目标", wide: true, multiline: true }, { key: "goals3y", label: "未来 3 年发展目标", wide: true, multiline: true },
    { key: "revenue", label: "年营业收入区间（可选）", options: ["尚未产生收入", "低于 100 万", "100 万–1,000 万", "1,000 万–5,000 万", "5,000 万–1 亿", "1 亿–10 亿", "10 亿以上", "不便披露"] }, { key: "growth", label: "近年增长情况（可选）", options: ["快速增长（年增长超过 30%）", "稳步增长（10%–30%）", "基本持平", "有所下降", "波动较大", "暂无数据"] },
    { key: "budget", label: "可投入预算 / 资源范围", options: ["低于 10 万", "10 万–50 万", "50 万–100 万", "100 万–500 万", "500 万–1,000 万", "1,000 万以上", "需按项目评估", "暂不确定"] }, { key: "investment", label: "重点投资方向" },
    { key: "priorities", label: "当前最重要的经营优先事项", wide: true, multiline: true }, { key: "risks", label: "已知风险与不确定因素", wide: true, multiline: true },
    { key: "successMetrics", label: "成功衡量指标 / KPI", wide: true, multiline: true },
  ]},
];

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "企业总览" }, { id: "identity", label: "身份与注册" },
  { id: "business", label: "业务模式" }, { id: "offerings", label: "产品与能力" },
  { id: "market", label: "市场与客户" }, { id: "operations", label: "组织与运营" },
  { id: "strategy", label: "目标与规划" }, { id: "sources", label: "来源与修改记录" },
];
const tabCopy: Record<TabId, { title: string; description: string }> = {
  overview: { title: "企业总览", description: "建立 AI 对企业整体情况的统一认知，查看档案完整度和待补充信息。" },
  identity: { title: "身份与注册信息", description: "企业法律身份、注册背景、总部位置和官方身份信息。" },
  business: { title: "业务模式与经营范围", description: "企业的价值创造方式、收入结构、销售渠道和交付模式。" },
  offerings: { title: "产品、服务与技术能力", description: "企业产品组合、技术能力、研发成果、产能和服务交付能力。" },
  market: { title: "市场、客户与竞争环境", description: "企业面对的市场、目标客户群体、竞争格局和行业趋势。" },
  operations: { title: "组织、资源与运营能力", description: "组织结构、人员、设施、合作生态、运营系统和经营约束。" },
  strategy: { title: "经营目标、财务与发展规划", description: "企业愿景、阶段目标、资源预算、经营重点、风险和 KPI。" },
  sources: { title: "来源与修改记录", description: "区分官网识别、用户填写和 AI 推断，保留信息来源及修改轨迹。" },
};

export function EnterpriseProfilePage() {
  const [mode, setMode] = useState<CreateMode>("website");
  const [query, setQuery] = useState("");
  const [website, setWebsite] = useState("");
  const [candidate, setCandidate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editing, setEditing] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [expandedSource, setExpandedSource] = useState("identity");
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [manualProfile, setManualProfile] = useState<Record<string, string>>({});
  const [manualSection, setManualSection] = useState("identity");
  const [manualName, setManualName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  const [identitySource, setIdentitySource] = useState("用户手动创建");

  const displayName = profile.brandName || profile.legalName || profile.companyName || candidate || "本企业";
  const filledCount = useMemo(() => Object.values(profile).filter((v) => v.trim()).length, [profile]);
  const totalFields = fieldGroups.reduce((n, group) => n + group.fields.length, 0);
  const completion = Math.round((filledCount / totalFields) * 100);
  const activeGroup = fieldGroups.find((g) => g.id === activeTab);
  const manualGroup = fieldGroups.find((g) => g.id === manualSection) || fieldGroups[0];

  function updateProfile(key: string, value: string) {
    setProfile((old) => ({ ...old, [key]: value }));
  }
  function updateManual(key: string, value: string) {
    setManualProfile((old) => ({ ...old, [key]: value }));
  }
  function startIdentification() {
    const value = mode === "search" ? query.trim() : website.trim();
    if (value) {
      setCandidate(value);
      setConfirmed(false);
      setIdentitySource(mode === "website" ? "官网识别待确认" : "企业检索待确认");
    }
  }
  function createManual() {
    const name = manualName.trim();
    if (!name) return;
    setProfile({ ...manualProfile, legalName: name, brandName: manualProfile.brandName || name, website: manualWebsite.trim(), country: manualCountry.trim() });
    setCandidate(name);
    setIdentitySource("用户手动创建");
    setConfirmed(true);
    setActiveTab("overview");
  }
  function confirmIdentity() {
    setProfile((old) => ({ ...old, legalName: old.legalName || candidate, brandName: old.brandName || candidate, website: mode === "website" ? website.trim() : old.website }));
    setConfirmed(true);
    setActiveTab("overview");
  }
  function saveChanges() {
    setEditing(false);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2800);
  }

  return (
    <div className="enterprise-page">
      <div className="ep-page-heading">
        <div><div className="ep-eyebrow"><i /> 企业基础信息 / AI 经营认知</div><h1>Enterprise Profile</h1><p>登记本企业真实经营情况，为 AI 建立全面、持续更新的企业认知基础。</p></div>
        <div className="ep-heading-note"><Security size={16} /> 企业自有档案 · 来源可追溯</div>
      </div>

      {!confirmed ? (
        <section className="ep-create-layout">
          <div className="ep-create-main">
            <div className="ep-section-kicker">YOUR COMPANY WORKSPACE</div><h2>建立本企业档案</h2>
            <p className="ep-muted">登记正在使用 Kosmoevretis 的企业。官网识别或手动填写后，均需由企业用户确认身份。</p>
            <div className="ep-mode-switch" role="tablist" aria-label="企业档案创建方式">
              <button className={mode === "website" ? "selected" : ""} onClick={() => { setMode("website"); setCandidate(""); }} type="button"><Globe size={17} /> 官网识别</button>
              <button className={mode === "search" ? "selected" : ""} onClick={() => { setMode("search"); setCandidate(""); }} type="button"><Search size={17} /> 搜索企业</button>
              <button className={mode === "manual" ? "selected" : ""} onClick={() => { setMode("manual"); setCandidate(""); }} type="button">＋ 手动创建</button>
            </div>
            {mode === "website" && <div className="ep-form-block"><label htmlFor="enterprise-website">本企业官方网站 URL</label><div className="ep-input-with-action"><input id="enterprise-website" value={website} onChange={(e) => setWebsite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startIdentification()} placeholder="https://www.your-company.com" /><button type="button" onClick={startIdentification} disabled={!website.trim()}><Globe size={16} /> 识别本企业</button></div><small>AI 将以官网为主要入口，提取企业身份、业务、产品、市场和公开资料；结果需经用户确认。</small></div>}
            {mode === "search" && <div className="ep-form-block"><label htmlFor="enterprise-search">本企业名称、官网或注册编号</label><div className="ep-input-with-action"><input id="enterprise-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startIdentification()} placeholder="输入正在使用本系统的企业名称或注册信息" /><button type="button" onClick={startIdentification} disabled={!query.trim()}><Search size={16} /> 查找本企业</button></div><small>用于定位当前租户所属企业，不用于创建外部客户档案。</small></div>}
            {mode === "manual" && <div className="ep-manual-builder">
              <div className="ep-manual-intro"><b>分阶段填写企业信息</b><span>先填写企业身份，再逐组补充经营信息。除企业名称外，其余字段均可稍后完善。</span></div>
              <div className="ep-manual-core">
                <div className="ep-form-block"><label>企业法定名称 *</label><input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="营业执照或注册文件上的企业名称" /></div>
                <div className="ep-form-block"><label>品牌 / 商业名称</label><input value={manualProfile.brandName || ""} onChange={(e) => updateManual("brandName", e.target.value)} placeholder="市场使用的品牌名称" /></div>
                <div className="ep-form-block"><label>官方网站</label><input value={manualWebsite} onChange={(e) => setManualWebsite(e.target.value)} placeholder="https://" /></div>
                <div className="ep-form-block"><label>注册国家 / 地区</label><input value={manualCountry} onChange={(e) => setManualCountry(e.target.value)} placeholder="国家或地区" /></div>
              </div>
              <div className="ep-manual-sections">
                <div className="ep-manual-section-list">{fieldGroups.map((group) => <button type="button" key={group.id} className={manualSection === group.id ? "active" : ""} onClick={() => setManualSection(group.id)}>{group.title}<span>{group.fields.filter((f) => (manualProfile[f.key] || "").trim()).length}/{group.fields.length}</span></button>)}</div>
                <div className="ep-manual-fields"><div className="ep-manual-group-head"><b>{manualGroup.title}</b><small>{manualGroup.description}</small></div><div className="ep-field-grid">{manualGroup.fields.filter((f) => !["legalName", "brandName", "website", "country"].includes(f.key)).map((field) => <div className={"ep-form-block" + (field.wide ? " ep-wide-input" : "")} key={field.key}><label>{field.label}</label>{field.options ? <Dropdown id={`manual-${field.key}`} titleText={field.label} label="请选择" items={field.options} itemToString={(item) => item || ""} selectedItem={manualProfile[field.key] || null} onChange={({ selectedItem }) => updateManual(field.key, selectedItem || "")} /> : field.multiline ? <textarea rows={3} value={manualProfile[field.key] || ""} onChange={(e) => updateManual(field.key, e.target.value)} placeholder={field.placeholder || "请填写相关信息"} /> : <input value={manualProfile[field.key] || ""} onChange={(e) => updateManual(field.key, e.target.value)} placeholder={field.placeholder || "请填写相关信息"} />}</div>)}</div></div>
              </div>
              <div className="ep-actions"><span className="ep-manual-hint">已填写 {Object.values(manualProfile).filter((v) => v.trim()).length + [manualName, manualWebsite, manualCountry].filter((v) => v.trim()).length} 项信息</span><button className="ep-button-primary" type="button" disabled={!manualName.trim()} onClick={createManual}>创建本企业档案 <ArrowRight size={16} /></button></div>
            </div>}
            {candidate && mode !== "manual" && <div className="ep-candidate-panel"><div className="ep-candidate-top"><div><span className="ep-section-kicker">COMPANY IDENTITY REVIEW</span><h3>确认本企业身份</h3></div><span className="ep-status pending">等待用户确认</span></div><div className="ep-candidate-name">{candidate}</div><p>请确认这是正在使用 Kosmoevretis 的企业，而不是客户、供应商或其他外部企业。</p><div className="ep-candidate-warning"><Security size={16} /> 当前预览版尚未连接实时企业检索、官网爬取或 AI 识别服务。此处仅登记输入内容，不代表已完成外部核验。</div><div className="ep-actions"><button className="ep-button-secondary" type="button" onClick={() => setCandidate("")}>返回修改</button><button className="ep-button-primary" type="button" onClick={confirmIdentity}>确认这是本企业 <ArrowRight size={16} /></button></div></div>}
          </div>
          <aside className="ep-create-aside"><div className="ep-aside-icon"><ChartLine size={22} /></div><h3>让 AI 先理解企业</h3><p>企业档案是 AI 进行经营分析和业务规划的基础。信息越完整，分析越能结合企业真实能力、资源、市场和目标。</p><div className="ep-aside-rule" /><div className="ep-aside-point"><b>01</b><span>登记企业身份与背景</span></div><div className="ep-aside-point"><b>02</b><span>描述业务、产品与市场</span></div><div className="ep-aside-point"><b>03</b><span>补充资源、目标与约束</span></div><div className="ep-aside-point"><b>04</b><span>形成 AI 经营认知底座</span></div></aside>
        </section>
      ) : (
        <>
          <section className="ep-company-header"><div className="ep-company-mark">{displayName.slice(0, 1).toUpperCase()}</div><div className="ep-company-title"><div className="ep-company-title-line"><h2>{displayName}</h2><span className="ep-status confirmed">本企业档案已建立</span></div><div className="ep-company-meta"><span>{profile.country || "注册地待补充"}</span><i /><span>{profile.industry || "行业待补充"}</span>{profile.website && <><i /><a href={profile.website.startsWith("http") ? profile.website : "https://" + profile.website} target="_blank" rel="noreferrer">{profile.website}</a></>}</div></div><div className="ep-company-actions"><button type="button" className="ep-button-secondary" onClick={() => { setActiveTab("identity"); setEditing(true); }}>编辑档案</button><button type="button" className="ep-button-primary" onClick={() => setActiveTab("strategy")}><ChartLine size={16} /> AI 经营规划</button></div></section>
          <nav className="ep-tabs" aria-label="本企业档案分区">{tabs.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => { setActiveTab(tab.id); setEditing(false); }}>{tab.label}</button>)}</nav>
          {savedNotice && <div className="ep-save-notice">修改已保存在当前页面状态。正式持久化和修改审计服务尚未连接。</div>}
          <section className="ep-tab-content"><div className="ep-tab-heading"><div><div className="ep-section-kicker">YOUR COMPANY INTELLIGENCE</div><h2>{tabCopy[activeTab].title}</h2><p>{tabCopy[activeTab].description}</p></div><span className="ep-live-label"><i /> 企业工作区</span></div>
            {activeTab === "overview" && <div className="ep-overview-grid">
              <article className="ep-panel ep-summary-panel"><div className="ep-panel-label">企业经营简介 <span>COMPANY PROFILE</span></div><p>{profile.summary || profile.coreBusiness || "请补充企业简介和主营业务。AI 将基于企业自身信息逐步形成经营画像，而不是推测未经确认的经营事实。"}</p><button className="ep-text-action" type="button" onClick={() => setActiveTab("business")}>完善业务信息 <ArrowRight size={14} /></button></article>
              <article className="ep-panel"><div className="ep-panel-label">档案完整度 <span>PROFILE COMPLETENESS</span></div><div className="ep-completion"><strong>{completion}%</strong><div><i style={{ width: completion + "%" }} /></div><small>已填写 {filledCount} / {totalFields} 项档案字段</small></div><div className="ep-status-list"><div><span>企业身份</span><b className="green">用户已确认</b></div><div><span>信息来源</span><b>{identitySource}</b></div><div><span>AI 经营分析</span><b className="muted">待接入分析服务</b></div></div></article>
              <article className="ep-panel ep-wide-panel"><div className="ep-panel-label">AI 企业认知维度 <span>BUSINESS UNDERSTANDING</span></div><div className="ep-capability-grid">{fieldGroups.slice(1).map((g) => <button type="button" key={g.id} onClick={() => setActiveTab(g.id as TabId)}><b>{g.title}</b><span>{g.fields.filter((f) => (profile[f.key] || "").trim()).length}/{g.fields.length} 项已填写</span><ArrowRight size={14} /></button>)}</div></article>
              <article className="ep-panel ep-wide-panel"><div className="ep-panel-label">AI 经营规划方向 <span>PLANNING DOMAINS</span></div><div className="ep-planning-grid">{["企业战略与年度经营计划","市场定位与增长策略","产品组合与研发路线图","销售渠道与收入模型","组织能力与人才规划","运营效率与供应链优化","财务预算与资源配置","风险识别与应急预案"].map((v, i) => <div key={v}><b>0{i + 1}</b><span>{v}</span></div>)}</div><small className="ep-planning-note">以上为 AI 后续可分析的规划领域；当前页面尚未连接 AI 规划执行服务。</small></article>
            </div>}
            {activeGroup && <div className="ep-panel ep-detail-panel"><div className="ep-panel-toolbar"><div><b>{activeGroup.title}</b><small>{activeGroup.description}</small></div><button className="ep-button-secondary" type="button" onClick={() => setEditing((v) => !v)}>{editing ? "关闭编辑" : "编辑资料"}</button></div>{editing ? <div className="ep-edit-form"><div className="ep-field-grid">{activeGroup.fields.map((field) => <div className={"ep-form-block" + (field.wide ? " ep-wide-input" : "")} key={field.key}><label>{field.label}</label>{field.options ? <Dropdown id={`profile-${field.key}`} titleText={field.label} label="请选择" items={field.options} itemToString={(item) => item || ""} selectedItem={profile[field.key] || null} onChange={({ selectedItem }) => updateProfile(field.key, selectedItem || "")} /> : field.multiline ? <textarea rows={3} value={profile[field.key] || ""} onChange={(e) => updateProfile(field.key, e.target.value)} placeholder="填写企业真实情况，必要时注明估算或口径" /> : <input value={profile[field.key] || ""} onChange={(e) => updateProfile(field.key, e.target.value)} placeholder={field.placeholder || "待补充"} />}</div>)}</div><div className="ep-actions"><button className="ep-button-primary" type="button" onClick={saveChanges}>保存修改</button></div></div> : <div className="ep-field-grid">{activeGroup.fields.map((field) => <div className={"ep-info-field" + (field.wide ? " wide" : "")} key={field.key}><span>{field.label}</span><b>{profile[field.key] || "待补充"}</b><small>{profile[field.key] ? "来源：用户登记 / 待核验" : "尚未填写"}</small></div>)}</div>}</div>}
            {activeTab === "sources" && <div className="ep-panel ep-detail-panel"><div className="ep-panel-toolbar"><div><b>企业资料来源与修改记录</b><small>正式版本应为每个字段记录来源 URL、采集时间、确认人和修改前后值。</small></div><span className="ep-status pending">审计服务待接入</span></div><button className="ep-source-row" type="button" onClick={() => setExpandedSource(expandedSource === "identity" ? "" : "identity")}><span><b>企业身份登记</b><small>{identitySource} · 当前会话</small></span><span className="ep-status confirmed">用户确认</span><span>{expandedSource === "identity" ? "−" : "+"}</span></button>{expandedSource === "identity" && <div className="ep-source-detail"><p>企业名称：{displayName}</p><p>身份：当前系统使用方 / 本企业。</p><p>说明：用户确认不等同于官方注册信息独立核验。</p></div>}<div className="ep-source-row static"><span><b>官网资料采集</b><small>官网页面、产品资料、公司介绍及公开信息</small></span><span className="ep-status pending">待接入</span></div><div className="ep-source-row static"><span><b>用户资料修改历史</b><small>字段级版本、修改人、修改时间和原始值</small></span><span className="ep-status pending">待接入</span></div><div className="ep-source-row static"><span><b>AI 分析与推断</b><small>AI 生成结论应与用户提供事实明确区分并附依据</small></span><span className="ep-status pending">待接入</span></div></div>}
          </section>
        </>
      )}
      <div className="ep-page-footer"><span>KOSMOEVRETIS · ENTERPRISE PROFILE</span><span>本企业经营认知 · AI 规划基础</span></div>
    </div>
  );
}
