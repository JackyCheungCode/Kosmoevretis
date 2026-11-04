import { useMemo, useState } from "react";
import SettingsBackend from "./SettingsBackend";
import BrandLogo from "./BrandLogo";
import {
  Accordion, AccordionItem, Button, Checkbox, InlineNotification,
  Tab, TabList, TabPanel, TabPanels, Tabs, Tag,
  TextInput, Tile, Toggle
} from "@carbon/react";

type CatalogItemData = {
  name: string;
  description: string;
  status?: string;
  statusType?: "green" | "blue" | "gray" | "warm-gray" | "red";
  domain?: string;
  mark?: string;
  meta?: string;
};

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="settings-section-heading">
    <div className="eyebrow">{eyebrow}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>;
}

function CatalogGroup({ title, description, count, children }: {
  title: string; description: string; count?: number; children: React.ReactNode;
}) {
  return <section className="settings-catalog-group">
    <div className="settings-catalog-group-heading">
      <div><h4>{title}</h4><p>{description}</p></div>
      {typeof count === "number" && <Tag type="cool-gray">{count} 项</Tag>}
    </div>
    <div className="settings-catalog-items">{children}</div>
  </section>;
}

function CatalogItem({ item, onConfigure }: { item: CatalogItemData; onConfigure?: () => void }) {
  return <Tile className="settings-catalog-item">
    <div className="settings-catalog-item-head">
      <div className="settings-catalog-identity">
        {item.domain || item.mark
          ? <BrandLogo name={item.name} domain={item.domain} mark={item.mark} />
          : <span className="settings-catalog-glyph" aria-hidden="true">{item.name.slice(0, 1)}</span>}
        <div className="settings-catalog-name">
          <strong>{item.name}</strong>
          {item.meta && <span>{item.meta}</span>}
        </div>
      </div>
      {item.status && <Tag type={item.statusType || "gray"}>{item.status}</Tag>}
    </div>
    <p className="settings-catalog-description">{item.description}</p>
    {onConfigure && <div className="settings-catalog-actions"><Button kind="ghost" size="sm" onClick={onConfigure}>配置</Button></div>}
  </Tile>;
}

function Pending({ children = "此模块已建立配置目录；服务端保存与运行接口尚未接入，当前不会伪造配置状态或运行数据。" }: { children?: string }) {
  return <InlineNotification kind="info" lowContrast title="功能接口待接入" subtitle={children} hideCloseButton />;
}

const actors = [
  { name: "Google Trends", actorId: "待配置 Actor ID", channel: "搜索与趋势", usage: "搜索趋势、全球情报" },
  { name: "Amazon 商品采集", actorId: "待配置 Actor ID", channel: "全球电商", usage: "热销榜、竞品分析" },
  { name: "TikTok 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "YouTube 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "Reddit 数据采集", actorId: "待配置 Actor ID", channel: "社区与论坛", usage: "消费者洞察、用户痛点" },
];

const aiProviderGroups = [
  {
    title: "平台运行时",
    description: "由平台基础设施提供的模型运行能力。",
    items: [
      { name: "Cloudflare Workers AI", domain: "cloudflare.com", description: "由 Cloudflare Workers AI Binding 提供模型调用能力。", status: "运行时已接入", statusType: "green" as const },
    ],
  },
  {
    title: "国际通用模型服务",
    description: "用于通用对话、推理、多模态理解和向量服务。",
    items: [
      { name: "OpenAI", domain: "openai.com", description: "GPT 系列模型与 Embedding 服务。", status: "待配置" },
      { name: "Anthropic", domain: "anthropic.com", description: "Claude 系列模型服务。", status: "待配置" },
      { name: "Google Gemini", domain: "google.com", description: "Gemini 多模态与生成式 AI 模型。", status: "待配置" },
    ],
  },
  {
    title: "其他模型服务",
    description: "支持推理模型、区域化服务和兼容接口。",
    items: [
      { name: "DeepSeek", domain: "deepseek.com", description: "DeepSeek 通用对话与推理模型。", status: "待配置" },
      { name: "阿里云通义千问", domain: "qwen.ai", description: "Qwen 通义千问模型服务。", status: "待配置" },
      { name: "智谱 AI", domain: "zhipuai.cn", description: "GLM 系列大语言模型服务。", status: "待配置" },
      { name: "兼容 OpenAI 的服务商", mark: "API", description: "支持自定义 Base URL 的 OpenAI 兼容接口。", status: "待配置" },
    ],
  },
];

