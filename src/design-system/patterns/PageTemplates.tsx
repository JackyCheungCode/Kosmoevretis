import type { ReactNode } from "react";
import { PageFrame, PageHeader } from "../components";

type SharedHeader = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function IntelligencePageTemplate({ title, description, eyebrow, actions, sourceConfiguration, navigation, children, metadata }: SharedHeader & {
  sourceConfiguration: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  metadata?: ReactNode;
}) {
  return (
    <PageFrame className="kosmo-template kosmo-template--intelligence">
      <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} />
      <section className="kosmo-template__source" aria-label="分析源配置">{sourceConfiguration}</section>
      {navigation && <nav className="kosmo-template__navigation" aria-label="页面内容导航">{navigation}</nav>}
      <main className="kosmo-template__content">{children}</main>
      {metadata && <footer className="kosmo-template__metadata">{metadata}</footer>}
    </PageFrame>
  );
}

export function DataListPageTemplate({ title, description, eyebrow, actions, toolbar, summary, children, metadata }: SharedHeader & {
  toolbar?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  metadata?: ReactNode;
}) {
  return (
    <PageFrame className="kosmo-template kosmo-template--data-list">
      <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} />
      {toolbar && <section className="kosmo-template__toolbar" aria-label="搜索与筛选">{toolbar}</section>}
      {summary && <section className="kosmo-template__summary" aria-label="数据摘要">{summary}</section>}
      <main className="kosmo-template__content">{children}</main>
      {metadata && <footer className="kosmo-template__metadata">{metadata}</footer>}
    </PageFrame>
  );
}

export function ConfigurationPageTemplate({ title, description, eyebrow, actions, navigation, children }: SharedHeader & {
  navigation?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageFrame className="kosmo-template kosmo-template--configuration">
      <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} />
      <div className="kosmo-template__configuration-layout">
        {navigation && <nav className="kosmo-template__configuration-nav" aria-label="配置分类">{navigation}</nav>}
        <main className="kosmo-template__content">{children}</main>
      </div>
    </PageFrame>
  );
}

export function AnalysisPageTemplate({ title, description, eyebrow, actions, context, navigation, children, evidence }: SharedHeader & {
  context?: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  evidence?: ReactNode;
}) {
  return (
    <PageFrame className="kosmo-template kosmo-template--analysis">
      <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} />
      {context && <section className="kosmo-template__context">{context}</section>}
      {navigation && <nav className="kosmo-template__navigation" aria-label="分析结果导航">{navigation}</nav>}
      <main className="kosmo-template__content">{children}</main>
      {evidence && <footer className="kosmo-template__metadata">{evidence}</footer>}
    </PageFrame>
  );
}
