import { useMemo, useState } from "react";
import SettingsBackend from "./SettingsBackend";
import BrandLogo from "./BrandLogo";
import {
  Accordion, AccordionItem, Button, Checkbox, InlineNotification,
  Tab, TabList, TabPanel, TabPanels, Tabs, Tag, TextInput, Tile, Toggle
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
  return <header className="settings-section-heading">
    <div className="eyebrow">{eyebrow}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </header>;
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

function ResourceRow({ item, action }: { item: CatalogItemData; action?: React.ReactNode }) {
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
    {action && <div className="settings-catalog-actions">{action}</div>}
  </Tile>;
}

function Pending({ children = "该能力的服务端接口尚未接入；当前不会伪造配置状态或运行数据。" }: { children?: string }) {
  return <InlineNotification kind="info" lowContrast title="接口尚未接入" subtitle={children} hideCloseButton />;
}

const actors = [
  { name: "Google Trends", actorId: "待配置 Actor ID", channel: "搜索与趋势", usage: "搜索趋势、全球情报" },
  { name: "Amazon 商品采集", actorId: "待配置 Actor ID", channel: "全球电商", usage: "热销榜、竞品分析" },
  { name: "TikTok 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "YouTube 数据采集", actorId: "待配置 Actor ID", channel: "社交媒体", usage: "社媒趋势、消费者洞察" },
  { name: "Reddit 数据采集", actorId: "待配置 Actor ID", channel: "社区与论坛", usage: "消费者洞察、用户痛点" },
];

const aiProviderGroups = [
  { title: "平台运行时", description: "由平台基础设施提供的模型运行能力。", items: [
    { name: "Cloudflare Workers AI", domain: "cloudflare.com", description: "由 Cloudflare Workers AI Binding 提供模型调用能力。", status: "运行时已接入", statusType: "green" as const },
  ]},
  { title: "国际通用模型服务", description: "用于通用对话、推理、多模态理解和向量服务。", items: [
    { name: "OpenAI", domain: "openai.com", description: "GPT 系列模型与 Embedding 服务。", status: "待配置" },
    { name: "Anthropic", domain: "anthropic.com", description: "Claude 系列模型服务。", status: "待配置" },
    { name: "Google Gemini", domain: "google.com", description: "Gemini 多模态与生成式 AI 模型。", status: "待配置" },
  ]},
  { title: "其他模型服务", description: "支持推理模型、区域化服务和兼容接口。", items: [
    { name: "DeepSeek", domain: "deepseek.com", description: "DeepSeek 通用对话与推理模型。", status: "待配置" },
    { name: "阿里云通义千问", domain: "qwen.ai", description: "Qwen 通义千问模型服务。", status: "待配置" },
    { name: "智谱 AI", domain: "zhipuai.cn", description: "GLM 系列大语言模型服务。", status: "待配置" },
    { name: "兼容 OpenAI 的服务商", mark: "API", description: "支持自定义 Base URL 的 OpenAI 兼容接口。", status: "待配置" },
  ]},
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
      {group.items.map(item => <ResourceRow key={item.name} item={{ ...item, status: "渠道目录", statusType: "gray" }} />)}
    </CatalogGroup>
  )}</div>;
}

