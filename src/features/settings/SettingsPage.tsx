import { useMemo, useState } from "react";
import { Button, Dropdown, PasswordInput, Tabs, TabList, Tab, TextInput, Toggle, InlineNotification } from "@carbon/react";
import { CheckmarkFilled, ChevronDown, Connect, Locked } from "@carbon/icons-react";
import { ApifySettingsPanel } from "./ApifySettingsPanel";

type Provider = { id: string; name: string; region: "国内" | "国际" | "聚合与基础设施"; category: string; description: string; logo: string; models: string[]; featured?: boolean };
const providers: Provider[] = [
  { id:"deepseek",name:"DeepSeek",region:"国内",category:"基础模型厂商",description:"推理与复杂逻辑分析",logo:"deepseek",models:["DeepSeek V3","DeepSeek R1"] ,featured:true},
  { id:"qwen",name:"阿里云百炼 · Qwen",region:"国内",category:"基础模型厂商",description:"长文本、企业知识与多模态",logo:"alibabacloud",models:["Qwen-Max","Qwen-Plus","Qwen-Turbo"],featured:true},
  { id:"zhipu",name:"智谱 GLM",region:"国内",category:"基础模型厂商",description:"企业推理与智能体任务",logo:"zhipu",models:["GLM-4.5","GLM-4.5-Air"]},
  { id:"moonshot",name:"月之暗面 · Kimi",region:"国内",category:"基础模型厂商",description:"长文档理解与研究分析",logo:"moonshot",models:["Kimi K2","Moonshot v1"]},
  { id:"volcengine",name:"火山引擎 · 豆包",region:"国内",category:"基础模型厂商",description:"企业分析与多模态能力",logo:"bytedance",models:["Doubao-pro","Doubao-lite"]},
  { id:"baidu",name:"百度 · 文心",region:"国内",category:"基础模型厂商",description:"中文知识与行业理解",logo:"baidu",models:["ERNIE 4.5","ERNIE X1"]},
  { id:"hunyuan",name:"腾讯混元",region:"国内",category:"基础模型厂商",description:"综合推理与多模态",logo:"tencent",models:["Hunyuan-T1","Hunyuan Turbo"]},
  { id:"minimax",name:"MiniMax",region:"国内",category:"基础模型厂商",description:"推理、内容与智能体",logo:"minimax",models:["MiniMax-Text-01","MiniMax-M1"]},
  { id:"iflytek",name:"科大讯飞 · 星火",region:"国内",category:"基础模型厂商",description:"中文理解与语音智能",logo:"iflytek",models:["Spark X1","Spark 4.0"]},
  { id:"openai",name:"OpenAI",region:"国际",category:"基础模型厂商",description:"通用推理、规划与结构化输出",logo:"openai",models:["GPT 系列（动态同步）"],featured:true},
  { id:"anthropic",name:"Anthropic · Claude",region:"国际",category:"基础模型厂商",description:"复杂分析与长上下文",logo:"anthropic",models:["Claude Sonnet","Claude Opus"],featured:true},
  { id:"google",name:"Google · Gemini",region:"国际",category:"基础模型厂商",description:"多模态与超长上下文",logo:"google",models:["Gemini Pro","Gemini Flash"]},
  { id:"xai",name:"xAI · Grok",region:"国际",category:"基础模型厂商",description:"推理与信息研究",logo:"x",models:["Grok 系列"]},
  { id:"mistral",name:"Mistral AI",region:"国际",category:"基础模型厂商",description:"高效推理与开放模型",logo:"mistralai",models:["Mistral Large","Codestral"]},
  { id:"cohere",name:"Cohere",region:"国际",category:"基础模型厂商",description:"企业检索与 RAG",logo:"cohere",models:["Command R+","Command A"]},
  { id:"openrouter",name:"OpenRouter",region:"聚合与基础设施",category:"模型聚合平台",description:"统一访问多家模型服务",logo:"openrouter",models:["多厂商模型目录"],featured:true},
  { id:"siliconflow",name:"SiliconFlow · 硅基流动",region:"聚合与基础设施",category:"模型聚合平台",description:"聚合模型推理与部署",logo:"siliconcloud",models:["多厂商模型目录"]},
  { id:"cloudflare",name:"Cloudflare Workers AI",region:"聚合与基础设施",category:"云端推理基础设施",description:"边缘推理与平台原生 AI",logo:"cloudflare",models:["Workers AI 模型目录"],featured:true},
];
const filters = ["全部","国内","国际","聚合与基础设施"] as const;
const logoHost = "https://cdn.simpleicons.org/";

