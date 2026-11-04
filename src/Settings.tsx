import { useMemo, useState } from "react";
import SettingsBackend from "./SettingsBackend";
import {
  Accordion, AccordionItem, Button, Checkbox, InlineNotification,
  PasswordInput, Tab, TabList, TabPanel, TabPanels, Tabs, Tag,
  TextInput, Tile, Toggle
} from "@carbon/react";

const providers = [
  { id: "google", name: "Google", category: "搜索与趋势", description: "搜索趋势与搜索结果采集连接。", placeholder: "Google API Key" },
  { id: "deepl", name: "DeepL", category: "语言服务", description: "多语言关键词和情报内容翻译。", placeholder: "DeepL Auth Key" },
  { id: "youtube", name: "YouTube", category: "社交媒体", description: "视频、频道与互动数据采集。", placeholder: "YouTube API Key" },
  { id: "reddit", name: "Reddit", category: "社区数据", description: "社区讨论、评论与消费者反馈。", placeholder: "Reddit Client Secret" },
];
const actors = [
  { name: "Google Trends", actorId: "待配置 Actor ID", channel: "搜索与趋势", usage: "搜索趋势、全球情报" },
  { name: "Amazon 商品采集", actorId: "待配置 Actor ID", channel: "全球电商", usage: "热销榜、竞品分析" },
  { name: "TikTok 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "YouTube 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "Reddit 数据采集", actorId: "待配置 Actor ID", channel: "社区与论坛", usage: "消费者洞察、用户痛点" },
];
const aiProviders = ["Cloudflare Workers AI", "OpenAI", "Anthropic", "Google Gemini", "DeepSeek", "阿里云通义千问", "智谱 AI", "兼容 OpenAI 的服务商"];
const modelTasks = [
  ["企业档案理解", "理解企业能力、产品与市场定位"],
  ["产品信息分析", "识别产品规格、卖点与产品属性"],
  ["全球市场趋势", "趋势归纳、市场机会与风险分析"],
  ["竞品分析", "品牌、型号、价格与产品对比"],
  ["社交内容分析", "内容理解、话题与消费者情绪"],
  ["客户发现", "客户匹配、线索分类与评分"],
  ["翻译与本地化", "多语言翻译与市场表达适配"],
  ["向量检索", "Embedding 与语义检索"],
];

