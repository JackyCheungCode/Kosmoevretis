import { useState } from "react";
import { Button, Checkbox, InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, Tab, TabList, TabPanels, TabPanel, Tag, TextInput, Toggle } from "@carbon/react";
import CarbonSelect from "./components/CarbonSelect";
import { CollectionModeGrid } from "./design-system/components/CollectionModeGrid";
import "./design-system-preview.css";

export default function DesignSystemPreview() {
  const [market, setMarket] = useState("global");
  const [keyword, setKeyword] = useState("Wireless earbuds");
  const [alerts, setAlerts] = useState(true);
  const [estimates, setEstimates] = useState(false);
  const [collectionMode, setCollectionMode] = useState("search");
  return <div className="ds-preview">
    <section className="ds-intro">
      <div className="ds-overline">Kosmoevretis / 设计基础</div>
      <h2>全站设计系统</h2>
      <p>基于 IBM Carbon Design System v11，统一视觉语言、交互行为和业务页面基础组件。</p>
      <div className="ds-intro-meta"><Tag type="blue">Carbon v11</Tag><Tag type="green">Gray 10 · 默认主题</Tag><span>规范版本 1.0 · 组件预览，不连接业务数据</span></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">01 / 基础原则</span><h3>设计原则</h3></div><p>通过背景层级和排版组织信息，减少装饰性边框与卡片。</p></div>
      <div className="ds-principles">
        <div><strong>层级优先</strong><p>使用 Background、Layer 01、Layer 02 建立清晰的信息层级。</p></div>
        <div><strong>内容优先</strong><p>让数据、筛选条件和主要操作成为视觉焦点。</p></div>
        <div><strong>一致交互</strong><p>同类控件保持相同尺寸、状态、键盘行为和反馈。</p></div>
      </div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">02 / 颜色</span><h3>颜色与背景层级</h3></div><p>使用 Carbon 语义令牌，不在业务页面直接定义颜色值。</p></div>
      <div className="ds-color-grid">
        <div className="ds-color-swatch ds-color-background"><span>Background</span><code>--cds-background</code></div>
        <div className="ds-color-swatch ds-color-layer-one"><span>Layer 01</span><code>--cds-layer-01</code></div>
        <div className="ds-color-swatch ds-color-layer-two"><span>Layer 02</span><code>--cds-layer-02</code></div>
        <div className="ds-color-swatch ds-color-interactive"><span>Interactive</span><code>--cds-interactive</code></div>
        <div className="ds-color-swatch ds-color-text"><span>Text primary</span><code>--cds-text-primary</code></div>
        <div className="ds-color-swatch ds-color-border"><span>Border subtle</span><code>--cds-border-subtle</code></div>
      </div>
      <div className="ds-rule-note">边框只用于表格分隔、输入控件边界、必要的区域分界和键盘焦点，不用于装饰。</div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">03 / 字体排版</span><h3>字体与排版</h3></div><p>统一 IBM Plex Sans，使用 Carbon 字体级别建立层级。</p></div>
      <div className="ds-type-samples">
        <div className="ds-type-row"><span>Productive heading 04</span><h2>全球市场情报</h2></div>
        <div className="ds-type-row"><span>Heading 03</span><h3>全球热销榜与市场趋势</h3></div>
        <div className="ds-type-row"><span>Body 01</span><p>整合电商、搜索、社交媒体和公开市场数据，辅助识别真实需求与商业机会。</p></div>
        <div className="ds-type-row"><span>Label 01</span><small>来源：公开市场数据 · 更新时间：2026-11-04</small></div>
      </div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">04 / 组件</span><h3>按钮与操作</h3></div><p>一个页面只保留清晰的主要操作层级。</p></div>
      <div className="ds-component-row"><Button kind="primary">开始分析</Button><Button kind="secondary">保存配置</Button><Button kind="tertiary">查看详情</Button><Button kind="ghost">取消</Button><Button kind="danger">删除</Button><Button kind="primary" disabled>不可用</Button></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">05 / 表单控件</span><h3>表单控件</h3></div><p>使用 Carbon 控件或统一 CarbonSelect，不使用浏览器原生下拉框。</p></div>
      <div className="ds-form-grid">
        <TextInput id="ds-keyword" labelText="关键词" value={keyword} onChange={event => setKeyword(event.target.value)} helperText="支持产品名称、品牌或市场关键词。" />
        <div className="ds-field"><label htmlFor="ds-market">目标市场</label><CarbonSelect value={market} onChange={setMarket} ariaLabel="目标市场"><option value="global">全球市场</option><option value="us">美国</option><option value="cn">中国</option></CarbonSelect></div>
        <div className="ds-form-options"><Toggle id="ds-alerts" labelText="任务完成通知" labelA="关" labelB="开" toggled={alerts} onToggle={setAlerts}/><Checkbox id="ds-estimates" labelText="包含第三方估算数据" checked={estimates} onChange={event => setEstimates(event.target.checked)}/></div>
      </div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">06 / 导航</span><h3>页内导航</h3></div><p>Tabs 用于同一工作区内的同级内容切换，不代替全局导航。</p></div>
      <div className="ds-tabs-demo"><Tabs defaultSelectedIndex={0}><TabList aria-label="情报内容导航"><Tab>情报总览</Tab><Tab>搜索趋势</Tab><Tab>社媒趋势</Tab></TabList><TabPanels><TabPanel><p>汇总关键指标、市场变化与重要信号。</p></TabPanel><TabPanel><p>展示关键词热度、地区分布与时间变化。</p></TabPanel><TabPanel><p>展示公开内容、互动信号和讨论主题。</p></TabPanel></TabPanels></Tabs></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">07 / 数据展示</span><h3>状态与数据表格</h3></div><p>区分平台观测、第三方估算与 AI 推断，不把不同证据类型混为一谈。</p></div>
      <div className="ds-status-row"><Tag type="green">已完成</Tag><Tag type="blue">采集中</Tag><Tag type="warm-gray">待处理</Tag><Tag type="red">失败</Tag><Tag type="purple">AI 推断</Tag></div>
      <div className="ds-table-wrap"><Table size="lg"><TableHead><TableRow><TableHeader>数据对象</TableHeader><TableHeader>市场</TableHeader><TableHeader>证据类型</TableHeader><TableHeader>状态</TableHeader></TableRow></TableHead><TableBody>
        <TableRow><TableCell>无线耳机</TableCell><TableCell>美国</TableCell><TableCell>平台观测</TableCell><TableCell><Tag type="green">已验证来源</Tag></TableCell></TableRow>
        <TableRow><TableCell>便携式显示器</TableCell><TableCell>德国</TableCell><TableCell>第三方估算</TableCell><TableCell><Tag type="warm-gray">需交叉验证</Tag></TableCell></TableRow>
        <TableRow><TableCell>智能家居传感器</TableCell><TableCell>日本</TableCell><TableCell>AI 推断</TableCell><TableCell><Tag type="purple">待审核</Tag></TableCell></TableRow>
      </TableBody></Table></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">08 / 系统反馈</span><h3>系统反馈</h3></div><p>成功、警告和错误采用统一 Carbon 模式。</p></div>
      <div className="ds-feedback-stack"><InlineNotification kind="success" lowContrast title="配置已保存" subtitle="连接参数已更新，尚未执行真实采集任务。" hideCloseButton/><InlineNotification kind="warning" lowContrast title="数据需要核验" subtitle="该指标来自第三方估算，不代表平台确认的实际销量。" hideCloseButton/><InlineNotification kind="error" lowContrast title="连接失败" subtitle="请检查服务凭证和网络配置后重试。" hideCloseButton/></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">09 / 页面模板</span><h3>页面布局范式</h3></div><p>根据任务类型选择模板，而不是所有页面套同一个卡片布局。</p></div>
      <div className="ds-page-pattern"><div className="ds-pattern-header">页面标题 / 说明 / 主要操作</div><div className="ds-pattern-source">分析源配置 / 搜索条件 / 筛选器</div><div className="ds-pattern-tabs">同级业务 Tabs</div><div className="ds-pattern-content">数据表格 / 图表 / 分析结果工作区</div><div className="ds-pattern-meta">数据来源 / 时间 / 置信度 / 分页</div></div>
    </section>
    <section className="ds-section">
      <div className="ds-section-heading"><div><span className="ds-overline">10 / 采集工作区</span><h3>采集能力选择</h3></div><p>跨平台统一卡片尺寸、间距、语义图标、选中状态和自适应网格，避免内容溢出。</p></div>
      <CollectionModeGrid ariaLabel="采集能力组件预览" selectedId={collectionMode} onSelect={setCollectionMode} options={[
        {id:"search",label:"关键词搜索",description:"按关键词发现公开内容"},
        {id:"profiles",label:"账号档案",description:"分析公开账号与创作者资料"},
        {id:"posts",label:"内容采集",description:"获取帖子、视频和互动信息"},
        {id:"trends",label:"趋势发现",description:"识别地区与主题热度变化"},
      ]}/>
    </section>
    <section className="ds-final-note"><span className="ds-overline">实施规则</span><h3>统一规范，逐页执行</h3><p>业务页面必须复用统一令牌和组件。新增样式需说明必要性；不得通过页面私有 CSS 重新定义全站控件。</p></section>
  </div>;
}
