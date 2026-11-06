import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dropdown, InlineNotification, Tag, TextArea, TextInput, Tile } from "@carbon/react";
import { Add, Checkmark, CloudUpload, Renew, TrashCan } from "@carbon/icons-react";
import { supabase } from "./lib/supabase";
import { useAuth } from "./auth/AuthProvider";
import { ConfigurationPageTemplate } from "./design-system/patterns";
import { PageSection } from "./design-system/components";
import "./meta-content-studio.css";

type Connection = { id:string; provider:string; external_asset_id:string; display_name:string; status:string };
type Comment = { id:string; message:string; from?:{name?:string}; created_time?:string; };\ntype Post = { id:string; connection_id:string; content_text:string; link_url:string|null; status:string; external_post_id:string|null; permalink_url:string|null; published_at:string|null; created_at:string; last_error_message:string|null };
const labelFor=(status:string)=>({draft:"草稿",publishing:"发布中",published:"已发布",failed:"发布失败",scheduled:"已排程",cancelled:"已取消"}[status]||status);
const tagFor=(status:string)=>status==="published"?"green":status==="failed"?"red":status==="draft"?"blue":"cool-gray";

export default function MetaContentStudio(){
  const {session}=useAuth();
  const [organizationId,setOrganizationId]=useState("");
  const [connections,setConnections]=useState<Connection[]>([]);
  const [selectedConnection,setSelectedConnection]=useState("");
  const [posts,setPosts]=useState<Post[]>([]);
  const [content,setContent]=useState("");
  const [link,setLink]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<{kind:"success"|"error"|"info";title:string;message:string}|null>(null);\n  const [selectedPost,setSelectedPost]=useState<Post|null>(null);\n  const [comments,setComments]=useState<Comment[]>([]);\n  const [replyText,setReplyText]=useState("");\n  const [replyingTo,setReplyingTo]=useState("");\n  const [insights,setInsights]=useState<any[]>([]);
  const selected=useMemo(()=>connections.find(c=>c.id===selectedConnection)||null,[connections,selectedConnection]);
  const call=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
    const {data,error}=await supabase.functions.invoke("meta-operations",{body:{action,organization_id:organizationId,...extra}});
    if(error||data?.error)throw new Error(error?.message||data?.error||"操作失败");
    return data;
  },[organizationId]);
  const load=useCallback(async()=>{
    if(!session?.user.id)return;
    setLoading(true);
    try{
      const {data:members,error:memberError}=await supabase.from("organization_members").select("organization_id").eq("user_id",session.user.id).order("created_at",{ascending:true});
      if(memberError)throw memberError;
      const org=members?.[0]?.organization_id;
      if(!org){setNotice({kind:"info",title:"尚未加入组织",message:"请先加入企业工作区。"});return;}
      setOrganizationId(org);
      const {data:connData,error:connError}=await supabase.functions.invoke("meta-api",{body:{action:"list_connections",organization_id:org}});
      if(connError||connData?.error)throw new Error(connError?.message||connData?.error||"无法读取 Meta 资产");
      const pages=(connData?.connections||[]).filter((c:Connection)=>c.provider==="facebook_pages"&&c.status==="connected");
      setConnections(pages);
      setSelectedConnection(current=>pages.some((p:Connection)=>p.id===current)?current:pages[0]?.id||"");
      const {data:postData,error:postError}=await supabase.functions.invoke("meta-operations",{body:{action:"list_posts",organization_id:org}});
      if(postError||postData?.error)throw new Error(postError?.message||postData?.error||"无法读取帖子");
      setPosts(postData?.posts||[]);
    }catch(err){setNotice({kind:"error",title:"加载 Meta 内容失败",message:err instanceof Error?err.message:"未知错误"});}
    finally{setLoading(false);}
  },[session?.user.id]);
  useEffect(()=>{void load();},[load]);
  const run=async(action:string,extra:Record<string,unknown>={},successTitle="操作完成")=>{
    setBusy(true);setNotice(null);
    try{const result=await call(action,extra);setNotice({kind:"success",title:successTitle,message:result?.synced!==undefined?`已同步 ${result.synced} 条帖子。`:"操作已完成。"});await load();}
    catch(err){setNotice({kind:"error",title:"操作未完成",message:err instanceof Error?err.message:"未知错误"});}
    finally{setBusy(false);}
  };
  const loadComments=async(post:Post)=>{if(!post.external_post_id)return;setSelectedPost(post);try{const d=await call("list_comments",{connection_id:post.connection_id,external_post_id:post.external_post_id});setComments(d.comments||[]);}catch(err){setNotice({kind:"error",title:"读取帖子评论失败",message:err instanceof Error?err.message:"未知错误"});}};
  const loadInsights=async()=>{if(!selectedConnection)return;try{const d=await call("page_insights",{connection_id:selectedConnection});setInsights(d.insights||[]);setNotice({kind:"success",title:"主页数据已更新",message:"已读取当前 Page 可访问的 Insights 指标。"});}catch(err){setNotice({kind:"error",title:"读取主页数据失败",message:err instanceof Error?err.message:"未知错误"});}};
  const replyComment=async(commentId:string)=>{if(!selectedPost||!replyText.trim())return;await run("reply_comment",{connection_id:selectedPost.connection_id,comment_id:commentId,message:replyText.trim()},"评论回复已提交");setReplyText("");setReplyingTo("");await loadComments(selectedPost);};
  const moderateComment=async(commentId:string,hidden:boolean)=>{if(!selectedPost)return;await run("moderate_comment",{connection_id:selectedPost.connection_id,comment_id:commentId,hidden},hidden?"评论已隐藏":"评论已恢复显示");await loadComments(selectedPost);};
  const createDraft=async()=>{
    if(!selectedConnection){setNotice({kind:"error",title:"尚未连接 Facebook Page",message:"先到 Meta 渠道管理完成 Page 授权。"});return;}
    setBusy(true);setNotice(null);
    try{await call("create_post",{connection_id:selectedConnection,content_text:content,link_url:link.trim()||null});setContent("");setLink("");setNotice({kind:"success",title:"帖子草稿已保存",message:"草稿已保存到当前组织，可在确认内容后发布。"});await load();}
    catch(err){setNotice({kind:"error",title:"保存草稿失败",message:err instanceof Error?err.message:"未知错误"});}
    finally{setBusy(false);}
  };
  const publish=async(post:Post)=>{await run("publish_post",{post_id:post.id},"Facebook 帖子已发布");};
  const remove=async(post:Post)=>{await run("delete_post",{post_id:post.id},"帖子已删除或取消");};
  const connectionItems=connections.map(c=>({id:c.id,text:c.display_name||c.external_asset_id}));
  return <ConfigurationPageTemplate className="module meta-content-studio" title="Facebook 内容管理" description="管理已授权 Facebook Page 的帖子草稿、发布和内容同步。真实发布受 Meta App 权限、Page 任务权限及审核状态限制。" eyebrow="META PAGE PUBLISHING" headingLevel={1}>
    <PageSection title="发布目标" description="选择组织已授权的 Facebook Page。当前仅展示真实连接的 Page，不显示模拟资产。" headingLevel={3}>
      {notice&&<InlineNotification kind={notice.kind} lowContrast title={notice.title} subtitle={notice.message} onCloseButtonClick={()=>setNotice(null)}/>}
      {connections.length>0?<div className="meta-content-toolbar">
        <Dropdown id="meta-content-page" titleText="Facebook Page" label="选择主页" items={connectionItems} itemToString={(item)=>item?.text||""} selectedItem={connectionItems.find(i=>i.id===selectedConnection)||null} onChange={({selectedItem})=>setSelectedConnection(selectedItem?.id||"")}/>
        <Button kind="tertiary" renderIcon={Renew} disabled={busy||!selectedConnection} onClick={()=>void run("sync_posts",{connection_id:selectedConnection},"帖子同步完成")}>同步主页帖子</Button><Button kind="ghost" disabled={busy||!selectedConnection} onClick={()=>void loadInsights()}>查看主页数据</Button>
      </div>:<InlineNotification kind="warning" lowContrast title="尚未连接 Facebook Page" subtitle="先在「Meta 渠道管理 → Facebook Pages」完成应用配置、授权和 Page 资产选择。"} />}
    </PageSection>
    <PageSection title="创建帖子" description="先保存草稿，再由有权限的组织管理员执行发布。请确保素材 URL 可被 Meta 服务器公开访问。" headingLevel={3}>
      <div className="meta-content-compose">
        <TextArea id="meta-post-content" labelText="帖子内容" placeholder="输入帖子文字…" rows={5} value={content} onChange={e=>setContent(e.target.value)}/>
        <TextInput id="meta-post-link" labelText="链接（可选）" placeholder="https://…" value={link} onChange={e=>setLink(e.target.value)}/>
        <div className="meta-content-actions"><Button kind="primary" renderIcon={Add} disabled={busy||!selectedConnection||(!content.trim()&&!link.trim())} onClick={()=>void createDraft()}>{busy?"正在保存…":"保存帖子草稿"}</Button></div>
      </div>
      <InlineNotification kind="info" lowContrast title="当前发布范围" subtitle="本阶段支持文字和链接帖子、单张公开图片 URL 发布；视频、轮播、多图、Reels、故事、排程、Instagram 发布及完整媒体库将在后续能力阶段接入。Meta 不允许的内容和权限不会被绕过。"/>
    </PageSection>
    <PageSection title="帖子列表" description="显示已保存的草稿及从当前 Meta Page 同步的帖子。" headingLevel={3}>
      {loading?<p>正在读取帖子…</p>:posts.length===0?<Tile><p>目前没有帖子。创建草稿或同步 Page 帖子后会显示在这里。</p></Tile>:<div className="meta-content-post-list">
        {posts.filter(p=>!selectedConnection||p.connection_id===selectedConnection).map(post=><Tile key={post.id} className="meta-content-post">
          <div className="meta-content-post__top"><Tag type={tagFor(post.status)}>{labelFor(post.status)}</Tag><span>{new Date(post.created_at).toLocaleString()}</span></div>
          <p className="meta-content-post__body">{post.content_text||"（无文字内容）"}</p>
          {post.link_url&&<a href={post.link_url} target="_blank" rel="noreferrer">{post.link_url}</a>}
          {post.last_error_message&&<InlineNotification kind="error" lowContrast title="发布错误" subtitle={post.last_error_message}/>}
          <div className="meta-content-post__actions">
            {post.permalink_url&&<Button kind="ghost" size="sm" href={post.permalink_url} target="_blank">查看 Facebook 帖子</Button>}
            {(post.status==="draft"||post.status==="failed")&&<Button kind="primary" size="sm" renderIcon={CloudUpload} disabled={busy} onClick={()=>void publish(post)}>发布</Button>}
            {post.status!=="published"&&<Button kind="ghost" size="sm" renderIcon={TrashCan} disabled={busy} onClick={()=>void remove(post)}>删除草稿</Button>}
            {post.external_post_id&&<><Button kind="ghost" size="sm" onClick={()=>void loadComments(post)}>管理评论</Button><Button kind="ghost" size="sm" renderIcon={Checkmark} disabled>Meta ID：{post.external_post_id}</Button></>}
          </div>
        </Tile>)}
      </div>}
    </PageSection>
  </ConfigurationPageTemplate>;
}