function ActorRegistry({ filter, setFilter, explain }: { filter: string; setFilter: (value: string) => void; explain: () => void }) {
  const filtered = useMemo(() => actors.filter(actor => (actor.name + actor.channel + actor.usage).toLowerCase().includes(filter.toLowerCase())), [filter]);
  const groups = ["全球电商", "搜索与趋势", "社交媒体", "社区与论坛"];
  return <>
    <SectionHeading eyebrow="ACTOR REGISTRY" title="采集能力目录" description="将 Actor 作为平台可复用的数据采集能力统一登记。业务模块通过标准参数和输出映射调用，不直接依赖供应商原始 Schema。" />
    <div className="settings-toolbar">
      <TextInput id="actor-search" labelText="搜索采集能力" placeholder="按名称、渠道或业务用途搜索" value={filter} onChange={event => setFilter(event.target.value)} />
      <Button kind="primary" onClick={explain}>新增 Actor</Button>
    </div>
    <div className="settings-catalog-groups">{groups.map(group => {
      const items = filtered.filter(actor => actor.channel === group);
      if (!items.length) return null;
      return <CatalogGroup key={group} title={group} description="该渠道可复用的数据采集执行器。" count={items.length}>
        {items.map(actor => <ResourceRow key={actor.name} item={{
          name: actor.name, meta: actor.channel, description: "Actor ID：" + actor.actorId + " · 关联业务：" + actor.usage, status: "待配置", statusType: "warm-gray"
        }} action={<Button kind="ghost" size="sm" onClick={explain}>配置参数模板</Button>} />)}
      </CatalogGroup>;
    })}</div>
    <Accordion>
      <AccordionItem title="采集能力标准：输入参数与输出映射">
        <ul><li>基础参数：关键词、产品、国家/地区、语言、时间范围。</li><li>高级参数：分页、排序、结果数量、代理与运行选项。</li><li>输入映射：中文表单字段转换为 Actor 所需的英文输入结构。</li><li>输出映射：标准化商品、价格、排名、评论、互动与来源字段。</li></ul>
      </AccordionItem>
      <AccordionItem title="采集能力与业务模块的关系">
        <ul><li>一个 Actor 可以关联多个业务模块。</li><li>一个业务模块可以组合调用多个 Actor。</li><li>业务模块只覆盖本次任务参数，不修改全局 Actor 定义。</li></ul>
      </AccordionItem>
    </Accordion>
    <Pending>Actor 注册表的新增、编辑、参数模板保存和业务模块关联接口尚未完成；当前目录仅定义注册规范。</Pending>
  </>;
}

function ApiSettings({ explain }: { explain: () => void }) {
  const [filter, setFilter] = useState("");
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="API & DATA SOURCES" title="API 与数据源" description="管理外部服务连接、采集能力和数据渠道。凭证集中保存在服务端，业务模块通过统一注册关系复用。" />
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="API 与数据源配置"><Tab>服务商连接</Tab><Tab>采集能力目录</Tab><Tab>数据渠道</Tab><Tab>运行记录</Tab></TabList>
      <TabPanels>
        <TabPanel><SettingsBackend /></TabPanel>
        <TabPanel><div className="intelligence-panel"><ActorRegistry filter={filter} setFilter={setFilter} explain={explain} /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><SectionHeading eyebrow="SOURCE CHANNELS" title="数据渠道目录" description="按业务渠道组织数据来源。渠道关联服务商连接和一个或多个采集器，不在此重复保存凭证。" /><ChannelCatalog /></div></TabPanel>
        <TabPanel><div className="intelligence-panel"><SectionHeading eyebrow="COLLECTION OBSERVABILITY" title="采集运行记录" description="统一查看业务模块发起的采集任务、执行状态、数据集和错误信息。" /><Pending>采集任务调度与运行记录服务尚未接入；当前不会展示虚构的任务或运行数据。</Pending></div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}

