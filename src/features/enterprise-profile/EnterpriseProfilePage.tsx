import { useMemo, useState } from "react";
import { ArrowRight, ChartLine, Globe, Search, Security } from "@carbon/icons-react";

type CreateMode = "search" | "website" | "manual";
type TabId = "overview" | "company" | "products" | "global" | "relationships" | "intelligence" | "sources";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "企业概览" }, { id: "company", label: "企业资料" },
  { id: "products", label: "产品与服务" }, { id: "global", label: "全球布局" },
  { id: "relationships", label: "商业关系" }, { id: "intelligence", label: "客户开发情报" },
  { id: "sources", label: "来源与核验" },
];
const tabCopy: Record<TabId, { title: string; description: string }> = {
  overview: { title: "企业概览", description: "快速了解目标企业、业务定位和潜在客户开发价值。" },
  company: { title: "企业资料", description: "管理企业身份、注册信息、规模和经营情况。" },
  products: { title: "产品与服务", description: "梳理企业产品、服务和可能的采购需求。" },
  global: { title: "全球布局", description: "了解企业运营地区、市场覆盖和业务据点。" },
  relationships: { title: "商业关系", description: "识别客户、供应商、合作伙伴及关联企业。" },
  intelligence: { title: "客户开发情报", description: "围绕潜在需求、客户匹配和销售切入点开展在线分析。" },
  sources: { title: "来源与核验", description: "追溯资料来源、验证状态和用户修改历史。" },
};

