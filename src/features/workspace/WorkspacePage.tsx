import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, InlineNotification } from "@carbon/react";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../app/AuthProvider";

export function WorkspacePage() {
  const { session, workspace, refresh } = useAuth();
  const [name,setName]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const navigate=useNavigate();
  const create=async(e:FormEvent)=>{e.preventDefault();if(!session)return;setBusy(true);setError("");
    try { const client=requireSupabase(); const slug=name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
      const {error:insertError}=await client.from("organizations").insert({name:name.trim(),slug:slug||null,created_by:session.user.id}); if(insertError)throw insertError;
      await refresh(); navigate("/dashboard");
    } catch(err){setError(err instanceof Error?err.message:"工作空间创建失败");} finally{setBusy(false);}
  };
  if(workspace)return <main className="auth-page"><section className="auth-card"><h1>{workspace.name}</h1><p>当前工作空间 · {workspace.role}</p><Button onClick={()=>navigate("/dashboard")}>进入工作空间</Button></section></main>;
  return <main className="auth-page"><form className="auth-card" onSubmit={create}><div className="eyebrow">FIRST STEP</div><h1>创建工作空间</h1><p>工作空间是企业档案、分析任务和团队权限的隔离边界。</p>
    {error&&<InlineNotification kind="error" title="创建失败" subtitle={error}/>}
    <TextInput id="workspace-name" labelText="工作空间名称" value={name} onChange={e=>setName(e.target.value)} required/>
    <Button type="submit" disabled={busy||!name.trim()}>{busy?"创建中…":"创建工作空间"}</Button>
  </form></main>;
}
