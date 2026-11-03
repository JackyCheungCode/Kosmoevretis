import { useEffect,useState } from "react";
import { ArrowRight,Globe,Search,Security,Activity } from "@carbon/icons-react";
import { Link } from "react-router-dom";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";
type Profile={id:string;display_name:string;industry:string|null;version:number;updated_at:string};
type Run={id:string;status:string;model_id:string|null;created_at:string;result:Record<string,unknown>|null};
export function DashboardPage(){
 const {workspace}=useAuth();const [profiles,setProfiles]=useState<Profile[]>([]);const [runs,setRuns]=useState<Run[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{let active=true;const load=async()=>{if(!workspace)return;try{const c=requireSupabase();const [p,a]=await Promise.all([c.from("enterprise_profiles").select("id,display_name,industry,version,updated_at").eq("organization_id",workspace.id).order("updated_at",{ascending:false}),c.from("ai_analysis_runs").select("id,status,model_id,created_at,result").eq("organization_id",workspace.id).order("created_at",{ascending:false}).limit(8)]);if(p.error)throw p.error;if(a.error)throw a.error;if(active){setProfiles((p.data||[]) as Profile[]);setRuns((a.data||[]) as Run[]);}}catch(e){if(active)setError(e instanceof Error?e.message:"数据加载失败");}finally{if(active)setLoading(false);}};void load();return()=>{active=false;};},[workspace?.id]);
 const completed=runs.filter(r=>r.status==="completed").length;const running=runs.filter(r=>r.status==="running"||r.status==="pending").length;
 return <div className="dashboard"><section className="welcome"><div><div className="eyebrow"><i/> GLOBAL BUSINESS INTELLIGENCE</div><h1>工作空间总览。<br/><span>以真实企业数据驱动决策。</span></h1><p>{workspace?.name} · 企业档案、AI 分析与业务活动。</p></div><div className="stamp"><Activity size={16}/> 实时数据</div></section>
 {error&&<div className="data-error">{error}</div>}
 <section className="metrics"><article className="metric featured"><div className="metric-label">企业档案 <Security size={18}/></div><strong>{loading?"—":profiles.length}<span> 份</span></strong><div className="metric-note">当前工作空间可访问档案</div></article><article className="metric"><div className="metric-label">分析任务 <Activity size={18}/></div><strong>{loading?"—":runs.length}<span> 个</span></strong><div className="metric-note">{running} 个进行中 · {completed} 个已完成</div></article><article className="metric"><div className="metric-label">工作空间 <Globe size={18}/></div><strong className="word">{workspace?.name||"—"}</strong><div className="metric-note">组织级数据隔离已启用</div></article></section>
 <section className="section-head"><div><div className="eyebrow">ENTERPRISE CONTEXT</div><h2>企业档案</h2></div><Link to="/enterprise-profile">管理档案 <ArrowRight size={14}/></Link></section>
 <section className="dashboard-data-list">{profiles.map(p=><Link to="/enterprise-profile" className="dashboard-data-row" key={p.id}><div><b>{p.display_name}</b><small>{p.industry||"行业未填写"} · 更新于 {new Date(p.updated_at).toLocaleDateString()}</small></div><TagText>v{p.version}</TagText><ArrowRight size={16}/></Link>)}{!loading&&!profiles.length&&<div className="empty-data"><Globe size={24}/><b>尚无企业档案</b><p>创建企业档案，作为后续 AI 分析的真实业务上下文。</p><Link to="/enterprise-profile">创建第一份档案 <ArrowRight size={14}/></Link></div>}</section>
 <section className="section-head"><div><div className="eyebrow">AI ANALYSIS ACTIVITY</div><h2>最近分析任务</h2></div><span>{runs.length} 条记录</span></section>
 <section className="dashboard-data-list">{runs.map(r=><div className="dashboard-data-row" key={r.id}><div><b>AI 企业分析</b><small>{r.model_id||"模型信息待记录"} · {new Date(r.created_at).toLocaleString()}</small></div><TagText>{r.status}</TagText></div>)}{!loading&&!runs.length&&<div className="empty-data"><Search size={24}/><b>尚无分析任务</b><p>在企业档案页面启动分析后，任务状态与结果会显示在这里。</p></div>}</section>
 </div>;
}
function TagText({children}:{children:React.ReactNode}){return <span className="dashboard-tag">{children}</span>;}
