import { useCallback,useEffect,useMemo,useState } from "react";
import { Button,Dropdown,InlineNotification,Search,Tag,TextArea,Tile } from "@carbon/react";
import { Chat,Email,Renew,Send } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth/AuthProvider";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./meta-unified-inbox.css";

type Conversation={id:string;channel:string;external_contact_id:string|null;participant_summary:Record<string,unknown>;status:string;last_message_at:string|null;contact_id:string|null;company_id:string|null};
type Message={id:string;direction:string;body_text:string;delivery_status:string;created_at:string;attachment_metadata:unknown[]};
const filters=[{id:"all",text:"全部 Meta 渠道"},{id:"whatsapp_business",text:"WhatsApp"},{id:"messenger",text:"Messenger"}];
const channelName=(v:string)=>v==="whatsapp_business"?"WhatsApp":v==="messenger"?"Messenger":v;
export default function MetaUnifiedInbox(){
 const {session}=useAuth();
 const [org,setOrg]=useState("");
 const [conversations,setConversations]=useState<Conversation[]>([]);
 const [selected,setSelected]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [channel,setChannel]=useState("all");
 const [query,setQuery]=useState("");
 const [body,setBody]=useState("");
 const [draftId,setDraftId]=useState("");
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [notice,setNotice]=useState<{kind:"success"|"error"|"info";title:string;message:string}|null>(null);
 const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{const {data,error}=await supabase.functions.invoke("meta-operations",{body:{action,organization_id:org,...extra}});if(error||data?.error)throw new Error(error?.message||data?.error||"操作失败");return data;},[org]);
 const loadConversations=useCallback(async(orgId?:string)=>{
   const activeOrg=orgId||org;if(!activeOrg)return;
   const {data,error}=await supabase.functions.invoke("meta-operations",{body:{action:"list_conversations",organization_id:activeOrg,channel:channel==="all"?undefined:channel}});
   if(error||data?.error)throw new Error(error?.message||data?.error||"无法读取会话");
   const rows=(data?.conversations||[]) as Conversation[];
   setConversations(rows);
   setSelected(current=>rows.some(r=>r.id===current)?current:rows[0]?.id||"");
 },[org,channel]);
 useEffect(()=>{let active=true;(async()=>{try{if(!session?.user.id)return;const {data,error}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).order("created_at",{ascending:true});if(error)throw error;const id=data?.[0]?.organization_id||"";if(!id){setNotice({kind:"info",title:"尚未加入组织",message:"请先加入企业工作区。"});return;}if(active){setOrg(id);const {data:rows,error:loadError}=await supabase.functions.invoke("meta-operations",{body:{action:"list_conversations",organization_id:id}});if(loadError||rows?.error)throw new Error(loadError?.message||rows?.error||"无法读取会话");setConversations(rows?.conversations||[]);setSelected(rows?.conversations?.[0]?.id||"");}}catch(e){if(active)setNotice({kind:"error",title:"消息中心加载失败",message:e instanceof Error?e.message:"未知错误"});}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[session?.user.id]);
 useEffect(()=>{if(!org)return;void loadConversations().catch(e=>setNotice({kind:"error",title:"刷新会话失败",message:e.message}));},[channel,org,loadConversations]);
 useEffect(()=>{let active=true;if(!org||!selected){setMessages([]);return;}void call("list_messages",{conversation_id:selected}).then(d=>{if(active)setMessages(d.messages||[]);}).catch(e=>{if(active)setNotice({kind:"error",title:"读取消息失败",message:e.message});});return()=>{active=false;};},[org,selected,call]);
 const visible=useMemo(()=>conversations.filter(c=>{const name=String(c.participant_summary?.name||c.external_contact_id||"");return !query||name.toLowerCase().includes(query.toLowerCase());}),[conversations,query]);
 const current=conversations.find(c=>c.id===selected)||null;
 const createDraft=async()=>{if(!selected||!body.trim())return;setSending(true);setNotice(null);try{const d=await call("create_message_draft",{conversation_id:selected,body_text:body.trim()});setDraftId(d.draft.id);setBody("");setNotice({kind:"info",title:"回复草稿已创建",message:"请再次确认内容后，点击「审核并发送」。"});}catch(e){setNotice({kind:"error",title:"创建回复失败",message:e instanceof Error?e.message:"未知错误"});}finally{setSending(false);}};
 const approveSend=async()=>{if(!draftId)return;setSending(true);setNotice(null);try{await call("approve_and_send",{draft_id:draftId});setDraftId("");setNotice({kind:"success",title:"消息已提交 Meta",message:"已收到 Meta API 接受结果；最终送达状态以 Webhook 回执为准。"});const d=await call("list_messages",{conversation_id:selected});setMessages(d.messages||[]);await loadConversations();}catch(e){setNotice({kind:"error",title:"发送未完成",message:e instanceof Error?e.message:"未知错误"});}finally{setSending(false);}};
 return <ConfigurationPageTemplate className="module meta-unified-inbox" title="统一消息中心" description="集中处理 WhatsApp Business 与 Messenger 客户会话；消息通过服务端发送，并保留人工审批与渠道规则校验。" eyebrow="META CUSTOMER INBOX" headingLevel={1}>
  {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} onCloseButtonClick={()=>setNotice(null)}/>}
  <PageSection title="会话收件箱" description="仅展示真实 Webhook 已归档的客户会话，不创建演示消息。" headingLevel={3}>
   <InlineNotification kind="info" lowContrast title="发送安全规则" subtitle="WhatsApp 发送需有有效 opt-in 证据，并处于 24 小时服务窗口；Messenger 仅在允许的消息窗口内回复。窗口外模板消息、媒体消息、群发和自动发送尚未启用。"/>
   <div className="meta-inbox-layout">
    <aside className="meta-inbox-list">
     <div className="meta-inbox-filters"><Search size="lg" labelText="搜索联系人" placeholder="搜索名称或账号" value={query} onChange={e=>setQuery(e.target.value)}/><Dropdown id="meta-inbox-channel" titleText="渠道筛选" label="全部渠道" items={filters} itemToString={i=>i?.text||""} selectedItem={filters.find(i=>i.id===channel)||filters[0]} onChange={({selectedItem})=>setChannel(selectedItem?.id||"all")}/><Button kind="ghost" size="sm" renderIcon={Renew} onClick={()=>void loadConversations()} disabled={loading}>刷新</Button></div>
     {loading?<p>正在读取会话…</p>:visible.length===0?<Tile><Chat size={24}/><p>暂无 Meta 会话。完成 Webhook 事件归一化并收到客户消息后，会话会显示在这里。</p></Tile>:visible.map(c=><button type="button" className={"meta-inbox-conversation "+(selected===c.id?"is-selected":"")} key={c.id} onClick={()=>{setSelected(c.id);setDraftId("");}}><div><strong>{String(c.participant_summary?.name||c.external_contact_id||"未知联系人")}</strong><Tag type="cool-gray">{channelName(c.channel)}</Tag></div><span>{c.last_message_at?new Date(c.last_message_at).toLocaleString():"尚无消息时间"}</span></button>)}
    </aside>
    <section className="meta-inbox-thread">
     {!current?<div className="meta-inbox-empty"><Chat size={32}/><strong>选择一个客户会话</strong><span>会话内容和客户上下文将在此显示。</span></div>:<>
      <header className="meta-inbox-thread__header"><div><strong>{String(current.participant_summary?.name||current.external_contact_id||"未知联系人")}</strong><span>{channelName(current.channel)} · {current.external_contact_id||"无外部账号 ID"}</span></div><Tag type="blue">{current.status==="open"?"处理中":current.status}</Tag></header>
      <div className="meta-inbox-messages">{messages.map(m=><div key={m.id} className={"meta-inbox-message "+(m.direction==="outbound"?"is-outbound":"is-inbound")}><p>{m.body_text||"（媒体或非文本消息）"}</p><span>{new Date(m.created_at).toLocaleString()} · {m.delivery_status}</span></div>)}</div>
      <div className="meta-inbox-composer"><TextArea id="meta-inbox-reply" labelText="回复内容" placeholder="输入客户回复…" rows={3} value={body} onChange={e=>setBody(e.target.value)}/>{draftId?<div className="meta-inbox-send-actions"><Tag type="warm-gray">待人工审批</Tag><Button kind="primary" renderIcon={Send} disabled={sending} onClick={()=>void approveSend()}>{sending?"正在发送…":"审核并发送"}</Button><Button kind="ghost" disabled={sending} onClick={()=>setDraftId("")}>取消草稿</Button></div>:<Button kind="primary" renderIcon={Send} disabled={sending||!body.trim()} onClick={()=>void createDraft()}>创建待审批回复</Button>}</div>
     </>}
    </section>
   </div>
  </PageSection>
  <PageSection title="其他沟通渠道" description="邮件仍由现有邮件工作区管理，后续会统一接入消息时间线。" headingLevel={3}><Tile><div className="meta-inbox-email"><Email size={22}/><div><strong>邮件沟通</strong><p>进入现有邮件工作区查看和处理企业邮件。</p></div><Button kind="tertiary" href="/communication/mail">进入邮件工作区</Button></div></Tile></PageSection>
 </ConfigurationPageTemplate>;
}
