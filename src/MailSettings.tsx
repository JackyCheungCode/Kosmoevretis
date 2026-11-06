import React from "react";
import { Button, InlineNotification, Tag, TextInput, Tile } from "@carbon/react";
import { Add, Email, LogoGoogle, LogoMicrosoft, ServerProxy } from "@carbon/icons-react";

export default function MailSettings() {
  return <div className="mail-settings-page">
    <InlineNotification kind="info" lowContrast hideCloseButton title="邮件服务正在建设中" subtitle="此处是邮箱账户和邮件策略的统一配置入口。真实 OAuth 授权、凭证加密保存及连接测试将在邮件后端服务完成后启用。" />
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>主流邮箱平台</h4><p>在系统设置中统一管理个人及企业邮箱账户。</p></div></div>
      <div className="settings-catalog-items">
        <Tile className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-identity"><LogoGoogle size={24}/><div className="settings-catalog-name"><strong>Gmail / Google Workspace</strong><span>通过 Google OAuth 2.0 和 Gmail API</span></div></div><Tag type="gray">待接入</Tag></div><div className="settings-catalog-actions"><Button kind="secondary" disabled>连接 Gmail</Button></div></Tile>
        <Tile className="settings-catalog-item"><div className="settings-catalog-item-head"><div className="settings-catalog-identity"><LogoMicrosoft size={24}/><div className="settings-catalog-name"><strong>Outlook / Microsoft 365</strong><span>通过 Microsoft OAuth 2.0 和 Graph API</span></div></div><Tag type="gray">待接入</Tag></div><div className="settings-catalog-actions"><Button kind="secondary" disabled>连接 Outlook</Button></div></Tile>
      </div>
    </section>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>企业自定义域名邮箱</h4><p>支持标准 IMAP / SMTP 邮箱；具体认证方式取决于邮箱服务商策略。</p></div><Tag type="gray">待接入</Tag></div>
      <div className="settings-form-grid">
        <TextInput id="mail-address" labelText="邮箱地址" placeholder="sales@example.com" disabled />
        <TextInput id="mail-display-name" labelText="显示名称" placeholder="销售团队" disabled />
        <TextInput id="mail-imap-host" labelText="IMAP 服务器" placeholder="imap.example.com" disabled />
        <TextInput id="mail-imap-port" labelText="IMAP 端口" placeholder="993" disabled />
        <TextInput id="mail-smtp-host" labelText="SMTP 服务器" placeholder="smtp.example.com" disabled />
        <TextInput id="mail-smtp-port" labelText="SMTP 端口" placeholder="465 或 587" disabled />
      </div>
      <div className="settings-catalog-actions"><Button kind="secondary" disabled renderIcon={Add}>添加企业邮箱</Button></div>
    </section>
    <section className="settings-catalog-group">
      <div className="settings-catalog-group-heading"><div><h4>同步与 AI 邮件策略</h4><p>统一管理近期同步范围、自动分析及草稿行为。</p></div></div>
      <div className="settings-form-grid">
        <Tile className="settings-catalog-item"><strong>近期邮件同步</strong><p className="settings-catalog-description">默认最近 30 天；后续支持 7 / 30 / 90 天及按需加载更早邮件。</p><Tag type="gray">默认 30 天（待启用）</Tag></Tile>
        <Tile className="settings-catalog-item"><strong>AI 自动处理</strong><p className="settings-catalog-description">自动分类、摘要、需求提取和回复草稿。</p><Tag type="gray">待接入</Tag></Tile>
      </div>
      <InlineNotification kind="warning" lowContrast hideCloseButton title="发送安全策略" subtitle="AI 可以生成和保存草稿，但不能自动发送。每封邮件发送前必须由用户确认发件账户、收件人和正文。" />
    </section>
  </div>;
}