const channelGroups = [
  { title: "交易与商品市场", description: "观察商品供给、价格、销量信号与用户反馈。", items: [
    { name: "全球电商", description: "商品、价格、排名、评论与促销信号。" },
    { name: "行业与供应链", description: "品牌、制造商、供应商与行业信息。" },
  ]},
  { title: "需求与内容市场", description: "识别搜索需求、消费者讨论和内容趋势。", items: [
    { name: "搜索与趋势", description: "Google Trends、搜索需求与关键词。" },
    { name: "社交媒体", description: "内容、互动、话题与创作者讨论。" },
    { name: "社区与论坛", description: "讨论、评价、购买动机与用户痛点。" },
  ]},
  { title: "竞争与数字生态", description: "跟踪品牌、网站表现和竞争动态。", items: [
    { name: "网站与流量", description: "网站表现、流量与竞品动态。" },
  ]},
];

const modelTaskGroups = [
  { title: "企业与产品理解", description: "构建企业、品牌和产品知识。", tasks: [
    ["企业档案理解", "理解企业能力、产品与市场定位"],
    ["产品信息分析", "识别产品规格、卖点与产品属性"],
  ]},
  { title: "市场与竞争情报", description: "处理市场趋势、竞争格局和消费者内容。", tasks: [
    ["全球市场趋势", "趋势归纳、市场机会与风险分析"],
    ["竞品分析", "品牌、型号、价格与产品对比"],
    ["社交内容分析", "内容理解、话题与消费者情绪"],
  ]},
  { title: "客户发现与语言服务", description: "支持客户匹配、语义检索和跨语言处理。", tasks: [
    ["客户发现", "客户匹配、线索分类与评分"],
    ["翻译与本地化", "多语言翻译与市场表达适配"],
    ["向量检索", "Embedding 与语义检索"],
  ]},
];

function ChannelCatalog() {
  return <div className="settings-catalog-groups">{channelGroups.map(group =>
    <CatalogGroup key={group.title} title={group.title} description={group.description} count={group.items.length}>
      {group.items.map(item => <CatalogItem key={item.name} item={{ ...item, status: "渠道目录", statusType: "gray" }} />)}
    </CatalogGroup>
  )}</div>;
}

function ActorRegistry({ filter, setFilter, explain }: { filter: string; setFilter: (value: string) => void; explain: () => void }) {
  const filtered = useMemo(() => actors.filter(actor => (actor.name + actor.channel + actor.usage).toLowerCase().includes(filter.toLowerCase())), [filter]);
  const groups = ["全球电商", "搜索与趋势", "社交媒体", "社区与论坛"];
  return <>
    <SectionHeading eyebrow="ACTOR REGISTRY" title="Apify Actor 注册中心" description="统一登记可复用的数据采集执行器，预先定义参数模板和输入输出映射，再关联到不同业务模块。" />
    <div className="source-settings-note">
      <strong>Actor 注册规范</strong>
      <span>每个 Actor 维护 Actor ID、业务渠道、用途、中文参数模板、英文输入映射、默认值、输出字段和启用状态。新增 Actor 后可被多个模块复用。</span>
      <TextInput id="actor-search" labelText="搜索 Actor" placeholder="按名称、渠道或业务用途搜索" value={filter} onChange={event => setFilter(event.target.value)} />
      <div className="analysis-submit-row"><span>当前目录为接入规划，不代表 Actor 已真实配置。</span><Button kind="primary" onClick={explain}>新增 Actor</Button></div>
    </div>
    <div className="settings-catalog-groups">{groups.map(group => {
      const items = filtered.filter(actor => actor.channel === group);
      if (!items.length) return null;
      return <CatalogGroup key={group} title={group} description="该渠道可复用的数据采集执行器。" count={items.length}>
        {items.map(actor => <Tile key={actor.name} className="settings-catalog-item">
          <div className="settings-catalog-item-head">
            <div className="settings-catalog-identity">
              <span className="settings-catalog-glyph" aria-hidden="true">A</span>
              <div className="settings-catalog-name"><strong>{actor.name}</strong><span>{actor.channel}</span></div>
            </div>
            <Tag type="warm-gray">待配置</Tag>
          </div>
          <p className="settings-catalog-description">Actor ID：{actor.actorId} · 关联业务：{actor.usage}</p>
          <div className="settings-catalog-actions"><Button kind="ghost" size="sm" onClick={explain}>配置参数模板</Button></div>
        </Tile>)}
      </CatalogGroup>;
    })}</div>
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
    <Pending>Actor 注册表的新增、编辑、参数模板保存和业务模块关联接口尚未完成；当前目录仅用于定义注册规范。</Pending>
  </>;
}

