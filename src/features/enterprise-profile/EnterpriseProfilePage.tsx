import { useEffect, useState } from "react";
import {
  Button, TextInput, TextArea, InlineNotification, Tag,
  Accordion, AccordionItem, Dropdown, Modal
} from "@carbon/react";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";

type Profile = {
  id: string; display_name: string; legal_name: string | null; website: string | null;
  country: string | null; industry: string | null; profile: Record<string, any>;
  version: number; updated_at: string; identity_status?: string;
};
type Revision = {
  id: string; version: number; snapshot: Record<string, any>;
  change_summary: string | null; changed_by: string; created_at: string;
};
type ProfileField = [string, string];

const profileSections: { title: string; description: string; fields: ProfileField[] }[] = [
  {
    title: "企业身份与注册信息",
    description: "企业名称沿革、法定主体、注册与总部信息",
    fields: [
      ["shortName", "企业简称"], ["formerNames", "曾用名 / 历史名称"],
      ["registeredAddress", "注册地与注册地址"], ["registrationNumber", "统一社会信用代码 / 注册编号"],
      ["headquarters", "总部所在地"], ["establishedDate", "成立日期"],
      ["enterpriseStatus", "企业状态"], ["parentCompany", "母公司 / 控股关系"]
    ]
  },
  {
    title: "业务与产品能力",
    description: "经营范围、产品组合、技术资产与商业模式",
    fields: [
      ["businessScope", "经营范围"], ["businessSegments", "核心业务板块"],
      ["productsServices", "产品与服务"], ["technicalCapabilities", "技术能力"],
      ["certifications", "资质认证与行业许可"], ["patents", "专利、知识产权与技术成果"],
      ["businessModel", "商业模式"]
    ]
  },
  {
    title: "客户与全球市场",
    description: "客户类型、覆盖市场、出口区域与销售渠道",
    fields: [
      ["targetCustomers", "目标客户与客户画像"], ["marketCoverage", "市场覆盖区域"],
      ["exportMarkets", "出口国家 / 国际市场"], ["salesChannels", "销售渠道与获客方式"],
      ["languages", "业务语言与本地化能力"], ["globalBranches", "全球分支机构"]
    ]
  },
  {
    title: "规模、运营与商业关系",
    description: "人员、营收、产能、供应链及合作伙伴网络",
    fields: [
      ["companySize", "企业规模概况"], ["employeeCount", "员工人数 / 组织规模"],
      ["revenueRange", "营收规模 / 财务区间（可选）"], ["annualCapacity", "年产能 / 服务交付能力"],
      ["businessRelationships", "商业关系（供应商、客户、渠道、合作伙伴等）"]
    ]
  }
];
const profileFields: ProfileField[] = profileSections.flatMap((section) => section.fields);
const sourceFields: ProfileField[] = [["display_name", "企业名称"], ["legal_name", "法定名称"], ["website", "官方网站"], ["country", "国家 / 地区"], ["industry", "所属行业"], ...profileFields];
const getSnapshotField = (snapshot: Record<string, any>, key: string) => ["display_name", "legal_name", "website", "country", "industry"].includes(key) ? snapshot?.[key] : snapshot?.profile?.[key];
const verificationOptions = ["待核实", "用户确认", "外部核实"];