function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>;
}
function Pending({ children = "配置保存与服务端凭证管理将在安全接口接入后启用。" }: { children?: string }) {
  return <InlineNotification kind="info" lowContrast title="配置接口尚未启用" subtitle={children} hideCloseButton />;
}
function ProviderFields({ credentials, setCredentials, explain }: {
  credentials: Record<string,string>;
  setCredentials: React.Dispatch<React.SetStateAction<Record<string,string>>>;
  explain: () => void;
}) {
  const [enabled,setEnabled] = useState<Record<string,boolean>>({});
  return <div className="library-list">
    {providers.map(provider => <Tile key={provider.id} className="library-card">
      <div className="library-card-head"><div><strong>{provider.name}</strong><span>{provider.category}</span></div><Tag type="gray">待接入</Tag></div>
      <p>{provider.description}</p>
      <PasswordInput id={`settings-${provider.id}`} labelText="API 凭证" placeholder={provider.placeholder} value={credentials[provider.id] || ""} onChange={event => setCredentials(current => ({ ...current, [provider.id]: event.target.value }))} />
      <div className="analysis-submit-row">
        <Toggle id={`settings-enabled-${provider.id}`} labelText="连接启用" labelA="关" labelB="开" toggled={!!enabled[provider.id]} onToggle={value => setEnabled(current => ({ ...current, [provider.id]: value }))} />
        <Button kind="secondary" size="sm" onClick={explain}>保存配置</Button>
      </div>
    </Tile>)}
  </div>;
}
function ChannelCatalog() {
  const channels = [
    ["全球电商", "商品、价格、排名、评论与促销信号"],
    ["搜索与趋势", "Google Trends、搜索需求与关键词"],
    ["社交媒体", "内容、互动、话题与创作者讨论"],
    ["社区与论坛", "讨论、评价、购买动机与用户痛点"],
    ["网站与流量", "网站表现、流量与竞品动态"],
    ["行业与供应链", "品牌、制造商、供应商与行业信息"],
  ];
  return <div className="library-list">{channels.map(([name,description]) => <Tile key={name} className="library-card">
    <div className="library-card-head"><strong>{name}</strong><Tag type="cool-gray">渠道目录</Tag></div>
    <p>{description}</p><span className="muted">连接器由服务商连接和 Actor 注册中心提供</span>
  </Tile>)}</div>;
}
function ActorRegistry({ filter, setFilter, explain }: { filter:string; setFilter:(value:string)=>void; explain:()=>void }) {
  const filtered = useMemo(() => actors.filter(actor => (actor.name + actor.channel + actor.usage).toLowerCase().includes(filter.toLowerCase())),[filter]);
  return <>
    <div className="results-heading"><h3>Apify Actor 注册中心</h3><p>Actor 在此统一登记，再关联到多个业务模块。参数模板在注册时预先定义，业务页面不直接读取原始 Schema。</p></div>
    <div className="source-settings-note">
      <strong>Actor 注册规范</strong>
      <span>每个 Actor 需要维护 Actor ID、业务渠道、用途、中文参数模板、英文输入映射、默认值、输出字段和状态。新增 Actor 后可被多个模块复用。</span>
      <TextInput id="actor-search" labelText="搜索 Actor" placeholder="按名称、渠道或业务用途搜索" value={filter} onChange={event=>setFilter(event.target.value)} />
      <div className="analysis-submit-row"><span>注册目录为接入规划，不代表 Actor 已真实配置。</span><Button kind="primary" onClick={explain}>新增 Actor</Button></div>
    </div>
    <div className="library-list">{filtered.map(actor=><Tile key={actor.name} className="library-card">
      <div className="library-card-head"><div><strong>{actor.name}</strong><span>{actor.channel}</span></div><Tag type="warm-gray">待配置</Tag></div>
      <p>Actor ID：{actor.actorId}</p><p>关联业务：{actor.usage}</p>
      <Button kind="ghost" size="sm" onClick={explain}>配置参数模板</Button>
    </Tile>)}</div>
    <Accordion>
      <AccordionItem title="Actor 参数模板字段规范"><ul>
        <li>基础参数：关键词、产品、国家/地区、语言、时间范围。</li>
        <li>高级参数：分页、排序、结果数量、代理与运行选项。</li>
        <li>字段映射：中文表单字段映射为 Actor 所需的英文输入结构。</li>
        <li>输出映射：标准化商品、价格、排名、评论、互动与来源字段。</li>
      </ul></AccordionItem>
      <AccordionItem title="Actor 与业务模块关联规则"><ul>
        <li>一个 Actor 可以关联多个业务模块。</li><li>一个业务模块可以组合调用多个 Actor。</li><li>业务模块只覆盖本次任务参数，不修改全局 Actor 定义。</li>
      </ul></AccordionItem>
    </Accordion>
  </>;
}
function ApiSettings({ credentials, setCredentials, explain }: { credentials:Record<string,string>; setCredentials:React.Dispatch<React.SetStateAction<Record<string,string>>>; explain:()=>void }) {
  const [filter,setFilter] = useState("");
  return <div className="intelligence-panel">
    <Heading eyebrow="API & DATA SOURCES" title="API 与数据源配置" description="统一管理服务商授权、数据连接器和 Apify Actor。业务模块通过注册中心复用连接能力。" />
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="API 与数据源配置"><Tab>服务商连接</Tab><Tab>Actor 注册中心</Tab><Tab>数据渠道</Tab><Tab>运行记录</Tab></TabList>
      <TabPanels>
        <TabPanel><SettingsBackend /></TabPanel>
        <TabPanel><div className="intelligence-panel"><ActorRegistry filter={filter} setFilter={setFilter} explain={explain} /><Pending /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><Heading eyebrow="SOURCE CHANNELS" title="数据渠道目录" description="按业务渠道组织数据来源。渠道关联服务商连接和一个或多个连接器，不在此重复保存凭证。" /><ChannelCatalog /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><Heading eyebrow="COLLECTION RUNS" title="采集运行记录" description="统一查看由各业务模块发起的 Actor 任务、执行状态、数据集和错误信息。" /><Pending>采集任务调度与运行记录服务尚未接入；当前不会展示虚构的任务或运行数据。</Pending></div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}
