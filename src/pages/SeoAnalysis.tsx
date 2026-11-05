import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion, AccordionItem, Button, Dropdown, InlineNotification, NumberInput, Tag, TextInput, Tile } from "@carbon/react";
import { Search, Settings } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, IntelligencePageTemplate, PageSection } from "../design-system";
import { supabase } from "../lib/supabase";
import "./seo-analysis.css";

const ORGANIZATION_ID = "d6dd93fe-75ac-4c2f-90a3-53474acdef8f";
const markets = [{id:"US",label:"美国"},{id:"GB",label:"英国"},{id:"DE",label:"德国"},{id:"JP",label:"日本"},{id:"GLOBAL",label:"全球"}];
type Task = {id:string;title:string;status:string;result_count:number;actor_meta?:Record<string,any>;input_snapshot?:Record<string,any>;raw_items?:any[];error_message?:string|null;created_at?:string};
const dateText = (v?:string) => v ? new Date(v).toLocaleString() : "—";
const statusText = (v?:string) => ({running:"分析中",succeeded:"已完成",partial:"部分完成",failed:"失败",queued:"排队中"} as Record<string,string>)[v||""] || "等待提交";
const scoreText = (v:any) => typeof v === "number" ? v + "/100" : "暂无数据";

export default function SeoAnalysis() {
  const navigate = useNavigate();
  const [url,setUrl] = useState("");
  const [market,setMarket] = useState("US");
  const [maxPages,setMaxPages] = useState(80);
  const [pagespeedLimit,setPagespeedLimit] = useState(5);
  const [busy,setBusy] = useState(false);
  const [activeId,setActiveId] = useState<string|null>(null);
  const [task,setTask] = useState<Task|null>(null);
  const [history,setHistory] = useState<Task[]>([]);
  const [notice,setNotice] = useState<{kind:"success"|"error"|"info";title:string;message:string}|null>(null);

  const invoke = useCallback(async (action:string, payload:Record<string,unknown>={}) => {
    const {data,error} = await supabase.functions.invoke("seo-intelligence",{body:{action,organization_id:ORGANIZATION_ID,...payload}});
    if(error) {
      let message = error.message || "SEO 服务请求失败。";
      try { const body = await (error as any).context?.json?.(); if(body?.error) message=body.error; } catch {}
      throw new Error(message);
    }
    if(data?.error) throw new Error(data.error);
    return data;
  },[]);
  const loadHistory = useCallback(async () => {
    const data = await invoke("list_history");
    setHistory(data.history || []);
  },[invoke]);
  const poll = useCallback(async (id:string) => {
    const data = await invoke("poll_task",{task_id:id});
    if(data.task) {
      setTask(data.task);
      if(data.task.status !== "running") { setActiveId(null); await loadHistory(); }
    }
  },[invoke,loadHistory]);

  useEffect(()=>{loadHistory().catch(e=>setNotice({kind:"error",title:"读取历史记录失败",message:e.message}));},[loadHistory]);
  useEffect(()=>{
    if(!activeId) return;
    let stopped=false;
    let inFlight=false;
    const run=async()=>{if(stopped||inFlight)return;inFlight=true;try{await poll(activeId);}catch(e){if(!stopped)setNotice({kind:"error",title:"刷新任务失败",message:e instanceof Error?e.message:"请稍后重试。"});}finally{inFlight=false;}};
    void run();
    const timer=window.setInterval(()=>void run(),9000);
    return()=>{stopped=true;window.clearInterval(timer);};
  },[activeId,poll]);

  const start = async () => {
    let parsed:URL;
    try { parsed=new URL(url.trim()); if(!["http:","https:"].includes(parsed.protocol)) throw new Error(); }
    catch {setNotice({kind:"error",title:"网址格式不正确",message:"请输入完整的 http:// 或 https:// 网站首页网址。"});return;}
    setBusy(true);setNotice(null);
    try {
      const data=await invoke("start",{url:parsed.toString(),market,max_pages:maxPages,pagespeed_limit:pagespeedLimit});
      setTask({id:data.task_id,title:"SEO 诊断："+parsed.hostname,status:"running",result_count:0,created_at:new Date().toISOString()});
      setActiveId(data.task_id);
      setNotice({kind:"success",title:"诊断任务已提交",message:"Context.dev 已完成 URL 发现并开始分批采集核心页面；随后执行 Mobile 与 Desktop PageSpeed 检测。"});
      await loadHistory();
    } catch(e) {setNotice({kind:"error",title:"无法启动诊断",message:e instanceof Error?e.message:"请检查服务凭证与输入参数。"});}
    finally {setBusy(false);}
  };
  const openHistory = async (id:string) => {
    setBusy(true);
    try {const data=await invoke("get_history",{task_id:id});setTask(data.task);setActiveId(data.task.status==="running"?id:null);}
    catch(e){setNotice({kind:"error",title:"读取报告失败",message:e instanceof Error?e.message:"请稍后重试。"});}
    finally{setBusy(false);}
  };

  const report=task?.actor_meta?.report;
  const scores=useMemo(()=>[
    ["综合健康度",report?.overall_score],["技术 SEO",report?.scores?.technical_seo],
    ["页面性能",report?.scores?.performance],["内容质量",report?.scores?.content],
    ["结构化数据",report?.scores?.structured_data],["搜索 SEO",report?.scores?.search_seo],
  ] as [string,number|null|undefined][],[report]);

  const config=(
    <section aria-label="网站分析源配置">
      <TextInput id="seo-site-url" labelText="独立站网址" placeholder="https://www.example.com" value={url}
        onChange={e=>setUrl(e.currentTarget.value)} helperText="输入可公开访问的网站首页，系统将发起真实全站爬取。" />
      <Dropdown id="seo-market" titleText="目标市场（报告标记）" label="选择目标市场" items={markets}
        itemToString={item=>item?.label||""} selectedItem={markets.find(x=>x.id===market)||markets[0]}
        onChange={({selectedItem})=>setMarket(selectedItem?.id||"US")} />
      <div className="seo-analysis-config-grid">
        <NumberInput id="seo-max-pages" label="最大分析页面数" min={1} max={200} value={maxPages}
          onChange={(_e,s)=>setMaxPages(Number(s.value)||500)} />
        <NumberInput id="seo-pagespeed-limit" label="PageSpeed 代表性页面数" min={1} max={10} value={pagespeedLimit}
          onChange={(_e,s)=>setPagespeedLimit(Number(s.value)||10)} />
      </div>
      <InlineNotification kind="info" lowContrast title="第三方检测与费用提示"
        subtitle="先由 Context.dev Map URLs 发现页面，再深度采集最多 200 页；PageSpeed 对最多 10 个代表性页面分别检测 Mobile 与 Desktop。第三方服务可能计费，PageSpeed 不代表全站逐页性能。" hideCloseButton />
      <div className="analysis-submit-row">
        <Button kind="primary" renderIcon={Search} disabled={busy||!!activeId} onClick={start}>{busy?"正在提交…":activeId?"诊断任务运行中":"开始 SEO 诊断"}</Button>
        <Button kind="ghost" renderIcon={Settings} onClick={()=>navigate("/settings/providers")}>配置 API 凭证</Button>
      </div>
    </section>
  );

  return <IntelligencePageTemplate title="独立站智能诊断"
    description="通过 Context.dev 发现全站页面、深度采集核心内容，结合结构化数据预检与 Google PageSpeed Insights 生成证据驱动的诊断报告。"
    eyebrow="WEBSITE SEO INTELLIGENCE" sourceConfiguration={config}>
    {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} hideCloseButton/>}
    <PageSection title="SEO 诊断工作区" description="查看网站健康度、页面级证据、PageSpeed 指标与优化建议。">
      {!task?<EmptyState title="等待提交网站进行诊断" description="先在设置中心保存 Context.dev API Key 与 Google PageSpeed API Key，然后输入网站网址开始诊断。"/>:
      <div className="seo-analysis-results">
        <div className="seo-analysis-task-heading"><div><strong>{task.title}</strong><p>{dateText(task.created_at)} · 已分析 {task.result_count||0} 个页面</p></div>
          <Tag type={task.status==="succeeded"?"green":task.status==="failed"?"red":task.status==="partial"?"warm-gray":"blue"}>{statusText(task.status)}</Tag></div>
        {task.status==="running"&&<InlineNotification kind="info" lowContrast title="正在执行诊断"
          subtitle={task.actor_meta?.pagespeed_results?"PageSpeed 已完成 "+task.actor_meta.pagespeed_results.length+" 项检测，正在继续。":"Context.dev 正在采集核心页面，进度将自动刷新。"} hideCloseButton/>}
        {task.error_message&&<InlineNotification kind="warning" lowContrast title="部分检测未完成" subtitle={task.error_message} hideCloseButton/>}
        {report&&<>
          <div className="seo-analysis-score-grid">{scores.map(([label,value])=><Tile key={label} className="seo-analysis-score-tile">
            <span>{label}</span><strong>{scoreText(value)}</strong>{label==="综合健康度"&&<Tag type={typeof value==="number"&&value>=80?"green":"blue"}>覆盖率 {report.coverage_percent||0}%</Tag>}
          </Tile>)}</div>
          <InlineNotification kind="info" lowContrast title="评分覆盖范围" subtitle={report.methodology} hideCloseButton/>
          <div className="seo-analysis-report-meta"><span>发现页面：{report.discovered_pages} · 深度审计：{report.audited_pages}</span><span>PageSpeed 页面：{report.pagespeed_samples}</span><span>报告生成：{dateText(report.generated_at)}</span></div>
          <section className="seo-analysis-recommendations"><h4>优化建议与检测证据</h4>
            {(report.recommendations||[]).length===0?<p>本次检测没有触发当前规则集的问题项；这不代表网站不存在所有 SEO 问题。</p>:
              report.recommendations.map((item:any,i:number)=><Tile key={item.title+i} className="seo-analysis-issue">
                <div className="seo-analysis-issue-head"><strong>{item.title}</strong><Tag type={item.severity==="high"?"red":"blue"}>{item.severity==="high"?"高优先级":"建议优化"}</Tag></div>
                <span>{item.category} · {item.url}</span><p>检测证据：{item.evidence}</p><p>建议：{item.action}</p>
              </Tile>)}
          </section>
          <Accordion>
            <AccordionItem title={"页面检测明细（"+(task.raw_items||[]).length+"）"}>
              {(task.raw_items||[]).slice(0,100).map((item:any,i:number)=><div className="seo-analysis-page-row" key={item.url||i}>
                <strong>{item.url||"未知页面"}</strong><span>HTTP {item.status_code??"—"} · OnPage {item.onpage_score??"—"}</span>
                <span>Title：{item.meta?.title||"未返回"} · Description：{item.meta?.description?"已设置":"未返回"}</span>
              </div>)}
            </AccordionItem>
            <AccordionItem title="页面级 SEO 诊断与证据">
              {(task.raw_items||[]).map((item:any,i:number)=><div className="seo-analysis-page-row" key={item.url||i}>
                <strong>{item.audit?.title||item.title||item.url}</strong><span>{item.url}</span>
                <span>正文 {item.audit?.word_count??"—"} 词 · H1 {item.audit?.h1?.length??"—"} · 图片缺少 Alt {item.audit?.images_missing_alt??"—"}</span>
                <span>{(item.audit?.issues||[]).length} 项页面问题</span>
              </div>)}
            </AccordionItem>
            <AccordionItem title="结构化数据与富媒体资格预检">
              {(task.raw_items||[]).map((item:any,i:number)=><div className="seo-analysis-page-row" key={item.url||i}>
                <strong>{item.url}</strong><span>JSON-LD {item.audit?.structured_data?.json_ld_valid??0}/{item.audit?.structured_data?.json_ld_blocks??0} · Microdata {item.audit?.structured_data?.microdata_items??0} · RDFa {item.audit?.structured_data?.rdfa_items??0}</span>
                <span>Schema：{(item.audit?.structured_data?.types||[]).join("、")||"未发现"}</span>
                {(item.audit?.structured_data?.eligibility_checks||[]).map((check:any)=><span key={check.type}>{check.type}：{check.precheck} · 缺少必填：{(check.missing_required||[]).join("、")||"无"} · 建议补充：{(check.missing_recommended||[]).join("、")||"无"}</span>)}
              </div>)}
            </AccordionItem>
            <AccordionItem title="PageSpeed 原始指标">
              {(task.actor_meta?.pagespeed_results||[]).map((item:any,i:number)=><div className="seo-analysis-page-row" key={item.url+item.strategy+i}>
                <strong>{item.url} · {item.strategy}</strong><span>{item.error||("Performance "+scoreText(item.scores?.performance)+" · SEO "+scoreText(item.scores?.seo)+" · LCP "+(item.metrics?.lcp_ms==null?"—":Math.round(item.metrics.lcp_ms)+" ms")+" · CLS "+(item.metrics?.cls??"—"))}</span>
              </div>)}
            </AccordionItem>
          </Accordion>
        </>}
        {!report&&task.status!=="running"&&<EmptyState title="本次任务没有生成完整报告" description={task.error_message||"请检查服务凭证和第三方任务状态后重试。"} />}
      </div>}
    </PageSection>
    <PageSection title="历史诊断记录" description="查看当前组织最近 30 次网站 SEO 诊断。">
      {!history.length?<EmptyState title="暂无历史诊断" description="完成首次网站诊断后，报告将保存在这里。"/>:
        <div className="seo-analysis-history">{history.map(item=><Tile key={item.id} className="seo-analysis-history-item">
          <div><strong>{item.title}</strong><p>{dateText(item.created_at)} · {item.result_count||0} 个页面</p></div>
          <Tag type={item.status==="succeeded"?"green":item.status==="failed"?"red":"blue"}>{statusText(item.status)}</Tag>
          <Button kind="ghost" size="sm" disabled={busy} onClick={()=>openHistory(item.id)}>查看报告</Button>
        </Tile>)}</div>}
    </PageSection>
  </IntelligencePageTemplate>;
}