function AiSettings({ explain }: { explain: () => void }) {
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="AI INFRASTRUCTURE" title="AI 服务与模型" description="按服务商、模型和任务路由三层管理 AI 能力。业务模块只声明任务，不直接绑定具体模型。" />
    <div className="settings-relationship">
      <div><span>01</span><strong>AI 服务商</strong><small>连接与认证</small></div>
      <b aria-hidden="true">→</b>
      <div><span>02</span><strong>模型目录</strong><small>能力与成本</small></div>
      <b aria-hidden="true">→</b>
      <div><span>03</span><strong>任务路由</strong><small>主备模型策略</small></div>
    </div>
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="AI 配置"><Tab>服务商</Tab><Tab>模型管理</Tab><Tab>任务路由</Tab><Tab>提示词与成本</Tab></TabList>
      <TabPanels>
        <TabPanel><div className="intelligence-panel">
          <div className="settings-context-note"><strong>运行时状态</strong><span>Cloudflare Workers AI 已提供平台运行时能力。其他服务商需完成凭证接入和调用适配后才可用于业务任务。</span><Tag type="green">运行时已接入</Tag></div>
          <div className="settings-catalog-groups">{aiProviderGroups.map(group =>
            <CatalogGroup key={group.title} title={group.title} description={group.description} count={group.items.length}>
              {group.items.map(provider => <ResourceRow key={provider.name} item={provider} action={provider.status === "待配置" ? <Button kind="ghost" size="sm" onClick={explain}>查看接入要求</Button> : undefined} />)}
            </CatalogGroup>
          )}</div>
          <Pending>AI 服务商凭证保存、连接测试和统一模型调用接口尚未全部接入；目录状态不代表其他供应商已经可用。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="MODEL CATALOG" title="模型目录" description="模型属于服务商连接之下的资源。按能力维护模型规格、上下文长度、价格和启用状态。" />
          <div className="settings-catalog-groups">
            <CatalogGroup title="通用对话与生成" description="文本生成、摘要、信息抽取和多轮对话。"><ResourceRow item={{ name: "通用对话模型", description: "由已接入服务商提供的文本生成模型。", status: "能力分类" }} /></CatalogGroup>
            <CatalogGroup title="推理与多模态" description="复杂分析、图像理解和结构化判断。"><ResourceRow item={{ name: "推理模型", description: "复杂分析、判断、规划和结构化推理。", status: "能力分类" }} /><ResourceRow item={{ name: "多模态模型", description: "图像、文本及其他多模态内容理解。", status: "能力分类" }} /></CatalogGroup>
            <CatalogGroup title="向量与检索" description="语义表示和知识召回。"><ResourceRow item={{ name: "Embedding 模型", description: "向量生成、语义检索和知识库召回。", status: "能力分类" }} /></CatalogGroup>
          </div>
          <Pending>模型发现、模型参数、价格目录和自定义模型持久化接口尚未接入；不会展示未经验证的模型清单。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="AI TASK ROUTING" title="任务路由" description="每项业务任务指定主模型、备用模型和策略。模型选项应来自已启用且能力匹配的模型目录。" />
          <div className="settings-catalog-groups">{modelTaskGroups.map(group =>
            <CatalogGroup key={group.title} title={group.title} description={group.description} count={group.tasks.length}>
              {group.tasks.map(([name, description]) => <Tile key={name} className="settings-catalog-item">
                <div className="settings-catalog-item-head"><div className="settings-catalog-name"><strong>{name}</strong></div><Tag type="gray">待分配</Tag></div>
                <p className="settings-catalog-description">{description}</p>
                <div className="settings-route-fields">
                  <TextInput id={"route-primary-" + name} labelText="主模型" placeholder="选择已配置模型" />
                  <TextInput id={"route-fallback-" + name} labelText="备用模型" placeholder="可选" />
                </div>
              </Tile>)}
            </CatalogGroup>
          )}</div>
          <div className="analysis-submit-row"><span>当前为路由结构定义，尚未持久化。</span><Button kind="primary" onClick={explain}>保存任务路由</Button></div>
          <Pending>任务路由保存、模型能力校验和失败回退策略执行接口尚未接入。</Pending>
        </div></TabPanel>
        <TabPanel><div className="intelligence-panel">
          <SectionHeading eyebrow="PROMPTS & OBSERVABILITY" title="提示词与用量成本" description="按任务管理提示词版本、输出约束，并追踪模型调用量、耗时和实际成本。" />
          <div className="settings-catalog-groups">
            <CatalogGroup title="提示词版本库" description="维护任务提示词、版本、变更记录和生效状态。"><ResourceRow item={{ name: "任务提示词", description: "按业务任务管理提示词模板和输出结构。", status: "待接入" }} /></CatalogGroup>
            <CatalogGroup title="模型调用与成本" description="按服务商、模型、任务和时间范围追踪调用。"><ResourceRow item={{ name: "用量与成本统计", description: "Token、响应耗时、调用次数、失败率和成本。", status: "待接入" }} /></CatalogGroup>
          </div>
          <Pending>提示词版本库、调用账单和成本统计接口尚未接入，不展示推测或模拟数据。</Pending>
        </div></TabPanel>
      </TabPanels>
    </Tabs>
  </div>;
}

