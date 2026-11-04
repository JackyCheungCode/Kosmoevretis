import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Button, Checkbox, InlineNotification, NumberInput, Search, Tabs, TabList, Tab, TabPanels, TabPanel, Tag, TextArea, TextInput
} from "@carbon/react";
import CarbonSelect from "./components/CarbonSelect";
import { supabase } from "./lib/supabase";
import "./product-center.css";

type Category = { id:string; organization_id:string; parent_id:string|null; name:string; slug:string; code:string|null; description:string|null; is_active:boolean };
type DefinitionValue = { id:string; value_text:string; value_number:number|null; unit:string|null };
type Definition = { id:string; name:string; slug:string; data_type:string; unit:string|null; attribute_group:string; semantic_type:string; display_type:string; default_variant_creation_mode:string; include_in_analysis:boolean; product_attribute_definition_values?:DefinitionValue[] };
type Product = {
  id:string; name:string; brand:string|null; manufacturer:string|null; model:string|null; sku:string|null; internal_reference:string|null; barcode:string|null;
  category_id:string|null; category_path:string[]; description:string|null; image_url:string|null; target_markets:string[]; status:string; product_type:string;
  can_be_sold:boolean; can_be_purchased:boolean; sales_price:number|null; sales_currency:string; cost:number|null; cost_currency:string;
  unit_of_measure:string; purchase_uom:string; sales_description:string|null; purchase_description:string|null; weight:number|null; volume:number|null;
  country_of_origin:string|null; hs_code:string|null; website_url:string|null; lifecycle_stage:string; version:number;
};
type Variant = { id:string; sku:string|null; title:string|null; model:string|null; barcode:string|null; price:number|null; currency:string|null; cost:number|null; is_active:boolean };
type ProductAttribute = { id:string; name:string; variant_creation_mode:string; unit:string|null; product_attribute_values:{id:string;value_text:string;unit:string|null}[] };
type CategoryTemplate = { id:string; category_id:string; definition_id:string; is_required:boolean; sort_order:number };

const message = (e:unknown) => e instanceof Error ? e.message : "操作失败，请稍后重试。";
const makeSlug = (s:string) => s.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,"-").replace(/^-|-$/g,"");
const money = (v:number|null|undefined,currency:string) => v==null ? "—" : new Intl.NumberFormat("en-US",{style:"currency",currency:currency||"USD",maximumFractionDigits:2}).format(v);
const emptyProduct = () => ({
  name:"",brand:"",manufacturer:"",model:"",sku:"",internal_reference:"",barcode:"",category_id:"",description:"",image_url:"",
  target_markets:"Global",product_type:"physical",can_be_sold:true,can_be_purchased:true,sales_price:"",sales_currency:"USD",cost:"",cost_currency:"USD",
  unit_of_measure:"pcs",purchase_uom:"pcs",sales_description:"",purchase_description:"",weight:"",volume:"",country_of_origin:"",hs_code:"",
  website_url:"",lifecycle_stage:"development"
});
type ProductForm = ReturnType<typeof emptyProduct>;