export function EnterpriseProfilePage() {
  const [mode, setMode] = useState<CreateMode>("search");
  const [query, setQuery] = useState("");
  const [website, setWebsite] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  const [manualIndustry, setManualIndustry] = useState("");
  const [candidate, setCandidate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companySummary, setCompanySummary] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [expandedSource, setExpandedSource] = useState("identity");
  const hasCandidate = candidate.length > 0;
  const displayName = companyName || candidate || "目标企业";
  const sourceCount = useMemo(() => [companyName, companyWebsite, companyCountry, companyIndustry].filter(Boolean).length, [companyName, companyWebsite, companyCountry, companyIndustry]);

  function startIdentification() {
    const value = mode === "search" ? query.trim() : mode === "website" ? website.trim() : manualName.trim();
    if (value) { setCandidate(value); setConfirmed(false); }
  }
  function confirmEnterprise() {
    const name = mode === "manual" ? manualName.trim() : candidate;
    setCompanyName(name);
    setCompanyWebsite(mode === "website" ? website.trim() : "");
    setCompanyCountry(mode === "manual" ? manualCountry.trim() : "");
    setCompanyIndustry(mode === "manual" ? manualIndustry.trim() : "");
    setCompanySummary("");
    setConfirmed(true);
    setActiveTab("overview");
    setCandidate(name);
  }
  function saveChanges() {
    setEditing(false);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2800);
  }

  return (
    <div className="enterprise-page">
      <div className="ep-page-heading">
        <div><div className="ep-eyebrow"><i /> 企业情报 / 客户开发</div><h1>Enterprise Profile</h1><p>建立目标企业档案，发现潜在需求与客户开发机会。</p></div>
        <div className="ep-heading-note"><Security size={16} /> 证据优先 · 在线分析</div>
      </div>

      {!confirmed ? (
        <section className="ep-create-layout">
          <div className="ep-create-main">
            <div className="ep-section-kicker">NEW TARGET ENTERPRISE</div><h2>创建目标企业档案</h2>
            <p className="ep-muted">选择一种方式识别目标企业。正式建立档案前，必须由你确认企业身份。</p>
            <div className="ep-mode-switch" role="tablist" aria-label="企业创建方式">
              <button className={mode === "search" ? "selected" : ""} onClick={() => { setMode("search"); setCandidate(""); }} type="button"><Search size={17} /> 搜索企业</button>
              <button className={mode === "website" ? "selected" : ""} onClick={() => { setMode("website"); setCandidate(""); }} type="button"><Globe size={17} /> 官网导入</button>
              <button className={mode === "manual" ? "selected" : ""} onClick={() => { setMode("manual"); setCandidate(""); }} type="button"><span className="ep-mode-letter">＋</span> 手动创建</button>
            </div>
            {mode === "search" && <div className="ep-form-block"><label htmlFor="enterprise-search">企业名称、官网或注册编号</label><div className="ep-input-with-action"><input id="enterprise-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startIdentification()} placeholder="例如：企业名称 / www.example.com / 注册编号" /><button type="button" onClick={startIdentification} disabled={!query.trim()}><Search size={16} /> 识别企业</button></div><small>支持不同国家、地区和行业的目标企业。</small></div>}
            {mode === "website" && <div className="ep-form-block"><label htmlFor="enterprise-website">企业官方网站 URL</label><div className="ep-input-with-action"><input id="enterprise-website" value={website} onChange={(e) => setWebsite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startIdentification()} placeholder="https://www.example.com" /><button type="button" onClick={startIdentification} disabled={!website.trim()}><Globe size={16} /> 解析官网</button></div><small>官网导入用于定位官方网站入口；当前尚未连接实时网页采集服务。</small></div>}
            {mode === "manual" && <div className="ep-manual-grid">
              <div className="ep-form-block"><label htmlFor="manual-name">企业名称 *</label><input id="manual-name" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="官方或常用企业名称" /></div>
              <div className="ep-form-block"><label htmlFor="manual-country">国家 / 地区</label><input id="manual-country" value={manualCountry} onChange={(e) => setManualCountry(e.target.value)} placeholder="例如：中国、日本、德国" /></div>
              <div className="ep-form-block"><label htmlFor="manual-industry">行业</label><input id="manual-industry" value={manualIndustry} onChange={(e) => setManualIndustry(e.target.value)} placeholder="例如：工业自动化" /></div>
              <div className="ep-form-block ep-manual-action"><button type="button" onClick={startIdentification} disabled={!manualName.trim()}>检查并继续 <ArrowRight size={16} /></button></div>
            </div>}
            {hasCandidate && <div className="ep-candidate-panel">
              <div className="ep-candidate-top"><div><span className="ep-section-kicker">IDENTITY REVIEW</span><h3>待确认的企业实体</h3></div><span className="ep-status pending">需要用户确认</span></div>
              <div className="ep-candidate-name">{candidate}</div>
              <p>请核对企业名称、官网、注册地及关联实体后再创建正式档案。</p>
              <div className="ep-candidate-warning"><Security size={16} /> 当前版本尚未接入外部企业搜索或实时 AI 实体识别。此处不会伪造匹配结果或声称已完成核验。</div>
              <div className="ep-actions"><button className="ep-button-secondary" type="button" onClick={() => setCandidate("")}>返回修改</button><button className="ep-button-primary" type="button" onClick={confirmEnterprise}>我确认这是目标企业 <ArrowRight size={16} /></button></div>
            </div>}
          </div>
          <aside className="ep-create-aside"><div className="ep-aside-icon"><Globe size={22} /></div><h3>从企业身份开始</h3><p>清晰的企业身份是客户开发情报的基础。先确认目标实体，再逐步补充业务、产品、市场和关系证据。</p><div className="ep-aside-rule" /><div className="ep-aside-point"><b>01</b><span>识别目标企业</span></div><div className="ep-aside-point"><b>02</b><span>确认企业身份</span></div><div className="ep-aside-point"><b>03</b><span>建立在线分析档案</span></div></aside>
        </section>
      ) : (
        <>
          <section className="ep-company-header">
            <div className="ep-company-mark">{displayName.slice(0, 1).toUpperCase()}</div>
            <div className="ep-company-title"><div className="ep-company-title-line"><h2>{displayName}</h2><span className="ep-status confirmed">身份已由用户确认</span></div><div className="ep-company-meta"><span>{companyCountry || "国家 / 地区待补充"}</span><i /><span>{companyIndustry || "行业待识别"}</span>{companyWebsite && <><i /><a href={companyWebsite.startsWith("http") ? companyWebsite : "https://" + companyWebsite} target="_blank" rel="noreferrer">{companyWebsite}</a></>}</div></div>
            <div className="ep-company-actions"><button type="button" className="ep-button-secondary" onClick={() => setEditing((v) => !v)}>{editing ? "取消编辑" : "编辑资料"}</button><button type="button" className="ep-button-primary" onClick={() => setActiveTab("intelligence")}><ChartLine size={16} /> 客户开发分析</button></div>
          </section>
          <nav className="ep-tabs" aria-label="企业档案分区">{tabs.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>
          {savedNotice && <div className="ep-save-notice">资料修改已保存在当前页面状态。正式持久化服务尚未连接。</div>}
          <section className="ep-tab-content">
            <div className="ep-tab-heading"><div><div className="ep-section-kicker">ENTERPRISE INTELLIGENCE</div><h2>{tabCopy[activeTab].title}</h2><p>{tabCopy[activeTab].description}</p></div><span className="ep-live-label"><i /> 在线工作区</span></div>
            {activeTab === "overview" && <>
              {editing && <EditCompanyForm name={companyName} website={companyWebsite} country={companyCountry} industry={companyIndustry} summary={companySummary} onName={setCompanyName} onWebsite={setCompanyWebsite} onCountry={setCompanyCountry} onIndustry={setCompanyIndustry} onSummary={setCompanySummary} onSave={saveChanges} onCancel={() => setEditing(false)} />}
              <div className="ep-overview-grid">
                <article className="ep-panel ep-summary-panel"><div className="ep-panel-label">企业简介 <span>PROFILE SUMMARY</span></div><p>{companySummary || "尚未添加经过来源核验的企业简介。补充企业官网、注册地和业务资料后，可逐步形成有证据支持的企业画像。"}</p><button className="ep-text-action" type="button" onClick={() => { setActiveTab("company"); setEditing(true); }}>完善企业资料 <ArrowRight size={14} /></button></article>
                <article className="ep-panel"><div className="ep-panel-label">身份与资料状态 <span>DATA STATUS</span></div><div className="ep-status-list"><div><span>身份确认</span><b className="green">用户已确认</b></div><div><span>已填写核心字段</span><b>{sourceCount} 项</b></div><div><span>外部来源核验</span><b className="muted">尚未连接</b></div><div><span>AI 情报分析</span><b className="muted">待接入分析服务</b></div></div></article>
                <article className="ep-panel ep-wide-panel"><div className="ep-panel-label">客户开发工作流 <span>CUSTOMER DEVELOPMENT</span></div><div className="ep-workflow"><div><b>01</b><strong>了解企业</strong><small>业务、产品、规模与市场</small></div><ArrowRight size={16} /><div><b>02</b><strong>识别需求</strong><small>潜在采购与业务痛点</small></div><ArrowRight size={16} /><div><b>03</b><strong>寻找联系人</strong><small>公开商务角色与渠道</small></div><ArrowRight size={16} /><div><b>04</b><strong>制定开发策略</strong><small>切入点与下一步行动</small></div></div></article>
              </div>
            </>}
            {activeTab === "company" && <div className="ep-panel ep-detail-panel"><div className="ep-panel-toolbar"><div><b>企业基本资料</b><small>资料字段支持后续补充和来源核验。</small></div><button className="ep-button-secondary" type="button" onClick={() => setEditing((v) => !v)}>{editing ? "关闭编辑" : "编辑字段"}</button></div>{editing ? <EditCompanyForm name={companyName} website={companyWebsite} country={companyCountry} industry={companyIndustry} summary={companySummary} onName={setCompanyName} onWebsite={setCompanyWebsite} onCountry={setCompanyCountry} onIndustry={setCompanyIndustry} onSummary={setCompanySummary} onSave={saveChanges} onCancel={() => setEditing(false)} /> : <div className="ep-field-grid"><InfoField label="企业名称" value={companyName} /><InfoField label="官方网站" value={companyWebsite} /><InfoField label="总部国家 / 地区" value={companyCountry} /><InfoField label="主要行业" value={companyIndustry} /><InfoField label="注册编号" value="待补充" /><InfoField label="成立日期" value="待补充" /><InfoField label="企业类型" value="待补充" /><InfoField label="员工规模" value="待补充" /><InfoField label="企业简介" value={companySummary || "待补充"} wide /></div>}</div>}
            {activeTab === "products" && <EmptyIntelligence title="产品与服务信息待采集" description="添加企业官网或公开产品资料后，在此整理产品类别、服务能力、技术特点，以及可能涉及的采购和供应需求。" />}
            {activeTab === "global" && <EmptyIntelligence title="全球业务布局待核验" description="后续展示总部、分支机构、运营国家、销售市场和生产研发地点。每个地点均需关联可追溯来源。" />}
            {activeTab === "relationships" && <EmptyIntelligence title="尚无已核验的商业关系" description="这里用于整理客户、供应商、分销商、合作伙伴和关联企业。只有获得来源支持的关系才会标记为已确认。" />}
            {activeTab === "intelligence" && <div className="ep-intelligence-layout"><div className="ep-panel ep-intro-panel"><div className="ep-panel-label">CUSTOMER DEVELOPMENT INTELLIGENCE <span>在线分析</span></div><h3>把企业信息转化为客户开发线索</h3><p>围绕目标企业的业务、产品、采购可能性、市场布局和公开商务角色，形成可追溯的开发研究。</p><div className="ep-analysis-state"><span className="ep-status pending">分析服务待连接</span><small>当前不会生成未经证据支持的客户评分或采购结论。</small></div></div><div className="ep-intelligence-cards">
              <article className="ep-panel"><span className="ep-card-index">01 / FIT</span><h4>潜在客户匹配度</h4><p>结合你的产品或服务与目标企业需求评估匹配程度。</p><b>等待产品与目标客户画像</b></article>
              <article className="ep-panel"><span className="ep-card-index">02 / NEED</span><h4>需求与采购信号</h4><p>寻找公开招标、采购公告、扩产和业务变化等信号。</p><b>等待公开来源接入</b></article>
              <article className="ep-panel"><span className="ep-card-index">03 / CONTACT</span><h4>潜在决策角色</h4><p>识别公开可验证的采购、业务、技术和管理角色。</p><b>等待联系人来源接入</b></article>
              <article className="ep-panel"><span className="ep-card-index">04 / ACTION</span><h4>客户开发切入点</h4><p>整理联系理由、价值主张和建议的下一步行动。</p><b>等待企业情报与产品信息</b></article>
            </div><div className="ep-panel ep-next-step"><div><b>下一步：完善目标企业资料</b><p>企业身份已确认。补充官网、行业和主营业务后，才能开展有依据的客户开发分析。</p></div><button className="ep-button-primary" type="button" onClick={() => { setActiveTab("company"); setEditing(true); }}>补充企业资料 <ArrowRight size={15} /></button></div></div>}
            {activeTab === "sources" && <div className="ep-panel ep-detail-panel"><div className="ep-panel-toolbar"><div><b>来源与核验记录</b><small>每项企业事实应记录来源、采集时间、验证状态及修改历史。</small></div><span className="ep-status pending">外部来源尚未接入</span></div><button className="ep-source-row" type="button" onClick={() => setExpandedSource(expandedSource === "identity" ? "" : "identity")}><span><b>企业身份确认</b><small>用户确认 · 当前会话</small></span><span className="ep-status confirmed">用户提供</span><span>{expandedSource === "identity" ? "−" : "+"}</span></button>{expandedSource === "identity" && <div className="ep-source-detail"><p>企业名称：{companyName}</p><p>确认方式：用户明确确认目标企业身份。</p><p>注意：此记录不代表官方注册信息已完成独立验证。</p></div>}<div className="ep-source-row static"><span><b>用户修改历史</b><small>本地页面状态 · 尚未连接持久化审计服务</small></span><span className="ep-status pending">待接入</span></div><div className="ep-source-row static"><span><b>外部来源采集</b><small>官网、注册资料、公开商业信息</small></span><span className="ep-status pending">待接入</span></div></div>}
          </section>
        </>
      )}
      <div className="ep-page-footer"><span>KOSMOEVRETIS · ENTERPRISE PROFILE</span><span>客户开发情报 · 证据优先</span></div>
    </div>
  );
}

function InfoField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={"ep-info-field" + (wide ? " wide" : "")}><span>{label}</span><b>{value || "待补充"}</b><small>来源状态：待核验</small></div>;
}