function AiSettings({ explain }: { explain:()=>void }) {
  return <div className="intelligence-panel">
    <Heading eyebrow="AI CONFIGURATION" title="AI 服务与模型配置" description="统一接入 AI 服务商，维护模型能力，并将模型分配给平台不同的 AI 任务。" />
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="AI 配置"><Tab>服务商</Tab><Tab>模型管理</Tab><Tab>任务路由</Tab><Tab>提示词与成本</Tab></TabList>
      <TabPanels>
        <TabPanel><div className="intelligence-panel">
          <div className="source-settings-note"><strong>当前已接入：Cloudflare Workers AI</strong><span>全球情报分析接口当前使用 Cloudflare Workers AI。其他服务商在完成安全凭证与统一模型路由接口后开放。</span><Tag type="green">已接入运行时</Tag></div>
          <div className="library-list">{aiProviders.map((name,index)=><Tile key={name} className="library-card">
            <div className="library-card-head"><strong>{name}</strong><Tag type={index===0?"green":"gray"}>{index===0?"运行时已接入":"待接入"}</Tag></div>
            <p>{index===0?"由 Cloudflare Workers AI Binding 提供模型调用能力。":"可配置 API Base URL、密钥与兼容协议。"}</p>
            {index!==0&&<Button kind="ghost" size="sm" onClick={explain}>配置服务商</Button>}
          </Tile>)}</div><Pending />
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel"><Heading eyebrow="MODEL CATALOG" title="模型目录" description="模型目录区分对话、推理、视觉和 Embedding 能力，并记录上下文长度与价格信息。" /><Pending>当前运行模型由服务端接口控制；模型发现、价格目录和自定义模型持久化尚未接入。</Pending></div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <Heading eyebrow="AI TASK ROUTING" title="AI 任务与模型分配" description="通过任务路由统一指定主模型、备用模型和任务策略，业务模块不直接绑定具体模型。" />
          <div className="library-list">{modelTasks.map(([name,description])=><Tile key={name} className="library-card">
            <div className="library-card-head"><strong>{name}</strong><Tag type="gray">待分配</Tag></div><p>{description}</p><TextInput id={`route-${name}`} labelText="主模型 ID" placeholder="选择或输入模型 ID" />
          </Tile>)}</div><Button kind="primary" onClick={explain}>保存任务路由</Button>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel"><Heading eyebrow="PROMPTS & USAGE" title="提示词与用量成本" description="管理提示词版本、任务输出结构、Token 消耗、调用耗时与成本。" /><Pending>提示词版本库、调用账单和成本统计接口尚未接入，不展示推测或模拟数据。</Pending></div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}
function SystemSettings({ explain }: { explain:()=>void }) {
  return <div className="intelligence-panel">
    <Heading eyebrow="SYSTEM CONFIGURATION" title="平台通用设置" description="管理组织偏好、用户权限、地区语言、通知、数据治理和安全审计。" />
    <Accordion>
      <AccordionItem title="企业与组织"><div className="source-settings-note"><TextInput id="org-display-name" labelText="组织显示名称" placeholder="组织名称" /><p>组织资料与成员关系沿用当前企业工作区，不在此创建新的组织体系。</p></div></AccordionItem>
      <AccordionItem title="用户与权限"><p>后续按组织角色配置设置访问权限、服务凭证管理权限、Actor 管理权限和 AI 模型管理权限。</p></AccordionItem>
      <AccordionItem title="通用偏好"><div className="library-create">
        <TextInput id="default-currency" labelText="默认货币" defaultValue="USD" /><TextInput id="default-unit" labelText="默认计量单位" defaultValue="pcs" /><TextInput id="date-format" labelText="日期格式" defaultValue="YYYY-MM-DD" /><Checkbox id="compact-data" labelText="优先使用紧凑数据展示" />
      </div></AccordionItem>
      <AccordionItem title="地区与语言"><div className="library-create">
        <TextInput id="default-language" labelText="界面语言" defaultValue="简体中文" /><TextInput id="default-timezone" labelText="默认时区" defaultValue="Asia/Singapore" /><TextInput id="default-market" labelText="默认市场" defaultValue="Global" />
      </div></AccordionItem>
      <AccordionItem title="通知设置"><Toggle id="notify-task" labelText="采集任务完成通知" labelA="关" labelB="开" /><Toggle id="notify-error" labelText="连接异常通知" labelA="关" labelB="开" /></AccordionItem>
      <AccordionItem title="数据管理"><p>配置采集数据保留周期、缓存策略、数据导出与演示数据管理。不会自动删除现有业务数据。</p></AccordionItem>
      <AccordionItem title="安全与审计"><p>统一记录配置变更、密钥轮换、连接测试、Actor 执行和权限变更。密钥不写入前端日志。</p></AccordionItem>
    </Accordion>
    <div className="analysis-submit-row"><span>组织级偏好与权限保存接口尚未接入。</span><Button kind="primary" onClick={explain}>保存系统设置</Button></div>
  </div>;
}

export default function Settings() {
  const [credentials,setCredentials] = useState<Record<string,string>>({});
  const [notice,setNotice] = useState<string | null>(null);
  const explain = () => setNotice("当前页面已建立配置结构；服务端加密凭证存储、组织级配置持久化和连接测试接口尚未接入，因此没有将密钥保存到浏览器或明文数据库。");
  return <section className="module">
    <div className="eyebrow">SYSTEM SETTINGS / CONFIGURATION CENTER</div>
    <h2>统一配置中心</h2>
    <p>集中管理平台服务连接、数据采集执行器、AI 模型策略与系统级偏好。凭证仅允许通过服务端安全接口保存和调用。</p>
    {notice && <InlineNotification kind="warning" lowContrast title="配置尚未保存" subtitle={notice} onCloseButtonClick={()=>setNotice(null)} />}
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="系统设置大类"><Tab>API 与数据源</Tab><Tab>AI 配置</Tab><Tab>系统配置</Tab></TabList>
      <TabPanels>
        <TabPanel><ApiSettings credentials={credentials} setCredentials={setCredentials} explain={explain} /></TabPanel>
        <TabPanel><AiSettings explain={explain} /></TabPanel>
        <TabPanel><SystemSettings explain={explain} /></TabPanel>
      </TabPanels>
    </Tabs>
  </section>;
}
