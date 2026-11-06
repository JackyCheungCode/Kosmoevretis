import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Dropdown, InlineNotification, Search, Tag, TextArea, TextInput,
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
type Contact = { id: string; full_name: string; job_title: string | null; email: string | null; phone: string | null; preferred_language: string | null; notes: string | null; };
type Activity = { id: string; channel: string; activity_type: string; subject: string | null; body: string; occurred_at: string; };
type FormState = { company: string; website: string; country: string; industry: string; product: string; source: string; sourceUrl: string; summary: string };
const emptyForm: FormState = { company: "", website: "", country: "", industry: "消费电子", product: "", source: "manual", sourceUrl: "", summary: "" };
const statusLabels: Record<string, string> = { new: "新线索", qualified: "已筛选", contacted: "已联系", negotiating: "洽谈中", converted: "已转化", disqualified: "已排除" };
const sourceLabels: Record<string, string> = { manual: "手动录入", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", google_maps: "Google Maps", whatsapp: "WhatsApp", messenger: "Messenger", website: "网站", trade_show: "展会", referral: "客户推荐", other: "其他" };
const statusItems = [{ id: "all", text: "全部状态" }, ...Object.entries(statusLabels).map(([id, text]) => ({ id, text }))];
const sourceItems = Object.entries(sourceLabels).map(([id, text]) => ({ id, text }));
const itemToString = (item: { id: string; text: string } | null) => item?.text || "";

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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contactForm, setContactForm] = useState({ full_name: "", job_title: "", email: "", phone: "", preferred_language: "", notes: "" });
  const [activityForm, setActivityForm] = useState({ subject: "", body: "" });

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

  const updateLeadStatus = async (lead: Lead, nextStatus: string) => {
    const { error: updateError } = await supabase.from("crm_leads").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", lead.id).eq("organization_id", organizationId);
    if (updateError) { setError(updateError.message); return; }
    const { error: activityError } = await supabase.from("crm_activities").insert({ organization_id: organizationId, company_id: lead.company_id, lead_id: lead.id, channel: "internal", activity_type: "follow_up", subject: "更新线索状态", body: "线索状态更新为：" + (statusLabels[nextStatus] || nextStatus) });
    if (activityError) console.warn("CRM activity timeline insert failed:", activityError.message);
    await loadLeads(organizationId);
  };

  useEffect(() => {
    if (!selectedLead || !organizationId) { setContacts([]); setActivities([]); return; }
    let active = true;
    setDetailLoading(true);
    Promise.all([
      supabase.from("crm_contacts").select("id, full_name, job_title, email, phone, preferred_language, notes").eq("organization_id", organizationId).eq("company_id", selectedLead.company_id).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("id, channel, activity_type, subject, body, occurred_at").eq("organization_id", organizationId).eq("company_id", selectedLead.company_id).order("occurred_at", { ascending: false }).limit(30)
    ]).then(([contactResult, activityResult]) => {
      if (!active) return;
      if (contactResult.error) setError(contactResult.error.message); else setContacts((contactResult.data || []) as Contact[]);
      if (activityResult.error) setError(activityResult.error.message); else setActivities((activityResult.data || []) as Activity[]);
    }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedLead, organizationId]);

  const createContact = async () => {
    if (!selectedLead || !organizationId || !contactForm.full_name.trim()) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("crm_contacts").insert({
      organization_id: organizationId, company_id: selectedLead.company_id,
      full_name: contactForm.full_name.trim(), job_title: contactForm.job_title.trim() || null,
      email: contactForm.email.trim() || null, phone: contactForm.phone.trim() || null,
      preferred_language: contactForm.preferred_language.trim() || null, notes: contactForm.notes.trim() || null
    });
    if (insertError) setError(insertError.message);
    else {
      setContactForm({ full_name: "", job_title: "", email: "", phone: "", preferred_language: "", notes: "" });
      const { data } = await supabase.from("crm_contacts").select("id, full_name, job_title, email, phone, preferred_language, notes").eq("organization_id", organizationId).eq("company_id", selectedLead.company_id).order("created_at", { ascending: false });
      setContacts((data || []) as Contact[]);
      setNotice("联系人已添加。");
    }
    setSaving(false);
  };

  const createActivity = async () => {
    if (!selectedLead || !organizationId || !activityForm.body.trim()) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("crm_activities").insert({
      organization_id: organizationId, company_id: selectedLead.company_id, lead_id: selectedLead.id,
      channel: "internal", activity_type: "note", subject: activityForm.subject.trim() || "客户跟进记录",
      body: activityForm.body.trim()
    });
    if (insertError) setError(insertError.message);
    else {
      setActivityForm({ subject: "", body: "" });
      const { data } = await supabase.from("crm_activities").select("id, channel, activity_type, subject, body, occurred_at").eq("organization_id", organizationId).eq("company_id", selectedLead.company_id).order("occurred_at", { ascending: false }).limit(30);
      setActivities((data || []) as Activity[]);
      setNotice("客户活动已记录。");
    }
    setSaving(false);
  };

  const counts = useMemo(() => ({
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
        <Dropdown id="crm-status-filter" titleText="线索状态" label="全部状态" items={statusItems} itemToString={itemToString} selectedItem={statusItems.find((item) => item.id === statusFilter) || statusItems[0]} onChange={({ selectedItem }) => setStatusFilter(selectedItem?.id || "all")} />
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
          <Dropdown id="crm-source" titleText="线索来源" label="选择来源" items={sourceItems} itemToString={itemToString} selectedItem={sourceItems.find((item) => item.id === form.source) || sourceItems[0]} onChange={({ selectedItem }) => updateForm("source", selectedItem?.id || "manual")} />
          <TextInput id="crm-source-url" labelText="来源链接" value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} placeholder="公开主页、网站或原始内容链接" />
          <TextArea id="crm-summary" labelText="采购需求 / 客户备注" value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} rows={3} placeholder="记录客户可能的采购需求、目标市场或合作信息" />
        </div>
        <div className="crm-form-actions">
          <Button kind="secondary" onClick={() => setShowForm(false)}>取消</Button>
          <Button kind="primary" disabled={!form.company.trim() || saving} loading={saving} onClick={() => void createLead()}>保存客户线索</Button>
        </div>
      </Tile>}
      {selectedLead && <Tile className="crm-detail-panel">
        <div className="crm-detail-heading">
          <div><h3>{selectedLead.crm_companies?.name || "客户详情"}</h3><p>客户企业档案 · 联系人 · 跟进活动</p></div>
          <Button kind="ghost" size="sm" onClick={() => setSelectedLead(null)}>关闭详情</Button>
        </div>
        {detailLoading ? <p>正在加载客户档案…</p> : <div className="crm-detail-grid">
          <section className="crm-detail-section">
            <h4>联系人 <Tag type="blue">{contacts.length}</Tag></h4>
            {contacts.length ? contacts.map((contact) => <div className="crm-contact-item" key={contact.id}>
              <strong>{contact.full_name}</strong><span>{contact.job_title || "职位未填写"}</span>
              <span>{[contact.email, contact.phone, contact.preferred_language].filter(Boolean).join(" · ") || "暂无联系方式"}</span>
            </div>) : <p className="crm-detail-muted">尚未添加联系人。</p>}
            <div className="crm-inline-form">
              <TextInput id="crm-contact-name" labelText="联系人姓名 *" value={contactForm.full_name} onChange={(event) => setContactForm((v) => ({ ...v, full_name: event.target.value }))} />
              <TextInput id="crm-contact-title" labelText="职位" value={contactForm.job_title} onChange={(event) => setContactForm((v) => ({ ...v, job_title: event.target.value }))} />
              <TextInput id="crm-contact-email" labelText="邮箱" value={contactForm.email} onChange={(event) => setContactForm((v) => ({ ...v, email: event.target.value }))} />
              <TextInput id="crm-contact-phone" labelText="电话 / WhatsApp" value={contactForm.phone} onChange={(event) => setContactForm((v) => ({ ...v, phone: event.target.value }))} />
              <TextInput id="crm-contact-language" labelText="偏好语言" value={contactForm.preferred_language} onChange={(event) => setContactForm((v) => ({ ...v, preferred_language: event.target.value }))} />
              <Button size="md" kind="tertiary" disabled={!contactForm.full_name.trim() || saving} onClick={() => void createContact()}>添加联系人</Button>
            </div>
          </section>
          <section className="crm-detail-section">
            <h4>客户活动时间线 <Tag type="cool-gray">{activities.length}</Tag></h4>
            <div className="crm-inline-form">
              <TextInput id="crm-activity-subject" labelText="记录标题" value={activityForm.subject} onChange={(event) => setActivityForm((v) => ({ ...v, subject: event.target.value }))} placeholder="例如：首次联系 / 需求确认" />
              <TextArea id="crm-activity-body" labelText="活动内容 *" rows={2} value={activityForm.body} onChange={(event) => setActivityForm((v) => ({ ...v, body: event.target.value }))} placeholder="记录沟通内容、采购需求或下一步跟进事项" />
              <Button size="md" kind="tertiary" disabled={!activityForm.body.trim() || saving} onClick={() => void createActivity()}>记录活动</Button>
            </div>
            {activities.length ? <div className="crm-timeline">{activities.map((activity) => <article key={activity.id}>
              <span className="crm-timeline-dot" /><div><strong>{activity.subject || "客户活动"}</strong><time>{new Date(activity.occurred_at).toLocaleString()}</time><p>{activity.body}</p></div>
            </article>)}</div> : <p className="crm-detail-muted">暂无活动记录。</p>}
          </section>
        </div>}
      </Tile>}
      {loading ? <div className="crm-empty">正在加载客户数据…</div> : filteredLeads.length === 0 ? <div className="crm-empty"><UserMultiple size={28}/><strong>暂无匹配的客户线索</strong><span>可先新增客户，或将市场情报与社媒发现的线索接入客户中心。</span></div> :
        <div className="crm-table-wrap"><TableContainer title="客户线索列表"><Table size="lg" useZebraStyles>
          <TableHead><TableRow>
            <TableHeader>企业</TableHeader><TableHeader>国家 / 地区</TableHeader><TableHeader>产品兴趣</TableHeader><TableHeader>来源</TableHeader><TableHeader>状态 / 跟进</TableHeader><TableHeader>评分</TableHeader><TableHeader>创建时间</TableHeader>
          </TableRow></TableHead><TableBody>{filteredLeads.map((lead) => <TableRow key={lead.id}>
            <TableCell><div className="crm-company-cell"><Building size={16}/><div><button type="button" className="crm-company-open" onClick={() => setSelectedLead(lead)}>{lead.crm_companies?.name || "未命名企业"}</button>{lead.crm_companies?.website && <a href={lead.crm_companies.website} target="_blank" rel="noreferrer">{lead.crm_companies.website}</a>}</div></div></TableCell>
            <TableCell>{lead.crm_companies?.country || "—"}</TableCell><TableCell>{lead.product_interest || "—"}</TableCell>
            <TableCell>{sourceLabels[lead.source] || lead.source}</TableCell><TableCell><Dropdown id={"crm-lead-status-" + lead.id} titleText="线索状态" aria-label="更新线索状态" size="sm" label="选择状态" items={Object.entries(statusLabels).map(([id, text]) => ({ id, text }))} itemToString={itemToString} selectedItem={{ id: lead.status, text: statusLabels[lead.status] || lead.status }} onChange={({ selectedItem }) => selectedItem && void updateLeadStatus(lead, selectedItem.id)} /></TableCell>
            <TableCell>{lead.score}</TableCell><TableCell>{new Date(lead.created_at).toLocaleDateString()}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer></div>}
    </PageSection>
  </ConfigurationPageTemplate>;
}
