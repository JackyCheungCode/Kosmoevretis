import { useEffect,useState,type ReactNode } from "react";
import { ArrowRight,Globe,Search,Security,Activity,ChartLine,Building } from "@carbon/icons-react";
import { Link } from "react-router-dom";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";

type Profile={id:string;display_name:string;industry:string|null;version:number;updated_at:string};
type Run={id:string;status:string;model_id:string|null;created_at:string;result:Record<string,unknown>|null};
const statusLabel:Record<string,string>={succeeded:"已完成",running:"进行中",pending:"等待执行",failed:"失败",cancelled:"已取消"};
export function DashboardPage(){
 const {workspace}=useAuth();const [profiles,setProfiles]=useState<Profile[]>([]);const [runs,setRuns]=useState<Run[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{let active=true;const load=async()=>{if(!workspace)return;try{const c=requireSupabase();const [p,a]=await Promise.all([c.from("enterprise_profiles").select("id,display_name,industry,version,updated_at").eq("organization_id",workspace.id).order("updated_at",{ascending:false}),c.from("ai_analysis_runs").select("id,status,model_id,created_at,result").eq("organization_id",workspace.id).order("created_at",{ascending:false}).limit(8)]);if(p.error)throw p.error;if(a.error)throw a.error;if(active){setProfiles((p.data||[]) as Profile[]);setRuns((a.data||[]) as Run[]);}}catch(e){if(active)setError(e instanceof Error?e.message:"数据加载失败，请稍后重试。");}finally{if(active)setLoading(false);}};void load();return()=>{active=false;};},[workspace?.id]);
 const completed=runs.filter(r=>r.status==="succeeded").length;const running=runs.filter(r=>r.status==="running"||r.status==="pending").length;
 return <div className="dashboard dashboard-v2">
  <section className="dashboard-hero">
   <div className="dashboard-hero-copy"><div className="eyebrow"><i/> GLOBAL BUSINESS INTELLIGENCE</div><p className="dashboard-greeting">你好，欢迎回来</p><h1>让全球市场，<br/><span>成为你的增长视野。</span></h1><p className="dashboard-intro">从理解企业自身开始，持续发现市场需求、潜在客户与新的商业机会。</p>
    <div className="dashboard-primary-actions"><Link className="dashboard-primary-link" to="/enterprise-workflow"><Building size={17}/>完善企业档案<ArrowRight size={16}/></Link><Link className="dashboard-secondary-link" to="/market-trends">探索市场趋势<ArrowRight size={15}/></Link></div>
   </div>
   <div className="dashboard-hero-aside"><div className="hero-aside-kicker">KOSMOEVRETIS / 01</div><Globe size={34}/><b>Understand.</b><b>Discover.</b><b>Connect.</b><p>以企业能力为起点，连接全球商业情报。</p></div>
  </section>
  {error&&<div className="data-error" role="alert">{error}</div>}
  <section className="dashboard-overview">
   <div className="dashboard-section-title"><div><div className="eyebrow">YOUR WORKSPACE</div><h2>工作空间概况</h2></div><span>数据来自当前组织</span></div>
   <div className="metrics metrics-v2">
    <article className="metric featured"><div className="metric-label">企业档案 <Security size={18}/></div><strong>{loading?"—":profiles.length}<span> 份</span></strong><div className="metric-note">已建立的企业业务上下文</div></article>
    <article className="metric"><div className="metric-label">AI 分析任务 <Activity size={18}/></div><strong>{loading?"—":runs.length}<span> 个</span></strong><div className="metric-note">{running} 个待处理或进行中 · {completed} 个已完成</div></article>
    <article className="metric"><div className="metric-label">当前工作空间 <Globe size={18}/></div><strong className="word">{workspace?.name||"—"}</strong><div className="metric-note">组织级数据隔离</div></article>
   </div>
  </section>
  <section className="dashboard-workbench">
   <div className="dashboard-section-title"><div><div className="eyebrow">YOUR NEXT MOVE</div><h2>从这里开始</h2></div><span>核心工作流程</span></div>
   <div className="dashboard-action-grid">
    <Link to="/enterprise-workflow" className="dashboard-action"><span className="dashboard-action-icon"><Building size={21}/></span><span className="dashboard-action-copy"><small>01 / UNDERSTAND</small><b>建立企业认知</b><em>整理企业服务能力、产品与目标市场</em></span><ArrowRight size={18}/></Link>
    <Link to="/market-trends" className="dashboard-action"><span className="dashboard-action-icon"><ChartLine size={21}/></span><span className="dashboard-action-copy"><small>02 / EXPLORE</small><b>研究市场趋势</b><em>观察区域市场变化与需求信号</em></span><ArrowRight size={18}/></Link>
    <Link to="/keyword-research" className="dashboard-action"><span className="dashboard-action-icon"><Search size={21}/></span><span className="dashboard-action-copy"><small>03 / DISCOVER</small><b>发现搜索需求</b><em>从多平台关键词中识别客户意图</em></span><ArrowRight size={18}/></Link>
   </div>
  </section>
  <section className="dashboard-records">
   <div className="dashboard-section-title"><div><div className="eyebrow">BUSINESS CONTEXT</div><h2>企业档案</h2></div><Link to="/enterprise-workflow">查看全部 <ArrowRight size={14}/></Link></div>
   <div className="dashboard-data-list">{profiles.slice(0,5).map(p=><Link to="/enterprise-workflow" className="dashboard-data-row" key={p.id}><div><b>{p.display_name}</b><small>{p.industry||"行业未填写"} · 更新于 {new Date(p.updated_at).toLocaleDateString()}</small></div><TagText>v{p.version}</TagText><ArrowRight size={16}/></Link>)}{!loading&&!profiles.length&&<div className="empty-data"><Globe size={24}/><b>先让 AI 认识你的企业</b><p>建立企业档案，沉淀服务能力、产品与市场定位，为后续客户发现提供依据。</p><Link to="/enterprise-workflow">创建第一份档案 <ArrowRight size={14}/></Link></div>}</div>
  </section>
  <section className="dashboard-records">
   <div className="dashboard-section-title"><div><div className="eyebrow">AI ACTIVITY</div><h2>最近分析任务</h2></div><span>{runs.length} 条记录</span></div>
   <div className="dashboard-data-list">{runs.slice(0,5).map(r=><div className="dashboard-data-row" key={r.id}><div><b>AI 企业分析</b><small>{r.model_id||"模型信息待记录"} · {new Date(r.created_at).toLocaleString()}</small></div><TagText>{statusLabel[r.status]||r.status}</TagText></div>)}{!loading&&!runs.length&&<div className="empty-data"><Activity size={24}/><b>分析活动将在这里汇总</b><p>启动企业 AI 分析后，可在此追踪任务状态与最近活动。</p></div>}</div>
  </section>
  <footer className="dashboard-footer"><span>KOSMOEVRETIS</span><span>Understand. Discover. Connect.</span></footer>
 </div>;
}
function TagText({children}:{children:ReactNode}){return <span className="dashboard-tag">{children}</span>;}
