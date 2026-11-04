import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Accordion, AccordionItem, Button, InlineNotification, Tag, TextInput, Tile, Toggle } from "@carbon/react";
import { Activity, Ai, Building, Document, DataBase, Earth, Flow, Model, Notification, Plug, Security, UserMultiple, WorkflowAutomation } from "@carbon/icons-react";
import SettingsBackend from "./SettingsBackend";
import BrandLogo from "./BrandLogo";

type Item = { name: string; description: string; status?: string; statusType?: "green"|"blue"|"gray"|"warm-gray"|"red"; domain?: string; mark?: string; meta?: string };
const navGroups = [
 { title:"API 与数据源", items:[["providers","服务商连接","plug"],["actors","采集能力目录","workflow"],["channels","数据渠道","database"],["runs","运行记录","activity"]] },
 { title:"AI 与模型", items:[["ai-providers","AI 服务商","brain"],["models","模型目录","boxes"],["routes","任务路由","route"],["prompts","提示词与成本","document"]] },
 { title:"系统管理", items:[["organization","组织与企业资料","building"],["members","用户与权限","users"],["locale","地区与语言","globe"],["notifications","通知策略","bell"]] },
 { title:"平台治理", items:[["governance","数据治理","shield"],["audit","安全与审计","clipboard"]] }
] as const;
const actorItems = [
 {name:"Google Trends",channel:"搜索与趋势",use:"搜索趋势、全球情报"},
 {name:"Amazon 商品采集",channel:"全球电商",use:"热销榜、竞品分析"},
 {name:"TikTok 数据采集",channel:"社交媒体",use:"社媒趋势、消费者洞察"},
 {name:"YouTube 数据采集",channel:"社交媒体",use:"社媒趋势、消费者洞察"},
 {name:"Reddit 数据采集",channel:"社区与论坛",use:"消费者洞察、用户痛点"}
];
const aiGroups = [
 {title:"平台运行时",items:[{name:"Cloudflare Workers AI",domain:"cloudflare.com",description:"由 Cloudflare Workers AI Binding 提供模型调用能力。",status:"运行时已接入",statusType:"green" as const}]},
 {title:"国际通用模型服务",items:[{name:"OpenAI",domain:"openai.com",description:"GPT 系列模型与 Embedding 服务。",status:"待配置"},{name:"Anthropic",domain:"anthropic.com",description:"Claude 系列模型服务。",status:"待配置"},{name:"Google Gemini",domain:"google.com",description:"Gemini 多模态与生成式 AI 模型。",status:"待配置"}]},
 {title:"其他模型服务",items:[{name:"DeepSeek",domain:"deepseek.com",description:"DeepSeek 通用对话与推理模型。",status:"待配置"},{name:"阿里云通义千问",domain:"qwen.ai",description:"Qwen 通义千问模型服务。",status:"待配置"},{name:"智谱 AI",domain:"zhipuai.cn",description:"GLM 系列大语言模型服务。",status:"待配置"},{name:"兼容 OpenAI 的服务商",mark:"API",description:"支持自定义 Base URL 的 OpenAI 兼容接口。",status:"待配置"}]}
];
const taskGroups = [
 {title:"企业与产品理解",tasks:[["企业档案理解","理解企业能力、产品与市场定位"],["产品信息分析","识别产品规格、卖点与产品属性"]]},
 {title:"市场与竞争情报",tasks:[["全球市场趋势","趋势归纳、市场机会与风险分析"],["竞品分析","品牌、型号、价格与产品对比"],["社交内容分析","内容理解、话题与消费者情绪"]]},
 {title:"客户发现与语言服务",tasks:[["客户发现","客户匹配、线索分类与评分"],["翻译与本地化","多语言翻译与市场表达适配"],["向量检索","Embedding 与语义检索"]]}
];
const navIconMap = { plug: Plug, workflow: WorkflowAutomation, database: DataBase, activity: Activity, brain: Ai, boxes: Model, route: Flow, document: Document, building: Building, users: UserMultiple, globe: Earth, bell: Notification, shield: Security, clipboard: Document } as const;
function Heading(_props:{eyebrow:string;title:string;description:string}){return null;}
function Group({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section className="settings-catalog-group"><div className="settings-catalog-group-heading"><div><h4>{title}</h4><p>{description}</p></div></div><div className="settings-catalog-items">{children}</div></section>}
function Resource({item,action}:{item:Item;action?:React.ReactNode}){return <Tile className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-identity">{item.domain||item.mark?<BrandLogo name={item.name} domain={item.domain} mark={item.mark}/>:<DataBase size={20} aria-label="资源"/>}<div className="settings-catalog-name"><strong>{item.name}</strong>{item.meta&&<span>{item.meta}</span>}</div></div>{item.status&&<Tag type={item.statusType||"gray"}>{item.status}</Tag>}</div><p className="settings-catalog-description">{item.description}</p>{action&&<div className="settings-catalog-actions">{action}</div>}</Tile>}
function Pending({children="对应服务端接口尚未接入；当前不会伪造配置状态或运行数据。"}:{children?:string}){return <InlineNotification kind="info" lowContrast title="接口尚未接入" subtitle={children} hideCloseButton/>}
function Catalog({items}:{items:Item[]}){return <div className="settings-catalog-groups">{items.map(x=><Resource key={x.name} item={x}/>)}</div>}
function Actors(){const [q,setQ]=useState("");const list=useMemo(()=>actorItems.filter(x=>(x.name+x.channel+x.use).toLowerCase().includes(q.toLowerCase())),[q]);return <><Heading eyebrow="ACTOR REGISTRY" title="采集能力目录" description="将 Actor 作为平台可复用的数据采集能力统一登记。业务模块通过标准参数和输出映射调用，不直接依赖供应商原始 Schema。"/><div className="settings-toolbar"><TextInput id="actor-filter" labelText="搜索采集能力" placeholder="按名称、渠道或业务用途搜索" value={q} onChange={e=>setQ(e.target.value)}/><Button kind="primary" onClick={()=>window.alert("Actor 注册接口尚未接入。")}>新增 Actor</Button></div>{["全球电商","搜索与趋势","社交媒体","社区与论坛"].map(channel=>{const rows=list.filter(x=>x.channel===channel);return rows.length?<Group key={channel} title={channel} description="该渠道可复用的数据采集执行器。">{rows.map(x=><Resource key={x.name} item={{name:x.name,meta:x.channel,description:"关联业务："+x.use+" · Actor ID 待配置",status:"待配置",statusType:"warm-gray"}} action={<Button kind="ghost" size="sm" onClick={()=>window.alert("Actor 参数模板接口尚未接入。")}>配置参数模板</Button>}/>)}</Group>:null})}<Accordion><AccordionItem title="采集能力标准：输入参数与输出映射"><ul><li>基础参数：关键词、产品、国家/地区、语言、时间范围。</li><li>高级参数：分页、排序、结果数量、代理与运行选项。</li><li>输入映射：中文表单字段转换为 Actor 所需的英文输入结构。</li><li>输出映射：标准化商品、价格、排名、评论、互动与来源字段。</li></ul></AccordionItem><AccordionItem title="采集能力与业务模块的关系"><p>一个 Actor 可关联多个业务模块；一个业务模块也可组合调用多个 Actor。业务模块只覆盖本次任务参数，不修改全局 Actor 定义。</p></AccordionItem></Accordion><Pending>Actor 注册表新增、编辑、参数模板保存和业务模块关联接口尚未完成。</Pending></>}
function Channels(){const groups=[{title:"交易与商品市场",desc:"观察商品供给、价格、销量信号与用户反馈。",items:[["全球电商","商品、价格、排名、评论与促销信号。"],["行业与供应链","品牌、制造商、供应商与行业信息。"]]},{title:"需求与内容市场",desc:"识别搜索需求、消费者讨论和内容趋势。",items:[["搜索与趋势","Google Trends、搜索需求与关键词。"],["社交媒体","内容、互动、话题与创作者讨论。"],["社区与论坛","讨论、评价、购买动机与用户痛点。"]]},{title:"竞争与数字生态",desc:"跟踪品牌、网站表现和竞争动态。",items:[["网站与流量","网站表现、流量与竞品动态。"]]}];return <><Heading eyebrow="SOURCE CHANNELS" title="数据渠道" description="按业务渠道组织数据来源。渠道关联服务商连接和一个或多个采集器，不在此重复保存凭证。"/>{groups.map(g=><Group key={g.title} title={g.title} description={g.desc}>{g.items.map(([name,description])=><Resource key={name} item={{name,description,status:"渠道目录"}}/>)}</Group>)}</>}
function AiProviders(){return <><Heading eyebrow="AI PROVIDERS" title="AI 服务商" description="管理模型服务商的认证、连接与运行状态。平台运行时和外部模型 API 分开管理。"/><div className="settings-context-note"><strong>运行时状态</strong><span>Cloudflare Workers AI 已提供平台运行时能力；其他服务商需完成凭证接入和调用适配后才可用于业务任务。</span><Tag type="green">运行时已接入</Tag></div>{aiGroups.map(g=><Group key={g.title} title={g.title} description="服务商目录与接入状态。"><Catalog items={g.items}/></Group>)}<Pending>AI 服务商凭证保存、连接测试和统一模型调用接口尚未全部接入。</Pending></>}
function Models(){return <><Heading eyebrow="MODEL CATALOG" title="模型目录" description="模型属于服务商连接之下的资源。按能力维护模型规格、上下文长度、价格和启用状态。"/><Group title="通用对话与生成" description="文本生成、摘要、信息抽取和多轮对话。"><Resource item={{name:"通用对话模型",description:"由已接入服务商提供的文本生成模型。",status:"能力分类"}}/></Group><Group title="推理与多模态" description="复杂分析、图像理解和结构化判断。"><Resource item={{name:"推理模型",description:"复杂分析、判断、规划和结构化推理。",status:"能力分类"}}/><Resource item={{name:"多模态模型",description:"图像、文本及其他多模态内容理解。",status:"能力分类"}}/></Group><Group title="向量与检索" description="语义表示和知识召回。"><Resource item={{name:"Embedding 模型",description:"向量生成、语义检索和知识库召回。",status:"能力分类"}}/></Group><Pending>模型发现、模型参数、价格目录和自定义模型持久化接口尚未接入；此处为能力分类，不是真实模型清单。</Pending></>}
function Routes(){return <><Heading eyebrow="AI TASK ROUTING" title="任务路由" description="每项业务任务可独立指定主模型、备用模型和策略。分析页面仍可由用户手动选择模型。"/>{taskGroups.map(g=><Group key={g.title} title={g.title} description="按业务任务定义模型选择策略。">{g.tasks.map(([name,desc])=><Tile key={name} className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-name"><strong>{name}</strong></div><Tag type="gray">待分配</Tag></div><p className="settings-catalog-description">{desc}</p><div className="settings-route-fields"><TextInput id={name+"-primary"} labelText="主模型" placeholder="选择已配置模型"/><TextInput id={name+"-fallback"} labelText="备用模型" placeholder="可选"/></div></Tile>)}</Group>)}<Pending>任务路由保存、模型能力校验和失败回退策略执行接口尚未接入。</Pending></>}
function Prompts(){return <><Heading eyebrow="PROMPTS & COST" title="提示词与成本" description="按任务管理提示词版本、输出约束，并追踪模型调用量、耗时和实际成本。"/><Group title="提示词版本库" description="维护任务提示词、版本、变更记录和生效状态。"><Resource item={{name:"任务提示词",description:"按业务任务管理提示词模板和输出结构。",status:"待接入"}}/></Group><Group title="模型调用与成本" description="按服务商、模型、任务和时间范围追踪调用。"><Resource item={{name:"用量与成本统计",description:"Token、响应耗时、调用次数、失败率和成本。",status:"待接入"}}/></Group><Pending>提示词版本库、调用账单和成本统计接口尚未接入。</Pending></>}
function SystemPage({page}:{page:string}){const data:Record<string,{eyebrow:string;title:string;desc:string;body:React.ReactNode}>={
 organization:{eyebrow:"ORGANIZATION",title:"组织与企业资料",desc:"管理当前组织的企业身份和平台资料。",body:<><div className="settings-form-grid"><TextInput id="org-name" labelText="组织显示名称" placeholder="组织名称"/><TextInput id="org-website" labelText="企业网站" placeholder="https://"/></div><Pending>组织资料保存接口尚未接入。</Pending></>},
 members:{eyebrow:"ACCESS CONTROL",title:"用户与权限",desc:"管理成员、角色与配置访问权限。",body:<><p>按组织角色配置服务凭证、Actor、AI 模型和平台治理权限。</p><Pending>组织权限矩阵与细粒度授权保存接口尚未接入。</Pending></>},
 locale:{eyebrow:"REGIONAL PREFERENCES",title:"地区与语言",desc:"设置默认市场、语言、时区和数据格式。",body:<><div className="settings-form-grid"><TextInput id="language" labelText="界面语言" defaultValue="简体中文"/><TextInput id="timezone" labelText="默认时区" defaultValue="Asia/Singapore"/><TextInput id="market" labelText="默认市场" defaultValue="Global"/><TextInput id="currency" labelText="默认货币" defaultValue="USD"/></div><Pending>地区偏好保存接口尚未接入。</Pending></>},
 notifications:{eyebrow:"NOTIFICATIONS",title:"通知策略",desc:"管理采集任务、服务连接与平台运行告警。",body:<><Toggle id="task-notice" labelText="采集任务完成通知" labelA="关" labelB="开"/><Toggle id="error-notice" labelText="连接异常通知" labelA="关" labelB="开"/><Pending>通知策略保存和消息投递接口尚未接入。</Pending></>},
 governance:{eyebrow:"DATA GOVERNANCE",title:"数据治理",desc:"配置数据保留、来源追踪、质量与导出策略。",body:<><p>统一记录来源、采集时间、采集方法、置信度与标准化状态。不会自动删除现有业务数据。</p><Pending>数据保留策略、数据质量规则和导出权限接口尚未接入。</Pending></>},
 audit:{eyebrow:"SECURITY & AUDIT",title:"安全与审计",desc:"查看配置变更、密钥管理和权限操作的审计信息。",body:<><p>密钥不写入前端日志。配置变更、连接测试、Actor 执行和权限变更应保留审计轨迹。</p><Pending>审计检索与安全策略管理界面尚未全部接入。</Pending></>}
};const x=data[page];return <><Heading eyebrow={x.eyebrow} title={x.title} description={x.desc}/>{x.body}</>}
const pageMeta:Record<string,{title:string;desc:string;eyebrow:string}>={
 providers:{title:"服务商连接",desc:"管理平台使用的外部数据采集服务和 API 凭证。",eyebrow:"API & DATA SOURCES"},
 actors:{title:"采集能力目录",desc:"注册可复用的 Actor，统一管理输入参数与输出映射。",eyebrow:"API & DATA SOURCES"},
 channels:{title:"数据渠道",desc:"按市场和业务来源组织可用的数据渠道。",eyebrow:"API & DATA SOURCES"},
 runs:{title:"运行记录",desc:"追踪采集任务执行状态、数据集和错误信息。",eyebrow:"API & DATA SOURCES"},
 "ai-providers":{title:"AI 服务商",desc:"管理 AI 服务商连接、认证和运行状态。",eyebrow:"AI & MODELS"},
 models:{title:"模型目录",desc:"维护模型能力、上下文、成本和可用状态。",eyebrow:"AI & MODELS"},
 routes:{title:"任务路由",desc:"为平台内部业务任务配置模型选择策略。",eyebrow:"AI & MODELS"},
 prompts:{title:"提示词与成本",desc:"管理提示词版本与模型调用成本。",eyebrow:"AI & MODELS"},
 organization:{title:"组织与企业资料",desc:"管理当前组织的企业身份和平台资料。",eyebrow:"SYSTEM MANAGEMENT"},
 members:{title:"用户与权限",desc:"管理成员、角色与配置访问权限。",eyebrow:"SYSTEM MANAGEMENT"},
 locale:{title:"地区与语言",desc:"设置默认市场、语言、时区和数据格式。",eyebrow:"SYSTEM MANAGEMENT"},
 notifications:{title:"通知策略",desc:"管理采集任务、服务连接与平台运行告警。",eyebrow:"SYSTEM MANAGEMENT"},
 governance:{title:"数据治理",desc:"配置数据保留、来源追踪、质量与导出策略。",eyebrow:"PLATFORM GOVERNANCE"},
 audit:{title:"安全与审计",desc:"查看配置变更、密钥管理和权限操作的审计信息。",eyebrow:"PLATFORM GOVERNANCE"}
};
export default function Settings(){
 const location=useLocation();const navigate=useNavigate();const active=location.pathname.split("/")[2]||"providers";const [search,setSearch]=useState("");const [notice,setNotice]=useState<string|null>(null);
 const selected=pageMeta[active];const filtered=navGroups.map(g=>({...g,items:g.items.filter(i=>(i[1]+i[0]+g.title).toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length);
 const choose=(id:string)=>{navigate("/settings/"+id);setNotice(null);};
 const body=()=>{switch(active){case"providers":return <SettingsBackend/>;case"actors":return <Actors/>;case"channels":return <Channels/>;case"runs":return <><Heading eyebrow="COLLECTION OBSERVABILITY" title="采集运行记录" description="统一查看业务模块发起的采集任务、执行状态、数据集和错误信息。"/><Pending>采集任务调度与运行记录服务尚未接入；当前不会展示虚构的任务或运行数据。</Pending></>;case"ai-providers":return <AiProviders/>;case"models":return <Models/>;case"routes":return <Routes/>;case"prompts":return <Prompts/>;default:return <SystemPage page={active}/>;}};
 return <section className="module settings-center settings-workspace">
  <div className="settings-page-heading"><div className="eyebrow">KOSMOEVRETIS / PLATFORM ADMINISTRATION</div><h2>配置管理中心</h2><p>像管理业务应用一样，统一管理连接、采集、AI 能力与平台治理。</p></div>
  <div className="settings-workspace-layout">
   <aside className="settings-local-nav">
    <div className="settings-nav-search"><TextInput id="settings-nav-search" labelText="搜索设置" hideLabel placeholder="搜索设置…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {filtered.map(g=><div className="settings-nav-group" key={g.title}><div className="settings-nav-group-title">{g.title}</div>{g.items.map(([id,label,icon])=><button key={id} type="button" className={active===id?"settings-nav-item is-active":"settings-nav-item"} aria-label={label} title={label} onClick={()=>choose(id)}>{(() => { const Icon = navIconMap[icon]; return <Icon size={16} aria-hidden="true"/>; })()}<span className="settings-nav-label">{label}</span></button>)}</div>)}
   </aside>
   <main className="settings-workspace-content">
    <div className="settings-content-toolbar"><div><div className="settings-breadcrumb">{selected.eyebrow} / {selected.title}</div><h3>{selected.title}</h3></div></div>
    {notice&&<InlineNotification kind="warning" lowContrast title="当前操作尚未执行" subtitle={notice} onCloseButtonClick={()=>setNotice(null)}/>}
    {body()}
   </main>
  </div>
 </section>;
}
