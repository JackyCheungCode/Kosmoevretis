import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Accordion, AccordionItem, Button, Dropdown, InlineNotification, NumberInput, ProgressBar, ProgressIndicator, ProgressStep, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tabs, TabList, Tab, TabPanels, TabPanel, Tag, TextInput, Tile } from "@carbon/react";
import { Search, Settings, Renew } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import { EmptyState, IntelligencePageTemplate } from "../design-system";
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

function CarbonDataTable({ label, headers, rows }: { label:string; headers:string[]; rows:ReactNode[][] }) {
  return <div className="seo-table-scroll" role="region" aria-label={label} tabIndex={0}>
    <TableContainer>
      <Table aria-label={label} size="lg">
        <TableHead><TableRow>{headers.map((header,index)=><TableHeader key={header+index}>{header}</TableHeader>)}</TableRow></TableHead>
        <TableBody>{rows.length ? rows.map((cells,rowIndex)=><TableRow key={rowIndex}>{cells.map((cell,cellIndex)=><TableCell key={cellIndex}>{cell}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={headers.length}>暂无数据</TableCell></TableRow>}</TableBody>
      </Table>
    </TableContainer>
  </div>;
}

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
  const scrapeQueue=meta.scrape_queue||[],speedQueue=meta.pagespeed_queue||[],speedResults=meta.pagespeed_results||[];
  const speedSucceeded=(strategy:string)=>speedResults.filter((x:any)=>x.strategy===strategy&&!x.error&&x.scores).length;
  const speedFailed=(strategy:string)=>speedResults.filter((x:any)=>x.strategy===strategy&&!!x.error).length;
  const speedPlanned=(strategy:string)=>speedResults.filter((x:any)=>x.strategy===strategy).length+speedQueue.filter((x:any)=>x.strategy===strategy).length;
  const mobileDone=speedSucceeded("mobile"),desktopDone=speedSucceeded("desktop");
  const mobileFailed=speedFailed("mobile"),desktopFailed=speedFailed("desktop");
  const discovered=Number(meta.discovered_count||meta.map_urls?.length||0),audited=Number(task?.result_count||pages.length||0);
  const pagespeedSuccessPages=new Set(speedResults.filter((x:any)=>!x.error&&x.scores).map((x:any)=>x.url)).size;
  const pagespeedPlannedPages=new Set([...speedResults,...speedQueue].map((x:any)=>x.url)).size;
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

    <section className="seo-console-section" aria-labelledby="seo-task-console-title"><div className="seo-section-heading"><h2 id="seo-task-console-title">诊断任务控制台</h2><p>查看任务属性、当前阶段、执行进度和后台活动。</p></div>
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
          <div className="seo-task-metrics" aria-label="任务统计指标">
            <Tile className="seo-metric-card"><span>发现 URL</span><strong>{discovered}</strong></Tile>
            <Tile className="seo-metric-card"><span>已审计页面</span><strong>{audited}</strong></Tile>
            <Tile className="seo-metric-card"><span>待采集页面</span><strong>{scrapeQueue.length}</strong></Tile>
            <Tile className="seo-metric-card"><span>Mobile 成功</span><strong>{mobileDone}/{speedPlanned("mobile")}</strong><small>{mobileFailed} 项失败</small></Tile>
            <Tile className="seo-metric-card"><span>Desktop 成功</span><strong>{desktopDone}/{speedPlanned("desktop")}</strong><small>{desktopFailed} 项失败</small></Tile>
            <Tile className="seo-metric-card"><span>页面采集失败</span><strong>{(meta.page_errors||[]).length}</strong></Tile>
            <Tile className="seo-metric-card"><span>待检测策略</span><strong>{speedQueue.length}</strong></Tile>
            <Tile className="seo-metric-card"><span>状态读取时间</span><strong className="seo-metric-time">{dateText(lastRefresh||undefined)}</strong></Tile>
          </div>
        </div>
        {task.status==="running"&&<ProgressIndicator currentIndex={Math.max(0,["mapping","scraping","pagespeed","completed"].indexOf(stage))} spaceEqually>
          <ProgressStep label="网站结构发现" />
          <ProgressStep label="页面采集与 SEO 审计" />
          <ProgressStep label="PageSpeed 性能检测" />
          <ProgressStep label="报告生成完成" />
        </ProgressIndicator>}
        {stale&&<InlineNotification kind="warning" lowContrast title="任务可能停滞" subtitle={"后台已超过 "+Math.floor(staleMs/1000)+" 秒没有新的进展事件。页面正在重新确认任务状态；这不代表任务已经失败。"} hideCloseButton/>}
        {pollError&&<InlineNotification kind="error" lowContrast title="任务状态刷新失败" subtitle={pollError+"。请检查网络后重试刷新。"} hideCloseButton/>}
        {task.error_message&&<InlineNotification kind="warning" lowContrast title="任务存在未完成项" subtitle={task.error_message} hideCloseButton/>}
        <div className="seo-task-actions"><span>状态读取时间：{dateText(lastRefresh||undefined)}</span><Button kind="ghost" size="sm" renderIcon={Renew} disabled={busy} onClick={()=>task.status==="running"?poll(task.id):openHistory(task.id)}>刷新任务状态</Button></div>
      </div>}
    </section>

    <section className="seo-console-section" aria-labelledby="seo-event-title"><div className="seo-section-heading"><h2 id="seo-event-title">执行日志与阶段追踪</h2><p>只展示后台实际写入的事件；每条记录均包含发生时间和执行结果。</p></div>
      {!task?<EmptyState title="暂无执行日志" description="启动诊断任务后，后台事件会显示在这里。"/>:
        {!events.length?<InlineNotification kind="info" lowContrast title="等待后台事件" subtitle="任务已选中，等待第一次状态同步。" hideCloseButton/>:
          <CarbonDataTable label="后台执行日志" headers={["执行结果","事件内容","执行阶段","发生时间","详情"]} rows={[...events].reverse().map((event:any)=>[
            <Tag type={event.type==="success"?"green":event.type==="error"?"red":event.type==="warning"?"warm-gray":"blue"}>{event.type==="success"?"Success":event.type==="error"?"Failed":event.type==="warning"?"Warning":"Info"}</Tag>,
            event.message||"—",event.stage?stageText(event.stage):"后台事件",dateText(event.created_at),
            event.details&&Object.keys(event.details).length>0?<Accordion><AccordionItem title="查看详情"><pre>{JSON.stringify(event.details,null,2)}</pre></AccordionItem></Accordion>:"—"
          ])]}/>} 
    </section>

    <section className="seo-console-section" aria-labelledby="seo-results-title"><div className="seo-section-heading"><h2 id="seo-results-title">诊断结果中心</h2><p>按分析维度查看报告；任务完成或部分完成后显示完整诊断结果。</p></div>
      {!task?<EmptyState title="暂无诊断结果" description="选择或创建诊断任务后，报告会显示在这里。"/>:!report?
        <EmptyState title={task.status==="running"?"报告正在生成":"本次任务尚未生成报告"} description={task.error_message||"等待页面审计和 PageSpeed 阶段完成。"}/>:
        <div className="seo-report-workspace">
          <div className="seo-report-summary">
            <Tile className="seo-summary-card"><span>综合健康度</span><strong>{scoreText(report.overall_score)}</strong></Tile>
            <Tile className="seo-summary-card"><span>评分维度覆盖率</span><strong>{typeof report.coverage_percent==="number"?report.coverage_percent+"%":"暂无数据"}</strong><small>按可用评分维度权重计算</small></Tile>
            <Tile className="seo-summary-card"><span>页面审计覆盖</span><strong>{report.discovered_pages??discovered} / {report.audited_pages??audited}</strong><small>{(report.discovered_pages??discovered)>0?Math.round((report.audited_pages??audited)/(report.discovered_pages??discovered)*100)+"% 页面审计覆盖":"暂无页面数据"}</small></Tile>
            <Tile className="seo-summary-card"><span>PageSpeed 有效页面</span><strong>{pagespeedSuccessPages}/{pagespeedPlannedPages}</strong><small>{speedResults.filter((x:any)=>!!x.error).length} 项检测失败</small></Tile>
          </div>
          <Tabs><TabList aria-label="诊断结果分析维度" contained>
            <Tab>综合概览</Tab><Tab>技术 SEO</Tab><Tab>页面内容</Tab><Tab>结构化数据</Tab><Tab>PageSpeed</Tab><Tab>AI 搜索可读性</Tab><Tab>优化建议</Tab><Tab>页面明细</Tab>
          </TabList><TabPanels>
            <TabPanel><div className="seo-score-grid">{scores.map(([label,value])=><Tile key={label} className="seo-score-tile"><span>{label}</span><strong>{scoreText(value)}</strong></Tile>)}</div><InlineNotification kind="info" lowContrast title="评分方法与覆盖范围" subtitle={report.methodology} hideCloseButton/></TabPanel>
            <TabPanel><CarbonDataTable label="技术 SEO 页面明细" headers={["页面 URL","页面标题","Meta Description","Canonical","Robots","H1 数量","HTTP"]} rows={pages.map((p:any)=>[p.url||"—",p.audit?.title||p.title||"缺失",p.audit?.description?"已设置":"缺失",p.audit?.canonical?"已设置":"未发现",p.audit?.robots||"默认",p.audit?.h1?.length??0,p.status_code??"—"])}/></TabPanel>
            <TabPanel><CarbonDataTable label="页面内容分析" headers={["页面 URL","页面标题","正文词数","Heading 数量","图片数量","缺少 Alt","内链数量"]} rows={pages.map((p:any)=>[p.url||"—",p.audit?.title||"—",p.audit?.word_count??"—",p.audit?.heading_count??"—",p.audit?.image_count??"—",p.audit?.images_missing_alt??"—",p.audit?.internal_link_count??"—"])}/></TabPanel>
            <TabPanel><CarbonDataTable label="结构化数据检测" headers={["页面 URL","JSON-LD 有效/总数","Microdata","RDFa","Schema 类型","资格预检"]} rows={pages.map((p:any)=>[p.url||"—",(p.audit?.structured_data?.json_ld_valid??0)+"/"+(p.audit?.structured_data?.json_ld_blocks??0),p.audit?.structured_data?.microdata_items??0,p.audit?.structured_data?.rdfa_items??0,(p.audit?.structured_data?.types||[]).join("、")||"未发现",(p.audit?.structured_data?.eligibility_checks||[]).map((c:any)=>c.type+": "+c.precheck+"；缺少必填 "+((c.missing_required||[]).join("、")||"无")).join(" | ")||"—"])}/></TabPanel>
            <TabPanel><CarbonDataTable label="PageSpeed 检测结果" headers={["页面 URL","设备策略","Performance","Accessibility","SEO","LCP","INP","CLS","FCP","TBT","执行状态"]} rows={speedResults.map((s:any)=>[s.url||"—",s.strategy==="mobile"?"Mobile":"Desktop",scoreText(s.scores?.performance),scoreText(s.scores?.accessibility),scoreText(s.scores?.seo),s.metrics?.lcp_ms==null?"—":Math.round(s.metrics.lcp_ms)+" ms",s.metrics?.inp_ms??"—",s.metrics?.cls??"—",s.metrics?.fcp_ms==null?"—":Math.round(s.metrics.fcp_ms)+" ms",s.metrics?.tbt_ms==null?"—":Math.round(s.metrics.tbt_ms)+" ms",s.error?<Tag type="red">失败</Tag>:s.scores?<Tag type="green">成功</Tag>:<Tag type="warm-gray">无评分数据</Tag>])}/></TabPanel>
            <TabPanel><div className="seo-score-grid">{scores.filter(([label])=>label==="AI 搜索可读性").map(([label,value])=><Tile key={label} className="seo-score-tile"><span>{label}（启发式指标）</span><strong>{scoreText(value)}</strong></Tile>)}</div><p className="seo-muted">该指标根据页面标题结构、问题式标题、列表、表格及结构化数据计算，不是 LLM 评分，也不是搜索排名指标。</p></TabPanel>
            <TabPanel><CarbonDataTable label="SEO 优化建议" headers={["优先级","建议标题","类别","涉及页面","检测证据","建议措施"]} rows={(report.recommendations||[]).map((item:any)=>[<Tag type={item.severity==="high"?"red":item.severity==="medium"?"blue":"gray"}>{item.severity==="high"?"高优先级":item.severity==="medium"?"中优先级":"低优先级"}</Tag>,item.title||"—",item.category||"—",item.url||"—",item.evidence||"—",item.action||"—"])}/></TabPanel>
            <TabPanel><Accordion><AccordionItem title={"页面审计数据（"+pages.length+"）"}><CarbonDataTable label="页面审计原始摘要" headers={["页面 URL","HTTP 状态","问题数量","页面标题","Meta Description"]} rows={pages.map((p:any)=>[p.url||"未知页面",p.status_code??"—",p.audit?.issues?.length||0,p.audit?.title||"未返回",p.audit?.description?"已设置":"未设置"])}/></AccordionItem><AccordionItem title="PageSpeed 原始检测记录"><CarbonDataTable label="PageSpeed 原始数据" headers={["页面 URL","设备策略","原始数据"]} rows={speedResults.map((item:any)=>[item.url||"—",item.strategy||"—",<pre>{JSON.stringify(item,null,2)}</pre>])}/></AccordionItem></Accordion></TabPanel>
          </TabPanels></Tabs>
        </div>}
    </section>

    <section className="seo-console-section" aria-labelledby="seo-history-title"><div className="seo-section-heading"><h2 id="seo-history-title">历史诊断任务</h2><p>独立管理最近 30 次诊断记录；查看历史任务不会覆盖后台其他任务。</p></div>
      {!history.length?<EmptyState title="暂无历史诊断" description="完成首次网站诊断后，任务会保存在这里。"/>:
        <CarbonDataTable label="历史诊断任务" headers={["诊断目标","任务 ID","任务状态","创建时间","已审计页面","操作"]} rows={history.map(item=>[
          <div className="seo-history-target"><strong>{item.title}</strong><span>{item.input_snapshot?.target||"—"}</span></div>,
          <span className="seo-history-id">{item.id}</span>,
          <Tag type={item.status==="succeeded"?"green":item.status==="failed"?"red":item.status==="partial"?"warm-gray":"blue"}>{statusText(item.status)}</Tag>,
          dateText(item.created_at),<strong className="seo-history-count">{item.result_count??0}</strong>,
          <Button kind="ghost" size="sm" disabled={busy} onClick={()=>openHistory(item.id)}>查看任务</Button>
        ])}/>}
    </section>
  </IntelligencePageTemplate>;
}
