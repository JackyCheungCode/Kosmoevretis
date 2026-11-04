import { useState } from "react";

const items = [
  ["overview", "情报总览", "◫"],
  ["bestsellers", "全球热销榜", "↗"],
  ["search", "搜索趋势", "⌕"],
  ["social", "社交媒体趋势", "◎"],
  ["consumer", "消费者洞察", "◉"],
  ["competitors", "品牌与竞品", "▤"],
  ["categories", "品类分析", "▦"],
  ["markets", "国家市场", "◇"],
  ["sources", "数据源管理", "⌘"],
];

export default function App() {
  const [active, setActive] = useState("overview");
  const current = items.find((item) => item[0] === active) || items[0];
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">K</span><b>KOSMOEVRETIS</b></a>
        <span className="top-context">GLOBAL 3C MARKET INTELLIGENCE</span>
        <span className="top-status">● 平台初始化中</span>
      </header>
      <aside className="sidebar">
        <div className="nav-caption">工作空间</div>
        {items.map((item) => (
          <button key={item[0]} className={active === item[0] ? "nav-item active" : "nav-item"} onClick={() => setActive(item[0])}>
            <span className="nav-icon">{item[2]}</span>{item[1]}
          </button>
        ))}
        <div className="sidebar-foot">P0 · 全球市场情报</div>
      </aside>
      <main className="content">
        <div className="eyebrow">GLOBAL INTELLIGENCE / P0</div>
        <div className="page-head"><div><h1>{current[1]}</h1><p>跨电商、搜索、社交媒体与消费者社区的全球 3C 市场信号。</p></div><span className="scope">● GLOBAL　全球市场</span></div>
        {active === "overview" ? <>
          <section className="metrics">
            {["已接入数据源", "累计市场证据", "监测商品", "待验证机会"].map((label) => <article className="metric" key={label}><span>{label}</span><strong>0</strong><small>等待数据接入</small></article>)}
          </section>
          <section className="section">
            <div className="section-head"><div><span className="eyebrow">INTELLIGENCE PIPELINE</span><h2>全球情报采集网络</h2></div><small>0 / 6 信号域已启用</small></div>
            <div className="signals">
              {[
                ["电商交易与热销", "商品排名、价格、评论与可获得的销量信号"],
                ["搜索趋势", "Google Trends、关键词热度与增长查询"],
                ["社交媒体", "视频、内容互动、传播速度与购买意向"],
                ["消费者声音", "评论、社区讨论、使用痛点与需求"],
                ["品牌与竞品", "新品发布、价格变化、型号与产品动作"],
                ["行业与供应链", "技术、专利、认证法规与产业信号"],
              ].map(([title, desc], index) => <article className="signal" key={title}><span className="signal-no">0{index + 1}</span><div><b>{title}</b><p>{desc}</p></div><small>待接入</small></article>)}
            </div>
          </section>
          <section className="section">
            <div className="section-head"><div><span className="eyebrow">PRODUCT OPPORTUNITY</span><h2>市场机会发现</h2></div><small>等待数据源接入</small></div>
            <div className="empty"><h3>建立第一条市场证据链</h3><p>连接电商、搜索和社交数据源后，平台将关联跨渠道商品信号，识别增长品类、消费者未满足需求与潜在产品机会。</p><button onClick={() => setActive("sources")}>配置数据源　→</button></div>
          </section>
        </> : <section className="module"><span className="eyebrow">P0 MODULE</span><h2>{current[1]}</h2><p>模块入口已建立。下一步将接入统一数据模型、真实采集任务和可追溯的市场证据。</p>{active === "sources" && <p>集中配置 Apify、Google Trends、YouTube、Reddit 与电商连接器。凭证只存放在服务端安全配置中。</p>}</section>}
      </main>
    </div>
  );
}
