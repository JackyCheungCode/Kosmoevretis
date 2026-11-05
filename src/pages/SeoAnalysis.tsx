import { useCallback, useEffect, useMemo, useState } from "react";
import { Accordion, AccordionItem, Button, Dropdown, InlineNotification, NumberInput, ProgressBar, Tabs, TabList, Tab, TabPanels, TabPanel, Tag, TextInput, Tile } from "@carbon/react";
import { Search, Settings, Renew } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, IntelligencePageTemplate, PageSection } from "../design-system";
import { supabase } from "../lib/supabase";
import "./seo-analysis.css";

const ORGANIZATION_ID = "d6dd93fe-75ac-4c2f-90a3-53474acdef8f";
const markets = [{id:"US",label:"美国"},{id:"GB",label:"英国"},{id:"DE",label:"德国"},{id:"JP",label:"日本"},{id:"GLOBAL",label:"全球"}];
type Task = {id:string;title:string;status:string;result_count:number;actor_meta?:Record<string,any>;input_snapshot?:Record<string,any>;raw_items?:any[];error_message?:string|null;created_at?:string;updated_at?:string;started_at?:string;completed_at?:string};
const dateText = (v?:string) => v ? new Date(v).toLocaleString() : "—";
const statusText = (v?:string) => ({running:"后台执行中",succeeded:"已完成",partial:"部分完成",failed:"失败",queued:"排队中"} as Record<string,string>)[v||""] || "等待提交";
const stageText = (v?:string) => ({mapping:"网站结构发现",scraping:"页面采集与 SEO 审计",pagespeed:"PageSpeed 性能检测",completed:"报告生成完成",failed:"执行失败"} as Record<string,string>)[v||""] || "准备任务";
const scoreText = (v:any) => typeof v === "number" ? v + "/100" : "暂无数据";
const elapsedText = (start?:string,end?:string) => { if(!start)return "—";const ms=Math.max(0,new Date(end||Date.now()).getTime()-new Date(start).getTime());const sec=Math.floor(ms/1000);return sec<60?sec+" 秒":Math.floor(sec/60)+" 分 "+sec%60+" 秒"; };

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
  const [notice,setNotice] = useState<{kind:"success"|"error"|"info"|"warning";title:string;message:string}|null>(null);
  const [lastRefresh,setLastRefresh] = useState<string|null>(null);
  const [pollError,setPollError] = useState<string|null>(null);

  const invoke = useCallback(async (action:string, payload:Record<string,unknown>={}) => {
    const {data,error} = await supabase.functions.invoke("seo-intelligence",{body:{action,organization_id:ORGANIZATION_ID,...payload}});
    if(error) { let message=error.message||"SEO 服务请求失败。";try{const body=await (error as any).context?.json?.();if(body?.error)message=body.error;}catch{}throw new Error(message); }
    if(data?.error)throw new Error(data.error);
    return data;
  },[]);
  const loadHistory = useCallback(async () => {const data=await invoke("list_history");const items=data.history||[];setHistory(items);return items;},[invoke]);
  const poll = useCallback(async (id:string) => {
    const data=await invoke("poll_task",{task_id:id});
    if(data.task){setTask(data.task);setLastRefresh(new Date().toISOString());setPollError(null);if(!["queued","running"].includes(data.task.status)){setActiveId(null);await loadHistory();}}
  },[invoke,loadHistory]);

  useEffect(()=>{loadHistory().then(async items=>{const active=items.find((item:Task)=>["queued","running"].includes(item.status));if(active){const detail=await invoke("get_history",{task_id:active.id});setTask(detail.task);setActiveId(active.id);}}).catch(e=>setNotice({kind:"error",title:"恢复任务或读取历史失败",message:e.message}));},[loadHistory,invoke]);
  useEffect(()=>{
    if(!activeId)return;
    let stopped=false,inFlight=false;
    const run=async()=>{if(stopped||inFlight)return;inFlight=true;try{await poll(activeId);}catch(e){if(!stopped)setPollError(e instanceof Error?e.message:"任务状态刷新失败");}finally{inFlight=false;}};
    void run();const timer=window.setInterval(()=>void run(),9000);
    return()=>{stopped=true;window.clearInterval(timer);};
  },[activeId,poll]);

  const start = async () => {
    let parsed:URL;try{parsed=new URL(url.trim());if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{setNotice({kind:"error",title:"网址格式不正确",message:"请输入完整的 http:// 或 https:// 网站首页网址。"});return;}
    setBusy(true);setNotice(null);setPollError(null);
    try{
      const data=await invoke("start",{url:parsed.toString(),market,max_pages:maxPages,pagespeed_limit:pagespeedLimit});
      setTask({id:data.task_id,title:"独立站诊断："+parsed.hostname,status:"queued",result_count:0,created_at:new Date().toISOString(),actor_meta:{stage:"mapping",progress_percent:2,events:[]}});
      setActiveId(data.task_id);setNotice({kind:"success",title:"诊断任务已进入后台队列",message:"任务由后台调度器独立推进；关闭页面或刷新浏览器不会中断采集。"});await loadHistory();
    }catch(e){setNotice({kind:"error",title:"无法启动诊断",message:e instanceof Error?e.message:"请检查服务凭证与输入参数。"});}
    finally{setBusy(false);}
  };
  const openHistory = async (id:string) => {
    setBusy(true);try{const data=await invoke("get_history",{task_id:id});setTask(data.task);setActiveId(["queued","running"].includes(data.task.status)?id:null);setPollError(null);}
    catch(e){setNotice({kind:"error",title:"读取报告失败",message:e instanceof Error?e.message:"请稍后重试。"});}finally{setBusy(false);}
  };

  const meta=task?.actor_meta||{},report=meta.report,pages=task?.raw_items||meta.pages||[],events=meta.events||[];
  const scrapeQueue=meta.scrape_queue||[],speedResults=meta.pagespeed_results||[];
  const discovered=Number(meta.discovered_count||meta.map_urls?.length||0),audited=Number(task?.result_count||pages.length||0);
  const speedTotal=Number(task?.input_snapshot?.pagespeed_limit||pagespeedLimit)*2;
  const stage=meta.stage||"mapping";
  const progress=Number(meta.progress_percent??(task?.status==="succeeded"||task?.status==="partial"?100:task?.status==="failed"?100:2));
  const staleMs=meta.last_progress_at?Date.now()-new Date(meta.last_progress_at).getTime():0;
  const stale=task?.status==="running"&&staleMs>90000;
  const scores=useMemo(()=>[["综合健康度",report?.overall_score],["技术 SEO",report?.scores?.technical_seo],["页面性能",report?.scores?.performance],["内容质量",report?.scores?.content],["结构化数据",report?.scores?.structured_data],["AI 搜索可读性",report?.scores?.ai_search_readability],["搜索 SEO",report?.scores?.search_seo]] as [string,number|null|undefined][],[report]);

  const config=(
    <section className="seo-config-panel" aria-label="诊断目标与数据源配置">
      <TextInput id="seo-site-url" labelText="独立站网址" placeholder="https://www.example.com" value={url} onChange={e=>setUrl(e.currentTarget.value)} helperText="输入可公开访问的网站首页网址。" />
      <div className="seo-analysis-config-grid">
        <Dropdown id="seo-market" titleText="目标市场" label="选择目标市场" items={markets} itemToString={item=>item?.label||""} selectedItem={markets.find(x=>x.id===market)||markets[0]} onChange={({selectedItem})=>setMarket(selectedItem?.id||"US")} />
        <NumberInput id="seo-max-pages" label="最大分析页面数" min={1} max={200} value={maxPages} onChange={(_e,s)=>setMaxPages(Math.min(200,Math.max(1,Number(s.value)||80)))} />
        <NumberInput id="seo-pagespeed-limit" label="PageSpeed 代表性页面数" min={1} max={10} value={pagespeedLimit} onChange={(_e,s)=>setPagespeedLimit(Math.min(10,Math.max(1,Number(s.value)||5)))} />
      </div>
      <div className="seo-provider-row"><Tag type="blue">Context.dev · URL 发现与页面采集</Tag><Tag type="blue">Google PageSpeed · Mobile / Desktop</Tag></div>
      <div className="analysis-submit-row">
        <Button kind="primary" renderIcon={Search} disabled={busy||!!activeId} onClick={start}>{busy?"正在提交…":activeId?"诊断任务执行中":"开始 SEO 诊断"}</Button>
        <Button kind="ghost" renderIcon={Settings} onClick={()=>navigate("/settings/providers")}>配置 API 凭证</Button>
      </div>
    </section>
  );

  return <IntelligencePageTemplate title="独立站智能诊断" description="网站技术 SEO、内容质量、结构化数据与性能诊断工作台。" eyebrow="WEBSITE SEO INTELLIGENCE" sourceConfiguration={config}>
    {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} hideCloseButton/>}

    <PageSection title="诊断任务控制台" description="查看任务属性、当前阶段、执行进度和后台活动。">
      {!task?<EmptyState title="尚未选择诊断任务" description="配置网站与分析范围后启动任务；提交后这里会显示任务编号和实时执行情况。"/>:
      <div className="seo-task-console">
        <div className="seo-task-title-row">
          <div className="seo-task-title"><strong>{task.title}</strong><span>任务 ID：{task.id}</span></div>
          <Tag type={task.status==="succeeded"?"green":task.status==="failed"?"red":task.status==="partial"?"warm-gray":"blue"}>{statusText(task.status)}</Tag>
        </div>
        <div className="seo-task-attributes">
          <div><span>创建时间</span><strong>{dateText(task.created_at)}</strong></div>
          <div><span>当前阶段</span><strong>{stageText(stage)}</strong></div>
          <div><span>任务耗时</span><strong>{elapsedText(task.started_at||task.created_at,task.completed_at)}</strong></div>
          <div><span>最近进展</span><strong>{dateText(meta.last_progress_at||task.updated_at)}</strong></div>
        </div>
        <div className="seo-progress-block"><div className="seo-progress-heading"><strong>执行进度</strong><strong>{progress}%</strong></div><ProgressBar label="诊断任务执行进度" value={progress} max={100} />
          <div className="seo-task-counters">
            <div><strong>{discovered}</strong><span>发现 URL</span></div>
            <div><strong>{audited}</strong><span>已审计页面</span></div>
            <div><strong>{scrapeQueue.length}</strong><span>待采集页面</span></div>
            <div><strong>{speedResults.length}/{speedTotal}</strong><span>PageSpeed 检测（Mobile / Desktop）</span></div><div><strong>{(meta.page_errors||[]).length}</strong><span>页面采集失败</span></div>
          </div>
        </div>
        {task.status==="running"&&<div className="seo-stage-track">
          {["mapping","scraping","pagespeed","completed"].map((key,i)=><div key={key} className={["mapping","scraping","pagespeed","completed"].indexOf(stage)>=i?"is-reached":""}><span>{i+1}</span><small>{stageText(key)}</small></div>)}
        </div>}
        {stale&&<InlineNotification kind="warning" lowContrast title="任务可能停滞" subtitle={"后台已超过 "+Math.floor(staleMs/1000)+" 秒没有新的进展事件。页面正在重新确认任务状态；这不代表任务已经失败。"} hideCloseButton/>}
        {pollError&&<InlineNotification kind="error" lowContrast title="任务状态刷新失败" subtitle={pollError+"。请检查网络后重试刷新。"} hideCloseButton/>}
        {task.error_message&&<InlineNotification kind="warning" lowContrast title="任务存在未完成项" subtitle={task.error_message} hideCloseButton/>}
        <div className="seo-task-actions"><span>状态读取时间：{dateText(lastRefresh||undefined)}</span><Button kind="ghost" size="sm" renderIcon={Renew} disabled={busy} onClick={()=>task.status==="running"?poll(task.id):openHistory(task.id)}>刷新任务状态</Button></div>
      </div>}
    </PageSection>

    <PageSection title="执行日志与阶段追踪" description="只展示后台实际写入的事件；每条记录均包含发生时间和执行结果。">
      {!task?<EmptyState title="暂无执行日志" description="启动诊断任务后，后台事件会显示在这里。"/>:
        <div className="seo-event-list">
          {!events.length?<InlineNotification kind="info" lowContrast title="等待后台事件" subtitle="任务已选中，等待第一次状态同步。" hideCloseButton/>:
            [...events].reverse().map((event:any)=><div className="seo-event-row" key={event.id||event.created_at+event.message}>
              <span className={"seo-event-indicator "+(event.type==="error"?"is-error":event.type==="warning"?"is-warning":event.type==="success"?"is-success":"")}/>
              <div className="seo-event-content"><div><strong>{event.message}</strong><Tag type={event.type==="success"?"green":event.type==="error"?"red":event.type==="warning"?"warm-gray":"blue"}>{event.type==="success"?"成功":event.type==="error"?"失败":event.type==="warning"?"警告":"信息"}</Tag></div>
                <time>{dateText(event.created_at)}</time>
                {event.details&&Object.keys(event.details).length>0&&<details><summary>查看事件详情</summary><pre>{JSON.stringify(event.details,null,2)}</pre></details>}
              </div>
            </div>)}
        </div>}
    </PageSection>

    <PageSection title="诊断结果中心" description="按分析维度查看报告；任务完成或部分完成后显示完整诊断结果。">
      {!task?<EmptyState title="暂无诊断结果" description="选择或创建诊断任务后，报告会显示在这里。"/>:!report?
        <EmptyState title={task.status==="running"?"报告正在生成":"本次任务尚未生成报告"} description={task.error_message||"等待页面审计和 PageSpeed 阶段完成。"}/>:
        <div className="seo-report-workspace">
          <div className="seo-report-summary"><div><span>综合健康度</span><strong>{scoreText(report.overall_score)}</strong></div><div><span>数据覆盖率</span><strong>{report.coverage_percent||0}%</strong></div><div><span>发现 / 审计页面</span><strong>{report.discovered_pages} / {report.audited_pages}</strong></div><div><span>PageSpeed 页面</span><strong>{report.pagespeed_samples}</strong></div></div>
          <Tabs><TabList aria-label="诊断结果分析维度" contained>
            <Tab>综合概览</Tab><Tab>技术 SEO</Tab><Tab>页面内容</Tab><Tab>结构化数据</Tab><Tab>PageSpeed</Tab><Tab>AI 搜索可读性</Tab><Tab>优化建议</Tab><Tab>页面明细</Tab>
          </TabList><TabPanels>
            <TabPanel><div className="seo-score-grid">{scores.map(([label,value])=><Tile key={label} className="seo-score-tile"><span>{label}</span><strong>{scoreText(value)}</strong></Tile>)}</div><InlineNotification kind="info" lowContrast title="评分方法与覆盖范围" subtitle={report.methodology} hideCloseButton/></TabPanel>
            <TabPanel><div className="seo-detail-list">{pages.map((p:any)=><article key={p.url}><strong>{p.audit?.title||p.title||p.url}</strong><span>{p.url}</span><p>Title：{p.audit?.title||"缺失"} · Description：{p.audit?.description?"已设置":"缺失"} · Canonical：{p.audit?.canonical?"已设置":"未发现"} · Robots：{p.audit?.robots||"默认"}</p><p>H1：{p.audit?.h1?.length??0} · HTTP：{p.status_code??"—"}</p></article>)}</div></TabPanel>
            <TabPanel><div className="seo-detail-list">{pages.map((p:any)=><article key={p.url}><strong>{p.audit?.title||p.url}</strong><span>{p.url}</span><p>正文 {p.audit?.word_count??"—"} 词 · Heading {p.audit?.heading_count??"—"} · 图片 {p.audit?.image_count??"—"}（缺少 Alt {p.audit?.images_missing_alt??"—"}）· 内链 {p.audit?.internal_link_count??"—"}</p></article>)}</div></TabPanel>
            <TabPanel><div className="seo-detail-list">{pages.map((p:any)=><article key={p.url}><strong>{p.url}</strong><p>JSON-LD {p.audit?.structured_data?.json_ld_valid??0}/{p.audit?.structured_data?.json_ld_blocks??0} · Microdata {p.audit?.structured_data?.microdata_items??0} · RDFa {p.audit?.structured_data?.rdfa_items??0}</p><p>Schema：{(p.audit?.structured_data?.types||[]).join("、")||"未发现"}</p>{(p.audit?.structured_data?.eligibility_checks||[]).map((c:any)=><span key={c.type}>{c.type}：{c.precheck} · 缺少必填 {(c.missing_required||[]).join("、")||"无"}</span>)}</article>)}</div></TabPanel>
            <TabPanel><div className="seo-detail-list">{speedResults.map((s:any,i:number)=><article key={s.url+s.strategy+i}><strong>{s.url} · {s.strategy==="mobile"?"Mobile":"Desktop"}</strong><p>{s.error||("Performance "+scoreText(s.scores?.performance)+" · Accessibility "+scoreText(s.scores?.accessibility)+" · SEO "+scoreText(s.scores?.seo))}</p><p>LCP {s.metrics?.lcp_ms==null?"—":Math.round(s.metrics.lcp_ms)+" ms"} · INP {s.metrics?.inp_ms??"—"} · CLS {s.metrics?.cls??"—"} · FCP {s.metrics?.fcp_ms==null?"—":Math.round(s.metrics.fcp_ms)+" ms"} · TBT {s.metrics?.tbt_ms==null?"—":Math.round(s.metrics.tbt_ms)+" ms"}</p></article>)}</div></TabPanel>
            <TabPanel><div className="seo-score-grid">{scores.filter(([label])=>label==="AI 搜索可读性").map(([label,value])=><Tile key={label} className="seo-score-tile"><span>{label}（启发式指标）</span><strong>{scoreText(value)}</strong></Tile>)}</div><p className="seo-muted">该指标根据页面标题结构、问题式标题、列表、表格及结构化数据计算，不是 LLM 评分，也不是搜索排名指标。</p></TabPanel>
            <TabPanel><div className="seo-detail-list">{(report.recommendations||[]).map((item:any,i:number)=><article key={item.title+i}><div className="seo-recommendation-heading"><strong>{item.title}</strong><Tag type={item.severity==="high"?"red":item.severity==="medium"?"blue":"gray"}>{item.severity==="high"?"高优先级":item.severity==="medium"?"中优先级":"低优先级"}</Tag></div><span>{item.category} · {item.url}</span><p>检测证据：{item.evidence}</p><p>建议：{item.action}</p></article>)}</div></TabPanel>
            <TabPanel><Accordion><AccordionItem title={"页面审计数据（"+pages.length+"）"}><div className="seo-detail-list">{pages.map((p:any,i:number)=><article key={p.url||i}><strong>{p.url||"未知页面"}</strong><span>HTTP {p.status_code??"—"} · {p.audit?.issues?.length||0} 项问题</span><p>Title：{p.audit?.title||"未返回"} · Description：{p.audit?.description?"已设置":"未设置"}</p></article>)}</div></AccordionItem><AccordionItem title="PageSpeed 原始检测记录"><div className="seo-detail-list">{speedResults.map((s:any,i:number)=><article key={s.url+s.strategy+i}><strong>{s.url} · {s.strategy}</strong><pre>{JSON.stringify(s,null,2)}</pre></article>)}</div></AccordionItem></Accordion></TabPanel>
          </TabPanels></Tabs>
        </div>}
    </PageSection>

    <PageSection title="历史诊断任务" description="独立管理当前组织最近 30 次诊断记录；查看历史任务不会覆盖后台其他任务。">
      {!history.length?<EmptyState title="暂无历史诊断" description="完成首次网站诊断后，任务会保存在这里。"/>:
        <div className="seo-analysis-history">{history.map(item=><Tile key={item.id} className={"seo-analysis-history-item "+(task?.id===item.id?"is-selected":"")}>
          <div className="seo-history-main"><strong>{item.title}</strong><span>任务 ID：{item.id}</span><span>{dateText(item.created_at)} · {item.result_count||0} 个已审计页面 · {elapsedText(item.created_at,item.completed_at)}</span></div>
          <Tag type={item.status==="succeeded"?"green":item.status==="failed"?"red":item.status==="partial"?"warm-gray":"blue"}>{statusText(item.status)}</Tag>
          <Button kind="ghost" size="sm" disabled={busy} onClick={()=>openHistory(item.id)}>查看任务</Button>
        </Tile>)}</div>}
    </PageSection>
  </IntelligencePageTemplate>;
}
