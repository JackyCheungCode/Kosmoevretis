import { ArrowRight, Calendar, ChartLine, Globe, Search, Security } from "@carbon/icons-react";

const steps = [
  { n: "01", title: "完善企业身份", desc: "建立经过验证的企业档案，为后续情报工作提供可信基础。", status: "下一步", icon: Globe },
  { n: "02", title: "定义目标市场", desc: "选择重点关注的地区、国家和行业。", status: "即将开始", icon: ChartLine },
  { n: "03", title: "启动首次全球发现", desc: "通过可解释的 AI 信号，发现值得关注的企业。", status: "即将开始", icon: Search },
];

export function DashboardPage() {
  return (
    <div className="dashboard">
      <section className="welcome">
        <div>
          <div className="eyebrow"><i /> 全球商业情报</div>
          <h1>早上好。<br /><span>从这里掌握全球商业动态。</span></h1>
          <p>清晰了解企业关系网络、市场机会与下一步行动。</p>
        </div>
        <div className="stamp"><Calendar size={16} /> 平台概览</div>
      </section>

      <section className="metrics">
        <article className="metric featured">
          <div className="metric-label">工作空间就绪度 <Security size={18} /></div>
          <strong>01<span> / 05</span></strong>
          <div className="metric-note"><i /> 基础建设进行中</div>
        </article>
        <article className="metric">
          <div className="metric-label">企业档案 <Globe size={18} /></div>
          <strong className="word">尚未设置</strong>
          <div className="metric-note">尚未配置您的企业身份信息</div>
        </article>
        <article className="metric">
          <div className="metric-label">全球发现活动 <Search size={18} /></div>
          <strong className="word">尚未开始</strong>
          <div className="metric-note">尚未启动任何企业发现任务</div>
        </article>
      </section>

      <section className="section-head">
        <div><div className="eyebrow">接下来要做什么</div><h2>建立您的商业情报基础</h2></div>
        <span>01 — 03</span>
      </section>
      <section className="steps">
        {steps.map(({ n, title, desc, status, icon: Icon }, i) => (
          <article className={"step" + (i === 0 ? " current" : "")} key={n}>
            <span className="step-no">{n}</span>
            <span className="step-icon"><Icon size={20} /></span>
            <div className="step-copy"><b>{title}</b><p>{desc}</p></div>
            <span className="step-status">{status}</span>
            <ArrowRight size={18} />
          </article>
        ))}
      </section>

      <section className="lower">
        <article className="principle">
          <div className="panel-label">情报原则 <span>01 / 04</span></div>
          <h3>证据先于假设。</h3>
          <p>每一条企业洞察都将关联信息来源、时间戳、置信度与审核状态。不提供不透明评分，不编造企业动态。</p>
          <div className="panel-line" />
          <small>KOSMOEVRETIS 产品准则</small>
        </article>
        <article className="status-panel">
          <div className="panel-label">系统状态 <b><i /> 运行正常</b></div>
          <div className="status-row"><span>应用框架</span><strong>就绪</strong></div>
          <div className="status-row"><span>独立路由</span><strong>已启用</strong></div>
          <div className="status-row"><span>数据集成</span><em>尚未连接</em></div>
          <div className="status-row"><span>AI 全球发现</span><em>尚未启用</em></div>
          <div className="status-link">平台基础版本 <ArrowRight size={14} /></div>
        </article>
      </section>

      <footer className="footer">
        <span>KOSMOEVRETIS · 全球商业情报平台</span>
        <span>清晰决策 · 以证据为基础</span>
      </footer>
    </div>
  );
}