function ApiSettings({ explain }: { explain: () => void }) {
  const [filter, setFilter] = useState("");
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="API & DATA SOURCES" title="API 与数据源配置" description="统一管理服务商授权、数据连接器和 Apify Actor。业务模块通过注册中心复用连接能力。" />
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="API 与数据源配置"><Tab>服务商连接</Tab><Tab>Actor 注册中心</Tab><Tab>数据渠道</Tab><Tab>运行记录</Tab></TabList>
      <TabPanels>
        <TabPanel><SettingsBackend /></TabPanel>
        <TabPanel><div className="intelligence-panel"><ActorRegistry filter={filter} setFilter={setFilter} explain={explain} /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><SectionHeading eyebrow="SOURCE CHANNELS" title="数据渠道目录" description="按业务渠道组织数据来源。渠道关联服务商连接和一个或多个连接器，不在此重复保存凭证。" /><ChannelCatalog /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><SectionHeading eyebrow="COLLECTION RUNS" title="采集运行记录" description="统一查看由各业务模块发起的 Actor 任务、执行状态、数据集和错误信息。" /><Pending>采集任务调度与运行记录服务尚未接入；当前不会展示虚构的任务或运行数据。</Pending></div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}

function AiSettings({ explain }: { explain: () => void }) {
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="AI CONFIGURATION" title="AI 服务与模型配置" description="统一接入 AI 服务商，维护模型能力，并将模型分配给平台不同的 AI 任务。" />
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="AI 配置"><Tab>服务商</Tab><Tab>模型管理</Tab><Tab>任务路由</Tab><Tab>提示词与成本</Tab></TabList>
      <TabPanels>
        <TabPanel><div className="intelligence-panel">
          <div className="source-settings-note"><strong>运行时说明</strong><span>Cloudflare Workers AI 当前提供平台运行时能力。其他服务商需要配置凭证并接入统一模型调用接口后才能启用。</span><Tag type="green">运行时已接入</Tag></div>
          <div className="settings-catalog-groups">{aiProviderGroups.map(group =>
            <CatalogGroup key={group.title} title={group.title} description={group.description} count={group.items.length}>
              {group.items.map(provider => <CatalogItem key={provider.name} item={provider} onConfigure={provider.status === "待配置" ? explain : undefined} />)}
            </CatalogGroup>
          )}</div>
          <Pending>AI 服务商凭证保存、连接测试和模型调用接口尚未全部接入；本目录不代表其他供应商已经可用。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="MODEL CATALOG" title="模型目录" description="按服务商和模型能力维护对话、推理、视觉与 Embedding 模型，并记录上下文长度、价格和启用状态。" />
          <CatalogGroup title="模型能力分类" description="模型目录按能力组织，具体模型由已连接服务商提供。" count={4}>
            <CatalogItem item={{ name: "通用对话模型", description: "文本生成、摘要、信息抽取和多轮对话。", status: "目录规范" }} />
            <CatalogItem item={{ name: "推理模型", description: "复杂分析、判断、规划和结构化推理。", status: "目录规范" }} />
            <CatalogItem item={{ name: "多模态模型", description: "图像、文本及其他多模态内容理解。", status: "目录规范" }} />
            <CatalogItem item={{ name: "Embedding 模型", description: "向量生成、语义检索和知识库召回。", status: "目录规范" }} />
          </CatalogGroup>
          <Pending>模型发现、模型参数、价格目录和自定义模型持久化接口尚未接入；不会展示未经验证的模型清单。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="AI TASK ROUTING" title="AI 任务与模型分配" description="通过任务路由统一指定主模型、备用模型和任务策略，业务模块不直接绑定具体模型。" />
          <div className="settings-catalog-groups">{modelTaskGroups.map(group =>
            <CatalogGroup key={group.title} title={group.title} description={group.description} count={group.tasks.length}>
              {group.tasks.map(([name, description]) => <Tile key={name} className="settings-catalog-item">
                <div className="settings-catalog-item-head"><div className="settings-catalog-name"><strong>{name}</strong></div><Tag type="gray">待分配</Tag></div>
                <p className="settings-catalog-description">{description}</p>
                <div className="settings-route-fields">
                  <TextInput id={"route-primary-" + name} labelText="主模型 ID" placeholder="选择已配置模型" />
                  <TextInput id={"route-fallback-" + name} labelText="备用模型 ID" placeholder="可选" />
                </div>
              </Tile>)}
            </CatalogGroup>
          )}</div>
          <div className="analysis-submit-row"><span>路由表单为配置结构示意，尚未保存。</span><Button kind="primary" onClick={explain}>保存任务路由</Button></div>
          <Pending>任务路由保存、模型有效性校验和回退策略执行接口尚未接入。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="PROMPTS & USAGE" title="提示词与用量成本" description="按任务管理提示词版本、输出结构、Token 消耗、调用耗时与成本。" />
          <div className="settings-catalog-groups">
            <CatalogGroup title="提示词管理" description="维护任务提示词、版本和输出约束。"><CatalogItem item={{ name: "任务提示词版本库", description: "记录提示词版本、变更说明和生效状态。", status: "待接入" }} /></CatalogGroup>
            <CatalogGroup title="模型用量与成本" description="追踪模型调用量、Token、耗时与成本。"><CatalogItem item={{ name: "调用统计与成本", description: "按服务商、模型、任务和时间范围统计用量。", status: "待接入" }} /></CatalogGroup>
          </div>
          <Pending>提示词版本库、调用账单和成本统计接口尚未接入，不展示推测或模拟数据。</Pending>
        </div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}