function EditCompanyForm({ name, website, country, industry, summary, onName, onWebsite, onCountry, onIndustry, onSummary, onSave, onCancel }: {
  name: string; website: string; country: string; industry: string; summary: string;
  onName: (v: string) => void; onWebsite: (v: string) => void; onCountry: (v: string) => void; onIndustry: (v: string) => void; onSummary: (v: string) => void; onSave: () => void; onCancel: () => void;
}) {
  return <div className="ep-edit-form"><div className="ep-edit-heading"><b>编辑企业资料</b><small>当前编辑仅保存在页面状态；正式保存和审计服务尚未连接。</small></div><div className="ep-field-grid"><div className="ep-form-block"><label>企业名称</label><input value={name} onChange={(e) => onName(e.target.value)} /></div><div className="ep-form-block"><label>官方网站</label><input value={website} onChange={(e) => onWebsite(e.target.value)} placeholder="https://" /></div><div className="ep-form-block"><label>总部国家 / 地区</label><input value={country} onChange={(e) => onCountry(e.target.value)} /></div><div className="ep-form-block"><label>主要行业</label><input value={industry} onChange={(e) => onIndustry(e.target.value)} /></div><div className="ep-form-block ep-wide-input"><label>企业简介</label><textarea rows={3} value={summary} onChange={(e) => onSummary(e.target.value)} placeholder="填写已知业务信息，后续应关联公开来源。" /></div></div><div className="ep-actions"><button type="button" className="ep-button-secondary" onClick={onCancel}>取消</button><button type="button" className="ep-button-primary" onClick={onSave}>保存修改</button></div></div>;
}

function EmptyIntelligence({ title, description }: { title: string; description: string }) {
  return <div className="ep-empty-panel"><div className="ep-empty-icon"><Globe size={23} /></div><h3>{title}</h3><p>{description}</p><span>模块结构已就绪 · 数据接入待开发</span></div>;
}