function FieldGroup({
  fields, details, onChange
}: {
  fields: ProfileField[];
  details: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return <div className="profile-section-grid">
    {fields.map(([key, label]) => <TextArea
      key={key} id={"profile-" + key} labelText={label}
      value={details[key] || ""} onChange={(event) => onChange(key, event.target.value)} rows={2}
    />)}
  </div>;
}

export function EnterpriseProfilePage({
  embedded = false, initialProfileId, onContinue
}: {
  embedded?: boolean; initialProfileId?: string; onContinue?: (profile: Profile) => void;
} = {}) {
  const { session, workspace } = useAuth();
  const [items, setItems] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [history, setHistory] = useState<Revision[]>([]);
  const [name, setName] = useState("");
  const [legal, setLegal] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [fieldVerification, setFieldVerification] = useState<Record<string, string>>({});

  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    if (!workspace) return;
    const { data, error } = await requireSupabase().from("enterprise_profiles")
      .select("*").eq("organization_id", workspace.id).order("updated_at", { ascending: false });
    if (error) throw error;
    setItems((data || []) as Profile[]);
  };

  const loadHistory = async (id: string) => {
    const { data, error } = await requireSupabase().from("enterprise_profile_revisions")
      .select("*").eq("profile_id", id).order("version", { ascending: false });
    if (error) throw error;
    setHistory((data || []) as Revision[]);
  };

  const clear = () => {
    setSelected(null); setName(""); setLegal(""); setWebsite(""); setCountry(""); setIndustry("");
    setSummary(""); setDetails({}); setFieldSources({}); setFieldVerification({});
    setHistory([]); setNotice(""); setError("");
  };

  const edit = (profile: Profile) => {
    setSelected(profile);
    setName(profile.display_name);
    setLegal(profile.legal_name || "");
    setWebsite(profile.website || "");
    setCountry(profile.country || "");
    setIndustry(profile.industry || "");
    setSummary(String(profile.profile?.summary || ""));
    setDetails(Object.fromEntries(profileFields.map(([key]) => [key, String(profile.profile?.[key] ?? "")])));
    setFieldSources(profile.profile?._fieldSources || {});
    setFieldVerification(profile.profile?._fieldVerification || {});
    setNotice(""); setError(""); setExpandedRevision(null);
    void loadHistory(profile.id).catch((loadError) => setError(loadError.message));
  };

  useEffect(() => { void load().catch((loadError) => setError(loadError.message)); }, [workspace?.id]);
  useEffect(() => {
    if (!workspace?.id || !initialProfileId) return;
    void requireSupabase().from("enterprise_profiles").select("*")
      .eq("id", initialProfileId).eq("organization_id", workspace.id).single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) edit(data as Profile);
      });
  }, [workspace?.id, initialProfileId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !workspace) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const client = requireSupabase();
      const row = {
        organization_id: workspace.id,
        display_name: name.trim(),
        legal_name: legal.trim() || null,
        website: website.trim() || null,
        country: country.trim() || null,
        industry: industry.trim() || null,
        profile: { summary, ...details, _fieldSources: fieldSources, _fieldVerification: fieldVerification },
        updated_by: session.user.id
      };
      let saved: Profile;
      if (selected) {
        const { data, error } = await client.from("enterprise_profiles").update(row)
          .eq("id", selected.id).select("*").single();
        if (error) throw error;
        saved = data as Profile;
      } else {
        const { data, error } = await client.from("enterprise_profiles").insert({
          ...row, created_by: session.user.id
        }).select("*").single();
        if (error) throw error;
        saved = data as Profile;
      }
      await load();
      edit(saved);
      setNotice("企业档案已保存，数据库已生成版本快照。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (revision: Revision) => {
    if (!session || !selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const snapshot = revision.snapshot;
      const { error } = await requireSupabase().from("enterprise_profiles").update({
        display_name: snapshot.display_name, legal_name: snapshot.legal_name,
        website: snapshot.website, country: snapshot.country, industry: snapshot.industry,
        profile: snapshot.profile, identity_status: snapshot.identity_status,
        updated_by: session.user.id
      }).eq("id", selected.id);
      if (error) throw error;
      await load();
      const { data, error: readError } = await requireSupabase().from("enterprise_profiles")
        .select("*").eq("id", selected.id).single();
      if (readError) throw readError;
      edit(data as Profile);
      setNotice("历史版本已恢复；系统保留本次恢复操作并生成新的当前版本。");
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "恢复失败");
    } finally {
      setBusy(false); setRestoreTarget(null);
    }
  };

  const updateDetail = (key: string, value: string) => setDetails((current) => ({ ...current, [key]: value }));
  const companyFields: ProfileField[] = profileSections[0].fields;
  const productFields: ProfileField[] = profileSections[1].fields;
  const globalFields: ProfileField[] = profileSections[2].fields;
  const relationshipFields: ProfileField[] = profileSections[3].fields;

  return <div className="enterprise-page">
    {!embedded && <header className="ep-page-heading">
      <div><div className="ep-eyebrow"><i/> VERIFIED BUSINESS CONTEXT</div><h1>企业档案</h1><p>以结构化企业信息、字段来源和版本记录建立可信的 AI 分析基础。</p></div>
      <Tag type="blue">{workspace?.name || "工作空间"}</Tag>
    </header>}

    <div className="profile-workspace">
      <aside className="profile-list">
        <div className="profile-list-head"><b>企业档案</b><Button size="sm" onClick={clear}>新建</Button></div>
        {items.map((item) => <button key={item.id}
          className={"profile-list-item" + (selected?.id === item.id ? " selected" : "")}
          onClick={() => edit(item)}>
          <b>{item.display_name}</b><small>v{item.version} · {new Date(item.updated_at).toLocaleDateString()}</small>
        </button>)}
        {!items.length && <p className="ep-muted">暂无档案，请创建第一份企业档案。</p>}
      </aside>

      <section className="profile-editor">
        <div className="ep-section-kicker">{selected ? "EDIT PROFILE" : "NEW PROFILE"}</div>
        <h2>{selected ? "修改企业档案" : "创建企业档案"}</h2>
        {error && <InlineNotification kind="error" title="操作失败" subtitle={error} />}
        {notice && <InlineNotification kind="success" title="已完成" subtitle={notice} />}

        <form className="profile-form" onSubmit={save}>
          <Accordion className="profile-accordion" align="start">
            <AccordionItem title="企业信息 · Company Information" open>
              <div className="profile-tab-intro"><h3>企业身份与注册信息</h3><p>确认企业主体、法定信息、注册地、总部与基本经营背景。</p></div>
              <TextInput id="profile-name" labelText="企业名称 *" value={name} onChange={(event) => setName(event.target.value)} required />
              <div className="profile-two">
                <TextInput id="profile-legal" labelText="法定名称" value={legal} onChange={(event) => setLegal(event.target.value)} />
                <TextInput id="profile-short" labelText="企业简称" value={details.shortName || ""} onChange={(event) => updateDetail("shortName", event.target.value)} />
              </div>
              <div className="profile-two">
                <TextInput id="profile-website" labelText="官方网站" value={website} onChange={(event) => setWebsite(event.target.value)} />
                <TextInput id="profile-country" labelText="注册国家 / 地区" value={country} onChange={(event) => setCountry(event.target.value)} />
              </div>
              <TextInput id="profile-industry" labelText="所属行业" value={industry} onChange={(event) => setIndustry(event.target.value)} />
              <TextArea id="profile-summary" labelText="企业简介 / AI 分析上下文" value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} />
              <FieldGroup fields={companyFields.filter(([key]) => key !== "shortName")} details={details} onChange={updateDetail} />
              <div className="profile-overview-meta"><span>档案版本 <b>{selected ? "v" + selected.version : "尚未保存"}</b></span><span>身份核验 <b>{selected?.identity_status === "externally_verified" ? "外部核实" : selected?.identity_status === "user_confirmed" ? "用户确认" : "待核实"}</b></span></div>
            </AccordionItem>
            <AccordionItem title="产品与服务 · Products & Services">
              <div className="profile-tab-intro"><h3>产品与服务能力</h3><p>{profileSections[1].description}</p></div>
              <FieldGroup fields={productFields} details={details} onChange={updateDetail} />
            </AccordionItem>
            <AccordionItem title="全球市场布局 · Global Market Presence">
              <div className="profile-tab-intro"><h3>全球市场布局</h3><p>{profileSections[2].description}</p></div>
              <FieldGroup fields={globalFields} details={details} onChange={updateDetail} />
            </AccordionItem>
            <AccordionItem title="企业规模与商业关系 · Scale & Relationships">
              <div className="profile-tab-intro"><h3>规模、运营与商业关系</h3><p>{profileSections[3].description}</p></div>
              <FieldGroup fields={relationshipFields} details={details} onChange={updateDetail} />
            </AccordionItem>
            <AccordionItem title="AI 分析准备度 · AI Intelligence">
              <div className="profile-tab-intro"><h3>AI 分析准备度</h3><p>企业档案将作为后续 12 维度分析的事实基础。每次分析会保存本次档案快照，不会因后续资料修改而改变历史报告。</p></div>
              <div className="profile-ai-readiness">
                <div><b>{selected ? "v" + selected.version : "未保存"}</b><span>当前企业档案版本</span></div>
                <div><b>{Object.values(details).filter((value) => value.trim()).length + [name, legal, website, country, industry, summary].filter(Boolean).length}</b><span>已填写资料字段</span></div>
                <div><b>12</b><span>可执行 AI 分析维度</span></div>
              </div>
            </AccordionItem>
            <AccordionItem title="来源、核验与历史版本 · Sources & Verification">
              <div className="profile-tab-intro"><h3>来源与核验</h3><p>为重要企业资料记录来源，并标注核验状态。来源信息随企业档案快照一同保存。</p></div>
              <div className="profile-source-list">
                {sourceFields.map(([key, label]) => <div className="profile-source-row" key={key}>
                  <b>{label}</b>
                  <TextInput id={"source-" + key} labelText="信息来源 / URL / 文件" hideLabel value={fieldSources[key] || ""} placeholder="填写来源链接或资料名称" onChange={(event) => setFieldSources((current) => ({ ...current, [key]: event.target.value }))} />
                  <Dropdown id={"verification-" + key} titleText="核验状态" label="核验状态" items={verificationOptions} selectedItem={fieldVerification[key] || verificationOptions[0]} onChange={({ selectedItem }) => setFieldVerification((current) => ({ ...current, [key]: selectedItem || verificationOptions[0] }))} />
                </div>)}
              </div>
              <div className="revision-panel profile-history-panel">
                <h3>修改历史与版本追溯</h3>
                {history.map((revision) => {
                  const changed = sourceFields.filter(([key]) => String(getSnapshotField(revision.snapshot, key) ?? "") !== String(getSnapshotField(selected as unknown as Record<string, any>, key) ?? ""));
                  const expanded = expandedRevision === revision.id;
                  return <article className="profile-revision-entry" key={revision.id}>
                    <div className="revision-row">
                      <div><b>版本 {revision.version}</b><small>{new Date(revision.created_at).toLocaleString()} · 操作人 {revision.changed_by}</small></div>
                      <div className="profile-revision-actions">
                        <Button size="sm" kind="ghost" onClick={() => setExpandedRevision(expanded ? null : revision.id)}>{expanded ? "收起变更" : "查看变更"}</Button>
                        <Button size="sm" kind="tertiary" disabled={busy || revision.version === selected?.version} onClick={() => setRestoreTarget(revision)}>恢复此版本</Button>
                      </div>
                    </div>
                    {expanded && <div className="profile-revision-diff">
                      {!changed.length && <p className="ep-muted">此版本与当前档案在扩展字段上没有差异。</p>}
                      {changed.map(([key, label]) => <div key={key}><b>{label}</b><span>历史值：{String(getSnapshotField(revision.snapshot, key) ?? "未填写")}</span><span>当前值：{String(getSnapshotField(selected as unknown as Record<string, any>, key) ?? "未填写")}</span></div>)}
                    </div>}
                  </article>;
                })}
                {!history.length && <p className="ep-muted">保存档案后，数据库版本记录会显示在这里。</p>}
              </div>
            </AccordionItem>
          </Accordion>

          <div className="profile-actions">
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? "保存中…" : "保存档案"}</Button>
            {selected && <Button type="button" kind="tertiary" onClick={clear}>新建另一份</Button>}
            {onContinue && <Button type="button" kind="primary" disabled={!selected || busy} onClick={() => { if (selected) onContinue(selected); }}>下一步：AI 配置</Button>}
          </div>
        </form>
      </section>
    </div>

    <Modal
      open={Boolean(restoreTarget)}
      modalHeading="确认恢复历史版本"
      primaryButtonText="确认恢复"
      secondaryButtonText="取消"
      danger
      onRequestClose={() => setRestoreTarget(null)}
      onRequestSubmit={() => { if (restoreTarget) void restore(restoreTarget); }}
    >
      <p>即将恢复到版本 {restoreTarget?.version}。当前资料不会被直接覆盖丢失，系统会保留本次恢复前的版本快照，并生成新的当前版本。</p>
    </Modal>
  </div>;
}
