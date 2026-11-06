import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, InlineNotification, Search, Select, SelectItem, Tag, TextArea, TextInput,
  Tile, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow
} from "@carbon/react";
import { Add, Building, Renew, UserMultiple } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./customer-center.css";

type Lead = {
  id: string;
  company_id: string;
  source: string;
  source_url: string | null;
  product_interest: string | null;
  intent_summary: string | null;
  status: string;
  score: number;
  created_at: string;
  crm_companies: { name: string; website: string | null; country: string | null; industry: string | null } | null;
};
type FormState = { company: string; website: string; country: string; industry: string; product: string; source: string; sourceUrl: string; summary: string };
const emptyForm: FormState = { company: "", website: "", country: "", industry: "消费电子", product: "", source: "manual", sourceUrl: "", summary: "" };
const statusLabels: Record<string, string> = { new: "新线索", qualified: "已筛选", contacted: "已联系", negotiating: "洽谈中", converted: "已转化", disqualified: "已排除" };
const sourceLabels: Record<string, string> = { manual: "手动录入", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", google_maps: "Google Maps", whatsapp: "WhatsApp", messenger: "Messenger", website: "网站", trade_show: "展会", referral: "客户推荐", other: "其他" };

export default function CustomerCenter() {
  const [organizationId, setOrganizationId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLeads = useCallback(async (orgId: string) => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("crm_leads")
      .select("id, company_id, source, source_url, product_interest, intent_summary, status, score, created_at, crm_companies(name, website, country, industry)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(250);
    if (loadError) setError(loadError.message);
    else setLeads((data || []) as unknown as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) throw new Error("登录状态已失效，请重新登录。");
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.organization_id) throw new Error("当前账号尚未加入企业工作区。");
      if (!active) return;
      setOrganizationId(membership.organization_id);
      await loadLeads(membership.organization_id);
    };
    initialize().catch((cause) => {
      if (active) { setError(cause instanceof Error ? cause.message : "无法初始化客户中心。"); setLoading(false); }
    });
    return () => { active = false; };
  }, [loadLeads]);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const text = [lead.crm_companies?.name, lead.crm_companies?.country, lead.product_interest, lead.intent_summary, sourceLabels[lead.source] || lead.source]
      .filter(Boolean).join(" ").toLowerCase();
    return (statusFilter === "all" || lead.status === statusFilter) && text.includes(query.toLowerCase());
  }), [leads, query, statusFilter]);

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const createLead = async () => {
    if (!organizationId || !form.company.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      let companyId: string | null = null;
      const normalizedWebsite = form.website.trim().replace(/\/$/, "");
      if (normalizedWebsite) {
        const { data: existing, error: lookupError } = await supabase.from("crm_companies")
          .select("id").eq("organization_id", organizationId).eq("website_normalized", normalizedWebsite.toLowerCase()).maybeSingle();
        if (lookupError) throw lookupError;
        companyId = existing?.id || null;
      }
      if (!companyId) {
        const { data: company, error: companyError } = await supabase.from("crm_companies").insert({
          organization_id: organizationId, name: form.company.trim(), website: normalizedWebsite || null,
          website_normalized: normalizedWebsite ? normalizedWebsite.toLowerCase() : null,
          country: form.country.trim() || null, industry: form.industry.trim() || null, created_by: (await supabase.auth.getUser()).data.user?.id
        }).select("id").single();
        if (companyError) throw companyError;
        companyId = company.id;
      }
      const { data: createdLead, error: leadError } = await supabase.from("crm_leads").insert({
        organization_id: organizationId, company_id: companyId, source: form.source,
        source_url: form.sourceUrl.trim() || null, product_interest: form.product.trim() || null,
        intent_summary: form.summary.trim() || null, status: "new", score: 0,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }).select("id").single();
      if (leadError) throw leadError;
      const { error: activityError } = await supabase.from("crm_activities").insert({ organization_id: organizationId, company_id: companyId, lead_id: createdLead.id, channel: "internal", activity_type: "system", subject: "新增客户线索", body: "通过" + (sourceLabels[form.source] || form.source) + "创建客户线索。" });
      if (activityError) console.warn("CRM activity timeline insert failed:", activityError.message);
      setForm(emptyForm); setShowForm(false); setNotice("客户线索已保存。");
      await loadLeads(organizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存线索失败。");
    } finally { setSaving(false); }
  };

  const updateLeadStatus = async (lead: Lead, nextStatus: string) => {\n    const { error: updateError } = await supabase.from("crm_leads").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", lead.id).eq("organization_id", organizationId);\n    if (updateError) { setError(updateError.message); return; }\n    const { error: activityError } = await supabase.from("crm_activities").insert({ organization_id: organizationId, company_id: lead.company_id, lead_id: lead.id, channel: "internal", activity_type: "follow_up", subject: "更新线索状态", body: "线索状态更新为：" + (statusLabels[nextStatus] || nextStatus) });\n    if (activityError) console.warn("CRM activity timeline insert failed:", activityError.message);\n    await loadLeads(organizationId);\n  };\n\n  const counts = useMemo(() => ({
    total: leads.length,
    new: leads.filter((item) => item.status === "new").length,
    active: leads.filter((item) => ["qualified", "contacted", "negotiating"].includes(item.status)).length,
    converted: leads.filter((item) => item.status === "converted").length
  }), [leads]);

  return <ConfigurationPageTemplate className="module customer-center" title="全球客户中心"
    description="统一管理全球潜在买家、客户档案与采购意向。将市场发现结果沉淀为可持续跟进的外贸客户资产。"
    eyebrow="GLOBAL CUSTOMER & CRM" headingLevel={1}>
    <PageSection title="客户与线索" description="按企业归档客户来源、产品兴趣和采购需求。" headingLevel={3}>
      {error && <InlineNotification kind="error" lowContrast title="客户数据加载或保存失败" subtitle={error} onCloseButtonClick={() => setError("")} />}
      {notice && <InlineNotification kind="success" lowContrast title="操作完成" subtitle={notice} onCloseButtonClick={() => setNotice("")} />}
      <div className="crm-metrics">
        <Tile><span className="crm-metric-label">全部线索</span><strong>{counts.total}</strong></Tile>
        <Tile><span className="crm-metric-label">待处理</span><strong>{counts.new}</strong></Tile>
        <Tile><span className="crm-metric-label">跟进中</span><strong>{counts.active}</strong></Tile>
        <Tile><span className="crm-metric-label">已转化</span><strong>{counts.converted}</strong></Tile>
      </div>
      <div className="crm-toolbar">
        <Search size="lg" labelText="搜索客户" placeholder="搜索企业、国家、产品或采购需求" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select id="crm-status-filter" labelText="线索状态" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <SelectItem value="all" text="全部状态" />
          <SelectItem value="new" text="新线索" />
          <SelectItem value="qualified" text="已筛选" />
          <SelectItem value="contacted" text="已联系" />
          <SelectItem value="negotiating" text="洽谈中" />
          <SelectItem value="converted" text="已转化" />
          <SelectItem value="disqualified" text="已排除" />
        </Select>
        <Button kind="tertiary" renderIcon={Renew} hasIconOnly iconDescription="刷新客户数据" onClick={() => organizationId && void loadLeads(organizationId)} />
        <Button kind="primary" renderIcon={Add} onClick={() => setShowForm((value) => !value)}>新增客户线索</Button>
      </div>
      {showForm && <Tile className="crm-create-panel">
        <div className="crm-form-heading"><div><h3>新增潜在客户</h3><p>先建立企业档案，再登记本次发现的线索及采购兴趣。</p></div><Tag type="blue">人工录入</Tag></div>
        <div className="crm-form-grid">
          <TextInput id="crm-company" labelText="企业名称 *" value={form.company} onChange={(event) => updateForm("company", event.target.value)} placeholder="例如：Global Electronics Trading" />
          <TextInput id="crm-website" labelText="企业网站" value={form.website} onChange={(event) => updateForm("website", event.target.value)} placeholder="https://example.com" />
          <TextInput id="crm-country" labelText="国家 / 地区" value={form.country} onChange={(event) => updateForm("country", event.target.value)} placeholder="例如：Germany" />
          <TextInput id="crm-industry" labelText="行业" value={form.industry} onChange={(event) => updateForm("industry", event.target.value)} />
          <TextInput id="crm-product" labelText="感兴趣的产品" value={form.product} onChange={(event) => updateForm("product", event.target.value)} placeholder="例如：TWS 耳机、智能家居" />
          <Select id="crm-source" labelText="线索来源" value={form.source} onChange={(event) => updateForm("source", event.target.value)}>
            {Object.entries(sourceLabels).map(([value, label]) => <SelectItem key={value} value={value} text={label} />)}
          </Select>
          <TextInput id="crm-source-url" labelText="来源链接" value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} placeholder="公开主页、网站或原始内容链接" />
          <TextArea id="crm-summary" labelText="采购需求 / 客户备注" value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} rows={3} placeholder="记录客户可能的采购需求、目标市场或合作信息" />
        </div>
        <div className="crm-form-actions">
          <Button kind="secondary" onClick={() => setShowForm(false)}>取消</Button>
          <Button kind="primary" disabled={!form.company.trim() || saving} loading={saving} onClick={() => void createLead()}>保存客户线索</Button>
        </div>
      </Tile>}
      {loading ? <div className="crm-empty">正在加载客户数据…</div> : filteredLeads.length === 0 ? <div className="crm-empty"><UserMultiple size={28}/><strong>暂无匹配的客户线索</strong><span>可先新增客户，或将市场情报与社媒发现的线索接入客户中心。</span></div> :
        <div className="crm-table-wrap"><TableContainer title="客户线索列表"><Table size="lg" useZebraStyles>
          <TableHead><TableRow>
            <TableHeader>企业</TableHeader><TableHeader>国家 / 地区</TableHeader><TableHeader>产品兴趣</TableHeader><TableHeader>来源</TableHeader><TableHeader>状态 / 跟进</TableHeader><TableHeader>评分</TableHeader><TableHeader>创建时间</TableHeader>
          </TableRow></TableHead><TableBody>{filteredLeads.map((lead) => <TableRow key={lead.id}>
            <TableCell><div className="crm-company-cell"><Building size={16}/><div><strong>{lead.crm_companies?.name || "未命名企业"}</strong>{lead.crm_companies?.website && <a href={lead.crm_companies.website} target="_blank" rel="noreferrer">{lead.crm_companies.website}</a>}</div></div></TableCell>
            <TableCell>{lead.crm_companies?.country || "—"}</TableCell><TableCell>{lead.product_interest || "—"}</TableCell>
            <TableCell>{sourceLabels[lead.source] || lead.source}</TableCell><TableCell><Select id={"crm-lead-status-" + lead.id} labelText="" hideLabel size="sm" value={lead.status} onChange={(event) => void updateLeadStatus(lead, event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value} text={label} />)}</Select></TableCell>
            <TableCell>{lead.score}</TableCell><TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer></div>}
    </PageSection>
  </ConfigurationPageTemplate>;
}