function SystemSettings({ explain }: { explain: () => void }) {
  return <div className="intelligence-panel">
    <SectionHeading eyebrow="PLATFORM GOVERNANCE" title="系统配置" description="管理组织资料、访问权限、区域偏好、通知策略、数据治理与安全审计。" />
    <Accordion>
      <AccordionItem title="组织与企业资料"><div className="settings-form-grid"><TextInput id="org-display-name" labelText="组织显示名称" placeholder="组织名称" /><p>组织资料与成员关系沿用当前企业工作区，不在此创建新的组织体系。</p></div></AccordionItem>
      <AccordionItem title="用户与权限"><p>按组织角色配置设置访问权限、服务凭证管理权限、Actor 管理权限和 AI 模型管理权限。</p><Pending>组织权限矩阵与细粒度授权保存接口尚未接入。</Pending></AccordionItem>
      <AccordionItem title="通用偏好"><div className="settings-form-grid"><TextInput id="default-currency" labelText="默认货币" defaultValue="USD" /><TextInput id="default-unit" labelText="默认计量单位" defaultValue="pcs" /><TextInput id="date-format" labelText="日期格式" defaultValue="YYYY-MM-DD" /><Checkbox id="compact-data" labelText="优先使用紧凑数据展示" /></div></AccordionItem>
      <AccordionItem title="地区与语言"><div className="settings-form-grid"><TextInput id="default-language" labelText="界面语言" defaultValue="简体中文" /><TextInput id="default-timezone" labelText="默认时区" defaultValue="Asia/Singapore" /><TextInput id="default-market" labelText="默认市场" defaultValue="Global" /></div></AccordionItem>
      <AccordionItem title="通知策略"><Toggle id="notify-task" labelText="采集任务完成通知" labelA="关" labelB="开" /><Toggle id="notify-error" labelText="连接异常通知" labelA="关" labelB="开" /></AccordionItem>
      <AccordionItem title="数据治理"><p>配置采集数据保留周期、缓存策略、数据导出与演示数据管理。不会自动删除现有业务数据。</p><Pending>数据保留策略和导出权限接口尚未接入。</Pending></AccordionItem>
      <AccordionItem title="安全与审计"><p>统一记录配置变更、密钥轮换、连接测试、Actor 执行和权限变更。密钥不写入前端日志。</p><Pending>审计检索、密钥轮换和安全策略接口尚未全部接入。</Pending></AccordionItem>
    </Accordion>
    <div className="analysis-submit-row"><span>组织级偏好与权限保存接口尚未接入。</span><Button kind="primary" onClick={explain}>保存系统设置</Button></div>
  </div>;
}

export default function Settings() {
  const [notice, setNotice] = useState<string | null>(null);
  const explain = () => setNotice("该配置界面已建立统一结构，但对应服务端接口尚未接入；为避免产生虚假配置，当前不会执行保存。");
  return <section className="module settings-center">
    <div className="settings-page-heading">
      <div className="eyebrow">KOSMOEVRETIS / PLATFORM ADMINISTRATION</div>
      <h2>配置管理中心</h2>
      <p>统一管理平台连接、数据采集能力、AI 模型基础设施与组织级运行策略。</p>
    </div>
    {notice && <InlineNotification kind="warning" lowContrast title="当前操作尚未执行" subtitle={notice} onCloseButtonClick={() => setNotice(null)} />}
    <Tabs defaultSelectedIndex={0}>
      <TabList aria-label="配置管理中心"><Tab>API 与数据源</Tab><Tab>AI 配置</Tab><Tab>系统配置</Tab></TabList>
      <TabPanels>
        <TabPanel><ApiSettings explain={explain} /></TabPanel>
        <TabPanel><AiSettings explain={explain} /></TabPanel>
        <TabPanel><SystemSettings explain={explain} /></TabPanel>
      </TabPanels>
    </Tabs>
  </section>;
}
