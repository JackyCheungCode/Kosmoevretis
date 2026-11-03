import { useMemo, useState } from "react";
import { Add, CheckmarkFilled, ChevronDown, ChevronRight, Cloud, Connect, Locked, Search, SettingsAdjust, WarningAlt } from "@carbon/icons-react";

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
function ProviderLogo({provider}:{provider:Provider}) {
  const [failed,setFailed]=useState(false);
  return <div className="ai-provider-logo">{failed ? <span>{provider.name.slice(0,1)}</span> : <img src={logoHost+provider.logo} alt={provider.name+" Logo"} onError={()=>setFailed(true)} />}</div>;
}
export function SettingsPage() {
  const [filter,setFilter]=useState<(typeof filters)[number]>("全部");
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState<string|null>("openrouter");
  const [showUsage,setShowUsage]=useState(false);
  const visible=useMemo(()=>providers.filter(p=>(filter==="全部"||p.region===filter)&& (p.name.toLowerCase().includes(query.toLowerCase())||p.description.toLowerCase().includes(query.toLowerCase()))),[filter,query]);
  const groups=["国内","国际","聚合与基础设施"] as const;
  return <div className="settings-page">
    <header className="settings-heading"><div><div className="ep-eyebrow"><i/> PLATFORM CONFIGURATION</div><h1>AI 服务中心</h1><p>统一管理 Kosmoevretis 平台使用的 AI 服务商、模型目录与调用能力。</p></div><span className="settings-admin"><Locked size={15}/> 平台管理员</span></header>
    <section className="ai-platform-notice"><div className="ai-notice-icon"><Locked size={20}/></div><div><b>平台统一管理 API 凭证</b><p>所有 API Key 由 Kosmoevretis 平台统一申请、保管和调用。密钥不会交给浏览器或普通页面状态；当前为接入准备阶段，尚未录入真实密钥。</p></div><span className="ai-notice-state">安全架构预留</span></section>
    <section className="ai-overview">
      <article><span>已登记服务商</span><b>{providers.length}</b><small>国内、国际及聚合平台</small></article>
      <article><span>已连接服务商</span><b>0 <em>/ {providers.length}</em></b><small>等待平台 API 凭证</small></article>
      <article><span>可用模型</span><b>—</b><small>连接后动态同步真实目录</small></article>
      <article><span>今日调用</span><b>—</b><small>接入后开始统计</small></article>
    </section>
    <section className="ai-section">
      <div className="ai-section-head"><div><div className="ep-section-kicker">PROVIDER DIRECTORY</div><h2>AI 服务商目录</h2><p>每家 AI 服务均展示独立品牌 Logo；接入后可同步模型、检测连接和查看服务状态。</p></div><span className="ai-directory-count">{visible.length} PROVIDERS</span></div>
      <div className="ai-directory-tools"><div className="ai-filter-tabs">{filters.map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="ai-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索服务商或能力"/></label></div>
      {groups.filter(g=>filter==="全部"||filter===g).map(group=><div className="ai-provider-group" key={group}><div className="ai-group-title">{group}<span>{visible.filter(p=>p.region===group).length} 家</span></div><div className="ai-provider-grid">{visible.filter(p=>p.region===group).map(p=><article className="ai-provider-card" key={p.id}><div className="ai-provider-top"><ProviderLogo provider={p}/><div className="ai-provider-title"><b>{p.name}</b><small>{p.category}</small></div><span className="ai-disconnected">未配置</span></div><p>{p.description}</p><div className="ai-provider-meta"><span>{p.models.length} 个模型系列预设</span><span>待连接</span></div><button className="ai-provider-expand" onClick={()=>setExpanded(expanded===p.id?null:p.id)}>{expanded===p.id?"收起详情":"查看接入详情"}<ChevronDown size={15}/></button>{expanded===p.id&&<div className="ai-provider-detail"><b>模型目录预览</b><div className="ai-model-chips">{p.models.map(m=><span key={m}>{m}</span>)}</div><small>以上为目录占位/系列预览，不代表已从服务商 API 验证可用。连接后将以真实 API 返回结果替换。</small><div className="ai-provider-actions"><button type="button" disabled><Connect size={14}/> 配置凭证（待开放）</button><button type="button" disabled><CheckmarkFilled size={14}/> 测试连接</button></div></div>}</article>)}</div></div>)}
      {visible.length===0&&<div className="ai-empty">没有找到匹配的 AI 服务商。</div>}
    </section>
    <section className="ai-section ai-management-grid"><article className="ai-management-card"><div className="ep-section-kicker">MODEL CATALOG</div><h3>模型目录</h3><p>连接服务商后动态同步模型 ID、上下文长度、能力标签、价格和可用状态。分析任务运行时仍由你逐维度选择模型。</p><div className="ai-management-status"><Cloud size={17}/> 等待服务商连接</div></article><article className="ai-management-card"><div className="ep-section-kicker">USAGE & AUDIT</div><h3>调用记录与成本</h3><p>记录调用模型、分析任务、Token 用量、响应时间、费用估算和调用结果，支持按服务商筛选。</p><button className="ai-inline-action" onClick={()=>setShowUsage(v=>!v)}>{showUsage?"收起说明":"查看统计规划"}<ChevronRight size={15}/></button>{showUsage&&<div className="ai-usage-note">真实调用数据将在后端凭证与调用网关接通后产生；当前不展示虚构用量或费用。</div>}</article><article className="ai-management-card"><div className="ep-section-kicker">SECURITY & POLICY</div><h3>密钥与数据安全</h3><p>平台侧密钥加密保管，前端只接收脱敏状态。记录数据发送到的服务商，并为敏感企业信息预留脱敏与授权策略。</p><div className="ai-management-status"><Locked size={17}/> 不在浏览器保存 API Key</div></article></section>
    <footer className="ep-page-footer"><span>KOSMOEVRETIS · AI SERVICE CENTER</span><span>平台统一凭证管理 · 按分析任务选择模型</span></footer>
  </div>;
}
