import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, InlineNotification, TextInput, Tile, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@carbon/react";
import { Add, Renew, ChartLine } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./sales-pipeline.css";

type Company = { id: string; name: string };
type Opportunity = { id: string; title: string; stage: string; amount: number | null; currency: string | null; expected_close_date: string | null; next_step: string | null; crm_companies: { name: string } | null };
type Item = { id: string; text: string };
const stages: Item[] = [
  { id: "discovery", text: "需求发现" }, { id: "qualified", text: "已确认需求" },
  { id: "sampling", text: "样品阶段" }, { id: "quotation", text: "报价阶段" },
  { id: "negotiation", text: "商务谈判" }, { id: "won", text: "已成交" }, { id: "lost", text: "已丢单" }
];
const itemToString = (item: Item | null) => item?.text || "";
const emptyForm = { companyId: "", title: "", stage: "discovery", amount: "", currency: "USD", closeDate: "", nextStep: "" };

export default function SalesPipeline() {
  const [organizationId, setOrganizationId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (orgId: string) => {
    setLoading(true);
    const [opportunities, companyRows] = await Promise.all([
      supabase.from("crm_opportunities").select("id,title,stage,amount,currency,expected_close_date,next_step,crm_companies(name)").eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(250),
      supabase.from("crm_companies").select("id,name").eq("organization_id", orgId).order("name").limit(500)
    ]);
    if (opportunities.error) setError(opportunities.error.message);
    else setItems((opportunities.data || []) as unknown as Opportunity[]);
    if (companyRows.error) setError(companyRows.error.message);
    else setCompanies((companyRows.data || []) as Company[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) throw new Error("登录状态已失效，请重新登录。");
      const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership?.organization_id) throw new Error("当前账号尚未加入企业工作区。");
      if (!active) return;
      setOrganizationId(membership.organization_id);
      await load(membership.organization_id);
    };
    initialize().catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "无法初始化商机中心。"); setLoading(false); } });
    return () => { active = false; };
  }, [load]);

  const setField = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const companyItems = useMemo(() => companies.map((company) => ({ id: company.id, text: company.name })), [companies]);
  const metrics = useMemo(() => ({
    open: items.filter((item) => !["won", "lost"].includes(item.stage)).length,
    won: items.filter((item) => item.stage === "won").length,
    pipeline: items.filter((item) => !["won", "lost"].includes(item.stage)).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }), [items]);

  const createOpportunity = async () => {
    if (!organizationId || !form.companyId || !form.title.trim()) return;
    setSaving(true); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("crm_opportunities").insert({
      organization_id: organizationId, company_id: form.companyId, title: form.title.trim(),
      stage: form.stage, amount: form.amount ? Number(form.amount) : null,
      currency: form.amount ? form.currency.toUpperCase() : null,
      expected_close_date: form.closeDate || null, next_step: form.nextStep.trim() || null
    });
    if (insertError) setError(insertError.message);
    else {
      setForm(emptyForm); setShowForm(false); setNotice("商机已创建。");
      await load(organizationId);
    }
    setSaving(false);
  };

  return <ConfigurationPageTemplate className="module sales-pipeline" title="销售商机" description="把客户采购需求转化为可跟踪的销售机会，统一管理阶段、金额、预计成交日期与下一步动作。" eyebrow="GLOBAL TRADE · OPPORTUNITIES" headingLevel={1}>
    <PageSection title="商机漏斗" description="商机与全球客户中心共享企业档案和组织权限。" headingLevel={3}>
      {error && <InlineNotification kind="error" lowContrast title="商机数据操作失败" subtitle={error} onCloseButtonClick={() => setError("")} />}
      {notice && <InlineNotification kind="success" lowContrast title="操作完成" subtitle={notice} onCloseButtonClick={() => setNotice("")} />}
      <div className="opportunity-metrics">
        <Tile><span>进行中商机</span><strong>{metrics.open}</strong></Tile>
        <Tile><span>已成交</span><strong>{metrics.won}</strong></Tile>
        <Tile><span>未结案金额</span><strong>{metrics.pipeline.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></Tile>
      </div>
      <div className="opportunity-toolbar">
        <Button kind="tertiary" renderIcon={Renew} onClick={() => organizationId && void load(organizationId)}>刷新</Button>
        <Button kind="primary" renderIcon={Add} onClick={() => setShowForm((value) => !value)}>新增商机</Button>
      </div>
      {showForm && <Tile className="opportunity-form">
        <div className="opportunity-form-grid">
          <Dropdown id="opportunity-company" titleText="关联客户企业" label="选择客户" items={companyItems} itemToString={itemToString} selectedItem={companyItems.find((item) => item.id === form.companyId) || null} onChange={({ selectedItem }) => setField("companyId", selectedItem?.id || "")} />
          <TextInput id="opportunity-title" labelText="商机名称 *" value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="例如：德国渠道商采购 TWS 耳机" />
          <Dropdown id="opportunity-stage" titleText="商机阶段" label="选择阶段" items={stages} itemToString={itemToString} selectedItem={stages.find((item) => item.id === form.stage) || stages[0]} onChange={({ selectedItem }) => setField("stage", selectedItem?.id || "discovery")} />
          <TextInput id="opportunity-amount" labelText="预计金额" type="number" value={form.amount} onChange={(event) => setField("amount", event.target.value)} placeholder="可稍后补充" />
          <TextInput id="opportunity-currency" labelText="币种" value={form.currency} onChange={(event) => setField("currency", event.target.value)} maxLength={3} />
          <TextInput id="opportunity-date" labelText="预计成交日期" value={form.closeDate} onChange={(event) => setField("closeDate", event.target.value)} placeholder="YYYY-MM-DD" />
          <TextInput id="opportunity-next-step" labelText="下一步动作" value={form.nextStep} onChange={(event) => setField("nextStep", event.target.value)} placeholder="例如：发送产品目录与报价" />
        </div>
        <div className="opportunity-form-actions">
          <Button kind="secondary" onClick={() => setShowForm(false)}>取消</Button>
          <Button kind="primary" disabled={!form.companyId || !form.title.trim() || saving} loading={saving} onClick={() => void createOpportunity()}>保存商机</Button>
        </div>
      </Tile>}
      {companies.length === 0 && !loading && <InlineNotification kind="info" lowContrast title="尚无客户企业" subtitle="请先在全球客户中心建立企业档案，再创建关联商机。" />}
      {loading ? <div className="opportunity-empty">正在加载商机…</div> : items.length === 0 ? <div className="opportunity-empty"><ChartLine size={28}/><strong>暂无销售商机</strong><span>从全球客户中心沉淀客户后，在这里建立销售机会。</span></div> :
        <div className="opportunity-table-wrap"><TableContainer title="销售商机列表"><Table size="lg"><TableHead><TableRow><TableHeader>商机</TableHeader><TableHeader>客户企业</TableHeader><TableHeader>阶段</TableHeader><TableHeader>预计金额</TableHeader><TableHeader>预计成交</TableHeader><TableHeader>下一步动作</TableHeader></TableRow></TableHead><TableBody>
          {items.map((item) => <TableRow key={item.id}><TableCell>{item.title}</TableCell><TableCell>{item.crm_companies?.name || "—"}</TableCell><TableCell>{stages.find((stage) => stage.id === item.stage)?.text || item.stage}</TableCell><TableCell>{item.amount == null ? "—" : Number(item.amount).toLocaleString() + " " + (item.currency || "")}</TableCell><TableCell>{item.expected_close_date || "—"}</TableCell><TableCell>{item.next_step || "—"}</TableCell></TableRow>)}
        </TableBody></Table></TableContainer></div>}
    </PageSection>
  </ConfigurationPageTemplate>;
}