function SystemSettings({ explain }: { explain: () => void }) {
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="SYSTEM CONFIGURATION" title="平台通用设置" description="管理组织偏好、用户权限、地区语言、通知、数据治理和安全审计。" />
    <Accordion>
      <AccordionItem title="组织与企业资料"><div className="source-settings-note"><TextInput id="org-display-name" labelText="组织显示名称" placeholder="组织名称" /><p>组织资料与成员关系沿用当前企业工作区，不在此创建新的组织体系。</p></div></AccordionItem>
      <AccordionItem title="用户与权限"><p>按组织角色配置设置访问权限、服务凭证管理权限、Actor 管理权限和 AI 模型管理权限。</p><Pending>组织权限矩阵与细粒度授权保存接口尚未接入。</Pending></AccordionItem>
      <AccordionItem title="通用偏好"><div className="library-create">
        <TextInput id="default-currency" labelText="默认货币" defaultValue="USD" /><TextInput id="default-unit" labelText="默认计量单位" defaultValue="pcs" /><TextInput id="date-format" labelText="日期格式" defaultValue="YYYY-MM-DD" /><Checkbox id="compact-data" labelText="优先使用紧凑数据展示" />
      </div></AccordionItem>
      <AccordionItem title="地区与语言"><div className="library-create">
        <TextInput id="default-language" labelText="界面语言" defaultValue="简体中文" /><TextInput id="default-timezone" labelText="默认时区" defaultValue="Asia/Singapore" /><TextInput id="default-market" labelText="默认市场" defaultValue="Global" />
      </div></AccordionItem>
      <AccordionItem title="通知设置"><Toggle id="notify-task" labelText="采集任务完成通知" labelA="关" labelB="开" /><Toggle id="notify-error" labelText="连接异常通知" labelA="关" labelB="开" /></AccordionItem>
      <AccordionItem title="数据治理"><p>配置采集数据保留周期、缓存策略、数据导出与演示数据管理。不会自动删除现有业务数据。</p></AccordionItem>
      <AccordionItem title="安全与审计"><p>统一记录配置变更、密钥轮换、连接测试、Actor 执行和权限变更。密钥不写入前端日志。</p></AccordionItem>
    </Accordion>
    <div className="analysis-submit-row"><span>组织级偏好与权限保存接口尚未接入。</span><Button kind="primary" onClick={explain}>保存系统设置</Button></div>
  </div>;
}

export default function Settings() {
  const [notice, setNotice] = useState<string | null>(null);
  const explain = () => setNotice("当前目录已建立统一配置结构；尚未接入的模块不会保存到浏览器或明文数据库。");
  return <section className="module settings-center">
    <div className="eyebrow">SYSTEM SETTINGS / CONFIGURATION CENTER</div>
    <h2>统一配置中心</h2>
    <p>集中管理平台服务连接、数据采集执行器、AI 模型策略与系统级偏好。凭证仅允许通过服务端安全接口保存和调用。</p>
    {notice && <InlineNotification kind="warning" lowContrast title="配置尚未保存" subtitle={notice} onCloseButtonClick={() => setNotice(null)} />}
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="系统设置大类"><Tab>API 与数据源</Tab><Tab>AI 配置</Tab><Tab>系统配置</Tab></TabList>
      <TabPanels>
        <TabPanel><ApiSettings explain={explain} /></TabPanel>
        <TabPanel><AiSettings explain={explain} /></TabPanel>
        <TabPanel><SystemSettings explain={explain} /></TabPanel>
      </TabPanels>
    </Tabs>
  </section>;
}
