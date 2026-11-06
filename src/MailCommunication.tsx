import React from "react";
import { Button, InlineNotification, Search, Tag } from "@carbon/react";
import { Add, Archive, Document, Email, Search as SearchIcon, Send, Settings, Star, TrashCan, UserMultiple } from "@carbon/icons-react";
import { useNavigate } from "react-router-dom";
import "./mail-communication.css";

type Folder = { id: string; label: string; icon: React.ComponentType<{size?: number}> };
const folders: Folder[] = [
  { id: "inbox", label: "收件箱", icon: Email },
  { id: "sent", label: "已发送", icon: Send },
  { id: "drafts", label: "草稿箱", icon: Document },
  { id: "starred", label: "星标邮件", icon: Star },
  { id: "archive", label: "归档", icon: Archive },
  { id: "trash", label: "垃圾邮件", icon: TrashCan },
];

export default function MailCommunication() {
  const navigate = useNavigate();
  const [folder, setFolder] = React.useState("inbox");
  const [query, setQuery] = React.useState("");
  const [composeOpen, setComposeOpen] = React.useState(false);
  const activeFolder = folders.find(item => item.id === folder) || folders[0];

  return (
    <main className="mail-workspace" aria-label="邮件沟通工作区">
      <header className="mail-workspace-header">
        <div>
          <div className="mail-eyebrow">COMMUNICATION & FOLLOW-UP</div>
          <h2>邮件沟通</h2>
          <p>统一管理多个邮箱账户，以 AI 辅助处理全球商务邮件。</p>
        </div>
        <div className="mail-header-actions">
          <Button kind="secondary" renderIcon={Settings} onClick={() => navigate("/settings/mail")}>邮箱设置</Button>
          <Button kind="primary" renderIcon={Add} onClick={() => setComposeOpen(true)}>写邮件</Button>
        </div>
      </header>

      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title="邮箱服务尚未连接"
        subtitle="请先前往系统设置绑定 Gmail、Outlook 或企业邮箱。当前工作区不会展示模拟邮件或虚构的同步状态。"
      />

      <section className="mail-toolbar" aria-label="邮件工具栏">
        <Search id="mail-search" labelText="搜索邮件" placeholder="搜索发件人、主题或邮件内容" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="mail-toolbar-meta">
          <Tag type="gray">尚未连接账户</Tag>
          <Button kind="ghost" size="sm" renderIcon={Settings} onClick={() => navigate("/settings/mail")}>管理账户</Button>
        </div>
      </section>

      <section className="mail-three-pane">
        <nav className="mail-folder-pane" aria-label="邮件文件夹">
          <div className="mail-pane-label">邮箱文件夹</div>
          {folders.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" className={folder === item.id ? "mail-folder is-active" : "mail-folder"} onClick={() => setFolder(item.id)} aria-current={folder === item.id ? "page" : undefined}>
              <Icon size={16} /><span>{item.label}</span>
            </button>;
          })}
          <div className="mail-folder-divider" />
          <div className="mail-pane-label">邮箱账户</div>
          <div className="mail-no-accounts"><Email size={18}/><span>尚未绑定邮箱</span></div>
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => navigate("/settings/mail")}>添加邮箱账户</Button>
        </nav>

        <section className="mail-list-pane" aria-label={activeFolder.label}>
          <div className="mail-list-heading">
            <div><h3>{activeFolder.label}</h3><span>邮件列表</span></div>
            <Button kind="ghost" size="sm" hasIconOnly renderIcon={SearchIcon} iconDescription="搜索邮件" onClick={() => document.getElementById("mail-search")?.focus()} />
          </div>
          <div className="mail-empty-state">
            <Email size={28}/>
            <strong>{activeFolder.label}暂无邮件</strong>
            <span>连接邮箱账户并完成首次同步后，邮件将在这里显示。</span>
          </div>
        </section>

        <section className="mail-reader-pane" aria-label="邮件阅读区">
          <div className="mail-reader-placeholder">
            <Email size={32}/>
            <strong>选择一封邮件开始阅读</strong>
            <span>邮件正文、附件、会话上下文和 AI 分析将在此处展示。</span>
          </div>
          <aside className="mail-ai-panel">
            <div className="mail-ai-heading"><span>AI 邮件助手</span><Tag type="cool-gray">高级模式</Tag></div>
            <p>AI 将自动分类邮件、提取商务需求并生成回复草稿。</p>
            <div className="mail-ai-empty"><UserMultiple size={18}/><span>连接邮箱后开始分析</span></div>
            <Button kind="tertiary" size="sm" disabled>分析当前邮件</Button>
          </aside>
        </section>
      </section>

      {composeOpen && <div className="mail-compose-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setComposeOpen(false); }}>
        <section className="mail-compose-dialog" role="dialog" aria-modal="true" aria-labelledby="mail-compose-title">
          <header><h3 id="mail-compose-title">新建邮件</h3><Button kind="ghost" size="sm" onClick={() => setComposeOpen(false)}>关闭</Button></header>
          <div className="mail-compose-fields">
            <label>发件账户<input disabled placeholder="请先在系统设置中绑定邮箱"/></label>
            <label>收件人<input placeholder="name@example.com"/></label>
            <label>抄送 / 密送<input placeholder="可选"/></label>
            <label>主题<input placeholder="邮件主题"/></label>
            <label>正文<textarea rows={8} placeholder="撰写邮件内容…"/></label>
          </div>
          <InlineNotification kind="info" lowContrast hideCloseButton title="发送服务尚未接入" subtitle="当前先完成邮件工作区和撰写交互结构；真实发送将在邮箱授权与后端服务完成后启用。"/>
          <footer><Button kind="secondary" onClick={() => setComposeOpen(false)}>关闭</Button><Button kind="primary" disabled renderIcon={Send}>发送邮件</Button></footer>
        </section>
      </div>}
    </main>
  );
}