async function readApiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "unknown";
  const body = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    const excerpt = body.replace(/\\s+/g, " ").slice(0, 240);
    throw new Error(`API 返回非 JSON 响应（HTTP ${response.status}，Content-Type: ${contentType}）。响应摘要：${excerpt || "（空响应）"}`);
  }
  let payload: any;
  try { payload = body ? JSON.parse(body) : {}; }
  catch { throw new Error(`API 返回了无效 JSON（HTTP ${response.status}）。`); }
  if (!response.ok) throw new Error(payload?.error || payload?.message || `请求失败（HTTP ${response.status}）`);
  return payload;
}
function ProviderLogo({provider}:{provider:Provider}) {
  const [failed,setFailed]=useState(false);
  return <div className="ai-provider-logo">{failed ? <span>{provider.name.slice(0,1)}</span> : <img src={logoHost+provider.logo} alt={provider.name+" Logo"} onError={()=>setFailed(true)} />}</div>;
}
export function SettingsPage() {
  const [filter,setFilter]=useState<(typeof filters)[number]>("全部");
  const [adminToken,setAdminToken]=useState("");
  const authHeaders={"Content-Type":"application/json","X-Kosmo-Admin-Token":adminToken};
  const validAdminToken=()=>{if(!adminToken.trim()){setDirectoryError("请先输入管理员令牌。");return false;}if(!/^[\x21-\x7E]+$/.test(adminToken)){setDirectoryError("管理员令牌只能包含可打印 ASCII 字符（不含空格、换行或中文）。请清空后重新粘贴。");return false;}return true;};
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState<string|null>("openrouter");
  const [workersAiTesting,setWorkersAiTesting]=useState(false);
  const [workersAiStatus,setWorkersAiStatus]=useState("");
  const [workersAiOutput,setWorkersAiOutput]=useState("");
  const [workersAiVerified,setWorkersAiVerified]=useState(false);
  const [editingProviders,setEditingProviders]=useState<Record<string,boolean>>({});
  const [drafts,setDrafts]=useState<Record<string,{baseUrl:string;model:string;apiKey:string;enabled:boolean}>>({});
  const [providerMessage,setProviderMessage]=useState<Record<string,string>>({});
  const [providerBusy,setProviderBusy]=useState<string|null>(null);
  const [savedProviders,setSavedProviders]=useState<Record<string,{baseUrl:string;model:string;enabled:boolean;hasKey:boolean}>>({});
  const [directoryLoading,setDirectoryLoading]=useState(false);
  const [directoryError,setDirectoryError]=useState("");
  const [lastRefresh,setLastRefresh]=useState<string>("");
  const [activePanel,setActivePanel]=useState<"providers"|"models"|"operations"|"security">("providers");
  const [defaultProvider,setDefaultProvider]=useState("cloudflare");
  const defaults:Record<string,{baseUrl:string;model:string}>={deepseek:{baseUrl:"https://api.deepseek.com",model:"deepseek-chat"},qwen:{baseUrl:"https://dashscope.aliyuncs.com/compatible-mode/v1",model:"qwen-plus"},zhipu:{baseUrl:"https://open.bigmodel.cn/api/paas/v4",model:"glm-4-plus"},moonshot:{baseUrl:"https://api.moonshot.cn/v1",model:"kimi-k2"},volcengine:{baseUrl:"https://ark.cn-beijing.volces.com/api/v3",model:"doubao-pro-32k"},openai:{baseUrl:"https://api.openai.com/v1",model:"gpt-4.1-mini"},anthropic:{baseUrl:"https://api.anthropic.com/v1",model:"claude-sonnet-4-5"},google:{baseUrl:"https://generativelanguage.googleapis.com/v1beta/openai",model:"gemini-2.5-flash"},openrouter:{baseUrl:"https://openrouter.ai/api/v1",model:"openai/gpt-4.1-mini"},siliconflow:{baseUrl:"https://api.siliconflow.cn/v1",model:"deepseek-ai/DeepSeek-V3"}};
  const draftFor=(id:string)=>drafts[id]||{...(defaults[id]||{baseUrl:"https://api.example.com/v1",model:""}),apiKey:"",enabled:true};
  const loadProviders=async()=>{if(!validAdminToken())return;setDirectoryLoading(true);setDirectoryError("");try{const r=await fetch("/api/ai/providers",{headers:{"X-Kosmo-Admin-Token":adminToken}});const j=await readApiResponse(r);const next:Record<string,{baseUrl:string;model:string;enabled:boolean;hasKey:boolean}>={};for(const item of j.providers||[])next[item.id]=item;setSavedProviders(next);setLastRefresh(new Date().toLocaleString());}catch(e){setDirectoryError(e instanceof Error?e.message:"读取配置失败");}finally{setDirectoryLoading(false);}};

  const saveProvider=async(id:string)=>{if(!validAdminToken())return;const d=draftFor(id);setProviderBusy(id);setProviderMessage(v=>({...v,[id]:""}));try{const r=await fetch("/api/ai/providers",{method:"POST",headers:authHeaders,body:JSON.stringify({id,name:providers.find(p=>p.id===id)?.name||id,...d})});await readApiResponse(r);setDrafts(v=>({...v,[id]:{...d,apiKey:""}}));setSavedProviders(v=>({...v,[id]:{baseUrl:d.baseUrl,model:d.model,enabled:d.enabled,hasKey:true}}));setEditingProviders(v=>({...v,[id]:false}));setProviderMessage(v=>({...v,[id]:"已加密保存。密钥不会再次显示。"}));}catch(e){setProviderMessage(v=>({...v,[id]:e instanceof Error?e.message:"保存失败"}));}finally{setProviderBusy(null);}};
  const testProvider=async(id:string)=>{if(!validAdminToken())return;setProviderBusy(id);setProviderMessage(v=>({...v,[id]:"正在发起真实模型请求…"}));try{const r=await fetch("/api/ai/providers/test",{method:"POST",headers:authHeaders,body:JSON.stringify({id})});const j=await readApiResponse(r);setProviderMessage(v=>({...v,[id]:"连接成功："+(typeof j.result==="string"?j.result:JSON.stringify(j.result))}));}catch(e){setProviderMessage(v=>({...v,[id]:e instanceof Error?e.message:"连接失败"}));}finally{setProviderBusy(null);}};
  const deleteProvider=async(id:string)=>{if(!validAdminToken())return;setProviderBusy(id);try{const r=await fetch("/api/ai/providers?id="+encodeURIComponent(id),{method:"DELETE",headers:authHeaders});await readApiResponse(r);setProviderMessage(v=>({...v,[id]:"配置已删除。"}));setEditingProviders(v=>({...v,[id]:false}));setSavedProviders(v=>{const n={...v};delete n[id];return n;});}catch(e){setProviderMessage(v=>({...v,[id]:e instanceof Error?e.message:"删除失败"}));}finally{setProviderBusy(null);}};
  const testWorkersAI=async()=>{if(!validAdminToken())return;setWorkersAiTesting(true);setWorkersAiStatus("");setWorkersAiOutput("");try{const response=await fetch("/api/ai/providers/test",{method:"POST",headers:authHeaders,body:JSON.stringify({id:"cloudflare"})});const payload=await readApiResponse(response);setWorkersAiVerified(true);setWorkersAiStatus("连接成功 · 已收到真实模型响应");setWorkersAiOutput(typeof payload.result==="string"?payload.result:JSON.stringify(payload.result,null,2));}catch(error){setWorkersAiStatus(error instanceof Error?error.message:"Workers AI 调用失败");}finally{setWorkersAiTesting(false);}};
  const visible=useMemo(()=>providers.filter(p=>(filter==="全部"||p.region===filter)&& (p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase()))),[filter,query]);
  const groups=["国内","国际","聚合与基础设施"] as const;
  return <div className="settings-page">
    <header className="settings-heading"><div><div className="ep-eyebrow"><i/> 平台配置</div><h1>AI 服务中心</h1><p>统一管理 Kosmoevretis 平台使用的 AI 服务商、模型目录与调用能力。</p></div><span className="settings-admin"><Locked size={15}/> 平台管理员</span></header>
    <section className="ai-platform-notice"><div className="ai-notice-icon"><Locked size={20}/></div><div><b>平台统一管理 API 凭证</b><p>所有 API Key 由 Kosmoevretis 平台统一申请、保管和调用。管理员令牌仅保留在当前页面内存，不写入本地存储。</p><PasswordInput id="ai-admin-token" labelText="平台管理员令牌" autoComplete="off" value={adminToken} onChange={e=>{setAdminToken(e.target.value);setDirectoryError("");}} placeholder="输入预览环境管理员令牌"/><div className="ai-admin-actions"><Button type="button" kind="primary" onClick={loadProviders} disabled={!adminToken||directoryLoading}>{directoryLoading?"正在读取…":"验证并加载配置"}</Button><span>{lastRefresh?`最近同步：${lastRefresh}`:"输入令牌后加载服务端配置"}</span></div>{directoryError&&<p className="ai-error" role="alert">{directoryError}</p>}</div><span className="ai-notice-state">仅限预览环境管理</span></section>
    <section className="ai-overview">
      <article><span>已登记服务商</span><b>{providers.length}</b><small>国内、国际及聚合平台</small></article>
      <article><span>已连接服务商</span><b>{Object.values(savedProviders).filter(x=>x.enabled&&x.hasKey).length} <em>/ {providers.length}</em></b><small>已保存且启用的服务商</small></article>
      <article><span>可用模型</span><b>{Object.keys(savedProviders).length?Object.keys(savedProviders).length:"—"}</b><small>已登记配置数；真实模型目录待接入</small></article>
      <article><span>今日调用</span><b>—</b><small>接入后开始统计</small></article>
    </section>
    <section className="ai-section">
      <div className="ai-section-head"><div><div className="ep-section-kicker">AI 服务商目录</div><h2>AI 服务商目录</h2><p>每家 AI 服务均展示独立品牌 Logo；接入后可同步模型、检测连接和查看服务状态。</p></div><span className="ai-directory-count">{visible.length} 家服务商</span></div>
      <div className="ai-panel-nav" role="tablist" aria-label="AI 服务管理模块"><button className={activePanel==="providers"?"active":""} onClick={()=>setActivePanel("providers")}>服务商与凭证</button><button className={activePanel==="models"?"active":""} onClick={()=>setActivePanel("models")}>模型与默认策略</button><button className={activePanel==="operations"?"active":""} onClick={()=>setActivePanel("operations")}>连接诊断与运行</button><button className={activePanel==="security"?"active":""} onClick={()=>setActivePanel("security")}>安全与审计</button></div>{activePanel==="providers"&&<><div className="ai-directory-tools"><div className="ai-carbon-tabs"><Tabs selectedIndex={filters.indexOf(filter)} onChange={({ selectedIndex })=>setFilter(filters[selectedIndex] ?? "全部")}><TabList aria-label="AI 服务商地区筛选">{filters.map(f=><Tab key={f}>{f}</Tab>)}</TabList></Tabs></div><TextInput id="ai-provider-search" labelText="搜索服务商或能力" placeholder="搜索服务商或能力" value={query} onChange={e=>setQuery(e.target.value)} /></div>
      {groups.filter(g=>filter==="全部"||filter===g).map(group=><div className="ai-provider-group" key={group}><div className="ai-group-title">{group}<span>{visible.filter(p=>p.region===group).length} 家</span></div><div className="ai-provider-grid">{visible.filter(p=>p.region===group).map(p=><article className="ai-provider-card" key={p.id}><div className="ai-provider-top"><ProviderLogo provider={p}/><div className="ai-provider-title"><b>{p.name}</b><small>{p.category}</small></div><span className={p.id==="cloudflare"?(workersAiVerified?"ai-connected":"ai-disconnected"):savedProviders[p.id]?.hasKey?"ai-connected":"ai-disconnected"}>{p.id==="cloudflare"?(workersAiVerified?"已验证 · 平台绑定":"平台绑定待验证"):savedProviders[p.id]?.hasKey?(savedProviders[p.id].enabled?"已保存":"已停用"):"未配置"}</span></div><p>{p.description}</p><div className="ai-provider-meta"><span>{p.models.length} 个模型系列预设</span><span>待连接</span></div><Button className="ai-provider-expand" kind="ghost" size="md" onClick={()=>setExpanded(expanded===p.id?null:p.id)}>{expanded===p.id?"收起详情":"查看接入详情"}<ChevronDown size={15}/></Button>{expanded===p.id&&<div className="ai-provider-detail"><b>接入配置与模型标识</b><div className="ai-model-chips">{p.models.map(m=><span key={m}>{m}</span>)}</div><small>以上为参考模型系列，不代表实时可用。请填写服务商当前有效的 API Base URL、模型 ID 与 API Key。</small><div className="ai-provider-actions">{p.id==="cloudflare"?<><Button type="button" kind="tertiary" disabled><Connect size={14}/> 原生 AI Binding · 无需 API Key</Button><Button type="button" kind="primary" onClick={testWorkersAI} disabled={workersAiTesting||!adminToken}><CheckmarkFilled size={14}/>{workersAiTesting?"正在测试…":workersAiVerified?"重新测试":"测试真实连接"}</Button></>:<>{savedProviders[p.id]?.hasKey&&!editingProviders[p.id]?<div className="ai-saved-summary"><CheckmarkFilled size={18}/><span>配置已保存并加密。API Key 已隐藏，不会在页面回显。</span><Button type="button" kind="tertiary" onClick={()=>setEditingProviders(v=>({...v,[p.id]:true}))}>修改配置</Button></div>:<><TextInput id={`provider-${p.id}-base-url`} labelText="API Base URL" value={draftFor(p.id).baseUrl} onChange={e=>setDrafts(v=>({...v,[p.id]:{...draftFor(p.id),baseUrl:e.target.value}}))} placeholder="https://api.example.com/v1"/><TextInput id={`provider-${p.id}-model`} labelText="模型 ID" value={draftFor(p.id).model} onChange={e=>setDrafts(v=>({...v,[p.id]:{...draftFor(p.id),model:e.target.value}}))} placeholder="填写服务商实际模型 ID"/><PasswordInput id={`provider-${p.id}-api-key`} labelText="API Key" autoComplete="new-password" value={draftFor(p.id).apiKey} onChange={e=>setDrafts(v=>({...v,[p.id]:{...draftFor(p.id),apiKey:e.target.value}}))} placeholder={savedProviders[p.id]?.hasKey?"已保存密钥；留空则保留原密钥":"首次保存必须填写 API Key"}/><Toggle id={`provider-${p.id}-enabled`} labelText="启用此服务商" toggled={draftFor(p.id).enabled} onToggle={checked=>setDrafts(v=>({...v,[p.id]:{...draftFor(p.id),enabled:checked}}))}/><div className="ai-provider-actions"><Button type="button" kind="primary" onClick={()=>saveProvider(p.id)} disabled={providerBusy===p.id}>{savedProviders[p.id]?.hasKey?"保存修改":"加密保存"}</Button>{savedProviders[p.id]?.hasKey&&<Button type="button" kind="ghost" onClick={()=>{setEditingProviders(v=>({...v,[p.id]:false}));setDrafts(v=>({...v,[p.id]:{...draftFor(p.id),apiKey:""}}));}}>取消</Button>}<Button type="button" kind="secondary" onClick={()=>testProvider(p.id)} disabled={providerBusy===p.id}>真实连接测试</Button>{savedProviders[p.id]?.hasKey&&<Button type="button" kind="danger" onClick={()=>deleteProvider(p.id)} disabled={providerBusy===p.id}>删除配置</Button>}</div></>}{providerMessage[p.id]&&<div className="ai-usage-note" role="status">{providerMessage[p.id]}</div>}</>}</div>{p.id==="cloudflare"&&workersAiStatus&&<div className="ai-usage-note" role="status"><b>{workersAiStatus}</b>{workersAiOutput&&<pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{workersAiOutput}</pre>}</div>}</div>}</article>)}</div></div>)}
      {visible.length===0&&<div className="ai-empty">没有找到匹配的 AI 服务商。</div>}</>}
    </section>

    {activePanel==="models"&&<section className="ai-admin-panel"><h2>模型与默认策略</h2><p>默认服务商仅作为新任务初始值；具体分析阶段仍可独立选择模型。</p><Dropdown id="ai-default-provider" titleText="平台默认推理服务" label="请选择服务商" items={[{id:"cloudflare",name:"Cloudflare Workers AI（原生绑定）"},...providers.filter(p=>savedProviders[p.id]?.enabled).map(p=>({id:p.id,name:p.name}))]} itemToString={item=>item?.name||""} selectedItem={[{id:"cloudflare",name:"Cloudflare Workers AI（原生绑定）"},...providers.filter(p=>savedProviders[p.id]?.enabled).map(p=>({id:p.id,name:p.name}))].find(item=>item.id===defaultProvider)} onChange={({selectedItem})=>selectedItem&&setDefaultProvider(selectedItem.id)} /><div className="ai-model-table"><div className="ai-model-row head"><span>服务商</span><span>模型标识</span><span>凭证状态</span><span>启用状态</span></div>{providers.filter(p=>p.id==="cloudflare"||savedProviders[p.id]).map(p=><div className="ai-model-row" key={p.id}><span>{p.name}</span><span>{p.id==="cloudflare"?"@cf/zai-org/glm-4.7-flash":savedProviders[p.id]?.model||"—"}</span><span>{p.id==="cloudflare"?"平台 AI 绑定":savedProviders[p.id]?.hasKey?"已加密保存":"缺少凭证"}</span><span>{p.id==="cloudflare"?"待测试":savedProviders[p.id]?.enabled?"启用":"停用"}</span></div>)}</div><p className="ai-usage-note">当前显示已配置的模型标识，不将静态系列预设冒充实时模型目录。默认选择暂存于当前页面，尚未持久化。</p></section>}
    {activePanel==="operations"&&<section className="ai-admin-panel"><h2>连接诊断与运行</h2><p>Workers AI 使用 Cloudflare Pages 原生 AI Binding，无需 API Key、付款信息或 Cloudflare Access。</p><div className="ai-diagnostic"><b>Cloudflare Workers AI</b><span>模型：@cf/zai-org/glm-4.7-flash</span><Button type="button" kind="primary" onClick={testWorkersAI} disabled={workersAiTesting||!adminToken}>{workersAiTesting?"正在执行真实推理…":"执行真实连接测试"}</Button>{workersAiStatus&&<strong role="status">{workersAiStatus}</strong>}{workersAiOutput&&<pre>{workersAiOutput}</pre>}</div><p className="ai-usage-note">其他服务商请在服务商与凭证模块保存后执行真实连接测试。调用日志、Token 与成本统计尚未接入持久化审计存储，不展示虚构数据。</p></section>}
    {activePanel==="security"&&<section className="ai-admin-panel"><h2>安全与审计</h2><div className="ai-security-grid"><article><b>密钥存储</b><span>AES-GCM 加密后存入独立 KV 命名空间；前端仅显示脱敏状态。</span></article><article><b>管理鉴权</b><span>管理 API 使用 Preview 环境管理员令牌验证；令牌仅保存在当前页面内存。</span></article><article><b>数据边界</b><span>模型请求会发送到所选服务商；企业敏感字段脱敏与审计策略尚待接入。</span></article></div></section>}
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · AI 服务中心</span><span>平台统一凭证管理 · 按分析任务选择模型</span></footer>
  </div>;
}