export default function ProductCenter() {
  const [session,setSession] = useState<any>(null);
  const [ready,setReady] = useState(false);
  const [org,setOrg] = useState("");
  const [orgName,setOrgName] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState<{kind:"success"|"error"|"info";text:string}|null>(null);
  const [busy,setBusy] = useState(false);
  const [tab,setTab] = useState(0);
  const [products,setProducts] = useState<Product[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [definitions,setDefinitions] = useState<Definition[]>([]);
  const [categoryTemplates,setCategoryTemplates] = useState<CategoryTemplate[]>([]);
  const [query,setQuery] = useState("");
  const [editing,setEditing] = useState(false);
  const [selected,setSelected] = useState<Product|null>(null);
  const [form,setForm] = useState<ProductForm>(emptyProduct);
  const [categoryForm,setCategoryForm] = useState({name:"",code:"",parent_id:"",description:""});
  const [selectedCategoryId,setSelectedCategoryId] = useState("");
  const [selectedDefinitionIds,setSelectedDefinitionIds] = useState<string[]>([]);
  const [definitionForm,setDefinitionForm] = useState({name:"",data_type:"single_select",unit:"",group:"规格参数",semantic:"specification",display:"pills",variant_mode:"never"});
  const [definitionValueDraft,setDefinitionValueDraft] = useState<Record<string,string>>({});
  const [variants,setVariants] = useState<Variant[]>([]);\n  const [productAttributes,setProductAttributes] = useState<ProductAttribute[]>([]);\n  const [variantAxisSelection,setVariantAxisSelection] = useState<Record<string,string>>({});
  const [variantForm,setVariantForm] = useState({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});
  const [login,setLogin] = useState({email:"",password:""});
  const [authError,setAuthError] = useState("");

  const load = async (organizationId:string) => {
    const [p,c,d,t] = await Promise.all([
      supabase.from("products").select("*").eq("organization_id",organizationId).order("updated_at",{ascending:false}),
      supabase.from("product_categories").select("*").eq("organization_id",organizationId).order("sort_order").order("name"),
      supabase.from("product_attribute_definitions").select("*,product_attribute_definition_values(*)").eq("organization_id",organizationId).order("sort_order").order("name"),
      supabase.from("product_category_attribute_templates").select("*").eq("organization_id",organizationId).order("sort_order")
    ]);
    for (const r of [p,c,d,t]) if (r.error) throw r.error;
    setProducts((p.data||[]) as Product[]);
    setCategories((c.data||[]) as Category[]);
    setDefinitions((d.data||[]) as Definition[]);
    setCategoryTemplates((t.data||[]) as CategoryTemplate[]);
  };

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true);});
    return ()=>{alive=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!session?.user){setOrg("");setProducts([]);return;}
    (async()=>{
      const {data:m,error:me}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).limit(1).maybeSingle();
      if(me)throw me;
      if(!m)throw new Error("当前账号尚未加入企业工作区。");
      const {data:o,error:oe}=await supabase.from("organizations").select("id,name").eq("id",m.organization_id).single();
      if(oe)throw oe;
      setOrg(o.id);setOrgName(o.name);await load(o.id);
    })().catch(e=>setError(message(e)));
  },[session]);

  const filtered = useMemo(()=>products.filter(p=>[p.name,p.brand,p.manufacturer,p.model,p.sku,p.internal_reference,...(p.category_path||[])].join(" ").toLowerCase().includes(query.toLowerCase())),[products,query]);
  const categoryName = (id:string|null) => categories.find(c=>c.id===id)?.name || "未分类";
  const categoryTree = (parent:string|null=null,depth=0):Category[] => categories.filter(c=>c.parent_id===parent).flatMap(c=>[c,...categoryTree(c.id,depth+1)]);
  const categoryOptions = categoryTree().map(c=>({id:c.id,label:`${"　".repeat(categories.filter(x=>x.id===c.parent_id).length)}${c.name}`}));

  const startNew = () => {setSelected(null);setForm(emptyProduct());setVariants([]);setEditing(true);setNotice(null);};
  const startEdit = async (p:Product) => {
    setSelected(p);setForm({
      name:p.name||"",brand:p.brand||"",manufacturer:p.manufacturer||"",model:p.model||"",sku:p.sku||"",internal_reference:p.internal_reference||"",barcode:p.barcode||"",
      category_id:p.category_id||"",description:p.description||"",image_url:p.image_url||"",target_markets:(p.target_markets||[]).join(", "),
      product_type:p.product_type||"physical",can_be_sold:p.can_be_sold??true,can_be_purchased:p.can_be_purchased??true,
      sales_price:p.sales_price==null?"":String(p.sales_price),sales_currency:p.sales_currency||"USD",cost:p.cost==null?"":String(p.cost),cost_currency:p.cost_currency||"USD",
      unit_of_measure:p.unit_of_measure||"pcs",purchase_uom:p.purchase_uom||"pcs",sales_description:p.sales_description||"",purchase_description:p.purchase_description||"",
      weight:p.weight==null?"":String(p.weight),volume:p.volume==null?"":String(p.volume),country_of_origin:p.country_of_origin||"",hs_code:p.hs_code||"",
      website_url:p.website_url||"",lifecycle_stage:p.lifecycle_stage||"development"
    });
    setEditing(true);setNotice(null);
    const {data,error}=await supabase.from("product_variants").select("*").eq("product_id",p.id).order("created_at");
    if(error)setNotice({kind:"error",text:message(error)});else setVariants((data||[]) as Variant[]);
  };

  const saveProduct = async (event:FormEvent) => {
    event.preventDefault();
    if(!session?.user||!org||!form.name.trim())return;
    setBusy(true);setNotice(null);
    const category=categories.find(c=>c.id===form.category_id);
    const row:any={
      organization_id:org,name:form.name.trim(),brand:form.brand.trim()||null,manufacturer:form.manufacturer.trim()||null,model:form.model.trim()||null,
      sku:form.sku.trim()||null,internal_reference:form.internal_reference.trim()||null,barcode:form.barcode.trim()||null,category_id:form.category_id||null,
      category_path:category?[category.name]:[],description:form.description.trim()||null,image_url:form.image_url.trim()||null,
      target_markets:form.target_markets.split(/[,，]/).map(x=>x.trim()).filter(Boolean),product_type:form.product_type,
      can_be_sold:form.can_be_sold,can_be_purchased:form.can_be_purchased,sales_price:form.sales_price===""?null:Number(form.sales_price),sales_currency:form.sales_currency,
      cost:form.cost===""?null:Number(form.cost),cost_currency:form.cost_currency,unit_of_measure:form.unit_of_measure,purchase_uom:form.purchase_uom,
      sales_description:form.sales_description.trim()||null,purchase_description:form.purchase_description.trim()||null,
      weight:form.weight===""?null:Number(form.weight),volume:form.volume===""?null:Number(form.volume),
      country_of_origin:form.country_of_origin.trim()||null,hs_code:form.hs_code.trim()||null,website_url:form.website_url.trim()||null,lifecycle_stage:form.lifecycle_stage,
      updated_by:session.user.id
    };
    const result=selected
      ?await supabase.from("products").update(row).eq("id",selected.id).select("*").single()
      :await supabase.from("products").insert({...row,created_by:session.user.id}).select("*").single();
    if(result.error){setNotice({kind:"error",text:message(result.error)});setBusy(false);return;}
    if(!selected&&form.category_id){
      const assigned=categoryTemplates.filter(x=>x.category_id===form.category_id);
      for(const link of assigned){
        const d=definitions.find(x=>x.id===link.definition_id);if(!d)continue;
        const {data:a,error:ae}=await supabase.from("product_attributes").insert({
          organization_id:org,product_id:result.data.id,definition_id:d.id,name:d.name,slug:d.slug,data_type:d.data_type,unit:d.unit,
          attribute_group:d.attribute_group,semantic_type:d.semantic_type,display_type:d.display_type,
          variant_creation_mode:d.default_variant_creation_mode,is_variant_axis:d.default_variant_creation_mode!=="never",
          include_in_analysis:d.include_in_analysis,is_required:link.is_required,sort_order:link.sort_order
        }).select("*").single();
        if(ae){setNotice({kind:"error",text:`产品已创建，但初始化属性失败：${message(ae)}`});continue;}
        const values=(d.product_attribute_definition_values||[]).map((v,i)=>({
          organization_id:org,product_id:result.data.id,attribute_id:a.id,definition_id:d.id,definition_value_id:v.id,
          value_text:v.value_text,value_number:v.value_number,unit:v.unit||d.unit,sort_order:i
        }));
        if(values.length){const {error:ve}=await supabase.from("product_attribute_values").insert(values);if(ve)setNotice({kind:"error",text:`产品已创建，但复制属性值失败：${message(ve)}`});}
      }
    }
    await load(org);setSelected(result.data as Product);setEditing(false);
    const [variantResult,attributeResult]=await Promise.all([
      supabase.from("product_variants").select("*").eq("product_id",result.data.id).order("created_at"),
      supabase.from("product_attributes").select("*,product_attribute_values(id,value_text,unit)").eq("product_id",result.data.id).order("sort_order")
    ]);
    setVariants((variantResult.data||[]) as Variant[]);setProductAttributes((attributeResult.data||[]) as ProductAttribute[]);setVariantAxisSelection({});
    setBusy(false);
    setNotice({kind:"success",text:selected?"产品模板已更新。":"产品模板已创建，分类属性模板已自动应用。"});
  };

  const createCategory = async (event:FormEvent) => {
    event.preventDefault();if(!categoryForm.name.trim()||!org)return;
    setBusy(true);
    const {data,error}=await supabase.from("product_categories").insert({
      organization_id:org,parent_id:categoryForm.parent_id||null,name:categoryForm.name.trim(),
      slug:makeSlug(categoryForm.name),code:categoryForm.code.trim()||null,description:categoryForm.description.trim()||null,sort_order:categories.length
    }).select("*").single();
    if(error)setNotice({kind:"error",text:message(error)});
    else{setCategories(prev=>[...prev,data as Category]);setCategoryForm({name:"",code:"",parent_id:"",description:""});setNotice({kind:"success",text:"产品分类已创建。"});}
    setBusy(false);
  };

  const saveCategoryAttributes = async (event:FormEvent) => {
    event.preventDefault();if(!selectedCategoryId||!org)return;
    setBusy(true);
    const del=await supabase.from("product_category_attribute_templates").delete().eq("category_id",selectedCategoryId);
    if(del.error){setNotice({kind:"error",text:message(del.error)});setBusy(false);return;}
    if(selectedDefinitionIds.length){
      const rows=selectedDefinitionIds.map((id,index)=>({organization_id:org,category_id:selectedCategoryId,definition_id:id,sort_order:index}));
      const ins=await supabase.from("product_category_attribute_templates").insert(rows);
      if(ins.error){setNotice({kind:"error",text:message(ins.error)});setBusy(false);return;}
    }
    const {data,error}=await supabase.from("product_category_attribute_templates").select("*").eq("organization_id",org).order("sort_order");
    if(error)setNotice({kind:"error",text:message(error)});else{setCategoryTemplates((data||[]) as CategoryTemplate[]);setNotice({kind:"success",text:"分类属性模板已保存。"});}
    setBusy(false);
  };

  const createDefinition = async (event:FormEvent) => {
    event.preventDefault();if(!definitionForm.name.trim()||!org)return;
    setBusy(true);
    const {data,error}=await supabase.from("product_attribute_definitions").insert({
      organization_id:org,name:definitionForm.name.trim(),slug:makeSlug(definitionForm.name),data_type:definitionForm.data_type,
      unit:definitionForm.unit.trim()||null,attribute_group:definitionForm.group,semantic_type:definitionForm.semantic,
      display_type:definitionForm.display,default_variant_creation_mode:definitionForm.variant_mode,
      include_in_analysis:true,sort_order:definitions.length
    }).select("*,product_attribute_definition_values(*)").single();
    if(error)setNotice({kind:"error",text:message(error)});
    else{setDefinitions(prev=>[...prev,data as Definition]);setDefinitionForm({name:"",data_type:"single_select",unit:"",group:"规格参数",semantic:"specification",display:"pills",variant_mode:"never"});setNotice({kind:"success",text:"属性已加入企业属性库。"});}
    setBusy(false);
  };

  const addDefinitionValue = async (d:Definition) => {
    const raw=(definitionValueDraft[d.id]||"").trim();if(!raw)return;
    const numeric=["number","dimension"].includes(d.data_type)?Number(raw):null;
    const {data,error}=await supabase.from("product_attribute_definition_values").insert({
      organization_id:org,definition_id:d.id,value_text:raw,
      value_number:numeric!==null&&Number.isFinite(numeric)?numeric:null,unit:d.unit,sort_order:(d.product_attribute_definition_values||[]).length
    }).select("*").single();
    if(error)setNotice({kind:"error",text:message(error)});
    else{setDefinitions(prev=>prev.map(x=>x.id===d.id?{...x,product_attribute_definition_values:[...(x.product_attribute_definition_values||[]),data as DefinitionValue]}:x));setDefinitionValueDraft(prev=>({...prev,[d.id]:""}));}
  };

  const createVariant = async (event:FormEvent) => {
    event.preventDefault();if(!selected||!org)return;
    setBusy(true);
    const {data,error}=await supabase.from("product_variants").insert({
      organization_id:org,product_id:selected.id,title:variantForm.title.trim()||null,sku:variantForm.sku.trim()||null,
      model:variantForm.model.trim()||null,barcode:variantForm.barcode.trim()||null,price:variantForm.price===""?null:Number(variantForm.price),
      currency:variantForm.currency,cost:variantForm.cost===""?null:Number(variantForm.cost)
    }).select("*").single();
    if(error)setNotice({kind:"error",text:message(error)});
    else{setVariants(prev=>[...prev,data as Variant]);setVariantForm({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});setNotice({kind:"success",text:"实际销售变体已创建。"});}
    setBusy(false);
  };

  const doLogin = async (event:FormEvent) => {
    event.preventDefault();setBusy(true);setAuthError("");
    const {error}=await supabase.auth.signInWithPassword(login);
    if(error)setAuthError(error.message);
    setBusy(false);
  };

  if(!ready)return <div className="pc-loading">正在连接企业产品主数据…</div>;
  if(!session)return <form className="pc-login" onSubmit={doLogin}><div className="pc-kicker">PRODUCT MASTER DATA</div><h2>登录企业工作区</h2><p>使用企业账号访问产品主档案、分类与属性库。</p><TextInput id="pc-email" type="email" labelText="邮箱" value={login.email} onChange={e=>setLogin(p=>({...p,email:e.target.value}))} required/><TextInput id="pc-password" type="password" labelText="密码" value={login.password} onChange={e=>setLogin(p=>({...p,password:e.target.value}))} required/>{authError&&<InlineNotification kind="error" lowContrast title="登录失败" subtitle={authError}/>}<Button type="submit" disabled={busy}>{busy?"登录中…":"登录"}</Button><small>账号由企业管理员配置，不开放自助注册。</small></form>;
  if(error)return <div className="pc-empty"><h3>产品工作区不可用</h3><p>{error}</p></div>;

  const selectedCategoryRecord=categories.find(c=>c.id===selectedCategoryId);
  const openProduct = async (p:Product) => { setSelected(p); setEditing(false); setNotice(null); const {data,error}=await supabase.from("product_variants").select("*").eq("product_id",p.id).order("created_at"); if(error) throw error; setVariants((data||[]) as Variant[]); };
  return <section className="pc-workspace">
    <div className="pc-heading"><div><div className="pc-kicker">PRODUCT MASTER / ODOO-STYLE CATALOG</div><h2>产品中心</h2><p>{orgName} · 统一产品主档案，供市场情报、报价与合同流程复用</p></div><div className="pc-heading-actions"><Tag type="blue">企业产品主数据</Tag><Button kind="primary" onClick={startNew}>创建产品</Button></div></div>
    {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.kind==="success"?"已保存":notice.kind==="error"?"操作失败":"提示"} subtitle={notice.text} onCloseButtonClick={()=>setNotice(null)}/>}
    <Tabs selectedIndex={tab} onChange={({selectedIndex})=>setTab(selectedIndex)}>
      <TabList aria-label="产品中心模块"><Tab>产品管理</Tab><Tab>产品分类</Tab><Tab>属性管理</Tab></TabList>
      <TabPanels>
        <TabPanel>
          {editing?<form className="pc-editor" onSubmit={saveProduct}>
            <div className="pc-panel-heading"><div><button type="button" className="pc-back" onClick={()=>{setEditing(false);setSelected(null);}}>← 返回产品目录</button><h3>{selected?"编辑产品模板":"创建产品模板"}</h3><p>产品模板代表产品家族；实际可销售 SKU 在变体中独立管理。</p></div><Tag type="blue">{selected?`版本 v${selected.version||1}`:"新建模板"}</Tag></div>
            <div className="pc-form-section"><h4>01 · 基础信息</h4><div className="pc-form-grid">
              <TextInput id="pc-name" labelText="产品名称 *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/>
              <label className="pc-field"><span>产品类型</span><CarbonSelect value={form.product_type} onChange={v=>setForm(p=>({...p,product_type:v}))}><option value="physical">可库存商品</option><option value="service">服务</option><option value="combo">组合商品</option></CarbonSelect></label>
              <TextInput id="pc-brand" labelText="品牌" value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))}/>
              <TextInput id="pc-manufacturer" labelText="制造商" value={form.manufacturer} onChange={e=>setForm(p=>({...p,manufacturer:e.target.value}))}/>
              <TextInput id="pc-model" labelText="型号 / 系列" value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}/>
              <TextInput id="pc-reference" labelText="内部参考编号" value={form.internal_reference} onChange={e=>setForm(p=>({...p,internal_reference:e.target.value}))}/>
              <TextInput id="pc-sku" labelText="主 SKU（无变体时使用）" value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))}/>
              <TextInput id="pc-barcode" labelText="条码 / GTIN" value={form.barcode} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))}/>
              <label className="pc-field"><span>产品分类</span><CarbonSelect value={form.category_id} onChange={v=>setForm(p=>({...p,category_id:v}))} placeholder="选择产品分类"><option value="">未分类</option>{categoryOptions.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</CarbonSelect></label>
              <label className="pc-field"><span>产品生命周期</span><CarbonSelect value={form.lifecycle_stage} onChange={v=>setForm(p=>({...p,lifecycle_stage:v}))}><option value="development">开发中</option><option value="pre_launch">上市准备</option><option value="launched">已发布</option><option value="active">在售</option><option value="discontinued">已停产</option></CarbonSelect></label>
              <TextInput id="pc-image" labelText="产品图片 URL" value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))}/>
              <TextInput id="pc-website" labelText="官方产品链接" value={form.website_url} onChange={e=>setForm(p=>({...p,website_url:e.target.value}))}/>
              <div className="pc-span-2"><TextArea id="pc-description" labelText="产品描述 / 内部备注" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3}/></div>
            </div></div>
            <div className="pc-form-section"><h4>02 · 销售与采购</h4><div className="pc-checks"><Checkbox id="pc-sell" labelText="可销售" checked={form.can_be_sold} onChange={(_,d)=>setForm(p=>({...p,can_be_sold:d.checked}))}/><Checkbox id="pc-buy" labelText="可采购" checked={form.can_be_purchased} onChange={(_,d)=>setForm(p=>({...p,can_be_purchased:d.checked}))}/></div><div className="pc-form-grid">
              <NumberInput id="pc-price" label="销售价格" min={0} step={0.01} value={form.sales_price} onChange={(_,d)=>setForm(p=>({...p,sales_price:String(d.value??"")}))}/>
              <label className="pc-field"><span>销售币种</span><CarbonSelect value={form.sales_currency} onChange={v=>setForm(p=>({...p,sales_currency:v}))}><option value="USD">USD · 美元</option><option value="EUR">EUR · 欧元</option><option value="GBP">GBP · 英镑</option><option value="JPY">JPY · 日元</option><option value="CNY">CNY · 人民币</option></CarbonSelect></label>
              <NumberInput id="pc-cost" label="成本" min={0} step={0.01} value={form.cost} onChange={(_,d)=>setForm(p=>({...p,cost:String(d.value??"")}))}/>
              <label className="pc-field"><span>成本币种</span><CarbonSelect value={form.cost_currency} onChange={v=>setForm(p=>({...p,cost_currency:v}))}><option value="USD">USD · 美元</option><option value="EUR">EUR · 欧元</option><option value="CNY">CNY · 人民币</option></CarbonSelect></label>
              <TextInput id="pc-uom" labelText="销售计量单位" value={form.unit_of_measure} onChange={e=>setForm(p=>({...p,unit_of_measure:e.target.value}))}/>
              <TextInput id="pc-puom" labelText="采购计量单位" value={form.purchase_uom} onChange={e=>setForm(p=>({...p,purchase_uom:e.target.value}))}/>
              <div className="pc-span-2"><TextArea id="pc-sales-desc" labelText="销售描述（报价单可复用）" value={form.sales_description} onChange={e=>setForm(p=>({...p,sales_description:e.target.value}))} rows={2}/></div>
              <div className="pc-span-2"><TextArea id="pc-purchase-desc" labelText="采购描述" value={form.purchase_description} onChange={e=>setForm(p=>({...p,purchase_description:e.target.value}))} rows={2}/></div>
            </div></div>
            <div className="pc-form-section"><h4>03 · 库存与物流</h4><div className="pc-form-grid">
              <NumberInput id="pc-weight" label="重量（kg）" min={0} step={0.001} value={form.weight} onChange={(_,d)=>setForm(p=>({...p,weight:String(d.value??"")}))}/>
              <NumberInput id="pc-volume" label="体积（m³）" min={0} step={0.0001} value={form.volume} onChange={(_,d)=>setForm(p=>({...p,volume:String(d.value??"")}))}/>
              <TextInput id="pc-origin" labelText="原产国 / 地区" value={form.country_of_origin} onChange={e=>setForm(p=>({...p,country_of_origin:e.target.value}))}/>
              <TextInput id="pc-hs" labelText="HS 编码" value={form.hs_code} onChange={e=>setForm(p=>({...p,hs_code:e.target.value}))}/>
              <TextInput id="pc-markets" labelText="目标市场（逗号分隔）" value={form.target_markets} onChange={e=>setForm(p=>({...p,target_markets:e.target.value}))}/>
            </div></div>
            <div className="pc-form-actions"><Button kind="secondary" type="button" onClick={()=>setEditing(false)}>取消</Button><Button kind="primary" type="submit" disabled={busy}>{busy?"保存中…":"保存产品模板"}</Button></div>
          </form>:selected?<div className="pc-detail">
            <div className="pc-panel-heading"><div><button className="pc-back" onClick={()=>setSelected(null)}>← 返回产品目录</button><h3>{selected.name}</h3><p>{selected.brand||"未设置品牌"} · {selected.model||"未设置型号"} · {categoryName(selected.category_id)}</p></div><div className="pc-heading-actions"><Tag type="blue">模板 v{selected.version||1}</Tag><Button kind="primary" onClick={()=>startEdit(selected)}>编辑模板</Button></div></div>
            <div className="pc-product-facts"><div><span>内部参考</span><strong>{selected.internal_reference||"—"}</strong></div><div><span>主 SKU</span><strong>{selected.sku||"由变体定义"}</strong></div><div><span>销售价格</span><strong>{money(selected.sales_price,selected.sales_currency)}</strong></div><div><span>生命周期</span><strong>{selected.lifecycle_stage}</strong></div></div>
            <section className="pc-form-section"><div className="pc-section-head"><div><h4>产品变体 / Product Variants</h4><p>变体是可销售的实际规格组合，每个变体拥有独立 SKU、条码和商业价格。</p></div><Tag>{variants.length} 个变体</Tag></div>
              {productAttributes.some(a=>a.variant_creation_mode!=="never")&&<div className="pc-axis-selector"><div><strong>变体属性组合</strong><span>选择每个变体轴的具体属性值，系统将关联到实际 SKU。</span></div><div className="pc-axis-grid">{productAttributes.filter(a=>a.variant_creation_mode!=="never").map(a=><label className="pc-field" key={a.id}><span>{a.name}{a.unit?`（${a.unit}）`:""}</span><CarbonSelect value={variantAxisSelection[a.id]||""} onChange={v=>setVariantAxisSelection(prev=>({...prev,[a.id]:v}))} placeholder="选择属性值">{(a.product_attribute_values||[]).map(v=><option key={v.id} value={v.id}>{v.value_text}{v.unit?` ${v.unit}`:""}</option>)}</CarbonSelect></label>)}</div></div>}
              <form className="pc-variant-form" onSubmit={createVariant}>
                <TextInput id="pc-v-title" labelText="变体名称 / 规格组合" value={variantForm.title} onChange={e=>setVariantForm(p=>({...p,title:e.target.value}))}/>
                <TextInput id="pc-v-sku" labelText="SKU" value={variantForm.sku} onChange={e=>setVariantForm(p=>({...p,sku:e.target.value}))}/>
                <TextInput id="pc-v-model" labelText="型号" value={variantForm.model} onChange={e=>setVariantForm(p=>({...p,model:e.target.value}))}/>
                <TextInput id="pc-v-barcode" labelText="条码" value={variantForm.barcode} onChange={e=>setVariantForm(p=>({...p,barcode:e.target.value}))}/>
                <NumberInput id="pc-v-price" label="销售价格" min={0} step={0.01} value={variantForm.price} onChange={(_,d)=>setVariantForm(p=>({...p,price:String(d.value??"")}))}/>
                <label className="pc-field"><span>币种</span><CarbonSelect value={variantForm.currency} onChange={v=>setVariantForm(p=>({...p,currency:v}))}><option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option></CarbonSelect></label>
                <NumberInput id="pc-v-cost" label="成本" min={0} step={0.01} value={variantForm.cost} onChange={(_,d)=>setVariantForm(p=>({...p,cost:String(d.value??"")}))}/>
                <Button type="submit" disabled={busy}>新增变体</Button>
              </form>
              {variants.length?<div className="pc-table-wrap"><table className="pc-table"><thead><tr><th>变体</th><th>SKU</th><th>型号</th><th>条码</th><th>销售价</th><th>成本</th></tr></thead><tbody>{variants.map(v=><tr key={v.id}><td>{v.title||"默认变体"}</td><td>{v.sku||"—"}</td><td>{v.model||"—"}</td><td>{v.barcode||"—"}</td><td>{money(v.price,v.currency||"USD")}</td><td>{money(v.cost,v.currency||"USD")}</td></tr>)}</tbody></table></div>:<div className="pc-empty-inline">尚未创建实际销售变体。可先添加默认 SKU，后续再配置属性组合。</div>}
            </section>
            <section className="pc-form-section"><h4>产品属性摘要</h4><div className="pc-attribute-summary">{productAttributes.map(a=><div key={a.id}><strong>{a.name}</strong><span>{a.variant_creation_mode==="never"?"普通属性":a.variant_creation_mode==="dynamic"?"动态变体轴":"立即变体轴"}</span><small>{(a.product_attribute_values||[]).map(v=>v.value_text).join(" / ")||"尚无属性值"}</small></div>)}</div>{!productAttributes.length&&<p>分类：{categoryName(selected.category_id)}。当前分类尚未配置属性模板。</p>}</section>
          </div>:<><div className="pc-catalog-stats"><div><span>产品模板</span><strong>{products.length}</strong></div><div><span>分类</span><strong>{categories.length}</strong></div><div><span>属性定义</span><strong>{definitions.length}</strong></div><div><span>已发布产品</span><strong>{products.filter(p=>p.status==="active"||p.lifecycle_stage==="active").length}</strong></div></div>
            <div className="pc-list-toolbar"><Search size="lg" labelText="搜索产品" placeholder="名称、品牌、型号、SKU 或内部编号" value={query} onChange={e=>setQuery(e.target.value)}/><span>{filtered.length} 条记录</span></div>
            {filtered.length?<div className="pc-product-list">{filtered.map(p=><button key={p.id} className="pc-product-row" onClick={()=>openProduct(p).catch(e=>setNotice({kind:"error",text:message(e)}))}><div className="pc-product-thumb">{p.image_url?<img src={p.image_url} alt=""/>:<span>▣</span>}</div><div className="pc-product-main"><strong>{p.name}</strong><span>{p.brand||"未设置品牌"} · {p.model||"未设置型号"}</span><small>{categoryName(p.category_id)} · {p.internal_reference||p.sku||"未设置编码"}</small></div><div className="pc-product-price"><strong>{money(p.sales_price,p.sales_currency||"USD")}</strong><span>{p.can_be_sold?"可销售":"不销售"}</span></div><span className="pc-row-arrow">›</span></button>)}</div>:<div className="pc-empty"><div className="pc-empty-icon">▣</div><h3>{query?"没有匹配的产品":"产品主档案尚为空"}</h3><p>创建产品模板后，可按分类自动载入属性，并在模板下维护实际 SKU 变体。</p><Button kind="primary" onClick={startNew}>创建第一个产品</Button></div>}
          </>}
        </TabPanel>
        <TabPanel>
          <div className="pc-management-grid">
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>产品分类</h3><p>建立独立的多级产品分类；分类与属性是不同的主数据。</p></div><Tag>{categories.length} 个分类</Tag></div>
              <form className="pc-create-category" onSubmit={createCategory}>
                <TextInput id="pc-cat-name" labelText="分类名称 *" value={categoryForm.name} onChange={e=>setCategoryForm(p=>({...p,name:e.target.value}))} required/>
                <TextInput id="pc-cat-code" labelText="分类编码" value={categoryForm.code} onChange={e=>setCategoryForm(p=>({...p,code:e.target.value}))}/>
                <label className="pc-field"><span>上级分类</span><CarbonSelect value={categoryForm.parent_id} onChange={v=>setCategoryForm(p=>({...p,parent_id:v}))} placeholder="顶级分类"><option value="">顶级分类</option>{categoryTree().map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</CarbonSelect></label>
                <TextInput id="pc-cat-description" labelText="分类说明" value={categoryForm.description} onChange={e=>setCategoryForm(p=>({...p,description:e.target.value}))}/>
                <Button type="submit" disabled={busy}>创建分类</Button>
              </form>
              <div className="pc-category-tree">{categoryTree().map(c=><div className="pc-category-item" key={c.id} style={{paddingLeft:`${12+Math.max(0,categories.filter(x=>x.id===c.parent_id).length)*18}px`}}><span className="pc-category-dot"/><strong>{c.name}</strong><small>{c.code||c.slug}</small><Button kind="ghost" size="sm" onClick={()=>{setSelectedCategory(c.id);setSelectedDefinitionIds(categoryTemplates.filter(x=>x.category_id===c.id).map(x=>x.definition_id));}}>配置属性 →</Button></div>)}</div>
            </section>
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>分类属性模板</h3><p>为所选分类指定默认属性。创建该分类产品时自动初始化。</p></div></div>
              {selectedCategoryRecord?<form onSubmit={saveCategoryAttributes}><div className="pc-selected-category">{selectedCategoryRecord.name}</div><div className="pc-check-list">{definitions.map(d=><Checkbox key={d.id} id={`pc-cat-def-${d.id}`} labelText={d.name} checked={selectedDefinitionIds.includes(d.id)} onChange={(_,data)=>setSelectedDefinitionIds(prev=>data.checked?[...prev,d.id]:prev.filter(x=>x!==d.id))}/>)}</div><Button type="submit" disabled={busy}>保存分类属性模板</Button></form>:<div className="pc-empty-inline">从左侧分类列表选择「配置属性」。</div>}
            </section>
          </div>
        </TabPanel>
        <TabPanel>
          <div className="pc-management-grid pc-attributes-layout">
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>创建属性</h3><p>企业级统一属性库；不同产品分类可复用相同属性定义。</p></div></div>
              <form className="pc-create-attribute" onSubmit={createDefinition}>
                <TextInput id="pc-attr-name" labelText="属性名称 *" value={definitionForm.name} onChange={e=>setDefinitionForm(p=>({...p,name:e.target.value}))} required/>
                <label className="pc-field"><span>数据类型</span><CarbonSelect value={definitionForm.data_type} onChange={v=>setDefinitionForm(p=>({...p,data_type:v}))}><option value="text">文本</option><option value="number">数值</option><option value="single_select">单选</option><option value="multi_select">多选</option><option value="boolean">布尔值</option><option value="date">日期</option><option value="dimension">带单位数值</option></CarbonSelect></label>
                <TextInput id="pc-attr-unit" labelText="计量单位" value={definitionForm.unit} onChange={e=>setDefinitionForm(p=>({...p,unit:e.target.value}))}/>
                <label className="pc-field"><span>属性分组</span><CarbonSelect value={definitionForm.group} onChange={v=>setDefinitionForm(p=>({...p,group:v}))}><option value="规格参数">规格参数</option><option value="外观设计">外观设计</option><option value="功能特性">功能特性</option><option value="合规认证">合规认证</option><option value="商业信息">商业信息</option></CarbonSelect></label>
                <label className="pc-field"><span>变体生成方式</span><CarbonSelect value={definitionForm.variant_mode} onChange={v=>setDefinitionForm(p=>({...p,variant_mode:v}))}><option value="never">不生成变体</option><option value="dynamic">动态生成</option><option value="instant">立即生成</option></CarbonSelect></label>
                <label className="pc-field"><span>显示方式</span><CarbonSelect value={definitionForm.display} onChange={v=>setDefinitionForm(p=>({...p,display:v}))}><option value="pills">标签按钮</option><option value="select">下拉选择</option><option value="radio">单选按钮</option><option value="color">颜色</option><option value="multi_checkbox">多选框</option><option value="image">图片</option></CarbonSelect></label>
                <Button type="submit" disabled={busy}>创建属性</Button>
              </form>
            </section>
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>属性库</h3><p>维护属性允许值、单位和变体规则。</p></div><Tag>{definitions.length} 项</Tag></div>
              <div className="pc-definition-list">{definitions.map(d=><article className="pc-definition" key={d.id}><div className="pc-definition-heading"><div><strong>{d.name}</strong><span>{d.attribute_group} · {d.data_type}{d.unit?` · ${d.unit}`:""}</span></div><Tag type={d.default_variant_creation_mode==="never"?"gray":"blue"}>{d.default_variant_creation_mode==="never"?"非变体属性":d.default_variant_creation_mode==="dynamic"?"动态变体":"立即变体"}</Tag></div><div className="pc-definition-values">{(d.product_attribute_definition_values||[]).map(v=><span key={v.id}>{v.value_text}{v.unit?` ${v.unit}`:""}</span>)}{!(d.product_attribute_definition_values||[]).length&&<small>尚未定义允许值</small>}</div><div className="pc-add-value"><TextInput id={`pc-value-${d.id}`} labelText="添加属性值" hideLabel value={definitionValueDraft[d.id]||""} onChange={e=>setDefinitionValueDraft(p=>({...p,[d.id]:e.target.value}))} placeholder="输入属性值"/><Button kind="tertiary" size="sm" onClick={()=>addDefinitionValue(d)}>添加</Button></div></article>)}</div>
            </section>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <div className="pc-footer-note">产品模板与 SKU 变体分层管理 · 企业属性库统一复用 · 分类模板自动初始化 · 商业字段为报价与合同预留</div>
  </section>;
}
