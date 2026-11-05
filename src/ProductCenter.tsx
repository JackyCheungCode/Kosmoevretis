import { useEffect, useMemo, useState, type FormEvent, type CSSProperties } from "react";
import {
  Button, Checkbox, InlineNotification, NumberInput, Search, Tabs, TabList, Tab, TabPanels, TabPanel, Tag, TextArea, TextInput
} from "@carbon/react";
import CarbonSelect from "./components/CarbonSelect";
import { FormField } from "./design-system/components";
import { supabase } from "./lib/supabase";
import "./product-center.css";

type Category = { id:string; organization_id:string; parent_id:string|null; name:string; slug:string; code:string|null; description:string|null; is_active:boolean };
type DefinitionValue = { id:string; value_text:string; value_number:number|null; unit:string|null };
type Definition = { id:string; name:string; slug:string; data_type:string; unit:string|null; attribute_group:string; semantic_type:string; display_type:string; default_variant_creation_mode:string; include_in_analysis:boolean; sort_order:number; product_attribute_definition_values?:DefinitionValue[] };
type Product = {
  id:string; name:string; brand:string|null; manufacturer:string|null; model:string|null; sku:string|null; internal_reference:string|null; barcode:string|null;
  category_id:string|null; category_path:string[]; description:string|null; image_url:string|null; target_markets:string[]; status:string; product_type:string;
  can_be_sold:boolean; can_be_purchased:boolean; sales_price:number|null; sales_currency:string; cost:number|null; cost_currency:string;
  unit_of_measure:string; purchase_uom:string; sales_description:string|null; purchase_description:string|null; weight:number|null; volume:number|null;
  country_of_origin:string|null; hs_code:string|null; website_url:string|null; lifecycle_stage:string; version:number;
};
type Variant = { id:string; sku:string|null; title:string|null; model:string|null; barcode:string|null; price:number|null; currency:string|null; cost:number|null; is_active:boolean };
type ProductAttribute = { id:string; name:string; data_type:string; variant_creation_mode:string; unit:string|null; product_attribute_values:{id:string;value_text:string;value_number?:number|null;unit:string|null}[] };
type VariantAttributeValue = { id:string; variant_id:string; attribute_id:string; attribute_value_id:string };
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
  const [statusFilter,setStatusFilter] = useState("all");
  const [editing,setEditing] = useState(false);
  const [selected,setSelected] = useState<Product|null>(null);
  const [form,setForm] = useState<ProductForm>(emptyProduct);
  const [categoryForm,setCategoryForm] = useState({name:"",code:"",parent_id:"",description:""});
  const [selectedCategoryId,setSelectedCategoryId] = useState("");
  const [selectedDefinitionIds,setSelectedDefinitionIds] = useState<string[]>([]);
  const [selectedRequiredIds,setSelectedRequiredIds] = useState<string[]>([]);
  const [editingCategoryId,setEditingCategoryId] = useState("");
  const [editingDefinitionId,setEditingDefinitionId] = useState("");
  const [confirmCategoryDeleteId,setConfirmCategoryDeleteId] = useState("");
  const [confirmDefinitionDeleteId,setConfirmDefinitionDeleteId] = useState("");
  const [confirmValueDeleteId,setConfirmValueDeleteId] = useState("");
  const [editingVariantId,setEditingVariantId] = useState("");
  const [confirmVariantDeleteId,setConfirmVariantDeleteId] = useState("");
  const [confirmProductValueDeleteId,setConfirmProductValueDeleteId] = useState("");
  const [definitionForm,setDefinitionForm] = useState({name:"",data_type:"single_select",unit:"",group:"规格参数",semantic:"specification",display:"pills",variant_mode:"never"});
  const [definitionValueDraft,setDefinitionValueDraft] = useState<Record<string,string>>({});
  const [variants,setVariants] = useState<Variant[]>([]);
  const [variantAttributeValues,setVariantAttributeValues] = useState<VariantAttributeValue[]>([]);
  const [productAttributes,setProductAttributes] = useState<ProductAttribute[]>([]);
  const [variantAxisSelection,setVariantAxisSelection] = useState<Record<string,string>>({});
  const [attributeValueDraft,setAttributeValueDraft] = useState<Record<string,string>>({});
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

  const filtered = useMemo(()=>products.filter(p=>{
    const matchesQuery=[p.name,p.brand,p.manufacturer,p.model,p.sku,p.internal_reference,...(p.category_path||[])].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery&&(statusFilter==="all"||p.status===statusFilter);
  }),[products,query,statusFilter]);
  const categoryName = (id:string|null) => categories.find(c=>c.id===id)?.name || "未分类";
  const categoryPathFor = (categoryId:string|null) => {
    const path:string[]=[];const seen=new Set<string>();let current=categories.find(item=>item.id===categoryId);
    while(current&&!seen.has(current.id)){
      seen.add(current.id);path.unshift(current.name);
      current=categories.find(item=>item.id===current?.parent_id);
    }
    return path;
  };
  const categoryDepth = (categoryId:string) => Math.max(0,categoryPathFor(categoryId).length-1);
  const categoryTree = (parent:string|null=null,visited=new Set<string>()):Category[] =>
    categories.filter(c=>c.parent_id===parent&&!visited.has(c.id)).flatMap(c=>{
      const next=new Set(visited);next.add(c.id);return [c,...categoryTree(c.id,next)];
    });
  const categoryOptions = categoryTree().map(c=>({id:c.id,label:"　".repeat(categoryDepth(c.id))+c.name}));

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
    const numericFields:[string,string][]=[["销售价格",form.sales_price],["成本",form.cost],["重量",form.weight],["体积",form.volume]];
    for(const field of numericFields){
      if(field[1]!==""&&(!Number.isFinite(Number(field[1]))||Number(field[1])<0)){
        setNotice({kind:"error",text:field[0]+"必须是大于或等于 0 的有效数字。"});return;
      }
    }
    setBusy(true);setNotice(null);
    try{
      const row={
        organization_id:org,name:form.name.trim(),brand:form.brand.trim()||null,manufacturer:form.manufacturer.trim()||null,
        model:form.model.trim()||null,sku:form.sku.trim()||null,internal_reference:form.internal_reference.trim()||null,
        barcode:form.barcode.trim()||null,category_id:form.category_id||null,category_path:categoryPathFor(form.category_id),
        description:form.description.trim()||null,image_url:form.image_url.trim()||null,
        target_markets:form.target_markets.split(/[,，]/).map(x=>x.trim()).filter(Boolean),product_type:form.product_type,
        can_be_sold:form.can_be_sold,can_be_purchased:form.can_be_purchased,
        sales_price:form.sales_price===""?null:Number(form.sales_price),sales_currency:form.sales_currency,
        cost:form.cost===""?null:Number(form.cost),cost_currency:form.cost_currency,unit_of_measure:form.unit_of_measure,
        purchase_uom:form.purchase_uom,sales_description:form.sales_description.trim()||null,
        purchase_description:form.purchase_description.trim()||null,weight:form.weight===""?null:Number(form.weight),
        volume:form.volume===""?null:Number(form.volume),country_of_origin:form.country_of_origin.trim()||null,
        hs_code:form.hs_code.trim()||null,website_url:form.website_url.trim()||null,lifecycle_stage:form.lifecycle_stage,
        updated_by:session.user.id,version:selected?(selected.version||1)+1:1
      };
      const result=selected
        ?await supabase.from("products").update(row).eq("id",selected.id).eq("organization_id",org).select("*").single()
        :await supabase.from("products").insert({...row,created_by:session.user.id}).select("*").single();
      if(result.error)throw result.error;
      if(form.category_id){
        const assigned=categoryTemplates.filter(item=>item.category_id===form.category_id);
        const {data:existing,error:existingError}=await supabase.from("product_attributes").select("definition_id").eq("product_id",result.data.id);
        if(existingError)throw existingError;
        const existingIds=new Set((existing||[]).map(item=>item.definition_id).filter(Boolean));
        for(const link of assigned){
          if(existingIds.has(link.definition_id))continue;
          const definition=definitions.find(item=>item.id===link.definition_id);if(!definition)continue;
          const {data:attribute,error:attributeError}=await supabase.from("product_attributes").insert({
            organization_id:org,product_id:result.data.id,definition_id:definition.id,name:definition.name,slug:definition.slug,
            data_type:definition.data_type,unit:definition.unit,attribute_group:definition.attribute_group,
            semantic_type:definition.semantic_type,display_type:definition.display_type,
            variant_creation_mode:definition.default_variant_creation_mode,
            is_variant_axis:definition.default_variant_creation_mode!=="never",include_in_analysis:definition.include_in_analysis,
            is_required:link.is_required,sort_order:link.sort_order
          }).select("*").single();
          if(attributeError)throw attributeError;
          const values=(definition.product_attribute_definition_values||[]).map((value,index)=>({
            organization_id:org,product_id:result.data.id,attribute_id:attribute.id,definition_id:definition.id,
            definition_value_id:value.id,value_text:value.value_text,value_number:value.value_number,
            unit:value.unit||definition.unit,sort_order:index
          }));
          if(values.length){const {error:valueError}=await supabase.from("product_attribute_values").insert(values);if(valueError)throw valueError;}
        }
      }
      await load(org);
      const [vr,ar,lr]=await Promise.all([
        supabase.from("product_variants").select("*").eq("product_id",result.data.id).eq("organization_id",org).order("created_at"),
        supabase.from("product_attributes").select("*,product_attribute_values(id,value_text,value_number,unit)").eq("product_id",result.data.id).eq("organization_id",org).order("sort_order"),
        supabase.from("product_variant_values").select("id,variant_id,attribute_id,attribute_value_id").eq("product_id",result.data.id).eq("organization_id",org)
      ]);
      if(vr.error)throw vr.error;if(ar.error)throw ar.error;if(lr.error)throw lr.error;
      setSelected(result.data as Product);setEditing(false);setVariants((vr.data||[]) as Variant[]);
      setProductAttributes((ar.data||[]) as ProductAttribute[]);setVariantAttributeValues((lr.data||[]) as VariantAttributeValue[]);
      setVariantAxisSelection({});
      setNotice({kind:"success",text:selected?"产品档案已更新，版本号已递增。":"产品档案已创建，分类属性模板已自动应用。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const saveCategory = async (event:FormEvent) => {
    event.preventDefault();if(!categoryForm.name.trim()||!org)return;
    if(editingCategoryId&&(categoryForm.parent_id===editingCategoryId||categoryPathFor(categoryForm.parent_id).includes(categories.find(c=>c.id===editingCategoryId)?.name||""))){
      setNotice({kind:"error",text:"不能将分类移动到自身或自己的下级分类中。"});return;
    }
    setBusy(true);setNotice(null);
    try{
      const row={organization_id:org,parent_id:categoryForm.parent_id||null,name:categoryForm.name.trim(),
        slug:makeSlug(categoryForm.name),code:categoryForm.code.trim()||null,
        description:categoryForm.description.trim()||null,updated_at:new Date().toISOString()};
      const result=editingCategoryId
        ?await supabase.from("product_categories").update(row).eq("id",editingCategoryId).eq("organization_id",org).select("*").single()
        :await supabase.from("product_categories").insert({...row,sort_order:categories.length}).select("*").single();
      if(result.error)throw result.error;
      await load(org);setCategoryForm({name:"",code:"",parent_id:"",description:""});
      setEditingCategoryId("");setNotice({kind:"success",text:editingCategoryId?"分类信息已更新。":"产品分类已创建。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const editCategory = (category:Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({name:category.name,code:category.code||"",parent_id:category.parent_id||"",description:category.description||""});
  };

  const deleteCategory = async (category:Category) => {
    if(confirmCategoryDeleteId!==category.id){setConfirmCategoryDeleteId(category.id);return;}
    setBusy(true);setNotice(null);
    try{
      const [children,productsInCategory,templates]=await Promise.all([
        supabase.from("product_categories").select("id").eq("parent_id",category.id).limit(1),
        supabase.from("products").select("id").eq("category_id",category.id).limit(1),
        supabase.from("product_category_attribute_templates").select("id").eq("category_id",category.id).limit(1)
      ]);
      if(children.error)throw children.error;if(productsInCategory.error)throw productsInCategory.error;if(templates.error)throw templates.error;
      if(children.data?.length||productsInCategory.data?.length||templates.data?.length){
        setNotice({kind:"error",text:"该分类仍有下级分类、产品或属性模板引用。请先调整关联，再删除。"});return;
      }
      const {error}=await supabase.from("product_categories").delete().eq("id",category.id).eq("organization_id",org);
      if(error)throw error;await load(org);setConfirmCategoryDeleteId("");
      setNotice({kind:"success",text:"分类已删除。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const saveCategoryAttributes = async (event:FormEvent) => {
    event.preventDefault();if(!selectedCategoryId||!org)return;
    setBusy(true);setNotice(null);
    try{
      const current=categoryTemplates.filter(item=>item.category_id===selectedCategoryId);
      const rows=selectedDefinitionIds.map((id,index)=>({
        organization_id:org,category_id:selectedCategoryId,definition_id:id,
        is_required:selectedRequiredIds.includes(id),sort_order:index
      }));
      if(rows.length){
        const {error}=await supabase.from("product_category_attribute_templates").upsert(rows,{onConflict:"category_id,definition_id"});
        if(error)throw error;
      }
      for(const item of current.filter(item=>!selectedDefinitionIds.includes(item.definition_id))){
        const {error}=await supabase.from("product_category_attribute_templates").delete().eq("id",item.id).eq("organization_id",org);
        if(error)throw error;
      }
      const {data,error}=await supabase.from("product_category_attribute_templates").select("*").eq("organization_id",org).order("sort_order");
      if(error)throw error;setCategoryTemplates((data||[]) as CategoryTemplate[]);
      setNotice({kind:"success",text:"分类属性模板已保存，采用增量更新避免先清空原有关联。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const saveDefinition = async (event:FormEvent) => {
    event.preventDefault();if(!definitionForm.name.trim()||!org)return;
    setBusy(true);setNotice(null);
    try{
      const row={organization_id:org,name:definitionForm.name.trim(),slug:makeSlug(definitionForm.name),
        data_type:definitionForm.data_type,unit:definitionForm.unit.trim()||null,attribute_group:definitionForm.group,
        semantic_type:definitionForm.semantic,display_type:definitionForm.display,
        default_variant_creation_mode:definitionForm.variant_mode,include_in_analysis:true,
        sort_order:editingDefinitionId?(definitions.find(item=>item.id===editingDefinitionId)?.sort_order??definitions.length):definitions.length};
      const result=editingDefinitionId
        ?await supabase.from("product_attribute_definitions").update(row).eq("id",editingDefinitionId).eq("organization_id",org).select("*,product_attribute_definition_values(*)").single()
        :await supabase.from("product_attribute_definitions").insert(row).select("*,product_attribute_definition_values(*)").single();
      if(result.error)throw result.error;
      setDefinitions(prev=>editingDefinitionId?prev.map(item=>item.id===editingDefinitionId?result.data as Definition:item):[...prev,result.data as Definition]);
      setDefinitionForm({name:"",data_type:"single_select",unit:"",group:"规格参数",semantic:"specification",display:"pills",variant_mode:"never"});
      setNotice({kind:"success",text:editingDefinitionId?"属性定义已更新。":"属性已加入企业属性库。"});setEditingDefinitionId("");
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const editDefinition = (definition:Definition) => {
    setEditingDefinitionId(definition.id);
    setDefinitionForm({name:definition.name,data_type:definition.data_type,unit:definition.unit||"",
      group:definition.attribute_group,semantic:definition.semantic_type,display:definition.display_type,
      variant_mode:definition.default_variant_creation_mode});
  };

  const deleteDefinition = async (definition:Definition) => {
    if(confirmDefinitionDeleteId!==definition.id){setConfirmDefinitionDeleteId(definition.id);return;}
    setBusy(true);setNotice(null);
    try{
      const [usedByProducts,usedByCategories]=await Promise.all([
        supabase.from("product_attributes").select("id").eq("definition_id",definition.id).limit(1),
        supabase.from("product_category_attribute_templates").select("id").eq("definition_id",definition.id).limit(1)
      ]);
      if(usedByProducts.error)throw usedByProducts.error;if(usedByCategories.error)throw usedByCategories.error;
      if(usedByProducts.data?.length||usedByCategories.data?.length){
        setNotice({kind:"error",text:"该属性已被产品或分类模板引用，不能直接删除。请先解除关联。"});return;
      }
      const {error}=await supabase.from("product_attribute_definitions").delete().eq("id",definition.id).eq("organization_id",org);
      if(error)throw error;setDefinitions(prev=>prev.filter(item=>item.id!==definition.id));
      setConfirmDefinitionDeleteId("");setNotice({kind:"success",text:"属性定义已删除。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const addDefinitionValue = async (d:Definition) => {
    const raw=(definitionValueDraft[d.id]||"").trim();if(!raw)return;
    const isNumeric=["number","dimension"].includes(d.data_type);
    const numeric=isNumeric?Number(raw):null;
    if(isNumeric&&(numeric===null||!Number.isFinite(numeric))){setNotice({kind:"error",text:"数值型属性必须填写有效数字。"});return;}
    setBusy(true);setNotice(null);
    try{
      const {data,error}=await supabase.from("product_attribute_definition_values").insert({
        organization_id:org,definition_id:d.id,value_text:raw,value_number:numeric,unit:d.unit,
        sort_order:(d.product_attribute_definition_values||[]).length
      }).select("*").single();
      if(error)throw error;
      setDefinitions(prev=>prev.map(item=>item.id===d.id?{
        ...item,product_attribute_definition_values:[...(item.product_attribute_definition_values||[]),data as DefinitionValue]
      }:item));
      setDefinitionValueDraft(prev=>({...prev,[d.id]:""}));
      setNotice({kind:"success",text:"属性值已添加。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const deleteDefinitionValue = async (definition:Definition,value:DefinitionValue) => {
    if(confirmValueDeleteId!==value.id){setConfirmValueDeleteId(value.id);return;}
    setBusy(true);setNotice(null);
    try{
      const {data:used,error:usedError}=await supabase.from("product_attribute_values").select("id").eq("definition_value_id",value.id).limit(1);
      if(usedError)throw usedError;
      if(used?.length){setNotice({kind:"error",text:"该属性值已被产品使用，不能删除。"});return;}
      const {error}=await supabase.from("product_attribute_definition_values").delete().eq("id",value.id).eq("definition_id",definition.id).eq("organization_id",org);
      if(error)throw error;
      setDefinitions(prev=>prev.map(item=>item.id===definition.id?{...item,product_attribute_definition_values:(item.product_attribute_definition_values||[]).filter(v=>v.id!==value.id)}:item));
      setConfirmValueDeleteId("");setNotice({kind:"success",text:"属性值已删除。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const updateProductAttributeMode = async (attribute:ProductAttribute,mode:string) => {
    if(!selected||!org)return;
    if(mode!=="never"&&!(attribute.product_attribute_values||[]).length){
      setNotice({kind:"error",text:"请先为该属性添加可选值，再启用变体轴。"});return;
    }
    setBusy(true);setNotice(null);
    try{
      if(mode==="never"){
        const {data,error}=await supabase.from("product_variant_values").select("id")
          .eq("attribute_id",attribute.id).eq("product_id",selected.id).limit(1);
        if(error)throw error;
        if(data?.length){setNotice({kind:"error",text:"该属性已关联现有 SKU。请先调整或删除相关 SKU，再关闭变体轴。"});return;}
      }
      const {error}=await supabase.from("product_attributes").update({
        variant_creation_mode:mode,is_variant_axis:mode!=="never"
      }).eq("id",attribute.id).eq("product_id",selected.id).eq("organization_id",org);
      if(error)throw error;
      setProductAttributes(prev=>prev.map(item=>item.id===attribute.id?{...item,variant_creation_mode:mode}:item));
      if(mode==="never")setVariantAxisSelection(prev=>{const next={...prev};delete next[attribute.id];return next;});
      setNotice({kind:"success",text:"「"+attribute.name+"」的变体规则已更新。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const addProductAttributeValue = async (attribute:ProductAttribute) => {
    if(!selected||!org)return;
    const raw=(attributeValueDraft[attribute.id]||"").trim();if(!raw)return;
    const isNumeric=["number","dimension"].includes(attribute.data_type);
    const numeric=isNumeric?Number(raw):null;
    if(isNumeric&&(numeric===null||!Number.isFinite(numeric))){setNotice({kind:"error",text:"数值型属性必须填写有效数字。"});return;}
    setBusy(true);setNotice(null);
    try{
      const {data,error}=await supabase.from("product_attribute_values").insert({
        organization_id:org,product_id:selected.id,attribute_id:attribute.id,value_text:raw,value_number:numeric,
        unit:attribute.unit,sort_order:(attribute.product_attribute_values||[]).length
      }).select("id,value_text,value_number,unit").single();
      if(error)throw error;
      setProductAttributes(prev=>prev.map(item=>item.id===attribute.id?{
        ...item,product_attribute_values:[...(item.product_attribute_values||[]),data as {id:string;value_text:string;value_number:number|null;unit:string|null}]
      }:item));
      setAttributeValueDraft(prev=>({...prev,[attribute.id]:""}));
      setNotice({kind:"success",text:"「"+attribute.name+"」已新增属性值。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const deleteProductAttributeValue = async (attribute:ProductAttribute,value:{id:string;value_text:string;unit:string|null}) => {
    if(!selected||!org)return;
    if(confirmProductValueDeleteId!==value.id){setConfirmProductValueDeleteId(value.id);return;}
    setBusy(true);setNotice(null);
    try{
      const {data:links,error:linkError}=await supabase.from("product_variant_values").select("id")
        .eq("attribute_value_id",value.id).eq("product_id",selected.id).eq("organization_id",org).limit(1);
      if(linkError)throw linkError;
      if(links?.length){setNotice({kind:"error",text:"该属性值已关联现有 SKU，不能删除。"});return;}
      const {error}=await supabase.from("product_attribute_values").delete()
        .eq("id",value.id).eq("attribute_id",attribute.id).eq("product_id",selected.id).eq("organization_id",org);
      if(error)throw error;
      setProductAttributes(prev=>prev.map(item=>item.id===attribute.id?{
        ...item,product_attribute_values:(item.product_attribute_values||[]).filter(v=>v.id!==value.id)
      }:item));
      setConfirmProductValueDeleteId("");setNotice({kind:"success",text:"产品属性值已删除。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const restoreProduct = async () => {
    if(!selected||!org)return;
    setBusy(true);setNotice(null);
    try{
      const {error}=await supabase.from("products").update({status:"draft",updated_at:new Date().toISOString()})
        .eq("id",selected.id).eq("organization_id",org);
      if(error)throw error;
      await load(org);setSelected(prev=>prev?{...prev,status:"draft"}:prev);
      setNotice({kind:"success",text:"产品已恢复为草稿状态。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const archiveProduct = async () => {
    if(!selected||!org)return;
    setBusy(true);setNotice(null);
    try{
      const {error}=await supabase.from("products").update({status:"archived",updated_at:new Date().toISOString()})
        .eq("id",selected.id).eq("organization_id",org);
      if(error)throw error;
      await load(org);setSelected(null);setVariants([]);setProductAttributes([]);setVariantAttributeValues([]);
      setNotice({kind:"success",text:"产品已归档，历史 SKU 和关联数据均予以保留。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const createVariant = async (event:FormEvent) => {
    event.preventDefault();if(!selected||!org)return;
    const numericFields:[string,string][]=[["销售价格",variantForm.price],["成本",variantForm.cost]];
    for(const field of numericFields){
      if(field[1]!==""&&(!Number.isFinite(Number(field[1]))||Number(field[1])<0)){
        setNotice({kind:"error",text:field[0]+"必须是大于或等于 0 的有效数字。"});return;
      }
    }
    const axes=productAttributes.filter(attribute=>attribute.variant_creation_mode!=="never");
    const missingAxis=axes.find(attribute=>!variantAxisSelection[attribute.id]);
    if(missingAxis){setNotice({kind:"error",text:"请先选择「"+missingAxis.name+"」的规格值，再保存 SKU。"});return;}
    setBusy(true);setNotice(null);
    try{
      const row={organization_id:org,product_id:selected.id,title:variantForm.title.trim()||null,
        sku:variantForm.sku.trim()||null,model:variantForm.model.trim()||null,barcode:variantForm.barcode.trim()||null,
        price:variantForm.price===""?null:Number(variantForm.price),currency:variantForm.currency,
        cost:variantForm.cost===""?null:Number(variantForm.cost)};
      const result=editingVariantId
        ?await supabase.from("product_variants").update(row).eq("id",editingVariantId).eq("product_id",selected.id).eq("organization_id",org).select("*").single()
        :await supabase.from("product_variants").insert(row).select("*").single();
      if(result.error)throw result.error;
      const variantId=result.data.id;
      const links=axes.map(attribute=>({organization_id:org,product_id:selected.id,variant_id:variantId,
        attribute_id:attribute.id,attribute_value_id:variantAxisSelection[attribute.id]}));
      if(links.length){
        const {error:linkError}=await supabase.from("product_variant_values").upsert(links,{onConflict:"variant_id,attribute_id"});
        if(linkError){
          if(!editingVariantId)await supabase.from("product_variants").delete().eq("id",variantId).eq("organization_id",org);
          throw linkError;
        }
        const keep=axes.map(attribute=>attribute.id);
        const filter=keep.map(id=>'"'+id+'"').join(",");
        const {error:staleError}=await supabase.from("product_variant_values").delete().eq("variant_id",variantId)
          .not("attribute_id","in","("+filter+")");
        if(staleError)throw staleError;
      }else{
        const {error:clearError}=await supabase.from("product_variant_values").delete().eq("variant_id",variantId).eq("organization_id",org);
        if(clearError)throw clearError;
      }
      const {data:linksNow,error:linksError}=await supabase.from("product_variant_values")
        .select("id,variant_id,attribute_id,attribute_value_id").eq("variant_id",variantId).eq("organization_id",org);
      if(linksError)throw linksError;
      setVariantAttributeValues(prev=>[...prev.filter(item=>item.variant_id!==variantId),...(linksNow||[]) as VariantAttributeValue[]]);
      setVariants(prev=>editingVariantId?prev.map(item=>item.id===variantId?result.data as Variant:item):[...prev,result.data as Variant]);
      setEditingVariantId("");setConfirmVariantDeleteId("");setVariantAxisSelection({});
      setVariantForm({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});
      setNotice({kind:"success",text:editingVariantId?"SKU 与规格关联已更新。":"SKU 与所选规格属性已关联并保存。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const generateVariantCombinations = async () => {
    if(!selected||!org)return;
    const axes=productAttributes.filter(attribute=>attribute.variant_creation_mode!=="never");
    if(!axes.length){setNotice({kind:"info",text:"请先启用至少一个变体轴。"});return;}
    const missing=axes.find(attribute=>!(attribute.product_attribute_values||[]).length);
    if(missing){setNotice({kind:"error",text:"属性「"+missing.name+"」尚未配置可选值。"});return;}
    let combinations:Record<string,string>[]=[{}];
    for(const axis of axes){
      const next:Record<string,string>[]=[];
      for(const current of combinations){
        for(const value of axis.product_attribute_values||[]){
          next.push({...current,[axis.id]:value.id});
        }
      }
      combinations=next;
    }
    const existingSignatures=new Set<string>();
    for(const variant of variants){
      const links=variantAttributeValues.filter(link=>link.variant_id===variant.id);
      const signature=axes.map(axis=>{
        const link=links.find(item=>item.attribute_id===axis.id);
        return axis.id+":"+(link?.attribute_value_id||"");
      }).join("|");
      if(links.length===axes.length)existingSignatures.add(signature);
    }
    const pending=combinations.filter(combo=>{
      const signature=axes.map(axis=>axis.id+":"+combo[axis.id]).join("|");
      return !existingSignatures.has(signature);
    });
    if(!pending.length){setNotice({kind:"info",text:"所有规格组合均已存在，无需重复生成。"});return;}
    setBusy(true);setNotice(null);
    try{
      const rows=pending.map(combo=>{
        const title=axes.map(axis=>{
          const value=(axis.product_attribute_values||[]).find(item=>item.id===combo[axis.id]);
          return axis.name+":"+(value?.value_text||"");
        }).join(" / ");
        return {organization_id:org,product_id:selected.id,title,sku:null,model:null,barcode:null,price:null,currency:"USD",cost:null};
      });
      const {data:created,error:createError}=await supabase.from("product_variants").insert(rows).select("*");
      if(createError)throw createError;
      const links=(created||[]).flatMap((variant,index)=>axes.map(axis=>({
        organization_id:org,product_id:selected.id,variant_id:variant.id,
        attribute_id:axis.id,attribute_value_id:pending[index][axis.id]
      })));
      const {error:linkError}=await supabase.from("product_variant_values").insert(links);
      if(linkError){
        const ids=(created||[]).map(item=>item.id);
        const {error:rollbackError}=await supabase.from("product_variants").delete().in("id",ids).eq("organization_id",org);
        throw new Error(rollbackError
          ?"规格组合关联失败，自动回滚也未完成："+linkError.message+"；"+rollbackError.message
          :"规格组合关联失败，已撤销本次生成："+linkError.message);
      }
      const [variantResult,linkResult]=await Promise.all([
        supabase.from("product_variants").select("*").eq("product_id",selected.id).eq("organization_id",org).order("created_at"),
        supabase.from("product_variant_values").select("id,variant_id,attribute_id,attribute_value_id").eq("product_id",selected.id).eq("organization_id",org)
      ]);
      if(variantResult.error)throw variantResult.error;if(linkResult.error)throw linkResult.error;
      setVariants((variantResult.data||[]) as Variant[]);
      setVariantAttributeValues((linkResult.data||[]) as VariantAttributeValue[]);
      setNotice({kind:"success",text:"已生成 "+pending.length+" 个缺失规格组合。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
  };

  const editVariant = (variant:Variant) => {
    setEditingVariantId(variant.id);
    setVariantForm({title:variant.title||"",sku:variant.sku||"",model:variant.model||"",barcode:variant.barcode||"",
      price:variant.price==null?"":String(variant.price),currency:variant.currency||"USD",
      cost:variant.cost==null?"":String(variant.cost)});
    const selection:Record<string,string>={};
    variantAttributeValues.filter(item=>item.variant_id===variant.id).forEach(item=>{selection[item.attribute_id]=item.attribute_value_id;});
    setVariantAxisSelection(selection);
  };

  const deleteVariant = async (variant:Variant) => {
    if(confirmVariantDeleteId!==variant.id){setConfirmVariantDeleteId(variant.id);return;}
    setBusy(true);setNotice(null);
    try{
      const {error:linksError}=await supabase.from("product_variant_values").select("id")
        .eq("variant_id",variant.id).eq("organization_id",org);
      if(linksError)throw linksError;
      const {error:deleteError}=await supabase.from("product_variants").delete()
        .eq("id",variant.id).eq("product_id",selected?.id||"").eq("organization_id",org);
      if(deleteError)throw deleteError;
      setVariants(prev=>prev.filter(item=>item.id!==variant.id));
      setVariantAttributeValues(prev=>prev.filter(item=>item.variant_id!==variant.id));
      if(editingVariantId===variant.id){
        setEditingVariantId("");setVariantForm({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});setVariantAxisSelection({});
      }
      setConfirmVariantDeleteId("");setNotice({kind:"success",text:"SKU 已删除。"});
    }catch(e){setNotice({kind:"error",text:message(e)});}
    finally{setBusy(false);}
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
  const openProduct = async (p:Product) => {
    setBusy(true);setSelected(p);setEditing(false);setNotice(null);
    try{
      const [variantResult,attributeResult,variantValuesResult]=await Promise.all([
        supabase.from("product_variants").select("*").eq("product_id",p.id).eq("organization_id",org).order("created_at"),
        supabase.from("product_attributes").select("*,product_attribute_values(id,value_text,value_number,unit)").eq("product_id",p.id).eq("organization_id",org).order("sort_order"),
        supabase.from("product_variant_values").select("id,variant_id,attribute_id,attribute_value_id").eq("product_id",p.id).eq("organization_id",org)
      ]);
      if(variantResult.error)throw variantResult.error;if(attributeResult.error)throw attributeResult.error;if(variantValuesResult.error)throw variantValuesResult.error;
      setVariants((variantResult.data||[]) as Variant[]);setProductAttributes((attributeResult.data||[]) as ProductAttribute[]);
      setVariantAttributeValues((variantValuesResult.data||[]) as VariantAttributeValue[]);setVariantAxisSelection({});
      setEditingVariantId("");setConfirmVariantDeleteId("");setVariantForm({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});
    }catch(e){setSelected(null);setNotice({kind:"error",text:message(e)});throw e;}
    finally{setBusy(false);}
  };
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
              <FormField className="pc-field" label="产品类型" htmlFor="pc-product-type"><CarbonSelect id="pc-product-type" value={form.product_type} onChange={v=>setForm(p=>({...p,product_type:v}))}><option value="physical">可库存商品</option><option value="service">服务</option><option value="combo">组合商品</option></CarbonSelect></FormField>
              <TextInput id="pc-brand" labelText="品牌" value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))}/>
              <TextInput id="pc-manufacturer" labelText="制造商" value={form.manufacturer} onChange={e=>setForm(p=>({...p,manufacturer:e.target.value}))}/>
              <TextInput id="pc-model" labelText="型号 / 系列" value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}/>
              <TextInput id="pc-reference" labelText="内部参考编号" value={form.internal_reference} onChange={e=>setForm(p=>({...p,internal_reference:e.target.value}))}/>
              <TextInput id="pc-sku" labelText="主 SKU（无变体时使用）" value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value}))}/>
              <TextInput id="pc-barcode" labelText="条码 / GTIN" value={form.barcode} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))}/>
              <FormField className="pc-field" label="产品分类" htmlFor="pc-category"><CarbonSelect id="pc-category" value={form.category_id} onChange={v=>setForm(p=>({...p,category_id:v}))} placeholder="选择产品分类"><option value="">未分类</option>{categoryOptions.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</CarbonSelect></FormField>
              <FormField className="pc-field" label="产品生命周期" htmlFor="pc-lifecycle"><CarbonSelect id="pc-lifecycle" value={form.lifecycle_stage} onChange={v=>setForm(p=>({...p,lifecycle_stage:v}))}><option value="development">开发中</option><option value="pre_launch">上市准备</option><option value="launched">已发布</option><option value="active">在售</option><option value="discontinued">已停产</option></CarbonSelect></FormField>
              <TextInput id="pc-image" labelText="产品图片 URL" value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))}/>
              <TextInput id="pc-website" labelText="官方产品链接" value={form.website_url} onChange={e=>setForm(p=>({...p,website_url:e.target.value}))}/>
              <div className="pc-span-2"><TextArea id="pc-description" labelText="产品描述 / 内部备注" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3}/></div>
            </div></div>
            <div className="pc-form-section"><h4>02 · 销售与采购</h4><div className="pc-checks"><Checkbox id="pc-sell" labelText="可销售" checked={form.can_be_sold} onChange={(_,d)=>setForm(p=>({...p,can_be_sold:d.checked}))}/><Checkbox id="pc-buy" labelText="可采购" checked={form.can_be_purchased} onChange={(_,d)=>setForm(p=>({...p,can_be_purchased:d.checked}))}/></div><div className="pc-form-grid">
              <NumberInput id="pc-price" label="销售价格" min={0} step={0.01} value={form.sales_price} onChange={(_,d)=>setForm(p=>({...p,sales_price:String(d.value??"")}))}/>
              <FormField className="pc-field" label="销售币种" htmlFor="pc-sales-currency"><CarbonSelect id="pc-sales-currency" value={form.sales_currency} onChange={v=>setForm(p=>({...p,sales_currency:v}))}><option value="USD">USD · 美元</option><option value="EUR">EUR · 欧元</option><option value="GBP">GBP · 英镑</option><option value="JPY">JPY · 日元</option><option value="CNY">CNY · 人民币</option></CarbonSelect></FormField>
              <NumberInput id="pc-cost" label="成本" min={0} step={0.01} value={form.cost} onChange={(_,d)=>setForm(p=>({...p,cost:String(d.value??"")}))}/>
              <FormField className="pc-field" label="成本币种" htmlFor="pc-cost-currency"><CarbonSelect id="pc-cost-currency" value={form.cost_currency} onChange={v=>setForm(p=>({...p,cost_currency:v}))}><option value="USD">USD · 美元</option><option value="EUR">EUR · 欧元</option><option value="CNY">CNY · 人民币</option></CarbonSelect></FormField>
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
            <div className="pc-panel-heading"><div><button className="pc-back" onClick={()=>setSelected(null)}>← 返回产品目录</button><h3>{selected.name}</h3><p>{selected.brand||"未设置品牌"} · {selected.model||"未设置型号"} · {(selected.category_path||categoryPathFor(selected.category_id)).join(" / ")||"未分类"}</p></div><div className="pc-heading-actions"><Tag type={selected.status==="archived"?"gray":"blue"}>{selected.status==="archived"?"已归档":"模板 v"+(selected.version||1)}</Tag><Button kind="secondary" onClick={()=>startEdit(selected)}>编辑模板</Button>{selected.status==="archived"?<Button kind="primary" disabled={busy} onClick={restoreProduct}>恢复产品</Button>:<Button kind="danger" disabled={busy} onClick={archiveProduct}>归档产品</Button>}</div></div>
            <div className="pc-product-facts"><div><span>内部参考</span><strong>{selected.internal_reference||"—"}</strong></div><div><span>主 SKU</span><strong>{selected.sku||"由变体定义"}</strong></div><div><span>销售价格</span><strong>{money(selected.sales_price,selected.sales_currency)}</strong></div><div><span>生命周期</span><strong>{selected.lifecycle_stage}</strong></div></div>
            <section className="pc-form-section"><div className="pc-section-head"><div><h4>产品变体 / Product Variants</h4><p>变体是可销售的实际规格组合，每个变体拥有独立 SKU、条码和商业价格。</p></div><div className="pc-variant-actions"><Tag>{variants.length} 个变体</Tag><Button kind="secondary" size="sm" disabled={busy||!productAttributes.some(a=>a.variant_creation_mode!=="never")} onClick={generateVariantCombinations}>生成全部规格组合</Button></div></div>
              {productAttributes.some(a=>a.variant_creation_mode!=="never")&&<div className="pc-axis-selector"><div><strong>变体属性组合</strong><span>每个启用的变体轴都需要选择一个规格值；所选值会与新 SKU 一起保存。</span></div><div className="pc-axis-grid">{productAttributes.filter(a=>a.variant_creation_mode!=="never").map(a=><FormField className="pc-field" key={a.id} label={`${a.name}${a.unit?`（${a.unit}）`:""}`} htmlFor={`pc-axis-${a.id}`}><CarbonSelect id={`pc-axis-${a.id}`} value={variantAxisSelection[a.id]||""} onChange={v=>setVariantAxisSelection(prev=>({...prev,[a.id]:v}))} placeholder="选择属性值">{(a.product_attribute_values||[]).map(v=><option key={v.id} value={v.id}>{v.value_text}{v.unit?` ${v.unit}`:""}</option>)}</CarbonSelect></FormField>)}</div></div>}
              <form className="pc-variant-form" onSubmit={createVariant}>
                <TextInput id="pc-v-title" labelText="变体名称 / 规格组合" value={variantForm.title} onChange={e=>setVariantForm(p=>({...p,title:e.target.value}))}/>
                <TextInput id="pc-v-sku" labelText="SKU" value={variantForm.sku} onChange={e=>setVariantForm(p=>({...p,sku:e.target.value}))}/>
                <TextInput id="pc-v-model" labelText="型号" value={variantForm.model} onChange={e=>setVariantForm(p=>({...p,model:e.target.value}))}/>
                <TextInput id="pc-v-barcode" labelText="条码" value={variantForm.barcode} onChange={e=>setVariantForm(p=>({...p,barcode:e.target.value}))}/>
                <NumberInput id="pc-v-price" label="销售价格" min={0} step={0.01} value={variantForm.price} onChange={(_,d)=>setVariantForm(p=>({...p,price:String(d.value??"")}))}/>
                <FormField className="pc-field" label="币种" htmlFor="pc-variant-currency"><CarbonSelect id="pc-variant-currency" value={variantForm.currency} onChange={v=>setVariantForm(p=>({...p,currency:v}))}><option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option></CarbonSelect></FormField>
                <NumberInput id="pc-v-cost" label="成本" min={0} step={0.01} value={variantForm.cost} onChange={(_,d)=>setVariantForm(p=>({...p,cost:String(d.value??"")}))}/>
                <Button type="submit" disabled={busy}>{busy?"保存中…":editingVariantId?"保存 SKU":"新增 SKU"}</Button>{editingVariantId&&<Button kind="ghost" type="button" onClick={()=>{setEditingVariantId("");setVariantForm({title:"",sku:"",model:"",barcode:"",price:"",currency:"USD",cost:""});setVariantAxisSelection({});}}>取消编辑</Button>}
              </form>
              {variants.length?<div className="pc-table-wrap"><table className="pc-table"><thead><tr><th>变体</th><th>规格属性</th><th>SKU</th><th>型号</th><th>条码</th><th>销售价</th><th>成本</th><th>操作</th></tr></thead><tbody>{variants.map(v=>{const values=variantAttributeValues.filter(link=>link.variant_id===v.id).map(link=>{const attribute=productAttributes.find(item=>item.id===link.attribute_id);const value=attribute?.product_attribute_values.find(item=>item.id===link.attribute_value_id);return attribute&&value?attribute.name+"："+value.value_text+(value.unit?" "+value.unit:""):null;}).filter(Boolean);return <tr key={v.id}><td>{v.title||"默认变体"}</td><td>{values.length?values.join(" · "):"—"}</td><td>{v.sku||"—"}</td><td>{v.model||"—"}</td><td>{v.barcode||"—"}</td><td>{money(v.price,v.currency||"USD")}</td><td>{money(v.cost,v.currency||"USD")}</td><td><Button kind="ghost" size="sm" onClick={()=>editVariant(v)}>编辑</Button><Button kind="ghost" size="sm" disabled={busy} onClick={()=>deleteVariant(v)}>{confirmVariantDeleteId===v.id?"再次点击确认删除":"删除"}</Button></td></tr>;})}</tbody></table></div>:<div className="pc-empty-inline">尚未创建实际销售变体。可先添加默认 SKU，后续再配置属性组合。</div>}
            </section>
            <section className="pc-form-section"><div className="pc-section-head"><div><h4>产品属性与变体规则</h4><p>管理此产品实际使用的属性值，并决定哪些属性参与 SKU 组合。</p></div><Tag>{productAttributes.length} 项属性</Tag></div>{productAttributes.length?<div className="pc-product-attribute-list">{productAttributes.map(a=><article className="pc-product-attribute" key={a.id}><div className="pc-product-attribute-heading"><div><strong>{a.name}{a.unit?"（"+a.unit+"）":""}</strong><span>{(a.product_attribute_values||[]).length} 个可选值</span></div><FormField className="pc-field" label="变体规则" htmlFor={"pc-attribute-mode-"+a.id}><CarbonSelect id={"pc-attribute-mode-"+a.id} value={a.variant_creation_mode} onChange={value=>updateProductAttributeMode(a,value)}><option value="never">普通属性（不生成 SKU）</option><option value="dynamic">动态变体轴</option><option value="instant">立即变体轴</option></CarbonSelect></FormField></div><div className="pc-definition-values">{(a.product_attribute_values||[]).map(v=><span className="pc-definition-value" key={v.id}>{v.value_text}{v.unit?" "+v.unit:""}<button type="button" aria-label={"删除属性值 "+v.value_text} disabled={busy} onClick={()=>deleteProductAttributeValue(a,v)}>{confirmProductValueDeleteId===v.id?"确认?":"×"}</button></span>)}</div><form className="pc-add-value" onSubmit={event=>{event.preventDefault();addProductAttributeValue(a);}}><TextInput id={"pc-attribute-value-"+a.id} labelText={"新增「"+a.name+"」属性值"} placeholder="输入属性值" value={attributeValueDraft[a.id]||""} onChange={event=>setAttributeValueDraft(prev=>({...prev,[a.id]:event.target.value}))}/><Button type="submit" kind="secondary" disabled={busy||!(attributeValueDraft[a.id]||"").trim()}>添加属性值</Button></form></article>)}</div>:<div className="pc-empty-inline">分类「{categoryName(selected.category_id)}」尚未配置属性模板。可先在「属性管理」建立属性，再配置分类模板。</div>}</section>
          </div>:<><div className="pc-catalog-stats"><div><span>产品模板</span><strong>{products.length}</strong></div><div><span>分类</span><strong>{categories.length}</strong></div><div><span>属性定义</span><strong>{definitions.length}</strong></div><div><span>已发布产品</span><strong>{products.filter(p=>p.status==="active"||p.lifecycle_stage==="active").length}</strong></div></div>
            <div className="pc-list-toolbar"><Search size="lg" labelText="搜索产品" placeholder="名称、品牌、型号、SKU 或内部编号" value={query} onChange={e=>setQuery(e.target.value)}/><FormField className="pc-field pc-status-filter" label="产品状态" htmlFor="pc-status-filter"><CarbonSelect id="pc-status-filter" value={statusFilter} onChange={setStatusFilter}><option value="all">全部状态</option><option value="draft">草稿</option><option value="active">已发布</option><option value="archived">已归档</option></CarbonSelect></FormField><span>{filtered.length} 条记录</span></div>
            {filtered.length?<div className="pc-product-list">{filtered.map(p=><button key={p.id} className="pc-product-row" onClick={()=>openProduct(p).catch(e=>setNotice({kind:"error",text:message(e)}))}><div className="pc-product-thumb">{p.image_url?<img src={p.image_url} alt=""/>:<span>▣</span>}</div><div className="pc-product-main"><strong>{p.name}</strong><span>{p.brand||"未设置品牌"} · {p.model||"未设置型号"}</span><small>{categoryName(p.category_id)} · {p.internal_reference||p.sku||"未设置编码"}</small></div><div className="pc-product-price"><strong>{money(p.sales_price,p.sales_currency||"USD")}</strong><span>{p.status==="archived"?"已归档":p.status==="active"?"已发布":"草稿"} · {p.can_be_sold?"可销售":"不销售"}</span></div><span className="pc-row-arrow">›</span></button>)}</div>:<div className="pc-empty"><div className="pc-empty-icon">▣</div><h3>{query?"没有匹配的产品":"产品主档案尚为空"}</h3><p>创建产品模板后，可按分类自动载入属性，并在模板下维护实际 SKU 变体。</p><Button kind="primary" onClick={startNew}>创建第一个产品</Button></div>}
          </>}
        </TabPanel>
        <TabPanel>
          <div className="pc-management-grid">
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>产品分类</h3><p>建立独立的多级产品分类；分类与属性是不同的主数据。</p></div><Tag>{categories.length} 个分类</Tag></div>
              <form className="pc-create-category" onSubmit={saveCategory}>
                <TextInput id="pc-cat-name" labelText="分类名称 *" value={categoryForm.name} onChange={e=>setCategoryForm(p=>({...p,name:e.target.value}))} required/>
                <TextInput id="pc-cat-code" labelText="分类编码" value={categoryForm.code} onChange={e=>setCategoryForm(p=>({...p,code:e.target.value}))}/>
                <FormField className="pc-field" label="上级分类" htmlFor="pc-category-parent"><CarbonSelect id="pc-category-parent" value={categoryForm.parent_id} onChange={v=>setCategoryForm(p=>({...p,parent_id:v}))} placeholder="顶级分类"><option value="">顶级分类</option>{categoryTree().map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</CarbonSelect></FormField>
                <TextInput id="pc-cat-description" labelText="分类说明" value={categoryForm.description} onChange={e=>setCategoryForm(p=>({...p,description:e.target.value}))}/>
                <Button type="submit" disabled={busy}>{busy?"保存中…":editingCategoryId?"保存分类":"创建分类"}</Button>{editingCategoryId&&<Button kind="ghost" type="button" onClick={()=>{setEditingCategoryId("");setCategoryForm({name:"",code:"",parent_id:"",description:""});}}>取消编辑</Button>}
              </form>
              <div className="pc-category-tree">{categoryTree().map(c=><div className="pc-category-item" key={c.id} style={{"--pc-category-indent":(12+categoryDepth(c.id)*18)+"px"} as CSSProperties}><span className="pc-category-dot"/><strong>{c.name}</strong><small>{c.code||c.slug}</small><Button kind="ghost" size="sm" onClick={()=>editCategory(c)}>编辑</Button><Button kind="ghost" size="sm" onClick={()=>{setSelectedCategoryId(c.id);const links=categoryTemplates.filter(x=>x.category_id===c.id);setSelectedDefinitionIds(links.map(x=>x.definition_id));setSelectedRequiredIds(links.filter(x=>x.is_required).map(x=>x.definition_id));}}>配置属性</Button><Button kind="ghost" size="sm" onClick={()=>deleteCategory(c)} disabled={busy}>{confirmCategoryDeleteId===c.id?"再次点击确认删除":"删除"}</Button></div>)}</div>
            </section>
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>分类属性模板</h3><p>为所选分类指定默认属性。创建该分类产品时自动初始化。</p></div></div>
              {selectedCategoryRecord?<form onSubmit={saveCategoryAttributes}><div className="pc-selected-category">{selectedCategoryRecord.name}</div><div className="pc-check-list">{definitions.map(d=><div className="pc-template-definition" key={d.id}><Checkbox id={`pc-cat-def-${d.id}`} labelText={d.name} checked={selectedDefinitionIds.includes(d.id)} onChange={(_,data)=>{setSelectedDefinitionIds(prev=>data.checked?[...prev,d.id]:prev.filter(x=>x!==d.id));if(!data.checked)setSelectedRequiredIds(prev=>prev.filter(x=>x!==d.id));}}/><Checkbox id={`pc-cat-required-${d.id}`} labelText="必填" checked={selectedRequiredIds.includes(d.id)} disabled={!selectedDefinitionIds.includes(d.id)} onChange={(_,data)=>setSelectedRequiredIds(prev=>data.checked?[...prev,d.id]:prev.filter(x=>x!==d.id))}/></div>)}</div><Button type="submit" disabled={busy}>保存分类属性模板</Button></form>:<div className="pc-empty-inline">从左侧分类列表选择「配置属性」。</div>}
            </section>
          </div>
        </TabPanel>
        <TabPanel>
          <div className="pc-management-grid pc-attributes-layout">
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>创建属性</h3><p>企业级统一属性库；不同产品分类可复用相同属性定义。</p></div></div>
              <form className="pc-create-attribute" onSubmit={saveDefinition}>
                <TextInput id="pc-attr-name" labelText="属性名称 *" value={definitionForm.name} onChange={e=>setDefinitionForm(p=>({...p,name:e.target.value}))} required/>
                <FormField className="pc-field" label="数据类型" htmlFor="pc-definition-type"><CarbonSelect id="pc-definition-type" value={definitionForm.data_type} onChange={v=>setDefinitionForm(p=>({...p,data_type:v}))}><option value="text">文本</option><option value="number">数值</option><option value="single_select">单选</option><option value="multi_select">多选</option><option value="boolean">布尔值</option><option value="date">日期</option><option value="dimension">带单位数值</option></CarbonSelect></FormField>
                <TextInput id="pc-attr-unit" labelText="计量单位" value={definitionForm.unit} onChange={e=>setDefinitionForm(p=>({...p,unit:e.target.value}))}/>
                <FormField className="pc-field" label="属性分组" htmlFor="pc-definition-group"><CarbonSelect id="pc-definition-group" value={definitionForm.group} onChange={v=>setDefinitionForm(p=>({...p,group:v}))}><option value="规格参数">规格参数</option><option value="外观设计">外观设计</option><option value="功能特性">功能特性</option><option value="合规认证">合规认证</option><option value="商业信息">商业信息</option></CarbonSelect></FormField>
                <FormField className="pc-field" label="变体生成方式" htmlFor="pc-definition-variant-mode"><CarbonSelect id="pc-definition-variant-mode" value={definitionForm.variant_mode} onChange={v=>setDefinitionForm(p=>({...p,variant_mode:v}))}><option value="never">不生成变体</option><option value="dynamic">动态生成</option><option value="instant">立即生成</option></CarbonSelect></FormField>
                <FormField className="pc-field" label="显示方式" htmlFor="pc-definition-display"><CarbonSelect id="pc-definition-display" value={definitionForm.display} onChange={v=>setDefinitionForm(p=>({...p,display:v}))}><option value="pills">标签按钮</option><option value="select">下拉选择</option><option value="radio">单选按钮</option><option value="color">颜色</option><option value="multi_checkbox">多选框</option><option value="image">图片</option></CarbonSelect></FormField>
                <Button type="submit" disabled={busy}>{busy?"保存中…":editingDefinitionId?"保存属性":"创建属性"}</Button>{editingDefinitionId&&<Button kind="ghost" type="button" onClick={()=>{setEditingDefinitionId("");setDefinitionForm({name:"",data_type:"single_select",unit:"",group:"规格参数",semantic:"specification",display:"pills",variant_mode:"never"});}}>取消编辑</Button>}
              </form>
            </section>
            <section className="pc-form-section"><div className="pc-section-head"><div><h3>属性库</h3><p>维护属性允许值、单位和变体规则。</p></div><Tag>{definitions.length} 项</Tag></div>
              <div className="pc-definition-list">{definitions.map(d=><article className="pc-definition" key={d.id}><div className="pc-definition-heading"><div><strong>{d.name}</strong><span>{d.attribute_group} · {d.data_type}{d.unit?` · ${d.unit}`:""}</span></div><Tag type={d.default_variant_creation_mode==="never"?"gray":"blue"}>{d.default_variant_creation_mode==="never"?"非变体属性":d.default_variant_creation_mode==="dynamic"?"动态变体":"立即变体"}</Tag><Button kind="ghost" size="sm" onClick={()=>editDefinition(d)}>编辑</Button><Button kind="ghost" size="sm" disabled={busy} onClick={()=>deleteDefinition(d)}>{confirmDefinitionDeleteId===d.id?"再次点击确认删除":"删除"}</Button></div><div className="pc-definition-values">{(d.product_attribute_definition_values||[]).map(v=><span className="pc-definition-value" key={v.id}>{v.value_text}{v.unit?` ${v.unit}`:""}<button type="button" aria-label={"删除属性值 "+v.value_text} disabled={busy} onClick={()=>deleteDefinitionValue(d,v)}>{confirmValueDeleteId===v.id?"确认?":"×"}</button></span>)}{!(d.product_attribute_definition_values||[]).length&&<small>尚未定义允许值</small>}</div><div className="pc-add-value"><TextInput id={`pc-value-${d.id}`} labelText="添加属性值" hideLabel value={definitionValueDraft[d.id]||""} onChange={e=>setDefinitionValueDraft(p=>({...p,[d.id]:e.target.value}))} placeholder="输入属性值"/><Button kind="tertiary" size="sm" onClick={()=>addDefinitionValue(d)}>添加</Button></div></article>)}</div>
            </section>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
    <div className="pc-footer-note">产品模板与 SKU 变体分层管理 · 企业属性库统一复用 · 分类模板自动初始化 · 商业字段为报价与合同预留</div>
  </section>;
}
